/* 3D-модели, которые можно вращать. Собраны из простых фигур на three.js.
   Новая модель: напиши функцию-сборщик в BUILDERS и добавь на страницу
   <canvas data-model="имя">. */
(function () {
  "use strict";
  var section = document.getElementById("models");
  if (!section) return;
  var T = window.THREE;
  var probe = document.createElement("canvas");
  if (!T || !(probe.getContext("webgl") || probe.getContext("experimental-webgl"))) { section.hidden = true; return; }

  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function mat(color) { return new T.MeshToonMaterial({ color: color }); }
  function mesh(geo, m, x, y, z) { var o = new T.Mesh(geo, m); o.position.set(x || 0, y || 0, z || 0); return o; }
  var INK = 0x1b1226, WHITE = 0xffffff;

  function arm(m, len) {            // рука с точкой вращения в плече
    var pivot = new T.Group();
    pivot.add(mesh(new T.CylinderGeometry(0.07, 0.07, len, 12), m, 0, -len / 2, 0));
    pivot.add(mesh(new T.SphereGeometry(0.12, 16, 12), m, 0, -len, 0));
    return pivot;
  }
  function eye(x, y, z, r) {
    var g = new T.Group();
    var white = mesh(new T.SphereGeometry(r, 24, 16), mat(WHITE)); white.scale.z = 0.4;
    var pupil = mesh(new T.SphereGeometry(r * 0.42, 16, 12), mat(INK), 0, 0, r * 0.36); pupil.scale.z = 0.4;
    g.add(white, pupil); g.position.set(x, y, z);
    return g;
  }

  var BUILDERS = {
    // Алекс: розовая «пилюля» в очках, машет рукой
    alex: function () {
      var g = new T.Group(), pink = mat(0xff4d9a), dark = mat(0xd42f7c);
      g.add(mesh(new T.CylinderGeometry(0.8, 0.8, 1.2, 40), pink, 0, 0.6, 0));
      g.add(mesh(new T.SphereGeometry(0.8, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), pink, 0, 1.2, 0));
      [-0.29, 0.29].forEach(function (x) {
        g.add(eye(x, 1.28, 0.72, 0.21));
        g.add(mesh(new T.TorusGeometry(0.26, 0.035, 10, 32), mat(INK), x, 1.28, 0.78));
      });
      var bridge = mesh(new T.CylinderGeometry(0.03, 0.03, 0.1, 8), mat(INK), 0, 1.28, 0.8); bridge.rotation.z = Math.PI / 2; g.add(bridge);
      var mouth = mesh(new T.SphereGeometry(0.09, 16, 12), mat(INK), 0, 0.88, 0.78); mouth.scale.set(1, 0.8, 0.4); g.add(mouth);
      var left = arm(dark, 0.55); left.position.set(-0.8, 0.85, 0); left.rotation.z = -0.5; g.add(left);
      var right = arm(dark, 0.6); right.position.set(0.8, 0.9, 0); g.add(right);
      return { group: g, tick: function (t) {
        right.rotation.z = 2.3 + Math.sin(t * 6) * 0.35;
        g.position.y = Math.abs(Math.sin(t * 3)) * 0.06;
      } };
    },
    // Семён: серо-синий кубик с сонными глазами
    semyon: function () {
      var g = new T.Group(), blue = mat(0x8296b4), dark = mat(0x61738f);
      var w = 1.3, h = 1.1, r = 0.22, s = new T.Shape();
      s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
      s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      var geo = new T.ExtrudeGeometry(s, { depth: 1, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 5, curveSegments: 8 });
      geo.center();
      var body = new T.Group(); body.position.y = 0.95; g.add(body);
      body.add(mesh(geo, blue));
      var lids = [];
      [-0.32, 0.32].forEach(function (x) {
        body.add(eye(x, 0.1, 0.6, 0.2));
        var lid = mesh(new T.SphereGeometry(0.215, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), dark, x, 0.1, 0.6);
        lid.scale.z = 0.45; lid.rotation.x = -0.25; body.add(lid); lids.push(lid);
      });
      body.add(mesh(new T.BoxGeometry(0.3, 0.045, 0.03), mat(INK), 0, -0.27, 0.61));
      [-1, 1].forEach(function (k) {
        var a = arm(dark, 0.5); a.position.set(k * 0.74, -0.05, 0); a.rotation.z = k * 0.35; body.add(a);
        g.add(mesh(new T.CylinderGeometry(0.08, 0.08, 0.3, 12), dark, k * 0.3, 0.2, 0));
        var foot = mesh(new T.SphereGeometry(0.14, 16, 12), dark, k * 0.3, 0.06, 0.06); foot.scale.set(1, 0.5, 1.4); g.add(foot);
      });
      return { group: g, tick: function (t) {
        body.scale.y = 1 + Math.sin(t * 1.6) * 0.025;       // дышит
        var blink = (t % 4.2) < 0.18 ? 0.5 : -0.25;          // иногда моргает
        lids.forEach(function (l) { l.rotation.x = blink; });
      } };
    }
  };

  document.querySelectorAll("canvas[data-model]").forEach(function (canvas) {
    var build = BUILDERS[canvas.dataset.model];
    if (!build) return;
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 1.5, 6.4); camera.lookAt(0, 0.8, 0);
    scene.add(new T.AmbientLight(0xffffff, 0.5));
    var sun = new T.DirectionalLight(0xffffff, 0.5); sun.position.set(3, 5, 4); scene.add(sun);
    var shadow = mesh(new T.CircleGeometry(1, 40), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }));
    shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1, 0.8, 1); scene.add(shadow);

    var model = build(), turn = new T.Group();
    turn.add(model.group); scene.add(turn);
    var ry = -0.45, rx = 0.08, vy = 0, dragging = false, lastX = 0, lastY = 0, idle = 0, visible = false, running = false;

    function size() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    function draw(ms) {
      var t = ms / 1000;
      if (!dragging) {
        ry += vy; vy *= 0.94;
        if (!still && ++idle > 90) ry += 0.006;              // сам медленно крутится, пока не трогают
      }
      turn.rotation.set(rx, ry, 0);
      model.tick(still ? 1.3 : t);
      renderer.render(scene, camera);
    }
    function loop(ms) {
      if (!visible) { running = false; return; }
      draw(ms); requestAnimationFrame(loop);
    }
    function wake() { if (!running && visible) { running = true; requestAnimationFrame(loop); } }

    canvas.addEventListener("pointerdown", function (e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY; vy = 0; idle = 0;
      canvas.setPointerCapture(e.pointerId); canvas.classList.add("grab");
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
      vy = dx * 0.011; ry += vy;
      rx = Math.max(-0.5, Math.min(0.6, rx + dy * 0.006));
    });
    function release() { dragging = false; idle = 0; canvas.classList.remove("grab"); }
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("keydown", function (e) {
      var k = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (!k) return;
      e.preventDefault(); ry += k * 0.25; idle = 0;
    });

    window.addEventListener("resize", size);
    size();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) { size(); wake(); } }).observe(canvas);
    } else { visible = true; wake(); }
  });
})();
