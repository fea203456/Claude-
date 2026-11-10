// Part 1 — hook, 7:00 alarm, the hand, FREEZE, choice A/B, CTA.
'use strict';
(() => {
  const C = CUES.p1, RING = C.ring, FREEZE = C.freeze, DUR = C.dur;
  const camKeys = [
    [0, -40, -400, 1330, 0], [1.9, 0, -320, 1200, 0], [2.55, 30, -290, 1300, .01],
    [3.0, 420, 20, 720, .045], [4.0, 330, 50, 800, -.02], [5.6, 60, 20, 1180, -.01],
    [7.6, 250, 10, 900, .02], [9.4, 420, -40, 640, .035], [9.95, 430, -45, 620, .04],
    [10.6, 330, -60, 760, .02], [11.6, 60, -150, 1480, 0], [DUR, 40, -170, 1560, -.008]
  ];
  function render(t) {
    const tc = Math.min(t, FREEZE);                      // character/action time freezes
    const [x, y, cz, rot] = keyed(camKeys, t);
    const ringing = tc >= RING ? 1 : 0;
    CAM = { x, y, cz, rot: rot + (t < FREEZE ? ringing * Math.sin(t * 52) * .006 : 0), focus: 0, ap: .25 };
    const tod = smt(tc, RING - .15, RING + .5);
    // arm: 6.0 -> 9.95 creeping to the snooze button, hesitating
    let arm = null;
    if (tc > C.armIn) {
      const k = eio(seg(tc, C.armIn, C.armHover)), from = [40, 150];
      const hover = [BUTTON[0] - 6, BUTTON[1] - 70 + Math.sin(tc * 5) * 6 * smt(tc, C.armHover - .5, C.armHover)];
      const mid = [250, -120 + Math.sin(tc * 2.3) * 30];
      const hand = k < .6 ? [lerp(from[0], mid[0], eio(k / .6)), lerp(from[1] - 10, mid[1], eio(k / .6))] : [lerp(mid[0], hover[0], eio((k - .6) / .4)), lerp(mid[1], hover[1], eio((k - .6) / .4))];
      arm = { from, hand, mode: k > .7 ? 'point' : 'fist' };
    }
    const peek = t > FREEZE ? smt(t, 11.2, 11.5) : 0;
    const lookSide = t > 12.2 ? (Math.floor((t - 12.2) / .9) % 2 ? [.7, .5] : [-.8, -.6]) : [0, -.2];
    const tb = {
      lid: tc < RING ? 1 : lerp(.86, .7, Math.abs(Math.sin(tc * 3))), lidR: tc < RING ? 1 : lerp(.86, .1, peek), lidL: tc < RING ? 1 : lerp(.86, .82, peek),
      look: t > FREEZE ? lookSide : [.4, -.3], brow: tc < RING ? 0 : -1 + peek * .6, mouth: tc < RING ? 'sleepy' : (peek > .5 ? 'flat' : 'wavy'),
      sy: 1 + (tc > RING ? wob(tc - RING, 20, 5) * .12 : 0), hair: tc > RING ? .25 : 0
    };
    const press = 0;
    bedroom(tc, {
      tod, curtain: .18, bump: tc > RING ? .4 + .4 * Math.abs(Math.sin(tc * 7)) : .2,
      temaInBed: tb,
      dzyn: { ring: ringing, time: tc < RING ? 419 : 420, mood: tc < RING ? 'neutral' : 'furious', sy: 1 + wob(tc - RING, 24, 6) * .3, sx: 1 - wob(tc - RING, 24, 6) * .2, press, look: arm ? [-.6, -.8] : [0, 0] },
      arm,
      extra: c => {
        if (tc < RING + .2) zzz(c, HEAD[0] + 60, HEAD[1] - 170, tc, 1 - seg(tc, RING - .1, RING + .1));
        // ДЗЫНЬ! — vibrating letters around the clock, re-hit on each beat
        if (tc >= RING && tc < C.armIn + 1) {
          const bt = (tc - RING) % (BEAT * 2), a = 1 - seg(tc, C.armIn + .6, C.armIn + 1);
          c.save(); c.globalAlpha = a; const sc = 1 + wob(bt, 26, 7) * .3;
          c.translate(CLOCK.x - 40, CLOCK.y - 430); c.rotate(-.12); c.scale(sc, sc);
          [...'ДЗЫНЬ!'].forEach((ch, i) => txt(c, ch, -150 + i * 62 + Math.sin(tc * 70 + i) * 5, Math.cos(tc * 63 + i * 2) * 6, 84, { fill: i % 2 ? '#ffcf3a' : '#ff4d5e' }));
          c.restore();
        }
        bubble(c, 170, -190, 460, 170, 'ммм… ещё чуть-чуть', tc, C.mmm, C.armIn + 1.2, 50, [-1, 1]);
      }
    });
    // title in a near layer -> real parallax as the camera crash-zooms away
    layer(-200, c => {
      if (t > 3.2) return;
      dropText(c, 'ЧТО БУДЕТ,', 0, -1000, 132, t, .25, { fill: i => ['#ffcf3a', '#ffcf3a', '#ffcf3a', '#fff', '#fff', '#fff', '#fff', '#fff', '#fff', '#fff'][i] });
      dropText(c, 'ЕСЛИ…', 0, -830, 132, t, .75, { fill: '#fff' });
      plate(c, 0, -600, 860, 250, t, C.q, { fill: '#fff', rot: -.03, draw: (c) => {
        txt(c, '…нажать', 0, -30, 70, { fill: INK, lw: 0, shadow: false });
        txt(c, '«ещё 5 минут»?', 0, 66, 84, { fill: '#ff4d5e', lw: 12, shadow: false });
      } });
    });
    grade(tod);
    greyFrame(t > FREEZE ? .85 * smt(t, FREEZE, FREEZE + .12) : 0);
    screen(c => {
      if (t > FREEZE) {
        // freeze flash + STOP stamp
        c.save(); c.globalAlpha = .5 * (1 - seg(t, FREEZE, FREEZE + .25)); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.restore();
        if (t < C.split + .3) { c.save(); c.globalAlpha = 1 - seg(t, C.split, C.split + .3); stamp(c, 'СТОП!', W / 2, 830, 150, t, FREEZE + .05, '#ff4d5e'); c.restore(); }
        const hl = t > C.tapA && t < C.tapB ? 'A' : t > C.tapB && t < C.tapB + 1 ? 'B' : null;
        choiceSplit(c, seg(t, C.split, C.split + .45), t, hl);
        const pA = Math.max(Math.exp(-Math.pow((t - C.tapA) / .12, 2)), Math.exp(-Math.pow((t - C.tapA2) / .12, 2))), pB = Math.exp(-Math.pow((t - C.tapB) / .12, 2));
        sunIcon(c, 850, 500, 92, t, spring(t - C.split - .5, 12, 7));
        moonIcon(c, 250, 1400, 84, t, spring(t - C.split - .7, 12, 7));
        choicePlate(c, 'А', 'ВСТАТЬ', 340, 640, t, C.split + .3, '#ff9a1e', null, pA);
        choicePlate(c, 'Б', 'ЕЩЁ', 740, 1250, t, C.split + .55, '#6b3df0', '5 МИНУТ', pB);
        dropText(c, 'ЧТО ВЫБЕРЕШЬ?', W / 2, 270, 92, t, C.ask, { fill: '#fff', stagger: .035 });
        plate(c, W / 2, 1560, 900, 190, t, C.cta, { fill: '#fff', draw: c => {
          txt(c, 'Пиши в комментах:', 0, -18, 58, { font: FP(58), fill: INK, lw: 0, shadow: false });
          txt(c, 'А или Б?', 0, 62, 70, { fill: '#ff4d5e', lw: 10, shadow: false });
        } });
        if (t > C.next) { const k = spring(t - C.next, 12, 8); c.save(); c.globalAlpha = clamp(k); txt(c, 'Ответ — в следующей части  ▶', W / 2, 1720 + (1 - k) * 40, 42, { font: FT(800, 42), fill: '#fff' }); c.restore(); }
        // tapping finger: A then B
        if (t > C.tapA - .5) {
          const goB = smt(t, C.tapB - .45, C.tapB - .05), back = smt(t, C.tapA2 - .45, C.tapA2 - .05);
          const fx = lerp(lerp(250, 540, goB), 250, back), fy = lerp(lerp(720, 1240, goB), 720, back);
          const pr = [C.tapA, C.tapB, C.tapA2].reduce((m, tp) => Math.max(m, Math.exp(-Math.pow((t - tp) / .07, 2))), 0);
          c.save(); c.globalAlpha = smt(t, C.tapA - .5, C.tapA - .2); tapFinger(c, fx + 40, fy + 40, pr); c.restore();
        }
      }
    });
    grain(t);
  }
  window.PART1 = { dur: DUR, render };
})();
