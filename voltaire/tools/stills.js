// usage: node stills.js outDir t1 t2 ...  (renders with motion blur; logs ms/frame)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [dir, ...ts] = process.argv.slice(2); fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }); const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  pg.on('pageerror', e => console.error('PAGEERROR', e.message)); pg.on('console', m => console.log('CONSOLE', m.text()));
  await pg.goto('file://' + path.resolve(__dirname, '../src/index.html') + '?render'); const t0 = Date.now(); await pg.evaluate(() => window.ready); console.log('init ms', Date.now() - t0);
  for (const t of ts) { const s = Date.now(); const n = await pg.evaluate(t => renderAt(+t), t); const d = await pg.evaluate(() => document.getElementById('c').toDataURL('image/jpeg', .9).slice(23));
    fs.writeFileSync(path.join(dir, `t${(+t).toFixed(2).padStart(6, '0')}.jpg`), Buffer.from(d, 'base64')); console.log(t, 'mb', n, 'ms', Date.now() - s); }
  await b.close();
})();
