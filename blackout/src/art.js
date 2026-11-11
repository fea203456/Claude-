// Flat dark art kit for «БЛЭКАУТ»: palette, people, city, tower section, props. No outlines, colour = meaning.
'use strict';
const P = { bg: '#0d1530', navy: '#152248', navy2: '#1e2e5e', lit: '#ffc857', red: '#ff4d4d', yel: '#ffc93a', skin: '#f0c39a', white: '#f4f6ff', cyan: '#5fd4ff' };
function fr(c, x, y, w, h, fill, r = 0) { if (r) rr(c, x, y, w, h, r); else { c.beginPath(); c.rect(x, y, w, h); } c.fillStyle = fill; c.fill(); }
function limb(c, pts, w, col) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = w; c.strokeStyle = col; c.stroke(); }
function glow(c, x, y, r, col, a = 1) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.save(); c.globalAlpha *= a; c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); }
const ang = (o, a, L) => [o[0] + Math.sin(a) * L, o[1] + Math.cos(a) * L];   // 0 = straight down, + = to the right

// flat person, origin at feet, ~430 tall at s=1
function person(c, p) {
  const t = p.t || 0, br = Math.sin(t * 2) * 2;
  c.save(); c.translate(p.x, p.y); c.scale((p.s || 1) * (p.flip ? -1 : 1), p.s || 1);
  const sit = p.sit || 0, hipY = -170 + sit * 120, shY = hipY - 150 + br, headY = shY - 62;
  // legs
  if (sit > .5) { limb(c, [[-22, hipY], [60, hipY - 70], [70, 0]], 40, p.bottom); limb(c, [[22, hipY], [100, hipY - 80], [116, 0]], 40, p.bottom); }
  else { const st = p.step != null ? Math.sin(p.step * 6.28) * 34 : 0; limb(c, [[-24, hipY], [-26 - st, -6]], 42, p.bottom); limb(c, [[24, hipY], [26 + st, -6]], 42, p.bottom); fr(c, -52 - st, -18, 62, 20, '#10162b', 8); fr(c, 2 + st, -18, 62, 20, '#10162b', 8); }
  if (p.backpack) fr(c, -86, shY + 10, 60, 120, p.backpack, 22);
  // back arm
  const arm = (sd, a, col) => { const sh = [sd * 50, shY + 22], el = ang(sh, a[0], 78), ha = ang(el, a[1], 74); limb(c, [sh, el, ha], 30, col); circ(c, ha[0], ha[1], 19); c.fillStyle = p.skin || P.skin; c.fill(); return ha; };
  const la = arm(-1, p.la || [-.12, -.05], p.top2 || p.top);
  // torso
  fr(c, -62, shY, 124, hipY - shY + 26, p.top, 34);
  if (p.hood) { c.beginPath(); c.moveTo(-40, shY + 6); c.quadraticCurveTo(0, shY + 46, 40, shY + 6); c.lineWidth = 12; c.strokeStyle = p.top2 || '#00000022'; c.stroke(); }
  // neck + head
  fr(c, -16, shY - 22, 32, 34, p.skin || P.skin, 8);
  const hx = (p.look || 0) * 8;
  circ(c, hx, headY, 50); c.fillStyle = p.skin || P.skin; c.fill();
  // hair
  c.beginPath(); c.arc(hx, headY - 6, 52, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(hx + 30, headY - 34, hx - 50, headY - 10); c.fillStyle = p.hair; c.fill();
  if (p.cap) { c.beginPath(); c.arc(hx, headY - 8, 54, Math.PI, 0); c.fillStyle = p.cap; c.fill(); fr(c, hx + (p.look >= 0 ? 10 : -80), headY - 16, 70, 14, p.cap, 7); }
  // face
  const ex = hx + (p.look || 0) * 14, w = p.worry || 0;
  [-1, 1].forEach(sd => { circ(c, ex + sd * 18, headY + 4, 5.5); c.fillStyle = '#1a2038'; c.fill(); c.beginPath(); c.moveTo(ex + sd * 28, headY - 12 + w * 2); c.lineTo(ex + sd * 9, headY - 12 - w * 9); c.lineWidth = 5; c.strokeStyle = '#1a2038'; c.lineCap = 'round'; c.stroke(); });
  c.beginPath(); if (w > .5) c.arc(ex, headY + 34, 11, Math.PI * 1.15, Math.PI * 1.85); else { c.moveTo(ex - 9, headY + 26); c.lineTo(ex + 9, headY + 26); } c.lineWidth = 5; c.strokeStyle = '#8a4a3a'; c.stroke();
  // front arm
  const ra = arm(1, p.ra || [.12, .05], p.top);
  if (p.phone) { c.save(); c.translate(p.phone === 'ear' ? ra[0] : ra[0], ra[1]); c.rotate(p.phone === 'ear' ? -.2 : .25); fr(c, -15, -34, 30, 56, '#0a0f20', 7); if (p.phoneGlow) fr(c, -11, -29, 22, 44, p.phoneGlow, 4); c.restore(); if (p.phoneGlow && p.phone !== 'ear') glow(c, ra[0], ra[1] - 20, 200, 'rgba(120,180,255,.5)', .6); }
  if (p.torch) { c.save(); c.translate(ra[0], ra[1]); c.rotate(p.torch); fr(c, -10, -12, 56, 24, '#2a3350', 6); fr(c, 40, -16, 16, 32, '#55618a', 4); c.restore(); }
  c.restore();
  return { ra, la };
}
const MARK = { top: '#d9652e', top2: '#b85424', bottom: '#27314f', hair: '#2a1d1a', hood: true };
const TIM = { top: '#f0b429', top2: '#d19a1e', bottom: '#2f4a7a', hair: '#3a2a20', backpack: '#3f7fd9', cap: '#d94a4a' };

// ---------------- city ----------------
function skyline(c, seed, y0, col, litFn, t, wcol, big) {
  for (let i = 0; i < 26; i++) {
    const x = -2000 + i * 160 + hash(seed + i) * 40, w = 110 + hash(seed + i * 3) * 70, h = 260 + hash(seed + i * 7) * (big ? 620 : 420);
    fr(c, x, y0 - h, w, h + 400, col);
    const lf = litFn(x + w / 2), cw = big ? 16 : 10, ch = big ? 22 : 14, gx = big ? 30 : 20, gy = big ? 40 : 26;
    for (let yy = y0 - h + 24; yy < y0 - 10; yy += gy) for (let xx = x + 12; xx < x + w - cw - 6; xx += gx) {
      const hsh = hash(xx * .13 + yy * .71 + seed); if (hsh < .55 * lf) { c.globalAlpha = .55 + .45 * hash(hsh * 99); fr(c, xx, yy, cw, ch, wcol); }
    }
    c.globalAlpha = 1;
  }
}
const TW = { x: -175, w: 350, top: -640, fh: 48, floors: 24 };
function tower(c, st, t) {
  const { x, w, top, fh, floors } = TW; fr(c, x, top, w, fh * floors + 40, st.evening ? '#3d4470' : '#2a3563');
  fr(c, x - 12, top - 14, w + 24, 18, st.evening ? '#565e8c' : '#3a4678'); fr(c, x + w / 2 - 40, top - 60, 80, 48, st.evening ? '#3d4470' : '#2a3563');
  for (let f = 0; f < floors; f++) for (let j = 0; j < 6; j++) {
    const wx = x + 22 + j * 54, wy = top + 12 + f * fh, on = st.towerLit != null ? ((floors - f) / floors < st.towerLit) : true;
    const h = hash(f * 7.3 + j * 1.9), lit = on && h < .72 * (st.level != null ? st.level : 1);
    fr(c, wx, wy, 36, 26, lit ? (h < .2 ? '#ffe2a0' : P.lit) : (st.evening ? '#2b3158' : '#222e5c'));
    if (st.mark && f === floors - 21 && j === 3) { c.save(); c.globalAlpha = st.mark; c.lineWidth = 5; c.strokeStyle = P.yel; c.strokeRect(wx - 7, wy - 7, 50, 40); c.restore(); }
  }
}
function wifi(c, x, y, mode, t, k = 1) {
  if (mode === 'off' || k <= 0) return;
  const col = mode === 'dead' ? P.red : P.yel, a = mode === 'dim' ? .25 + .2 * Math.sin(t * 20) : 1;
  c.save(); c.translate(x, y); c.scale(k, k); c.globalAlpha = a;
  if (mode === 'on') glow(c, 0, -30, 260, 'rgba(255,200,60,.5)', .5 + .2 * Math.sin(t * 4));
  c.lineCap = 'round'; c.strokeStyle = col; c.lineWidth = 16;
  for (let i = 1; i <= 3; i++) { const on = mode !== 'on' || ((t * 2.5) % 4) >= i - 1 || true; c.globalAlpha = a * (mode === 'dead' ? .9 : 1); c.beginPath(); c.arc(0, 0, i * 40, Math.PI * 1.25, Math.PI * 1.75); if (on) c.stroke(); }
  circ(c, 0, 0, 13); c.fillStyle = col; c.fill();
  if (mode === 'dead') { c.lineWidth = 18; c.strokeStyle = P.red; c.beginPath(); c.moveTo(-110, -150); c.lineTo(110, 30); c.stroke(); }
  c.restore();
}
// st: {level, front, towerLit, wifi, wifiK, evening, mark, mast}
function city(t, st) {
  const lf = x => st.front != null ? (x > st.front ? 1 : 0) : (st.level != null ? st.level : 1);
  layer(1700, c => {
    const g = c.createLinearGradient(0, -2600, 0, 1400);
    if (st.evening) { g.addColorStop(0, '#2a2458'); g.addColorStop(.55, '#7a4a7e'); g.addColorStop(.8, '#e08a62'); g.addColorStop(1, '#f2b06a'); } else { g.addColorStop(0, '#080d22'); g.addColorStop(1, '#1b2a58'); }
    c.fillStyle = g; c.fillRect(-4000, -3200, 8000, 6400);
    for (let i = 0; i < 70; i++) { c.globalAlpha = (st.evening ? .25 : .7) * (.5 + .5 * Math.sin(t * 2 + i * 1.3)); circ(c, (hash(i) - .5) * 5200, -2600 + hash(i + 50) * 2600, 4 + hash(i + 9) * 4); c.fillStyle = '#fff'; c.fill(); }
    c.globalAlpha = 1; circ(c, 760, -1750, 110); c.fillStyle = st.evening ? '#ffe9c4' : '#e9edf7'; c.fill(); glow(c, 760, -1750, 420, st.evening ? 'rgba(255,220,170,.35)' : 'rgba(200,215,255,.3)');
  }, { blur: 0 });
  layer(1000, c => skyline(c, 3, 640, st.evening ? '#4a3f78' : '#141f45', lf, t, st.evening ? '#ffd58a' : '#e9c46a', false));
  layer(480, c => skyline(c, 41, 600, st.evening ? '#3a3468' : '#18254e', lf, t, P.lit, true));
  layer(0, c => {
    fr(c, -3000, 540, 6000, 1800, st.evening ? '#1c1c3c' : '#0a1024');
    tower(c, st, t);
    if (st.mast) { fr(c, 328, 120, 18, 420, '#5a6aa8'); for (let i = 0; i < 4; i++) fr(c, 296, 150 + i * 60, 82, 10, '#5a6aa8'); c.strokeStyle = '#5a6aa8'; c.lineWidth = 6; c.beginPath(); c.moveTo(337, 130); c.lineTo(270, 540); c.moveTo(337, 130); c.lineTo(404, 540); c.stroke(); const on = st.mast === 'on'; circ(c, 337, 110, 12); c.fillStyle = on && Math.sin(t * 9) > 0 ? P.red : '#3a2030'; c.fill(); if (on) for (let i = 0; i < 3; i++) { const k = (t * 1.2 + i / 3) % 1; c.globalAlpha = 1 - k; c.lineWidth = 6; c.strokeStyle = P.cyan; c.beginPath(); c.arc(337, 110, 40 + k * 160, -Math.PI * .8, -Math.PI * .2); c.stroke(); } c.globalAlpha = 1; }
    wifi(c, 0, TW.top - 130, st.wifi || 'off', t, st.wifiK != null ? st.wifiK : 1);
  });
  layer(-380, c => { fr(c, -1400, 820, 2800, 900, '#060a18'); fr(c, -700, 600, 16, 240, '#060a18'); fr(c, -760, 640, 136, 10, '#060a18'); fr(c, 520, 680, 260, 150, '#060a18'); fr(c, 600, 560, 12, 130, '#060a18'); });
}

// ---------------- tower cross-section (diagram) ----------------
const SEC = { g: 600, fh: 54, floors: 24 };   // ground y, floor height
const floorY = f => SEC.g - f * SEC.fh;        // y of the floor line of level f (f=0 ground)
// st: {cab, cabLit, mark, water (0..1 top fraction dry), pump, dry, stairs, x, minus2, who}
function section(c, t, st) {
  const { g, fh, floors } = SEC, topY = floorY(floors);
  fr(c, -430, topY - 16, 860, 16, '#3a4678'); fr(c, -420, topY, 840, g - topY, '#1a2550');
  fr(c, -420, g, 840, fh * 2 + 10, '#121a38');   // basement
  for (let f = -2; f < floors; f++) {
    const y = floorY(f + 1);
    fr(c, -420, y + fh - 4, 840, 4, '#2f3c70');
    if (f >= 0) for (let sd = -1; sd <= 1; sd += 2) for (let j = 0; j < 3; j++) {
      const x = sd < 0 ? -400 + j * 96 : 170 + j * 80, h = hash(f * 3.1 + j + sd * 9);
      fr(c, x, y + 12, 22, 30, h < (st.lit != null ? st.lit : .0) ? P.lit : '#2a3767', 3); fr(c, x + 34, y + 30, 40, 12, '#33427a', 3);
    }
  }
  // parking
  fr(c, -400, floorY(-1) + 8, 320, 4, '#2f3c70'); if (st.minus2) { const y = floorY(-2); c.save(); c.globalAlpha = .6 + .4 * Math.sin(t * 8); fr(c, -420, y, 840, fh, 'rgba(255,77,77,.28)'); c.restore(); fr(c, -330, y + 22, 110, 22, '#8a2f3a', 8); fr(c, -305, y + 8, 60, 18, '#8a2f3a', 8); circ(c, -300, y + 46, 9); c.fillStyle = '#0a0f20'; c.fill(); circ(c, -250, y + 46, 9); c.fill(); glow(c, -275, y + 20, 60, 'rgba(255,200,60,.9)', .6 + .4 * Math.sin(t * 6)); }
  // pump
  const py = floorY(-1) + 14; fr(c, 250, py, 90, 34, st.pump === 'dead' ? '#7a2a35' : '#3f6fb0', 8); c.save(); c.translate(295, py + 17); c.rotate(st.pump === 'dead' ? 1 : t * 8); fr(c, -16, -3, 32, 6, '#dfe7ff'); fr(c, -3, -16, 6, 32, '#dfe7ff'); c.restore();
  // water riser
  fr(c, -108, topY, 14, g - topY + fh, '#0f1730');
  if (st.water != null) { const wy = lerp(topY, floorY(5), st.water); fr(c, -108, wy, 14, g - wy + fh, '#3fa9ff'); for (let f = floors - 1; f >= 5; f--) if (floorY(f + 1) + fh / 2 < wy) { const y = floorY(f + 1) + fh / 2; c.lineWidth = 5; c.strokeStyle = P.red; c.beginPath(); c.moveTo(-140, y - 8); c.lineTo(-124, y + 8); c.moveTo(-124, y - 8); c.lineTo(-140, y + 8); c.stroke(); } }
  // shaft
  fr(c, -80, topY, 160, g - topY + fh * 2, '#0a1024');
  c.strokeStyle = '#27335f'; c.lineWidth = 3; c.beginPath(); c.moveTo(-30, topY); c.lineTo(-30, g + fh * 2); c.moveTo(30, topY); c.lineTo(30, g + fh * 2); c.stroke();
  // stairs zig-zag
  c.beginPath(); for (let f = 0; f <= floors; f++) { const y = floorY(f); f ? c.lineTo(f % 2 ? 150 : 96, y) : c.moveTo(96, y); } c.lineWidth = 5; c.strokeStyle = st.stairs ? P.yel : '#3a4a86'; if (st.stairs) { c.setLineDash([26, 14]); c.lineDashOffset = -t * 90; } c.stroke(); c.setLineDash([]);
  // cabin
  if (st.cab != null) {
    const y = floorY(st.cab + 1) + 6; c.strokeStyle = '#55618a'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, topY); c.lineTo(0, y); c.stroke();
    if (st.cabLit) glow(c, 0, y + 22, 150, 'rgba(255,200,87,.7)', .7);
    fr(c, -52, y, 104, 44, st.cabLit ? P.lit : (st.mark ? '#5a2030' : '#2a3563'), 6); fr(c, -8, y + 14, 16, 30, st.cabLit ? '#7a5a1a' : '#10162b', 6); circ(c, 0, y + 12, 7); c.fillStyle = st.cabLit ? '#7a5a1a' : '#10162b'; c.fill();
    if (st.mark) { c.save(); c.globalAlpha = .55 + .45 * Math.sin(t * 9); c.lineWidth = 6; c.strokeStyle = P.red; c.strokeRect(-64, y - 10, 128, 64); c.restore(); }
    if (st.x) { c.lineWidth = 12; c.strokeStyle = P.red; c.lineCap = 'round'; c.beginPath(); c.moveTo(-46, y - 6); c.lineTo(46, y + 50); c.moveTo(46, y - 6); c.lineTo(-46, y + 50); c.stroke(); }
  }
  if (st.who != null) { const y = floorY(st.who + 1) + fh / 2; circ(c, 250, y, 13); c.fillStyle = MARK.top; c.fill(); glow(c, 250, y, 70, 'rgba(255,160,80,.7)', .7); }
}
function chip(c, str, x, y, size, bg, fg, align = 'center') { c.save(); c.font = FT(800, size); const w = c.measureText(str).width + size * .9, x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2; fr(c, x0, y - size * .78, w, size * 1.3, bg, size * .22); c.fillStyle = fg; c.textAlign = 'center'; c.fillText(str, x0 + w / 2, y + size * .2); c.restore(); }
function bgPattern(c) { fr(c, -3000, -3000, 6000, 6000, P.bg); c.save(); c.globalAlpha = .5; c.strokeStyle = '#131e40'; c.lineWidth = 3; for (let i = -40; i < 40; i++) { c.beginPath(); c.moveTo(i * 90 - 1500, -2000); c.lineTo(i * 90 + 1500, 2000); c.stroke(); } c.restore(); }
function phoneBig(c, t, pct, st) {
  fr(c, -230, -430, 460, 860, '#3a4a86', 60); fr(c, -214, -414, 428, 828, '#0a0f20', 48); fr(c, -205, -395, 410, 790, '#16224a', 40); fr(c, -60, -420, 120, 18, '#0a0f20', 9);
  const col = pct <= 20 ? P.red : pct <= 30 ? '#ff9a3a' : '#6fe08a', blink = pct <= 5 ? (.72 + .28 * Math.sin(t * 12)) : 1;
  fr(c, -150, -130, 280, 150, '#0a0f20', 22); fr(c, 130, -85, 22, 60, '#0a0f20', 8); c.save(); c.globalAlpha = blink; fr(c, -136, -116, Math.max(8, 252 * pct / 100), 122, col, 14); c.restore();
  c.save(); c.font = FT(900, 150); c.textAlign = 'center'; c.fillStyle = col; c.globalAlpha = blink; c.fillText(Math.round(pct) + '%', 0, 230); c.restore();
  if (st && st.icons) { const k = st.icons;
    [[-1, 'ЭКРАН'], [1, 'ФОНАРИК']].forEach(([sd, lab]) => { const ix = sd * 350, iy = -330; c.save(); c.globalAlpha = k; circ(c, ix, iy, 90); c.fillStyle = '#1e2e5e'; c.fill();
      if (sd < 0) { circ(c, ix, iy, 30); c.fillStyle = P.yel; c.fill(); c.strokeStyle = P.yel; c.lineWidth = 9; c.lineCap = 'round'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + t; c.beginPath(); c.moveTo(ix + Math.cos(a) * 44, iy + Math.sin(a) * 44); c.lineTo(ix + Math.cos(a) * 62, iy + Math.sin(a) * 62); c.stroke(); } }
      else { c.save(); c.translate(ix, iy); c.rotate(-.5); fr(c, -46, -14, 60, 28, '#dfe7ff', 6); fr(c, 12, -22, 22, 44, '#aab6e0', 5); c.globalAlpha = k * .6; c.beginPath(); c.moveTo(34, -18); c.lineTo(100, -50); c.lineTo(100, 50); c.lineTo(34, 18); c.fillStyle = P.yel; c.fill(); c.restore(); }
      chip(c, lab, ix, iy + 150, 34, '#1e2e5e', P.white);
      if (st.drain) for (let i = 0; i < 6; i++) { const u = (t * 1.4 + i / 6) % 1; c.globalAlpha = k * Math.sin(Math.PI * u); circ(c, lerp(sd * 140, ix - sd * 80, u), lerp(-70, iy + 40, u), 11); c.fillStyle = col; c.fill(); }
      c.restore(); }); }
}
