// ---- compositor: 2.5D camera, DOF, shadows, motion blur, post, captions ----
const Z0 = 1000;
const SC = []; // scenes {id, t0, t1, init(), frame(lt, T) -> {cam, layers, post}}
let DUR = 62.6;
const main = document.getElementById('c'); const ctx = main.getContext('2d');
const sub = mkCanvas(W, H), sg = sub.getContext('2d');
const pool = {}; function tmp(k, w, h) { const key = k + w + 'x' + h; return pool[key] || (pool[key] = mkCanvas(w, h)); }
function proj(cam, z) { return cam.zoom * Z0 / Math.max(1, z - cam.z); }
function coc(cam, z) { if (!cam.ap) return 0; return Math.min(36, cam.ap * Math.abs(Z0 / Math.max(1, z - cam.z) - Z0 / Math.max(1, cam.f - cam.z)) * 14); }
function layerXform(g, cam, L, ds = 1) {
  const s = proj(cam, L.z), px = cam.px || 0, py = cam.py || 0;
  g.setTransform(1 / ds, 0, 0, 1 / ds, 0, 0);
  g.translate(W / 2, H / 2); if (cam.roll) g.rotate(cam.roll * DEG); g.translate(-W / 2, -H / 2);
  g.translate(W / 2 + px + ((L.x || 0) - cam.x) * s, H / 2 + py + ((L.y || 0) - cam.y) * s); g.scale(s, s);
  return s;
}
function drawLayer(g, cam, L, T) {
  if (L.z - cam.z < 8) return;
  const b = L.blur !== undefined ? L.blur : coc(cam, L.z) + (L.extraBlur || 0);
  if (L.shadow) {
    const sh = L.shadow, ds = 3, w = Math.ceil(W / ds), h = Math.ceil(H / ds);
    const A = tmp('sa', w, h), a = A.getContext('2d'); a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, w, h);
    layerXform(a, cam, L, ds); L.draw(a, T, proj(cam, L.z));
    const Bc = tmp('sb', w, h), bb = Bc.getContext('2d'); bb.setTransform(1, 0, 0, 1, 0, 0); bb.clearRect(0, 0, w, h);
    bb.filter = `blur(${((sh.b || 10) + b) / ds}px)`; bb.drawImage(A, 0, 0); bb.filter = 'none';
    bb.globalCompositeOperation = 'source-in'; bb.fillStyle = sh.col || 'rgba(25,12,4,1)'; bb.fillRect(0, 0, w, h); bb.globalCompositeOperation = 'source-over';
    const s = proj(cam, L.z); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = (sh.a ?? .45) * (L.alpha ?? 1);
    g.translate(W / 2, H / 2); if (cam.roll) g.rotate(cam.roll * DEG); g.translate(-W / 2, -H / 2);
    g.drawImage(Bc, (sh.dx || 14) * s, (sh.dy || 20) * s, W, H); g.restore();
  }
  if (b < .7) { g.save(); g.globalAlpha = L.alpha ?? 1; if (L.op) g.globalCompositeOperation = L.op; layerXform(g, cam, L); L.draw(g, T, proj(cam, L.z)); g.restore(); return; }
  const ds = clamp(b / 2.2, 1.5, 6), w = Math.ceil(W / ds), h = Math.ceil(H / ds);
  const A = tmp('la', w, h), a = A.getContext('2d'); a.setTransform(1, 0, 0, 1, 0, 0); a.clearRect(0, 0, w, h);
  layerXform(a, cam, L, ds); L.draw(a, T, proj(cam, L.z));
  const Bc = tmp('lb', w, h), bb = Bc.getContext('2d'); bb.setTransform(1, 0, 0, 1, 0, 0); bb.clearRect(0, 0, w, h);
  bb.filter = `blur(${(b / ds).toFixed(2)}px)`; bb.drawImage(A, 0, 0); bb.filter = 'none';
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = L.alpha ?? 1; if (L.op) g.globalCompositeOperation = L.op; g.drawImage(Bc, 0, 0, W, H); g.restore();
}
function sceneAt(T) { let S = SC[SC.length - 1]; for (const s of SC) if (T >= s.t0 && T < s.t1) { S = s; break; } if (!S.inited) { if (S.init) S.init(); S.inited = true; } return S; }
function renderScene(g, T) {
  const S = sceneAt(T); const lt = T - S.t0;
  const F = S.frame(lt, T);
  const cam = Object.assign({ x: 0, y: 0, z: 0, zoom: 1, roll: 0, f: 1000, ap: 0 }, F.cam);
  if (F.shake) { cam.px = (cam.px || 0) + F.shake[0]; cam.py = (cam.py || 0) + F.shake[1]; }
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  g.fillStyle = F.bg || '#1a120c'; g.fillRect(0, 0, W, H);
  const Ls = F.layers.filter(Boolean).sort((a, b) => b.z - a.z);
  for (const L of Ls) { if (L.screen) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = L.alpha ?? 1; if (L.op) g.globalCompositeOperation = L.op; L.draw(g, T, 1); g.restore(); } else drawLayer(g, cam, L, T); }
  post(g, F.post || {}, T, cam);
  return { S, lt, F, cam };
}
// ---- post: grade, vignette, grain ----
let GRAIN = null;
function post(g, p, T) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (p.tint) { g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = p.tintA ?? .35; g.fillStyle = p.tint; g.fillRect(0, 0, W, H); g.restore(); }
  if (p.warmTop !== false) { g.save(); g.globalCompositeOperation = 'soft-light'; const gr = g.createLinearGradient(0, 0, W * .3, H); gr.addColorStop(0, 'rgba(255,200,120,.35)'); gr.addColorStop(1, 'rgba(40,20,60,.25)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore(); }
  const v = p.vig ?? .55; if (v) { g.save(); const gr = g.createRadialGradient(W / 2, H * .48, H * .28, W / 2, H * .5, H * .78); gr.addColorStop(0, 'rgba(10,5,2,0)'); gr.addColorStop(1, `rgba(10,5,2,${v})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore(); }
  if (!GRAIN) { GRAIN = mkCanvas(512, 512); const gg = GRAIN.getContext('2d'), id = gg.createImageData(512, 512), r = rng(99); for (let i = 0; i < id.data.length; i += 4) { const n = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = n; id.data[i + 3] = 255; } gg.putImageData(id, 0, 0); }
  g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = .045; const fr = Math.floor(T * FPS); g.translate(-(fr * 137) % 512, -(fr * 251) % 512); g.fillStyle = g.createPattern(GRAIN, 'repeat'); g.fillRect(0, 0, W + 1024, H + 1024); g.restore();
}
// ---- captions ----
const CAP_SKIP = new Set((window.CAP_SKIP || []));
let CHUNKS = null;
function buildChunks() {
  CHUNKS = [];
  VO.phrases.forEach(p => {
    if (CAP_SKIP.has(p.id)) return;
    const ws = p.words; let cur = [];
    ws.forEach((w, i) => { cur.push(w); const word = w[0]; const brk = /[—:,.!?…»]$/.test(word) || cur.length >= 3; if (brk || i === ws.length - 1) { CHUNKS.push({ words: cur, t0: cur[0][1], t1: i + 1 < ws.length ? ws[i + 1][1] : p.end + .15 }); cur = []; } });
  });
}
function captions(g, T) {
  if (!CHUNKS) buildChunks();
  const c = CHUNKS.find(c => T >= c.t0 - .02 && T < c.t1); if (!c) return;
  const words = c.words.map(w => w[0].replace(/[—]/g, '').trim()).filter(Boolean);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.font = '900 60px "Playfair Display"'; g.textBaseline = 'middle';
  const sp = 30, ws = words.map(w => g.measureText(w).width), tot = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  let x = W / 2 - tot / 2; const y = 1440; const k = E.outBack(clamp((T - c.t0) / .14));
  words.forEach((w, i) => {
    const on = T >= c.words[i][1] - .02; const cur = on && (i === words.length - 1 || T < c.words[i + 1][1]);
    g.save(); g.translate(x + ws[i] / 2, y + (1 - k) * 18); g.scale(cur ? 1.06 : 1, cur ? 1.06 : 1);
    g.lineJoin = 'round'; g.lineWidth = 11; g.strokeStyle = '#1c120c'; g.strokeText(w, -ws[i] / 2, 3);
    g.fillStyle = cur ? '#f4c24f' : on ? '#fff4dc' : 'rgba(255,244,220,.55)'; g.fillText(w, -ws[i] / 2, 0); g.restore();
    x += ws[i] + sp;
  });
  g.restore();
}
// ---- motion blur + frame ----
function subframes(T) {
  const S = sceneAt(T); const lt = T - S.t0; const n = S.mb ? S.mb(lt) : 0; if (n) return n;
  const c0 = S.frame(Math.max(0, lt - .5 / FPS), T).cam, c1 = S.frame(lt + .5 / FPS, T).cam;
  const z = (c0.f || 1000); const s0 = proj(Object.assign({ zoom: 1, z: 0 }, c0), z), s1 = proj(Object.assign({ zoom: 1, z: 0 }, c1), z);
  const d = Math.hypot(((c1.x || 0) - (c0.x || 0)) * s0, ((c1.y || 0) - (c0.y || 0)) * s0) + Math.abs(s1 - s0) / s0 * 900 + Math.abs((c1.roll || 0) - (c0.roll || 0)) * 15 + Math.hypot((c1.px || 0) - (c0.px || 0), (c1.py || 0) - (c0.py || 0));
  return clamp(Math.ceil(d / 7), 1, 8);
}
window.renderAt = (T, opts = {}) => {
  const n = opts.mb === false ? 1 : subframes(T), sh = .5 / FPS;
  if (n <= 1) renderScene(ctx, T);
  else {
    for (let i = 0; i < n; i++) {
      const ti = T + ((i + .5) / n - .5) * sh * 2 * .5; // 180-degree shutter
      renderScene(sg, ti);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1 / (i + 1); ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(sub, 0, 0); ctx.globalAlpha = 1;
    }
  }
  if (!opts.noCaps) captions(ctx, T);
  return n;
};
window.ready = (async () => {
  await Promise.all(['900 40px "Playfair Display"', 'italic 700 40px "Playfair Display"', '700 40px "Old Standard"', 'italic 40px "Old Standard"', '40px "IM Fell"', 'italic 40px "IM Fell"', '40px "Pinyon"', '40px "Marck"', '40px "Yeseva"']
    .map(f => document.fonts.load(f, 'АБВЁ abc 1729')));
  DUR = SC[SC.length - 1].t1;
  return DUR;
})();
