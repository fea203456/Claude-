// ---- core: math, easing, noise, tracks ----
const W = 1080, H = 1920, FPS = 60;
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const E = {
  lin: t => t, in2: t => t * t, out2: t => 1 - (1 - t) * (1 - t), io2: t => t < .5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t),
  in3: t => t * t * t, out3: t => 1 - Math.pow(1 - t, 3), io3: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out5: t => 1 - Math.pow(1 - t, 5), sine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  expo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
};
// damped settle from 0 to 1 with overshoot (contact & reaction)
const settle = (t, f = 2.2, d = 4.5) => t <= 0 ? 0 : 1 - Math.exp(-d * t) * Math.cos(TAU * f * t);
const wob = (t, f = 3, d = 5) => t <= 0 ? 0 : Math.exp(-d * t) * Math.sin(TAU * f * t); // decaying wobble around 0
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const noise1 = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
// stop-motion time: puppets animate "on twos" at 12 drawings/s
const step12 = t => Math.floor(t * 12 + 1e-6) / 12;
// keyframed track, Catmull-Rom between keys (velocity continuous, not zero at keys)
// keys: [[t, {prop: v}], ...]  -> function(t) -> object
function track(keys) {
  const props = new Set(); keys.forEach(k => Object.keys(k[1]).forEach(p => props.add(p)));
  const P = [...props]; const ks = keys.map(k => k[0]);
  // fill missing props by carrying previous value
  const vals = []; let last = {};
  keys.forEach(k => { const o = Object.assign({}, last, k[1]); vals.push(o); last = o; });
  for (let i = vals.length - 2; i >= 0; i--) P.forEach(p => { if (vals[i][p] === undefined) vals[i][p] = vals[i + 1][p]; });
  return t => {
    const o = {};
    if (t <= ks[0]) { P.forEach(p => o[p] = vals[0][p]); return o; }
    const n = ks.length - 1;
    if (t >= ks[n]) { P.forEach(p => o[p] = vals[n][p]); return o; }
    let i = 0; while (ks[i + 1] < t) i++;
    const t0 = ks[i], t1 = ks[i + 1], u = (t - t0) / (t1 - t0), dt = t1 - t0;
    P.forEach(p => {
      const v0 = vals[i][p], v1 = vals[i + 1][p];
      const vm = i > 0 ? vals[i - 1][p] : v0, vp = i + 2 <= n ? vals[i + 2][p] : v1;
      const tm = i > 0 ? ks[i - 1] : t0 - dt, tp = i + 2 <= n ? ks[i + 2] : t1 + dt;
      const m0 = i > 0 ? (v1 - vm) / (t1 - tm) * dt : (v1 - v0) * (keys[i][2] === 'ease' ? 0 : 1);
      const m1 = i + 2 <= n ? (vp - v0) / (tp - t0) * dt : (v1 - v0) * (keys[i + 1] && keys[i + 1][2] === 'ease' ? 0 : 1);
      const u2 = u * u, u3 = u2 * u;
      o[p] = (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1;
    });
    return o;
  };
}
// simple keyed scalar with easing per segment: [[t, v, ease?], ...]
function keyed(keys) {
  return t => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, v0] = keys[i], [t1, v1, e] = keys[i + 1];
      if (t <= t1) { const u = (t - t0) / (t1 - t0); return lerp(v0, v1, (E[e || 'io3'] || E.io3)(u)); }
    }
    return keys[keys.length - 1][1];
  };
}
