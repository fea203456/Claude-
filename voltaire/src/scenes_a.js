// ---- scenes 1-2 ----
const Lr = (z, draw, o = {}) => Object.assign({ z, draw }, o);
const SCR = (draw, o = {}) => Object.assign({ z: -1, screen: true, draw }, o);
const shakeAt = (lt, t0, amp = 14, dur = .35) => { const k = lt - t0; if (k < 0 || k > dur) return null; const d = Math.exp(-k * 12); return [noise1(k * 60) * amp * d, noise1(k * 60 + 9) * amp * d]; };
// stamp/slam animation for a plate: returns {s, rot, a, landed}
function slam(lt, t0, o = {}) { const k = lt - t0, dur = o.dur || .16; if (k < 0) return null; const u = clamp(k / dur); const s = u < 1 ? lerp(o.s0 || 1.9, 1, E.in2(u)) : 1 - wob(k - dur, 4, 9) * .06; return { s, rot: lerp(o.r0 ?? -14, o.r1 ?? -5, E.out2(u)), a: clamp(k / .05), landed: u >= 1 }; }
function dustPuff(g, k, x, y, n = 10, r0 = 30, seed = 1) { if (k < 0 || k > .8) return; const r = rng(seed); g.save(); for (let i = 0; i < n; i++) { const a = r() * TAU, sp = 60 + r() * 140, rr = r0 * (.5 + r()) * (1 + k * 1.5); g.globalAlpha = (1 - k / .8) * .45; g.fillStyle = '#efe3c8'; g.beginPath(); g.arc(x + Math.cos(a) * sp * E.out3(k / .8), y + Math.sin(a) * sp * .5 * E.out3(k / .8), rr * .4, 0, TAU); g.fill(); } g.restore(); }
// ===== S1 — the quill circles the error =====
const S1T = { circle0: .32, circle1: 1.5, stamp: 1.92, up: 2.24 };
let STAMP1 = null, QBIG = null;
function s1Layers(lt, o = {}) { // shared with the ending (S16) so the loop frame matches exactly
  const prog = o.noCircle ? 0 : keyed([[S1T.circle0, 0], [S1T.circle1, 1, 'io2']])(lt);
  const lift = o.noCircle ? 0 : keyed([[0, 0], [.22, -14, 'out2'], [S1T.circle0, 0, 'in2'], [S1T.circle1, 0], [1.75, 90, 'out3']])(lt);
  const p = prog > 0 && prog < 1 ? circlePoint(prog) : prog >= 1 ? [circlePoint(1)[0] + (lt - S1T.circle1) * 400, circlePoint(1)[1] - (lt - S1T.circle1) * 260] : circlePoint(0);
  const qx = (o.qx ?? 0) + p[0], qy = (o.qy ?? 0) + p[1];
  const out = [
    Lr(1000, (g) => { drawCard(g, ledgerCard()); inkCircle(g, prog); }),
    Lr(985, (g, T) => { [[-330, 930, 0, .9], [-170, 1010, 1, .8], [380, 980, 0, .85]].forEach(([x, y, v, s]) => { g.save(); g.translate(x, y); g.scale(s, s); g.rotate(v + x * .01); drawCard(g, coinCard(v)); g.restore(); }); }, { shadow: { dx: 8, dy: 12, b: 6, a: .35 } }),
    Lr(930 - lift, (g, T) => { g.save(); g.translate(qx, qy); g.rotate(-.62 + Math.sin(lt * 3) * .02); g.scale(2.6, 2.6); drawCard(g, quillCard()); g.restore(); }, { shadow: { dx: 26 + lift * .4, dy: 40 + lift * .5, b: 10 + lift * .1, a: .42 } }),
  ];
  return out;
}
SC.push({
  id: 'S1', t0: 0, t1: 2.72,
  init() { STAMP1 = textPlate('ОШИБКА\nРАСЧЁТОВ', { size: 96, col: '#b3201b', bg: '#f1e4c6', stamp: true, seed: 21, lw: 6 }); },
  frame(lt, T) {
    const st = slam(lt, S1T.stamp, { r0: -16, r1: -7 });
    const L = s1Layers(lt);
    if (st) L.push(Lr(990 - (1 - clamp((lt - S1T.stamp) / .16)) * 420, (g) => { g.save(); g.translate(30, -330); g.rotate(st.rot * DEG); g.scale(st.s, st.s); drawCard(g, STAMP1); g.restore(); dustPuff(g, lt - S1T.stamp - .16, 30, -280, 12, 30, 4); }, { shadow: { dx: 10, dy: 16, b: 8, a: .4 } }));
    L.push(SCR((g, T) => bokeh(g, [[930, 170, 150, .55], [1010, 380, 90, .35], [780, 60, 70, .3], [120, 1780, 120, .18, '255,160,90']], T)));
    const up = E.in3(inv(S1T.up, 2.72, lt));
    const cam = { x: LEDGER_TARGET[0] + lt * 10 + up * 120, y: LEDGER_TARGET[1] + 120 - lt * 14 - up * 260, z: 40 + lt * 26 - up * 1500, zoom: 1.32, roll: lt * 1.8 + up * 16, f: 1000, ap: .55 };
    return { cam, layers: L, shake: shakeAt(lt, S1T.stamp + .16, 16), bg: '#2b1c12', post: { vig: .6 } };
  }
});
// ===== S2 — Voltaire walks out of the Treasury; the guard holds the door =====
let ARCH = null, HALL = null, DOORL = null, LEGAL = null;
function hallCard() {
  return card(-1500, -1700, 1500, 1800, .9, g => {
    piece(g, rect(-1500, -1700, 3000, 2600), '#4a2e1c', { lw: 0, edge: false, tex: .6 });
    for (let i = -3; i <= 3; i++) { const x = i * 420; piece(g, [[x - 150, 700], [x - 150, -700], ...ell(x, -700, 150, 170, 18, Math.PI, TAU).slice(1), [x + 150, 700]], '#7a4c2c', { lw: 6, seed: 700 + i, tex: .5 }); piece(g, [[x - 110, 700], [x - 110, -680], ...ell(x, -680, 110, 130, 16, Math.PI, TAU).slice(1), [x + 110, 700]], '#2c1a10', { lw: 5, seed: 720 + i, tex: .4 }); }
    piece(g, rect(-1500, 640, 3000, 1200), '#5a3a22', { lw: 5, seed: 740 }); g.save(); g.strokeStyle = 'rgba(30,15,5,.4)'; g.lineWidth = 4; for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(i * 60, 660); g.lineTo(i * 260, 1800); g.stroke(); } g.restore();
    g.save(); g.globalCompositeOperation = 'screen'; const gr = g.createRadialGradient(0, -200, 50, 0, -200, 1100); gr.addColorStop(0, 'rgba(255,200,110,.75)'); gr.addColorStop(.5, 'rgba(255,150,60,.25)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(-1500, -1700, 3000, 2600); g.restore();
  });
}
function archCard() {
  return card(-1500, -2000, 1500, 1300, .9, g => {
    const hole = [[-330, 700], [-330, -380], ...ell(0, -380, 330, 360, 30, Math.PI, TAU).slice(1), [330, 700]];
    const P = new Path2D(); const outer = rect(-1500, -2000, 3000, 3300); outer.forEach((p, i) => i ? P.lineTo(...p) : P.moveTo(...p)); P.closePath();
    const Hh = cut(hole, 1.5, 801); P.addPath(Hh);
    g.save(); g.fillStyle = '#c9b48c'; g.fill(P, 'evenodd'); g.clip(P, 'evenodd'); g.globalCompositeOperation = 'overlay'; g.globalAlpha = .6; g.fillStyle = pat(g, 1); g.fillRect(-1500, -2000, 3000, 3300); g.restore();
    g.save(); g.clip(P, 'evenodd'); g.strokeStyle = 'rgba(80,60,40,.35)'; g.lineWidth = 3; for (let y = -1980; y < 1300; y += 90) { g.beginPath(); g.moveTo(-1500, y); g.lineTo(1500, y); g.stroke(); for (let x = -1500 + ((y / 90) % 2) * 90; x < 1500; x += 180) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 90); g.stroke(); } } g.restore();
    g.lineWidth = 7; g.strokeStyle = INK; g.stroke(Hh);
    // voussoirs around the arch
    for (let i = 0; i <= 12; i++) { const a = Math.PI + i / 12 * Math.PI, x = Math.cos(a), y = Math.sin(a); piece(g, [[x * 340, -380 + y * 370], [x * 440, -380 + y * 470], [Math.cos(a + .2) * 440, -380 + Math.sin(a + .2) * 470], [Math.cos(a + .2) * 340, -380 + Math.sin(a + .2) * 370]].slice(0, i < 12 ? 4 : 0), i % 2 ? '#bda57a' : '#d3bf96', { lw: 4.5, seed: 820 + i }); }
    piece(g, [[-110, -900], [110, -900], [100, -790], [-100, -790]], '#d9b350', { lw: 5, seed: 850 });
    g.font = '700 42px "Old Standard"'; g.fillStyle = INK; g.textAlign = 'center'; g.fillText('TRÉSOR ROYAL', 0, -830);
    piece(g, [[-500, 700], [500, 700], [520, 760], [-520, 760]], '#9c8763', { lw: 5, seed: 860 });
  });
}
function doorCard() { return card(-20, -1100, 480, 720, 1, g => { piece(g, [[0, 700], [0, -720], [440, -1060], [460, 700]], '#6a3d20', { lw: 6, seed: 870 }); for (let i = 0; i < 4; i++) piece(g, [[50, 600 - i * 330], [50, 360 - i * 330 - i * 40], [400, 300 - i * 380], [410, 560 - i * 330]], '#7c4a28', { lw: 4, seed: 880 + i }); piece(g, ell(380, 0, 20, 20, 14), '#c9a24a', { lw: 3.5, seed: 890 }); }); }
SC.push({
  id: 'S2', t0: 2.72, t1: 5.06,
  init() { HALL = hallCard(); ARCH = archCard(); DOORL = doorCard(); LEGAL = textPlate('ЛЕГАЛЬНО ✓', { size: 84, col: '#1f5a2a', bg: '#f3e8cc', stamp: true, seed: 31 }); },
  frame(lt, T) {
    const vz = lerp(1700, 880, E.io2(clamp(lt / 2.2))), vx = lerp(-40, 60, clamp(lt / 2.3)), ph = step12(lt) * 1.25;
    const wk = walk(ph, .9);
    const coinK = lt - 1.0;
    const st = slam(lt, .1, { r0: -20, r1: -8, s0: 2.2 });
    const L = [
      Lr(2500, g => drawCard(g, HALL)),
      Lr(2300, g => { g.save(); g.translate(-520, 560); g.scale(1.6, 1.6); drawCard(g, chestCard()); g.restore(); g.save(); g.translate(560, 600); g.scale(-1.5, 1.5); drawCard(g, chestCard()); g.restore(); }),
      Lr(vz, (g, T2) => {
        drawPuppet(g, 'V', Object.assign({}, wk, { x: vx, y: 700, s: 2.05, lean: 5, head: -6, armN: [24 + wk.armN[0] * .3, 10], armF: [150, -20], face: { mouth: 'smirk', look: [1, -.1], squint: .25 },
          before: (gg) => { gg.save(); gg.translate(-60, -B_V().neck - 10); gg.rotate(-.5); gg.scale(1.05, 1.05); drawCard(gg, sackCard(0)); gg.restore(); },
          propN: (gg) => { gg.save(); gg.translate(0, 120); gg.rotate(.15); gg.scale(.95, .95); drawCard(gg, sackCard(1)); gg.restore();
            if (st) { gg.save(); gg.translate(10, 150); gg.rotate(st.rot * DEG + .1); gg.scale(st.s * .42, st.s * .42); drawCard(gg, LEGAL); gg.restore(); } } }));
      }, { shadow: { dx: -30, dy: 40, b: 18, a: .3 } }),
      Lr(1180, g => drawCard(g, ARCH)),
      Lr(1150, g => { g.save(); g.translate(320, 0); g.scale(lerp(.55, .42, E.out2(clamp(lt / 1.5))), 1); drawCard(g, DOORL); g.restore(); }),
      Lr(1100, g => drawPuppet(g, 'G', { x: 330, y: 740, s: 1.75, dir: -1, lean: lerp(4, 22, E.io2(clamp((lt - .2) / .6))), head: 10, armN: [70, 60], armF: [100, -10], face: { mouth: 'flat', eyes: .6 } }), { shadow: { dx: -30, dy: 30, b: 16, a: .3 } }),
      coinK > 0 ? Lr(lerp(900, 90, E.in2(clamp(coinK / 1.3))), g => { const u = clamp(coinK / 1.3); g.save(); g.translate(lerp(40, -180, u), lerp(-520, -1300, E.in2(u))); g.scale(Math.cos(coinK * 14) * 1.2, 1.2); drawCard(g, coinCard(0)); g.restore(); }) : null,
      SCR((g, T2) => { rays(g, W / 2, 520, 180, 1500, 260, 900, .16, 5, T2); dust(g, T2, 3, 60, [0, 300, W, 1400]); }),
    ];
    const u2 = clamp(lt / 2.34); const cam = { x: lerp(-60, 90, u2), y: lerp(-40, -330, E.sine(u2)), z: lerp(330, -200, E.io2(u2)), zoom: 1, roll: lerp(-4, 2, u2), f: vz, ap: .6, px: 0 };
    return { cam, layers: L, shake: shakeAt(lt, .1 + .16, 10), bg: '#1c120a', post: { vig: .55 } };
  }
});
function B_V() { return BUILD.lean; }
