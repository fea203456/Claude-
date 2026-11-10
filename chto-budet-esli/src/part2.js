// Part 2 — variant A: get up. Freeze -> stamp -> press -> stretch -> curtains -> whip to kitchen -> toast -> end card.
'use strict';
(() => {
  const C = CUES.p2, DUR = C.dur;
  const camKeys = [
    [0, 40, -170, 1560, -.008], [C.press - .2, 200, -60, 1250, 0], [C.kick, 0, -70, 1150, 0], [C.stretch + .3, -130, -250, 1120, -.012],
    [C.hop, -150, -170, 1200, 0], [C.open - .3, -120, -300, 1080, .01], [C.open + .9, -110, -340, 940, 0], [C.whip, -170, -300, 1020, 0],
    [C.whip + .5, -2480, -200, 1100, 0], [C.pop, -2430, -150, 1000, 0], [C.end - .4, -2420, -150, 930, .012], [C.end + .6, -2310, 60, 1000, 0], [DUR, -2300, 70, 1060, -.006]
  ];
  const camAt = t => keyed(camKeys, t);
  function render(t) {
    const [x, y, cz, rot] = camAt(t); CAM = { x, y, cz, rot, focus: 0, ap: .25 };
    const [x2] = camAt(t + .004), whipK = Math.abs(x2 - x) / .004 * (F / cz) * .016;
    const grey = .85 * (1 - smt(t, C.color, C.color + .35));
    const pressed = t > C.press;
    // Tema
    let temaInBed = null, temaStand = null;
    if (t < C.kick + .1) temaInBed = { lidR: pressed ? .25 : .1, lidL: pressed ? .3 : .82, look: pressed ? [.6, -.2] : [-.8, -.6], brow: pressed ? .5 : -.4, mouth: pressed ? 'smile' : 'flat' };
    else if (t < C.whip + .25) {
      let px = -330, py = 222, sx = 1, sy = 1, armL = null, armR = null, mouth = 'smile', lid = 0, run = null, flip = false, look = [0, 0];
      const j = seg(t, C.kick + .1, C.kick + .55);
      py -= Math.sin(Math.PI * j) * 200; if (t > C.kick + .55) { const w = wob(t - C.kick - .55, 20, 6); sy -= w * .25; sx += w * .2; }
      if (t < C.kick + .55) { sy = 1 + .15 * Math.sin(Math.PI * j); armL = [-120, -330]; armR = [120, -330]; mouth = 'grin'; }
      const st = seg(t, C.stretch, C.stretch + 1.1);
      if (st > 0 && st < 1) { const k = Math.sin(Math.PI * st); sy += .24 * k; sx -= .1 * k; armL = [-60, lerp(-60, -430, k)]; armR = [60, lerp(-60, -430, k)]; mouth = 'yawn'; lid = .85 * k; }
      const h = seg(t, C.hop, C.hop + .45);
      if (h > 0) { px = lerp(-330, -170, h); py = lerp(222, 470, h * h) - Math.sin(Math.PI * h) * 120; if (h >= 1) { const w = wob(t - C.hop - .45, 20, 6); sy = 1 - w * .2; sx = 1 + w * .15; } }
      const wk = seg(t, C.hop + .55, C.open - .3);
      if (wk > 0) { px = lerp(-170, -110, eio(wk)); run = wk < 1 ? wk * 2 : null; look = [0, -.8]; }
      if (t > C.open - .35) { const o = smt(t, C.open - .1, C.open + .45); armL = [lerp(-40, -200, o), -400]; armR = [lerp(40, 200, o), -400]; look = [0, -.9]; mouth = 'o'; }
      if (t > C.open + .6) { const r = smt(t, C.open + .6, C.open + 1); look = [0, lerp(-.9, .1, r)]; mouth = 'grin'; lid = .45 * (1 - smt(t, C.open + 1.6, C.open + 2.2)); armL = [lerp(-200, -125, r), lerp(-400, -40, r)]; armR = [lerp(200, 150, r), lerp(-400, -330, r)]; }
      if (t > C.whip - .15) { run = (t - C.whip) * 3; flip = true; }
      temaStand = { x: px, y: py, sx, sy, armL, armR, mouth, lid, run, flip, look, hair: t < C.stretch ? .3 : .1, blush: .3 };
    } else {
      // kitchen
      const wk = seg(t, C.whip + .35, C.pop - .25), px = lerp(-1900, -2290, eout(wk)), run = wk < 1 ? (t - C.whip) * 3 : null;
      const munch = t > C.catch ? Math.abs(Math.sin((t - C.catch) * 9)) : 0;
      const wave = t > C.end + .4 ? Math.sin((t - C.end) * 8) : null;
      const catchK = smt(t, C.pop + .25, C.catch);
      temaStand = { x: px, y: 470, flip: false, run, look: t < C.pop ? [-.6, 0] : (t < C.catch ? [-.4, -.9 + catchK * .9] : [0, 0]), mouth: t > C.catch ? 'smile' : (t > C.pop ? 'o' : 'smile'), toast: t > C.catch, mouthOpen: .3 + munch * .4,
        armL: t > C.pop ? [lerp(-125, -70, catchK), lerp(-40, -170, catchK)] : null, armR: wave != null ? [150, -360 + wave * 20] : null, lid: t > C.catch ? .35 : 0, sy: 1 + munch * .03, blush: .5, hair: .1 };
    }
    const toastFly = t > C.pop && t < C.catch;
    world(t, {
      tod: 1, curtain: lerp(.18, 1, smt(t, C.open - .1, C.open + .5)), sunRays: smt(t, C.open, C.open + .8), bump: .2,
      blanketLift: t < C.kick ? 0 : eout(seg(t, C.kick, C.kick + .45)),
      temaInBed,
      dzyn: { ring: pressed ? 0 : 1, time: t < C.stretch + 1 ? 420 : 421, mood: pressed ? 'happy' : 'furious', press: smt(t, C.press - .08, C.press) * (1 - smt(t, C.press + .3, C.press + .5)), sy: 1 - wob(t - C.press, 20, 6) * .15, look: [0, 0] },
      arm: t < C.kick ? { from: [40, 150], hand: [BUTTON[0] - 6, lerp(BUTTON[1] - 70, BUTTON[1] - 14, smt(t, C.press - .12, C.press)) - smt(t, C.press + .2, C.kick) * 60], mode: 'point' } : null,
      kitchen: { toastPop: t < C.pop ? 0 : eout(seg(t, C.pop, C.pop + .15)) * (1 - eio(seg(t, C.pop + .3, C.pop + .6))), toastGone: t > C.pop, steam: 1 },
      extra: c => {
        if (temaStand) tema(c, Object.assign({ t }, temaStand));
        if (toastFly) { const k = seg(t, C.pop, C.catch), tx = lerp(-2458, -2290, k), ty = lerp(80, -170, k) - Math.sin(Math.PI * k) * 380; c.save(); c.translate(tx, ty); c.rotate(k * 7); rr(c, -34, -45, 68, 90, 18); ink(c, '#e8a85a', 6); rr(c, -24, -35, 48, 70, 12); c.fillStyle = '#f7d394'; c.fill(); c.restore(); }
        bubble(c, 160, -640, 470, 170, 'Доброе утро!', t, C.open + 1.0, C.whip - .2, 60, [-1, 1]);
        if (t > C.press && t < C.kick + .5) { c.save(); c.globalAlpha = 1 - seg(t, C.kick, C.kick + .5); txt(c, 'щёлк', CLOCK.x + 40, -130, 72, { font: FP(72), fill: '#fff' }); c.restore(); }
      }
    });
    grade(1);
    whip(whipK);
    greyFrame(grey);
    screen(c => {
      if (t < C.color + 1.2) { c.save(); c.globalAlpha = 1 - seg(t, C.color + .8, C.color + 1.2); stamp(c, 'ВАРИАНТ А', W / 2, 330, 104, t, C.stamp, '#ff9a1e'); c.restore(); }
      plate(c, W / 2, 400, 760, 170, t, C.plate, { fill: '#fff', rot: -.03, out: C.end - .2, draw: c => { txt(c, '7:20', -220, 32, 92, { fill: '#ff9a1e', lw: 12, shadow: false }); txt(c, 'времени полно', 110, 24, 52, { font: FP(52), fill: INK, lw: 0, shadow: false }); } });
      if (t > C.end) {
        stamp(c, 'ВАРИАНТ А', W / 2, 300, 96, t, C.end, '#ff9a1e');
        dropText(c, 'спокойное утро', W / 2, 470, 78, t, C.end + .35, { font: FP(78), fill: '#fff', stagger: .03 });
        plate(c, W / 2, 1600, 880, 200, t, C.end + 1.2, { fill: '#fff', draw: c => {
          txt(c, 'А если выбрать Б?', 0, -16, 62, { fill: '#6b3df0', lw: 10, shadow: false });
          txt(c, 'Смотри часть 3  ▶', 0, 60, 50, { font: FP(50), fill: INK, lw: 0, shadow: false });
        } });
      }
    });
    grain(t);
  }
  window.PART2 = { dur: DUR, render };
})();
