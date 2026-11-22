// ---- set builders ----
const STONE = ['#dccaa3', '#cfb68c', '#e3d2b0', '#c4ab82', '#d6c098'], SLATE = ['#59606c', '#4f5560', '#666d79'], SHUT = ['#3f6a7a', '#5b7a4a', '#7a4a3a', '#46607e'];
// a house with mansard roof; x = left, y = ground; returns chimney tops
function house(g, x, y, w, h, rh, sd, o = {}) {
  const r = rng(sd), col = o.col || STONE[(r() * STONE.length) | 0], sl = SLATE[(r() * 3) | 0], sh = o.shut || SHUT[(r() * 4) | 0];
  const ch = [];
  // chimneys behind roof
  const nch = 1 + (r() * 2 | 0); for (let i = 0; i < nch; i++) { const cx = x + w * (.2 + r() * .6), cw = 26 + r() * 14, chh = 60 + r() * 50; piece(g, rect(cx, y - h - rh - chh + 20, cw, chh), '#a8573e', { lw: 4, seed: sd + 10 + i }); piece(g, rect(cx - 5, y - h - rh - chh + 14, cw + 10, 14), '#8b4430', { lw: 3.5, seed: sd + 20 + i }); ch.push([cx + cw / 2, y - h - rh - chh + 14]); }
  piece(g, [[x - 8, y - h], [x + w + 8, y - h], [x + w - 16, y - h - rh], [x + 16, y - h - rh]], sl, { lw: 5, seed: sd + 1 });
  g.save(); g.strokeStyle = 'rgba(20,20,30,.25)'; g.lineWidth = 2; for (let k = 1; k < 5; k++) { const yy = y - h - rh * k / 5; g.beginPath(); g.moveTo(x - 6 + k * 4, yy); g.lineTo(x + w + 6 - k * 4, yy); g.stroke(); } g.restore();
  const nd = Math.max(1, Math.round(w / 110)); for (let i = 0; i < nd; i++) { const dx = x + w * (i + .5) / nd; piece(g, [[dx - 22, y - h - 6], [dx + 22, y - h - 6], [dx + 22, y - h - rh * .62], [dx, y - h - rh * .62 - 22], [dx - 22, y - h - rh * .62]], col, { lw: 3.5, seed: sd + 30 + i }); piece(g, rect(dx - 12, y - h - rh * .55, 24, rh * .38), '#2d3540', { lw: 2.5, seed: sd + 40 + i, edge: false }); }
  piece(g, rect(x, y - h, w, h), col, { lw: 5, seed: sd + 2 });
  piece(g, rect(x - 6, y - h - 6, w + 12, 16), '#bba077', { lw: 3.5, seed: sd + 3 });
  const floors = Math.max(1, Math.round(h / 150)), cols = Math.max(1, Math.round(w / 95));
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
    const wx = x + w * (c + .5) / cols, wy = y - h + 40 + f * (h - 60) / floors, ww = Math.min(46, w / cols * .45), wh = Math.min(84, (h - 60) / floors * .62);
    if (f === floors - 1 && c === (cols / 2 | 0) && o.door !== false) { piece(g, [[wx - 30, y], [wx - 30, y - 110], ...ell(wx, y - 110, 30, 26, 8, Math.PI, TAU).slice(1), [wx + 30, y]], '#5a3622', { lw: 4, seed: sd + 50 }); continue; }
    piece(g, rect(wx - ww / 2 - 6, wy - 6, ww + 12, wh + 12), '#efe4cb', { lw: 3, seed: sd + 60 + f * 9 + c, light: false });
    const lit = o.lit && r() < o.lit; piece(g, rect(wx - ww / 2, wy, ww, wh), lit ? '#ffcf7a' : '#2f3a48', { lw: 2.5, seed: sd + 70 + f * 9 + c, edge: false, light: false, tex: .3 });
    g.strokeStyle = '#efe4cb'; g.lineWidth = 3; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx, wy + wh); g.moveTo(wx - ww / 2, wy + wh * .45); g.lineTo(wx + ww / 2, wy + wh * .45); g.stroke();
    if (r() < .7) { piece(g, rect(wx - ww / 2 - 6 - ww * .42, wy - 2, ww * .42, wh + 4), sh, { lw: 3, seed: sd + 80 + f * 9 + c }); piece(g, rect(wx + ww / 2 + 6, wy - 2, ww * .42, wh + 4), sh, { lw: 3, seed: sd + 90 + f * 9 + c }); }
  }
  return ch;
}
function houseRow(seed, x0, x1, y, hmin, hmax, o = {}) {
  const r = rng(seed), chs = []; let x = x0; const out = [];
  while (x < x1) { const w = 160 + r() * 180, h = hmin + r() * (hmax - hmin), rh = 80 + r() * 70; out.push([x, w, h, rh, seed * 31 + out.length * 7]); x += w - 2; }
  return { out, draw: (g) => out.forEach(([x, w, h, rh, sd]) => chs.push(...house(g, x, y, w, h, rh, sd, o))), chs };
}
function rowCard(seed, x0, x1, y, hmin, hmax, res = .8, o = {}) { const R = houseRow(seed, x0, x1, y, hmin, hmax, o); const cd = card(x0 - 40, y - hmax - 400, x1 + 40, y + (o.below || 60), res, g => { R.draw(g); if (o.ground) piece(g, rect(x0 - 40, y, x1 - x0 + 80, o.below || 60), o.ground, { lw: 4, seed: seed + 5 }); if (o.tint) { g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = o.tint; g.fillRect(x0 - 100, y - hmax - 500, x1 - x0 + 200, hmax + 1000); g.restore(); } }); cd.chs = R.chs; return cd; }
function skyCard(top, mid, bot, seed = 1, clouds = 7, w = 5000, h = 4000) {
  return card(-w / 2, -h / 2, w / 2, h / 2, .35, g => {
    const gr = g.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, top); gr.addColorStop(.55, mid); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(-w / 2, -h / 2, w, h);
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = .4; g.fillStyle = pat(g, 2); g.fillRect(-w / 2, -h / 2, w, h); g.restore();
    const r = rng(seed); for (let i = 0; i < clouds; i++) { const cx = -w / 2 + r() * w, cy = -h / 2 + h * (.15 + r() * .45), cw = 300 + r() * 500; cloud(g, cx, cy, cw, seed + i); }
  });
}
function cloud(g, cx, cy, cw, sd, col = 'rgba(255,236,214,.85)') { const r = rng(sd); const pts = []; const n = 7; for (let i = 0; i <= n; i++) { const a = Math.PI + i / n * Math.PI; pts.push([cx + Math.cos(a) * cw * .5, cy + Math.sin(a) * cw * .18 * (1 + r() * .8)]); } piece(g, [...pts, [cx + cw * .5, cy + 10], [cx - cw * .5, cy + 10]], col, { lw: 3.5, seed: sd, rough: 2, line: 'rgba(80,50,40,.6)' }); }
// ---- interiors ----
function panelWall(x0, y0, x1, y1, o = {}) {
  return card(x0, y0, x1, y1, o.res || .8, g => {
    piece(g, rect(x0, y0, x1 - x0, y1 - y0), o.upper || '#7d8a74', { lw: 0, edge: false, tex: .6 });
    if (o.pattern !== false) { g.save(); g.globalAlpha = .22; g.fillStyle = o.patCol || '#e9e2c6'; for (let y = y0 + 40; y < (o.dado || y1); y += 110) for (let x = x0 + ((y / 110 | 0) % 2) * 55; x < x1; x += 110) { g.beginPath(); g.ellipse(x, y, 10, 18, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(x, y - 26, 5, 0, TAU); g.fill(); } g.restore(); }
    const dado = o.dado || (y0 + (y1 - y0) * .62);
    piece(g, rect(x0, dado, x1 - x0, y1 - dado), o.lower || '#6b5038', { lw: 5, seed: 901, tex: .55 });
    for (let x = x0 + 40; x < x1 - 120; x += 260) piece(g, rect(x, dado + 40, 200, (y1 - dado) - 90), o.lowerP || '#7a5c40', { lw: 4, seed: 910 + x, tex: .5 });
    piece(g, rect(x0, dado - 14, x1 - x0, 28), o.rail || '#5a4029', { lw: 4, seed: 930 });
    if (o.extra) o.extra(g);
  });
}
function windowCard(w, h, o = {}) {
  return card(-w / 2 - 40, -h - 40, w / 2 + 40, 40, o.res || 1, g => {
    piece(g, [[-w / 2 - 30, 30], [-w / 2 - 30, -h], ...ell(0, -h, w / 2 + 30, 60, 12, Math.PI, TAU).slice(1), [w / 2 + 30, 30]], o.frame || '#e8dcc0', { lw: 5, seed: 950 });
    const sky = g.createLinearGradient(0, -h - 60, 0, 0); sky.addColorStop(0, o.sky0 || '#9fc0d6'); sky.addColorStop(1, o.sky1 || '#dfe8e6');
    const P = cut([[-w / 2, 0], [-w / 2, -h], ...ell(0, -h, w / 2, 44, 12, Math.PI, TAU).slice(1), [w / 2, 0]], .8, 951); g.fillStyle = sky; g.fill(P); g.lineWidth = 4; g.strokeStyle = INK; g.stroke(P);
    if (o.view) { g.save(); g.clip(P); o.view(g); g.restore(); }
    g.strokeStyle = o.frame || '#e8dcc0'; g.lineWidth = 9; g.beginPath(); g.moveTo(0, -h - 40); g.lineTo(0, 0); for (let k = 1; k < 4; k++) { g.moveTo(-w / 2, -h * k / 4); g.lineTo(w / 2, -h * k / 4); } g.stroke();
    g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
  });
}
function bookshelfCard(w, h, sd) {
  return card(-w / 2, -h, w / 2, 0, .9, g => {
    piece(g, rect(-w / 2, -h, w, h), '#5d3a22', { lw: 5, seed: sd });
    const r = rng(sd); const shelves = Math.round(h / 170);
    for (let s = 0; s < shelves; s++) { const y = -h + 20 + (s + 1) * (h - 30) / shelves; piece(g, rect(-w / 2 + 14, y - 12, w - 28, 16), '#7a4f2e', { lw: 3, seed: sd + s });
      let x = -w / 2 + 22; while (x < w / 2 - 40) { const bw = 18 + r() * 22, bh = 90 + r() * 50; const c = ['#7a2e24', '#2f4a3a', '#5a3b20', '#3a3a5a', '#8a6a2a', '#6a2a3a'][(r() * 6) | 0]; const tilt = r() < .1 ? .2 : 0; g.save(); g.translate(x, y - 12); g.rotate(-tilt); piece(g, rect(0, -bh, bw, bh), c, { lw: 2.6, seed: sd + 100 + (x | 0), rough: .4, light: false }); g.fillStyle = '#d8b65a'; g.fillRect(3, -bh + 12, bw - 6, 3); g.fillRect(3, -18, bw - 6, 3); g.restore(); x += bw + 2 + (tilt ? 8 : 0); } }
  });
}
function deskCard(w, h, o = {}) {
  return card(-w / 2 - 20, -h - 30, w / 2 + 20, 20, o.res || 1, g => {
    piece(g, [[-w / 2 + 30, 0], [-w / 2 + 50, -h + 40], [-w / 2 + 80, -h + 40], [-w / 2 + 70, 0]], '#4e2f1a', { lw: 4, seed: 960 }); piece(g, [[w / 2 - 70, 0], [w / 2 - 80, -h + 40], [w / 2 - 50, -h + 40], [w / 2 - 30, 0]], '#4e2f1a', { lw: 4, seed: 961 });
    piece(g, rect(-w / 2 + 40, -h + 30, w - 80, h * .45), o.col || '#6b4024', { lw: 4.5, seed: 962 });
    piece(g, rect(-w / 2, -h, w, 36), o.top || '#7c4c2b', { lw: 5, seed: 963 });
    if (o.cloth) piece(g, [[-w / 2 - 14, -h - 4], [w / 2 + 14, -h - 4], [w / 2 + 24, -h + 120], ...bez([w / 2 + 24, -h + 120], [w / 4, -h + 150], [-w / 4, -h + 100], [-w / 2 - 24, -h + 130], 12)], o.cloth, { lw: 5, seed: 964 });
  });
}
// ---- falling paper notes ----
function noteCard(v) { return memo('note' + v, () => card(-60, -42, 60, 42, 2, g => { piece(g, rect(-56, -38, 112, 76), v % 2 ? '#efe3c6' : '#e8d9b4', { lw: 3.5, seed: 1000 + v, rough: 1.4 }); g.fillStyle = '#5a3418'; g.font = 'italic 22px "IM Fell"'; g.fillText(['Dette', 'Billet', 'Je dois', 'Reçu'][v % 4], -44, -8); g.strokeStyle = 'rgba(90,52,24,.6)'; g.lineWidth = 2; for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(-44, 8 + i * 12); g.lineTo(30 - i * 20, 8 + i * 12); g.stroke(); } g.font = 'italic 20px "IM Fell"'; g.fillText((v * 1371 % 9000 + 1000) + ' ₶', 0, 30); })); }
function fallingNotes(g, t, seed, n, box, sz = 1) {
  const r = rng(seed); for (let i = 0; i < n; i++) { const x0 = box[0] + r() * box[2], sp = 90 + r() * 120, ph = r() * TAU, t0 = r() * 6; const y = box[1] + ((t + t0) * sp) % box[3]; const x = x0 + Math.sin((t + t0) * 1.7 + ph) * 60;
    g.save(); g.translate(x, y); g.rotate(Math.sin((t + t0) * 2.1 + ph) * .7); g.scale(sz, sz * (.4 + .6 * Math.abs(Math.cos((t + t0) * 2.5 + ph)))); drawCard(g, noteCard(i)); g.restore(); }
}
function smoke(g, x, y, t, seed, s = 1, col = 'rgba(230,225,215,') { const r = rng(seed); for (let i = 0; i < 6; i++) { const k = ((t * .35 + i / 6 + r() * .1) % 1); g.globalAlpha = (1 - k) * .55; g.fillStyle = col + '1)'; g.beginPath(); g.arc(x + Math.sin(k * 5 + i) * 18 * s + k * 50 * s, y - k * 220 * s, (12 + k * 40) * s, 0, TAU); g.fill(); } g.globalAlpha = 1; }
