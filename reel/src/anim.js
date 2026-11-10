'use strict';
/* «День 1 из 30» — Алекс vs Семён. Deterministic canvas timeline: window.renderAt(t). */
const W = 1080, H = 1920, TL = window.TL, M = TL.m, DUR = TL.dur, VOICE = window.VOICE || {};
const cv = document.getElementById('c'), out = cv.getContext('2d');
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const scn = mk(W, H), ctx = scn.getContext('2d');
const acc = mk(W, H), actx = acc.getContext('2d');

/* ---------- math ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eOut = x => 1 - Math.pow(1 - x, 3);
const eIn = x => x * x * x;
const eIO = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eBack = x => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const eElastic = x => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -9 * x) * Math.sin((x * 8 - .75) * 2.094) + 1;
const pop = (t, t0, d = .35) => t < t0 ? 0 : eBack(seg(t, t0, t0 + d));
const pulse = (t, t0, d = .3) => t < t0 ? 0 : Math.exp(-(t - t0) / d);          // decaying hit
const bump = (t, t0, d = .25) => { const x = (t - t0) / d; return x < 0 || x > 1 ? 0 : Math.sin(x * Math.PI); };
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ s >>> 15, 1 | s); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const noise1 = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };
const pcol = s => s[0] === '#' ? [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)] : s.match(/\d+/g).map(Number);
const mixc = (a, b, t) => { const A = pcol(a), B = pcol(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; };

/* ---------- palette ---------- */
const C = { aBg0: '#160a2b', aBg1: '#35105a', pink: '#ff3d9a', yel: '#e8ff3a', cyan: '#3df2ff', vio: '#8b5cff',
  paper: '#ebe5d9', paper2: '#d9d1c2', ink: '#262a31', cube: '#6f8fae', cubeD: '#4f6b88', green: '#19c66b', greenL: '#7dffb4', red: '#ff2d3d', white: '#ffffff' };
const F = { h9: (s) => `900 ${s}px Unbounded, Inter, sans-serif`, h7: (s) => `700 ${s}px Unbounded, Inter, sans-serif`,
  b: (s, w = 700) => `${w} ${s}px Inter, sans-serif`, m: (s) => `800 ${s}px "JetBrains Mono", monospace` };

/* ---------- drawing helpers ---------- */
function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function txt(c, s, x, y, font, fill, align = 'center', base = 'middle') { c.font = font; c.textAlign = align; c.textBaseline = base; c.fillStyle = fill; c.fillText(s, x, y); }
function glowSprite(col, r) { const c = mk(r * 2, r * 2), g = c.getContext('2d'); const gr = g.createRadialGradient(r, r, 0, r, r, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); return c; }
const GL = { pink: glowSprite('rgba(255,61,154,.55)', 256), cyan: glowSprite('rgba(61,242,255,.5)', 256), yel: glowSprite('rgba(232,255,58,.5)', 256), vio: glowSprite('rgba(139,92,255,.6)', 256), red: glowSprite('rgba(255,45,61,.6)', 256), warm: glowSprite('rgba(255,214,140,.55)', 256), green: glowSprite('rgba(25,198,107,.55)', 256), white: glowSprite('rgba(255,255,255,.7)', 128) };
function glow(c, name, x, y, r, a = 1) { if (a <= 0) return; c.save(); c.globalAlpha *= a; c.globalCompositeOperation = 'lighter'; c.drawImage(GL[name], x - r, y - r, r * 2, r * 2); c.restore(); }

/* ---------- timeline state ---------- */
const clicks = TL.clicks;
function semPct(t) { let p = 0, last = -9; for (const k of clicks) if (t >= k.t) { p = k.p; last = k.t; } let prev = 0; for (const k of clicks) if (k.t < last) prev = k.p; if (t >= M.s6) return lerp(100, 0, eIO(seg(t, M.s6 + .1, M.s6 + .6))); return lerp(prev, p, eElastic(seg(t, last, last + .45))); }
function lastClick(t) { let last = -9; for (const k of clicks) if (t >= k.t) last = k.t; return last; }
function nClicks(t) { let n = 0; for (const k of clicks) if (t >= k.t) n++; return n; }
function dayAt(t) { let d = TL.days[0], prev = TL.days[0]; for (const k of TL.days) if (t >= k[0]) { prev = d; d = k; } return { n: d[1], t0: d[0], prev: prev[1] }; }
function voAt(t, who) { for (const v of TL.vo) { const d = (VOICE[v.id] && VOICE[v.id].dur) || 2.4; if (v.who === who && t >= v.t - .05 && t < v.t + d + .35) return { v, d, age: t - v.t }; } return null; }
function mouth(t, who) { const a = voAt(t, who); if (!a) return 0; const e = VOICE[a.v.id] && VOICE[a.v.id].env; if (!e) return a.age > 0 && a.age < a.d ? .35 + .35 * Math.sin(a.age * 22) : 0; const i = a.age * 60; const i0 = Math.floor(i); if (i0 < 0 || i0 >= e.length - 1) return 0; return lerp(e[i0], e[i0 + 1], i - i0); }
const beat = t => (t * TL.bpm / 60);
const musicOn = t => t < M.s4 || t >= M.s5;

/* ---------- camera ---------- */
const BAR_A = { x: 540, y: 310 };
const CAM = [ // t, x, y, zoom, rot(deg)
  [0, 540, 520, 1.3, -4], [1.2, 546, 526, 1.36, -2.4], [M.hookOut, 540, 532, 1.3, -1.2], [M.s1 + .1, 540, 930, 1.0, 0],
  [5.0, 540, 900, 1.05, .6], [6.4, 540, 1010, 1.07, -.5], [8.4, 540, 1040, 1.1, .4], [9.0, 540, 950, 1.0, 0],
  [10.6, 560, 905, 1.09, 1.1], [11.6, 530, 990, 1.05, -.8], [12.8, 520, 900, 1.1, -1.2], [14.2, 545, 930, 1.04, .7], [15.3, 540, 915, 1.08, .3], [16.4, 540, 1015, 1.1, -.5],
  [M.s3, 540, 960, 1.0, 0], [M.s3 + .5, 540, -1100, 1.0, 0], [M.tunnelOut - .01, 540, -1100, 1.0, 0], [M.tunnelOut + .5, 540, 1020, 1.06, 0],
  [23.6, 545, 1035, 1.1, .6], [24.4, 535, 900, 1.08, -.8], [26.3, 540, 925, 1.12, .5],
  [M.s4, 540, 960, 1.0, 0], [29.0, 540, 950, 1.03, -.3], [30.6, 540, 985, 1.05, .3], [31.6, 540, 1010, 1.06, 0], [M.s5 - .05, 372, 612, 2.5, -1.5],
  [M.s5 + .12, 540, 955, .98, 0], [34.6, 540, 930, 1.03, .5], [M.send - .2, 470, 1330, 1.5, -.6], [M.zoomIn + .75, 335, 1340, 2.8, 0], [M.zoomOut - .1, 335, 1338, 2.95, 0],
  [M.zoomOut + .7, 540, 960, 1.0, 0], [M.buy4, 540, 925, 1.06, .5], [M.s6 + .5, 540, 960, 1.0, 0], [42.4, 540, 985, 1.03, -.3], [M.pushIn, 540, 950, 1.02, 0], [DUR, 540, 520, 1.3, -4]
];
function camAt(t) {
  let i = 0; while (i < CAM.length - 2 && t >= CAM[i + 1][0]) i++;
  const a = CAM[i], b = CAM[i + 1], p0 = CAM[Math.max(0, i - 1)], p3 = CAM[Math.min(CAM.length - 1, i + 2)];
  const u = clamp((t - a[0]) / (b[0] - a[0])), o = {};
  const names = ['x', 'y', 'z', 'r'];
  for (let k = 1; k <= 4; k++) {
    const f = k === 3 ? Math.log : (v => v);
    const y0 = f(p0[k]), y1 = f(a[k]), y2 = f(b[k]), y3 = f(p3[k]);
    // monotone-ish cubic hermite with clamped finite-difference tangents (keeps velocity through keys, no overshoot)
    const d = b[0] - a[0];
    let m1 = i > 0 ? (y2 - y0) / (b[0] - p0[0]) * d : (y2 - y1);
    let m2 = i < CAM.length - 2 ? (y3 - y1) / (p3[0] - a[0]) * d : (y2 - y1);
    const s = y2 - y1;
    if (s === 0) { m1 = 0; m2 = 0; } else { if (m1 / s < 0) m1 = 0; if (m2 / s < 0) m2 = 0; m1 = Math.sign(s) * Math.min(Math.abs(m1), 3 * Math.abs(s)); m2 = Math.sign(s) * Math.min(Math.abs(m2), 3 * Math.abs(s)); }
    const u2 = u * u, u3 = u2 * u;
    const v = (2 * u3 - 3 * u2 + 1) * y1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * y2 + (u3 - u2) * m2;
    o[names[k - 1]] = k === 3 ? Math.exp(v) : v;
  }
  // living drift + impacts
  const dr = 1 - .8 * seg(t, M.s4, M.s4 + .5) * (1 - seg(t, M.s5 - .2, M.s5));
  o.x += (7 * Math.sin(t * .83) + 4 * noise1(t * 1.7)) * dr / o.z;
  o.y += (6 * Math.sin(t * .61 + 1.3) + 4 * noise1(t * 1.3 + 40)) * dr / o.z;
  o.r += (.35 * Math.sin(t * .47 + .6)) * dr;
  const sh = 26 * pulse(t, M.s5, .16) + 12 * pulse(t, 1.0, .1) + 9 * pulse(t, M.collapse + .75, .2) + 6 * pulse(t, M.final, .1);
  o.x += sh * noise1(t * 43); o.y += sh * noise1(t * 39 + 9);
  o.z *= 1 + .012 * Math.max(0, Math.sin(beat(t) * Math.PI * 2) ) * (musicOn(t) ? pulse(Math.floor(beat(t)) / 2, Math.floor(beat(t)) / 2, 1) * 0 + (1 - (beat(t) % 1)) * .6 : 0);
  return o;
}

/* ---------- characters ---------- */
function drawAlex(c, x, y, o = {}) {
  const sx = o.sx || 1, sy = o.sy || 1, m = o.mouth || 0, look = o.look || [0, 0], lag = o.lag || 0, blink = o.blink || 0, mood = o.mood || 'smug';
  c.save(); c.translate(x, y); c.rotate(o.rot || 0);
  // legs
  c.strokeStyle = '#2a0f3f'; c.lineWidth = 13; c.lineCap = 'round';
  if (!o.noLegs) { c.beginPath(); c.moveTo(-30, 100 * sy); c.lineTo(-34, 150); c.moveTo(30, 100 * sy); c.lineTo(34, 150); c.stroke(); }
  // arms
  const arm = (side, a) => { const ax = side * 78 * sx, ay = 10 * sy; const hx = ax + side * 62 * Math.cos(a), hy = ay + 62 * Math.sin(a); c.strokeStyle = '#d12a7c'; c.lineWidth = 15; c.beginPath(); c.moveTo(ax - side * 8, ay); c.quadraticCurveTo(ax + side * 35, ay + 20, hx, hy); c.stroke(); c.fillStyle = '#ff76b8'; c.beginPath(); c.arc(hx, hy, 15, 0, 7); c.fill(); };
  arm(-1, o.armL == null ? 1.0 : o.armL); arm(1, o.armR == null ? 1.0 : o.armR);
  c.scale(sx, sy);
  // body
  const g = c.createLinearGradient(-80, -130, 80, 130); g.addColorStop(0, '#ff7fc0'); g.addColorStop(.55, C.pink); g.addColorStop(1, '#c2186e');
  rr(c, -80, -125, 160, 250, 80); c.fillStyle = g; c.fill();
  c.save(); rr(c, -80, -125, 160, 250, 80); c.clip(); c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(-38, -70, 26, 70, .35, 0, 7); c.fill(); c.fillStyle = 'rgba(80,0,60,.25)'; c.fillRect(-80, 80, 160, 60); c.restore();
  // glasses (lag = secondary motion)
  const gy = -52 + lag * 9, tw = (o.twitch || 0);
  for (const s of [-1, 1]) {
    const ex = s * 36; c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, gy, 27, 0, 7); c.fill();
    const lid = Math.max(blink, s > 0 ? tw * .55 : 0);
    c.fillStyle = '#1a0b2e'; c.beginPath(); c.arc(ex + look[0] * 9 + (s > 0 ? tw * 2.5 * Math.sin(o.tt * 60) : 0), gy + look[1] * 8, mood === 'wow' ? 15 : 10.5, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + look[0] * 9 - 4, gy + look[1] * 8 - 4, mood === 'wow' ? 5.5 : 3.2, 0, 7); c.fill();
    if (mood === 'wow') { c.fillStyle = C.yel; c.beginPath(); c.arc(ex + look[0] * 9 + 5, gy + look[1] * 8 + 5, 3, 0, 7); c.fill(); }
    if (lid > 0) { c.fillStyle = '#ff5aa9'; c.beginPath(); c.rect(ex - 28, gy - 28, 56, 56 * lid); c.save(); c.beginPath(); c.arc(ex, gy, 27, 0, 7); c.clip(); c.fillRect(ex - 28, gy - 28, 56, 56 * lid); c.restore(); }
    if (mood === 'smug' || mood === 'zen') { c.save(); c.beginPath(); c.arc(ex, gy, 27, 0, 7); c.clip(); c.fillStyle = '#ff5aa9'; c.fillRect(ex - 28, gy - 28, 56, mood === 'zen' ? 30 : 15); c.restore(); }
    c.lineWidth = 7; c.strokeStyle = '#1a0b2e'; c.beginPath(); c.arc(ex, gy, 27, 0, 7); c.stroke();
  }
  c.lineWidth = 7; c.beginPath(); c.moveTo(-10, gy); c.lineTo(10, gy); c.stroke();
  // mouth
  c.fillStyle = '#4a0d33'; c.strokeStyle = '#4a0d33'; c.lineWidth = 6; c.lineCap = 'round';
  if (m > .06) { c.beginPath(); c.ellipse(0, 22, 17 + 5 * m, 5 + 20 * m, 0, 0, 7); c.fill(); c.fillStyle = '#ff9bb0'; c.beginPath(); c.ellipse(0, 22 + 12 * m, 9, 5 * m, 0, 0, 7); c.fill(); }
  else if (mood === 'panic') { c.beginPath(); for (let i = 0; i <= 6; i++) c.lineTo(-22 + i * 7.3, 24 + (i % 2 ? -5 : 5)); c.stroke(); }
  else if (mood === 'wow') { c.beginPath(); c.ellipse(0, 24, 14, 12, 0, 0, 7); c.fill(); }
  else { c.beginPath(); c.moveTo(-20, 18); c.quadraticCurveTo(4, 36, 24, 14); c.stroke(); }
  c.restore();
}
function drawSem(c, x, y, o = {}) {
  const sx = o.sx || 1, sy = o.sy || 1, m = o.mouth || 0, look = o.look || [0, 0], lid = o.lid == null ? .45 : o.lid;
  c.save(); c.translate(x, y); c.rotate(o.rot || 0);
  c.strokeStyle = C.cubeD; c.lineWidth = 15; c.lineCap = 'round';
  const arm = (side, tx, ty) => { const ax = side * 92 * sx, ay = 30; c.beginPath(); c.moveTo(ax - side * 8, ay); c.quadraticCurveTo(ax + side * 26, ay + 40, tx, ty); c.stroke(); c.fillStyle = '#9db6cf'; c.beginPath(); c.arc(tx, ty, 15, 0, 7); c.fill(); };
  arm(-1, o.hL ? o.hL[0] : -120, o.hL ? o.hL[1] : 95); arm(1, o.hR ? o.hR[0] : 120, o.hR ? o.hR[1] : 95);
  c.scale(sx, sy);
  const g = c.createLinearGradient(-95, -90, 95, 90); g.addColorStop(0, '#8fabc6'); g.addColorStop(1, C.cubeD);
  rr(c, -95, -88, 190, 176, 34); c.fillStyle = g; c.fill();
  c.save(); rr(c, -95, -88, 190, 176, 34); c.clip(); c.fillStyle = 'rgba(255,255,255,.16)'; c.fillRect(-95, -88, 190, 34); c.fillStyle = 'rgba(20,30,50,.18)'; c.fillRect(-95, 52, 190, 40); c.restore();
  for (const s of [-1, 1]) {
    const ex = s * 40, ey = -18; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey, 22, 20, 0, 0, 7); c.fill();
    c.fillStyle = C.ink; c.beginPath(); c.arc(ex + look[0] * 8, ey + look[1] * 6 + 3, 9, 0, 7); c.fill();
    c.save(); c.beginPath(); c.ellipse(ex, ey, 22, 20, 0, 0, 7); c.clip(); c.fillStyle = '#86a2bd'; c.fillRect(ex - 24, ey - 22, 48, 42 * lid); c.restore();
    c.strokeStyle = C.ink; c.lineWidth = 5; c.beginPath(); c.moveTo(ex - 22, ey - 20 + 42 * lid); c.lineTo(ex + 22, ey - 20 + 42 * lid); c.stroke();
  }
  c.strokeStyle = C.ink; c.fillStyle = C.ink; c.lineWidth = 6;
  if (m > .06) { c.beginPath(); c.ellipse(0, 36, 15 + 3 * m, 4 + 14 * m, 0, 0, 7); c.fill(); }
  else if (o.smirk) { c.beginPath(); c.moveTo(-18, 36); c.quadraticCurveTo(6, 42, 22, 28); c.stroke(); }
  else { c.beginPath(); c.moveTo(-16, 36); c.lineTo(16, 36); c.stroke(); }
  c.restore();
}

/* ---------- progress bars ---------- */
function drawBarSem(c, x, y, w, h, pct, t) {
  rr(c, x, y, w, h, 10); c.fillStyle = '#cfc7b7'; c.fill();
  c.save(); rr(c, x, y, w, h, 10); c.clip();
  const fw = w * Math.min(100, pct) / 100; const g = c.createLinearGradient(x, 0, x + Math.max(fw, 1), 0); g.addColorStop(0, '#12a657'); g.addColorStop(1, C.green);
  c.fillStyle = g; c.fillRect(x, y, fw, h);
  c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(x, y, fw, h * .38);
  const lc = lastClick(t), fl = pulse(t, lc, .22); if (fl > .02) { c.fillStyle = `rgba(255,255,255,${.55 * fl})`; c.fillRect(x + fw - 60, y, 60, h); }
  c.restore();
  c.lineWidth = 5; c.strokeStyle = C.ink; rr(c, x, y, w, h, 10); c.stroke();
}
function drawBarAlex(c, x, y, w, h, fancy, t) {
  const r = lerp(8, h / 2, fancy);
  if (fancy > .05) { glow(c, 'pink', x + w * .25, y + h / 2, 260 * fancy, .7 * fancy); glow(c, 'cyan', x + w * .75, y + h / 2, 260 * fancy, .6 * fancy); }
  // gradient border
  const gb = c.createLinearGradient(x + ((t * 220) % (w * 2)) - w, 0, x + ((t * 220) % (w * 2)) + w, 0);
  gb.addColorStop(0, C.pink); gb.addColorStop(.25, C.yel); gb.addColorStop(.5, C.cyan); gb.addColorStop(.75, C.vio); gb.addColorStop(1, C.pink);
  rr(c, x - 7, y - 7, w + 14, h + 14, r + 7); c.fillStyle = fancy > .15 ? gb : '#5b3a86'; c.fill();
  rr(c, x, y, w, h, r); c.fillStyle = '#120722'; c.fill();
  // empty track with stripes
  c.save(); rr(c, x, y, w, h, r); c.clip(); c.globalAlpha = .16 + .16 * fancy; c.strokeStyle = fancy > .3 ? C.cyan : '#7a5aa8'; c.lineWidth = 9;
  const off = (t * 60) % 44; for (let i = -2; i < w / 44 + 3; i++) { c.beginPath(); c.moveTo(x + i * 44 + off, y + h + 6); c.lineTo(x + i * 44 + off + h, y - 6); c.stroke(); }
  c.restore();
  if (fancy > .4) { // sparkles
    const R = rng(7); for (let i = 0; i < 9; i++) { const px = x + R() * w, py = y - 26 + R() * (h + 52), ph = R() * 6.28, s = (Math.sin(t * (2 + R() * 3) + ph) * .5 + .5) * 11 * fancy; c.fillStyle = i % 2 ? C.yel : '#fff'; c.beginPath(); c.moveTo(px, py - s); c.quadraticCurveTo(px, py, px + s, py); c.quadraticCurveTo(px, py, px, py + s); c.quadraticCurveTo(px, py, px - s, py); c.quadraticCurveTo(px, py, px, py - s); c.fill(); }
  }
}

/* ---------- Alex's props ---------- */
const STK = ['#e8ff3a', '#ffd23a', '#ffa23a', '#ff6a5a', '#ff3d9a', '#d24dff', '#8b5cff', '#5c8dff', '#3df2ff', '#3dffb5', '#b8ff5a', '#fff36a'];
function pCard(c, o) { // course card
  rr(c, -88, -58, 176, 116, 16); c.fillStyle = o.col; c.fill(); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(-88, 20, 176, 38);
  rr(c, -88, -58, 176, 116, 16); c.lineWidth = 5; c.strokeStyle = '#1a0b2e'; c.stroke();
  txt(c, 'КУРС', -70, -34, F.h9(19), '#1a0b2e', 'left'); txt(c, o.s || '', -70, -5, F.b(19, 800), '#1a0b2e', 'left');
  c.fillStyle = '#1a0b2e'; c.beginPath(); c.moveTo(52, -42); c.lineTo(74, -30); c.lineTo(52, -18); c.fill();
  c.fillStyle = 'rgba(255,255,255,.85)'; rr(c, -70, 31, 90, 9, 4); c.fill();
}
function pNeon(c, o, t) { const fl = o.dim ? .25 : (.85 + .15 * Math.sin(t * 9) * (hash(Math.floor(t * 12)) > .9 ? 0 : 1)); c.globalAlpha *= fl; glow(c, 'cyan', 0, 0, 150, .7); rr(c, -98, -36, 196, 72, 20); c.lineWidth = 6; c.strokeStyle = C.cyan; c.stroke(); txt(c, 'ФОКУС', 0, 2, F.h9(36), '#eaffff'); }
function pRing(c, o, t) { glow(c, 'warm', 0, -150, 150, o.dim ? .1 : .5); c.strokeStyle = '#3a2260'; c.lineWidth = 9; c.beginPath(); c.moveTo(0, -95); c.lineTo(0, 150); c.moveTo(-34, 150); c.lineTo(34, 150); c.stroke(); c.lineWidth = 19; c.strokeStyle = o.dim ? '#77658f' : '#fff6dd'; c.beginPath(); c.arc(0, -150, 55, 0, 7); c.stroke(); }
function pPlant(c, o, t) { c.fillStyle = '#ff8a3a'; c.beginPath(); c.moveTo(-30, 0); c.lineTo(30, 0); c.lineTo(22, 46); c.lineTo(-22, 46); c.fill(); c.strokeStyle = '#2bdc8a'; c.lineWidth = 11; c.lineCap = 'round'; for (let i = -2; i <= 2; i++) { const sw = Math.sin(t * 1.6 + i) * 5; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(i * 16, -42, i * 27 + sw, -74 - (2 - Math.abs(i)) * 14); c.stroke(); } }
function pSticky(c, o) { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(-25, -22, 56, 56); c.fillStyle = o.col; c.fillRect(-28, -28, 56, 56); c.fillStyle = 'rgba(0,0,0,.14)'; c.beginPath(); c.moveTo(28, 28); c.lineTo(10, 28); c.lineTo(28, 10); c.fill(); c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(-18, -14, 30, 4); c.fillRect(-18, -3, 22, 4); }
function pPage(c, o, t) { rr(c, -70, -92, 140, 184, 12); c.fillStyle = '#f6f3ff'; c.fill(); c.lineWidth = 4; c.strokeStyle = '#1a0b2e'; c.stroke(); c.fillStyle = o.col; rr(c, -56, -78, 60, 12, 5); c.fill(); for (let i = 0; i < 6; i++) { c.strokeStyle = '#1a0b2e'; c.lineWidth = 3; c.strokeRect(-56, -52 + i * 22, 12, 12); c.fillStyle = '#c9c0e6'; c.fillRect(-36, -49 + i * 22, 62 + 22 * hash(i + o.k * 9), 6); } }
function pClock(c, o, t) { const sh = o.ring ? Math.sin(t * 70) * 5 * o.ring : 0; c.translate(sh, 0); c.fillStyle = '#1a0b2e'; rr(c, -62, -36, 124, 72, 16); c.fill(); c.strokeStyle = C.yel; c.lineWidth = 5; rr(c, -62, -36, 124, 72, 16); c.stroke(); txt(c, '5:00', 0, 2, F.m(38), o.dim ? '#77658f' : C.yel); c.fillStyle = C.yel; c.beginPath(); c.arc(-40, -42, 12, Math.PI, 0); c.arc(40, -42, 12, Math.PI, 0); c.fill(); }
function pDash(c, o, t) { rr(c, -92, -62, 184, 124, 14); c.fillStyle = '#1b0f38'; c.fill(); c.lineWidth = 5; c.strokeStyle = C.vio; c.stroke(); const R = rng(o.k); for (let i = 0; i < 7; i++) { const hh = (20 + R() * 60) * (o.dim ? .4 : (.7 + .3 * Math.sin(t * 3 + i))); c.fillStyle = [C.pink, C.cyan, C.yel][i % 3]; c.fillRect(-76 + i * 23, 46 - hh, 15, hh); } }
function pTrophy(c, o, t) { glow(c, 'yel', 0, -10, 110, o.dim ? .1 : .5); c.fillStyle = C.yel; c.beginPath(); c.moveTo(-34, -52); c.lineTo(34, -52); c.quadraticCurveTo(30, 4, 0, 10); c.quadraticCurveTo(-30, 4, -34, -52); c.fill(); c.fillRect(-7, 8, 14, 22); rr(c, -30, 28, 60, 16, 5); c.fill(); txt(c, '98%', 0, -27, F.h9(19), '#1a0b2e'); }
function pBook(c, o) { rr(c, -78, -15, 156, 30, 6); c.fillStyle = o.col; c.fill(); c.lineWidth = 4; c.strokeStyle = '#1a0b2e'; c.stroke(); c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-60, -4, 70, 7); }
const PROPS = (() => {
  const P = [], add = (o) => { o.i = P.length; P.push(o); };
  add({ t: 4.1, x: 905, y: 462, d: pNeon, z: 0, m: 1 });
  add({ t: 4.5, x: 118, y: 650, d: pRing, z: 0, m: 2 });
  add({ t: M.buy1, x: 800, y: 728, d: pCard, col: C.yel, s: 'Продуктивность', z: 1, m: 1 });
  add({ t: 5.6, x: 985, y: 742, d: pPlant, z: 1, m: 1 });
  for (let i = 0; i < 12; i++) add({ t: M.stick + .08 + i * .125, x: 566 + (i % 4) * 66, y: 430 + Math.floor(i / 4) * 66, d: pSticky, col: STK[i], z: 0, m: .4, r: (hash(i) - .5) * .16 });
  for (let i = 0; i < 5; i++) add({ t: M.notion + .05 + i * .09, x: 110 + i * 34, y: 470 - Math.abs(i - 2) * 6, d: pPage, col: [C.pink, C.cyan, C.yel, C.vio, C.pink][i], k: i, z: 0, m: 1, r: (i - 2) * .13, fly: 1 });
  add({ t: M.buy2, x: 815, y: 660, d: pCard, col: C.cyan, s: 'Как проходить', z: 1, m: 1, r: -.07 });
  add({ t: M.alarm, x: 600, y: 742, d: pClock, z: 1, m: 1 });
  add({ t: 15.2, x: 925, y: 590, d: pDash, k: 3, z: 0, m: 1.2 });
  add({ t: 16.3, x: 700, y: 652, d: pBook, col: C.pink, z: 1, m: .6, r: .03 }); add({ t: 16.5, x: 706, y: 622, d: pBook, col: C.vio, z: 1, m: .6, r: -.04 });
  add({ t: M.tunnelOut + .2, x: 930, y: 700, d: pTrophy, z: 1, m: 1 });
  add({ t: M.tunnelOut + .25, x: 700, y: 592, d: pBook, col: C.yel, z: 1, m: .6, r: .05 }); add({ t: M.tunnelOut + .3, x: 694, y: 562, d: pBook, col: C.cyan, z: 1, m: .6, r: -.03 });
  add({ t: M.tunnelOut + .35, x: 250, y: 430, d: pDash, k: 8, z: 0, m: 1.2 });
  add({ t: M.buy3, x: 822, y: 592, d: pCard, col: '#ff8a3a', s: 'Всё за ночь', z: 1, m: 1, r: .06 });
  return P;
})();
function propState(p, t) { // returns {x,y,rot,scale}
  const R = rng(p.i * 13 + 5); const a = t - p.t; if (a < 0) return null;
  let x = p.x, y = p.y, rot = p.r || 0, s = eBack(clamp(a / .32));
  if (p.fly) { const u = eOut(clamp(a / .45)); x = lerp(330, p.x, u); y = lerp(700, p.y, u) - Math.sin(u * Math.PI) * 60; rot = lerp(-1.2, p.r, u); }
  y += Math.sin(t * 1.3 + p.i) * 2.2; rot += Math.sin(t * 1.1 + p.i * 2) * .012;
  if (p.d === pClock) p.ring = bump(t, M.alarm + .25, .9) > .1 ? 1 : 0;
  const tc = M.collapse + R() * .28 + (900 - p.y) * .0006, b = t - tc;
  if (b > 0 && t < M.s6 + 2) {
    const vx = (R() - .5) * 620, vy = -(180 + R() * 420), g = 2700, fl = 905 - 26 - R() * 22, w = (R() - .5) * 9;
    let tt = b, y0 = p.y, v0 = vy, bounces = 0, yy = y0;
    for (; bounces < 5; bounces++) { const disc = v0 * v0 + 2 * g * (fl - y0); const th = (-v0 + Math.sqrt(Math.max(0, disc))) / g; if (tt < th) { yy = y0 + v0 * tt + .5 * g * tt * tt; break; } tt -= th; v0 = -(v0 + g * th) * .42; y0 = fl; yy = fl; if (Math.abs(v0) < 60) { bounces = 9; break; } }
    const settle = bounces >= 5 ? 1 : 0, lim = settle ? b - tt : b;
    x = clamp(p.x + vx * Math.min(b, 1.5) * (1 - .25 * Math.min(b, 1.5)), 60, 1020); y = yy; rot = (p.r || 0) + w * Math.min(lim, 1.6) * (1 - .3 * Math.min(lim, 1.6));
    const rw = t - M.s6; if (rw > 0) { const u = eIn(clamp((rw - R() * .25) / .45)); s *= 1 - u; y -= u * 260; rot += u * 5; }
  }
  if (t > M.s6 + .8) return null;
  return { x, y, rot, s };
}

/* ---------- Alex half (world y 0..960) ---------- */
function alexHalf(c, t, cam) {
  const hype = seg(t, M.s1, M.s3), dim = seg(t, M.s4, M.s4 + .35) * (1 - seg(t, M.s6, M.s6 + .5)), fresh = t >= M.s6 + .45 || t < M.s1;
  c.save(); c.beginPath(); c.rect(-400, -700, 1880, 1660); c.clip();
  const px = (cam.x - 540), py = (cam.y - 480);
  const g = c.createLinearGradient(0, -200, 0, 960); g.addColorStop(0, mixc(C.aBg0, '#0a0514', dim)); g.addColorStop(1, mixc(mixc(C.aBg1, '#5a1280', hype), '#170a26', dim * .85));
  c.fillStyle = g; c.fillRect(-400, -700, 1880, 1660);
  // far layer: glows + grid (moves with camera => feels far)
  c.save(); c.translate(px * .55, py * .5);
  const ga = (.35 + .65 * hype) * (1 - dim * .9);
  glow(c, 'vio', 180 + 40 * Math.sin(t * .4), 300, 520, ga); glow(c, 'pink', 900 + 50 * Math.sin(t * .33 + 2), 620, 480, ga * .8); glow(c, 'cyan', 560, 80 + 30 * Math.sin(t * .5), 380, ga * .45 * hype);
  c.globalAlpha = (.1 + .16 * hype) * (1 - dim * .8); c.strokeStyle = C.vio; c.lineWidth = 3;
  for (let i = -6; i <= 24; i++) { c.beginPath(); c.moveTo(i * 90 + (t * 14) % 90, -700); c.lineTo(i * 90 + (t * 14) % 90, 960); c.stroke(); }
  for (let j = -8; j <= 10; j++) { c.beginPath(); c.moveTo(-400, j * 90); c.lineTo(1480, j * 90); c.stroke(); }
  c.restore();
  // floating bokeh dots mid-far
  c.save(); c.translate(px * .35, py * .3); const R = rng(3);
  for (let i = 0; i < 16; i++) { const bx = R() * 1200 - 60, by = R() * 900, sp = .3 + R(), r = 14 + R() * 36; glow(c, ['pink', 'cyan', 'yel', 'vio'][i % 4], bx + Math.sin(t * sp + i) * 30, by + Math.cos(t * sp * .7 + i) * 26, r * 2.4, (.1 + .3 * hype) * (1 - dim)); }
  c.restore();
  // wall props
  c.save(); c.translate(px * .12, py * .1);
  for (const p of PROPS) if (p.z === 0) drawProp(c, p, t, dim);
  c.restore();
  // the bar
  const fancy = fresh ? 1 : clamp(.25 + .75 * seg(t, M.s1, M.s2 + 4));
  const by = BAR_A.y, bw = 800, bx = 540 - bw / 2;
  c.save(); c.translate(px * .06, py * .04);
  drawBarAlex(c, bx, by - 42, bw, 84, fancy * (1 - dim * .55), t);
  txt(c, 'ПРОЕКТ', bx + 6, by - 86, F.h7(34), dim > .5 ? '#9c8cb8' : '#f3e9ff', 'left');
  const zs = 1 + .05 * Math.sin(t * 2.4);
  c.save(); c.translate(bx + bw - 6, by - 92); c.rotate(.02 * Math.sin(t * 17) * (t < 3 ? pulse(t, 1.0, .5) * 3 : 0)); c.scale(zs, zs);
  txt(c, '0%', 0, 0, F.h9(78), dim > .5 ? '#ff5a6a' : C.yel, 'right'); c.restore();
  c.restore();
  // desk
  c.fillStyle = mixc('#22103d', '#0e0718', dim); c.fillRect(-400, 790, 1880, 200);
  c.fillStyle = mixc('#5a2a94', '#2a1a40', dim); c.fillRect(-400, 786, 1880, 10);
  // Alex
  alexActor(c, t, dim);
  // laptop (front of Alex)
  c.save(); c.translate(330, 790);
  c.fillStyle = '#0d0618'; rr(c, -92, -112, 184, 114, 12); c.fill(); c.fillStyle = mixc('#3b1d68', '#1a0e2c', dim); rr(c, -84, -104, 168, 98, 8); c.fill();
  glow(c, 'pink', 0, -56, 60, .8 * (1 - dim * .6)); c.fillStyle = dim > .5 ? '#a58' : C.pink; c.beginPath(); c.arc(0, -56, 13, 0, 7); c.fill();
  c.fillStyle = '#0d0618'; rr(c, -120, -2, 240, 14, 6); c.fill(); c.restore();
  for (const p of PROPS) if (p.z === 1) drawProp(c, p, t, dim);
  // purchase bursts
  for (const tb of [M.buy1, M.buy2, M.buy3]) coinBurst(c, t, tb, 330, 640);
  // dim wash + red deadline wash
  if (dim > 0) { c.fillStyle = `rgba(8,4,16,${.34 * dim})`; c.fillRect(-400, -700, 1880, 1660); const rp = .5 + .5 * Math.sin((t - M.s4) * Math.PI * 2); glow(c, 'red', 540, 960, 760, dim * (.35 + .3 * rp)); }
  c.restore();
}
function drawProp(c, p, t, dim) { const s = propState(p, t); if (!s || s.s <= .01) return; p.dim = dim > .5; c.save(); c.translate(s.x, s.y); c.rotate(s.rot); c.scale(s.s, s.s); p.d(c, p, t); c.restore(); }
function coinBurst(c, t, t0, x, y) { const a = t - t0; if (a < 0 || a > .9) return; const R = rng(Math.floor(t0 * 100)); for (let i = 0; i < 10; i++) { const an = -Math.PI * (.15 + .7 * R()), sp = 380 + R() * 420, px = x + Math.cos(an) * sp * a, py = y + Math.sin(an) * sp * a + 900 * a * a; c.save(); c.translate(px, py); c.scale(Math.cos(a * 14 + i), 1); c.globalAlpha = 1 - seg(a, .6, .9); c.fillStyle = C.yel; c.beginPath(); c.arc(0, 0, 15, 0, 7); c.fill(); c.fillStyle = '#b89b00'; c.fillRect(-3, -8, 6, 16); c.restore(); } }
function alexActor(c, t, dim) {
  let x = 330, y = 640, sx = 1, sy = 1, rot = 0, mood = 'smug', look = [.25, .1], armL = 1.0, armR = 1.0, twitch = 0;
  const bt = beat(t), idle = musicOn(t) ? Math.abs(Math.sin(bt * Math.PI)) : 0;
  let hop = idle * 10;
  const jumps = [M.buy1, M.stick, M.notion, M.buy2, 15.2, M.buy3, M.jump];
  let vy = 0;
  for (const j of jumps) { const a = t - j; if (a > -.16 && a < .55) { if (a < 0) { const u = (a + .16) / .16; sy = 1 - .16 * u; sx = 1 + .14 * u; hop = -8 * u; } else { const u = a / .55, h = Math.sin(u * Math.PI) * (j === M.jump ? 190 : 86); hop = h; vy = Math.cos(u * Math.PI); sy = 1 + .14 * Math.max(0, vy) - .12 * pulse(a, .5, .08); sx = 1 / sy; } armL = armR = -1.2; } }
  const lag = -vy * .9 + Math.sin(bt * Math.PI * 2) * .12 * (musicOn(t) ? 1 : 0);
  if (t < M.s1) { look = [.1, -.7]; armR = -.9 + .2 * Math.sin(t * 9); }
  if (t > 3.6 && t < 6.3) { armR = -1.1 + .3 * Math.sin(t * 11); look = [.6, .1]; }
  if (t > M.stick && t < M.notion) { look = [.9, -.5]; armR = -.7 + .25 * Math.sin(t * 13); rot = .06; }
  if (t > M.notion && t < M.buy2) { look = [-.8, -.5]; armL = -.8; rot = -.05; }
  if (t > 13.2 && t < M.s3) { look = [.1, 1]; rot = .04 * Math.sin(t * 5); armR = .2; }
  if (t > M.alarm + .25 && t < M.alarm + 1.1) { armR = .55; look = [.9, .9]; }
  if (t > M.tunnelOut && t < 24.6) { look = [.2, .9]; }
  if (t > 24.6 && t < M.s4) { look = [.3, .7]; armL = -.6 + .3 * Math.sin(t * 15); armR = -.6 + .3 * Math.cos(t * 15); }
  if (t >= M.s4 && t < M.s5) { mood = 'panic'; twitch = seg(t, M.s4 + .3, M.s4 + 1.2); look = [.3 + .3 * Math.sin(t * 2.2), .2]; const sh = Math.sin(t * 46) * 2.2 * twitch; x += sh; armL = .6; armR = .6; if (t > M.buy3 - .5 && t < M.buy3 + .4) { armR = -.5; } }
  if (t >= M.s5 && t < M.jump) { // buried
    const u = seg(t, M.collapse, M.collapse + .5); y += 150 * eOut(u); mood = 'panic'; look = [0, -1]; rot = .25 * u; if (t > M.notif + .45) { look = [.6, -.6]; mood = 'wow'; }
  }
  if (t >= M.jump && t < M.s6) { mood = 'wow'; look = [.5, .6]; if (t > M.jump + .55) { armL = -1.3 + .2 * Math.sin(t * 18); armR = -1.3 + .2 * Math.cos(t * 18); } }
  if (t >= M.s6) { mood = 'smug'; look = [.2, -.3]; const sh = pulse(t, M.s6 + .3, .25) * Math.sin(t * 50) * 9; x += sh; if (t > 42.6) { armR = -1.0 + .25 * Math.sin(t * 10); look = [.1, -.7]; } }
  const blink = (hash(Math.floor(t * 1.7)) > .78 && (t * 1.7) % 1 < .14) ? 1 : 0;
  // contact shadow on desk edge
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, 792, 92 - hop * .25, 14, 0, 0, 7); c.fill();
  drawAlex(c, x, y - hop, { sx, sy, rot, mood, look, armL, armR, lag, blink, twitch, tt: t, mouth: mouth(t, 'a'), noLegs: true });
}

/* ---------- Semyon half (world y 960..1920) ---------- */
const MON = { x: 335, y: 1352, w: 300, h: 200 };
function semHalf(c, t, cam) {
  const night = clamp(seg(t, M.lampOff1, M.lampOff1 + .25) * (1 - seg(t, M.s2 - .15, M.s2 + .1)) + seg(t, M.lampOff2, M.lampOff2 + .25) * (1 - seg(t, M.s5, M.s5 + .3)));
  const pct = semPct(t), red = seg(t, M.s4, M.s4 + .35) * (1 - seg(t, M.s5 + .3, M.s5 + 1));
  c.save(); c.beginPath(); c.rect(-400, 960, 1880, 1700); c.clip();
  const px = cam.x - 540, py = cam.y - 1440;
  c.fillStyle = C.paper; c.fillRect(-400, 960, 1880, 1700);
  // far: paper dots + growing green wash
  c.save(); c.translate(px * .5, py * .45);
  c.fillStyle = 'rgba(38,42,49,.085)'; for (let i = -5; i < 26; i++) for (let j = 0; j < 20; j++) { c.beginPath(); c.arc(i * 64 + (j % 2) * 32, 940 + j * 56, 4, 0, 7); c.fill(); }
  glow(c, 'green', 760, 1260, 300 + pct * 7, .12 + pct / 100 * .5);
  c.restore();
  // mid-far: window frame shapes
  c.save(); c.translate(px * .25, py * .2); c.strokeStyle = C.paper2; c.lineWidth = 16; rr(c, 800, 1205, 200, 250, 12); c.stroke(); c.beginPath(); c.moveTo(900, 1205); c.lineTo(900, 1455); c.moveTo(800, 1330); c.lineTo(1000, 1330); c.stroke(); c.restore();
  // bar
  c.save(); c.translate(px * .06, py * .04);
  const bw = 800, bx = 140, by = 1156;
  drawBarSem(c, bx, by - 38, bw, 76, pct, t);
  txt(c, 'ПРОЕКТ', bx + 4, by - 78, F.h7(34), C.ink, 'left');
  const pj = 1 + .22 * pulse(t, lastClick(t), .14);
  c.save(); c.translate(bx + bw, by - 84); c.scale(pj, pj); txt(c, Math.min(100, Math.round(pct)) + '%', 0, 0, F.m(70), pct >= 100 ? '#0e9a50' : C.ink, 'right'); c.restore();
  // +% floaters
  let prev = 0; for (const k of clicks) { const a = t - k.t; if (a > 0 && a < .9) { c.globalAlpha = 1 - seg(a, .5, .9); txt(c, '+' + (k.p - prev) + '%', bx + bw * k.p / 100, by - 70 - eOut(a / .9) * 90, F.m(40), '#0e9a50'); c.globalAlpha = 1; } prev = k.p; }
  if (t >= M.final && t < M.s6 + .3) { const a = t - M.final; const s = eBack(clamp((a - .25) / .3)) * (1 - eIn(seg(t, M.s6, M.s6 + .25))); if (s > 0) { c.save(); c.translate(bx + bw / 2, by); c.rotate(-.06); c.scale(s, s); rr(c, -150, -34, 300, 68, 12); c.lineWidth = 7; c.strokeStyle = '#fff'; c.stroke(); txt(c, 'ГОТОВО', 0, 3, F.h9(44), '#fff'); c.restore(); } }
  c.restore();
  // lamp (hanging)
  const lx = 905, ly = 1235, sw = Math.sin(t * 1.1) * .03 + .12 * pulse(t, M.lampOff1, .5) * Math.sin(t * 9) + .12 * pulse(t, M.lampOff2, .5) * Math.sin(t * 9);
  c.save(); c.translate(lx, 960); c.rotate(sw); c.strokeStyle = C.ink; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, ly - 960 - 40); c.stroke();
  c.translate(0, ly - 960); if (night < .5) { c.save(); c.globalAlpha = .28 * (1 - night * 2); const lg = c.createLinearGradient(0, 0, 0, 330); lg.addColorStop(0, '#ffe9a8'); lg.addColorStop(1, 'rgba(255,233,168,0)'); c.fillStyle = lg; c.beginPath(); c.moveTo(-52, 0); c.lineTo(52, 0); c.lineTo(250, 330); c.lineTo(-250, 330); c.fill(); c.restore(); glow(c, 'warm', 0, 14, 110, .9 * (1 - night * 2)); }
  c.fillStyle = C.ink; c.beginPath(); c.moveTo(-58, 6); c.quadraticCurveTo(0, -78, 58, 6); c.fill(); c.fillStyle = night > .5 ? '#8d8a82' : '#ffe9a8'; c.beginPath(); c.ellipse(0, 8, 30, 10, 0, 0, 7); c.fill(); c.restore();
  // desk
  c.fillStyle = '#b9ad98'; c.fillRect(-400, 1520, 1880, 600); c.fillStyle = '#8f8472'; c.fillRect(-400, 1516, 1880, 12);
  // monitor
  drawMonitor(c, t);
  // Semyon
  semActor(c, t);
  // keyboard + mug
  const lc = lastClick(t), kp = pulse(t, lc, .09);
  c.save(); c.translate(722, 1540); c.fillStyle = C.ink; rr(c, -130, -10, 260, 44, 10); c.fill(); for (let i = 0; i < 9; i++) { const dn = (i === 4 ? kp * 7 : 0); c.fillStyle = i === 4 ? (kp > .1 ? C.green : '#f3efe6') : '#59606b'; rr(c, -116 + i * 26, -4 + dn, 21, 15, 4); c.fill(); } c.restore();
  const mugc = ['#ff8a3a', '#3d8bff', '#ff3d9a', '#19c66b', '#ffd23a', '#8b5cff'][Math.max(0, nClicks(t) - 1) % 6];
  c.save(); c.translate(955, 1500); c.fillStyle = mugc; rr(c, -30, -40, 60, 62, 10); c.fill(); c.lineWidth = 9; c.strokeStyle = mugc; c.beginPath(); c.arc(34, -8, 16, -1.2, 1.2); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 4; for (let i = 0; i < 2; i++) { c.beginPath(); const sx0 = -10 + i * 20; c.moveTo(sx0, -50); c.quadraticCurveTo(sx0 + 9 * Math.sin(t * 2 + i), -66, sx0, -82 - 6 * Math.sin(t * 1.5 + i)); c.stroke(); } c.restore();
  // night & red washes
  if (night > 0) { c.fillStyle = `rgba(22,28,52,${.62 * night})`; c.fillRect(-400, 960, 1880, 1700); glow(c, 'cyan', MON.x, MON.y, 260, .22 * night); }
  if (red > 0) { const rp = .5 + .5 * Math.sin((t - M.s4) * Math.PI * 2); glow(c, 'red', 540, 960, 700, red * (.22 + .22 * rp)); }
  // foreground blurred plant (near layer, strong parallax)
  c.save(); c.translate(-px * .5 - 40, -py * .55); c.globalAlpha = .9; c.filter = 'blur(7px)'; c.fillStyle = '#2f5d47'; for (let i = 0; i < 5; i++) { c.save(); c.translate(40, 1930); c.rotate(-.9 + i * .34 + Math.sin(t * .9 + i) * .03); c.beginPath(); c.ellipse(0, -170, 44, 170, 0, 0, 7); c.fill(); c.restore(); } c.filter = 'none'; c.restore();
  c.restore();
}
function drawMonitor(c, t) {
  const m = MON, sent = t >= M.send;
  c.fillStyle = C.ink; c.fillRect(m.x - 14, m.y + m.h / 2, 28, 60); rr(c, m.x - 70, m.y + m.h / 2 + 52, 140, 18, 8); c.fill();
  rr(c, m.x - m.w / 2 - 12, m.y - m.h / 2 - 12, m.w + 24, m.h + 24, 18); c.fill();
  c.save(); rr(c, m.x - m.w / 2, m.y - m.h / 2, m.w, m.h, 8); c.clip();
  if (!sent || t >= M.s6 + 9) {
    c.fillStyle = '#12151b'; c.fillRect(m.x - m.w / 2, m.y - m.h / 2, m.w, m.h);
    const n = nClicks(t), R = rng(11), vis = 9, start = Math.max(0, n - vis), lc = lastClick(t);
    for (let i = start; i < n; i++) { const ln = 60 + hash(i * 3.1) * 170, y = m.y - m.h / 2 + 22 + (i - start) * 19, isNew = i === n - 1, w = isNew ? ln * eOut(seg(t, lc, lc + .2)) : ln; c.fillStyle = isNew ? C.greenL : ['#6f8fae', '#9aa6b5', '#c7b98a'][i % 3]; rr(c, m.x - m.w / 2 + 34, y, w, 8, 4); c.fill(); txt(c, String(i + 1).padStart(2, '0'), m.x - m.w / 2 + 10, y + 5, F.m(11), '#59606b', 'left'); }
    if (Math.floor(t * 2.5) % 2 === 0) { const y = m.y - m.h / 2 + 22 + Math.min(n, vis) * 19; c.fillStyle = '#fff'; c.fillRect(m.x - m.w / 2 + 34, y - 2, 7, 13); }
    if (t > M.send - 1.0 && t < M.send) { const s = eBack(seg(t, M.send - 1.0, M.send - .75)), pr = seg(t, M.send - .14, M.send); c.save(); c.translate(m.x, m.y + 58); c.scale(s * (1 - .12 * pr), s * (1 - .12 * pr)); rr(c, -92, -22, 184, 44, 12); c.fillStyle = C.green; c.fill(); txt(c, 'ОТПРАВИТЬ', 0, 2, F.h7(18), '#fff'); c.restore(); }
  } else drawCover(c, t);
  c.restore();
  c.fillStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.moveTo(m.x - m.w / 2, m.y - m.h / 2); c.lineTo(m.x - 10, m.y - m.h / 2); c.lineTo(m.x - 90, m.y + m.h / 2); c.lineTo(m.x - m.w / 2, m.y + m.h / 2); c.fill();
}
function drawCover(c, t) { // the twist: what Semyon was building
  const m = MON, a = t - M.send, x0 = m.x - m.w / 2, y0 = m.y - m.h / 2;
  c.fillStyle = '#f4efe4'; c.fillRect(x0, y0, m.w, m.h);
  const wp = eOut(seg(a, .0, .5)); c.fillStyle = C.green; c.fillRect(x0, y0, m.w * wp, m.h); c.fillStyle = '#12a657'; c.beginPath(); c.arc(x0 + m.w, y0 + m.h, 120 * wp, 0, 7); c.fill();
  const s1 = pop(a, .55, .3), s2 = pop(a, .8, .3), s3 = pop(a, 1.0, .3), s4 = pop(a, 1.25, .3);
  c.save(); c.translate(x0 + 22, y0 + 30); c.scale(s1, s1); rr(c, 0, -12, 62, 24, 6); c.fillStyle = C.ink; c.fill(); txt(c, 'КУРС', 31, 1, F.h9(13), C.yel); c.restore();
  c.save(); c.translate(x0 + 22, y0 + 76); c.scale(s2, s2); txt(c, 'ОДИН ШАГ', 0, 0, F.h9(32), '#fff', 'left'); c.restore();
  c.save(); c.translate(x0 + 22, y0 + 116); c.scale(s3, s3); txt(c, 'В ДЕНЬ', 0, 0, F.h9(32), C.ink, 'left'); c.restore();
  c.save(); c.translate(x0 + 22, y0 + 166); c.scale(s4, s4); c.save(); c.translate(15, 0); c.scale(.16, .16); drawSem(c, 0, 0, { smirk: true, lid: .3 }); c.restore(); txt(c, 'автор — Семён', 40, 1, F.b(17, 800), '#fff', 'left'); c.restore();
  const s5 = pop(a, 1.5, .35); c.save(); c.translate(x0 + m.w - 38, y0 + 34); c.rotate(.2 + .05 * Math.sin(t * 5)); c.scale(s5 * .8, s5 * .8); c.fillStyle = C.yel; c.beginPath(); for (let i = 0; i < 20; i++) { const r = i % 2 ? 36 : 29, an = i / 20 * Math.PI * 2; c.lineTo(Math.cos(an) * r, Math.sin(an) * r); } c.fill(); txt(c, 'NEW', 0, 1, F.h9(15), C.ink); c.restore();
}
function semActor(c, t) {
  const x = 722, y = 1400; let look = [-.5, .6], lid = .45, smirk = false, sy = 1, sx = 1, rot = 0;
  const lc = lastClick(t), k = pulse(t, lc, .12), anticip = clicks.reduce((m, q) => Math.max(m, seg(t, q.t - .22, q.t) * (t < q.t ? 1 : 0)), 0);
  let hR = [70 + 20 * anticip, 100 - 46 * anticip + 34 * k * 0], hL = [-118, 96];
  if (anticip > 0) hR = [44, 62 + 10 * (1 - anticip)];
  if (k > .02) { hR = [14, 128 - 4 * k]; sy = 1 - .05 * k; sx = 1 + .03 * k; }
  if (t > M.send - .5 && t < M.send + .3) { const u = seg(t, M.send - .5, M.send); hL = [lerp(-118, -300, eIO(u)), lerp(96, 10, eIO(u))]; look = [-1, 0]; }
  if (voAt(t, 's')) { look = [-.2, -.9]; }
  if (t > 6.7 && t < M.lampOff1) lid = .5 + .3 * Math.sin((t - 6.7) * 2.2);
  if (t > M.lampOff1 && t < M.s2) { lid = .95; hR = [150, lerp(60, -60, bump(t, M.lampOff1 - .15, .3))]; }
  if (t > M.final + .1 && t < M.s5) { lid = lerp(.45, .95, seg(t, M.final + .4, M.lampOff2)); smirk = true; if (t > M.lampOff2 - .2 && t < M.lampOff2 + .2) hR = [150, -40]; }
  if (t > M.send + .4 && t < M.zoomOut) { look = [-.9, .1]; smirk = true; }
  if (t >= M.buy4 - .2) { look = [0, 0]; lid = .3; smirk = true; rot = -.04; if (t > M.buy4 && t < M.buy4 + .9) { hR = [140, lerp(95, -70, eOut(seg(t, M.buy4, M.buy4 + .3)))]; } }
  const br = Math.sin(t * 1.4) * .012;
  c.fillStyle = 'rgba(0,0,0,.16)'; c.beginPath(); c.ellipse(x, 1516, 118, 15, 0, 0, 7); c.fill();
  drawSem(c, x, y, { sx: sx + br, sy: sy - br, rot, look, lid, smirk, hL, hR, mouth: mouth(t, 's') });
  if (t > M.buy4 && t < M.buy4 + 1.2) { const a = t - M.buy4, u = eOut(clamp(a / .45)); c.save(); c.translate(lerp(330, 862, u), lerp(700, 1330, u) - Math.sin(u * Math.PI) * 190); c.scale(Math.cos(a * 16), 1); c.fillStyle = C.yel; c.beginPath(); c.arc(0, 0, 24, 0, 7); c.fill(); c.strokeStyle = '#a58c00'; c.lineWidth = 5; c.stroke(); txt(c, '₽', 0, 2, F.h9(24), '#a58c00'); c.restore(); }
}

/* ---------- seam: deadline counter ---------- */
function seamCounter(c, t) {
  const d = dayAt(t), red = t >= M.s4 - .3 && t < M.s6, stamp = t >= M.s5 && t < M.s6;
  c.fillStyle = '#0c0714'; c.fillRect(-400, 948, 1880, 24);
  const gl = c.createLinearGradient(0, 0, 1080, 0); gl.addColorStop(0, C.pink); gl.addColorStop(.5, red ? C.red : C.yel); gl.addColorStop(1, C.green); c.fillStyle = gl; c.fillRect(-400, 957, 1880, 6);
  let s = 1 + .16 * pulse(t, d.t0, .12), y = 960, rot = 0;
  if (stamp) { const u = seg(t, M.s5 - .0, M.s5 + .13); s = lerp(3.2, 1.22, eIn(u)) + .25 * pulse(t, M.s5 + .13, .1); rot = -.05; }
  const pw = stamp ? 560 : 640, ph = 104;
  c.save(); c.translate(540, y); c.rotate(rot); c.scale(s, s);
  if (red) glow(c, 'red', 0, 0, 420, .6 + .3 * Math.sin((t - M.s4) * Math.PI * 2));
  c.fillStyle = 'rgba(0,0,0,.35)'; rr(c, -pw / 2 + 6, -ph / 2 + 10, pw, ph, 52); c.fill();
  rr(c, -pw / 2, -ph / 2, pw, ph, 52); c.fillStyle = red ? C.red : '#0c0714'; c.fill(); c.lineWidth = 6; c.strokeStyle = red ? '#fff' : C.yel; c.stroke();
  if (stamp) { txt(c, 'ДЕДЛАЙН', 0, 4, F.h9(64), '#fff'); c.restore(); return; }
  txt(c, 'ДО ДЕДЛАЙНА', -pw / 2 + 44, 3, F.h7(27), red ? '#fff' : '#d9cfee', 'left');
  // flip number
  c.save(); c.beginPath(); c.rect(92, -44, 130, 88); c.clip(); const u = d.t0 <= 0 ? 1 : eOut(seg(t, d.t0, d.t0 + .16)), up = d.n > d.prev ? -1 : 1;
  if (u < 1 && d.t0 > 0) txt(c, String(d.prev), 157, 4 + up * u * 80, F.m(72), red ? '#fff' : C.yel);
  txt(c, String(d.n), 157, 4 - up * (1 - u) * 80, F.m(72), red ? '#fff' : C.yel); c.restore();
  const w1 = d.n === 1 ? 'ДЕНЬ' : (d.n >= 2 && d.n <= 4) || (d.n >= 22 && d.n <= 24) ? 'ДНЯ' : 'ДНЕЙ';
  txt(c, w1, pw / 2 - 28, 3, F.h7(21), red ? '#fff' : '#d9cfee', 'right');
  c.restore();
}

/* ---------- tunnel (scene 3): flight through Alex's "system" ---------- */
const PAGES = (() => { const kinds = [], B = [0, 7, 16];
  const mkPage = (k) => { const c = mk(360, 480), g = c.getContext('2d'); rr(g, 6, 6, 348, 468, 26); g.fillStyle = k === 2 ? '#1b0f38' : '#f6f3ff'; g.fill(); g.lineWidth = 8; g.strokeStyle = [C.pink, C.cyan, C.vio, C.yel][k]; g.stroke();
    g.fillStyle = [C.pink, C.cyan, C.vio, C.yel][k]; rr(g, 34, 36, 170, 30, 10); g.fill();
    if (k === 0) for (let i = 0; i < 7; i++) { g.strokeStyle = '#1a0b2e'; g.lineWidth = 6; g.strokeRect(36, 100 + i * 50, 28, 28); g.fillStyle = '#c9c0e6'; g.fillRect(84, 107 + i * 50, 120 + 110 * hash(i), 14); }
    if (k === 1) for (let i = 0; i < 3; i++) for (let j = 0; j < 4 - i; j++) { g.fillStyle = STK[(i * 4 + j * 2) % 12]; rr(g, 34 + i * 102, 96 + j * 84, 88, 68, 10); g.fill(); }
    if (k === 2) { for (let i = 0; i < 8; i++) { const h = 60 + hash(i * 2.2) * 230; g.fillStyle = [C.pink, C.cyan, C.yel][i % 3]; g.fillRect(40 + i * 36, 420 - h, 24, h); } }
    if (k === 3) { for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { g.fillStyle = hash(i * 5 + j) > .6 ? C.pink : '#ddd6f3'; rr(g, 36 + j * 60, 96 + i * 70, 48, 56, 8); g.fill(); } }
    return c; };
  for (let k = 0; k < 4; k++) { const base = mkPage(k); kinds.push(B.map(b => { if (!b) return base; const c = mk(420, 540), g = c.getContext('2d'); g.filter = `blur(${b}px)`; g.drawImage(base, 30, 30); return c; })); }
  const R = rng(21), list = []; for (let i = 0; i < 46; i++) { const an = R() * 6.28, rad = 300 + R() * 520; list.push({ z: 3 + i * 1.02 + R() * .5, x: Math.cos(an) * rad, y: Math.sin(an) * rad * 1.5, k: i % 4, r: (R() - .5) * .7, sp: R() }); }
  return { kinds, list }; })();
function tunnel(c, t) {
  const a = t - (M.s3 + .2), L = M.tunnelOut + .25 - (M.s3 + .2), u = clamp(a / L);
  const camz = 52 * (u * u * (3 - 2 * u) * .55 + u * .45) - 2, f = 900, END = 54;
  c.fillStyle = '#0d0520'; c.fillRect(0, 0, W, H);
  const cx = 540 + 50 * Math.sin(t * 1.3), cy = 900 + 60 * Math.sin(t * .9 + 1), roll = .12 * Math.sin(t * 1.1);
  c.save(); c.translate(cx, cy); c.rotate(roll);
  glow(c, 'vio', 0, 0, 1300, 1); glow(c, 'pink', 0, 0, 520, .8);
  // speed streaks
  const R = rng(5); c.lineCap = 'round';
  for (let i = 0; i < 70; i++) { const an = R() * 6.28, zz = ((R() * 30 - camz * 1.0) % 30 + 30) % 30 + .6, r0 = 420 + R() * 500, s0 = f / (zz * 60), s1 = f / ((zz + 1.4) * 60); c.strokeStyle = [C.pink, C.cyan, C.yel, C.vio][i % 4]; c.globalAlpha = clamp(1.2 - zz / 30) * .7; c.lineWidth = Math.max(1.5, 9 * s0); c.beginPath(); c.moveTo(Math.cos(an) * r0 * s0, Math.sin(an) * r0 * s0); c.lineTo(Math.cos(an) * r0 * s1, Math.sin(an) * r0 * s1); c.stroke(); }
  c.globalAlpha = 1;
  // hero bar at the end of the tunnel
  const dz = END - camz, sb = f / (dz * 60 + 300) * 1.0; { c.save(); c.scale(Math.min(sb, 1.05), Math.min(sb, 1.05)); drawBarAlex(c, -400, -42, 800, 84, 1, t); txt(c, 'ПРОЕКТ', -394, -86, F.h7(34), '#f3e9ff', 'left'); txt(c, '0%', 394, -92, F.h9(78), C.yel, 'right'); c.restore(); }
  // pages far -> near
  const P = PAGES.list.slice().sort((p, q) => q.z - p.z);
  for (const p of P) { const d = p.z - camz; if (d < .25 || d > 26) continue; const s = f / (d * 300), al = clamp(d / 1.1 - .2) * clamp((26 - d) / 6); const foc = Math.abs(d - 6.5), b = foc > 4.2 || d < 2.2 ? 2 : foc > 2.2 ? 1 : 0; const img = PAGES.kinds[p.k][b];
    c.save(); c.globalAlpha = al; c.translate(p.x * s, p.y * s); c.rotate(p.r + Math.sin(t * (.5 + p.sp) + p.z) * .08); c.scale(s, s); c.drawImage(img, -img.width / 2, -img.height / 2); c.restore(); }
  c.restore();
  // Alex floating in zen
  const ax = 540 + 26 * Math.sin(t * 1.7), ay = 1420 + 22 * Math.sin(t * 2.3), ap = eBack(seg(a, .15, .6));
  c.save(); c.translate(ax, ay); c.scale(ap * 1.25, ap * 1.25); c.rotate(.06 * Math.sin(t * 1.3)); glow(c, 'cyan', 0, 0, 330, .55);
  c.strokeStyle = C.yel; c.lineWidth = 7; c.globalAlpha = .8; c.beginPath(); c.ellipse(0, -165 + 6 * Math.sin(t * 4), 62, 15, 0, 0, 7); c.stroke(); c.globalAlpha = 1;
  drawAlex(c, 0, 0, { mood: 'zen', look: [0, .2], armL: .1 + .08 * Math.sin(t * 3), armR: .1 + .08 * Math.cos(t * 3), mouth: mouth(t, 'a'), tt: t, lag: Math.sin(t * 2.3) * .5, noLegs: true });
  c.restore();
  // productivity badge
  const bs = pop(t, M.badge, .4); if (bs > 0) { c.save(); c.translate(540, 520 + 10 * Math.sin(t * 3)); c.rotate(-.04); c.scale(bs, bs); glow(c, 'yel', 0, 0, 520, .5); rr(c, -400, -92, 800, 184, 40); c.fillStyle = '#0c0714'; c.fill(); c.lineWidth = 7; c.strokeStyle = C.yel; c.stroke(); txt(c, 'ВАША ПРОДУКТИВНОСТЬ', 0, -38, F.h7(36), '#fff'); const n = Math.round(98 * eOut(seg(t, M.badge + .1, M.badge + .8))); txt(c, n + '%', 0, 34, F.h9(84), C.yel); c.restore(); }
}

/* ---------- overlays (screen space) ---------- */
function subtitles(c, t, cam) {
  for (const who of ['a', 's']) { const a = voAt(t, who); if (!a || a.age < 0) continue;
    const inT = eBack(seg(a.age, 0, .16)), outT = 1 - eIn(seg(a.age, a.d + .2, a.d + .35)), s = inT * outT; if (s <= 0) continue;
    const inTunnel = t > M.s3 + .35 && t < M.tunnelOut + .2, zoomed = (t > M.zoomIn + .2 && t < M.zoomOut + .3);
    let y = clamp(960 + ((who === 'a' ? 852 : 1660) - cam.y) * cam.z, 330, 1680); if (inTunnel) y = 1690; if (zoomed) y = 1560;
    c.font = F.b(42, 800); const words = a.v.text.split(' '); const lines = []; let cur = ''; for (const w of words) { if (c.measureText(cur + ' ' + w).width > 950 && cur) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } lines.push(cur);
    const lw = Math.max(...lines.map(l => c.measureText(l).width)) + 64, lh = 58, hh = lines.length * lh + 30;
    c.save(); c.translate(540, y); c.scale(s, s); c.rotate(who === 'a' ? -.012 : .008);
    c.fillStyle = 'rgba(0,0,0,.3)'; rr(c, -lw / 2 + 5, -hh / 2 + 8, lw, hh, 26); c.fill();
    rr(c, -lw / 2, -hh / 2, lw, hh, 26); c.fillStyle = who === 'a' ? C.pink : '#f7f3ea'; c.fill(); c.lineWidth = 5; c.strokeStyle = who === 'a' ? '#fff' : C.ink; c.stroke();
    lines.forEach((l, i) => txt(c, l, 0, -hh / 2 + 15 + lh * (i + .5) + 2, F.b(42, 800), who === 'a' ? '#fff' : C.ink)); c.restore(); }
}
function hookText(c, t) {
  if (t > M.s1 + .2) return;
  const L = [{ s: '14 КУРСОВ.', t: -.2, y: 196, f: 86, col: '#fff' }, { s: '200 СТРАНИЦ В NOTION.', t: .5, y: 292, f: 53, col: C.cyan }, { s: '0 СТРОК.', t: 1.0, y: 402, f: 102, col: C.yel }];
  L.forEach((l, i) => { const t0 = l.t + (l.dl || 0), a = t - t0; if (a < 0) return; const sc = lerp(2.6, 1, eOut(clamp(a / .14))) + .12 * pulse(t, t0 + .14, .1), ou = eIn(seg(t, M.hookOut + i * .05, M.hookOut + .35 + i * .05));
    c.save(); c.translate(540 + (i % 2 ? 1 : -1) * ou * 900, l.y + (i === 2 ? Math.sin(t * 38) * 3 * (1 - ou) : 0)); c.rotate((i % 2 ? .02 : -.02) + (i === 2 ? Math.sin(t * 31) * .012 : 0)); c.scale(sc, sc); c.globalAlpha = clamp(a / .06);
    c.font = F.h9(l.f); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = 22; c.strokeStyle = '#0c0714'; c.strokeText(l.s, 0, 0); c.fillStyle = l.col; c.fillText(l.s, 0, 0); c.restore(); });
  const a2 = pop(t, M.hookOut + .55, .3) * (1 - eIn(seg(t, M.s1 + 1.3, M.s1 + 1.6)));
  if (a2 > 0) { c.save(); c.translate(540, 1790 - 0); c.scale(a2, a2); c.restore(); }
}
function teaser(c, t) { const s = pop(t, M.hookOut + .6, .3) * (1 - eIn(seg(t, 5.4, 5.7))); if (s <= 0) return; c.save(); c.translate(540, 150); c.rotate(-.02); c.scale(s, s); const wdt = 620; rr(c, -wdt / 2, -44, wdt, 88, 44); c.fillStyle = C.yel; c.fill(); c.lineWidth = 6; c.strokeStyle = '#0c0714'; c.stroke(); txt(c, 'Смотри, кто сдаст', -16, 3, F.h7(38), '#0c0714'); const ay = 6 * Math.sin(t * 9); c.fillStyle = '#0c0714'; c.beginPath(); c.moveTo(wdt / 2 - 62, -12 + ay); c.lineTo(wdt / 2 - 34, -12 + ay); c.lineTo(wdt / 2 - 48, 14 + ay); c.fill(); c.restore(); }
function endText(c, t) {
  const a = t - M.endText; if (a < 0) return; const ou = 1 - eIn(seg(t, M.pushIn + .15, M.pushIn + .5)); if (ou <= 0) return;
  const s1 = pop(a, 0, .3), s2 = pop(a, .22, .3), s3 = pop(a, .6, .3);
  c.save(); c.translate(540, 960); c.scale(ou, ou); c.fillStyle = `rgba(12,7,20,${.9 * clamp(a / .2)})`; rr(c, -500, -190, 1000, 380, 56); c.fill(); c.lineWidth = 7; c.strokeStyle = C.yel; c.globalAlpha = clamp(a / .2); c.stroke(); c.globalAlpha = 1;
  c.save(); c.translate(0, -108); c.scale(s1, s1); txt(c, 'ТЫ', 0, 0, F.h9(60), '#fff'); c.restore();
  c.save(); c.translate(0, -8); c.scale(s2, s2); c.font = F.h9(84); const wa = c.measureText('АЛЕКС').width, wo = c.measureText(' ИЛИ ').width * .62, ws = c.measureText('СЕМЁН?').width, sc = Math.min(1, 900 / (wa + wo / .62 * .62 + ws)); c.scale(sc, sc); let x = -(wa + wo + ws) / 2; txt(c, 'АЛЕКС', x, 0, F.h9(84), C.pink, 'left'); x += wa; txt(c, 'ИЛИ', x + wo / 2, 4, F.h7(46), '#fff'); x += wo; txt(c, 'СЕМЁН?', x, 0, F.h9(84), C.green, 'left'); c.restore();
  c.save(); c.translate(0, 110); c.rotate(-.03); c.scale(s3, s3); rr(c, -230, -40, 460, 80, 40); c.fillStyle = C.yel; c.fill(); txt(c, 'только честно', 0, 3, F.h7(40), '#0c0714'); c.restore();
  c.restore();
}
function notif(c, t) { // course notification flies from monitor (world) up to Alex — drawn in world space
  const a = t - M.notif; if (a < 0 || t > M.buy4 + .2) return; const u = eIO(clamp((a - .15) / .6)), x = lerp(MON.x, 705, u), y = lerp(MON.y - 40, 468, u) - Math.sin(u * Math.PI) * 90, s = eBack(clamp(a / .25)) * lerp(.45, 1, u) * (1 - eIn(seg(t, M.buy4 - .15, M.buy4 + .15))), wob = Math.sin(t * 22) * .05 * pulse(t, M.notif + .75, .5);
  c.save(); c.translate(x, y); c.rotate(wob - .03); c.scale(s, s); glow(c, 'green', 0, 0, 380, .5);
  c.fillStyle = 'rgba(0,0,0,.35)'; rr(c, -262, -52, 540, 124, 30); c.fill(); rr(c, -270, -62, 540, 124, 30); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 6; c.strokeStyle = C.ink; c.stroke();
  c.fillStyle = C.green; rr(c, -250, -42, 84, 84, 20); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-226, 14); c.quadraticCurveTo(-226, -24, -208, -24); c.quadraticCurveTo(-190, -24, -190, 14); c.lineTo(-182, 22); c.lineTo(-234, 22); c.closePath(); c.fill(); c.beginPath(); c.arc(-208, 28, 7, 0, 7); c.fill();
  txt(c, 'НОВЫЙ КУРС', -146, -20, F.h9(30), C.ink, 'left'); txt(c, '«Один шаг в день»', -146, 24, F.b(30, 700), '#4b5563', 'left'); c.restore();
}
function zzz(c, t) { for (const t0 of [M.lampOff1, M.lampOff2]) { const end = t0 === M.lampOff1 ? M.s2 : M.s5; if (t < t0 + .2 || t > end) continue; for (let i = 0; i < 3; i++) { const a = ((t - t0) * .9 + i * .33) % 1; c.globalAlpha = Math.sin(a * Math.PI) * .9; txt(c, 'z', 800 + a * 70 + Math.sin(a * 9) * 10, 1300 - a * 150, F.h9(34 + a * 30), '#cfe0ff'); } c.globalAlpha = 1; } }
function whistleFx(c, t) { const a = t - M.whistle; if (a < 0 || a > .7) return; c.save(); c.globalAlpha = 1 - seg(a, .4, .7); c.strokeStyle = C.yel; c.lineWidth = 7; c.lineCap = 'round'; for (let i = 0; i < 3; i++) { const x = 470 + i * 34; c.beginPath(); c.moveTo(x, 520 + a * 260); c.lineTo(x, 560 + a * 330); c.stroke(); } c.restore(); }

/* ---------- compose ---------- */
function grainTile() { const c = mk(256, 256), g = c.getContext('2d'), id = g.createImageData(256, 256), R = rng(99); for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (R() - .5) * 120; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 20; } g.putImageData(id, 0, 0); return c; }
const GRAIN = grainTile();
function drawScene(c, t) {
  t = clamp(t, 0, DUR - 1e-4); const cam = camAt(t);
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
  c.fillStyle = '#0c0714'; c.fillRect(0, 0, W, H);
  const inTunnel = t > M.s3 + .05 && t < M.tunnelOut + .5;
  if (inTunnel) { // tunnel is "above" the split world: world camera whips up to y=-1100, tunnel sits at world y -2060..-140
    c.save(); c.translate(540, 960); c.scale(cam.z, cam.z); c.rotate(cam.r * Math.PI / 180); c.translate(-cam.x, -cam.y); c.translate(0, -2060); tunnel(c, t); c.restore();
  }
  c.save(); c.translate(540, 960); c.scale(cam.z, cam.z); c.rotate(cam.r * Math.PI / 180); c.translate(-cam.x, -cam.y);
  if (cam.y > -200) { alexHalf(c, t, cam); semHalf(c, t, cam); zzz(c, t); whistleFx(c, t); seamCounter(c, t); notif(c, t); }
  c.restore();
  // vignette + screen-space overlays
  const vg = c.createRadialGradient(540, 960, 560, 540, 960, 1220); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.42)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  hookText(c, t); teaser(c, t); subtitles(c, t, cam); endText(c, t);
  // deadline flash (single, soft) + silence letterbox
  const fl = pulse(t, M.s5 + .13, .12); if (fl > .02) { c.fillStyle = `rgba(255,255,255,${.35 * fl})`; c.fillRect(0, 0, W, H); }
}
const SUB = 4, SHUTTER = .55, TREE = [];
window.renderAt = function (t, sub) {
  if (!sub) { // adaptive temporal sampling: more sub-frames when the camera travels far within the shutter
    const a = camAt(clamp(t - SHUTTER / 120, 0, DUR)), b = camAt(clamp(t + SHUTTER / 120, 0, DUR)), z = (a.z + b.z) / 2;
    const px = Math.hypot((b.x - a.x) * z, (b.y - a.y) * z) + Math.abs(Math.log(b.z / a.z)) * 1100 + Math.abs(b.r - a.r) * 19;
    sub = clamp(px / 2.5, SUB, 64);
  }
  // pairwise (binary-tree) averaging keeps full 8-bit precision even with dozens of sub-frames
  sub = 1 << Math.round(Math.log2(sub)); const lv = [];
  for (let i = 0; i < sub; i++) {
    const ts = t + (sub === 1 ? 0 : ((i + .5) / sub - .5) * SHUTTER / 60); drawScene(ctx, ts);
    let k = 0, src = scn;
    while (lv[k] && lv[k].full) { const L = lv[k]; L.g.globalAlpha = .5; L.g.drawImage(src, 0, 0); L.full = false; src = L.c; k++; }
    if (!lv[k]) { const c = TREE[k] || (TREE[k] = mk(W, H)); lv[k] = { c, g: c.getContext('2d'), full: false }; }
    lv[k].g.globalAlpha = 1; lv[k].g.drawImage(src, 0, 0); lv[k].full = true;
  }
  actx.globalAlpha = 1; actx.drawImage(lv[lv.length - 1].c, 0, 0);
  out.setTransform(1, 0, 0, 1, 0, 0); out.drawImage(acc, 0, 0);
  const f = Math.round(t * 60); out.globalAlpha = .22; out.drawImage(GRAIN, (f * 97) % 256 - 256, (f * 57) % 256 - 256, 1536, 2304); out.globalAlpha = 1;
};
window.ready = document.fonts.ready.then(() => Promise.all([document.fonts.load(F.h9(40), 'АЁ'), document.fonts.load(F.h7(40), 'АЁ'), document.fonts.load(F.b(40, 800), 'АЁ'), document.fonts.load(F.b(40, 700), 'АЁ'), document.fonts.load(F.m(40), '0%')])).then(() => true);
