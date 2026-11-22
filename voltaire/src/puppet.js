// ---- paper-cut puppets: cached part cards + live stick limbs and faces ----
const SPECS = {
  V: { build: 'lean', skin: '#efcfad', coat: '#2f7f79', coatD: '#22605c', vest: '#d9a544', trim: '#ecc463', wig: '#b07a43', wigD: '#86582c', wigStyle: 'peri', nose: 'long', blush: '#e79a82', jabot: true },
  L: { build: 'slim', skin: '#f2d4b6', coat: '#7c4a2b', coatD: '#603620', vest: '#d8ac2e', trim: '#e9cf7a', wig: '#f2ede3', wigD: '#cfc7b8', wigStyle: 'tied', nose: 'button', blush: '#eda08c', specs: 'round', quillEar: true, jabot: true },
  M: { build: 'pear', skin: '#f3c9ae', coat: '#a5232d', coatD: '#7c1820', vest: '#e8c36a', trim: '#e9b94a', wig: '#f6f2ea', wigD: '#d8d0c2', wigStyle: 'tower', nose: 'round', blush: '#e2626a', specs: 'pince', jabot: true, embroid: true },
  J: { build: 'robe', skin: '#ecc8a8', coat: '#26201f', coatD: '#171312', vest: '#a12b2b', trim: '#b8332f', wig: '#c9c3b8', wigD: '#a29b8e', wigStyle: 'judge', nose: 'hook', blush: '#d99a86', specs: 'half', droopy: true },
  G: { build: 'straight', skin: '#eccaa8', coat: '#2d4c8e', coatD: '#20386c', vest: '#e8dcc0', trim: '#e2c56b', wig: '#ece6da', wigD: '#cbc3b3', wigStyle: 'tied', nose: 'button', blush: '#e39a86', hat: 'tricorn', jabot: false },
  B: { build: 'plump', skin: '#f0c6a6', coat: '#3f5d3b', coatD: '#2d452b', vest: '#d8b25a', trim: '#e0c070', wig: '#e9e3d6', wigD: '#c8bfae', wigStyle: 'tied', nose: 'round', blush: '#e48b7c', jabot: true },
  N: { build: 'slim', skin: '#ead0b4', coat: '#2c2a30', coatD: '#1d1c21', vest: '#8c7a5a', trim: '#b49a62', wig: '#dcd6ca', wigD: '#b8b0a2', wigStyle: 'tied', nose: 'long', blush: '#d9a08e', jabot: true },
  R: { build: 'plump', skin: '#f2cbb0', coat: '#5d3a7a', coatD: '#462a5e', vest: '#e6c46a', trim: '#e9c25a', wig: '#f5f0e6', wigD: '#d5cdbd', wigStyle: 'peri', nose: 'round', blush: '#e88a86', jabot: true, embroid: true },
  P: { build: 'slim', skin: '#e9cbad', coat: '#7b7568', coatD: '#5f5a50', vest: '#a39a84', trim: '#b9b09a', wig: '#6b5440', wigD: '#4f3d2e', wigStyle: 'short', nose: 'button', blush: '#dd9c88', hat: 'cap', jabot: false },
  K: { build: 'plump', skin: '#e8c1a0', coat: '#8a6a45', coatD: '#6c5234', vest: '#c9b48a', trim: '#b39a6a', wig: '#5d4632', wigD: '#45331f', wigStyle: 'short', nose: 'round', blush: '#df8f7c', hat: 'cap', jabot: false },
  C: { build: 'slim', skin: '#ebcdb0', coat: '#5a5f6a', coatD: '#454952', vest: '#a7a08f', trim: '#c2b998', wig: '#7a6650', wigD: '#5c4c3a', wigStyle: 'short', nose: 'long', blush: '#dd9c88', jabot: false },
};
const BUILD = {
  lean: { L: 200, T: 200, sh: 48, wa: 38, hem: 70, hemY: 92, headR: 60, neck: 214, hipW: 14 },
  slim: { L: 190, T: 192, sh: 44, wa: 36, hem: 64, hemY: 86, headR: 58, neck: 206, hipW: 13 },
  pear: { L: 150, T: 175, sh: 44, wa: 76, hem: 84, hemY: 70, headR: 62, neck: 190, hipW: 16 },
  plump: { L: 160, T: 178, sh: 50, wa: 64, hem: 78, hemY: 74, headR: 60, neck: 192, hipW: 16 },
  robe: { L: 180, T: 196, sh: 50, wa: 50, hem: 78, hemY: 178, headR: 60, neck: 210, hipW: 14 },
  straight: { L: 200, T: 196, sh: 46, wa: 40, hem: 60, hemY: 70, headR: 58, neck: 210, hipW: 14 },
};
const PUPS = {};
function getPuppet(id, res = 2) { const k = id + '@' + res; return PUPS[k] || (PUPS[k] = buildPuppet(id, SPECS[id], res)); }
function buildPuppet(id, S, res) {
  const B = BUILD[S.build], seed = id.charCodeAt(0) * 13; const P = { id, S, B, res };
  const T = B.T, nk = B.neck, hr = B.headR;
  // ---------- torso (relative to hip pivot) ----------
  P.torso = card(-120, -nk - 20, 120, B.hemY + 20, res, g => {
    let pts;
    if (S.build === 'pear') pts = [[-22, -nk], [-46, -nk + 16], [-58, -nk + 70], [-84, -60], [-80, 10], [-90, 50], [-86, B.hemY], [-10, B.hemY + 6], [70, B.hemY - 4], [66, 30], [86, -30], [84, -90], [52, -nk + 30], [40, -nk + 14], [24, -nk]];
    else if (S.build === 'plump') pts = [[-22, -nk], [-50, -nk + 16], [-56, -nk + 70], [-66, -50], [-62, 10], [-80, 50], [-80, B.hemY], [-10, B.hemY + 6], [66, B.hemY - 4], [58, 24], [70, -30], [64, -100], [44, -nk + 16], [24, -nk]];
    else if (S.build === 'robe') pts = [[-24, -nk], [-52, -nk + 18], [-56, -100], [-64, 20], [-82, B.hemY], [0, B.hemY + 6], [80, B.hemY - 4], [62, 20], [54, -100], [44, -nk + 16], [24, -nk]];
    else pts = [[-20, -nk], ...qb([-30, -nk + 2], [-B.sh, -nk + 6], [-B.sh + 2, -nk + 34], 6), ...qb([-B.sh + 2, -nk + 40], [-B.sh + 12, -nk * .45], [-B.wa + 4, -24], 8),
      ...qb([-B.wa + 2, -14], [-B.hem + 4, 20], [-B.hem - 4, B.hemY], 8), ...qb([-B.hem + 4, B.hemY + 2], [-10, B.hemY + 12], [B.hem - 14, B.hemY - 4], 8),
      ...qb([B.hem - 18, B.hemY - 10], [B.wa + 12, 40], [B.wa - 2, -12], 8), ...qb([B.wa - 2, -24], [B.wa + 4, -nk * .5], [B.sh - 6, -nk + 30], 8), [B.sh - 12, -nk + 14], [24, -nk]];
    const bb = bbox(pts);
    // far coat tail (darker) behind
    if (S.build !== 'robe') piece(g, [[-B.hem + 4, 30], [-B.hem - 12, B.hemY + 4], [-B.hem + 30, B.hemY + 10], [-20, 40]], S.coatD, { lw: 4.5, seed: seed + 1, bb });
    piece(g, pts, S.coat, { lw: 5.5, seed: seed + 2, bb });
    if (S.build === 'robe') { // red sash and white bands
      piece(g, [[-40, -120], [50, -150], [56, -122], [-36, -92]], S.vest, { lw: 4, seed: seed + 3, bb });
      piece(g, [[18, -nk + 2], [36, -nk + 2], [34, -nk + 46], [26, -nk + 52], [16, -nk + 44]], '#f4f0e6', { lw: 3.5, seed: seed + 4 });
      line(g, [[4, -nk + 30], [10, B.hemY - 10]], 2.5, 'rgba(0,0,0,.35)'); line(g, [[-30, -nk + 40], [-44, B.hemY - 6]], 2.5, 'rgba(0,0,0,.3)');
    } else {
      // waistcoat in the open front
      const vx = S.build === 'pear' ? 40 : S.build === 'plump' ? 30 : 16;
      piece(g, [[vx, -nk + 8], [B.sh - 6, -nk + 22], [S.build === 'pear' ? 84 : B.wa + 6, -40], [S.build === 'pear' ? 78 : B.wa + 4, 16], [vx + 8, 20], [vx - 6, -40]], S.vest, { lw: 4, seed: seed + 5, bb });
      for (let i = 0; i < 6; i++) { const y = -nk + 34 + i * ((nk - 40) / 6); const x = (S.build === 'pear' ? 62 : S.build === 'plump' ? 52 : B.wa + 1) + Math.sin(i) * 1.5 - (S.build === 'pear' ? Math.abs(y + 60) * .12 : 0); g.fillStyle = S.trim; g.beginPath(); g.arc(x, y, 4.2, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke(); }
      g.save(); g.strokeStyle = 'rgba(20,10,5,.35)'; g.lineWidth = 3; g.lineCap = 'round'; [[-B.hem * .55, 6, -B.hem * .78, B.hemY - 6], [-B.hem * .2, 8, -B.hem * .28, B.hemY - 2]].forEach(([a, b, c, d]) => { g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo((a + c) / 2 - 4, (b + d) / 2, c, d); g.stroke(); }); g.restore();
      // pocket flap + cuff trim on coat front edge
      piece(g, [[-B.hem + 22, 34], [-12, 30], [-10, 44], [-B.hem + 26, 48]], S.coatD, { lw: 3.5, seed: seed + 6, light: false });
      g.save(); g.strokeStyle = S.trim; g.lineWidth = 3; g.setLineDash([2, 7]); g.beginPath(); g.moveTo(B.sh - 8, -nk + 20); g.lineTo(S.build === 'pear' ? 86 : B.wa, -30); g.lineTo(B.hem - 16, B.hemY - 6); g.stroke(); g.restore();
      if (S.embroid) { g.save(); g.strokeStyle = S.trim; g.lineWidth = 2.5; for (let i = 0; i < 9; i++) { const y = -nk + 40 + i * 26, x = -B.sh + 22 + Math.sin(i * 1.3) * 3; g.beginPath(); g.moveTo(x - 6, y); g.bezierCurveTo(x - 2, y - 9, x + 7, y - 4, x + 2, y + 3); g.stroke(); g.beginPath(); g.arc(x + 9, y + 8, 2.2, 0, TAU); g.stroke(); } g.restore(); }
    }
    if (S.jabot) { // white lace cravat
      const jx = S.build === 'pear' ? 34 : S.build === 'plump' ? 26 : 18;
      const pts2 = []; for (let i = 0; i <= 8; i++) { const y = -nk + 4 + i * 7; pts2.push([jx + 18 + (i % 2 ? 7 : 0), y]); } for (let i = 8; i >= 0; i--) { const y = -nk + 4 + i * 7; pts2.push([jx - 2 + (i % 2 ? -5 : 0), y]); }
      piece(g, pts2, '#f7f2e8', { lw: 3.2, seed: seed + 7, rough: .6, seg: 6 });
    }
  });
  // ---------- head (relative to neck point) ----------
  const head = S.nose === 'long' ? [[-46, -30], [-50, -78], [-30, -128], [6, -146], [40, -134], [56, -100], [58, -86], [92, -58], [86, -50], [62, -48], [62, -38], [58, -30], [62, -18], [58, -8], [40, 0], [12, 4], [-6, 6], [-30, -2]]
    : S.nose === 'hook' ? [[-46, -30], [-52, -80], [-30, -126], [6, -140], [42, -128], [56, -98], [60, -84], [80, -66], [78, -50], [62, -50], [60, -36], [58, -22], [50, -8], [30, 2], [-6, 6], [-30, -2]]
    : S.nose === 'round' ? [[-50, -30], [-56, -82], [-34, -130], [6, -146], [44, -132], [60, -100], [62, -84], [80, -76], [84, -60], [66, -50], [66, -36], [64, -20], [54, -4], [30, 6], [-10, 8], [-36, -2]]
    : [[-46, -30], [-50, -80], [-30, -126], [6, -142], [40, -130], [56, -100], [58, -84], [70, -70], [68, -58], [58, -52], [60, -36], [56, -20], [46, -6], [26, 2], [-6, 6], [-30, -2]];
  P.headPts = head;
  P.head = card(-80, -170, 110, 30, res * (P.res > 3 ? 1 : 1.25), g => {
    piece(g, [[-14, 0], [14, 0], [16, 30], [-12, 30]], S.skin, { lw: 4, seed: seed + 8, light: false }); // neck
    piece(g, head, S.skin, { lw: 5, seed: seed + 9, rough: .7, seg: 9 });
    if (S.nose === 'round') piece(g, ell(74, -64, 15, 13, 18), S.skin, { lw: 4, seed: seed + 10, rough: .4, seg: 6 });
    // ear hint (covered by wig for most)
    g.save(); g.globalAlpha = .9; const gr = g.createRadialGradient(36, -50, 2, 36, -50, 26); gr.addColorStop(0, S.blush + 'cc'); gr.addColorStop(1, S.blush + '00'); g.fillStyle = gr; g.fillRect(0, -90, 80, 80); g.restore();
  });
  // ---------- wig ----------
  const curl = (g, cx, cy, r, col, sd) => piece(g, ell(cx, cy, r, r * .9, 14), col, { lw: 3.6, seed: sd, rough: .5, seg: 7, light: false });
  const ws = S.wigStyle;
  P.wigBack = card(-150, -300, 120, 120, res, g => {
    if (ws === 'peri') {
      const outer = [...bez([-10, -158], [-80, -160], [-110, -60], [-96, 40], 14)];
      piece(g, [[30, -140], [10, -160], ...outer, [-40, 46], [-10, 20], [12, -40], [26, -100]], S.wigD, { lw: 5, seed: seed + 11 });
      outer.forEach((p, i) => { if (i % 2 === 0 || i > 8) curl(g, p[0] + 4, p[1], 17 + (i > 8 ? 2 : 0), i % 3 ? S.wig : S.wigD, seed + 20 + i); });
      for (let i = 0; i < 4; i++) curl(g, -76 + i * 18, 36 + Math.sin(i * 1.7) * 6, 17, i % 2 ? S.wig : S.wigD, seed + 40 + i);
      for (let i = 0; i < 3; i++) curl(g, -60 + i * 6, -40 + i * 26, 16, S.wig, seed + 50 + i);
    } else if (ws === 'judge') {
      piece(g, [[-40, -150], [10, -158], [34, -140], [20, -60], [10, 40], [-20, 150], [-70, 160], [-104, 120], [-108, -40], [-84, -124]], S.wig, { lw: 5, seed: seed + 11 });
      for (let i = 0; i < 9; i++) curl(g, -98 + (i % 2) * 14, -70 + i * 26, 14, i % 2 ? S.wig : S.wigD, seed + 20 + i);
      for (let i = 0; i < 5; i++) curl(g, -70 + i * 14, 150 + Math.sin(i) * 5, 13, S.wigD, seed + 40 + i);
    } else if (ws === 'tied') {
      piece(g, [[-34, -140], [10, -150], [28, -130], [0, -70], [-30, -40], [-60, -50], [-66, -100]], S.wig, { lw: 4.5, seed: seed + 11 });
      piece(g, [[-58, -60], [-46, -66], [-62, 40], [-74, 36]], '#1d1716', { lw: 3, seed: seed + 12 }); // black ribbon queue
      piece(g, ell(-56, -62, 14, 9, 12), '#1d1716', { lw: 3, seed: seed + 13 });
    } else if (ws === 'tower') {
      piece(g, [[-40, -140], [10, -150], [30, -130], [10, -60], [-30, -10], [-70, -10], [-86, -70], [-70, -130]], S.wig, { lw: 5, seed: seed + 11 });
      for (let i = 0; i < 4; i++) curl(g, -76 + i * 12, -20 + Math.sin(i) * 4, 13, S.wigD, seed + 20 + i);
    } else if (ws === 'short') {
      piece(g, [[-30, -140], [10, -150], [30, -134], [10, -100], [-20, -60], [-50, -56], [-56, -100]], S.wig, { lw: 4.5, seed: seed + 11 });
    }
  });
  P.wigFront = card(-120, -330, 110, 0, res, g => {
    if (ws === 'peri' || ws === 'judge') {
      piece(g, [[-52, -110], [-40, -150], [0, -168], [40, -156], [56, -126], [34, -124], [16, -132], [-10, -118], [-30, -84], [-44, -60]], S.wig, { lw: 5, seed: seed + 50 });
      for (let i = 0; i < 4; i++) curl(g, -40 + i * 22, -152 + Math.abs(i - 1.5) * 5, 14, i % 2 ? S.wigD : S.wig, seed + 60 + i);
      curl(g, -34, -78, 15, S.wig, seed + 70); curl(g, -26, -54, 14, S.wigD, seed + 71);
    } else if (ws === 'tied') {
      piece(g, [[-48, -100], [-34, -142], [6, -156], [40, -144], [54, -116], [30, -120], [0, -122], [-26, -96], [-36, -64]], S.wig, { lw: 4.5, seed: seed + 50 });
      curl(g, -24, -76, 13, S.wigD, seed + 70); curl(g, -22, -54, 12, S.wig, seed + 71);
    } else if (ws === 'tower') {
      // the towering wig: stacked rows of curls
      piece(g, [[-56, -100], [-58, -170], [-50, -260], [-20, -310], [20, -318], [50, -280], [58, -190], [56, -126], [30, -124], [-20, -118], [-40, -80]], S.wig, { lw: 5.5, seed: seed + 50 });
      for (let r = 0; r < 6; r++) for (let i = 0; i < 4; i++) curl(g, -40 + i * 26 + (r % 2) * 10, -136 - r * 30, 15, (r + i) % 2 ? S.wigD : S.wig, seed + 60 + r * 5 + i);
      curl(g, -42, -78, 15, S.wig, seed + 90); curl(g, -36, -54, 14, S.wigD, seed + 91);
    } else if (ws === 'short') {
      piece(g, [[-48, -96], [-36, -138], [6, -152], [40, -140], [54, -110], [30, -114], [0, -118], [-30, -90], [-38, -70]], S.wig, { lw: 4.5, seed: seed + 50 });
    }
    if (S.hat === 'tricorn') { piece(g, [[-70, -128], [-20, -176], [40, -186], [86, -150], [60, -132], [10, -150], [-40, -126]], '#211b1a', { lw: 4.5, seed: seed + 95 }); line(g, [[-60, -132], [70, -146]], 3, S.trim); }
    if (S.hat === 'cap') { piece(g, [[-52, -118], [-36, -160], [10, -170], [52, -150], [64, -128], [20, -134], [-30, -114]], S.coatD, { lw: 4.5, seed: seed + 95 }); }
  });
  return P;
}
// ---------- live drawing ----------
const vecA = (a) => [Math.sin(a * DEG), Math.cos(a * DEG)];
function limb(g, x, y, a1, a2, l1, l2, lw) {
  const [ux, uy] = vecA(a1), [vx, vy] = vecA(a1 + a2);
  const kx = x + ux * l1, ky = y + uy * l1, ex = kx + vx * l2, ey = ky + vy * l2;
  g.lineWidth = lw; g.strokeStyle = INK; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x, y); g.lineTo(kx, ky); g.lineTo(ex, ey); g.stroke();
  return [ex, ey, a1 + a2];
}
function hand(g, x, y, a, S, prop, t) {
  g.save(); g.translate(x, y); g.rotate(-a * DEG);
  if (prop) prop(g, t, a);
  // lace cuff
  g.fillStyle = '#f7f2e8'; g.strokeStyle = INK; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-10, -12); for (let i = 0; i <= 4; i++) g.lineTo(-10 + i * 5, -6 + (i % 2) * 5); g.lineTo(10, -12); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = S.skin; g.beginPath(); g.ellipse(0, 4, 10, 11, 0, 0, TAU); g.fill(); g.lineWidth = 3.4; g.stroke();
  g.restore();
}
function shoe(g, x, y, a) { g.save(); g.translate(x, y); g.rotate(-a * DEG * .3); g.fillStyle = '#1b1414'; g.beginPath(); g.ellipse(9, -2, 19, 9, 0, 0, TAU); g.fill(); g.fillStyle = '#d9c27a'; g.fillRect(4, -9, 7, 5); g.restore(); }
function face(g, P, f, t) {
  const S = P.S; const ex = S.nose === 'long' ? 36 : 34, ey = -88;
  const open = f.eyes ?? 1, look = f.look || [1, 0], sq = f.squint || 0, blink = f.blink ? 0.05 : 1;
  const eo = open * blink * (S.droopy ? .55 : 1) * (1 - sq * .6);
  const eye = (x, y, sx) => {
    g.save(); g.translate(x, y);
    g.fillStyle = '#fbf8f0'; g.strokeStyle = INK; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 0, 10 * sx * (f.wide ? 1.25 : 1), Math.max(1.2, 10 * eo * (f.wide ? 1.3 : 1)), 0, 0, TAU); g.fill(); g.stroke();
    if (eo > .15 && f.coins) { const cr = 7.5 * sx * f.coins; g.fillStyle = GOLD; g.beginPath(); g.arc(look[0] * 2 * sx, look[1] * 2, cr, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = GOLDD; g.stroke(); g.fillStyle = '#fff6c0'; g.fillRect(look[0] * 2 * sx - cr * .4, look[1] * 2 - cr * .5, cr * .4, cr * .3); }
    else if (eo > .15) { g.fillStyle = INK; g.beginPath(); g.ellipse(look[0] * 3.5 * sx, look[1] * 3 + (S.droopy ? 2 : 0), 4.6 * sx, Math.min(4.6, 9 * eo), 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.fillRect(look[0] * 3.5 * sx + 1, look[1] * 3 - 3, 2, 2); }
    if (S.droopy || sq > .2) { g.fillStyle = S.skin; g.beginPath(); g.ellipse(0, -10 * eo - 4, 13 * sx, 9, 0, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.6; g.beginPath(); g.ellipse(0, -10 * eo - 4, 13 * sx, 9, 0, .1 * Math.PI, .9 * Math.PI); g.stroke(); }
    g.restore();
  };
  eye(ex - 30, ey - 2, .62); eye(ex, ey, 1);
  if (f.twitch) { g.save(); g.strokeStyle = INK; g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(ex + 14 + i * 3, ey - 18 - i * 4); g.lineTo(ex + 20 + i * 4, ey - 22 - i * 4); g.stroke(); } g.restore(); }
  // brows
  const ba = (f.brow ?? 0), by = f.browY ?? 0;
  g.save(); g.strokeStyle = S.wigStyle === 'tower' || S.wigStyle === 'judge' ? '#8a8378' : S.wigD; g.lineWidth = 5; g.lineCap = 'round';
  [[ex, 1], [ex - 30, .62]].forEach(([x, s]) => { g.save(); g.translate(x, ey - 19 - by); g.rotate(ba * DEG * (s < 1 ? -.6 : 1)); g.beginPath(); g.moveTo(-10 * s, 2); g.quadraticCurveTo(0, -3, 11 * s, 0); g.stroke(); g.restore(); });
  g.restore();
  // specs
  if (S.specs === 'round') { g.save(); g.strokeStyle = '#3a2c20'; g.lineWidth = 3; g.beginPath(); g.arc(ex, ey, 14, 0, TAU); g.stroke(); g.beginPath(); g.arc(ex - 30, ey - 2, 10, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(ex - 20, ey - 2); g.lineTo(ex - 14, ey - 1); g.stroke(); g.beginPath(); g.moveTo(ex - 40, ey - 3); g.lineTo(ex - 62, ey - 6); g.stroke(); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(ex, ey, 13, 0, TAU); g.fill(); g.restore(); }
  if (S.specs === 'pince') { g.save(); g.strokeStyle = '#3a2c20'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(ex + 2, ey + 4, 10, 8, 0, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(ex + 10, ey + 10); g.quadraticCurveTo(ex + 6, ey + 40, ex - 10, ey + 60); g.stroke(); g.restore(); }
  if (S.specs === 'half') { g.save(); g.strokeStyle = '#3a2c20'; g.lineWidth = 3; g.beginPath(); g.arc(ex + 4, ey + 6, 13, .05 * Math.PI, .95 * Math.PI); g.closePath(); g.stroke(); g.beginPath(); g.arc(ex - 26, ey + 4, 9, .05 * Math.PI, .95 * Math.PI); g.stroke(); g.restore(); }
  // mouth
  const mx = S.nose === 'long' ? 50 : S.nose === 'round' ? 52 : 46, my = -40, m = f.mouth || 'smirk', o = clamp(f.open ?? 0);
  g.save(); g.translate(mx, my); g.strokeStyle = INK; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 4;
  if (m === 'smirk') { g.beginPath(); g.moveTo(-22, -6); g.quadraticCurveTo(-6, 4, 8, -2); g.stroke(); g.beginPath(); g.moveTo(-22, -6); g.lineTo(-26, -11); g.stroke(); }
  else if (m === 'grin' || m === 'smile') {
    const k = m === 'grin' ? 1 : .55; g.fillStyle = '#5a1e1a'; g.beginPath(); g.moveTo(-26, -10 * k); g.quadraticCurveTo(-8, 10 + 6 * k + o * 8, 10, -4); g.quadraticCurveTo(-8, 0, -26, -10 * k); g.closePath(); g.fill(); g.stroke();
    if (m === 'grin') { g.fillStyle = '#fbf8f0'; g.beginPath(); g.moveTo(-22, -7); g.quadraticCurveTo(-8, 0, 7, -3); g.quadraticCurveTo(-8, 5, -22, -7); g.fill(); }
  }
  else if (m === 'o' || m === 'shout') { const r = m === 'shout' ? 13 + o * 6 : 6 + o * 6; g.fillStyle = '#4a1612'; g.beginPath(); g.ellipse(-6, 2, r * .8, r, 0, 0, TAU); g.fill(); g.stroke(); if (m === 'shout') { g.fillStyle = '#fbf8f0'; g.fillRect(-14, -r + 3, 16, 4); } }
  else if (m === 'frown') { g.beginPath(); g.moveTo(-22, 2); g.quadraticCurveTo(-8, -10, 8, 2); g.stroke(); }
  else if (m === 'flat') { g.beginPath(); g.moveTo(-20, 0); g.lineTo(6, 0); g.stroke(); }
  else if (m === 'talk') { const r = 3 + o * 9; g.fillStyle = '#4a1612'; g.beginPath(); g.ellipse(-7, 2, 12, r, 0, 0, TAU); g.fill(); g.stroke(); }
  g.restore();
  if (f.sweat) { g.save(); g.fillStyle = '#cfe6f2'; g.strokeStyle = INK; g.lineWidth = 2.5; f.sweat.forEach(([x, y, s]) => { g.beginPath(); g.moveTo(x, y - 10 * s); g.quadraticCurveTo(x + 7 * s, y, x, y + 6 * s); g.quadraticCurveTo(x - 7 * s, y, x, y - 10 * s); g.fill(); g.stroke(); }); g.restore(); }
}
// draw puppet. pose fields documented in scenes; coordinates: origin at feet, facing right (dir=-1 mirrors)
function drawPuppet(g, id, p, t = 0, res = 2) {
  const P = getPuppet(id, res), S = P.S, B = P.B;
  g.save(); g.translate(p.x || 0, p.y || 0); const sc = p.s || 1; g.scale(sc * (p.dir || 1), sc);
  if (p.rot) g.rotate(p.rot * DEG);
  const bob = p.bob || 0, hipY = -B.L + bob;
  const legN = p.legN || [4, -6], legF = p.legF || [-6, 4];
  const lw = 6.5;
  // legs
  if (S.build !== 'robe' || p.showLegs) {
    let [fx, fy, fa] = limb(g, -B.hipW * .5, hipY, legF[0], legF[1], B.L * .5, B.L * .5 - 6, lw); shoe(g, fx, fy, fa);
    [fx, fy, fa] = limb(g, B.hipW * .5, hipY, legN[0], legN[1], B.L * .5, B.L * .5 - 6, lw); shoe(g, fx, fy, fa);
  } else { shoe(g, -14, -4, 0); shoe(g, 16, -4, 0); }
  g.translate(0, hipY); g.rotate(-(p.lean || 0) * DEG);
  const nk = B.neck;
  const armF = p.armF || [-8, 6], armN = p.armN || [10, 8];
  const shF = [-B.sh * .55, -nk + 26], shN = [B.sh * .42, -nk + 30];
  // far arm
  let hf = limb(g, shF[0], shF[1], armF[0], armF[1], 84, 80, lw); hand(g, hf[0], hf[1], hf[2], S, p.propF, t);
  if (p.before) p.before(g, t);
  // wig back + torso
  g.save(); g.translate(2, -nk); g.rotate(-(p.head || 0) * DEG * .6); if (!p.noWig) drawCard(g, P.wigBack); g.restore();
  drawCard(g, P.torso);
  // head
  g.save(); g.translate(2, -nk + (p.headDy || 0)); g.rotate(-(p.head || 0) * DEG);
  drawCard(g, P.head);
  face(g, P, p.face || {}, t);
  if (S.quillEar && !p.noQuill) { g.save(); g.translate(-14, -100); g.rotate(-.5); drawQuill(g, .55); g.restore(); }
  if (!p.noWig) { g.save(); g.translate(p.wigDx || 0, p.wigDy || 0); g.rotate((p.wigRot || 0) * DEG); drawCard(g, P.wigFront); g.restore(); }
  if (p.headExtra) p.headExtra(g, t);
  g.restore();
  // near arm
  const hn = limb(g, shN[0], shN[1], armN[0], armN[1], 84, 80, lw); hand(g, hn[0], hn[1], hn[2], S, p.propN, t);
  if (p.after) p.after(g, t);
  g.restore();
}
// walk cycle pose fragment; ph in cycles
function walk(ph, amp = 1) {
  const s = Math.sin(ph * TAU), c = Math.cos(ph * TAU);
  return { legN: [26 * s * amp, -Math.max(0, -c) * 34 * amp], legF: [-26 * s * amp, -Math.max(0, c) * 34 * amp], armN: [-22 * s * amp + 6, 14], armF: [22 * s * amp - 6, 14], bob: -Math.abs(c) * 7 * amp };
}
// ---------- shared small props ----------
let QUILL = null;
function quillCard() {
  return QUILL || (QUILL = card(-30, -230, 40, 30, 4, g => {
    const vane = [[2, 10], [-6, -40], [-14, -110], [-12, -170], [-2, -214], [8, -222], [12, -180], [16, -120], [12, -50], [6, 8]];
    piece(g, vane, '#f8f4ea', { lw: 3.5, seed: 77, rough: .8, seg: 8 });
    g.save(); g.strokeStyle = 'rgba(60,40,30,.45)'; g.lineWidth = 1.4; for (let i = 0; i < 18; i++) { const y = -30 - i * 10; g.beginPath(); g.moveTo(3, y); g.lineTo(-10 + Math.sin(i) * 2, y - 8); g.stroke(); g.beginPath(); g.moveTo(5, y); g.lineTo(14, y - 7); g.stroke(); } g.restore();
    line(g, [[4, 26], [3, -200]], 2.6, '#6b5a48');
    piece(g, [[1, 14], [7, 14], [5, 30], [4, 34]], '#2a1e16', { lw: 2, seed: 78, edge: false });
  }));
}
function drawQuill(g, s = 1, b = 0) { g.save(); g.scale(s, s); drawCard(g, quillCard(), 0, 0, b); g.restore(); }
