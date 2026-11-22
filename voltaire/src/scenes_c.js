// ---- scenes 6-10 ----
const tag = memoTag = (txt, sz = 46) => memo('tag' + txt + sz, () => textPlate(txt, { size: sz, font: `700 ${sz}px "Old Standard"`, col: '#2a1a10', bg: '#f4ead2', seed: txt.length * 7, lh: 1.12 }));
function popTag(g, txt, lt, t0, x, y, sz = 46, rot = -.05) { const k = lt - t0; if (k < 0) return; const s = E.outBack(clamp(k / .22), 2.2); g.save(); g.translate(x, y); g.rotate(rot + wob(k, 2.5, 5) * .1); g.scale(s, s); line(g, [[0, -40], [0, -140]], 3, '#5a4030'); drawCard(g, tag(txt, sz)); g.restore(); }
function bondCard() {
  return memo('bond', () => card(-460, -320, 460, 320, 1.4, g => {
    piece(g, rect(-440, -300, 880, 600), '#efe5c9', { lw: 6, seed: 1700, rough: 1.2 });
    g.strokeStyle = '#7a5a2a'; g.lineWidth = 5; g.strokeRect(-405, -265, 810, 530); g.lineWidth = 2; g.strokeRect(-390, -250, 780, 500);
    g.save(); g.strokeStyle = 'rgba(122,90,42,.6)'; g.lineWidth = 2; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; g.beginPath(); g.ellipse(-300, -170, 50, 30, a, 0, Math.PI); g.stroke(); g.beginPath(); g.ellipse(300, -170, 50, 30, a, 0, Math.PI); g.stroke(); } g.restore();
    g.fillStyle = '#3a2412'; g.textAlign = 'center'; g.font = '700 38px "Old Standard"'; g.fillText('RENTE SUR L\'HÔTEL DE VILLE', 0, -150); g.font = 'italic 30px "IM Fell"'; g.fillText('de la bonne Ville de Paris', 0, -105);
    g.font = '900 96px "Playfair Display"'; g.fillText('1000 ₶', 0, 30); g.font = 'italic 26px "IM Fell"'; g.fillText('Payable au porteur · l\'an 1729', 0, 90);
    piece(g, ell(300, 170, 62, 58, 22), '#a8231d', { lw: 4, seed: 1701, rough: 2 }); g.fillStyle = '#7a140f'; g.beginPath(); g.arc(300, 170, 36, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(58,36,18,.7)'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-340, 150 + i * 30); g.lineTo(140, 150 + i * 30); g.stroke(); }
  }));
}
function scissorsDraw(g, open) {
  g.save(); g.rotate(-.3);
  [-1, 1].forEach(sd => { g.save(); g.rotate(sd * open * .35); piece(g, [[0, -6], [300, -4 * sd], [330, 0], [300, 6 * sd], [0, 8]], '#d8dde2', { lw: 4, seed: 1710 + sd }); g.restore(); });
  [-1, 1].forEach(sd => { g.save(); g.rotate(-sd * open * .35); piece(g, ell(-110, sd * 36, 50, 34, 18), '#c8a24a', { lw: 5, seed: 1720 + sd }); g.fillStyle = '#2a4a2a'; g.beginPath(); g.ellipse(-110, sd * 36, 30, 18, 0, 0, TAU); g.fill(); line(g, [[-70, sd * 20], [0, 0]], 12, '#c8a24a'); g.restore(); });
  piece(g, ell(0, 0, 12, 12, 10), '#8a8f94', { lw: 3, seed: 1730 });
  g.restore();
}
function tinyTicket(g, s = 1, v = 0) { g.save(); g.scale(s, s); g.fillStyle = v % 2 ? '#f2e7cb' : '#e8d6aa'; g.strokeStyle = INK; g.lineWidth = 2.4; g.fillRect(-18, -11, 36, 22); g.strokeRect(-18, -11, 36, 22); g.fillStyle = '#a5232d'; g.fillRect(-14, -7, 6, 14); g.restore(); }
function burst(g, k, x, y, n, seed, sp = 700, s = 1.3) { if (k < 0 || k > 2) return; const r = rng(seed); for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (r() - .5) * 2.4, v = sp * (.4 + r() * .8); const px = x + Math.cos(a) * v * k, py = y + Math.sin(a) * v * k + 900 * k * k * .5 * (.3 + r() * .4); g.save(); g.translate(px, py); g.rotate(k * (r() - .5) * 20); g.scale(1, Math.abs(Math.cos(k * 9 + i))); tinyTicket(g, s, i); g.restore(); } }
let FELT, PLATE1000, PRIZE;
SC.push({
  id: 'S6', t0: 16.56, t1: 21.16,
  init() { FELT = card(-1700, -760, 1700, 1400, .6, g => { piece(g, rect(-1700, -720, 3400, 2100), '#2f5a3c', { lw: 6, seed: 1739, tex: .8 }); piece(g, rect(-1700, -760, 3400, 60), '#6b4024', { lw: 6, seed: 1740 }); const gr = g.createLinearGradient(0, -700, 0, -300); gr.addColorStop(0, 'rgba(10,20,10,.45)'); gr.addColorStop(1, 'rgba(10,20,10,0)'); g.fillStyle = gr; g.fillRect(-1700, -700, 3400, 400); }); PLATE1000 = textPlate('1/1000', { size: 150, col: '#a5232d', bg: '#f3e8cc', stamp: true, seed: 51 }); PRIZE = textPlate('ПРИЗ', { size: 60, col: '#2a1a10', bg: '#f1d98a', seed: 52 }); },
  frame(lt, T) {
    const rack = E.io2(inv(2.6, 3.4, lt)), out = E.in2(inv(4.2, 4.6, lt));
    const cam = { x: lerp(-40, 0, rack), y: keyed([[0, 40], [2.6, -20], [3.4, 120, 'io2'], [4.6, 60]])(lt), z: keyed([[0, 560], [.7, 80, 'out3'], [2.6, 0], [3.4, 480, 'io2'], [4.6, 560]])(lt), zoom: 1, roll: lerp(-4, 1, clamp(lt / 3)), f: lerp(780, 1700, rack), ap: .7 };
    const snips = [.56, .87, 1.17];
    const open = snips.reduce((o, t0) => { const k = lt - t0; return k > -.12 && k < .1 ? (k < 0 ? E.out2((k + .12) / .12) : 1 - E.in2(k / .1)) : o; }, .15);
    const st = slam(lt, 1.12, { r0: -10, r1: -4, s0: 2.4 });
    const L = [
      Lr(1800, (g, T2) => { // the rich and the poor under one prize
        g.save(); g.fillStyle = '#4a3020'; g.fillRect(-1600, -1600, 3200, 2600); g.restore();
        drawCard(g, memo('salonW6', () => panelWall(-1600, -1600, 1600, 900, { upper: '#5b4a6a', lower: '#4a3020', dado: 300 })));
        const sw = Math.sin(lt * 2.2) * .05 + wob(lt - 3.41, 2, 3) * .12;
        g.save(); g.translate(0, -900); g.rotate(sw); line(g, [[0, 0], [0, 560]], 5, '#5a4030'); g.translate(0, 560); g.scale(1.6, 1.6); drawCard(g, sackCard(2)); g.save(); g.translate(0, 30); g.scale(.62, .62); drawCard(g, PRIZE); g.restore(); g.restore();
        drawPuppet(g, 'R', { x: -460, y: 820, s: 1.7, head: 18, lean: -4, armN: [150, 20], armF: [160, 10], face: { mouth: 'o', open: .3, look: [.6, -1], brow: -6 }, propN: (gg, t3, a3) => { gg.save(); gg.rotate(a3 * DEG); gg.translate(-40, -150); gg.rotate(-.1); piece(gg, rect(-150, -190, 300, 380), '#f0e4c4', { lw: 4, seed: 1750 }); gg.fillStyle = '#3a2412'; gg.font = '900 60px "Playfair Display"'; gg.textAlign = 'center'; gg.fillText('1000 ₶', 0, 20); gg.restore(); } }, T2);
        drawPuppet(g, 'P', { x: 420, y: 820, s: 1.6, dir: -1, head: 20, armN: [150, 20], armF: [20, 10], face: { mouth: 'o', open: .3, look: [.6, -1], brow: -6 }, propN: (gg, t3, a3) => { gg.save(); gg.rotate(a3 * DEG); gg.translate(0, -30); tinyTicket(gg, .8, 1); gg.fillStyle = '#3a2412'; gg.font = '900 18px "Playfair Display"'; gg.textAlign = 'center'; gg.fillText('1 ₶', 0, 6); gg.restore(); } }, T2);
      }),
      Lr(760, (g, T2) => {
        g.save(); g.translate(0, 2600 * rack); drawCard(g, FELT); g.restore(); g.save(); g.translate(0, 2600 * rack);
        g.save(); g.translate(-30, 40); g.rotate(-.04); drawCard(g, bondCard()); g.restore();
        g.save(); g.translate(lerp(-380, 300, clamp((lt - .3) / 1.2)), lerp(60, 0, clamp((lt - .3) / 1.2))); scissorsDraw(g, open); g.restore();
        snips.forEach((t0, i) => burst(g, lt - t0, lerp(-380, 300, clamp((t0 - .3) / 1.2)) + 260, 0, 34, 1760 + i, 900, 1.6));
        if (out > 0) burst(g, (lt - 4.2) * 1.2, 0, -100, 60, 1790, 1500, 1.8);
        if (st) { g.save(); g.translate(0, -420); g.rotate(st.rot * DEG); g.scale(st.s, st.s); drawCard(g, PLATE1000); g.restore(); }
        g.restore();
      }),
    ];
    return { cam, layers: L, shake: shakeAt(lt, 1.28, 12), bg: '#2f5a3c', post: { vig: .55 } };
  }
});
// ===== S7 — La Condamine at dinner, numbers orbit his head =====
let SALON, TABLE7, NAMELC, NUMS;
SC.push({
  id: 'S7', t0: 21.16, t1: 23.56,
  init() { SALON = panelWall(-1800, -1700, 1800, 900, { upper: '#7a2a2a', lower: '#4a2a18', patCol: '#e8b860', dado: 200, extra: g => { [[-900, -900], [900, -900]].forEach(([x, y], i) => { piece(g, rect(x - 260, y - 200, 520, 400), '#c9a24a', { lw: 6, seed: 1800 + i }); const gr = g.createLinearGradient(0, y - 170, 0, y + 170); gr.addColorStop(0, '#8fb0c0'); gr.addColorStop(1, '#6a8a4a'); g.fillStyle = gr; g.fillRect(x - 220, y - 160, 440, 320); g.strokeStyle = INK; g.lineWidth = 4; g.strokeRect(x - 220, y - 160, 440, 320); cloud(g, x - 60, y - 60, 200, 1810 + i); }); } });
    TABLE7 = deskCard(2000, 300, { cloth: '#f3efe6', col: '#5a3420', top: '#6b4024' });
    NAMELC = textPlate('Ла Кондамин,\nматематик', { size: 50, font: '700 50px "Old Standard"', col: '#2a1a10', bg: '#f4ead2', seed: 61, lh: 1.15 });
    NUMS = ['1/1000', '×', '500 000', '=', '<', '∑', '+', '1729'].map((t, i) => textPlate(t, { size: 54, font: 'italic 54px "IM Fell"', col: '#3a2412', bg: '#f3e8cc', seed: 70 + i, lw: 4 }));
  },
  frame(lt, T) {
    const orb = E.sine(clamp(lt / 2.1)), push = E.in3(inv(2.0, 2.4, lt)), nameP = E.io2(inv(1.15, 1.55, lt));
    const cam = { x: lerp(-200, 160, orb), y: lerp(-60, -90, orb) + push * 260, z: lerp(420, 560, orb) + nameP * 140 + push * 420, zoom: 1, roll: lerp(-3, 2, orb), f: 1285, ap: .7, px: (lerp(-200, 160, orb) + 40) * 1.15 };
    const writing = lt < 1.85; const ph = step12(lt);
    const tkt = clamp(lt / .45), blowK = lt - .62;
    const L = [
      Lr(2400, g => drawCard(g, SALON)),
      Lr(1600, (g, T2) => { g.save(); g.translate(0, -1350); line(g, [[0, -400], [0, 0]], 5, '#5a4030'); piece(g, [[-420, 0], [420, 0], [300, 70], [-300, 70]], '#c9a24a', { lw: 5, seed: 1830 }); for (let i = -3; i <= 3; i++) { g.save(); g.translate(i * 130, -10); g.scale(.6, .6); drawCandle(g, T2 + i); g.restore(); } g.restore(); }),
      Lr(1320, (g, T2) => {
        drawPuppet(g, 'B', { x: -720, y: 760, s: 1.6, armN: [120 + Math.sin(ph * 9) * 20, 60], armF: [40, 30], head: -4, face: { mouth: Math.sin(ph * 8) > 0 ? 'talk' : 'smile', open: .6, look: [1, 0] } }, T2);
        drawPuppet(g, 'R', { x: 720, y: 760, s: 1.6, dir: -1, armN: [140, 40], armF: [30, 20], head: 6, face: { mouth: 'smile', look: [1, .2] }, propN: (gg) => { gg.save(); gg.translate(0, -30); piece(gg, [[-14, 0], [14, 0], [20, -60], [-20, -60]], 'rgba(220,240,255,.6)', { lw: 3, seed: 1840 }); gg.restore(); } }, T2);
      }),
      Lr(1290, (g, T2) => {
        const look = writing ? [.8, .9] : [1, -.4];
        drawPuppet(g, 'L', { x: -40, y: 760, s: 1.75, bob: writing ? Math.abs(Math.sin(ph * 9)) * -6 : 0, lean: writing ? 10 + Math.sin(ph * 7) * 3 : -8, head: writing ? -14 + Math.sin(ph * 11) * 4 : 10, armN: writing ? [60 + Math.sin(ph * 31) * 14, 60 + Math.cos(ph * 23) * 10] : [150, 10], armF: writing ? [50 + Math.sin(ph * 5) * 10, 40] : [140, 20],
          face: { mouth: lt > 1.85 ? 'o' : blowK > 0 && blowK < .35 ? 'o' : 'flat', open: .5, look, brow: lt > 1.85 ? -16 : 4, browY: lt > 1.85 ? 8 : 0, wide: lt > 1.85 },
          headExtra: (gg) => { if (tkt < 1 || blowK < .1) { gg.save(); const k = blowK > 0 ? blowK : 0; gg.translate(90 + k * 600, -60 - k * 300 + (1 - tkt) * -500); gg.rotate(k * 9 + (1 - tkt) * 3); tinyTicket(gg, 1.3, 2); gg.restore(); } else if (blowK < .5) { gg.save(); gg.translate(90 + blowK * 600, -60 - blowK * 300); gg.rotate(blowK * 9); tinyTicket(gg, 1.3, 2); gg.restore(); } } }, T2);
      }),
      Lr(1240, g => { g.save(); g.translate(0, 470); drawCard(g, TABLE7); g.restore(); g.save(); g.translate(120, 180); piece(g, [[-110, -20], [110, -30], [120, 40], [-100, 50]], '#fbf8f0', { lw: 3.5, seed: 1850 }); g.fillStyle = '#3a2412'; g.font = 'italic 26px "IM Fell"'; g.fillText('1/1000 × N', -86, 6); g.fillText('< 500 000', -70, 34); g.restore();
        g.save(); g.translate(-520, 170); piece(g, ell(0, 0, 150, 40, 20), '#f3efe6', { lw: 4, seed: 1860 }); piece(g, [[-90, -10], [-60, -70], [40, -80], [90, -20], [60, 10], [-70, 10]], '#b86a2a', { lw: 4, seed: 1861 }); g.restore();
        [[480, 120], [600, 130], [-320, 140]].forEach(([x, y], i) => { g.save(); g.translate(x, y); piece(g, [[-16, 0], [16, 0], [24, -70], [-24, -70]], 'rgba(200,225,245,.55)', { lw: 3, seed: 1870 + i }); piece(g, [[-4, 0], [4, 0], [6, 40], [-6, 40]], 'rgba(200,225,245,.55)', { lw: 3, seed: 1875 + i }); g.restore(); });
      }),
      ...NUMS.map((cd, i) => { const a = lt * 2.6 + i / NUMS.length * TAU, k = clamp((lt - .2 - i * .08) / .3); const z = 1290 + Math.sin(a) * 260; return k > 0 ? Lr(z, g => { g.save(); g.translate(-30 + Math.cos(a) * 430, -190 + Math.sin(a * 2) * 70 - Math.sin(a) * 60); g.scale(E.outBack(k) * .95, E.outBack(k) * .95); g.rotate(Math.sin(a) * .2); drawCard(g, cd); g.restore(); }) : null; }),
      Lr(1200, g => { const k = clamp((lt - 1.28) / .22); if (k <= 0) return; g.save(); g.translate(-330, -330); g.scale(E.outBack(k) * .85, E.outBack(k) * .85); g.rotate(.05); drawCard(g, NAMELC); g.restore(); }),
      SCR((g, T2) => bokeh(g, [[160, 230, 80, .25], [400, 180, 60, .2], [680, 200, 70, .22], [930, 260, 90, .2]], T2)),
    ];
    return { cam, layers: L, bg: '#2a1010', post: { vig: .6, tint: '#ffb060', tintA: .18 } };
  }
});
// ===== S8 — the giant scale: all tickets < prize =====
let HALL8, PL_ALL, PL_LT, PL_PRIZE, LTBIG;
SC.push({
  id: 'S8', t0: 23.56, t1: 28.06,
  init() {
    HALL8 = card(-2200, -2200, 2200, 1200, .6, g => { piece(g, rect(-2200, -2200, 4400, 3400), '#5a4030', { lw: 0, edge: false, tex: .7 }); for (let i = -4; i <= 4; i++) { const x = i * 520; piece(g, rect(x - 110, -1900, 220, 2900), '#cdb88f', { lw: 6, seed: 1900 + i }); piece(g, rect(x - 150, -1960, 300, 90), '#b8a27a', { lw: 5, seed: 1920 + i }); piece(g, rect(x - 150, 880, 300, 120), '#b8a27a', { lw: 5, seed: 1940 + i }); if (i < 4) { const wx = x + 260; piece(g, [[wx - 120, -300], [wx - 120, -1300], ...ell(wx, -1300, 120, 140, 12, Math.PI, TAU).slice(1), [wx + 120, -300]], '#f0c77a', { lw: 5, seed: 1960 + i }); } } piece(g, rect(-2200, 1000, 4400, 200), '#4a3020', { lw: 5, seed: 1990 }); });
    PL_ALL = glyphCards('ВСЕ БИЛЕТЫ', { size: 104 }); PL_LT = textPlate('<', { size: 170, col: '#a5232d', bg: '#f3e8cc', seed: 81 }); PL_PRIZE = glyphCards('ПРИЗ', { size: 104, col: '#f1d98a' });
  },
  frame(lt, T) {
    const slamT = 2.98, k = lt - slamT;
    const fill = clamp((lt - .3) / 1.6);
    const beam = k < -.02 ? -13 * E.out2(fill) : lerp(-13, 17, E.out3(clamp(k / .12))) + wob(k, 2.2, 3.5) * 6;
    const crash = k > 0 ? E.out3(clamp(k / .18)) * (1 - E.io2(clamp((k - .6) / .9))) : 0;
    const cam = { x: lerp(-60, 40, lt / 4.5), y: lerp(180, -60, E.sine(clamp(lt / 4.5))), z: lerp(-80, 120, lt / 4.5), zoom: 1 + crash * .16, roll: lerp(-2, 2, lt / 4.5), f: 1300, ap: .45 };
    const pivot = [0, -560], arm = 560;
    const end = sd => { const a = beam * DEG; return [pivot[0] + sd * Math.cos(a) * arm, pivot[1] + sd * Math.sin(a) * arm]; };
    const pan = (g, sd, content) => { const [x, y] = end(sd); g.save(); g.translate(x, y); line(g, [[0, 0], [-150, 330]], 3.5, '#6a5a3a'); line(g, [[0, 0], [150, 330]], 3.5, '#6a5a3a'); g.translate(0, 330); if (content) content(g); piece(g, [[-190, 0], [190, 0], [150, 50], [-150, 50]], '#d4a640', { lw: 5, seed: 2000 + sd }); g.restore(); };
    const L = [
      Lr(2600, g => drawCard(g, HALL8)),
      Lr(1300, (g, T2) => {
        piece(g, [[-40, -560], [40, -560], [60, 600], [-60, 600]], '#c89c3a', { lw: 6, seed: 2010 }); piece(g, [[-260, 600], [260, 600], [220, 660], [-220, 660]], '#a87c2a', { lw: 6, seed: 2011 });
        pan(g, -1, gg => { const n = Math.round(60 * fill); const r = rng(5); for (let i = 0; i < n; i++) { if (k > 0 && i % 2) continue; gg.save(); gg.translate((r() - .5) * 300 * (1 - i / 120), -10 - (i / 60) * 160 * r()); gg.rotate(r() * 6); tinyTicket(gg, 1.5, i); gg.restore(); } });
        pan(g, 1, gg => { if (k > -.01) { gg.save(); gg.translate(0, -120); gg.scale(1.5, 1.5 * (1 - wob(k, 4, 8) * .15)); drawCard(gg, sackCard(2)); gg.restore(); } });
        g.save(); g.translate(...pivot); g.rotate(beam * DEG); piece(g, [[-arm - 30, -16], [arm + 30, -16], [arm + 30, 16], [-arm - 30, 16]], '#d8ac44', { lw: 6, seed: 2020 }); g.restore(); piece(g, ell(pivot[0], pivot[1], 34, 34, 16), '#b88a2a', { lw: 5, seed: 2021 });
        // falling tickets pouring in
        if (lt > .2 && lt < 2.1) { const r = rng(9); for (let i = 0; i < 26; i++) { const t0 = r() * 1.6, kk = lt - .2 - t0; if (kk < 0 || kk > .5) continue; const [x, y] = end(-1); g.save(); g.translate(x + (r() - .5) * 280, y + 330 - 900 * (1 - kk / .5)); g.rotate(kk * 12); tinyTicket(g, 1.5, i); g.restore(); } }
        // prize sack falling in
        if (k > -.3 && k < 0) { const [x, y] = end(1); g.save(); g.translate(x, y + 210 - 1100 * E.in2(-k / .3)); g.scale(1.5, 1.5); drawCard(g, sackCard(2)); g.restore(); }
        if (k > 0) { const [x, y] = end(-1); burst(g, k * 1.2, x, y + 250, 50, 2030, 1300, 1.5); dustPuff(g, k, end(1)[0], end(1)[1] + 380, 14, 50, 9); }
      }, { shadow: { dx: 40, dy: 30, b: 18, a: .3 } }),
      SCR((g, T2) => {
        // typography: ВСЕ БИЛЕТЫ  <  ПРИЗ
        const y = 330, intro = E.out3(clamp(lt / .45));
        g.save(); g.translate(lerp(W / 2, W / 2, intro), lerp(H / 2, y, intro)); const s0 = lerp(9, .55, intro); g.scale(s0, s0); g.rotate(lerp(.6, 0, intro)); drawCard(g, PL_LT); g.restore();
        PL_ALL.glyphs.forEach((gl, i) => { const kk = lt - .29 - i * .03; if (kk < 0) return; const inflate = i < 3 ? 1 + .35 * Math.exp(-Math.max(0, lt - .5) * 3) * Math.sin(Math.min(1, (lt - .29) / .2) * Math.PI / 2) : 1; g.save(); g.translate(255 + gl.x * .55, y + 10 - (1 - E.outBack(clamp(kk / .2))) * 80); g.scale(.55 * inflate, .55 * inflate); drawCard(g, gl.cd); g.restore(); });
        PL_PRIZE.glyphs.forEach((gl, i) => { const kk = lt - 2.62 - i * .04; if (kk < 0) return; const pump = k > 0 ? 1 + .3 * Math.exp(-k * 5) : 1; g.save(); g.translate(835 + gl.x * .55, y + 10 - (1 - E.outBack(clamp(kk / .2))) * 80); g.scale(.55 * pump, .55 * pump); drawCard(g, gl.cd); g.restore(); });
        rays(g, 600, -80, 10, 1900, 160, 700, .12, 4, T2);
      }),
    ];
    return { cam, layers: L, shake: shakeAt(lt, slamT, 26, .5), bg: '#3a2a1c', post: { vig: .5 } };
  }
});
// ===== S9 — Voltaire reads the napkin; coins in his eyes; blows out the candle =====
let DARKW, NAPKIN, WINPL;
SC.push({
  id: 'S9', t0: 28.06, t1: 31.46,
  init() { if (!STAMP1) STAMP1 = textPlate('ОШИБКА\nРАСЧЁТОВ', { size: 96, col: '#b3201b', bg: '#f1e4c6', stamp: true, seed: 21, lw: 6 }); DARKW = panelWall(-1600, -1800, 1600, 1000, { upper: '#3a2a26', lower: '#2a1a12', patCol: '#8a6a40', dado: 400 }); NAPKIN = card(-150, -110, 150, 110, 2, g => { piece(g, [[-140, -90], [140, -100], [146, 96], [-130, 104]], '#fbf8f0', { lw: 4, seed: 2100 }); g.fillStyle = '#3a2412'; g.font = 'italic 34px "IM Fell"'; g.fillText('1/1000 × N', -110, -30); g.fillText('< 500 000 ₶', -110, 20); g.strokeStyle = '#b3201b'; g.lineWidth = 4; g.beginPath(); g.ellipse(-10, 8, 135, 40, -.05, 0, TAU); g.stroke(); });
    WINPL = textPlate('БЕСПРОИГРЫШНО', { size: 84, col: '#1f5a2a', bg: '#f3e8cc', stamp: true, seed: 91 }); },
  frame(lt, T) {
    const blowT = 2.92, outT = 3.12, k = lt - outT;
    const cam = { x: lerp(40, 110, lt / 3.4), y: lerp(-330, -420, E.sine(clamp(lt / 3.4))), z: lerp(0, 300, E.io2(clamp(lt / 3.4))), zoom: 1, roll: lerp(-2, 1.5, lt / 3.4), f: 1000, ap: .8 };
    const coins = lt > 1.62 ? E.outBack(clamp((lt - 1.62) / .25)) : 0; const EYES = [];
    const grin = lt > 1.62 ? 'grin' : 'smirk';
    const st1 = slam(lt, .1, { r0: -12, r1: -6 }), flip = clamp((lt - 1.62) / .22);
    const dark = k > 0 ? E.out2(clamp(k / .22)) : 0;
    const L = [
      Lr(2200, g => drawCard(g, DARKW)),
      Lr(1000, (g, T2) => drawPuppet(g, 'V', { x: 60, y: 1150, s: 2.9, lean: -2, head: lt < 1.5 ? -12 : -4, armN: [52, 76], armF: [-6, 4], face: { mouth: lt > blowT && lt < outT + .25 ? 'o' : grin, open: .4, look: lt < 1.5 ? [.5, .7] : [1, 0], squint: lt > 1.62 && lt < blowT ? .35 : 0, brow: lt > .1 && lt < 1.6 ? -10 : -4, browY: lt > .1 && lt < 1.0 ? 8 : 0, coins },
        headExtra: (gg) => { const m = gg.getTransform(); [[36, -88], [6, -90]].forEach(([x, y]) => EYES.push([m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f, Math.hypot(m.a, m.b)])); },
        propN: (gg) => { gg.save(); gg.translate(20, -60); gg.rotate(-1.1); gg.scale(.85, .85); drawCard(gg, NAPKIN); gg.restore(); } }, T2, 4)),
      Lr(760, (g, T2) => { g.save(); g.translate(-420, 520); g.scale(1.5, 1.5); if (k < 0) { if (lt > blowT) { g.save(); g.translate(0, -226); g.rotate(-.5 * clamp((lt - blowT) / .2)); g.translate(0, 226); drawCandle(g, T2, { glow: 1 - clamp((lt - blowT) / .2) * .5 }); g.restore(); } else drawCandle(g, T2); } else { drawCandle(g, T2, { out: true }); g.translate(0, -230); smoke(g, 0, 0, k * 1.5 + .2, 2110, .6, 'rgba(200,190,180,'); } g.restore(); }),
      SCR((g, T2) => { // warm candle key light on his face
        if (dark < 1) { g.save(); g.globalCompositeOperation = 'soft-light'; const gr = g.createRadialGradient(300, 1200, 50, 360, 1000, 900); gr.addColorStop(0, `rgba(255,170,80,${.6 * (1 - dark)})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore(); }
        if (st1 && flip < 1) { g.save(); g.translate(W / 2, 300); g.rotate(st1.rot * DEG); g.scale(st1.s * .7, st1.s * .7 * (1 - flip)); drawCard(g, STAMP1); g.restore(); }
        if (flip > 0) { g.save(); g.translate(W / 2, 300); g.rotate(-5 * DEG); g.scale(.74, .74 * E.outBack(flip)); drawCard(g, WINPL); g.restore(); }
        if (dark > 0) { g.fillStyle = `rgba(5,3,2,${dark * .97})`; g.fillRect(0, 0, W, H);
          EYES.forEach(([x, y, s], i) => { const r = 7.5 * s * (i ? .62 : 1), a = dark * (1 - clamp((lt - 3.34) / .08)); g.save(); g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(x, y, 0, x, y, r * 5); gl.addColorStop(0, `rgba(255,200,80,${.55 * a})`); gl.addColorStop(1, 'rgba(255,160,40,0)'); g.fillStyle = gl; g.fillRect(x - r * 5, y - r * 5, r * 10, r * 10); g.restore(); g.globalAlpha = a; g.fillStyle = GOLD; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = '#fff6c0'; g.fillRect(x - r * .4, y - r * .5, r * .4, r * .3); g.globalAlpha = 1; }); }
      }),
    ];
    return { cam, layers: L, bg: '#150d09', post: { vig: .7, tint: '#ff9a40', tintA: .2 } };
  }
});
// ===== S10 — the heist crew walks out of the fog =====
let ST_FAR, ST_MID, LANTERN, BARROW;
SC.push({
  id: 'S10', t0: 31.46, t1: 35.46,
  init() { ST_FAR = rowCard(91, -3400, 3400, 900, 600, 900, .6, { lit: .45, tint: 'rgba(40,50,100,.45)' }); ST_MID = rowCard(93, -2600, 4200, 900, 560, 760, .75, { lit: .35, tint: 'rgba(30,40,80,.3)', ground: '#4a4a52', below: 600 });
    LANTERN = card(-60, -900, 60, 10, 1.5, g => { piece(g, rect(-10, -820, 20, 820), '#2a2626', { lw: 4, seed: 2200 }); piece(g, [[-40, -900], [40, -900], [30, -820], [-30, -820]], '#3a3434', { lw: 4, seed: 2201 }); piece(g, rect(-30, -820, 60, 30), '#2a2626', { lw: 3, seed: 2202 }); });
    BARROW = card(-260, -200, 260, 110, 1.6, g => { piece(g, [[-240, -160], [180, -160], [150, 20], [-200, 20]], '#7a4a28', { lw: 5, seed: 2210 }); for (let i = 0; i < 6; i++) { g.save(); g.translate(-170 + i * 62, -170 - (i % 2) * 20); g.rotate((i % 3 - 1) * .1); piece(g, rect(-34, -60, 68, 70), '#efe3c4', { lw: 3.5, seed: 2220 + i }); line(g, [[-34, -25], [34, -25]], 6, '#a5232d'); g.restore(); } line(g, [[180, -100], [300, -40]], 9, '#5a3a20'); piece(g, ell(-150, 50, 56, 56, 18), '#5a3a20', { lw: 5, seed: 2230 }); });
  },
  frame(lt, T) {
    const sp = 260, cx = lt * sp;
    const cam = { x: cx + 190, y: 150, z: lerp(-40, 40, lt / 4), zoom: 1.12, roll: lerp(-3, 2, lt / 4), f: 1150, ap: .6 };
    const fadeIn = E.out2(clamp((lt - .04) / .22));
    const crew = [['V', 950, 300, 0], ['L', 1200, 0, .25], ['N', 1450, -250, .5], ['B', 1700, -500, .75]];
    const L = [
      SCR(g => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1b2140'); gr.addColorStop(.6, '#4a4a6e'); gr.addColorStop(1, '#6a5a6a'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }, { z: 1e9 }),
      Lr(3400, g => drawCard(g, ST_FAR)),
      Lr(2700, g => { g.save(); const gr = g.createLinearGradient(0, -200, 0, 900); gr.addColorStop(0, 'rgba(160,160,190,0)'); gr.addColorStop(1, 'rgba(160,160,190,.55)'); g.fillStyle = gr; g.fillRect(-6000, -200, 12000, 1300); g.restore(); }),
      Lr(2100, g => drawCard(g, ST_MID)),
      Lr(1700, (g, T2) => { g.save(); const gr = g.createLinearGradient(0, 200, 0, 1000); gr.addColorStop(0, 'rgba(170,170,200,0)'); gr.addColorStop(1, 'rgba(170,170,200,.45)'); g.fillStyle = gr; g.fillRect(-4000, 200, 9000, 900); g.restore(); for (let i = -2; i < 7; i++) { const x = i * 700; g.save(); g.translate(x, 900); drawCard(g, LANTERN); const on = clamp((lt - .1 - (i + 2) * .06) / .12); if (on > 0) { g.translate(0, -800); g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(0, 0, 4, 0, 0, 260); gl.addColorStop(0, `rgba(255,200,110,${.7 * on})`); gl.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = gl; g.fillRect(-260, -260, 520, 520); g.fillStyle = `rgba(255,230,160,${on})`; g.fillRect(-22, -14, 44, 28); } g.restore(); } }),
      ...crew.map(([id, z, dx, ph0]) => Lr(z, (g, T2) => { const w = walk(step12(lt) * .9 + ph0, .95); const prop = id === 'V' ? { propN: gg => { gg.save(); gg.rotate(-1.35); drawQuill(gg, .9); gg.restore(); }, armN: [75, -10] } : id === 'L' ? { propN: gg => { gg.save(); gg.rotate(.2); line(gg, [[0, 0], [-20, 90]], 5, '#c8a24a'); line(gg, [[0, 0], [20, 90]], 5, '#c8a24a'); gg.restore(); } } : id === 'N' ? { propN: gg => { piece(gg, ell(0, 10, 20, 20, 12), '#a8231d', { lw: 3, seed: 2240 }); } } : {};
        drawPuppet(g, id, Object.assign({}, w, { x: cx + dx + 100, y: 900, s: 1.75, head: id === 'V' ? -3 : 0, face: { mouth: id === 'V' ? 'smirk' : id === 'B' ? 'grin' : 'flat', look: [1, 0], squint: id === 'V' ? .3 : 0 } }, prop), T2);
        if (id === 'B') { g.save(); g.translate(cx + dx + 100 + 280, 900 - 70); g.scale(.9, .9); drawCard(g, BARROW); g.restore(); popTag(g, 'пачки облигаций', lt, 2.87, cx + dx + 420, 460, 48, .04); popTag(g, 'банкир', lt, 1.6, cx + dx + 100, -230, 48); }
        if (id === 'N') popTag(g, 'нотариус', lt, 2.08, cx + dx + 100, -260, 48, .05);
        if (id === 'L') popTag(g, 'математик', lt, .9, cx + dx + 100, -240, 48, -.03);
      }, { shadow: { dx: -24, dy: 14, b: 12, a: .3 } })),
      Lr(600, (g) => { g.save(); const gr = g.createLinearGradient(0, 600, 0, 1300); gr.addColorStop(0, 'rgba(180,180,210,0)'); gr.addColorStop(1, 'rgba(180,180,210,.5)'); g.fillStyle = gr; g.fillRect(-3000, 600, 9000, 900); g.restore(); }),
      lt > 3.62 ? Lr(lerp(1150, 150, E.in2(clamp((lt - 3.62) / .38))), g => { const u = clamp((lt - 3.62) / .38); g.save(); g.translate(cx - 220 + u * 300, 500 - Math.sin(u * Math.PI) * 400); g.rotate(u * 3); g.scale(1.6, 1.6); drawCard(g, sackCard(3)); g.restore(); }) : null,
      SCR(g => { if (fadeIn < 1) { g.fillStyle = `rgba(5,3,2,${1 - fadeIn})`; g.fillRect(0, 0, W, H); } }),
    ];
    return { cam, layers: L, bg: '#1b2140', post: { vig: .6, tint: '#6a7ab0', tintA: .2, warmTop: false } };
  }
});
