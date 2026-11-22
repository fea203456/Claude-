// ---- scenes 3-5 ----
let FARC, MIDR, NEARR, WIGC, G1729, FGCH, RIVER;
function wigCloudCard() {
  return card(-1700, -1250, 1700, 1500, .7, g => {
    const cur = (x, y, r, c, sd) => piece(g, ell(x, y, r, r * .9, 18), c, { lw: 6, seed: sd, rough: 1.2, seg: 10, light: false });
    // side cascades
    for (let s = -1; s <= 1; s += 2) { piece(g, [[s * 620, -300], [s * 1180, -400], [s * 1260, 500], [s * 1120, 1320], [s * 720, 1300], [s * 640, 300]], '#e4ddcf', { lw: 7, seed: 1101 + s, rough: 3 });
      for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) cur(s * (760 + j * 260 + Math.sin(i) * 40), -200 + i * 190, 150, (i + j) % 2 ? '#f4efe4' : '#d6cebd', 1150 + i * 3 + j + (s + 1) * 20); }
    // crown dome
    piece(g, [...bez([-1180, -200], [-1250, -1150], [1250, -1150], [1180, -200], 24), ...bez([1180, -200], [700, -60], [-700, -60], [-1180, -200], 16)], '#efe9dc', { lw: 7, seed: 1103, rough: 3 });
    const r = rng(7);
    for (let row = 0; row < 4; row++) { const n = 9 - row * 2, yy = -260 - row * 220, ww = 1050 - row * 230; for (let i = 0; i < n; i++) cur(-ww + i * (2 * ww / (n - 1 || 1)), yy - Math.sin(i / (n - 1 || 1) * Math.PI) * 60, 160 - row * 10, (i + row) % 2 ? '#f6f1e6' : '#ddd5c5', 1180 + row * 11 + i); }
    // forehead curl rim
    for (let i = 0; i < 9; i++) cur(-640 + i * 160, -150 + Math.sin(i / 8 * Math.PI) * 70, 110, i % 2 ? '#e8e1d2' : '#f6f1e6', 1240 + i);
    // pinned debt notes
    for (let i = 0; i < 26; i++) { const x = -1150 + r() * 2300, y = -1000 + r() * 2200; if (Math.abs(x) < 600 && y > -50) continue; g.save(); g.translate(x, y); g.rotate((r() - .5) * .8); g.scale(2.6, 2.6); drawCard(g, noteCard(i)); g.fillStyle = '#b3201b'; g.beginPath(); g.arc(0, -30, 6, 0, TAU); g.fill(); g.restore(); }
  });
}
function farCityCard() {
  return card(-3200, -1900, 3200, 900, .45, g => {
    const R = houseRow(41, -3200, 3200, 800, 260, 520, {}); R.draw(g);
    // cathedral towers
    [[-420, 0], [-120, 0]].forEach(([x], i) => { piece(g, rect(x, -900, 240, 1700), '#b9ac92', { lw: 6, seed: 1200 + i }); for (let k = 0; k < 3; k++) piece(g, [[x + 40, -820 + k * 300], [x + 90, -880 + k * 300], [x + 140, -820 + k * 300], [x + 140, -650 + k * 300], [x + 40, -650 + k * 300]], '#3a3c48', { lw: 4, seed: 1210 + i * 5 + k }); });
    piece(g, rect(-180, -300, 60, 1100), '#b0a388', { lw: 5, seed: 1220 }); piece(g, [[-200, -300], [-150, -700], [-100, -300]], '#5a5f6a', { lw: 5, seed: 1221 });
    g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(150,130,175,.45)'; g.fillRect(-3300, -2000, 6600, 3000); g.restore();
  });
}
function riverCard() { return card(-3000, -60, 3000, 260, .5, g => { piece(g, rect(-3000, 0, 6000, 240), '#6f8fa8', { lw: 5, seed: 1250, tex: .5 }); g.strokeStyle = 'rgba(255,240,220,.5)'; g.lineWidth = 4; for (let i = 0; i < 40; i++) { g.beginPath(); const x = -2900 + i * 150, y = 40 + (i * 37) % 180; g.moveTo(x, y); g.lineTo(x + 60, y); g.stroke(); } for (let i = 0; i < 6; i++) piece(g, [[-700 + i * 240, 0], [-700 + i * 240, -40], [-460 + i * 240, -40], [-460 + i * 240, 0], ...ell(-580 + i * 240, 0, 90, 70, 10, 0, Math.PI).reverse()], '#c8b48e', { lw: 4, seed: 1260 + i }); }); }
function fgChimneyCard() { return card(-500, -1400, 700, 800, .9, g => { piece(g, [[-500, 800], [-500, 200], [700, -100], [700, 800]], '#6f6258', { lw: 7, seed: 1270 }); g.save(); g.strokeStyle = 'rgba(30,20,15,.35)'; g.lineWidth = 6; for (let y = 260; y < 800; y += 60) { g.beginPath(); g.moveTo(-500, y + 20); g.lineTo(700, y - 280); g.stroke(); } g.restore(); piece(g, rect(-260, -1300, 300, 1000), '#9a4c36', { lw: 7, seed: 1271 }); piece(g, rect(-300, -1340, 380, 80), '#7c3a2a', { lw: 6, seed: 1272 }); g.strokeStyle = 'rgba(40,10,5,.35)'; g.lineWidth = 4; for (let y = -1240; y < -320; y += 70) { g.beginPath(); g.moveTo(-260, y); g.lineTo(40, y); g.stroke(); } }); }
SC.push({
  id: 'S3', t0: 5.06, t1: 9.70,
  init() { FARC = farCityCard(); MIDR = rowCard(23, -2400, 2400, 800, 380, 620, .75, { lit: .25 }); NEARR = rowCard(57, -1700, 1900, 800, 420, 560, .9, { lit: .15 }); WIGC = wigCloudCard(); G1729 = glyphCards('1729', { size: 330, col: '#f3e6c8' }); RIVER = riverCard(); FGCH = fgChimneyCard(); },
  frame(lt, T) {
    const dive = E.in3(inv(4.0, 4.64, lt));
    const cam = { x: lerp(-120, 160, E.sine(clamp(lt / 4))) + dive * 380, y: keyed([[0, 650], [1.8, -260, 'out3'], [4.0, -420, 'io2'], [4.64, -150, 'in2']])(lt), z: lerp(-200, 380, E.io2(clamp(lt / 4))) + dive * 2050, zoom: 1, roll: keyed([[0, -3], [3.4, -1], [3.9, 3, 'io2'], [4.64, 7, 'in2']])(lt), f: 1500, ap: .7 };
    const coinU = clamp(lt / .95);
    const L = [
      SCR((g, T2) => { const gr = g.createLinearGradient(0, 0, 0, H); const k = cam.y; gr.addColorStop(0, '#433c6e'); gr.addColorStop(.45, '#c9705e'); gr.addColorStop(.8, '#f2bd76'); gr.addColorStop(1, '#f7d49a'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.save(); g.translate(-cam.x * .06, -cam.y * .08 + 80); [[120, 260, 520, 3], [760, 420, 620, 4], [430, 140, 380, 5], [980, 210, 300, 6]].forEach(([x, y, w, s]) => cloud(g, x, y, w, 1300 + s, 'rgba(255,226,200,.75)')); g.restore(); }, { z: 1e9 }),
      Lr(4300, g => drawCard(g, FARC), { x: 0, y: 0 }),
      Lr(3800, g => { g.save(); g.translate(0, -1650); drawCard(g, WIGC); g.restore(); }),
      Lr(3500, g => drawCard(g, RIVER), { y: 840 }),
      Lr(2600, (g, T2) => { drawCard(g, MIDR); MIDR.chs.forEach(([x, y], i) => smoke(g, x, y, T2 + i, 1300 + i, 1.2)); }),
      Lr(2100, (g, T2) => { const k = clamp((lt - 2.0) / 1.2); if (k > 0) fallingNotes(g, lt, 77, Math.round(14 * k + 4), [-1500, -1800, 3000, 2600], 1.4); else fallingNotes(g, lt, 77, 4, [-1500, -1800, 3000, 2600], 1.4); }),
      Lr(1500, (g, T2) => { drawCard(g, NEARR);
        const wt = [.63, 1.03, 1.30, 1.57]; G1729.glyphs.forEach((gl, i) => { const k = lt - wt[i]; if (k < 0) return; const s = E.outBack(clamp(k / .28), 2.2); g.save(); g.translate(cam.x * .8 - 60 + gl.x * 1.05, -60); g.scale(1 + wob(k, 3, 6) * .05, s); g.rotate(wob(k, 2, 4) * .08); drawCard(g, gl.cd, 0, 0); g.restore(); }); }, { shadow: { dx: -20, dy: 18, b: 10, a: .3 } }),
      coinU < 1 ? Lr(lerp(700, 3820, E.out3(coinU)), g => { g.save(); g.translate(lerp(-100, 380, coinU), lerp(900, -1500, E.out2(coinU))); g.scale(Math.cos(lt * 16) * 1.6, 1.6); drawCard(g, coinCard(0)); g.restore(); }) : Lr(3790, g => { g.save(); g.translate(380, -1500 + wob(lt - .95, 3, 6) * 30); g.scale(1.6, 1.6); drawCard(g, coinCard(0)); g.restore(); }),
      Lr(560, g => drawCard(g, FGCH), { x: -1050, y: 1150 }),
      SCR((g, T2) => { rays(g, 900, -80, 25, 1900, 120, 700, .13, 4, T2); }),
    ];
    return { cam, layers: L, bg: '#c9705e', post: { vig: .45, tint: '#ffb070', tintA: .2 } };
  }
});
// ===== S4 — the minister, an empty chest, a candle-idea on his wig =====
let OFFW, SHELF, NOTICE, NAMEM, DESK4, WIN4, WFRAME;
SC.push({
  id: 'S4', t0: 9.70, t1: 11.84,
  init() {
    OFFW = panelWall(-1800, -1600, 1800, 900, { upper: '#6f7f6a', dado: 250 }); SHELF = bookshelfCard(700, 1300, 1400); DESK4 = deskCard(900, 420, {});
    WIN4 = windowCard(420, 760, { sky0: '#8fb3cf', sky1: '#d9e6ea' });
    NOTICE = textPlate('КАЗНА:\nПЕРЕУЧЁТ ДОЛГОВ', { size: 80, font: '700 80px "Old Standard"', col: '#3a1f12', bg: '#efe3c4', seed: 41 });
    NAMEM = textPlate('Ле Пелетье-Дефор\nминистр финансов', { size: 66, font: '700 66px "Old Standard"', col: '#2a1a10', bg: '#f4ead2', seed: 43, lh: 1.15 });
    WFRAME = card(-1400, -1800, 1400, 1800, .6, g => { const P = new Path2D(); rect(-1400, -1800, 2800, 3600).forEach((p, i) => i ? P.lineTo(...p) : P.moveTo(...p)); P.closePath(); const h = cut(rect(-520, -820, 1040, 1500), 1, 1450); P.addPath(h); g.fillStyle = '#d8c7a6'; g.fill(P, 'evenodd'); g.lineWidth = 8; g.strokeStyle = INK; g.stroke(h); g.strokeStyle = '#e9dcbf'; g.lineWidth = 34; g.beginPath(); g.moveTo(0, -820); g.lineTo(0, 680); g.moveTo(-520, -70); g.lineTo(520, -70); g.stroke(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke(); });
  },
  frame(lt, T) {
    const idea = 1.42, whip = E.in3(inv(1.86, 2.14, lt));
    const cam = { x: keyed([[0, -60], [1.3, 40, 'io2'], [1.86, 60]])(lt) + whip * 1500, y: keyed([[0, -100], [1.3, -180], [1.6, -330, 'out3']])(lt), z: keyed([[0, -380], [.45, 0, 'out3'], [1.3, 60], [1.55, 380, 'out3'], [2.14, 400]])(lt), zoom: 1, roll: lerp(-2, 1, lt / 2) + whip * 6, f: 1250, ap: .55 };
    const shakeCh = lt < idea - .1 ? Math.sin(lt * 34) * 5 * clamp(lt / .2) : wob(lt - idea + .1, 3, 6) * 4;
    const mothU = clamp((lt - .25) / 1.0);
    const L = [
      Lr(2000, g => drawCard(g, OFFW)),
      Lr(1960, g => { g.save(); g.translate(-700, 250); drawCard(g, WIN4); g.restore(); g.save(); g.translate(620, 250); drawCard(g, SHELF); g.restore(); g.save(); g.translate(-60, -520); g.rotate(-.05); drawCard(g, NOTICE); g.restore(); }),
      Lr(1600, g => { g.save(); g.translate(560, 760); drawCard(g, DESK4); g.restore(); for (let i = 0; i < 6; i++) { g.save(); g.translate(420 + (i % 2) * 10, 330 - i * 34); piece(g, rect(-110, -16, 220, 32), ['#6a2a22', '#2a4a3a', '#5a3a20'][i % 3], { lw: 3.5, seed: 1470 + i, light: false }); g.restore(); } }),
      Lr(1250, (g, T2) => {
        const pre = lt < idea; const face = pre ? { mouth: 'o', open: .5 + .3 * Math.sin(lt * 20), look: [.6, .5], brow: 14, browY: 4, sweat: [[66, -120, 1.1], [-30, -128, .9]] } : { mouth: 'grin', wide: true, look: [1, -.4], brow: -12, browY: 8 };
        drawPuppet(g, 'M', { x: -90, y: 760, s: 2.05, lean: pre ? 8 : -4 + wob(lt - idea, 3, 5) * 6, head: pre ? -6 : 8, armN: [70, 30], armF: [80, 20], face,
          headExtra: (gg) => { // the candle-idea on top of the tower wig
            const k = lt - idea; if (k < -.05) return; gg.save(); gg.translate(4, -330); const s = E.outBack(clamp(k / .25), 2.6); gg.scale(.55 * s, .55 * s); drawCandle(gg, T2, { glow: 1 + 2 * Math.exp(-k * 4) }); gg.restore(); },
          before: () => {} }, T2);
      }, { shadow: { dx: 30, dy: 26, b: 16, a: .3 } }),
      Lr(1200, g => { g.save(); g.translate(150, 790); g.scale(1.15, 1.15); g.rotate(shakeCh * DEG); drawCard(g, chestCard()); g.restore(); }),
      Lr(1230, g => { const k = clamp((lt - .3) / .25); if (k <= 0) return; g.save(); g.translate(300, -700); g.scale(E.outBack(k), E.outBack(k)); g.rotate(.05); drawCard(g, NAMEM); g.restore(); }),
      mothU > 0 && mothU < 1 ? Lr(lerp(1150, 170, E.in2(mothU)), (g, T2) => { g.save(); g.translate(lerp(40, 260, mothU) + Math.sin(lt * 9) * 40, lerp(560, -140, mothU) + Math.sin(lt * 13) * 30); const f = Math.abs(Math.sin(lt * 38)); g.fillStyle = '#9a8a72'; g.strokeStyle = INK; g.lineWidth = 3; [-1, 1].forEach(sd => { g.save(); g.scale(sd, .3 + f * .7); g.beginPath(); g.ellipse(24, -6, 26, 16, -.3, 0, TAU); g.fill(); g.stroke(); g.restore(); }); g.fillStyle = '#5a4a3a'; g.beginPath(); g.ellipse(0, 0, 6, 16, 0, 0, TAU); g.fill(); g.restore(); }) : null,
      lt < .5 ? Lr(260, g => drawCard(g, WFRAME), { alpha: 1 - E.in2(clamp(lt / .5)) }) : null,
      SCR((g, T2) => { rays(g, 140, 300, -28, 1500, 200, 700, .14, 3, T2, '200,225,255'); dust(g, T2, 5, 50, [0, 200, W, 1300], '230,240,255', .45); }),
    ];
    return { cam, layers: L, bg: '#3a3a30', post: { vig: .55, tint: '#ffd9a0', tintA: .15 } };
  }
});
// ===== S5 — the lottery stage, the banner, the fine print =====
let SQ, STAGE, BANNER, BUNT;
function drumDraw(g, a, t) {
  g.save(); piece(g, [[-30, 0], [-120, 330], [-90, 330], [0, 40], [90, 330], [120, 330], [30, 0]], '#6a4024', { lw: 5, seed: 1500 }); g.restore();
  g.save(); g.rotate(a);
  const R = 230; const hex = []; for (let i = 0; i < 6; i++) hex.push([Math.cos(i / 6 * TAU) * R, Math.sin(i / 6 * TAU) * R]);
  piece(g, hex, 'rgba(120,80,40,.25)', { lw: 0, edge: false, tex: 0, light: false });
  const r = rng(3); for (let i = 0; i < 26; i++) { const ang = r() * TAU, rr = r() * 170; const bx = Math.cos(ang) * rr, by = Math.sin(ang) * rr; g.save(); g.rotate(-a); const fall = ((t * .8 + i * .37) % 1); g.translate(bx * .9, by * .6 + 40 * Math.sin(fall * TAU)); g.rotate(r() * 6 + t * 2); g.fillStyle = r() < .5 ? '#f1e6c9' : '#e6d3a6'; g.strokeStyle = INK; g.lineWidth = 2; g.fillRect(-18, -10, 36, 20); g.strokeRect(-18, -10, 36, 20); g.restore(); }
  g.lineWidth = 14; g.strokeStyle = '#8a5a2e'; g.lineJoin = 'round'; g.beginPath(); hex.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.stroke(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
  for (let i = 0; i < 6; i++) { g.lineWidth = 8; g.strokeStyle = '#8a5a2e'; g.beginPath(); g.moveTo(0, 0); g.lineTo(...hex[i]); g.stroke(); }
  piece(g, ell(0, 0, 34, 34, 16), '#d8a944', { lw: 4, seed: 1510 });
  g.restore();
  // crank handle
  g.save(); g.lineWidth = 10; g.strokeStyle = '#5a3a20'; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 120, Math.sin(a) * 120); g.stroke(); piece(g, ell(Math.cos(a) * 120, Math.sin(a) * 120, 16, 16, 10), '#7a4a26', { lw: 3.5, seed: 1511 }); g.restore();
}
function bannerCard() {
  return card(-1050, -320, 1050, 330, 1.2, g => {
    piece(g, [[-1000, -270], [1000, -270], [960, 0], [1000, 270], [-1000, 270], [-960, 0]], '#efe2c2', { lw: 7, seed: 1520, rough: 1.6 });
    piece(g, [[-1000, -270], [1000, -270], [990, -220], [-990, -220]], '#a5232d', { lw: 4, seed: 1521 }); piece(g, [[-1000, 220], [1000, 220], [1000, 270], [-1000, 270]], '#a5232d', { lw: 4, seed: 1522 });
    g.textAlign = 'center'; g.fillStyle = '#2a1a10'; g.font = '700 70px "Old Standard"'; g.fillText('LOTERIE ROYALE', 0, -140);
    g.font = '900 112px "Playfair Display"'; g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = '#2a1a10'; g.fillStyle = '#a5232d'; g.strokeText('ВЫИГРАЙ СВОИ', 0, -10); g.fillText('ВЫИГРАЙ СВОИ', 0, -10); g.strokeText('ЖЕ ДЕНЬГИ!*', 0, 110); g.fillText('ЖЕ ДЕНЬГИ!*', 0, 110);
    g.font = 'italic 30px "Old Standard"'; g.fillStyle = '#2a1a10'; g.textAlign = 'left'; g.fillText('*и 500 000 ливров сверху', 540, 197);
  });
}
const FINE = [740, 188];
SC.push({
  id: 'S5', t0: 11.84, t1: 16.56,
  init() { SQ = rowCard(77, -2600, 2600, 900, 520, 820, .7, { door: true }); BANNER = bannerCard();
    STAGE = card(-1000, -60, 1000, 420, 1, g => { piece(g, rect(-980, 0, 1960, 380), '#7a4a28', { lw: 6, seed: 1530 }); g.strokeStyle = 'rgba(30,15,5,.4)'; g.lineWidth = 4; for (let x = -900; x < 1000; x += 120) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 380); g.stroke(); } piece(g, rect(-1000, -40, 2000, 50), '#8c5a32', { lw: 5, seed: 1531 }); for (let i = 0; i < 10; i++) piece(g, [[-1000 + i * 200, 10], [-800 + i * 200, 10], [-900 + i * 200, 150]], i % 2 ? '#a5232d' : '#2d4c8e', { lw: 4, seed: 1540 + i }); });
    BUNT = card(-1600, -100, 1600, 200, 1, g => { line(g, bez([-1600, 0], [-800, 120], [800, 120], [1600, 0], 30), 4); for (let i = 0; i < 22; i++) { const u = i / 21, x = -1500 + u * 3000, y = 3 * (1 - u) * u * 120 * 2 + 4; piece(g, [[x - 40, y], [x + 40, y], [x, y + 90]], ['#a5232d', '#efe2c2', '#2d4c8e'][i % 3], { lw: 4, seed: 1560 + i }); } });
  },
  frame(lt, T) {
    const arrive = E.out3(clamp(lt / .32)), fine = E.in3(inv(3.85, 4.72, lt));
    const bannerZ = 1700, bx = 0, by = -620;
    const orb = E.sine(clamp((lt - .3) / 3.3)), FX = bx + FINE[0] - 60, FY = by + FINE[1];
    const cam = { x: lerp(lerp(-1700, 0, arrive) + orb * 260, FX, E.io2(fine)), y: lerp(lerp(-140, -260, clamp(lt / 3.5)), FY, E.io2(fine)), z: keyed([[0, 0], [3.7, 160], [3.85, 170]])(lt) * (1 - fine) + fine * (bannerZ - 140), zoom: 1, roll: lerp(lerp(2, -2, clamp(lt / 3.6)), 4, fine), f: lerp(1450, bannerZ, fine), ap: .55, px: -orb * 130 * (1 - fine) };
    const ang = lt * 3.2;
    const tk = clamp((lt - 1.97) / .5);
    const L = [
      SCR((g) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#9cc0d8'); gr.addColorStop(1, '#f3dcb0'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }, { z: 1e9 }),
      Lr(3200, g => drawCard(g, SQ)),
      Lr(2000, g => { g.save(); g.translate(0, -1200); drawCard(g, BUNT); g.restore(); }),
      Lr(bannerZ, (g) => { g.save(); g.translate(bx, by); g.rotate(Math.sin(lt * 1.3) * .012); drawCard(g, BANNER); g.restore(); line(g, [[-1000, by - 270], [-1100, -1500]], 4); line(g, [[1000, by - 270], [1100, -1500]], 4); }),
      Lr(1600, (g, T2) => { g.save(); g.translate(0, 560); drawCard(g, STAGE); g.restore(); g.save(); g.translate(120, 230); drawDrum(g, ang, T2); g.restore(); }),
      Lr(1580, (g, T2) => { const c = Math.cos(ang), s = Math.sin(ang); drawPuppet(g, 'M', { x: -260, y: 560, s: 1.5, lean: -4 + s * 3, head: 6, armN: [100 + s * 30, 20 + c * 20], armF: [90 + s * 30, 30], face: { mouth: lt > 3.9 ? 'grin' : 'smile', look: [1, 0], brow: -6 } }, T2); }, { shadow: { dx: 24, dy: 20, b: 14, a: .3 } }),
      Lr(1250, (g, T2) => { const ids = ['R', 'P', 'C', 'B', 'N']; ids.forEach((id, i) => { const bobq = Math.sin(step12(lt) * 3 + i) * 3; drawPuppet(g, id, { x: 520 + i * 230, y: 860 + (i % 2) * 20, s: 1.45, dir: -1, lean: 3, head: i === 0 && tk > 0 ? 8 : 0, bob: bobq, armN: [60, 40], armF: [20, 10], face: { mouth: i === 0 && tk > 0 ? 'grin' : ['smile', 'flat', 'smirk', 'o', 'flat'][i], look: [1, -.3] }, propN: (gg) => { gg.save(); gg.translate(0, 10); gg.rotate(.4); piece(gg, rect(-30, -50, 60, 80), '#efe3c4', { lw: 3, seed: 1580 + i }); gg.restore(); } }, T2); });
        if (tk > 0 && tk < 1) { g.save(); g.translate(lerp(120, 470, tk), lerp(230, 380, tk) - Math.sin(tk * Math.PI) * 300); g.rotate(tk * 8); g.fillStyle = '#f2e7cb'; g.strokeStyle = INK; g.lineWidth = 3; g.fillRect(-26, -16, 52, 32); g.strokeRect(-26, -16, 52, 32); g.restore(); } }, { shadow: { dx: 20, dy: 20, b: 14, a: .28 } }),
      Lr(760, (g) => { const r = rng(9); for (let i = 0; i < 9; i++) { const x = -1100 + i * 280 + r() * 60, y = 900 + r() * 80, s = 1.4 + r() * .3; g.save(); g.translate(x, y); g.scale(s, s); piece(g, ell(0, 0, 90, 100, 16), ['#2a2220', '#3a2c26', '#e8e2d6', '#4a3a30'][i % 4], { lw: 5, seed: 1600 + i }); if (i % 3 === 0) piece(g, [[-120, -40], [-30, -110], [80, -100], [130, -40], [0, -60]], '#1d1716', { lw: 4, seed: 1610 + i }); g.restore(); } }),
      SCR((g, T2) => { rays(g, 1000, -50, 30, 1800, 140, 600, .12, 3, T2); }),
    ];
    return { cam, layers: L, bg: '#9cc0d8', post: { vig: .4 } };
  }
});
function drawDrum(g, a, t) { drumDraw(g, a, t); }
