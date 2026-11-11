// Deterministic frame export (Playwright + Chromium).
// frames: node render.js <part> <outDir> <startFrame> <endFrame> [sub]   stills: node render.js <part> --stills <dir> t1 t2 ...
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
(async () => {
  const [part, ...args] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  pg.on('pageerror', e => console.error('PAGEERROR', e.message)); pg.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
  await pg.goto('file://' + path.resolve(__dirname, '../src/index.html') + `?render&part=${part}`); await pg.evaluate(() => window.ready);
  const grab = async (t, sub, file, q) => { const d = await pg.evaluate(([t, sub, q]) => { renderAt(t, sub); return document.getElementById('c').toDataURL('image/jpeg', q).slice(23); }, [t, sub, q]); fs.writeFileSync(file, Buffer.from(d, 'base64')); };
  if (args[0] === '--stills') { fs.mkdirSync(args[1], { recursive: true }); for (const t of args.slice(2)) await grab(+t, 4, path.join(args[1], `${part}_t${(+t).toFixed(2).padStart(5, '0')}.jpg`), .85); }
  else { const dir = args[0], s = +args[1], e = +args[2], sub = +(args[3] || 4); fs.mkdirSync(dir, { recursive: true }); const t0 = Date.now();
    for (let f = s; f < e; f++) { await grab(f / 60, sub, path.join(dir, `f${String(f).padStart(5, '0')}.jpg`), .95); if ((f - s) % 150 === 0) console.log(part, f, ((Date.now() - t0) / 1000).toFixed(0) + 's'); } }
  await b.close();
})();
