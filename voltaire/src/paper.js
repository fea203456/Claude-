// ---- paper: kraft textures, rough cut shapes, cards, plates ----
const INK = '#23160f', EDGE = '#4a3424';
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
const TEXS = [];
function makeTex(seed, size = 512) {
  const c = mkCanvas(size, size), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#808080'; g.fillRect(0, 0, size, size);
  const wrap = (f) => { for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) { g.save(); g.translate(dx, dy); f(); g.restore(); } };
  for (let i = 0; i < 70; i++) {
    const x = r() * size, y = r() * size, rad = 25 + r() * 110, v = r() < .5 ? 0 : 255, a = .035 + r() * .05;
    wrap(() => { const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(${v},${v},${v},${a})`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); });
  }
  for (let i = 0; i < 3200; i++) {
    const x = r() * size, y = r() * size, an = r() * TAU, l = 3 + r() * 16, v = r() < .55 ? 35 : 225, al = .08 + r() * .2, lw = .5 + r() * 1.1;
    wrap(() => { g.strokeStyle = `rgba(${v},${v},${v},${al})`; g.lineWidth = lw; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(an + .7) * l * .5, y + Math.sin(an + .7) * l * .5, x + Math.cos(an) * l, y + Math.sin(an) * l); g.stroke(); });
  }
  for (let i = 0; i < 2200; i++) { const v = r() < .6 ? 30 : 240; g.fillStyle = `rgba(${v},${v},${v},${.12 + r() * .3})`; g.fillRect(r() * size, r() * size, 1 + r() * 1.4, 1 + r() * 1.4); }
  return c;
}
let _pats = null;
function pat(g, i = 0) { // pattern per drawing context (patterns are context-bound in some engines)
  if (!TEXS.length) for (let k = 0; k < 3; k++) TEXS.push(makeTex(11 + k * 7));
  i = Math.abs(Math.floor(i)); const p = g.createPattern(TEXS[i % TEXS.length], 'repeat');
  const s = .55 + (i * .137) % .6; p.setTransform(new DOMMatrix().rotate(i * 47).scale(s));
  return p;
}
// --- geometry helpers producing point lists ---
function ell(cx, cy, rx, ry, n = 40, a0 = 0, a1 = TAU) { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; }
function bez(p0, p1, p2, p3, n = 16) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return o; }
function qb(p0, p1, p2, n = 12) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; o.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); } return o; }
function rect(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
function scallop(pts, r, n) { return pts; }
// hand-cut path: subdivide edges, jitter along normals
function cut(pts, amt = 1.1, seed = 1, close = true, seg = 12) {
  const P = new Path2D(), r = rng(seed); const L = pts.length; const out = [];
  for (let i = 0; i < (close ? L : L - 1); i++) {
    const a = pts[i], b = pts[(i + 1) % L]; const dx = b[0] - a[0], dy = b[1] - a[1]; const len = Math.hypot(dx, dy); const k = Math.max(1, Math.round(len / seg));
    const nx = -dy / (len || 1), ny = dx / (len || 1);
    for (let j = 0; j < k; j++) { const t = j / k, j1 = (j === 0 ? .35 : 1) * (r() - .5) * 2 * amt; out.push([a[0] + dx * t + nx * j1, a[1] + dy * t + ny * j1]); }
  }
  if (!close) out.push(pts[L - 1]);
  out.forEach((p, i) => i ? P.lineTo(p[0], p[1]) : P.moveTo(p[0], p[1])); if (close) P.closePath();
  return P;
}
// paint a paper piece: cardboard edge, fill, texture, light, outline
function paint(g, path, fill, o = {}) {
  const lw = o.lw ?? 5;
  if (o.edge !== false) { g.save(); g.translate(o.ex ?? 2.2, o.ey ?? 3.2); g.fillStyle = o.edgeCol || EDGE; g.fill(path); if (lw) { g.lineWidth = lw; g.strokeStyle = o.line || INK; g.lineJoin = 'round'; g.stroke(path); } g.restore(); }
  g.fillStyle = fill; g.fill(path);
  g.save(); g.clip(path);
  if (o.tex !== 0) { g.globalCompositeOperation = 'overlay'; g.globalAlpha = o.tex ?? .55; g.fillStyle = pat(g, o.seed ?? 0); g.fillRect(-4000, -4000, 8000, 8000); }
  if (o.light !== false) {
    const b = o.bb || [-200, -200, 200, 200]; const gr = g.createLinearGradient(b[0], b[1], b[2], b[3]);
    gr.addColorStop(0, 'rgba(255,236,200,0.16)'); gr.addColorStop(.55, 'rgba(255,236,200,0)'); gr.addColorStop(1, 'rgba(30,12,4,0.20)');
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(-4000, -4000, 8000, 8000);
  }
  g.restore();
  if (lw) { g.lineWidth = lw; g.strokeStyle = o.line || INK; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(path); }
}
function bbox(pts) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; pts.forEach(p => { a = Math.min(a, p[0]); b = Math.min(b, p[1]); c = Math.max(c, p[0]); d = Math.max(d, p[1]); }); return [a, b, c, d]; }
function piece(g, pts, fill, o = {}) { const P = cut(pts, o.rough ?? 1.0, o.seed ?? 3, o.close ?? true, o.seg ?? 12); paint(g, P, fill, Object.assign({ bb: bbox(pts) }, o)); return P; }
function line(g, pts, lw = 4, col = INK) { g.save(); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.restore(); }
// ---- cards (cached sprites) ----
// card(x0, y0, x1, y1, res, fn): drawing coords are world units; origin stays at (0,0) of fn's space
function card(x0, y0, x1, y1, res, fn) {
  const pad = 12; const c = mkCanvas((x1 - x0 + pad * 2) * res, (y1 - y0 + pad * 2) * res), g = c.getContext('2d');
  g.scale(res, res); g.translate(-x0 + pad, -y0 + pad); fn(g);
  return { c, x0: x0 - pad, y0: y0 - pad, res, blur: new Map() };
}
let BLURCOUNT = 0;
function blurVar(cd, b) { // b in card units
  const q = Math.round(b * 4) / 4; if (q < .3) return null;
  let v = cd.blur.get(q); if (v) { v.used = ++BLURCOUNT; return v; }
  const ds = clamp(q * cd.res / 2.2, 1, 10); const pad = Math.ceil(q * cd.res / ds * 2.5) + 2;
  const w = Math.ceil(cd.c.width / ds), h = Math.ceil(cd.c.height / ds);
  const c = mkCanvas(w + pad * 2, h + pad * 2), g = c.getContext('2d');
  g.filter = `blur(${(q * cd.res / ds).toFixed(2)}px)`; g.drawImage(cd.c, pad, pad, w, h);
  v = { c, ds, pad, used: ++BLURCOUNT }; cd.blur.set(q, v);
  if (cd.blur.size > 24) { let old = null; cd.blur.forEach((x, k) => { if (!old || x.used < old[1].used) old = [k, x]; }); cd.blur.delete(old[0]); }
  return v;
}
// draw a card in the current transform at (x,y) local, with optional blur in local units
function drawCard(g, cd, x = 0, y = 0, b = 0, alpha = 1) {
  const v = b > .3 ? blurVar(cd, b) : null; const pa = g.globalAlpha; g.globalAlpha = pa * alpha;
  if (!v) g.drawImage(cd.c, x + cd.x0, y + cd.y0, cd.c.width / cd.res, cd.c.height / cd.res);
  else { const s = v.ds / cd.res; g.drawImage(v.c, x + cd.x0 - v.pad * s, y + cd.y0 - v.pad * s, v.c.width * s, v.c.height * s); }
  g.globalAlpha = pa;
}
// ---- text plates ----
function textPlate(text, o = {}) {
  const size = o.size || 110, font = o.font || `900 ${size}px "Playfair Display"`, padX = o.padX ?? size * .45, padY = o.padY ?? size * .3;
  const m = mkCanvas(10, 10).getContext('2d'); m.font = font; const lines = text.split('\n');
  const tw = Math.max(...lines.map(l => m.measureText(l).width)), lh = size * (o.lh || 1.08), th = lh * lines.length;
  const w = tw + padX * 2, h = th + padY * 2;
  return card(-w / 2, -h / 2, w / 2, h / 2, o.res || 1.5, g => {
    if (o.paper !== false) piece(g, o.shape || [[-w / 2, -h / 2 + 4], [w / 2 - 6, -h / 2], [w / 2, h / 2 - 5], [-w / 2 + 5, h / 2]], o.bg || '#efe2c4', { lw: o.lw ?? 6, seed: o.seed || 5, rough: 1.6, tex: .6 });
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((l, i) => {
      const y = -th / 2 + lh * (i + .5) + size * .04;
      if (o.stroke) { g.lineWidth = o.stroke; g.strokeStyle = o.strokeCol || INK; g.lineJoin = 'round'; g.strokeText(l, 0, y); }
      g.fillStyle = o.col || INK; g.fillText(l, 0, y);
    });
    if (o.stamp) { // ink stamp texture: knock out speckles
      g.save(); g.globalCompositeOperation = 'destination-out'; const r = rng(o.seed || 9);
      for (let i = 0; i < 900; i++) { g.globalAlpha = .25 + r() * .5; g.fillRect(-w / 2 + r() * w, -h / 2 + r() * h, 1 + r() * 3, 1 + r() * 2); } g.restore();
    }
  });
}
// per-letter paper glyph cards for kinetic typography
function glyphCards(text, o = {}) {
  const size = o.size || 120, font = o.font || `900 ${size}px "Playfair Display"`;
  const m = mkCanvas(10, 10).getContext('2d'); m.font = font; const out = []; let x = 0;
  const total = m.measureText(text).width;
  for (const ch of text) {
    const w = m.measureText(ch).width;
    if (ch !== ' ') out.push({ ch, x: x + w / 2 - total / 2, w, cd: card(-w / 2 - 14, -size * .75, w / 2 + 14, size * .45, o.res || 1.5, g => {
      g.font = font; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.save(); g.translate(2, 3.5); g.lineWidth = o.lw ?? 9; g.strokeStyle = EDGE; g.lineJoin = 'round'; g.strokeText(ch, 0, size * .32); g.fillStyle = EDGE; g.fillText(ch, 0, size * .32); g.restore();
      g.lineWidth = o.lw ?? 9; g.strokeStyle = o.line || INK; g.lineJoin = 'round'; g.strokeText(ch, 0, size * .32);
      g.fillStyle = o.col || '#f3e6c8'; g.fillText(ch, 0, size * .32);
      g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = .5; g.fillStyle = pat(g, 2); g.globalCompositeOperation = 'overlay'; g.restore();
    }) });
    x += w;
  }
  return { glyphs: out, width: total, size };
}
