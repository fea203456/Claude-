// ---- scenes 11-16 ----
const MONTHS = ['ЯНВАРЬ', 'ФЕВРАЛЬ', 'МАРТ', 'АПРЕЛЬ', 'МАЙ'];
function calPage(i) { return memo('cal' + i, () => card(-260, -330, 260, 330, 1.3, g => { piece(g, rect(-240, -300, 480, 600), '#f4ecd8', { lw: 5, seed: 2300 + i, rough: 1.2 }); piece(g, rect(-240, -300, 480, 110), '#a5232d', { lw: 5, seed: 2310 + i }); g.fillStyle = '#f4ecd8'; g.font = '900 64px "Playfair Display"'; g.textAlign = 'center'; g.fillText(MONTHS[i], 0, -222); g.fillStyle = '#2a1a10'; g.font = '900 230px "Playfair Display"'; g.fillText('1', 0, 130); g.font = 'italic 34px "IM Fell"'; g.fillText('1729', 0, 230); })); }
function tearWipe(g, k, seed = 3) { // a torn paper sheet sweeping across the screen (screen space)
  if (k <= 0 || k >= 1) return; const x = lerp(-W * 1.3, W * 1.3, E.io2(k)); const r = rng(seed); g.save(); g.translate(x, 0); g.rotate(-.12);
  const pts = [[-W * 1.2, -300], [0, -300]]; for (let y = -300; y < H + 400; y += 40) pts.push([20 + (r() - .5) * 60, y]); pts.push([-W * 1.2, H + 400]);
  piece(g, pts, '#f4ecd8', { lw: 6, seed, tex: .6, bb: [-W, 0, 0, H] }); g.restore(); }
let HALL11;
SC.push({
  id: 'S11', t0: 35.46, t1: 38.68,
  init() { HALL11 = panelWall(-1800, -2000, 1800, 1000, { upper: '#6a5a3a', lower: '#4a3020', patCol: '#e8c870', dado: 300 }); },
  frame(lt, T) {
    const tears = [.16, 1.74, 2.37]; const nT = tears.filter(t => lt >= t).length;
    const pile = 3 + nT * 3 + (lt > 1.0 ? 1 : 0);
    const cam = { x: lerp(-60, 40, lt / 3.2), y: lerp(-80, -380, E.io2(clamp(lt / 2.8))), z: lerp(100, 240, lt / 3.2), zoom: 1, roll: lerp(1.5, -1.5, lt / 3.2), f: 1400, ap: .55 };
    const pilePos = (i) => { let row = 0, n = 5, idx = i; while (idx >= n) { idx -= n; n--; row++; } return [380 + (idx - (n - 1) / 2) * 190, 860 - row * 150]; };
    const top = pilePos(pile - 1);
    const L = [
      Lr(2400, (g, T2) => { drawCard(g, HALL11); // window with the minister watching, greying
        g.save(); g.translate(520, -760); piece(g, rect(-260, -300, 520, 600), '#2b3550', { lw: 6, seed: 2350 }); g.save(); g.beginPath(); g.rect(-250, -290, 500, 580); g.clip();
        const grey = nT / 3; SPECS.M.wig = '#f6f2ea'; drawPuppet(g, 'M', { x: -10, y: 700, s: 1.45 - grey * .05, head: -8 + grey * 6, lean: grey * 8, face: { mouth: grey > .5 ? 'frown' : 'o', open: .3, look: [1, .3], brow: 12 + grey * 8, sweat: grey > .3 ? [[60, -110, 1]] : null } }, T2);
        g.fillStyle = `rgba(200,200,200,${grey * .35})`; g.fillRect(-250, -290, 500, 580); g.restore(); g.strokeStyle = '#d8c7a6'; g.lineWidth = 16; g.strokeRect(-260, -300, 520, 600); g.beginPath(); g.moveTo(0, -300); g.lineTo(0, 300); g.moveTo(-260, 0); g.lineTo(260, 0); g.stroke(); g.restore(); }),
      Lr(1450, (g, T2) => { g.save(); g.translate(-420, 380); drumDraw(g, lt * 4, T2); g.restore();
        tears.forEach((t0, i) => { const k = lt - t0 - .05; if (k > 0 && k < .5) { g.save(); g.translate(lerp(-420, top[0], k / .5), lerp(380, top[1] - 200, k / .5) - Math.sin(k / .5 * Math.PI) * 300); g.rotate(k * 14); tinyTicket(g, 2.2, i); g.restore(); } });
        for (let i = 0; i < pile; i++) { const [x, y] = pilePos(i); const born = i < 3 ? -1 : tears[Math.floor((i - 3) / 3)] ?? 1.0; const k = lt - (born === -1 ? -1 : born + .1 + (i % 3) * .07); if (k < 0) continue; g.save(); g.translate(x, y - (1 - E.out3(clamp(k / .2))) * 500); g.scale(1.25, 1.25 * (1 - wob(k - .2, 4, 8) * .12)); drawCard(g, sackCard(i % 4)); g.restore(); }
        drawPuppet(g, 'V', { x: top[0] - 20, y: top[1] - 120, s: 1.4, lean: -24, head: 8, legN: [70, -10], legF: [84, -20], armN: [200, -70], armF: [190, -60], face: { mouth: 'grin', squint: .5, look: [1, -.3] } }, T2);
      }, { shadow: { dx: 30, dy: 26, b: 16, a: .3 } }),
      Lr(720, g => { // tear-off calendar
        g.save(); g.translate(-300, 120); g.scale(.62, .62); line(g, [[0, -360], [0, -460]], 4, '#5a4030'); drawCard(g, calPage(Math.min(nT, 3)));
        tears.forEach((t0, i) => { const k = lt - t0; if (k > 0 && k < .7) { g.save(); g.translate(k * 900, -k * 300 + k * k * 1400); g.rotate(k * 3); g.scale(1, Math.cos(k * 6) * .5 + .5); drawCard(g, calPage(i)); g.restore(); } }); g.restore(); }, { shadow: { dx: 20, dy: 24, b: 12, a: .35 } }),
      SCR((g, T2) => { rays(g, 200, -100, -20, 1900, 160, 700, .12, 3, T2); tearWipe(g, (lt - 2.92) / .3, 2390); }),
    ];
    return { cam, layers: L, bg: '#4a3020', post: { vig: .5 } };
  }
});
// ===== S12 — the motto on the ticket; the minister smoulders =====
let TICKET12, MOTTO_RU;
function ticketCard() { return card(-470, -260, 470, 260, 1.6, g => { piece(g, [[-450, -240], [450, -240], [450, -60], [420, -30], [450, 0], [450, 240], [-450, 240], [-450, 0], [-420, -30], [-450, -60]], '#f2e7cb', { lw: 6, seed: 2400 }); g.strokeStyle = '#a5232d'; g.lineWidth = 4; g.strokeRect(-420, -210, 840, 420); g.fillStyle = '#a5232d'; g.textAlign = 'center'; g.font = '700 46px "Old Standard"'; g.fillText('LOTERIE ROYALE', 0, -140); g.fillStyle = '#3a2412'; g.font = 'italic 30px "IM Fell"'; g.fillText('Billet № 1729 · Rente de 1 000 ₶', 0, -95); g.strokeStyle = 'rgba(58,36,18,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-360, 120); g.lineTo(360, 120); g.stroke(); g.font = 'italic 26px "IM Fell"'; g.fillText('Devise du porteur', 0, 165); }); }
SC.push({
  id: 'S12', t0: 38.68, t1: 41.88,
  init() { TICKET12 = ticketCard(); MOTTO_RU = textPlate('«Да здравствует\nгосподин министр!»', { size: 64, font: 'italic 700 64px "Playfair Display"', col: '#2a1a10', bg: '#f4ead2', seed: 2410, lh: 1.15 }); },
  frame(lt, T) {
    const write = clamp((lt - .25) / 1.0), rack = E.io2(inv(1.45, 2.0, lt));
    const cam = { x: lerp(0, 260, rack), y: lerp(-120, -60, rack), z: lerp(0, 330, E.io2(clamp(lt / 3.2))), zoom: 1, roll: lerp(0, 7, E.io2(clamp((lt - 1.2) / 2))), f: lerp(560, 2050, rack), ap: .85 };
    const smoking = clamp((lt - 1.9) / .6), crumple = clamp((lt - 2.75) / .3);
    const L = [
      Lr(2600, g => drawCard(g, memo('sq12', () => rowCard(121, -2600, 2600, 700, 520, 760, .6, { lit: .1 })))),
      Lr(2050, (g, T2) => { const r = rng(4); for (let i = 0; i < 7; i++) { const id = ['R', 'P', 'C', 'K', 'B', 'N', 'P'][i]; if (i === 3) continue; drawPuppet(g, id, { x: -900 + i * 300 + r() * 60, y: 1000, s: 1.6, dir: i % 2 ? -1 : 1, head: 6, face: { mouth: smoking > .3 ? 'grin' : 'smile', look: [1, -.2] } }, T2); }
        drawPuppet(g, 'M', { x: 260, y: 1060, s: 1.75, dir: 1, head: -4 + Math.sin(lt * 30) * smoking * 2, lean: -3, armN: crumple > 0 ? [lerp(20, 150, crumple), lerp(10, -80, crumple)] : [20, 10], armF: [-10, 10], face: { mouth: smoking > .2 ? 'frown' : 'flat', look: [-.6, -.6], twitch: smoking > 0 && Math.sin(lt * 26) > 0, brow: 16, browY: -2, eyes: 1 },
          headExtra: (gg, t3) => { if (smoking > 0) { gg.save(); gg.translate(0, -330); smoke(gg, 0, 0, t3 * 1.2, 2420, .9 * smoking, 'rgba(120,110,105,'); smoke(gg, -30, 40, t3 * 1.4 + .5, 2421, .7 * smoking, 'rgba(140,130,120,'); gg.restore(); } },
          propN: crumple > 0 ? (gg) => { piece(gg, ell(0, 10, 26 - crumple * 6, 22 - crumple * 4, 9), '#f2e7cb', { lw: 3, seed: 2430, rough: 4 }); } : null }, T2);
      }),
      Lr(1600, (g, T2) => { g.save(); g.translate(0, 520); piece(g, rect(-900, 0, 1800, 400), '#7a4a28', { lw: 6, seed: 2440 }); g.restore(); drawPuppet(g, 'N', { x: -260, y: 520, s: 1.6, head: 10, lean: -6, armN: [120, -20], armF: [110, -10], face: { mouth: lt > 1.29 && lt < 2.95 ? (Math.sin(lt * 22) > 0 ? 'talk' : 'o') : 'flat', open: .7, look: [1, .5] }, propN: (gg) => { gg.save(); gg.translate(30, -40); piece(gg, rect(-50, -90, 100, 170), '#efe3c4', { lw: 3.5, seed: 2445 }); gg.restore(); } }, T2); }),
      Lr(560, (g, T2) => { g.save(); g.translate(-40 - rack * 300, -20 + E.in2(rack) * 1500); g.rotate(-.06 - rack * .3); drawCard(g, TICKET12);
        // the motto writes itself, with Voltaire's quill
        g.save(); g.beginPath(); g.rect(-400, -40, 800 * write, 160); g.clip(); g.fillStyle = '#4a2814'; g.font = '86px "Pinyon"'; g.textAlign = 'center'; g.fillText('Vive M. Des Forts !', 0, 70); g.restore();
        if (write > 0 && write < 1) { g.save(); g.translate(-360 + 720 * write, 60 + Math.sin(write * 40) * 14); g.rotate(-.5); g.scale(1.4, 1.4); drawQuill(g, 1); g.restore(); }
        g.restore(); }, { shadow: { dx: 20, dy: 26, b: 12, a: .35 } }),
      SCR((g, T2) => { const k = clamp((lt - 1.29) / .25); if (k > 0) { g.save(); g.translate(W / 2, 330); g.rotate(.03); g.scale(E.outBack(k) * 1.05, E.outBack(k) * 1.05); drawCard(g, MOTTO_RU); g.restore(); } rays(g, 900, -100, 25, 1900, 140, 600, .12, 3, T2); }),
    ];
    return { cam, layers: L, bg: '#9cc0d8', post: { vig: .5 } };
  }
});
// ===== S13 — the courtroom =====
let COURT, BENCH13;
function courtCard() { return card(-2200, -2300, 2200, 1100, .6, g => { piece(g, rect(-2200, -2300, 4400, 3400), '#5a3a24', { lw: 0, edge: false, tex: .7 }); for (let i = -3; i <= 3; i++) { const x = i * 620; piece(g, [[x - 170, -300], [x - 170, -1700], ...ell(x, -1700, 170, 200, 12, Math.PI, TAU).slice(1), [x + 170, -300]], '#e7d6a6', { lw: 6, seed: 2500 + i }); g.strokeStyle = '#5a3a24'; g.lineWidth = 12; g.beginPath(); g.moveTo(x, -1880); g.lineTo(x, -300); g.moveTo(x - 170, -1000); g.lineTo(x + 170, -1000); g.stroke(); } piece(g, rect(-2200, -250, 4400, 1350), '#6b4428', { lw: 6, seed: 2520 }); for (let x = -2100; x < 2200; x += 300) piece(g, rect(x, -180, 240, 400), '#7c5232', { lw: 4, seed: 2530 + x }); piece(g, ell(0, -2050, 170, 190, 20), '#2d4c8e', { lw: 6, seed: 2540 }); g.fillStyle = '#e2b13c'; g.font = '200px serif'; g.textAlign = 'center'; g.fillText('⚜', 0, -1990); }); }
SC.push({
  id: 'S13', t0: 41.88, t1: 44.38,
  init() { COURT = courtCard(); BENCH13 = card(-700, -500, 700, 520, 1, g => { piece(g, rect(-680, -460, 1360, 960), '#6b3f22', { lw: 7, seed: 2550 }); piece(g, rect(-700, -500, 1400, 70), '#8a5530', { lw: 6, seed: 2551 }); for (let i = 0; i < 4; i++) piece(g, rect(-620 + i * 320, -380, 260, 760), '#7a4a28', { lw: 5, seed: 2552 + i }); }); },
  frame(lt, T) {
    const arc = E.io2(clamp(lt / 2.5));
    const cam = { x: lerp(-360, 340, arc), y: lerp(-430, -330, arc), z: lerp(40, 200, arc), zoom: 1, roll: lerp(-3, 3, arc), f: lerp(1250, 1300, arc), ap: .55, px: lerp(-360, 340, arc) * .45 };
    const slamK = lt - .1;
    const L = [
      Lr(2600, (g, T2) => drawCard(g, COURT)),
      Lr(2050, (g, T2) => { for (let i = 0; i < 9; i++) drawPuppet(g, ['R', 'P', 'C', 'B', 'N', 'K', 'R', 'P', 'C'][i], { x: -1700 + i * 420, y: 500, s: 1.3, dir: i < 4 ? 1 : -1, head: 4, face: { mouth: ['o', 'smile', 'o', 'grin', 'flat', 'o', 'smile', 'o', 'grin'][i], open: .3, look: [1, 0] } }, T2); g.save(); piece(g, rect(-2000, 160, 4000, 60), '#8a5530', { lw: 5, seed: 2560 }); for (let x = -1950; x < 2000; x += 110) piece(g, rect(x, 220, 30, 300), '#7a4a28', { lw: 3.5, seed: 2561 + x }); g.restore(); }),
      Lr(1700, (g, T2) => { drawPuppet(g, 'J', { x: 0, y: 200, s: 1.7, head: -6 + Math.sin(lt * 2) * 2, face: { mouth: 'flat', look: [-.4, .3] }, armN: [40, 30], armF: [30, 20] }, T2); g.save(); g.translate(0, 300); drawCard(g, BENCH13); g.restore(); }),
      Lr(1260, (g, T2) => { const sh = slamK > 0 && slamK < .25; drawPuppet(g, 'M', { x: -430, y: 860, s: 1.8, lean: 10 + Math.sin(lt * 18) * 2, head: 6, armN: slamK < 0 ? [150, -20] : slamK < .2 ? [lerp(150, 60, slamK / .2), 20] : [95, -5], armF: [60, 40], face: { mouth: 'shout', open: .5 + .5 * Math.abs(Math.sin(lt * 14)), look: [1, 0], brow: 22, browY: -4, sweat: [[70, -120, 1.1]] } }, T2);
        g.save(); g.translate(-150, 720); piece(g, rect(-200, 0, 400, 40), '#8a5530', { lw: 5, seed: 2570 }); line(g, [[-170, 40], [-170, 260]], 10, '#5a3a20'); line(g, [[170, 40], [170, 260]], 10, '#5a3a20'); if (slamK > .15) piece(g, ell(-40, -16, 30, 24, 9), '#f2e7cb', { lw: 3, seed: 2571, rough: 4 }); dustPuff(g, slamK - .15, -40, 0, 8, 22, 5); g.restore(); }, { shadow: { dx: 26, dy: 20, b: 14, a: .3 } }),
      Lr(1300, (g, T2) => { const ph = step12(lt); drawPuppet(g, 'V', { x: 430, y: 860, s: 1.8, dir: -1, lean: -6, head: -10, legN: [70, -70], legF: [60, -60], armN: [70 + Math.sin(ph * 24) * 10, 60], armF: [60, 70], face: { mouth: 'smirk', look: [.7, .8], squint: .3 },
          propN: (gg) => { gg.save(); gg.rotate(-.8); drawQuill(gg, .8); gg.restore(); }, propF: (gg) => { gg.save(); gg.rotate(.5); piece(gg, [[-4, 0], [4, 0], [3, 40], [-2, 44]], '#cfd4d8', { lw: 2.5, seed: 2580 }); piece(gg, rect(-6, -30, 12, 30), '#5a3a20', { lw: 2.5, seed: 2581 }); gg.restore(); } }, T2);
        g.save(); g.translate(470, 860); piece(g, rect(-260, -170, 520, 50), '#7a4a28', { lw: 5, seed: 2590 }); line(g, [[-220, -120], [-220, 0]], 10, '#5a3a20'); line(g, [[220, -120], [220, 0]], 10, '#5a3a20'); g.restore(); }, { shadow: { dx: -26, dy: 20, b: 14, a: .3 } }),
      SCR((g, T2) => { rays(g, 300, -60, -14, 1900, 140, 560, .17, 3, T2); rays(g, 860, -60, 10, 1900, 120, 520, .13, 3, T2 + 2); dust(g, T2, 13, 70, [0, 100, W, 1500]); }),
    ];
    return { cam, layers: L, shake: shakeAt(lt, .3, 14), bg: '#3a2414', post: { vig: .55 } };
  }
});
// ===== S14 — the law book, the pause, the pop-up verdict, the wig falls =====
let BOOK14, POP1, POP2;
function popCard(txt, sz, col) { return textPlate(txt, { size: sz, col, bg: '#f4ecd6', seed: txt.length * 13, lw: 7 }); }
SC.push({
  id: 'S14', t0: 44.38, t1: 50.06,
  init() { BOOK14 = card(-760, -120, 760, 160, 1.2, g => { piece(g, [[-740, 120], [-720, -60], [0, -40], [720, -60], [740, 120], [0, 140]], '#6a2a1e', { lw: 6, seed: 2600 }); piece(g, [[-700, 90], [-690, -70], [-20, -50], [-20, 110]], '#efe3c4', { lw: 4.5, seed: 2601 }); piece(g, [[700, 90], [690, -70], [20, -50], [20, 110]], '#efe3c4', { lw: 4.5, seed: 2602 }); g.strokeStyle = 'rgba(58,36,18,.45)'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-640, -30 + i * 22); g.lineTo(-80, -20 + i * 22); g.moveTo(80, -20 + i * 22); g.lineTo(640, -30 + i * 22); g.stroke(); } g.fillStyle = '#3a2412'; g.font = '700 34px "Old Standard"'; g.textAlign = 'center'; g.fillText('CODE', -360, -64); g.fillText('ROYAL', 360, -64); });
    if (!COURT) COURT = courtCard(); POP1 = popCard('ВСЁ', 150, '#2a1a10'); POP2 = popCard('ЗАКОННО', 170, '#1f5a2a'); },
  frame(lt, T) {
    const v1 = 4.03, v2 = 4.71, k2 = lt - v2;
    const pull = k2 > 0 ? E.out3(clamp(k2 / .3)) : 0;
    const cam = { x: lerp(-40, 30, clamp(lt / 4)), y: keyed([[0, -200], [1.5, -60, 'io2'], [4.0, -40], [4.6, -160, 'io2']])(lt), z: keyed([[0, 80], [1.5, 380, 'io2'], [4.0, 520, 'io2'], [4.7, 540]])(lt) - pull * 220, zoom: 1, roll: lerp(-1.5, 1.5, clamp(lt / 4.6)), f: 1050, ap: .8 };
    const flip = lt < 1.9 ? (lt * 3.4) % 1 : 1;
    const shrug = E.outBack(clamp((lt - 2.2) / .5));
    const wigK = lt - (v2 + .25);
    const L = [
      Lr(2400, g => drawCard(g, COURT)),
      Lr(1150, (g, T2) => drawPuppet(g, 'J', { x: 0, y: 760, s: 2.2, head: lt < 2.0 ? -16 : lerp(-6, 6, shrug), lean: -shrug * 6, headDy: -shrug * 10, armN: lt < 1.9 ? [70 + Math.sin(lt * 20) * 8, 40] : [lerp(40, 18, shrug), lerp(30, 95, shrug)], armF: lt < 1.9 ? [60, 40] : [lerp(30, -30, shrug), lerp(20, -95, shrug)], face: { mouth: lt > v2 ? 'smile' : lt > 2.2 ? 'smirk' : 'flat', look: lt < 1.9 ? [.6, 1] : lt < 2.2 ? [Math.sin(lt * 9) > 0 ? 1 : -.6, .2] : [.2, 0], brow: shrug * -14, browY: shrug * 10 } }, T2)),
      Lr(1000, (g, T2) => { g.save(); g.translate(0, 520); piece(g, rect(-900, 40, 1800, 600), '#6b3f22', { lw: 7, seed: 2610 }); drawCard(g, BOOK14);
        if (lt < 1.9) { g.save(); g.translate(0, -40); g.scale(Math.cos(flip * Math.PI), 1); piece(g, [[0, 120], [0, -40], [680, -60], [690, 90]], '#f6ecd2', { lw: 4, seed: 2620, light: false }); g.restore(); }
        // pop-ups unfolding from the book
        [[v1, POP1, -110, -560, -.07, .6], [v2, POP2, 90, -300, .04, .55]].forEach(([t0, cd, x, y, r, s]) => { const k = lt - t0; if (k < 0) return; const u = E.outBack(clamp(k / .28), 1.8); g.save(); g.translate(x, -20); line(g, [[0, 0], [0, y * u + 40]], 5, '#7a5a3a'); g.translate(0, y * u); g.rotate(r + wob(k, 2, 4) * .1); g.scale(s, s * u); drawCard(g, cd); g.restore(); });
        g.restore(); }, { shadow: { dx: 30, dy: 30, b: 16, a: .35 } }),
      Lr(900, (g, T2) => { drawPuppet(g, 'M', { x: -190, y: 720, s: 1.2, lean: 12, head: lt > v2 ? 8 : 0, armN: [90, 30], armF: [70, 40], face: { mouth: lt > v2 ? 'o' : 'flat', open: .7, wide: lt > v2, look: [1, -.2], brow: 16, sweat: [[66, -120, 1.2]] }, noWig: wigK > 0,
          headExtra: (gg) => { if (wigK > 0) { const P = getPuppet('M'); gg.save(); gg.translate(-wigK * 200, wigK * wigK * 2600); gg.rotate(-wigK * 2.5); drawCard(gg, P.wigFront); gg.restore(); } } }, T2); }),
      SCR((g, T2) => { rays(g, 540, -100, 0, 1900, 200, 800, .14, 4, T2); if (lt > 1.5 && lt < 4.0) { g.fillStyle = `rgba(0,0,0,${.18 * Math.sin(clamp((lt - 1.5) / 2.5) * Math.PI)})`; g.fillRect(0, 0, W, H); } }),
    ];
    return { cam, layers: L, shake: shakeAt(lt, v2, 22, .45), bg: '#3a2414', post: { vig: .6 } };
  }
});
// ===== S15 — the minister leaves; Voltaire's carriage rolls by =====
let FAC15, NAMEPL, CARRIAGE, HORSE;
SC.push({
  id: 'S15', t0: 50.06, t1: 53.12,
  init() { FAC15 = card(-2400, -2200, 2400, 1000, .6, g => { const R = houseRow(151, -2400, 2400, 900, 1300, 1600, {}); R.draw(g); piece(g, rect(-420, -900, 840, 1800), '#d3bf96', { lw: 6, seed: 2700 }); [-330, 330].forEach((x, i) => piece(g, rect(x - 40, -900, 80, 1800), '#c4ab82', { lw: 5, seed: 2705 + i })); [[-170, -620], [170, -620], [-170, -330], [170, -330]].forEach(([x, y], i) => { piece(g, rect(x - 70, y - 110, 140, 220), '#efe4cb', { lw: 4, seed: 2711 + i }); piece(g, rect(x - 56, y - 96, 112, 192), '#2f3a48', { lw: 3, seed: 2715 + i, edge: false }); }); piece(g, [[-460, -900], [0, -1120], [460, -900]], '#c4ab82', { lw: 6, seed: 2719 }); piece(g, [[-160, 900], [-160, 300], ...ell(0, 300, 160, 140, 12, Math.PI, TAU).slice(1), [160, 900]], '#5a3622', { lw: 6, seed: 2701 }); g.font = '700 46px "Old Standard"'; g.fillStyle = INK; g.textAlign = 'center'; piece(g, [[-200, -40], [200, -40], [190, 40], [-190, 40]], '#d9b350', { lw: 4, seed: 2702 }); g.fillText('TRÉSOR ROYAL', 0, 16); piece(g, rect(-2400, 900, 4800, 120), '#8f8676', { lw: 5, seed: 2703 }); });
    NAMEPL = textPlate('Ле Пелетье-Дефор', { size: 40, font: '700 40px "Old Standard"', col: '#2a1a10', bg: '#d9b350', seed: 2710 });
    CARRIAGE = card(-520, -620, 520, 160, 1.1, g => { piece(g, [[-460, -40], [-480, -420], [-380, -520], [380, -520], [480, -420], [460, -40], [300, 40], [-300, 40]], '#c9a03a', { lw: 7, seed: 2720 }); piece(g, [[-420, -80], [-430, -400], [420, -400], [430, -80]], '#7a1f28', { lw: 6, seed: 2721 }); piece(g, rect(-120, -380, 240, 200), '#2a2030', { lw: 5, seed: 2722 }); for (let i = 0; i < 3; i++) { g.save(); g.translate(-260 + i * 260, -560); g.scale(.8, .8); drawCard(g, sackCard(i)); g.restore(); } g.strokeStyle = '#e2c56b'; g.lineWidth = 5; g.strokeRect(-400, -390, 800, 300); });
    HORSE = card(-420, -560, 420, 40, 1.1, g => { piece(g, [[-300, -300], [-260, -380], [120, -380], [220, -460], [280, -540], [330, -520], [360, -440], [300, -400], [260, -300], [200, -260], [-300, -250]], '#6a4a32', { lw: 6, seed: 2730 }); piece(g, [[240, -470], [280, -500], [300, -440], [250, -430]], '#2a1a12', { lw: 3, seed: 2731 }); g.fillStyle = INK; g.beginPath(); g.arc(300, -480, 7, 0, TAU); g.fill(); piece(g, [[-300, -330], [-360, -200], [-330, -190], [-290, -300]], '#2a1a12', { lw: 3, seed: 2732 }); });
  },
  frame(lt, T) {
    const carK = clamp((lt - 1.25) / 1.6), follow = E.io2(clamp((lt - 1.3) / 1.6)), into = E.in3(inv(2.7, 3.06, lt));
    const carX = lerp(-1700, 900, E.io2(carK));
    const cam = { x: lerp(-120, 650, follow) + into * 400, y: lerp(260, 240, follow), z: lerp(420, 520, lt / 3) + into * 400, zoom: 1, roll: lerp(-2, 3, follow), f: lerp(1700, 900, follow), ap: .6 };
    const plateK = lt - .85;
    const L = [
      SCR(g => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#b7cfe0'); gr.addColorStop(1, '#f3dcb0'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }, { z: 1e9 }),
      Lr(2600, (g, T2) => { drawCard(g, FAC15);
        g.save(); g.translate(300, 150); if (plateK < 0) { drawCard(g, NAMEPL); } else { g.translate(0, plateK * plateK * 2400); g.rotate(plateK * 2); drawCard(g, NAMEPL); } g.restore();
        piece(g, [[440, 900], [480, -100], [520, -100], [480, 900]], '#8a6a45', { lw: 4, seed: 2740 }); piece(g, [[560, 900], [600, -100], [640, -100], [600, 900]], '#8a6a45', { lw: 4, seed: 2741 }); for (let i = 0; i < 8; i++) line(g, [[470 + i * 1, 820 - i * 120], [590 + i * 1, 820 - i * 120]], 6, '#8a6a45');
        drawPuppet(g, 'K', { x: 560, y: -60, s: 1.5, dir: -1, armN: [120 + Math.sin(lt * 20) * 15, 30], armF: [90, 20], face: { mouth: 'flat', look: [1, -.3] } }, T2);
        const wk = walk(step12(lt) * .7, .6); drawPuppet(g, 'M', Object.assign({}, wk, { x: lerp(-40, -560, clamp(lt / 3)), y: 900, s: 2.0, dir: -1, head: 14, noWig: true, armN: [70, 50], armF: [60, 50], face: { mouth: 'frown', look: [1, .6], eyes: .7, brow: 14 },
          propN: (gg) => { gg.save(); gg.translate(30, -10); piece(gg, rect(-70, -60, 140, 110), '#b8955e', { lw: 4, seed: 2750 }); gg.save(); gg.translate(0, -60); gg.scale(.35, .35); drawCard(gg, getPuppet('M').wigFront, 0, 260); gg.restore(); gg.restore(); } }), T2); }),
      Lr(1100, (g, T2) => { g.save(); g.translate(carX, 760); const bump = Math.abs(Math.sin(lt * 14)) * 6; g.save(); g.translate(560, -bump); g.scale(1.05, 1.05); drawCard(g, HORSE); g.restore(); line(g, [[300, -200], [400, -280]], 8, '#5a3a20');
        g.save(); g.translate(0, -bump); drawCard(g, CARRIAGE); g.save(); g.beginPath(); g.rect(-120, -380, 240, 200); g.clip(); drawPuppet(g, 'V', { x: 0, y: 40, s: 1.15, head: 6, armN: [170, -40], face: { mouth: 'grin', squint: .4, look: [-.2, 0] }, propN: (gg) => { gg.save(); gg.translate(0, -20); piece(gg, [[-60, 0], [-20, -40], [30, -46], [70, -10], [40, 6], [0, -8], [-30, 8]], '#211b1a', { lw: 3.5, seed: 2760 }); gg.restore(); } }, T2); g.restore(); g.restore();
        [-300, 300].forEach((wx, i) => { g.save(); g.translate(wx, 40); g.rotate(lt * 9); piece(g, ell(0, 0, 110, 110, 24), '#8a5a2e', { lw: 6, seed: 2770 + i }); for (let s = 0; s < 8; s++) line(g, [[0, 0], [Math.cos(s / 8 * TAU) * 100, Math.sin(s / 8 * TAU) * 100]], 7, '#5a3a20'); piece(g, ell(0, 0, 22, 22, 10), '#c9a03a', { lw: 3.5, seed: 2775 + i }); g.restore(); });
        if (lt > 2.0 && lt < 2.6) { const k = (lt - 2.0) / .6; g.save(); g.translate(-200, -600); g.globalCompositeOperation = 'lighter'; const gl = g.createRadialGradient(0, 0, 0, 0, 0, 120); gl.addColorStop(0, `rgba(255,240,180,${Math.sin(k * Math.PI)})`); gl.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = gl; g.fillRect(-120, -120, 240, 240); g.restore(); }
        g.restore(); }, { shadow: { dx: 30, dy: 30, b: 16, a: .3 } }),
      into > 0 ? Lr(lerp(1400, 300, into), g => { g.save(); g.translate(1350, 0); piece(g, [[-900, -2400], [900, -2400], [900, 2400], [-900, 2400]], '#3a2a20', { lw: 8, seed: 2780 }); g.restore(); }) : null,
      SCR((g, T2) => { rays(g, 900, -80, 25, 1800, 140, 600, .12, 3, T2); }),
    ];
    return { cam, layers: L, bg: '#b7cfe0', post: { vig: .45 } };
  }
});
// ===== S16 — the study; books pile up; the camera dives to the quill: the first frame again =====
let STUDY, DESK16, DOOR16, WIN16, MANU;
const S16T = { coin: .75, books0: 2.2, books1: 5.0, rise: 5.3, fill: 7.55, slide: 8.15, settle: 9.0, end: 9.5 };
function bookStack(g, n, seed, w = 230, grow = 1) { const r = rng(seed); let y = 0; const titles = ['CANDIDE', 'ZADIG', 'LETTRES', 'MÉROPE', 'ZAÏRE', 'HENRIADE', 'MICROMÉGAS', 'TRAITÉ']; const m = Math.floor(n * grow + 1e-6); for (let i = 0; i < m; i++) { const h = 46 + r() * 30, ww = w * (.8 + r() * .3), dx = (r() - .5) * 30; const c = ['#7a2e24', '#2f4a3a', '#5a3b20', '#3a3a5a', '#8a6a2a', '#6a2a3a'][(r() * 6) | 0]; piece(g, rect(dx - ww / 2, y - h, ww, h), c, { lw: 4, seed: seed + i, rough: .5 }); piece(g, rect(dx - ww / 2 + 10, y - h + 8, ww - 20, h - 16), '#efe3c4', { lw: 2.5, seed: seed + 50 + i, edge: false, light: false, tex: .2 }); g.fillStyle = '#3a2412'; g.font = `700 ${Math.min(26, h * .45)}px "Old Standard"`; g.textAlign = 'center'; g.fillText(titles[(seed + i) % titles.length], dx, y - h / 2 + 9); y -= h; } return y; }
SC.push({
  id: 'S16', t0: 53.12, t1: 62.6,
  init() { STUDY = panelWall(-2000, -2200, 2000, 1000, { upper: '#5a4a3a', lower: '#3a2618', patCol: '#d8b870', dado: 300 }); DESK16 = deskCard(1300, 440, { col: '#5a3420', top: '#6b4024' }); WIN16 = windowCard(500, 900, { sky0: '#1c2347', sky1: '#3a4a7a' });
    DOOR16 = card(-260, -1100, 260, 20, 1, g => { piece(g, rect(-250, -1080, 500, 1100), '#2a1a10', { lw: 6, seed: 2800 }); });
    MANU = card(-760, -1320, 760, 1320, .9, g => { piece(g, rect(-720, -1280, 1440, 2560), '#f5efe0', { lw: 6, seed: 2810, tex: .5, rough: 2 }); g.fillStyle = '#3a2412'; g.font = 'italic 48px "IM Fell"'; const lines = ['Candide, ou l\'Optimisme', '', 'Il y avait en Westphalie, dans le château', 'de monsieur le baron de Thunder-ten-tronckh,', 'un jeune garçon à qui la nature avait donné', 'les mœurs les plus douces...']; lines.forEach((l, i) => g.fillText(l, -620, -1000 + i * 80)); for (let i = 0; i < 18; i++) { g.strokeStyle = 'rgba(58,36,18,.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-620, -480 + i * 90); g.lineTo(560 - (i % 4) * 90, -480 + i * 90); g.stroke(); } });
  },
  frame(lt, T) {
    const T_ = S16T;
    if (lt >= T_.fill) { // top-down: manuscript slides off the ledger; settle into frame 1
      const u = E.io3(clamp((lt - T_.slide) / .7)), st = E.io3(clamp((lt - T_.fill) / (T_.settle - T_.fill)));
      const L = s1Layers(0, { noCircle: true });
      L.push(Lr(995, g => { g.save(); g.translate(-1600 * u, -900 * u); g.rotate(-.05 - u * .3); drawCard(g, MANU); g.restore(); }, { shadow: { dx: 16, dy: 22, b: 12, a: .35 * (1 - u) } }));
      L.push(SCR((g, T2) => bokeh(g, [[930, 170, 150, .55], [1010, 380, 90, .35], [780, 60, 70, .3], [120, 1780, 120, .18, '255,160,90']], T2)));
      const c0 = { x: LEDGER_TARGET[0], y: LEDGER_TARGET[1] + 120, z: 40, zoom: 1.32, roll: 0, f: 1000, ap: .55 };
      const cam = { x: c0.x - 200 * (1 - st), y: c0.y + 300 * (1 - st), z: c0.z + 420 * (1 - st), zoom: 1.32, roll: -14 * (1 - st), f: 1000, ap: .55 };
      return { cam, layers: L, bg: '#2b1c12', post: { vig: .6 } };
    }
    const grow = clamp((lt - T_.books0) / (T_.books1 - T_.books0)); const rise = E.io2(clamp((lt - T_.rise) / (T_.fill - T_.rise)));
    const riseY = E.out2(clamp((lt - T_.rise) / 1.0)); const cam = { x: lerp(-300, 40, clamp(lt / 5)) + rise * 180, y: lerp(-60, -160, clamp(lt / 5)) * (1 - riseY) + riseY * 470, z: lerp(330, 470, clamp(lt / 5)) + rise * 720, zoom: 1, roll: lerp(-2, 2, clamp(lt / 5)) - rise * 12, f: lerp(1300, 1240, rise), ap: .6 };
    const night = .5 + .5 * Math.sin(lt * 4.2 * clamp((lt - 2.2) / .5) * (lt < 5.2 ? 1 : 0));
    const doorK = clamp((lt - .1) / .35) * (1 - clamp((lt - 1.9) / .35));
    const coinK = clamp((lt - T_.coin) / .55);
    const L = [
      Lr(2400, (g, T2) => { drawCard(g, STUDY); g.save(); g.translate(500, -100); drawCard(g, WIN16); g.fillStyle = `rgba(255,220,150,${(1 - night) * .55})`; g.fillRect(-250, -1000, 500, 1000); g.restore(); g.save(); g.translate(1100, 300); drawCard(g, bookshelfCard2()); g.restore(); }),
      Lr(1900, (g, T2) => { g.save(); g.translate(-760, 300); drawCard(g, DOOR16); g.save(); g.translate(-250, 0); g.scale(1 - doorK * .75, 1); piece(g, rect(0, -1080, 500, 1100), '#6a3d20', { lw: 6, seed: 2805 }); g.restore(); if (doorK > .3) drawPuppet(g, 'C', { x: 60, y: 0, s: 1.55, head: 6, lean: coinK >= 1 ? 26 : 4, armN: coinK > .8 ? [150, -30] : [60, 60], armF: [50, 40], face: { mouth: coinK >= 1 ? 'smile' : 'o', open: .3, look: [1, 0] }, propN: coinK >= 1 ? (gg) => { gg.scale(.4, .4); drawCard(gg, coinCard(0)); } : null }, T2); g.restore(); }),
      Lr(1600, (g, T2) => { g.save(); g.translate(-420, 900); bookStack(g, 18, 2820, 260, grow); g.restore(); g.save(); g.translate(640, 900); bookStack(g, 22, 2840, 240, grow); g.restore(); }),
      Lr(1300, (g, T2) => { const ph = step12(lt); const writing = lt > 1.6;
        drawPuppet(g, 'V', { x: 60, y: 880, s: 2.15, lean: writing ? 8 : -10, head: writing ? -12 : 4, legN: [80, -30], legF: [86, -24], armN: coinK > 0 && coinK < 1 ? [lerp(40, 120, coinK), lerp(40, -40, coinK)] : writing ? [70 + Math.sin(ph * 26) * 6, 70] : [40, 40], armF: [60, 50], face: { mouth: 'smirk', squint: .3, look: writing ? [.9, .9] : [1, .4] } }, T2);
        g.save(); g.translate(380, 900); g.scale(1.1, 1.1); drawCard(g, sackCard(1)); g.restore();
        if (coinK > 0 && coinK < 1) { g.save(); g.translate(lerp(260, -980, coinK), lerp(240, 80, coinK) - Math.sin(coinK * Math.PI) * 420); g.scale(Math.cos(coinK * 30) * .5, .5); drawCard(g, coinCard(0)); g.restore(); } }),
      Lr(1240, (g, T2) => { g.save(); g.translate(150, 900); drawCard(g, DESK16); g.restore(); g.save(); g.translate(220, 430); g.rotate(-.04); piece(g, rect(-170, -26, 340, 52), '#f5efe0', { lw: 3.5, seed: 2850 }); g.restore(); g.save(); g.translate(-280, 450); const melt = 1 - grow * .55; g.scale(.75, .75 * melt + .25 * (1 - melt)); drawCandle(g, T2); g.restore(); }),
      Lr(1050, (g, T2) => { g.save(); g.translate(-560, 1150); bookStack(g, 26, 2860, 300, grow); g.restore(); g.save(); g.translate(720, 1150); bookStack(g, 30, 2880, 300, grow); g.restore(); }),
      SCR((g, T2) => { if (lt > T_.fill - .35) { g.fillStyle = `rgba(245,239,224,${clamp((lt - (T_.fill - .35)) / .35)})`; g.fillRect(0, 0, W, H); } }),
    ];
    return { cam, layers: L, bg: '#3a2618', post: { vig: .55, tint: lt > 2.2 && lt < 5.2 ? (night > .5 ? '#5a70b0' : '#ffc070') : '#ffc070', tintA: .16 } };
  }
});
function bookshelfCard2() { return memo('shelf16', () => bookshelfCard(700, 1500, 2890)); }
