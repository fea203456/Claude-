// ---- props & set pieces (cards are built lazily and memoized) ----
const MEMO = {}; const memo = (k, f) => MEMO[k] || (MEMO[k] = f());
const INKBR = '#4a2814', GOLD = '#e2b13c', GOLDD = '#a8781c';
function coinCard(v = 0) {
  return memo('coin' + v, () => card(-64, -64, 64, 64, 3, g => {
    piece(g, ell(0, 0, 58, 58, 40), GOLD, { lw: 5, seed: 300 + v, rough: .5, seg: 8 });
    piece(g, ell(0, 0, 44, 44, 34), '#eec558', { lw: 3, seed: 310 + v, rough: .4, edge: false, light: false });
    g.save(); g.strokeStyle = GOLDD; g.lineWidth = 3.5; g.lineCap = 'round';
    if (v % 2 === 0) { // fleur-de-lis
      g.beginPath(); g.moveTo(0, 22); g.lineTo(0, -26); g.stroke(); g.beginPath(); g.moveTo(0, -26); g.quadraticCurveTo(-10, -10, 0, 0); g.quadraticCurveTo(10, -10, 0, -26); g.stroke();
      g.beginPath(); g.moveTo(-2, 0); g.quadraticCurveTo(-24, -6, -20, -22); g.quadraticCurveTo(-8, -14, -4, 4); g.stroke(); g.beginPath(); g.moveTo(2, 0); g.quadraticCurveTo(24, -6, 20, -22); g.quadraticCurveTo(8, -14, 4, 4); g.stroke(); g.beginPath(); g.moveTo(-14, 8); g.lineTo(14, 8); g.stroke();
    } else { g.beginPath(); g.arc(4, -4, 16, .6, 5.2); g.stroke(); g.beginPath(); g.moveTo(16, -8); g.lineTo(26, -2); g.lineTo(16, 2); g.stroke(); g.beginPath(); g.moveTo(-6, 12); g.quadraticCurveTo(0, 26, 12, 22); g.stroke(); }
    for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 50, Math.sin(a) * 50); g.lineTo(Math.cos(a) * 55, Math.sin(a) * 55); g.stroke(); }
    g.restore();
  }));
}
function sackCard(v = 0, label = true) {
  return memo('sack' + v + label, () => card(-110, -150, 110, 120, 2.5, g => {
    const body = [...bez([-30, -96], [-110, -60], [-120, 90], [-20, 108], 12), ...bez([-20, 108], [80, 116], [120, 30], [32, -96], 12)];
    piece(g, body, v % 2 ? '#c49a62' : '#b98d55', { lw: 5.5, seed: 400 + v });
    piece(g, [[-34, -96], [-48, -134], [-20, -120], [0, -142], [20, -120], [46, -136], [34, -96]], '#a77c47', { lw: 4.5, seed: 410 + v });
    piece(g, [[-38, -104], [38, -104], [36, -90], [-36, -88]], '#7a5a32', { lw: 3.5, seed: 420 + v });
    g.save(); g.strokeStyle = 'rgba(70,40,15,.45)'; g.lineWidth = 2.5; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-60 + i * 30, -70); g.quadraticCurveTo(-70 + i * 34, 20, -66 + i * 32, 96); g.stroke(); } g.restore();
    if (label) { g.save(); g.font = 'italic 64px "IM Fell"'; g.fillStyle = '#3a2412'; g.textAlign = 'center'; g.fillText('₶', 0, 40); g.font = 'italic 46px "IM Fell"'; g.fillText('L', 0, 36); g.restore(); }
  }));
}
function drawCandle(g, t, o = {}) { // origin at candle base; draws holder, candle, live flame + glow
  const c = memo('candle', () => card(-70, -260, 70, 20, 2.5, gg => {
    piece(gg, [[-60, 0], [60, 0], [44, -16], [-44, -16]], '#b8893a', { lw: 4, seed: 501 });
    piece(gg, [[-12, -16], [12, -16], [16, -60], [-16, -60]], '#c99a44', { lw: 4, seed: 502 });
    piece(gg, ell(0, -64, 34, 10, 20), '#d8a94e', { lw: 4, seed: 503 });
    piece(gg, [[-18, -70], [18, -70], [17, -210], [-17, -214]], '#f2e6c8', { lw: 4, seed: 504 });
    piece(gg, [[-17, -208], [-8, -200], [-4, -186], [4, -206], [17, -210], [10, -216], [-10, -216]], '#f8efd9', { lw: 3, seed: 505 });
    line(gg, [[0, -214], [0, -226]], 3, '#2a1d14');
  }));
  drawCard(g, c);
  if (o.out) return;
  const fl = 1 + noise1(t * 9) * .08 + noise1(t * 23 + 3) * .05, sw = noise1(t * 5 + 1) * 4;
  g.save(); g.translate(0, -226);
  g.globalCompositeOperation = 'lighter';
  const gl = g.createRadialGradient(0, -20, 4, 0, -20, 220 * (o.glow || 1)); gl.addColorStop(0, 'rgba(255,190,90,.55)'); gl.addColorStop(.3, 'rgba(255,150,60,.18)'); gl.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = gl; g.fillRect(-240, -260, 480, 480);
  g.globalCompositeOperation = 'source-over';
  g.beginPath(); g.moveTo(0, 6); g.quadraticCurveTo(-15 * fl, -10, sw, -54 * fl); g.quadraticCurveTo(15 * fl, -10, 0, 6); g.closePath();
  const fg = g.createLinearGradient(0, 6, 0, -54); fg.addColorStop(0, '#fff6c8'); fg.addColorStop(.5, '#ffc44a'); fg.addColorStop(1, '#ff7a1a'); g.fillStyle = fg; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
  g.restore();
}
function chestCard() {
  return memo('chest', () => card(-200, -260, 200, 20, 2, g => {
    piece(g, [[-170, -180], [-150, -250], [150, -250], [170, -180]], '#6a3f22', { lw: 5, seed: 601 }); // open lid (back)
    piece(g, [[-160, -190], [160, -190], [150, -150], [-150, -150]], '#2a1a10', { lw: 4, seed: 602 }); // dark empty inside
    piece(g, [[-180, -160], [180, -160], [176, 0], [-176, 0]], '#7a4a28', { lw: 5.5, seed: 603 });
    [[-150, -160, -146, 0], [146, -160, 150, 0]].forEach(([a, b, c, d], i) => piece(g, [[a - 10, b], [a + 14, b], [c + 14, d], [c - 10, d]], '#5b5552', { lw: 3.5, seed: 610 + i }));
    piece(g, [[-180, -110], [180, -110], [180, -88], [-180, -88]], '#5b5552', { lw: 3.5, seed: 615 });
    piece(g, [[-22, -110], [22, -110], [20, -60], [-20, -60]], '#c8a24a', { lw: 3.5, seed: 616 }); g.fillStyle = INK; g.beginPath(); g.arc(0, -86, 6, 0, TAU); g.fill();
    g.save(); g.strokeStyle = 'rgba(240,240,240,.7)'; g.lineWidth = 1.5; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-150, -190); g.lineTo(-150 + i * 18, -150); g.stroke(); } for (let r = 1; r < 4; r++) { g.beginPath(); g.moveTo(-150, -190 + r * 10); for (let i = 0; i < 6; i++) g.lineTo(-150 + i * 18 * r / 3.5, -190 + r * 10 + (i % 2) * 3); g.stroke(); } g.restore();
  }));
}
// light rays (screen space), dust motes, bokeh
function rays(g, x, y, ang, len, w0, w1, a, n = 4, t = 0, col = '255,214,150') {
  g.save(); g.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * w1 * .9, al = a * (.6 + .4 * Math.sin(t * .7 + i * 2.1)) * (i % 2 ? .7 : 1);
    g.save(); g.translate(x, y); g.rotate(ang * DEG);
    const gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, `rgba(${col},${al})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(off * .2 - w0 / 2, 0); g.lineTo(off * .2 + w0 / 2, 0); g.lineTo(off + w1 / 2, len); g.lineTo(off - w1 / 2, len); g.closePath(); g.fill(); g.restore();
  }
  g.restore();
}
function dust(g, t, seed, n, box, col = '255,230,180', a = .5) {
  const r = rng(seed); g.save(); g.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) { const x0 = r(), y0 = r(), sp = .02 + r() * .05, sz = 1 + r() * 3.2, ph = r() * 10;
    const x = box[0] + ((x0 + Math.sin(t * .4 + ph) * .03) % 1) * box[2], y = box[1] + ((y0 + t * sp) % 1) * box[3];
    g.fillStyle = `rgba(${col},${a * (.4 + .6 * Math.abs(Math.sin(t * 1.3 + ph)))})`; g.beginPath(); g.arc(x, y, sz, 0, TAU); g.fill(); }
  g.restore();
}
function bokeh(g, pts, t) { g.save(); g.globalCompositeOperation = 'screen'; pts.forEach(([x, y, r, a, col]) => { const k = 1 + .06 * Math.sin(t * 2 + x); const gr = g.createRadialGradient(x, y, 0, x, y, r * k); gr.addColorStop(0, `rgba(${col || '255,190,110'},${a})`); gr.addColorStop(.7, `rgba(${col || '255,190,110'},${a * .8})`); gr.addColorStop(1, `rgba(${col || '255,190,110'},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * k, 0, TAU); g.fill(); }); g.restore(); }
// ---- the ledger page (S1 & S16) ----
const LEDGER_TARGET = [70, -30];
function ledgerCard() {
  return memo('ledger', () => card(-760, -1320, 760, 1320, 1.6, g => {
    piece(g, rect(-740, -1300, 1480, 2600), '#ead9b2', { lw: 0, edge: false, rough: 2.5, tex: .7, seg: 30, bb: [-740, -1300, 740, 1300] });
    // stains
    const r = rng(5); for (let i = 0; i < 9; i++) { const x = -700 + r() * 1400, y = -1250 + r() * 2500, rr = 60 + r() * 160; const gr = g.createRadialGradient(x, y, rr * .5, x, y, rr); gr.addColorStop(0, 'rgba(150,100,40,0)'); gr.addColorStop(.85, 'rgba(150,100,40,.10)'); gr.addColorStop(1, 'rgba(150,100,40,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    g.strokeStyle = 'rgba(120,80,50,.28)'; g.lineWidth = 2; for (let y = -1240; y < 1280; y += 74) { g.beginPath(); g.moveTo(-720, y); g.lineTo(720, y); g.stroke(); }
    g.strokeStyle = 'rgba(170,40,30,.45)'; g.lineWidth = 3; [-520, 300, 330].forEach(x => { g.beginPath(); g.moveTo(x, -1290); g.lineTo(x, 1290); g.stroke(); });
    g.fillStyle = INKBR; g.textBaseline = 'alphabetic';
    g.font = 'italic 64px "IM Fell"'; g.fillText('Loterie Royale — Comptes', -500, -1110);
    const rows = [['Rentes de la Ville', '12 400 000'], ['Billets vendus', '84 213'], ['Lot du mois', '500 000'], ['Rente minimale', '1 000'], ['Remboursement', '1 000 000'], ['Total des billets', '...'], ['Fonds du Trésor', '0']];
    const r2 = rng(17);
    for (let i = -14; i < 16; i++) {
      const y = i * 74 + 26 - 10; if (y < -1060) continue;
      const row = rows[(i + 30) % rows.length];
      g.font = `italic ${40 + (r2() * 6 | 0)}px "IM Fell"`; g.globalAlpha = .82 + r2() * .18;
      if (i === 0) { g.font = 'italic 58px "IM Fell"'; g.globalAlpha = 1; g.fillText('Prix du billet =', -500, LEDGER_TARGET[1] + 18); g.font = 'italic 78px "IM Fell"'; g.fillText('1/1000', LEDGER_TARGET[0] - 105, LEDGER_TARGET[1] + 22); continue; }
      g.fillText(row[0], -500, y); g.textAlign = 'right'; g.fillText(row[1] + (r2() < .3 ? ' ₶' : ''), 280, y); g.fillText(((r2() * 9000) | 0) + '', 700, y); g.textAlign = 'left';
    }
    g.globalAlpha = 1;
    // ink blot
    g.fillStyle = 'rgba(40,20,10,.85)'; g.beginPath(); for (let i = 0; i <= 20; i++) { const a = i / 20 * TAU, rr = 26 + Math.sin(i * 3.1) * 9 + (i % 3) * 4; g.lineTo(420 + Math.cos(a) * rr, 620 + Math.sin(a) * rr); } g.fill();
    // curled page edge shadow (left)
    const gr = g.createLinearGradient(-740, 0, -600, 0); gr.addColorStop(0, 'rgba(60,30,10,.45)'); gr.addColorStop(1, 'rgba(60,30,10,0)'); g.fillStyle = gr; g.fillRect(-740, -1300, 140, 2600);
  }));
}
// red ink circle drawn progressively around the target
function inkCircle(g, prog, seed = 3) {
  if (prog <= 0) return; const [cx, cy] = LEDGER_TARGET; const n = 80, k = Math.floor(n * clamp(prog));
  g.save(); g.strokeStyle = '#b3201b'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) { g.lineWidth = pass ? 4 : 9; g.globalAlpha = pass ? .5 : .9; g.beginPath();
    for (let i = 0; i <= k; i++) { const a = -2.4 + i / n * TAU * 1.12, rr = 1 + Math.sin(i * .2 + seed) * .03; const x = cx + Math.cos(a) * 190 * rr, y = cy + Math.sin(a) * 86 * rr + i * .25; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke(); }
  g.restore();
}
function circlePoint(prog) { const [cx, cy] = LEDGER_TARGET, n = 80, i = n * clamp(prog), a = -2.4 + i / n * TAU * 1.12; return [cx + Math.cos(a) * 190, cy + Math.sin(a) * 86 + i * .25]; }
