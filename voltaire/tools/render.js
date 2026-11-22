// Deterministic frame export: contiguous chunk per worker, resumable, survives renderer crashes.
// usage: node render.js outDir [workers] [from] [to]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const dir = process.argv[2], NW = +(process.argv[3] || 4); fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--js-flags=--max-old-space-size=4096'] });
  const mk = async () => { const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } }); pg.on('pageerror', e => console.error('PAGEERROR', e.message)); await pg.goto('file://' + path.resolve(__dirname, '../src/index.html') + '?render'); const dur = await pg.evaluate(() => window.ready); return [pg, dur]; };
  let [p0, DUR] = await mk(); await p0.close();
  const N = Math.round(DUR * 60), from = +(process.argv[4] || 0), to = +(process.argv[5] || N); console.log('frames', N, 'range', from, to);
  const t0 = Date.now(); let done = 0; const per = Math.ceil((to - from) / NW);
  await Promise.all([...Array(NW).keys()].map(async w => {
    const a = from + w * per, e = Math.min(to, a + per); let [pg] = await mk(); let sinceNew = 0;
    for (let f = a; f < e; f++) {
      const fn = path.join(dir, `f${String(f).padStart(5, '0')}.jpg`); if (fs.existsSync(fn) && fs.statSync(fn).size > 1000) continue;
      if (sinceNew > 500) { await pg.close().catch(() => {}); [pg] = await mk(); sinceNew = 0; }
      try { const d = await pg.evaluate(f => { renderAt(f / 60); return document.getElementById('c').toDataURL('image/jpeg', .95).slice(23); }, f); fs.writeFileSync(fn, Buffer.from(d, 'base64')); done++; sinceNew++; }
      catch (err) { console.error('worker', w, 'frame', f, String(err.message).slice(0, 200)); if (!/crash|closed|Target/i.test(err.message)) process.exit(2); await pg.close().catch(() => {}); [pg] = await mk(); sinceNew = 0; f--; }
      if (done % 300 === 0) console.log(done, ((Date.now() - t0) / 1000).toFixed(0) + 's');
    }
    await pg.close().catch(() => {});
  }));
  console.log('done', done, ((Date.now() - t0) / 1000).toFixed(0) + 's'); await b.close();
})();
