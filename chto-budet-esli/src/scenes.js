// Shared scene pieces for the three parts.
'use strict';
const CLOCK = { x: 485, y: 240 };            // Dzyn on the nightstand
const BUTTON = [485, -30];                     // snooze button (world, s=1)
const HEAD = [-385, 168];                      // Tema's head on the pillow
function motes(c, t, tod, n = 36) {
  for (let i = 0; i < n; i++) {
    const x = (hash(i) - .5) * 3000 + Math.sin(t * .4 + i) * 40, y = (hash(i + 40) - .5) * 2600 - 300 + Math.cos(t * .3 + i * 2) * 30;
    c.globalAlpha = .25 + .2 * Math.sin(t * 1.3 + i); circ(c, x, y, 8 + hash(i + 80) * 10); c.fillStyle = tod > .5 ? '#fff4c4' : '#9fb4ff'; c.fill();
  }
  c.globalAlpha = 1;
}
function zzz(c, x, y, t, a = 1) {
  for (let i = 0; i < 3; i++) { const k = (t * .55 + i / 3) % 1; c.save(); c.globalAlpha = a * Math.sin(Math.PI * k); txt(c, 'z', x + k * 60 + Math.sin(k * 8 + i) * 16, y - k * 200, 44 + k * 40, { font: FP(44 + k * 40), fill: '#cfd8ff' }); c.restore(); }
}
function bubble(c, x, y, w, h, str, t, t0, t1, size = 54, tail = [-1, 1]) {
  if (t < t0 || t > t1 + .3) return;
  const k = t > t1 ? 1 - eout(seg(t, t1, t1 + .25)) : spring(t - t0, 15, 8); if (k <= .001) return;
  c.save(); c.translate(x, y); c.scale(k, k);
  c.beginPath(); c.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); c.moveTo(tail[0] * w * .18, h * .4); c.lineTo(tail[0] * w * .42, h * .5 + 60 * tail[1]); c.lineTo(tail[0] * w * .02, h * .46);
  ink(c, '#fff', 7); ell(c, 0, 0, w / 2 - 4, h / 2 - 4); c.fillStyle = '#fff'; c.fill();
  txt(c, str, 0, size * .35, size, { font: FP(size), fill: INK, lw: 0, shadow: false }); c.restore();
}
// hand coming out from the blanket to the clock
function reachArm(c, from, hand, mode, t) {
  const mx = (from[0] + hand[0]) / 2 - 40, my = Math.min(from[1], hand[1]) - 40;
  hose(c, [from, [mx, my], hand], 26, PJ);
  c.save(); c.translate(hand[0], hand[1]);
  if (mode === 'point') { rr(c, -9, 0, 18, 48, 9); ink(c, SKIN, 6); circ(c, 0, -4, 24); ink(c, SKIN, 7); }
  else if (mode === 'slap') { ell(c, 0, 10, 40, 22); ink(c, SKIN, 7); }
  else { circ(c, 0, 0, 23); ink(c, SKIN, 7); }
  c.restore();
  // blanket cuff hiding the sleeve start
  c.save(); c.translate(from[0], from[1]); ell(c, 0, 8, 46, 26, -.2); ink(c, '#ffc93d', 7); c.restore();
}
function bedroom(t, s) { world(t, s); }
function sunRays(c, k, t) {
  c.save(); c.globalCompositeOperation = 'lighter'; c.translate(-110, -480);
  for (let i = 0; i < 7; i++) { const a = .5 + i * .16 + Math.sin(t * .7 + i) * .02; c.save(); c.rotate(a); c.globalAlpha = k * (.07 + .04 * Math.sin(t * 2 + i)); c.fillStyle = '#ffe9a0'; c.beginPath(); c.moveTo(0, -40); c.lineTo(2400, -150); c.lineTo(2400, 150); c.lineTo(0, 40); c.fill(); c.restore(); }
  c.restore();
}
function greyFrame(k) {
  if (k <= 0) return;
  screen(c => { tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.filter = 'none'; tctx.drawImage(frameC, 0, 0); c.filter = `grayscale(${k}) contrast(${1 + .1 * k}) brightness(${1 - .1 * k})`; c.drawImage(tmpC, 0, 0); c.filter = 'none'; });
}
// screen-space choice split (A top-left warm / B bottom-right purple). k = reveal 0..1
function choiceSplit(c, k, t, hl) {
  if (k <= 0) return;
  const yl = lerp(H * .5, 1160, eout(k)), yr = lerp(H * .5, 720, eout(k));
  c.save(); c.globalAlpha = .5 * k + (hl === 'A' ? .15 : 0); c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, yr); c.lineTo(0, yl); c.closePath(); c.fillStyle = '#ffb21e'; c.fill(); c.restore();
  c.save(); c.globalAlpha = .5 * k + (hl === 'B' ? .15 : 0); c.beginPath(); c.moveTo(0, yl); c.lineTo(W, yr); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fillStyle = '#6b3df0'; c.fill(); c.restore();
  // zig-zag tear line
  c.save(); c.beginPath(); const n = 18; for (let i = 0; i <= n; i++) { const x = W * i / n, y = lerp(yl, yr, i / n) + (i % 2 ? 16 : -16) * k; i ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.lineWidth = 22; c.strokeStyle = '#fff'; c.stroke(); c.lineWidth = 8; c.strokeStyle = INK; c.stroke(); c.restore();
}
function choicePlate(c, letter, label, x, y, t, t0, col, sub) {
  plate(c, x, y, 560, 190, t, t0, { fill: '#fff', rot: letter === 'А' ? -.05 : .05, draw: (c, lt) => {
    circ(c, -190, 0, 70); ink(c, col, 8); txt(c, letter, -190, 36, 104, { fill: '#fff', shadow: false, lw: 14 });
    txt(c, label, 80, sub ? -2 : 26, 66, { fill: col, lw: 10, shadow: false });
    if (sub) txt(c, sub, 80, 62, 50, { fill: col, lw: 8, shadow: false });
  } });
}
function tapFinger(c, x, y, press) {
  c.save(); c.translate(x, y + press * 18); c.rotate(-.35); c.scale(1 - press * .08, 1 - press * .08);
  rr(c, -16, -10, 32, 100, 16); ink(c, '#fff', 7); rr(c, -40, 60, 86, 100, 34); ink(c, '#fff', 7); c.restore();
  if (press > .3) { c.save(); c.globalAlpha = press; c.lineWidth = 7; c.strokeStyle = INK; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .45; c.beginPath(); c.moveTo(x - 20 + Math.cos(a) * 50, y - 20 + Math.sin(a) * 50); c.lineTo(x - 20 + Math.cos(a) * 80, y - 20 + Math.sin(a) * 80); c.stroke(); } c.restore(); }
}

// ================= kitchen (x -3600..-1450) and street (x < -3600) =================
const KX = -2550, SX = -4700, DOOR1 = -1450, DOOR2 = -3600;
function kitchenWall(c, t) {
  c.fillStyle = '#d9f3e4'; c.fillRect(-3600, -3600, 2150, 4400);
  c.fillStyle = '#bfe8d2'; for (let x = -3600; x < -1450; x += 120) c.fillRect(x, -3600, 60, 4400);
  // tiles behind counter
  c.fillStyle = '#ffffff'; c.fillRect(-3600, -150, 2150, 600); c.strokeStyle = '#a9d8c4'; c.lineWidth = 5;
  for (let y = -150; y < 450; y += 75) { c.beginPath(); c.moveTo(-3600, y); c.lineTo(-1450, y); c.stroke(); }
  for (let x = -3600; x < -1450; x += 75) { c.beginPath(); c.moveTo(x, -150); c.lineTo(x, 450); c.stroke(); }
  // window with sun
  const wx = KX - 220, wy = -820, ww = 440, wh = 480; const g = c.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, '#8fd4ff'); g.addColorStop(1, '#ffe2b0');
  rr(c, wx, wy, ww, wh, 24); c.fillStyle = g; c.fill(); c.save(); rr(c, wx, wy, ww, wh, 24); c.clip(); circ(c, wx + 320, wy + 140, 64); ink(c, '#ffe15a', 7);
  for (let i = 0; i < 3; i++) { const cx = wx + ((t * 30 + i * 170) % 600) - 80, cy = wy + 90 + i * 110; [0, 40, 80].forEach((d, j) => { circ(c, cx + d, cy - (j === 1 ? 20 : 0), 34); c.fillStyle = '#fff'; c.fill(); }); }
  c.restore(); rr(c, wx, wy, ww, wh, 24); ink(c, null, 10);
  c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.lineWidth = 16; c.strokeStyle = '#fff'; c.stroke(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
  // shelf with jars
  rr(c, KX + 330, -560, 420, 26, 8); ink(c, '#c4844f', 6);
  [['#ff7b6b', 380], ['#ffcf3a', 480], ['#7bc8ff', 590], ['#9be27a', 690]].forEach(([col, x], i) => { rr(c, KX + x - 36, -560 - 110 + i % 2 * 20, 72, 110 - i % 2 * 20, 16); ink(c, col, 6); rr(c, KX + x - 40, -560 - 124 + i % 2 * 20, 80, 22, 8); ink(c, '#fff', 5); });
}
function kitchenMain(c, t, s) {
  // fridge
  c.save(); c.translate(90, 0); rr(c, -3480, -420, 330, 890, 40); ink(c, '#f4f7ff', 8); c.beginPath(); c.moveTo(-3480, -80); c.lineTo(-3150, -80); c.lineWidth = 7; c.strokeStyle = INK; c.stroke();
  rr(c, -3200, -330, 20, 150, 10); ink(c, '#cfd6e6', 5); rr(c, -3200, 0, 20, 150, 10); ink(c, '#cfd6e6', 5);
  [['#ff7b6b', -3400, -330], ['#7bc8ff', -3330, -250], ['#ffcf3a', -3260, -340]].forEach(([col, x, y]) => { circ(c, x, y, 18); ink(c, col, 5); }); c.restore();
  // counter
  rr(c, -3080, 230, 1150, 240, 12); ink(c, '#7bc8a8', 8); rr(c, -3100, 200, 1190, 46, 14); ink(c, '#f2e0c4', 8);
  for (let i = 0; i < 4; i++) { rr(c, -3050 + i * 285, 270, 255, 180, 12); ink(c, '#8fd6b8', 6); circ(c, -2930 + i * 285, 360, 9); ink(c, '#ffcf3a', 4); }
  // kettle with steam
  const kx = -2850, ky = 200;
  c.beginPath(); c.moveTo(kx - 80, ky); c.quadraticCurveTo(kx - 100, ky - 150, kx, ky - 160); c.quadraticCurveTo(kx + 100, ky - 150, kx + 80, ky); c.closePath(); ink(c, '#ff7b6b', 8);
  c.beginPath(); c.moveTo(kx + 70, ky - 70); c.lineTo(kx + 150, ky - 130); c.lineWidth = 22; c.strokeStyle = INK; c.lineCap = 'round'; c.stroke(); c.lineWidth = 10; c.strokeStyle = '#ff7b6b'; c.stroke();
  c.beginPath(); c.arc(kx, ky - 160, 50, Math.PI * 1.1, Math.PI * 1.9); c.lineWidth = 12; c.strokeStyle = INK; c.stroke();
  const st = s.steam != null ? s.steam : 1;
  for (let i = 0; i < 6; i++) { const k = (t * .8 + i / 6) % 1; c.save(); c.globalAlpha = st * .8 * Math.sin(Math.PI * k); circ(c, kx + 160 + k * 60 + Math.sin(k * 7 + i) * 26, ky - 150 - k * 260, 20 + k * 40); c.fillStyle = '#fff'; c.fill(); c.restore(); }
  // toaster
  const tx = -2420, ty = 200, pop = s.toastPop || 0;
  // toast slices
  if (s.toastShow !== false) [-38, 38].forEach((dx, i) => { if (s.toastGone && i === 0) return; const yy = ty - 120 - pop * (i === 0 ? 1 : .6) * 200; c.save(); c.translate(tx + dx, yy); c.rotate(pop * (i ? .3 : -.2)); rr(c, -34, -50, 68, 90, 18); ink(c, '#e8a85a', 6); rr(c, -24, -40, 48, 70, 12); c.fillStyle = '#f7d394'; c.fill(); c.restore(); });
  rr(c, tx - 120, ty - 140, 240, 140, 40); ink(c, '#cfd6e6', 8); c.save(); c.globalAlpha = .5; rr(c, tx - 100, ty - 120, 60, 90, 20); c.fillStyle = '#fff'; c.fill(); c.restore();
  [-38, 38].forEach(dx => { rr(c, tx + dx - 34, ty - 146, 68, 16, 8); c.fillStyle = INK; c.fill(); });
  rr(c, tx + 118, ty - 100 + (1 - pop) * 40, 30, 18, 8); ink(c, '#ff4d5e', 5);
  // mug
  rr(c, -2150, 120, 90, 90, 18); ink(c, '#ffcf3a', 7); c.beginPath(); c.arc(-2058, 165, 26, -Math.PI / 2, Math.PI / 2); c.lineWidth = 9; c.strokeStyle = INK; c.stroke();
}
function kitchenFloor(c) { c.fillStyle = '#ffe6cf'; c.fillRect(-3600, 430, 2150, 1400); c.fillStyle = '#ffd1ad'; for (let y = 430; y < 1830; y += 90) for (let x = -3600; x < -1450; x += 90) if (((x / 90) + (y - 430) / 90) % 2 === 0) c.fillRect(x, y, 90, 90); c.beginPath(); c.moveTo(-3600, 430); c.lineTo(-1450, 430); c.lineWidth = 8; c.strokeStyle = INK; c.stroke(); }
function pillar(c, x, kind) {
  rr(c, x - 180, -3600, 360, 5600, 0); ink(c, kind === 'brick' ? '#d9705a' : '#f5c6a0', 8);
  if (kind === 'brick') { c.strokeStyle = '#b85a48'; c.lineWidth = 5; for (let y = -3600; y < 2000; y += 60) { c.beginPath(); c.moveTo(x - 180, y); c.lineTo(x + 180, y); c.stroke(); for (let xx = x - 180 + ((y / 60) % 2 ? 60 : 0); xx < x + 180; xx += 120) { c.beginPath(); c.moveTo(xx, y); c.lineTo(xx, y + 60); c.stroke(); } } }
  else { rr(c, x - 150, -560, 300, 1030, [140, 140, 0, 0]); ink(c, '#e0a97c', 7); }
  rr(c, x - 180, -3600, 360, 5600, 0); ink(c, null, 8);
}
// street
function streetFar(c, t) {
  const g = c.createLinearGradient(0, -2600, 0, 500); g.addColorStop(0, '#6cc6ff'); g.addColorStop(1, '#d7f1ff'); c.fillStyle = g; c.fillRect(-9000, -3600, 7400, 4600);
  circ(c, -4500, -1300, 110); ink(c, '#ffe15a', 8);
  for (let i = 0; i < 6; i++) { const cx = -7600 + ((t * 25 + i * 700) % 4200), cy = -1500 + hash(i) * 600; [0, 70, 140].forEach((d, j) => { circ(c, cx + d, cy - (j === 1 ? 40 : 0), 60); c.fillStyle = '#fff'; c.fill(); }); }
  c.fillStyle = '#a9c9f0'; for (let i = 0; i < 16; i++) { const x = -8800 + i * 420, h = 500 + hash(i + 3) * 700; c.fillRect(x, 400 - h, 360, h); }
}
function streetMid(c) {
  const cols = ['#ffb38a', '#ffd36b', '#9fd8c8', '#c9b3ff', '#ff9fb0'];
  for (let i = 0; i < 9; i++) { const x = -3600 - (i + 1) * 520, h = 900 + hash(i + 11) * 700; rr(c, x, 430 - h, 500, h + 40, [24, 24, 0, 0]); ink(c, cols[i % 5], 8);
    for (let wy = 430 - h + 80; wy < 300; wy += 170) for (let wx = 0; wx < 3; wx++) { rr(c, x + 50 + wx * 150, wy, 100, 110, 12); ink(c, '#d7f1ff', 6); } }
}
function streetFloor(c) { c.fillStyle = '#5a5f73'; c.fillRect(-9000, 330, 5400, 140); c.fillStyle = '#c9ccd8'; c.fillRect(-9000, 430, 5400, 1400); c.strokeStyle = INK; c.lineWidth = 8; c.beginPath(); c.moveTo(-9000, 430); c.lineTo(-3600, 430); c.stroke(); c.globalAlpha = .25; c.lineWidth = 5; for (let x = -9000; x < -3600; x += 160) { c.beginPath(); c.moveTo(x, 430); c.lineTo(x - 60, 1830); c.stroke(); } c.globalAlpha = 1;
  c.fillStyle = '#fff'; for (let x = -9000; x < -3600; x += 260) c.fillRect(x, 392, 130, 12); }
function busStop(c) { const x = SX + 250; rr(c, x - 10, -380, 20, 850, 8); ink(c, '#9aa3b8', 6); circ(c, x, -420, 80); ink(c, '#3ad07a', 8); txt(c, 'А', x, -392, 80, { fill: '#fff', shadow: false, lw: 10 });
  rr(c, x + 70, 300, 300, 30, 10); ink(c, '#c4844f', 6); [x + 100, x + 340].forEach(lx => { rr(c, lx - 8, 330, 16, 140, 6); ink(c, '#9aa3b8', 5); }); }
function bus(c, bx, t, doors, moving) {
  c.save(); c.translate(bx, 0);
  const bob = moving ? Math.sin(t * 30) * 3 : 0; c.translate(0, bob);
  rr(c, -520, -330, 1040, 690, [80, 60, 30, 30]); ink(c, '#ffb321', 9);
  rr(c, -520, 170, 1040, 70, 0); c.fillStyle = '#ff8a21'; c.fill(); rr(c, -520, -330, 1040, 690, [80, 60, 30, 30]); ink(c, null, 9);
  for (let i = 0; i < 4; i++) { rr(c, -470 + i * 200, -260, 170, 190, 22); ink(c, '#bfeaff', 7); }
  // door (right side) with two leaves sliding
  const dx = 330, dw = 160; rr(c, dx - dw / 2, -270, dw, 520, 14); ink(c, '#3a3f58', 7);
  [-1, 1].forEach(sd => { const off = (1 - doors) * dw / 2 * .9; rr(c, dx + (sd < 0 ? -dw / 2 - off : off), -270, dw / 2, 520, 10); ink(c, '#bfeaff', 6); });
  rr(c, 500, -40, 40, 60, 12); ink(c, '#fff6a0', 6); rr(c, -540, -40, 36, 60, 12); ink(c, '#ff5d73', 6);
  [-330, 300].forEach(wx => { c.save(); c.translate(wx, 360); circ(c, 0, 0, 74); ink(c, '#2a2a38', 8); circ(c, 0, 0, 30); ink(c, '#cfd6e6', 6); c.rotate(-bx / 74); c.beginPath(); c.moveTo(-28, 0); c.lineTo(28, 0); c.lineWidth = 7; c.strokeStyle = INK; c.stroke(); c.restore(); });
  txt(c, '7', -400, -100, 70, { fill: '#fff', lw: 10, shadow: false });
  c.restore();
}
function dust(c, x, y, t, t0, n = 5) { for (let i = 0; i < n; i++) { const k = seg(t, t0 + i * .05, t0 + .7 + i * .05); if (k <= 0 || k >= 1) continue; c.save(); c.globalAlpha = 1 - k; circ(c, x + (hash(i) - .2) * 160 * k + 60 * k, y - 20 - k * 60 * hash(i + 4), 26 + k * 50); ink(c, '#eef0f6', 6); c.restore(); } }
// visible x-range culling helper for a layer
function seen(z, x0, x1) { const s = layerScale(z), half = (W * .8) / s; return x1 > CAM.x - half && x0 < CAM.x + half; }
// the full house -> street world. s: like bedroom() plus {bus:{x,doors,moving}, kitchen:{...}, chars:[fn], fg:fn}
function world(t, s) {
  if (seen(1500, -9000, DOOR2 + 200)) layer(1500, c => streetFar(c, t));
  layer(400, c => {
    if (seen(400, DOOR1, 3000)) { c.save(); c.beginPath(); c.rect(DOOR1, -4000, 6000, 8000); c.clip(); bedroomWall(c, s.tod, t); curtains(c, s.curtain || 0, s.tod); if (s.sunRays) sunRays(c, s.sunRays, t); c.restore(); }
    if (seen(400, DOOR2, DOOR1)) kitchenWall(c, t);
    if (seen(400, -9000, DOOR2)) streetMid(c);
  });
  layer(180, c => { if (seen(180, DOOR1, 3000)) floor(c, s.tod); if (seen(180, DOOR2, DOOR1)) kitchenFloor(c); if (seen(180, -9000, DOOR2)) streetFloor(c); });
  if (s.bus && seen(120, s.bus.x - 700, s.bus.x + 700)) layer(120, c => bus(c, s.bus.x, t, s.bus.doors, s.bus.moving));
  layer(0, c => {
    if (seen(0, -800, 800)) { nightstand(c, s.tod); bedBack(c, s.tod);
      if (s.temaInBed) tema(c, Object.assign({ x: -350, y: 330, rot: -.22, s: .92, noLegs: true, armBack: false, armFront: false, t }, s.temaInBed));
      if (s.blanketLift == null || s.blanketLift < 1) blanket(c, s.tod, s.bump || 0, t, s.blanketLift || 0);
      if (s.dzyn) dzyn(c, Object.assign({ x: CLOCK.x, y: CLOCK.y, t }, s.dzyn));
      if (s.arm) reachArm(c, s.arm.from, s.arm.hand, s.arm.mode, t); }
    if (seen(0, DOOR2, DOOR1)) kitchenMain(c, t, s.kitchen || {});
    if (seen(0, -9000, DOOR2)) busStop(c);
    if (seen(0, DOOR1 - 200, DOOR1 + 200)) pillar(c, DOOR1, 'wall');
    if (seen(0, DOOR2 - 200, DOOR2 + 200)) pillar(c, DOOR2, 'brick');
    if (s.extra) s.extra(c);
  });
  layer(-260, c => motes(c, t, s.tod));
  if (s.fg) s.fg();
}
// horizontal whip smear of the current frame (k in px)
function whip(k) { if (k < 1) return; screen(c => { tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.drawImage(frameC, 0, 0); const n = 8; for (let i = 0; i < n; i++) { c.globalAlpha = 1 / (i + 2); c.drawImage(tmpC, (i / (n - 1) - .5) * k, 0); } c.globalAlpha = 1; }); }
