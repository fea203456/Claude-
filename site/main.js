(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var css = function (name) { return getComputedStyle(doc).getPropertyValue(name).trim(); };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  };

  /* ── Заголовок: буквы появляются по одной ── */
  var n = 0;
  document.querySelectorAll("[data-split]").forEach(function (el) {
    var text = el.textContent;
    el.setAttribute("aria-label", text);
    el.textContent = "";
    Array.from(text).forEach(function (ch) {
      var s = document.createElement("span");
      s.className = "ch"; s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--i", n++); s.textContent = ch;
      el.appendChild(s);
    });
  });

  /* ── Проекты из projects.js ── */
  var list = document.getElementById("clips");
  var projects = window.PROJECTS || [];
  list.innerHTML = projects.map(function (p) {
    var m = p.media || {}, media = "";
    var tall = /^\s*9\s*\/\s*16/.test(m.ratio || "");
    if (m.type === "video") {
      media = '<video src="' + esc(m.src) + '" poster="' + esc(m.poster || "") + '" muted loop playsinline preload="metadata"></video>' +
              '<button class="sound" type="button">Включить звук</button>';
    } else if (m.type === "image") {
      media = '<img src="' + esc(m.src) + '" alt="' + esc(p.title) + '" loading="lazy">';
    } else if (m.type === "stickman") {
      media = '<canvas data-stickman aria-label="Человечек из палочек идёт по листу бумаги" role="img"></canvas>';
    }
    return '<article class="clip reveal">' +
      '<div class="shot"><div class="frame' + (tall ? " tall" : "") + '" style="aspect-ratio:' + esc(m.ratio || "16 / 9") + '">' + media + "</div></div>" +
      '<div class="info">' +
        '<p class="kind">' + esc(p.kind) + " · " + esc(p.year) + "</p>" +
        "<h3>" + esc(p.title) + "</h3>" +
        "<p>" + esc(p.text) + "</p>" +
        '<dl class="specs mono">' + (p.specs || []).map(function (s) { return "<dt>" + esc(s[0]) + "</dt><dd>" + esc(s[1]) + "</dd>"; }).join("") + "</dl>" +
        (p.links || []).map(function (l) { return '<a class="btn" href="' + esc(l.href) + '" target="_blank" rel="noopener">' + esc(l.label) + "</a>"; }).join(" ") +
      "</div></article>";
  }).join("");
  var count = document.getElementById("count");
  if (count) count.textContent = String(projects.length).padStart(2, "0");

  /* ── Плейхед: прокрутка страницы = таймкод ── */
  var tc = document.getElementById("tc"), scrub = document.getElementById("scrub");
  var FPS = 60, LENGTH = 44; // как у ролика «День 1 из 30»
  function pad(v) { return String(v).padStart(2, "0"); }
  function onScroll() {
    var max = doc.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    var f = Math.round(p * LENGTH * FPS);
    scrub.style.setProperty("--p", p.toFixed(4));
    tc.textContent = "00:" + pad(Math.floor(f / FPS)) + ":" + pad(f % FPS);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ── Появление блоков и запуск видео в кадре ── */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) e.target.classList.add("in");
        var v = e.target.querySelector("video");
        if (v && !still) { if (e.isIntersecting) { var pr = v.play(); if (pr) pr.catch(function () {}); } else v.pause(); }
      });
    }, { threshold: 0.25 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }
  document.querySelectorAll(".sound").forEach(function (b) {
    b.addEventListener("click", function () {
      var v = b.parentNode.querySelector("video");
      v.muted = !v.muted;
      if (v.paused) { var pr = v.play(); if (pr) pr.catch(function () {}); }
      b.textContent = v.muted ? "Включить звук" : "Выключить звук";
    });
  });

  /* ── Наклон карточки за курсором ── */
  if (!still && window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".shot").forEach(function (shot) {
      var fr = shot.querySelector(".frame");
      shot.addEventListener("pointermove", function (e) {
        var r = fr.getBoundingClientRect();
        fr.style.setProperty("--ry", (((e.clientX - r.left) / r.width - 0.5) * 10).toFixed(2) + "deg");
        fr.style.setProperty("--rx", ((0.5 - (e.clientY - r.top) / r.height) * 8).toFixed(2) + "deg");
      });
      shot.addEventListener("pointerleave", function () { fr.style.setProperty("--ry", "0deg"); fr.style.setProperty("--rx", "0deg"); });
    });
  }

  /* ── Холсты ── */
  function fit(c) {
    var d = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * d) || c.height !== Math.round(h * d)) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
    var g = c.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0);
    return { g: g, w: w, h: h };
  }

  // Мяч с «луковой кожей»: прошлые кадры остаются полупрозрачным следом.
  var ballC = document.getElementById("ball");
  function ballAt(t, w, h) {
    var T = 1.15, R = Math.max(16, Math.min(30, h * 0.1)), ground = h - 34;
    var span = w + R * 6, x = ((t * 190) % span) - R * 3;
    var ph = (t % T) / T, up = 4 * ph * (1 - ph);       // парабола прыжка
    var top = ground - R - (h - 90 - R);
    var y = ground - R - up * (ground - R - Math.max(R + 10, top + R));
    var vel = Math.abs(1 - 2 * ph);                       // скорость у земли выше
    var hit = Math.max(0, 1 - Math.min(ph, 1 - ph) * 14); // момент удара
    var sy = 1 + vel * 0.22 - hit * 0.45, sx = 1 / sy;
    return { x: x, y: y + (1 - sy) * R * hit, sx: sx, sy: sy, R: R, ground: ground };
  }
  function drawBall(t) {
    var o = fit(ballC), g = o.g, w = o.w, h = o.h;
    var pink = css("--pink"), lime = css("--lime"), line = css("--line"), muted = css("--muted");
    g.clearRect(0, 0, w, h);
    var b0 = ballAt(t, w, h);
    g.strokeStyle = line; g.lineWidth = 1; g.beginPath();
    g.moveTo(0, b0.ground + 0.5); g.lineTo(w, b0.ground + 0.5); g.stroke();
    g.fillStyle = muted; g.font = "500 10px " + css("--mono"); g.textAlign = "center";
    for (var x = 20, i = 0; x < w; x += 60, i++) {       // линейка кадров
      g.fillRect(x, b0.ground, 1, i % 2 ? 5 : 9);
      if (i % 2 === 0) g.fillText(String(i * 6).padStart(3, "0"), x, b0.ground + 24);
    }
    for (var k = 9; k >= 0; k--) {
      var b = ballAt(t - k * (1 / 12), w, h);
      if (b.x > b0.x) continue;                           // след не перескакивает через край
      g.save(); g.translate(b.x, b.y); g.scale(b.sx, b.sy);
      g.beginPath(); g.arc(0, 0, b.R, 0, Math.PI * 2);
      if (k === 0) { g.fillStyle = pink; g.fill(); }
      else { g.globalAlpha = 0.75 - k * 0.07; g.lineWidth = 2 / b.sx; g.strokeStyle = k % 2 ? lime : pink; g.stroke(); }
      g.restore();
    }
  }

  // Человечек из палочек идёт на месте по бумаге.
  function drawStick(c, t) {
    var o = fit(c), g = o.g, w = o.w, h = o.h, ink = css("--paper-ink"), pink = css("--pink");
    g.clearRect(0, 0, w, h);
    var u = Math.min(w, h) / 10, cx = w / 2, gy = h * 0.8, a = t * 5.2;
    g.strokeStyle = ink; g.lineWidth = 1; g.globalAlpha = 0.14;
    for (var y = u; y < h; y += u * 0.9) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.globalAlpha = 1; g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = Math.max(3, u * 0.16);
    g.setLineDash([u * 0.5, u * 0.45]); g.lineDashOffset = t * u * 2.2;
    g.beginPath(); g.moveTo(0, gy); g.lineTo(w, gy); g.stroke(); g.setLineDash([]);
    var bob = Math.abs(Math.sin(a)) * u * 0.14, hip = { x: cx, y: gy - u * 2.3 - bob }, neck = { x: cx + u * 0.12, y: hip.y - u * 2 };
    function limb(from, len, ang, bend) {
      var kx = from.x + Math.sin(ang) * len, ky = from.y + Math.cos(ang) * len;
      var ex = kx + Math.sin(ang + bend) * len, ey = ky + Math.cos(ang + bend) * len;
      g.beginPath(); g.moveTo(from.x, from.y); g.lineTo(kx, ky); g.lineTo(ex, ey); g.stroke();
    }
    var s = Math.sin(a), s2 = Math.sin(a + Math.PI);
    limb(hip, u * 1.18, s * 0.6, -Math.max(0, -Math.cos(a)) * 0.9);
    limb(hip, u * 1.18, s2 * 0.6, -Math.max(0, Math.cos(a)) * 0.9);
    g.beginPath(); g.moveTo(hip.x, hip.y); g.lineTo(neck.x, neck.y); g.stroke();
    limb({ x: neck.x, y: neck.y + u * 0.25 }, u * 0.85, s2 * 0.7, 0.5);
    limb({ x: neck.x, y: neck.y + u * 0.25 }, u * 0.85, s * 0.7, 0.5);
    g.fillStyle = css("--paper"); g.beginPath(); g.arc(neck.x + u * 0.1, neck.y - u * 0.72, u * 0.7, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = pink; g.beginPath(); g.arc(neck.x + u * 0.42, neck.y - u * 0.8, u * 0.1, 0, Math.PI * 2); g.fill();
  }

  var sticks = Array.prototype.slice.call(document.querySelectorAll("[data-stickman]"));
  function frame(ms) {
    var t = ms / 1000;
    drawBall(t);
    sticks.forEach(function (c) { drawStick(c, t); });
    if (!still) requestAnimationFrame(frame);
  }
  if (still) { frame(2600); window.addEventListener("resize", function () { frame(2600); }); }
  else requestAnimationFrame(frame);
})();
