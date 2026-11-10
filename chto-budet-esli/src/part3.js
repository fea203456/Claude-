// Part 3 — variant B: snooze x8 -> 7:40 shock -> speedrun through the house -> bus leaves -> end card.
'use strict';
(() => {
  const C = CUES.p3, DUR = C.dur, SL = C.slaps, RG = C.rings;   // SL[k] = k-th slap, RG[k] = ring before slap k (k>=1)
  const nSlaps = t => SL.filter(s => t >= s).length;
  const busX0 = -4830;
  const busX = t => t < C.busGo ? busX0 : busX0 - .5 * 1900 * Math.pow(t - C.busGo, 2);
  // Tema's run path (world x) after jumping out of bed
  const RUNK = [[C.out + .35, -250], [C.socks, -1050], [C.toastT, -1750], [C.door, -3450], [C.door + .5, -3950], [C.close, -4400], [C.busGo + .1, -4470], [C.stop, -5250], [DUR, -5260]];
  const runX = t => { if (t <= RUNK[0][0]) return RUNK[0][1]; for (let i = 0; i < RUNK.length - 1; i++) if (t < RUNK[i + 1][0]) { const k = (t - RUNK[i][0]) / (RUNK[i + 1][0] - RUNK[i][0]); return lerp(RUNK[i][1], RUNK[i + 1][1], i === RUNK.length - 3 ? eout(k) : k); } return RUNK[RUNK.length - 1][1]; };
  const camKeys = [[0, 40, -170, 1560, -.008], [C.color + .4, 60, -60, 1330, 0], [3.6, 70, -50, 1220, .012], [C.lastRing, 70, -30, 1060, -.014], [C.wake, 60, -30, 1040, 0],
    [C.zoomLCD, 470, -30, 470, .04], [C.zoomLCD + .35, 470, -30, 450, .04], [C.shock, -360, -20, 600, -.03], [C.out - .2, -340, -20, 680, -.02], [C.out + .35, -300, 60, 1050, 0]];
  for (let tt = C.out + .7; tt < C.stop + .6; tt += .35) camKeys.push([tt, runX(tt + .15) - 120, 90, tt > C.door ? 1080 : 930, 0]);
  camKeys.push([C.stop + 1.2, -5180, 120, 1080, 0], [C.end, -5220, 150, 1000, 0], [DUR, -5235, 150, 1040, -.006]);
  function render(t) {
    let [x, y, cz, rot] = keyed(camKeys, t);
    const k = nSlaps(t), lastSlap = k ? SL[k - 1] : -9, punch = Math.exp(-Math.max(0, t - lastSlap) * 9) * (t > lastSlap ? 1 : 0);
    if (t < C.wake) { cz -= punch * 70; rot += punch * Math.sin(t * 80) * .01; }
    if (t > C.shock && t < C.shock + .5) { const s = 1 - seg(t, C.shock, C.shock + .5); x += Math.sin(t * 90) * 10 * s; y += Math.cos(t * 77) * 10 * s; }
    CAM = { x, y, cz, rot, focus: 0, ap: .25 };
    const [x2] = keyed(camKeys, t + .004), whipK = Math.abs(x2 - x) / .004 * (F / cz) * .016;
    const grey = .85 * (1 - smt(t, C.color, C.color + .35));
    // ringing: from start until first slap, then RG[i]..SL[i], plus final ring at lastRing..wake
    let ring = t < SL[0] ? 1 : 0; for (let i = 1; i < SL.length; i++) if (t >= RG[i] && t < SL[i]) ring = 1; if (t >= C.lastRing && t < C.out) ring = 1;
    const time = 420 + 5 * k;
    // arm: rests, lifts on ring, slaps
    let arm = null;
    if (t < C.wake) {
      const rest = [300, 90], up = [500, -230], hit = [BUTTON[0], BUTTON[1] - 4];
      let hand = rest, mode = 'fist';
      for (let i = 0; i < SL.length; i++) {
        const r0 = i === 0 ? C.color + .3 : RG[i], s0 = SL[i];
        if (t >= r0 - .05 && t < s0 + .35) {
          const lift = smt(t, r0, lerp(r0, s0, .7)), down = smt(t, lerp(r0, s0, .78), s0), back = smt(t, s0 + .1, s0 + .35);
          hand = [lerp(lerp(rest[0], up[0], lift), hit[0], down), lerp(lerp(rest[1], up[1], lift), hit[1], down)];
          hand = [lerp(hand[0], rest[0], back), lerp(hand[1], rest[1], back)]; mode = down > .3 && back < .5 ? 'slap' : 'fist';
        }
      }
      arm = { from: [40, 150], hand, mode };
    }
    const squash = t >= lastSlap ? Math.exp(-(t - lastSlap) * 6) : 0;
    const dz = { ring, time, mood: ring ? (k > 3 ? 'furious' : 'angry') : (t - lastSlap < .5 ? 'dizzy' : (k > 4 ? 'angry' : 'neutral')), sy: 1 - squash * .45 + wob(t - lastSlap - .15, 18, 6) * .1, sx: 1 + squash * .3, press: squash, dent: k / 8, bandage: k >= 4, lcd: k >= 8 ? '#ff6b6b' : '#7dffb0' };
    // Tema
    let temaInBed = null, temaStand = null;
    const shockK = smt(t, C.shock - .05, C.shock + .12);
    if (t < C.out) {
      const awake = smt(t, C.wake, C.wake + .25);
      temaInBed = { y: 330 - shockK * 130 - smt(t, C.wake, C.wake + .3) * 30, lid: t < C.wake ? 1 : lerp(1, 0, awake), lidR: t < C.wake ? (ring ? .9 : 1) : lerp(.9, 0, awake), lidL: t < C.wake ? (ring ? .95 : 1) : lerp(1, .1, awake), mouth: t > C.shock ? 'scream' : (ring ? 'flat' : 'sleepy'),
        brow: t > C.shock ? 1 : (ring ? -.6 : 0), look: t < C.shock ? [.8, -.2] : [0, 0], pop: 1 + shockK * .42, pupil: 1 - shockK * .55, hair: shockK, sweat: shockK, blush: 0 };
    } else {
      const jt = seg(t, C.out, C.out + .35); let px = lerp(-330, -250, jt), py = lerp(222, 470, jt * jt) - Math.sin(Math.PI * jt) * 160;
      if (t > C.out + .35) { px = runX(t); py = 470; }
      const running = t > C.out + .35 && t < C.stop;
      const spd = running ? 3.4 : 0, ph = (t - C.out) * spd;
      const hopping = t > C.socks && t < C.toastT;
      if (hopping) py -= Math.abs(Math.sin(t * 11)) * 70;
      const pant = t > C.stop ? Math.sin(t * 9) : 0;
      temaStand = { x: px, y: py, rot: running ? -.16 : .05 * pant, run: running && !hopping ? ph : null, s: 1,
        sy: 1 + pant * .04 + (hopping ? -wob((t * 11 / Math.PI) % 1, 20, 8) * .05 : 0),
        pop: t < C.out + 1 ? 1.4 : 1.1, pupil: .7, hair: t < C.stop ? 1 : .6, sweat: 1, brow: t > C.close + .2 ? -.8 : .6,
        mouth: t > C.socks && t < C.toastT ? 'wavy' : (t > C.close ? (t > C.stop ? 'o' : 'scream') : 'grin'), mouthOpen: .5 + pant * .3,
        toothbrush: t > C.out + .35 && t < C.socks, toast: t > C.toastT + .45 && t < C.close,
        sockCol: sd => t > C.socks + .3 ? (sd < 0 ? '#ff5d73' : '#3ad07a') : '#fff',
        armL: running ? [-130 + Math.sin(ph * 6.28) * 50, -50 - Math.cos(ph * 6.28) * 30] : (t > C.stop ? [-150, -220 + pant * 10] : null),
        armR: hopping ? [120, 0] : (running ? [130 - Math.sin(ph * 6.28) * 50, -50 + Math.cos(ph * 6.28) * 30] : null), look: t > C.busGo ? [-.9, 0] : [-.7, -.1] };
    }
    world(t, {
      tod: 1, curtain: .18, bump: ring ? .5 : .2, blanketLift: t < C.out ? 0 : eout(seg(t, C.out, C.out + .4)),
      temaInBed, dzyn: dz, arm,
      kitchen: { toastPop: t < C.toastT ? 0 : eout(seg(t, C.toastT, C.toastT + .12)) * (1 - seg(t, C.toastT + .3, C.toastT + .5)), toastGone: t > C.toastT + .3, steam: 1 },
      bus: { x: busX(t), doors: t < C.close ? 0 : smt(t, C.close, C.close + .25), moving: t > C.busGo },
      extra: c => {
        if (t < C.wake) zzz(c, HEAD[0] + 60, HEAD[1] - 170, t, ring ? .3 : 1);
        if (temaStand) tema(c, Object.assign({ t }, temaStand));
        if (t > C.busGo) dust(c, busX(t) + 520, 470, t, C.busGo, 6);
        if (t > C.close && t < C.stop + .5) for (let i = 0; i < 6; i++) dust(c, runX(C.close + i * .25) + 60, 470, t, C.close + i * .25, 3);
        if (t > C.stop) dust(c, -5250, 470, t, C.stop, 5);
        if (ring && t < C.wake) { c.save(); c.globalAlpha = .9; txt(c, 'ДЗЫНЬ!', CLOCK.x - 20 + Math.sin(t * 70) * 5, CLOCK.y - 440, 70, { fill: '#ff4d5e' }); c.restore(); }
        // slap "+5" pops
        for (let i = 0; i < SL.length; i++) { const lt = t - SL[i]; if (lt > 0 && lt < .7) { c.save(); c.globalAlpha = 1 - seg(lt, .4, .7); const sc = spring(lt, 18, 8); c.translate(CLOCK.x + 120, CLOCK.y - 300 - lt * 140); c.scale(sc, sc); txt(c, '+5', 0, 0, 80, { fill: '#ffcf3a' }); c.restore(); } }
        if (t > C.close && t < C.close + .8) { c.save(); c.globalAlpha = 1 - seg(t, C.close + .5, C.close + .8); txt(c, 'пш-ш-ш', busX0 + 330, -340, 64, { font: FP(64), fill: '#fff' }); c.restore(); }
      }
    });
    grade(1);
    whip(Math.min(whipK, 140));
    greyFrame(grey);
    screen(c => {
      if (t < C.color + 1.2) { c.save(); c.globalAlpha = 1 - seg(t, C.color + .8, C.color + 1.2); stamp(c, 'ВАРИАНТ Б', W / 2, 330, 104, t, C.stamp, '#6b3df0'); c.restore(); }
      // snooze counter
      if (t > C.color + 1.2 && t < C.shock) {
        const lt = t - lastSlap, sc = 1 + wob(lt, 22, 7) * .25, a = 1 - seg(t, C.zoomLCD, C.zoomLCD + .2);
        c.save(); c.globalAlpha = a; c.translate(W / 2, 330); c.scale(sc, sc);
        plate(c, 0, 0, 640, 170, t, C.color + 1.2, { fill: '#fff', draw: c => { txt(c, `ещё 5 минут × ${k}`, 0, 22, 62, { fill: '#6b3df0', lw: 10, shadow: false }); } });
        c.restore();
      }
      if (t > C.shock) {
        const a = 1 - seg(t, C.out + .2, C.out + .5); speedLines(c, a * (1 - seg(t, C.shock + .6, C.out)), W / 2, 1050, t);
        c.save(); c.globalAlpha = a; c.translate(W / 2 + Math.sin(t * 60) * 6, 430); const sc = spring(t - C.shock, 16, 7); c.scale(sc, sc); c.rotate(-.06);
        txt(c, '7:40?!', 0, 0, 200, { fill: '#ff4d5e' }); c.restore();
      }
      const cap = (str, t0, t1, col) => plate(c, W / 2, 360, 820, 150, t, t0, { fill: '#fff', rot: -.03, out: t1, draw: c => txt(c, str, 0, 20, 58, { fill: col, lw: 10, shadow: false }) });
      cap('зубы — за 3 секунды', C.out + .5, C.socks - .15, '#3ab0c0');
      cap('носки… разные', C.socks + .2, C.toastT - .15, '#ff5d73');
      cap('завтрак — на бегу', C.toastT + .2, C.door, '#e8913a');
      if (t > C.close + .15 && t < C.end) { c.save(); c.globalAlpha = 1 - seg(t, C.end - .3, C.end); dropText(c, 'НЕ-Е-ЕТ!', W / 2, 480, 120, t, C.close + .2, { fill: '#fff', stagger: .04 }); c.restore(); }
      if (t > C.end) {
        stamp(c, 'ВАРИАНТ Б', W / 2, 290, 96, t, C.end, '#6b3df0');
        plate(c, W / 2, 520, 860, 220, t, C.end + .35, { fill: '#fff', rot: .02, draw: c => {
          txt(c, '«ещё 5 минут» × 8', 0, -20, 64, { fill: '#6b3df0', lw: 10, shadow: false });
          txt(c, '= 40 минут и ушедший автобус', 0, 58, 46, { font: FP(46), fill: INK, lw: 0, shadow: false });
        } });
        plate(c, W / 2, 1560, 900, 230, t, C.end + 1.1, { fill: '#fff', draw: c => {
          txt(c, 'А ты из команды А или Б?', 0, -26, 60, { fill: '#ff4d5e', lw: 10, shadow: false });
          txt(c, 'Что будет, если… — предложи тему', 0, 56, 46, { font: FP(46), fill: INK, lw: 0, shadow: false });
        } });
      }
    });
    grain(t);
  }
  window.PART3 = { dur: DUR, render };
})();
