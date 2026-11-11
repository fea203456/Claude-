// «БЛЭКАУТ. Эпизод 01» — scenes, subtitles, UI and the data-driven timeline (src/script.js).
'use strict';
(() => {
  const LN = BK.lines, PARTS = BK.parts;
  LN.forEach((l, i) => { l.i = i; l.g0 = (i && LN[i - 1].scene === l.scene) ? LN[i - 1].g0 : l.t; });
  LN.forEach((l, i) => { let j = i; while (j + 1 < LN.length && LN[j + 1].scene === l.scene) j++; l.g1 = LN[j].t + LN[j].d; });
  const WAVE = LN.findIndex(l => l.fx === 'wave');
  const lineAt = t => { let i = 0; while (i + 1 < LN.length && LN[i + 1].t <= t) i++; return LN[i]; };
  const panelA = mk(), panelB = mk();
  const cam = (x, y, cz, rot = 0, ap = .22) => { CAM = { x, y, cz, rot, focus: 0, ap }; };
  const dark = (a, col = '#0a1230') => screen(c => { c.globalCompositeOperation = 'multiply'; c.globalAlpha = a; c.fillStyle = col; c.fillRect(0, 0, W, H); });
  const vign = (a = .55) => screen(c => { const v = c.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .72); v.addColorStop(0, 'rgba(4,6,18,0)'); v.addColorStop(1, `rgba(4,6,18,${a})`); c.fillStyle = v; c.fillRect(0, 0, W, H); });

  // ---------------- scenes ----------------
  const S = {};
  S.city = (t, L, u, lt) => {
    const after = L.i > WAVE, st = { level: after ? 0 : 1, towerLit: after ? 0 : 1, wifi: 'off' };
    let cx = Math.sin(u * .3) * 30, cy = -150 + u * 8, cz = 1120 - u * 30, rot = 0;
    if (L.i === 1) { const k = smt(lt, .28, .36) * (1 - smt(lt, .62, .74)); st.level = 1 - k * .9; st.towerLit = 1 - k; }
    if (L.fx === 'wifi') { st.wifi = 'on'; st.wifiK = spring(lt, 13, 6); }
    if (L.fx === 'flick') { st.wifi = 'on'; st.level = hash(Math.floor(t * 16)) > .2 ? 1 : .35; cy = -120; cz = 1000 - u * 40; }
    if (L.fx === 'flick2') { st.wifi = 'dim'; st.level = hash(Math.floor(t * 22)) > .45 ? 1 : .2; st.towerLit = st.level; cy = -120; cz = 1000 - u * 40; }
    if (L.fx === 'wave') { st.front = lerp(-2300, 2300, eio(seg(lt, .05, 1.0))); st.level = 1; st.towerLit = 1 - smt(lt, .42, .62); st.wifi = lt < .5 ? 'dim' : 'off'; cz = 1000 + lt * 150; cy = -60; cx = lerp(-120, 80, lt / L.d); }
    if (L.fx === 'mast') { st.mast = 'on'; cx = 250; cy = 120; cz = 760 - u * 30; }
    if (L.fx === 'mastoff') { st.mast = lt < .45 ? 'on' : 'off'; cx = 250; cy = 120; cz = 760 - u * 30; }
    if (L.fx === 'dim') { st.wifi = 'dim'; cy = -470; cz = 820 - u * 40; }
    if (L.fx === 'dead') { st.wifi = 'dead'; st.wifiK = 1 + wob(lt, 22, 6) * .25; cy = -470; cz = 820 - u * 40 - Math.exp(-lt * 8) * 50; rot = wob(lt, 30, 7) * .01; }
    cam(cx, cy, cz, rot); city(t, st);
    if (after) dark(.08);
  };
  S.title = (t, L, u, lt) => {
    const k = eio(seg(u, .1, 1.35)); cam(lerp(0, 5, k), lerp(-150, -470, k), lerp(1500, 620, k), 0, .15);
    city(t, { level: 1, towerLit: 1, evening: true, mark: smt(u, .7, 1.0) });
    layer(0, c => { if (u > .75) { const a = spring(u - .75, 14, 7); c.save(); c.translate(150, -470); c.scale(a, a); fr(c, -40, -3, 40, 6, P.yel); chip(c, '21 ЭТАЖ', 70, 8, 30, P.yel, '#1a1430'); c.restore(); } });
    screen(c => { const a = 1 - smt(u, .7, 1.05); if (a <= 0) return; c.save(); c.globalAlpha = a; c.font = FT(900, 96); c.textAlign = 'center'; c.letterSpacing = '14px'; c.fillStyle = '#fff'; c.fillText('НОВОГОРСК', W / 2 + 7, 420 - (1 - eout(seg(u, 0, .4))) * 30); fr(c, W / 2 - 60, 450, 120 * eout(seg(u, .1, .5)), 8, P.yel); c.restore(); });
  };
  S.cards = (t, L, u, lt) => {
    cam(Math.sin(u * .5) * 14, -270 + u * 70, 900, Math.sin(u * .6) * .006, 0);
    layer(300, c => bgPattern(c));
    layer(0, c => {
      const card = (i, y, col, draw) => { const t0 = LN[LN.findIndex(x => x.t === L.g0) + i].t; const a = t - t0; if (a <= 0) return; const k = spring(a, 15, 7);
        c.save(); c.translate(0, y); c.rotate([-.035, .03, -.02][i] + wob(a, 12, 5) * .05); c.scale(k, k); fr(c, -372, -132, 760, 280, 'rgba(0,0,0,.35)', 14); fr(c, -380, -140, 760, 280, col, 14);
        [[-380, -140, -.5], [380, -140, .5]].forEach(([x, y2, r]) => { c.save(); c.translate(x, y2); c.rotate(r); fr(c, -50, -16, 100, 32, 'rgba(240,230,200,.75)'); c.restore(); }); draw(c); c.restore(); };
      const big = (c, s, x, y, size, col = '#1a1a2a') => { c.font = FT(900, size); c.textAlign = 'left'; c.fillStyle = col; c.fillText(s, x, y); };
      card(0, -600, '#cfe0ea', c => { fr(c, -330, -110, 150, 220, '#8fb0c4', 8); fr(c, -290, -90, 70, 190, '#e9eef5', 4); for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) fr(c, -282 + j * 20, -82 + i * 20, 12, 12, '#56708a'); big(c, '24', -130, 50, 190); chip(c, 'ЭТАЖА', 250, 20, 44, P.yel, '#1a1a2a'); });
      card(1, -280, '#c79a62', c => { fr(c, -310, -110, 110, 220, '#2a2f45', 16); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { circ(c, -285 + j * 30, -60 + i * 36, 9); c.fillStyle = P.cyan; c.fill(); } fr(c, -290, -98, 70, 16, '#5fd4ff', 4); big(c, 'ЗАМОК', -150, 20, 104); chip(c, 'БЕЗ КЛЮЧА', -10, 96, 40, '#1a1a2a', '#fff'); });
      card(2, 40, '#e9e2cf', c => { fr(c, -310, -112, 120, 224, '#1a2036', 18); fr(c, -298, -94, 96, 180, P.cyan, 8); ['СВЕТ', 'ВОДА', 'ДВЕРЬ'].forEach((s, i) => { fr(c, -150 + i * 170, -86, 154, 62, '#1e2e5e', 12); c.font = FT(800, 34); c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText(s, -73 + i * 170, -43); circ(c, -100 + i * 170, 18, 12); c.fillStyle = '#3fbf6a'; c.fill(); fr(c, -80 + i * 170, 10, 60, 16, '#9aa6c8', 8); }); chip(c, 'С ТЕЛЕФОНА', 100, 108, 40, P.yel, '#1a1a2a'); });
    });
  };
  S.socket = (t, L, u, lt) => {
    const dk = L.fx === 'dark'; cam(Math.sin(u) * 8, 0, 1200 - eout(seg(u, 0, 1.4)) * 330, wob(lt, 26, 6) * .012, .3);
    layer(260, c => { fr(c, -3000, -3000, 6000, 6000, dk ? '#111829' : '#1c2748'); c.fillStyle = dk ? '#151d33' : '#232f58'; for (let y = -2000; y < 2000; y += 90) for (let x = -2000; x < 2000; x += 90) { circ(c, x + ((y / 90) % 2 ? 45 : 0), y, 7); c.fill(); } });
    layer(0, c => { glow(c, 0, 0, 760, dk ? 'rgba(255,60,60,.28)' : 'rgba(255,60,60,.6)', .7 + .3 * Math.sin(t * 7)); fr(c, -214, -204, 440, 440, 'rgba(0,0,0,.35)', 60); fr(c, -220, -220, 440, 440, dk ? '#8f95a8' : '#e9ecf5', 60); circ(c, 0, 0, 150); c.fillStyle = dk ? '#767c90' : '#cfd4e3'; c.fill(); [-1, 1].forEach(sd => { circ(c, sd * 60, 0, 24); c.fillStyle = '#10162b'; c.fill(); }); fr(c, -8, -150, 16, 26, '#9aa0b5', 4); fr(c, -8, 124, 16, 26, '#9aa0b5', 4);
      if (!dk) for (let i = 0; i < 5; i++) { const k = (t * 2.2 + i / 5) % 1; c.save(); c.globalAlpha = (1 - k) * .8; c.lineWidth = 8; c.strokeStyle = P.red; c.beginPath(); c.arc(0, 0, 250 + k * 240, 0, Math.PI * 2); c.stroke(); c.restore(); } });
    layer(-420, c => { fr(c, -900, 560, 700, 500, '#070b18', 40); });
    dark(dk ? .5 : .15);
  };
  function flatSet(t, st) {
    const off = st.off;   // 0 lit .. 1 dark
    layer(900, c => { const g = c.createLinearGradient(0, -900, 0, 400); g.addColorStop(0, '#2a2458'); g.addColorStop(1, off > .5 ? '#1b2a58' : '#c9786a'); c.fillStyle = g; c.fillRect(-3000, -2400, 6000, 4000); skyline(c, 77, 330, '#1a2550', x => (st.front != null ? (x > st.front ? 1 : 0) : 1 - off), t, P.lit, true); });
    layer(240, c => { const wall = '#1d3644'; fr(c, -3000, -3000, 2520, 6000, wall); fr(c, 300, -3000, 3000, 6000, wall); fr(c, -480, -3000, 780, 2330, wall); fr(c, -480, 160, 780, 3000, wall);
      c.fillStyle = '#213c4b'; for (let y = -1500; y < 500; y += 120) for (let x = -1500; x < 1500; x += 120) { if (x > -500 && x < 300 && y > -690 && y < 160) continue; circ(c, x, y, 6); c.fill(); }
      fr(c, -492, -682, 804, 14, '#0f1d28'); fr(c, -492, 152, 804, 20, '#0f1d28'); [-492, -100, 298].forEach(x => fr(c, x, -682, 14, 846, '#0f1d28'));
      // smart panel
      fr(c, 420, -380, 130, 200, '#0c1220', 14); if (off < .5) { fr(c, 432, -368, 106, 176, '#12305a', 8); glow(c, 485, -280, 220, 'rgba(95,212,255,.5)', .6); c.font = FT(800, 30); c.textAlign = 'center'; c.fillStyle = P.cyan; c.fillText(st.clock || '18:02', 485, -320); [0, 1, 2].forEach(i => { circ(c, 455 + i * 30, -250, 9); c.fillStyle = '#6fe08a'; c.fill(); }); }
      // floor lamp
      fr(c, -612, -330, 10, 760, '#0f1d28'); c.beginPath(); c.moveTo(-660, -330); c.lineTo(-560, -330); c.lineTo(-580, -440); c.lineTo(-640, -440); c.closePath(); c.fillStyle = off < .5 ? '#ffe2a0' : '#2a3a48'; c.fill(); if (off < .5) glow(c, -610, -360, 620, 'rgba(255,200,110,.55)', .8); });
    layer(0, c => { fr(c, -3000, 430, 6000, 2000, '#111a2e'); fr(c, -520, 440, 900, 26, '#1b2742', 13);
      fr(c, 170, 230, 480, 200, '#24314f', 30); fr(c, 150, 150, 520, 130, '#2b3a5c', 30); fr(c, 200, 250, 190, 70, '#33446b', 18); fr(c, 410, 250, 190, 70, '#33446b', 18);
      if (st.draw) st.draw(c); });
    layer(-360, c => { for (let i = 0; i < 5; i++) { c.save(); c.translate(-560, 900); c.rotate(-.9 + i * .38 + Math.sin(t + i) * .02); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(70, -220, 0, -470); c.quadraticCurveTo(-70, -220, 0, 0); c.fillStyle = '#081320'; c.fill(); c.restore(); } });
  }
  S.flat = (t, L, u, lt) => {
    let off = 0, front = null, px = -160, pose = { phone: 'hand', phoneGlow: '#bfe0ff', ra: [.5, 1.9], look: .6, worry: 0 }, torch = null;
    if (L.fx === 'off') { off = lt < .3 ? 0 : (lt < .55 ? (hash(Math.floor(t * 40)) > .5 ? 1 : 0) : 1); front = lerp(-2300, 2300, eio(seg(lt, .3, 1.2))); pose.worry = smt(lt, .5, .8); pose.look = lerp(.6, -.6, smt(lt, .6, .9)); }
    if (L.fx === 'msg') pose.ra = [.7, 2.2];
    if (L.fx === 'torch') { off = 1; front = 3000; px = -160 + u * 120; pose = { ra: [1.1, 1.5], torch: .1, worry: 1, look: 1, step: u * 2 }; torch = true; }
    cam(lerp(-90, -30, seg(u, 0, 3)) + (torch ? u * 90 : 0), 150, 860 - u * 25, 0, .2);
    flatSet(t, { off, front, clock: L.ts, draw: c => { const h = person(c, Object.assign({ x: px, y: 432, t }, MARK, pose));
      if (torch) { const hx = px + h.ra[0], hy = 432 + h.ra[1]; c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .28; c.beginPath(); c.moveTo(hx + 50, hy - 14); c.lineTo(hx + 1100, hy - 330); c.lineTo(hx + 1100, hy + 330); c.lineTo(hx + 50, hy + 14); c.fillStyle = '#ffe9a8'; c.fill(); c.restore(); } } });
    dark(off * (torch ? .46 : .62)); if (off < .5) screen(c => { c.globalCompositeOperation = 'lighter'; c.globalAlpha = .1; c.fillStyle = '#ffb060'; c.fillRect(0, 0, W, H); });
    if (L.fx === 'msg') screen(c => { const k = spring(lt, 14, 7); c.save(); c.translate(W / 2, 360 - (1 - k) * 260); fr(c, -420, -84, 848, 176, 'rgba(0,0,0,.4)', 40); fr(c, -424, -90, 848, 176, '#16203f', 40); circ(c, -330, -2, 56); c.fillStyle = TIM.top; c.fill(); c.font = FT(900, 58); c.textAlign = 'center'; c.fillStyle = '#1a1430'; c.fillText('Т', -330, 18); c.textAlign = 'left'; c.font = FT(800, 34); c.fillStyle = '#8fa0d0'; c.fillText('ТИМ · сейчас', -250, -30); c.font = FT(800, 50); c.fillStyle = '#fff'; c.fillText('пап, я уже в лифте!', -250, 36); c.restore(); });
  };
  function liftSet(t, st) {   // st: {lit 0..1, emg 0..1, floor:'14', sit}
    layer(210, c => { fr(c, -3000, -3000, 6000, 6000, '#080c1a'); fr(c, -440, -720, 880, 1260, lerp(0, 1, st.lit) > .5 ? '#48557f' : '#151c36'); for (let i = -2; i <= 2; i++) fr(c, i * 176 - 2, -720, 4, 1260, st.lit > .5 ? '#3a4670' : '#10162b');
      fr(c, -330, -440, 300, 600, st.lit > .5 ? '#6f7fb0' : '#1c2444', 10); fr(c, -440, 110, 880, 22, st.lit > .5 ? '#aab6e0' : '#2a3358', 11);
      fr(c, -120, -660, 240, 110, '#05070f', 14); c.font = FT(900, 84); c.textAlign = 'center'; c.fillStyle = st.floor === '--' ? P.red : '#ffb43a'; c.globalAlpha = st.floor === '--' ? .5 + .5 * Math.sin(t * 9) : 1; c.fillText(st.floor, 0, -574); c.globalAlpha = 1;
      fr(c, -300, -716, 600, 26, st.lit > .5 ? '#fff3c4' : '#1c2444', 13); if (st.lit > .5) glow(c, 0, -690, 900, 'rgba(255,240,190,.5)', .7);
      fr(c, 300, -640, 90, 50, st.emg ? '#ffb43a' : '#2a2f45', 10); if (st.emg) glow(c, 345, -615, 900, 'rgba(255,150,40,.6)', st.emg); });
    layer(0, c => { fr(c, -3000, 480, 6000, 2000, st.lit > .5 ? '#2a3355' : '#0d1226'); fr(c, -3000, -3000, 2540, 6000, st.lit > .5 ? '#232c4c' : '#0a0f20'); fr(c, 460, -3000, 2540, 6000, st.lit > .5 ? '#232c4c' : '#0a0f20');
      person(c, Object.assign({ x: 40, y: 482, s: .86, t }, TIM, st.sit ? { sit: 1, la: [.9, 1.9], ra: [.4, 2.4], worry: 1, look: .3 } : { look: st.lit > .5 ? .2 : -.4, worry: st.lit > .5 ? 0 : 1, la: [-.1, -.3], ra: [.15, .3] })); });
  }
  S.lift = (t, L, u, lt) => {
    let lit = 1, emg = 0, floor = String(12 + Math.min(2, Math.floor(u / .45))), sit = false, sh = 0;
    if (L.fx === 'stop') { lit = lt < .2 ? 1 : (lt < .55 ? (hash(Math.floor(t * 36)) > .5 ? 1 : 0) : 0); floor = lt < .2 ? '14' : '--'; sh = wob(lt - .12, 34, 7) * 26; }
    if (L.fx === 'emg' || L.fx === 'emgflick') { lit = 0; floor = '--'; sit = true; emg = .75 + .15 * Math.sin(t * 3); if (L.fx === 'emgflick' && lt > .35) emg *= hash(Math.floor(t * 18)) > .4 ? 1 : .15; }
    cam(Math.sin(u * .7) * 10, 170 + sh, 860 - u * 30, sh * .0006, .2); liftSet(t, { lit, emg, floor, sit }); dark(lit > .5 ? 0 : .34 - emg * .2);
  };
  S.shaft = (t, L, u, lt) => {
    const st = { lit: .5 };
    if (L.fx === 'move') { st.cab = lerp(10.5, 14.5, seg(lt, 0, L.d + .25)); st.cabLit = true; cam(0, floorY(st.cab + 1) + 110, 700, 0, 0); }
    if (L.fx === 'stuck') { st.cab = 14.5; st.mark = true; st.lit = 0; cam(wob(lt, 30, 6) * 6, floorY(15.5) + 110, 700 - eout(seg(lt, 0, .5)) * 60, 0, 0); }
    if (L.fx === 'minus2') { st.cab = 14.5; st.mark = true; st.lit = 0; st.who = 21; st.minus2 = lt > .75; const k = eio(seg(lt, .25, .85)); cam(0, lerp(floorY(21.5) + 100, floorY(-1) + 60, k), 760, 0, 0); }
    layer(300, c => bgPattern(c));
    layer(0, c => { section(c, t, st);
      if (L.fx === 'stuck') { chip(c, '15', -150, floorY(15) + 12, 30, '#1e2e5e', '#fff'); chip(c, '14', -150, floorY(14) + 12, 30, '#1e2e5e', '#fff'); const a = spring(lt - .25, 14, 7); c.save(); c.translate(190, floorY(15.5) + 30); c.scale(a, a); chip(c, 'ТИМ', 0, 0, 40, P.red, '#fff'); c.restore(); }
      if (L.fx === 'minus2') { chip(c, 'МАРК · 21', 250, floorY(22) - 6, 30, MARK.top, '#fff'); if (st.minus2) { const a = spring(lt - .75, 14, 7); c.save(); c.translate(-10, floorY(-2) + 30); c.scale(a, a); chip(c, 'КЛЮЧ · −2', 0, 0, 40, P.yel, '#1a1430'); c.restore(); } } });
  };
  const ruleCam = (u) => cam(Math.sin(u * .5) * 16, 60 + Math.sin(u * .4) * 10, 1260 - u * 30, 0, 0);
  S.rule2 = (t, L, u, lt) => { ruleCam(u); const st = { lit: .15 }; const order = ['', 'pump', 'water', 'dry'], k = order.indexOf(L.fx);
    if (k >= 1) st.pump = 'dead'; if (k === 2) st.water = eio(seg(lt, 0, L.d)); if (k === 3) st.water = 1;
    layer(300, c => bgPattern(c)); layer(0, c => { c.save(); c.translate(0, 180); c.scale(1.06, 1.06); section(c, t, st);
      if (k >= 1) { const a = spring(lt - (k === 1 ? .1 : -1), 14, 7); c.save(); c.translate(295, floorY(-1) - 14); c.scale(a, a); chip(c, 'НАСОС', 0, 0, 36, P.red, '#fff'); c.restore(); }
      if (k === 3) { c.save(); c.globalAlpha = .22 + .12 * Math.sin(t * 7); fr(c, -420, floorY(24), 840, floorY(5) - floorY(24), P.red); c.restore(); chip(c, 'ВОДЫ НЕТ', -250, floorY(15), 46, P.red, '#fff'); }
      c.restore(); }); };
  S.rule3 = (t, L, u, lt) => { ruleCam(u); const st = { lit: .15, cab: 14.5, x: L.fx !== '' , stairs: L.fx === 'stairs' };
    layer(300, c => bgPattern(c)); layer(0, c => { c.save(); c.translate(0, 180); c.scale(1.06, 1.06); section(c, t, st);
      if (L.fx !== '') chip(c, 'ЛИФТ', -170, floorY(15.5) + 26, 38, P.red, '#fff'); if (L.fx === 'stairs') { const a = spring(lt - .1, 14, 7); c.save(); c.translate(270, floorY(8)); c.scale(a, a); chip(c, 'ЛЕСТНИЦА', 0, 0, 40, P.yel, '#1a1430'); c.restore(); } c.restore(); }); };
  S.rule1 = (t, L, u, lt) => { cam(Math.sin(u * .5) * 14, 110, 900 - u * 25, Math.sin(u * .4) * .006, 0); const k = ['', 'bat', 'icons', 'drain'].indexOf(L.fx);
    layer(300, c => bgPattern(c)); layer(0, c => { const a = k === 0 ? spring(lt - .15, 12, 7) : 1; c.save(); c.translate(0, 60); c.scale(a * .9, a * .9); c.rotate(wob(lt, 10, 5) * .02);
      phoneBig(c, t, k === 3 ? lerp(34, 21, eio(seg(lt, .1, L.d))) : 34, { icons: k >= 2 ? (k === 2 ? spring(lt, 13, 7) : 1) : 0, drain: k === 3 }); c.restore(); }); };
  S.phone = (t, L, u, lt) => { cam(Math.sin(u) * 8, 200, 900 - u * 40, wob(lt, 20, 6) * .01, 0); layer(300, c => fr(c, -3000, -3000, 6000, 6000, '#070b18')); layer(0, c => { glow(c, 0, 60, 900, 'rgba(255,60,60,.35)', .5 + .3 * Math.sin(t * 12)); c.save(); c.translate(0, 60); phoneBig(c, t, 3); c.restore(); }); };
  S.call = (t, L, u, lt) => {
    const k = ['c0', 'c1', 'c2', 'c3'].indexOf(L.fx), gone = k === 3;
    cam(Math.sin(u * .6) * 12, -40, 1080 - u * 25, 0, .25);
    layer(900, c => { fr(c, -3000, -3000, 6000, 6000, '#0b1330'); skyline(c, 77, 330, '#141f45', () => 0, t, P.lit, true); });
    layer(300, c => { const wall = '#16202f'; fr(c, -3000, -3000, 3160, 6000, wall); fr(c, 700, -3000, 3000, 6000, wall); fr(c, 160, -3000, 540, 2400, wall); fr(c, 160, 240, 540, 3000, wall); fr(c, 150, -610, 560, 14, '#0c1420'); fr(c, 150, 236, 560, 18, '#0c1420'); fr(c, 420, -610, 12, 850, '#0c1420'); });
    layer(0, c => { person(c, Object.assign({ x: -60, y: 1130, s: 3, t }, MARK, { phone: gone ? 'hand' : 'ear', phoneGlow: gone ? '#3a4a70' : '#bfe0ff', ra: gone ? [.6, 1.7] : [1.9, 3.6], la: [-.1, -.1], worry: k >= 2 ? 1 : .5, look: gone ? .3 : -.2 })); if (!gone) glow(c, 150, -60, 380, 'rgba(120,180,255,.5)', .5); });
    dark(.42);
    screen(c => { const kk = spring(u, 14, 7), red = k >= 2; c.save(); c.translate(W / 2, 330 - (1 - kk) * 240 + (k >= 2 ? wob(lt, 30, 8) * 12 : 0));
      fr(c, -400, -84, 808, 176, 'rgba(0,0,0,.4)', 40); fr(c, -404, -90, 808, 176, '#16203f', 40); if (k === 1) for (let i = 0; i < 2; i++) { const r = (t * 1.6 + i / 2) % 1; c.save(); c.globalAlpha = 1 - r; c.lineWidth = 6; c.strokeStyle = P.cyan; c.beginPath(); c.arc(-310, -2, 56 + r * 36, 0, 6.3); c.stroke(); c.restore(); }
      circ(c, -310, -2, 56); c.fillStyle = TIM.top; c.fill(); c.font = FT(900, 58); c.textAlign = 'center'; c.fillStyle = '#1a1430'; c.fillText('Т', -310, 18);
      c.textAlign = 'left'; c.font = FT(900, 50); c.fillStyle = '#fff'; c.fillText('ТИМ', -230, -14); c.font = FT(800, 38); c.fillStyle = red ? P.red : '#8fc8ff'; c.fillText(['ВЫЗОВ' + '.'.repeat(1 + Math.floor(t * 3) % 3), 'ГУДКИ' + '.'.repeat(1 + Math.floor(t * 3) % 3), 'ВЫЗОВ ПРЕРВАН', 'НЕТ СЕТИ'][k], -230, 44);
      for (let i = 0; i < 4; i++) fr(c, 270 + i * 24, 30 - i * 16, 16, 20 + i * 16, k === 3 ? '#33405f' : (i < (k === 2 ? 1 : 3) ? '#fff' : '#33405f'), 4); if (k === 3) { c.lineWidth = 8; c.strokeStyle = P.red; c.lineCap = 'round'; c.beginPath(); c.moveTo(262, -40); c.lineTo(366, 56); c.stroke(); } c.restore(); });
  };
  S.lock = (t, L, u, lt) => {
    const keyK = L.fx === 'key' ? eio(seg(lt, .15, .6)) : 0;
    cam(Math.sin(u * .6) * 10, L.fx === 'key' ? lerp(-60, 170, keyK) : -60, L.fx === 'key' ? lerp(1000, 760, keyK) : 1060 - u * 30, 0, .25);
    layer(170, c => { fr(c, -3000, -3000, 6000, 6000, '#2c211d'); for (let i = -6; i < 7; i++) fr(c, i * 260, -3000, 8, 6000, '#241a17'); c.fillStyle = '#3a2c26'; for (let y = -1400; y < 1400; y += 130) for (let x = -1400; x < 1400; x += 130) { circ(c, x, y, 7); c.fill(); } });
    layer(0, c => { fr(c, -122, -512, 260, 840, 'rgba(0,0,0,.4)', 44); fr(c, -130, -520, 260, 840, '#1a2036', 44); fr(c, -92, -486, 184, 64, '#0b0f1c', 14);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { circ(c, -72 + j * 72, -350 + i * 84, 28); c.fillStyle = '#262d48'; c.fill(); }
      circ(c, 84, -454, 7); c.fillStyle = '#2a3050'; c.fill();
      fr(c, -60, 120, 360, 54, '#8d93a8', 27); circ(c, -60, 147, 44); c.fillStyle = '#767c90'; c.fill();
      // mechanical key cap
      const ky = 258; circ(c, 0, ky, 34); c.fillStyle = '#0b0f1c'; c.fill(); if (keyK > 0) { glow(c, 0, ky, 260, 'rgba(255,200,60,.8)', keyK * (.7 + .3 * Math.sin(t * 6))); fr(c, -5, ky - 18, 10, 30, P.yel, 4); circ(c, 0, ky - 16, 9); c.fillStyle = P.yel; c.fill(); }
      c.save(); c.translate(keyK * 70, 0); c.rotate(keyK * .9); circ(c, 0, ky, 36); c.fillStyle = '#2a3050'; c.globalAlpha = 1 - keyK * .4; c.fill(); c.restore();
      if (keyK > .6) { const a = spring(lt - .5, 14, 7); c.save(); c.translate(240, ky); c.scale(a, a); fr(c, -90, -3, 60, 6, P.yel); chip(c, 'КЛЮЧ', 40, 10, 34, P.yel, '#1a1430'); c.restore(); }
      // hand
      if (L.fx !== 'key') { const taps = L.fx === 'press' ? [.3, .75] : L.fx === 'press2' ? [.15, .4, .65] : []; const pr = taps.reduce((m, tp) => Math.max(m, Math.exp(-Math.pow((lt - tp) / .07, 2))), 0);
        const inK = L.fx === 'hand' ? eout(seg(lt, 0, .8)) : 1, hx = lerp(620, 30, inK), hy = lerp(500, -250, inK) + (1 - pr) * 16 - 16;
        limb(c, [[760, 900], [hx + 170, hy + 230]], 150, MARK.top); circ(c, hx + 110, hy + 150, 86); c.fillStyle = P.skin; c.fill(); limb(c, [[hx + 80, hy + 110], [hx + 6, hy + 14]], 44, P.skin);
        taps.forEach(tp => { const a = lt - tp; if (a > 0 && a < .4) { c.save(); c.globalAlpha = 1 - a / .4; c.lineWidth = 6; c.strokeStyle = '#8f95a8'; c.beginPath(); c.arc(0, -266, 30 + a * 150, 0, 6.3); c.stroke(); c.restore(); } }); } });
    screen(c => { const g = c.createRadialGradient(W / 2, 900, 150, W / 2, 900, 1000); g.addColorStop(0, 'rgba(255,233,168,.16)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(0, 0, W, H); });
    dark(.3);
  };
  function doorSet(t, st, lt) {
    layer(230, c => { fr(c, -3000, -3000, 6000, 6000, '#17263a'); c.fillStyle = '#1c2d44'; for (let y = -1500; y < 800; y += 110) for (let x = -1500; x < 1500; x += 110) { circ(c, x, y, 6); c.fill(); } fr(c, 330, -560, 300, 14, '#0c1420'); [['#7a2f3a', 350], ['#2f5a7a', 440], ['#8a6a2a', 530]].forEach(([col, x]) => fr(c, x, -546, 70, 330, col, 20)); });
    layer(0, c => { fr(c, -3000, 440, 6000, 2000, '#0e1526'); const jx = st.knock ? Math.sin(t * 60) * 4 * Math.exp(-((lt % .42)) * 9) : 0;
      if (st.under) { glow(c, 0, 440, 420, 'rgba(255,190,110,.55)', st.under); fr(c, -200, 432, 400, 10, '#ffcf8a'); }
      fr(c, -236 + jx, -596, 472, 1040, '#0f1722', 8); fr(c, -214 + jx, -574, 428, 1012, '#3a2a22', 6); [[-170, -520, 340, 380], [-170, -90, 340, 470]].forEach(([x, y, w, h]) => fr(c, x + jx, y, w, h, '#30221c', 8));
      fr(c, 120 + jx, -150, 52, 170, '#1a2036', 12); fr(c, 96 + jx, 30, 110, 20, '#8d93a8', 10); circ(c, 0 + jx, -330, 12); c.fillStyle = st.under ? '#ffcf8a' : '#0b0f1c'; c.fill();
      if (st.knock) for (let i = 0; i < 3; i++) { const k = ((lt / .42) + i / 3) % 1; c.save(); c.globalAlpha = (1 - k) * .8; c.lineWidth = 7; c.strokeStyle = P.yel; c.beginPath(); c.arc(0, -150, 40 + k * 230, 0, 6.3); c.stroke(); c.restore(); }
      if (st.voice) for (let i = 0; i < 3; i++) { const k = (t * 1.5 + i / 3) % 1; c.save(); c.globalAlpha = 1 - k; c.lineWidth = 8; c.strokeStyle = '#ffcf8a'; c.lineCap = 'round'; c.beginPath(); c.arc(-230, -300, 30 + k * 120, Math.PI * .75, Math.PI * 1.25); c.stroke(); c.restore(); }
      // flashlight on the floor
      fr(c, -520, 404, 70, 30, '#2a3350', 8); c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .22; c.beginPath(); c.moveTo(-450, 406); c.lineTo(300, -500); c.lineTo(300, 440); c.lineTo(-450, 432); c.fillStyle = '#ffe9a8'; c.fill(); c.restore();
      person(c, Object.assign({ x: st.px, y: 442, t }, MARK, st.pose)); });
  }
  S.door = (t, L, u, lt) => {
    const st = { px: -330, pose: { ra: [1.35, 1.6], la: [1.15, 1.75], worry: 1, look: 1 } };
    if (L.fx === 'push') { st.px = -335 + Math.abs(Math.sin(lt * 9)) * 16 * Math.exp(-lt * 1.2); cam(-90, 130, 900 - u * 25, 0, .2); }
    else { st.px = -380; st.pose = { ra: [.2, .3], la: [-.1, -.1], worry: 1, look: 1 }; st.knock = L.fx !== 'voice'; st.under = L.fx === 'knock' ? smt(lt, .3, .8) * .8 : .8; st.voice = L.fx === 'voice'; cam(-90 + (u - 1.4) * 12, 125, 880 - (u - 1.4) * 30, 0, .2); }
    doorSet(t, st, lt); dark(.4);
  };
  S.parking = (t, L, u, lt) => {
    cam(lerp(-160, -40, eout(seg(u, 0, 1.2))), 110, 1050 - eout(seg(u, 0, 1.3)) * 330, 0, .25);
    layer(700, c => { fr(c, -4000, -3000, 8000, 6000, '#0a0f1f'); for (let i = -6; i < 7; i++) fr(c, i * 520, -900, 90, 1400, '#10172c'); fr(c, -4000, -940, 8000, 60, '#141c36'); });
    layer(0, c => { fr(c, -3000, 320, 6000, 2000, '#0c1224'); for (let i = -4; i < 5; i++) fr(c, i * 420 - 4, 330, 8, 500, '#1a2340'); fr(c, -640, -900, 150, 1230, '#161f3a'); c.font = FT(900, 110); c.textAlign = 'center'; c.fillStyle = P.yel; c.fillText('−2', -565, -120); fr(c, -640, 60, 150, 26, P.yel); fr(c, -640, 110, 150, 26, '#10172c');
      fr(c, -300, 130, 600, 170, '#5a1f2a', 40); c.beginPath(); c.moveTo(-190, 135); c.lineTo(-120, 20); c.lineTo(150, 20); c.lineTo(230, 135); c.closePath(); c.fillStyle = '#4a1822'; c.fill(); c.beginPath(); c.moveTo(-160, 130); c.lineTo(-108, 40); c.lineTo(10, 40); c.lineTo(10, 130); c.closePath(); c.fillStyle = '#16203a'; c.fill(); c.beginPath(); c.moveTo(30, 130); c.lineTo(30, 40); c.lineTo(140, 40); c.lineTo(196, 130); c.closePath(); c.fill();
      [-190, 190].forEach(x => { circ(c, x, 300, 58); c.fillStyle = '#05070f'; c.fill(); circ(c, x, 300, 24); c.fillStyle = '#2a3050'; c.fill(); });
      const gk = .6 + .4 * Math.sin(t * 5); glow(c, -60, 90, 190, 'rgba(255,200,60,.9)', gk); circ(c, -72, 84, 13); c.fillStyle = P.yel; c.fill(); fr(c, -62, 80, 44, 8, P.yel, 4); fr(c, -30, 86, 7, 12, P.yel); fr(c, -42, 86, 7, 9, P.yel);
      for (let i = 0; i < 3; i++) { const k = (t * .9 + i / 3) % 1; c.globalAlpha = 1 - k; fr(c, 380 + i * 60, lerp(-800, 310, k * k), 5, 26, '#5f7fb0'); } c.globalAlpha = 1; });
    layer(-380, c => fr(c, 420, -1200, 260, 2600, '#05080f'));
    dark(.35);
  };
  S.split = (t, L, u, lt) => {
    const grab = (fn, pc) => { fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.globalAlpha = 1; fctx.globalCompositeOperation = 'source-over'; fctx.filter = 'none'; fctx.fillStyle = '#000'; fctx.fillRect(0, 0, W, H); fn(); const x = pc.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(frameC, 0, 0); };
    grab(() => { cam(-150 + Math.sin(u * .5) * 10, 370, 900, 0, .2); doorSet(t, { px: -330, pose: { ra: [1.35, 1.6], la: [1.15, 1.75], worry: 1, look: 1 } }, 0); dark(.35); }, panelA);
    grab(() => { cam(Math.sin(u * .6) * 8, 410, 900, 0, .2); liftSet(t, { lit: 0, emg: .75 + .15 * Math.sin(t * 3), floor: '--', sit: true }); dark(.3); }, panelB);
    screen(c => { fr(c, 0, 0, W, H, '#070b18'); const kb = L.fx === 'b' ? eout(seg(lt, 0, .35)) : 0, ka = L.fx === 'a' ? eout(seg(lt, 0, .35)) : 1;
      const pan = (pc, y, k, lab, col) => { if (k <= 0) return; c.save(); c.globalAlpha = k; c.translate(0, (1 - k) * 60); rr(c, 60, y, 960, 730, 26); c.save(); c.clip(); c.drawImage(pc, 0, 380, 1080, 821, 60, y, 960, 730); c.restore(); c.lineWidth = 8; c.strokeStyle = '#dfe7ff'; rr(c, 60, y, 960, 730, 26); c.stroke(); chip(c, lab, 100, y + 70, 40, col, '#fff', 'left'); c.restore(); };
      pan(panelA, 270, ka, '21 ЭТАЖ', MARK.top); pan(panelB, 1040, kb, 'ЛИФТ · 14–15', P.red); fr(c, 0, 1015, W * (L.fx === 'b' ? 1 : eout(seg(lt, .2, .7))), 10, P.red); if (L.fx === 'b' && L.text) subtitle(c, LN[L.i - 1], .5); });
  };
  S.end = (t, L, u, lt) => {
    cam(Math.sin(u * .4) * 30, -260, 1500 - u * 30); city(t, { level: 0, towerLit: 0, wifi: L.fx === 'p1' ? 'off' : 'dead' }); dark(.72);
    screen(c => { const n = { p1: 1, p2: 2, p3: 3 }[L.fx], k = eout(seg(lt, .1, .5));
      c.save(); c.globalAlpha = seg(lt, .05, .35); c.font = FT(900, 132); c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('ЭПИЗОД 01', W / 2, 860 + (1 - k) * 24); fr(c, W / 2 - 180 * k, 900, 360 * k, 10, P.red); c.restore();
      if (lt > .45) { c.save(); c.globalAlpha = seg(lt, .45, .75); chip(c, n < 3 ? `ЧАСТЬ ${n} ИЗ 3` : 'ЧАСТЬ 3 ИЗ 3', W / 2, 1020, 54, '#1e2e5e', '#fff'); c.font = FT(800, 54); c.textAlign = 'center'; c.fillStyle = P.yel; c.letterSpacing = '4px'; c.fillText(n < 3 ? `ПРОДОЛЖЕНИЕ — В ЧАСТИ ${n + 1}` : 'ПРОДОЛЖЕНИЕ СЛЕДУЕТ…', W / 2, 1150); c.restore(); }
      if (n === 3 && lt > 1.2) { c.save(); c.globalAlpha = seg(lt, 1.2, 1.6); c.font = FT(900, 60); c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('А где лежит твой ключ?', W / 2, 1310); c.fillStyle = '#8fa0d0'; c.font = FT(800, 44); c.fillText('Пиши в комментариях', W / 2, 1384); c.restore(); } });
  };

  // ---------------- subtitles + chips ----------------
  function subtitle(c, L, lt) {
    if (!L.text) return; const lines = L.text.split('|'), size = 92, y0 = (L.scene === 'split' ? (L.fx === 'a' ? 950 : 1720) : 1400) - (lines.length - 1) * 52;
    const k = .88 + .12 * eout(seg(lt, 0, .1)), red = L.text.includes('^'), sh = red ? wob(lt, 34, 9) * 10 : 0, a = Math.min(seg(lt, 0, .06), 1 - seg(lt, L.d - .05, L.d));
    c.save(); c.globalAlpha = a; c.translate(W / 2 + sh, y0); c.scale(k, k); c.font = FT(900, size); c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
    lines.forEach((ln, i) => { const segs = []; let col = '#fff', buf = ''; for (const ch of ln) { if (ch === '~' || ch === '^') { if (buf) segs.push([buf, col]); buf = ''; col = col === '#fff' ? (ch === '~' ? P.yel : P.red) : '#fff'; } else buf += ch; } if (buf) segs.push([buf, col]);
      const tot = segs.reduce((s, [str]) => s + c.measureText(str).width, 0); let x = -tot / 2; const y = i * 104;
      c.textAlign = 'left'; segs.forEach(([str]) => { c.lineWidth = 20; c.strokeStyle = 'rgba(6,9,24,.92)'; c.strokeText(str, x, y + 4); x += c.measureText(str).width; }); x = -tot / 2;
      segs.forEach(([str, cl]) => { c.fillStyle = cl; c.fillText(str, x, y); x += c.measureText(str).width; }); });
    c.restore();
  }
  function hud(c, L, t, part) {
    const p0 = PARTS[part][0];
    if (L.ts) { c.save(); c.translate(50, 150); c.scale(1.35, 1.35); c.translate(-50, -150); fr(c, 50, 150, 330, 74, 'rgba(6,9,24,.85)', 14); c.lineWidth = 3; c.strokeStyle = '#3a2a2a'; rr(c, 50, 150, 330, 74, 14); c.stroke(); circ(c, 86, 187, 9); c.fillStyle = P.red; c.globalAlpha = .5 + .5 * Math.sin(t * 5); c.fill(); c.globalAlpha = 1; c.font = FT(900, 44); c.textAlign = 'left'; c.fillStyle = '#ffb43a'; c.fillText(L.ts, 110, 203); c.font = FT(800, 24); c.fillStyle = '#8f8a80'; c.fillText('ВЕЧЕР', 262, 199); c.restore(); }
    else if (t - p0 < 4.2 && L.scene !== 'end') { c.save(); c.globalAlpha = 1 - seg(t - p0, 3.8, 4.2); chip(c, `ЭПИЗОД 01 · ЧАСТЬ ${part + 1}`, 50, 210, 46, P.red, '#fff', 'left'); c.restore(); }
    if (/^rule/.test(L.scene)) { const n = L.scene[4], a = spring(t - L.g0, 16, 7); c.save(); c.translate(W / 2, 330); c.rotate(-.03); c.scale(a, a); chip(c, `ПРАВИЛО №${n}`, 0, 0, 62, P.red, '#fff'); c.restore(); }
  }
  function frame(t, part) {
    const L = lineAt(t), lt = t - L.t, u = t - L.g0;
    S[L.scene](t, L, u, lt);
    vign(.6);
    // dip to dark between scene runs
    const d = Math.max(1 - seg(u, 0, .16), seg(t, L.g1 - .1, L.g1)); if (d > 0) screen(c => { c.fillStyle = `rgba(5,7,18,${d * .92})`; c.fillRect(0, 0, W, H); });
    if (L.text.includes('^') && lt < .12) screen(c => { c.fillStyle = `rgba(255,60,60,${.16 * (1 - lt / .12)})`; c.fillRect(0, 0, W, H); });
    screen(c => { hud(c, L, t, part); subtitle(c, L, lt); });
    grain(t);
  }
  window.FILM = {};
  PARTS.forEach((p, i) => { window.FILM['b' + (i + 1)] = { dur: p[1] - p[0], render: t => frame(Math.min(p[0] + t, p[1] - 1e-4), i) }; });
  // covers: composed key frame + big title
  const COV = [
    { a: 'БЛЭКАУТ', b: 'Погас весь город', col: P.yel, y: 470, tag: '18:03 · ЛИФТ ВСТАЛ', draw: () => { cam(40, -330, 1000); city(3, { front: -60, level: 1, towerLit: .55, wifi: 'dim' }); } },
    { a: 'УМНЫЙ ДОМ', b: 'оглох', col: P.red, y: 470, tag: '18:20 · СЕТИ НЕТ', draw: () => { cam(0, -690, 680); city(3, { level: 0, towerLit: 0, wifi: 'dead' }); } },
    { a: 'ЗАПЕРТ', b: 'Ключ — на минус втором', col: P.red, y: 1010, band: true, tag: '21:55 · ЗАРЯД 3%', draw: () => { const L = LN.find(l => l.fx === 'b'); S.split(L.t + 1.2, Object.assign({}, L, { text: '' }), 3, 1.2); } }];
  COV.forEach((cv, i) => { window.FILM['c' + (i + 1)] = { dur: 1, render: () => { cv.draw(); vign(.7);
    screen(c => { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(5,7,18,.9)'); g.addColorStop(.36, 'rgba(5,7,18,.1)'); g.addColorStop(.72, 'rgba(5,7,18,.15)'); g.addColorStop(1, 'rgba(5,7,18,.92)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      if (cv.band) fr(c, 0, cv.y - 190, W, 330, 'rgba(5,7,18,.86)');
      chip(c, 'ЭПИЗОД 01', 70, 210, 46, P.red, '#fff', 'left'); chip(c, `ЧАСТЬ ${i + 1}`, 1010, 210, 46, '#fff', '#0d1530', 'right');
      c.font = FT(900, cv.a.length > 8 ? 150 : 200); c.textAlign = 'center'; c.lineJoin = 'round'; c.lineWidth = 26; c.strokeStyle = 'rgba(6,9,24,.95)'; c.strokeText(cv.a, W / 2, cv.y); c.fillStyle = cv.col; c.fillText(cv.a, W / 2, cv.y);
      c.font = FT(900, 76); c.lineWidth = 18; c.strokeText(cv.b, W / 2, cv.y + 110); c.fillStyle = '#fff'; c.fillText(cv.b, W / 2, cv.y + 110);
      fr(c, W / 2 - 310, 1640, 620, 96, P.yel, 20); c.font = FT(900, 52); c.fillStyle = '#0d1530'; c.fillText(cv.tag, W / 2, 1706); }); grain(0); } }; });
})();
