// Cartoon 2.5D engine: camera with real parallax (layers at depth), DOF per layer, motion blur by sub-frame averaging.
'use strict';
const W = 1080, H = 1920, F = 1000, INK = '#1f1a2e', BPM = 120, BEAT = 60 / BPM;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const sm = k => k * k * (3 - 2 * k);
const smt = (t, a, b) => sm(seg(t, a, b));
const eio = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const eout = k => 1 - Math.pow(1 - k, 3);
const ein = k => k * k * k;
const back = (k, s = 1.8) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
// damped spring 0->1 with overshoot, t seconds since start
const spring = (t, f = 14, d = 7) => t <= 0 ? 0 : 1 - Math.exp(-d * t) * Math.cos(f * t);
// decaying wobble around 0
const wob = (t, f = 18, d = 6) => t <= 0 ? 0 : Math.exp(-d * t) * Math.sin(f * t);
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const noise1 = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };
const mix = (c1, c2, k) => { const a = hex(c1), b = hex(c2); return `rgb(${Math.round(lerp(a[0], b[0], k))},${Math.round(lerp(a[1], b[1], k))},${Math.round(lerp(a[2], b[2], k))})`; };
const hex = c => c[0] === '#' ? [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)) : c.match(/\d+/g).map(Number);

// ---------- keyed camera ----------
// keys: [t, x, y, cz, rot]; Catmull-Rom through keys -> smooth velocity across keys
function keyed(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  const n = keys.length; if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0; while (keys[i + 1][0] < t) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
  const u = (t - k1[0]) / (k2[0] - k1[0]), e = k1[6] === 'hold' ? 0 : (k2[6] === 'snap' ? eio(u) : u);
  const out = [];
  for (let j = 1; j < k1.length && j < 6; j++) {
    const p0 = k0[j], p1 = k1[j], p2 = k2[j], p3 = k3[j];
    const d1 = (k2[0] - k0[0]) || 1, d2 = (k3[0] - k1[0]) || 1, dt = k2[0] - k1[0];
    const m1 = (p2 - p0) / d1 * dt, m2 = (p3 - p1) / d2 * dt, u2 = e * e, u3 = u2 * e;
    out.push((2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + e) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2);
  }
  return out;
}

// ---------- canvases ----------
const cv = document.getElementById('c'); cv.width = W; cv.height = H;
const out = cv.getContext('2d');
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const frameC = mk(), fctx = frameC.getContext('2d');
const layerC = mk(), lctx = layerC.getContext('2d');
const tmpC = mk(), tctx = tmpC.getContext('2d');
let CAM = { x: 0, y: 0, cz: F, rot: 0, focus: 0, ap: 0 };

function layerScale(z) { return F / (CAM.cz + z); }
function setLayer(ctx, z) {
  const s = layerScale(z);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.translate(W / 2, H / 2); ctx.rotate(CAM.rot); ctx.scale(s, s); ctx.translate(-CAM.x, -CAM.y);
}
function dofBlur(z) { return CAM.ap * Math.abs(layerScale(z) - layerScale(CAM.focus)) * 60; }
// draw a layer at depth z with depth-of-field blur
function layer(z, fn, opts = {}) {
  const b = (opts.blur != null ? opts.blur : dofBlur(z)) + (opts.extraBlur || 0);
  if (b < .6) { fctx.save(); setLayer(fctx, z); fn(fctx, layerScale(z)); fctx.restore(); return; }
  lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, W, H); lctx.save(); setLayer(lctx, z); fn(lctx, layerScale(z)); lctx.restore();
  fctx.save(); fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.filter = `blur(${Math.min(b, 40).toFixed(1)}px)`; fctx.drawImage(layerC, 0, 0); fctx.restore();
}
function screen(fn) { fctx.save(); fctx.setTransform(1, 0, 0, 1, 0, 0); fn(fctx); fctx.restore(); }

// ---------- drawing helpers ----------
function rr(c, x, y, w, h, r) {
  const r1 = Array.isArray(r) ? r : [r, r, r, r];
  c.beginPath(); c.moveTo(x + r1[0], y); c.lineTo(x + w - r1[1], y); c.quadraticCurveTo(x + w, y, x + w, y + r1[1]);
  c.lineTo(x + w, y + h - r1[2]); c.quadraticCurveTo(x + w, y + h, x + w - r1[2], y + h); c.lineTo(x + r1[3], y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r1[3]); c.lineTo(x, y + r1[0]); c.quadraticCurveTo(x, y, x + r1[0], y); c.closePath();
}
function ink(c, fill, lw = 7) { if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); } }
function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(.01, r), 0, Math.PI * 2); }
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), rot, 0, Math.PI * 2); }
function hose(c, pts, w, fill, lw = 7) { // outlined tube through points (quadratic)
  const path = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); if (pts.length === 3) c.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]); else c.lineTo(pts[1][0], pts[1][1]); };
  c.lineCap = 'round'; c.lineJoin = 'round'; path(); c.strokeStyle = INK; c.lineWidth = w + lw * 2; c.stroke(); path(); c.strokeStyle = fill; c.lineWidth = w; c.stroke();
}
function shadowEll(c, x, y, rx, a = .18) { c.save(); c.globalAlpha = a; ell(c, x, y, rx, rx * .18); c.fillStyle = INK; c.fill(); c.restore(); }

// ---------- text ----------
const FT = (w, s) => `${w} ${s}px Rubik`, FP = s => `${s}px Pangolin`;
function txt(c, str, x, y, size, opts = {}) {
  c.save(); c.font = opts.font || FT(900, size); c.textAlign = opts.align || 'center'; c.textBaseline = 'alphabetic';
  if (opts.track) c.letterSpacing = opts.track + 'px';
  const lw = opts.lw != null ? opts.lw : size * .16;
  if (opts.shadow !== false) { c.fillStyle = opts.shadowCol || INK; c.fillText(str, x + size * .05, y + size * .07); c.lineWidth = lw; c.strokeStyle = opts.shadowCol || INK; c.lineJoin = 'round'; c.strokeText(str, x + size * .05, y + size * .07); }
  if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.lineJoin = 'round'; c.strokeText(str, x, y); }
  c.fillStyle = opts.fill || '#fff'; c.fillText(str, x, y); c.restore();
}
function measure(c, str, font, track = 0) { c.save(); c.font = font; if (track) c.letterSpacing = track + 'px'; const w = c.measureText(str).width; c.restore(); return w; }
// letters fall in with gravity + squash bounce; returns nothing
function dropText(c, str, x, y, size, t, t0, opts = {}) {
  const font = opts.font || FT(900, size), stag = opts.stagger || .05;
  c.save(); c.font = font; const ws = [...str].map(ch => c.measureText(ch).width); c.restore();
  const tot = ws.reduce((a, b) => a + b, 0); let cx = x - tot / 2;
  [...str].forEach((ch, i) => {
    const w = ws[i], lt = t - t0 - i * stag; cx += w;
    if (lt <= 0 || ch === ' ') return;
    const fall = .22, k = clamp(lt / fall), yy = y - (1 - k * k) * (opts.from || 700);
    const land = lt - fall, sq = land > 0 ? wob(land, 22, 7) * .35 : 0;
    const sx = 1 + sq, sy = 1 - sq, rot = (hash(i + str.length) - .5) * .25 * Math.exp(-Math.max(0, land) * 5) + (opts.tilt ? opts.tilt(i) : 0);
    c.save(); c.translate(cx - w / 2, yy); c.rotate(rot); c.scale(sx, sy);
    txt(c, ch, 0, 0, size, { font, fill: opts.fill ? (typeof opts.fill === 'function' ? opts.fill(i) : opts.fill) : '#fff' }); c.restore();
  });
}
// pop-in plate (rounded, inked, offset shadow) with text lines
function plate(c, x, y, w, h, t, t0, opts = {}) {
  const lt = t - t0; if (lt <= 0) return;
  const k = opts.out != null && t > opts.out ? 1 - eout(seg(t, opts.out, opts.out + .25)) : spring(lt, 16, 8);
  if (k <= .001) return;
  c.save(); c.translate(x, y); c.rotate((opts.rot || 0) + wob(lt, 14, 5) * .08); c.scale(k, k);
  rr(c, -w / 2 + 10, -h / 2 + 14, w, h, opts.r || 34); c.fillStyle = INK; c.fill();
  rr(c, -w / 2, -h / 2, w, h, opts.r || 34); ink(c, opts.fill || '#fff', 8);
  if (opts.draw) opts.draw(c, lt);
  c.restore();
}
function stamp(c, str, x, y, size, t, t0, col) {
  const lt = t - t0; if (lt <= 0) return;
  const k = clamp(lt / .16), s = lerp(3.2, 1, eout(k)) + wob(lt - .16, 30, 9) * .08, a = clamp(lt / .08);
  c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(-.1); c.scale(s, s);
  c.font = FT(900, size); const w = c.measureText(str).width + size * .9;
  rr(c, -w / 2 + 12, -size * .78 + 16, w, size * 1.35, 26); c.fillStyle = INK; c.fill();
  rr(c, -w / 2, -size * .78, w, size * 1.35, 26); ink(c, col, 9);
  txt(c, str, 0, size * .3, size, { fill: '#fff', shadow: false }); c.restore();
}

// ---------- characters ----------
const SKIN = '#ffc79a', PJ = '#5b7cff', PJ2 = '#8fa6ff';
// Tema: origin at feet; ~300 tall
function tema(c, p) {
  const t = p.t || 0;
  c.save(); c.translate(p.x, p.y); c.rotate(p.rot || 0); c.scale((p.s || 1) * (p.sx || 1) * (p.flip ? -1 : 1), (p.s || 1) * (p.sy || 1));
  const breathe = Math.sin(t * 2.4) * 3;
  // legs
  if (!p.noLegs) {
    const ph = p.run != null ? p.run : null;
    [-1, 1].forEach(sd => {
      let fx = sd * 48, fy = 0, lift = 0;
      if (ph != null) { const a = ph * Math.PI * 2 + (sd > 0 ? Math.PI : 0); fx = sd * 30 + Math.cos(a) * 55; lift = Math.max(0, Math.sin(a)) * 40; fy = -lift; }
      hose(c, [[sd * 42, -60], [fx, fy - 14]], 30, p.legCol || PJ);
      ell(c, fx + 12, fy - 6, 30, 16); ink(c, p.sockCol ? p.sockCol(sd) : '#fff', 7);
    });
  }
  // back arm
  const shoulderY = -128 + breathe * .5;
  const arm = (sd, tgt) => {
    const sx = sd * 92, h = tgt || [sd * 128, -40];
    const mx = (sx + h[0]) / 2 + sd * 18, my = (shoulderY + h[1]) / 2 + 24;
    hose(c, [[sx, shoulderY], [mx, my], h], 24, p.sleeve || PJ);
    circ(c, h[0], h[1], 21); ink(c, SKIN, 7);
    if (p.point && p.point === sd) { c.save(); c.translate(h[0], h[1]); c.rotate(Math.atan2(h[1] - my, h[0] - mx)); rr(c, 8, -8, 34, 16, 8); ink(c, SKIN, 6); c.restore(); }
  };
  if (p.armBack !== false) arm(-1, p.armL);
  // body bean
  const bw = 212, top = -330 + breathe, bot = -50;
  const body = () => { c.beginPath(); c.moveTo(-bw / 2, bot - 60); c.bezierCurveTo(-bw / 2, top + 40, -bw / 2 + 30, top, 0, top); c.bezierCurveTo(bw / 2 - 30, top, bw / 2, top + 40, bw / 2, bot - 60); c.bezierCurveTo(bw / 2, bot + 6, bw / 2 - 30, bot + 12, 0, bot + 12); c.bezierCurveTo(-bw / 2 + 30, bot + 12, -bw / 2, bot + 6, -bw / 2, bot - 60); c.closePath(); };
  body(); c.fillStyle = SKIN; c.fill();
  c.save(); body(); c.clip(); c.fillStyle = p.shirt || PJ; c.fillRect(-150, -150, 300, 200);
  if (!p.shirt) { c.strokeStyle = PJ2; c.lineWidth = 14; for (let i = -6; i < 6; i++) { c.beginPath(); c.moveTo(i * 40, -150); c.lineTo(i * 40 + 90, 40); c.stroke(); } }
  c.beginPath(); c.moveTo(-120, -150); c.quadraticCurveTo(0, -128, 120, -150); c.lineWidth = 7; c.strokeStyle = INK; c.stroke();
  // cheek shade
  c.globalAlpha = .12; ell(c, 60, -230, 60, 80); c.fillStyle = INK; c.fill(); c.restore();
  body(); ink(c, null, 8);
  // hair tuft
  const hs = p.hair || 0;
  c.save(); c.translate(0, top + 6);
  for (let i = -1; i <= 1; i++) {
    const a = i * (.45 + hs * .35) + Math.sin(t * 3 + i) * .05, L = 46 + hs * 40 + (i === 0 ? 16 : 0);
    c.beginPath(); c.moveTo(i * 16 - 14, 4); c.quadraticCurveTo(i * 16 + Math.sin(a) * L * .6 - 10, -L * .6, i * 16 + Math.sin(a) * L, -Math.cos(a) * L); c.quadraticCurveTo(i * 16 + Math.sin(a) * L * .4 + 10, -L * .35, i * 16 + 14, 4); c.closePath(); ink(c, '#5a3a2a', 6);
  }
  c.restore();
  // face
  const ey = -232 + breathe, pop = p.pop || 1;
  const look = p.look || [0, 0];
  [-1, 1].forEach(sd => {
    const ex = sd * 44, rx = 44 * pop, ry = 52 * pop;
    ell(c, ex, ey, rx, ry); ink(c, '#fff', 7);
    const pr = 17 * (p.pupil || 1) / Math.sqrt(pop);
    const px = ex + look[0] * (rx - pr - 6), py = ey + look[1] * (ry - pr - 8);
    circ(c, px, py, pr); c.fillStyle = INK; c.fill(); circ(c, px - pr * .35, py - pr * .4, pr * .35); c.fillStyle = '#fff'; c.fill();
    const lid = clamp(sd < 0 ? (p.lidL != null ? p.lidL : p.lid || 0) : (p.lidR != null ? p.lidR : p.lid || 0));
    if (lid > 0.01) {
      c.save(); ell(c, ex, ey, rx, ry); c.clip(); c.fillStyle = SKIN; c.fillRect(ex - rx - 2, ey - ry - 2, rx * 2 + 4, ry * 2 * lid + 2);
      c.beginPath(); c.moveTo(ex - rx, ey - ry + ry * 2 * lid); c.lineTo(ex + rx, ey - ry + ry * 2 * lid); c.lineWidth = 8; c.strokeStyle = INK; c.stroke(); c.restore();
      ell(c, ex, ey, rx, ry); ink(c, null, 7);
    }
    // brows: b>0 raised (surprise), b<0 inner ends down (angry/worried)
    const b = p.brow || 0, raise = Math.max(0, b) * 18, inner = b < 0 ? -b * 18 : 0;
    c.beginPath(); c.moveTo(ex + sd * 32, ey - ry - 12 - raise); c.lineTo(ex - sd * 30, ey - ry - 12 - raise + inner - Math.max(0, b) * 6); c.lineWidth = 11; c.strokeStyle = INK; c.lineCap = 'round'; c.stroke();
  });
  // blush
  c.save(); c.globalAlpha = .35 + (p.blush || 0) * .4; [-1, 1].forEach(sd => { ell(c, sd * 80, ey + 52, 20, 11); c.fillStyle = '#ff6f7d'; c.fill(); }); c.restore();
  // mouth
  const my = -160 + breathe, m = p.mouth || 'smile', mo = p.mouthOpen != null ? p.mouthOpen : .5;
  c.lineWidth = 8; c.strokeStyle = INK; c.lineCap = 'round';
  if (m === 'smile') { c.beginPath(); c.arc(0, my - 18, 30, .2 * Math.PI, .8 * Math.PI); c.stroke(); }
  else if (m === 'flat') { c.beginPath(); c.moveTo(-22, my); c.lineTo(22, my); c.stroke(); }
  else if (m === 'sleepy') { c.beginPath(); c.moveTo(-18, my); c.quadraticCurveTo(0, my + 8, 18, my - 2); c.stroke(); }
  else if (m === 'wavy') { c.beginPath(); c.moveTo(-34, my); for (let i = 1; i <= 6; i++) c.lineTo(-34 + i * 11.3, my + (i % 2 ? -9 : 9)); c.stroke(); }
  else if (m === 'grin' || m === 'o' || m === 'yawn' || m === 'scream') {
    c.beginPath();
    if (m === 'grin') { c.moveTo(-40, my - 12); c.quadraticCurveTo(0, my - 4, 40, my - 12); c.quadraticCurveTo(36, my + 34 * mo + 10, 0, my + 36 * mo + 12); c.quadraticCurveTo(-36, my + 34 * mo + 10, -40, my - 12); }
    else { const rx = m === 'o' ? 16 : m === 'scream' ? 34 : 26, ry = (m === 'o' ? 20 : m === 'scream' ? 44 : 36) * (.4 + mo * .8); c.ellipse(0, my + ry * .3, rx, ry, 0, 0, Math.PI * 2); }
    c.closePath(); ink(c, '#7a1f33', 7);
    c.save(); c.clip(); ell(c, 0, my + 40 * mo + 6, 26, 16); c.fillStyle = '#ff7b8a'; c.fill(); c.restore();
  }
  if (p.toothbrush) { // brush sticking out of mouth + foam
    c.save(); c.translate(26, my + 4); c.rotate(-.25 + Math.sin(t * 40) * .12); rr(c, 0, -7, 110, 14, 7); ink(c, '#3ad0c0', 6); rr(c, 96, -24, 26, 20, 5); ink(c, '#fff', 5); c.restore();
    for (let i = 0; i < 5; i++) { circ(c, -14 + i * 9 + Math.sin(t * 9 + i) * 3, my + 12 + (i % 2) * 6, 9 + (i % 3) * 3); ink(c, '#fff', 4); }
  }
  if (p.toast) { c.save(); c.translate(0, my + 14); c.rotate(.12); rr(c, -38, -22, 76, 58, 14); ink(c, '#e8a85a', 6); rr(c, -28, -14, 56, 42, 10); c.fillStyle = '#f7d394'; c.fill(); c.restore(); }
  // sweat
  if (p.sweat) { for (let i = 0; i < 3; i++) { const k = ((t * 1.6 + i / 3) % 1); c.save(); c.globalAlpha = p.sweat * (1 - k); const sx = (i % 2 ? 1 : -1) * (120 + k * 30), sy = top + 70 + k * 80; c.beginPath(); c.moveTo(sx, sy - 22); c.quadraticCurveTo(sx + 14, sy, sx, sy + 8); c.quadraticCurveTo(sx - 14, sy, sx, sy - 22); ink(c, '#8fe3ff', 5); c.restore(); } }
  if (p.armFront !== false) arm(1, p.armR);
  c.restore();
}

// Dzyn: alarm clock character; origin bottom center, ~250 tall
function dzyn(c, p) {
  const t = p.t || 0, ring = p.ring || 0;
  const hop = ring > 0 ? Math.abs(Math.sin(Math.PI * t / BEAT * 2)) * 34 * ring : 0;
  const sh = ring * Math.sin(t * 90) * 7, rotR = ring * Math.sin(t * 70) * .09;
  c.save(); c.translate(p.x + sh, p.y); c.scale((p.s || 1) * (p.sx || 1), (p.s || 1) * (p.sy || 1));
  shadowEll(c, 0, -2, 80 - hop * .6, .22);
  c.translate(0, -hop); c.rotate(rotR + (p.rot || 0));
  // legs
  [-1, 1].forEach(sd => { hose(c, [[sd * 40, -40], [sd * 52, -8]], 12, INK, 0); ell(c, sd * 58, -6, 24, 11); ink(c, '#ffcf3a', 6); });
  const cy = -140, R = 100;
  // bells
  [-1, 1].forEach(sd => {
    c.save(); c.translate(sd * 66, cy - 78); c.rotate(sd * .55 + ring * Math.sin(t * 95 + sd) * .2);
    c.beginPath(); c.arc(0, 0, 40, Math.PI, 0); c.lineTo(46, 6); c.lineTo(-46, 6); c.closePath(); ink(c, '#ffcf3a', 7);
    circ(c, 0, -42, 8); ink(c, '#ffcf3a', 5); c.restore();
  });
  // hammer
  c.save(); c.translate(0, cy - 100); c.rotate(ring * Math.sin(t * 110) * .7); hose(c, [[0, 0], [0, -40]], 8, INK, 0); circ(c, 0, -44, 11); ink(c, '#ffcf3a', 5); c.restore();
  // snooze button
  const press = p.press || 0;
  rr(c, -30, cy - R - 26 + press * 16, 60, 34 - press * 14, 10); ink(c, '#ff5d73', 7);
  // body
  const dent = p.dent || 0;
  c.beginPath(); for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2, d = dent * (Math.sin(a * 5 + 1) * .5 + .5) * Math.max(0, -Math.sin(a)) * 16; const r = R - d; i ? c.lineTo(Math.cos(a) * r, cy + Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, cy + Math.sin(a) * r); }
  c.closePath(); ink(c, p.col || '#ff4d5e', 8);
  c.save(); c.globalAlpha = .2; c.beginPath(); c.arc(0, cy, R - 4, -.2, Math.PI * .9); c.lineWidth = 16; c.strokeStyle = INK; c.stroke(); c.restore();
  circ(c, 0, cy, 80); ink(c, '#fff3e0', 6);
  // eyes
  const mood = p.mood || 'neutral', look = p.look || [0, 0];
  [-1, 1].forEach(sd => {
    const ex = sd * 28, ey = cy - 34;
    if (mood === 'dizzy') { c.lineWidth = 7; c.strokeStyle = INK; c.beginPath(); c.moveTo(ex - 11, ey - 11); c.lineTo(ex + 11, ey + 11); c.moveTo(ex + 11, ey - 11); c.lineTo(ex - 11, ey + 11); c.stroke(); return; }
    if (mood === 'happy') { c.lineWidth = 7; c.strokeStyle = INK; c.beginPath(); c.arc(ex, ey + 6, 13, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); return; }
    ell(c, ex, ey, 17, 21); ink(c, '#fff', 5); circ(c, ex + look[0] * 6, ey + look[1] * 7, 8); c.fillStyle = INK; c.fill();
    if (mood === 'angry' || mood === 'furious') { c.beginPath(); c.moveTo(ex - sd * 22, ey - 34); c.lineTo(ex + sd * 14, ey - 20); c.lineWidth = 8; c.stroke(); }
  });
  // mouth
  c.lineWidth = 6; c.strokeStyle = INK; const my = cy - 4;
  if (mood === 'happy' || mood === 'smug') { c.beginPath(); c.arc(0, my - 6, 16, .15 * Math.PI, .85 * Math.PI); c.stroke(); }
  else if (ring > .2 || mood === 'furious') { ell(c, 0, my, 14, 11 + ring * 5); ink(c, '#7a1f33', 5); }
  else if (mood === 'angry') { c.beginPath(); c.moveTo(-14, my + 4); c.quadraticCurveTo(0, my - 6, 14, my + 4); c.stroke(); }
  else { c.beginPath(); c.moveTo(-10, my); c.lineTo(10, my); c.stroke(); }
  // LCD time
  rr(c, -50, cy + 18, 100, 44, 10); ink(c, '#1d2a2a', 5);
  if (p.time != null) { const hh = Math.floor(p.time / 60), mm = Math.floor(p.time % 60); c.font = FT(800, 34); c.textAlign = 'center'; c.fillStyle = p.lcd || '#7dffb0'; c.fillText(`${hh}:${String(mm).padStart(2, '0')}`, 0, cy + 52); }
  if (p.bandage) { c.save(); c.translate(52, cy - 62); c.rotate(.6); rr(c, -30, -11, 60, 22, 8); ink(c, '#ffe2b8', 5); c.restore(); }
  c.restore();
  // ring arcs (not rotated with body)
  if (ring > .05) {
    c.save(); c.translate(p.x, p.y - ((p.s || 1) * (140 + 78)) - hop * (p.s || 1)); c.lineWidth = 9; c.strokeStyle = INK; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const k = (t * 3 + i / 3) % 1, r = (70 + k * 120) * (p.s || 1); c.globalAlpha = ring * (1 - k); [-1, 1].forEach(sd => { c.beginPath(); c.arc(0, 0, r, sd < 0 ? Math.PI * 1.08 : -Math.PI * .32, sd < 0 ? Math.PI * 1.32 : -Math.PI * .08); c.stroke(); }); }
    c.restore();
  }
}

// ---------- bedroom set ----------
function skyCol(tod) { return [mix('#141a4a', '#ffb38a', clamp(tod * 1.6)), mix('#2b2f7a', '#8fd4ff', clamp(tod))]; }
function bedroomWall(c, tod, t) {
  c.fillStyle = mix('#2a3170', '#ffe1c2', tod); c.fillRect(-1450, -3600, 4400, 4400);
  c.fillStyle = mix('#323a82', '#ffd3ad', tod);
  for (let y = -3600; y < 700; y += 110) for (let x = -1430; x < 2900; x += 110) { circ(c, x + ((y / 110) % 2 ? 55 : 0), y, 14); c.fill(); }
  // window
  const wx = -330, wy = -760, ww = 440, wh = 560;
  const [s1, s2] = skyCol(tod); const g = c.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, s2); g.addColorStop(1, s1);
  rr(c, wx, wy, ww, wh, 24); c.fillStyle = g; c.fill();
  c.save(); rr(c, wx, wy, ww, wh, 24); c.clip();
  if (tod < .5) { c.globalAlpha = 1 - tod * 2; circ(c, wx + 310, wy + 130, 54); c.fillStyle = '#fff6c9'; c.fill(); circ(c, wx + 332, wy + 116, 46); c.fillStyle = g; c.fill(); c.globalAlpha = 1;
    for (let i = 0; i < 14; i++) { c.globalAlpha = (1 - tod * 2) * (.5 + .5 * Math.sin(t * 3 + i * 1.7)); circ(c, wx + hash(i) * ww, wy + hash(i + 9) * wh * .6, 4); c.fillStyle = '#fff'; c.fill(); } c.globalAlpha = 1; }
  if (tod > .2) { const sy = lerp(wy + wh + 60, wy + 170, clamp((tod - .2) / .8)); circ(c, wx + 150, sy, 70); c.fillStyle = '#ffe15a'; c.fill(); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); }
  // roofs
  c.fillStyle = mix('#1b1f52', '#7fa6d8', tod); c.beginPath(); c.moveTo(wx, wy + wh); [[0, -120], [80, -150], [80, -90], [200, -90], [200, -170], [300, -170], [300, -110], [440, -110], [440, 0]].forEach(([a, b]) => c.lineTo(wx + a, wy + wh + b)); c.fill();
  c.restore();
  rr(c, wx, wy, ww, wh, 24); ink(c, null, 10);
  c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.moveTo(wx, wy + wh / 2); c.lineTo(wx + ww, wy + wh / 2); c.lineWidth = 16; c.strokeStyle = '#fff'; c.stroke(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
  rr(c, wx - 30, wy + wh - 10, ww + 60, 34, 10); ink(c, '#fff', 7);
  // poster
  c.save(); c.translate(360, -820); c.rotate(.05); rr(c, -120, -150, 240, 300, 12); ink(c, mix('#5a4aa8', '#78d6c6', tod), 7);
  c.beginPath(); c.moveTo(0, -95); c.quadraticCurveTo(46, -30, 30, 60); c.lineTo(-30, 60); c.quadraticCurveTo(-46, -30, 0, -95); ink(c, '#fff', 6); circ(c, 0, -20, 16); ink(c, '#8fd4ff', 5);
  c.beginPath(); c.moveTo(-18, 66); c.lineTo(0, 110 + Math.sin(t * 20) * 8); c.lineTo(18, 66); ink(c, '#ffb03a', 5); c.restore();
}
function curtains(c, open, tod) {
  const wx = -330, wy = -790, ww = 440, wh = 600, col = mix('#7d3a8a', '#ff7f9e', tod);
  hose(c, [[wx - 80, wy], [wx + ww + 80, wy]], 12, '#c98a4b', 6);
  [-1, 1].forEach(sd => {
    const cw = lerp(ww / 2 + 20, 70, open), x0 = sd < 0 ? wx - 40 : wx + ww + 40 - cw;
    c.beginPath(); c.moveTo(x0, wy); c.lineTo(x0 + cw, wy); const b = 30 * Math.sin(open * 9) * (1 - open);
    c.quadraticCurveTo(x0 + cw + b, wy + wh * .5, x0 + cw - sd * 10, wy + wh); c.lineTo(x0, wy + wh); c.closePath(); ink(c, col, 7);
    c.save(); c.globalAlpha = .18; c.strokeStyle = INK; c.lineWidth = 6; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(x0 + cw * i / 4, wy + 10); c.lineTo(x0 + cw * i / 4 + b * .5, wy + wh - 10); c.stroke(); } c.restore();
  });
}
function floor(c, tod) { c.fillStyle = mix('#3a2a5a', '#d79b62', tod); c.fillRect(-1450, 430, 4400, 1400); c.strokeStyle = INK; c.globalAlpha = .25; c.lineWidth = 5; for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(-1450, 470 + i * 90); c.lineTo(2950, 470 + i * 90); c.stroke(); } c.globalAlpha = 1; c.beginPath(); c.moveTo(-1450, 430); c.lineTo(2950, 430); c.lineWidth = 8; c.stroke(); }
function bedBack(c, tod) {
  // headboard + frame
  rr(c, -560, -60, 70, 560, 30); ink(c, mix('#5a3a6a', '#b4744a', tod), 8);
  rr(c, -540, 300, 920, 120, 20); ink(c, mix('#4a3260', '#a5653d', tod), 8);
  rr(c, -520, 220, 880, 110, 40); ink(c, '#f4f1ff', 7);
  [-470, 330].forEach(x => { rr(c, x, 400, 40, 70, 8); ink(c, mix('#4a3260', '#a5653d', tod), 7); });
  // pillow
  c.save(); c.translate(-380, 170); c.rotate(-.06); rr(c, -120, -70, 240, 140, 60); ink(c, '#ffffff', 8); c.restore();
}
function blanket(c, tod, bump, t, lift = 0) {
  const col = mix('#c9a83a', '#ffd34d', tod), col2 = mix('#a98a2a', '#ffb22e', tod);
  c.save(); c.translate(lift * 900, -lift * 500); c.rotate(lift * .5);
  c.beginPath(); c.moveTo(-430, 300); c.lineTo(-430, 200);
  c.bezierCurveTo(-330, 130 - bump * 20, -130, 40 - bump * 30 + Math.sin(t * 2.4) * 6, 40, 90 + Math.sin(t * 2.4) * 4);
  c.bezierCurveTo(200, 140, 330, 150, 390, 210); c.lineTo(400, 320); c.quadraticCurveTo(0, 350, -430, 300); c.closePath(); ink(c, col, 8);
  c.save(); c.clip(); c.fillStyle = col2; for (let i = 0; i < 40; i++) { circ(c, -440 + (i % 10) * 95 + (Math.floor(i / 10) % 2) * 45, 40 + Math.floor(i / 10) * 80, 16); c.fill(); } c.restore();
  c.beginPath(); c.moveTo(-430, 215); c.bezierCurveTo(-330, 150 - bump * 20, -130, 64 - bump * 30, 40, 112); c.lineWidth = 5; c.strokeStyle = INK; c.globalAlpha = .35; c.stroke();
  c.restore();
}
function nightstand(c, tod) { rr(c, 370, 240, 230, 200, 14); ink(c, mix('#5a3a6a', '#c4844f', tod), 8); rr(c, 395, 290, 180, 70, 10); ink(c, mix('#6a4a7a', '#d9965f', tod), 6); circ(c, 485, 325, 10); ink(c, '#ffcf3a', 5); }
function plant(c, t) { // foreground leaves
  c.save(); c.translate(0, 0);
  for (let i = 0; i < 6; i++) { const a = -1.3 + i * .5 + Math.sin(t * 1.2 + i) * .04; c.save(); c.rotate(a); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(90, -200, 0, -440); c.quadraticCurveTo(-90, -200, 0, 0); ink(c, i % 2 ? '#2f9a5a' : '#3cb86c', 8); c.restore(); }
  rr(c, -110, -20, 220, 200, 30); ink(c, '#e86a4a', 8); c.restore();
}
// tod-based colour grade over the frame
function grade(tod, extra) {
  screen(c => {
    c.globalCompositeOperation = 'multiply'; c.globalAlpha = (1 - tod) * .55; c.fillStyle = '#3a3f9a'; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'screen'; c.globalAlpha = tod * .18; const g = c.createRadialGradient(W * .2, H * .25, 50, W * .2, H * .25, 1400); g.addColorStop(0, '#fff2b0'); g.addColorStop(1, 'rgba(255,242,176,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    const v = c.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75); v.addColorStop(0, 'rgba(20,10,40,0)'); v.addColorStop(1, 'rgba(20,10,40,.45)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  });
}
function grain(t) { screen(c => { c.globalAlpha = .06; c.drawImage(GRAIN[Math.floor(t * 30) % GRAIN.length], 0, 0, W, H); }); }
const GRAIN = [0, 1, 2, 3].map(k => { const g = document.createElement('canvas'); g.width = 270; g.height = 480; const x = g.getContext('2d'), d = x.createImageData(270, 480); for (let i = 0; i < d.data.length; i += 4) { const v = hash(i * .37 + k * 91.3) * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return g; });

// speed lines for whips / shocks (screen space)
function speedLines(c, k, cx = W / 2, cy = H / 2, t = 0) { if (k <= 0) return; c.save(); c.strokeStyle = INK; c.lineCap = 'round'; for (let i = 0; i < 40; i++) { const a = hash(i) * Math.PI * 2, r0 = 380 + hash(i + 5) * 300 - k * 120, L = 200 + hash(i + 3) * 400; c.globalAlpha = k * .5 * (.5 + .5 * Math.sin(t * 30 + i)); c.lineWidth = 6 + hash(i + 7) * 10; c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * (r0 + L), cy + Math.sin(a) * (r0 + L)); c.stroke(); } c.restore(); }

// ---------- frame loop with motion blur ----------
let PART = null;
function drawFrame(t) { fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.filter = 'none'; fctx.globalAlpha = 1; fctx.globalCompositeOperation = 'source-over'; fctx.fillStyle = '#000'; fctx.fillRect(0, 0, W, H); PART.render(t); }
window.renderAt = function (t, sub) {
  const S = sub == null ? 4 : Math.max(1, sub), shutter = 1 / 120;
  out.setTransform(1, 0, 0, 1, 0, 0); out.globalAlpha = 1; out.filter = 'none';
  for (let k = 0; k < S; k++) {
    const ts = S === 1 ? t : t - shutter * (k / (S - 1) - .5);
    drawFrame(Math.max(0, ts));
    out.globalAlpha = 1 / (k + 1); out.drawImage(frameC, 0, 0);
  }
  out.globalAlpha = 1;
};
