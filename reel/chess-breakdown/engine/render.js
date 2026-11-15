// Renders the transparent UI layer as deduplicated PNG frames + an ffmpeg concat list.
// usage: node render.js <projectDir> [--stills t1 t2 ...]
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const FPS = 30;
(async () => {
  const dir = path.resolve(process.argv[2]); const stills = process.argv[3] === '--stills' ? process.argv.slice(4).map(Number) : null;
  const script = JSON.parse(fs.readFileSync(path.join(dir, 'script.json'), 'utf8'));
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  pg.on('pageerror', e => console.error('PAGEERROR', e.message));
  await pg.goto('file://' + path.join(__dirname, 'overlay.html'));
  const info = await pg.evaluate(([s, base]) => window.init(s, base), [script, 'file://' + dir]);
  await pg.evaluate(() => document.fonts.ready);
  await pg.evaluate(() => Promise.all([...document.querySelectorAll('.av')].map(() => 0)));
  const shrunk = await pg.evaluate(() => window.fit()); if (shrunk.length) console.log('title shrunk:', JSON.stringify(shrunk));
  console.log('info', JSON.stringify(info));
  await pg.evaluate(() => window.renderAt(0)); await pg.waitForTimeout(300); // let avatar images decode
  const out = path.join(dir, 'build', stills ? 'stills' : 'ui'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  if (stills) { for (const t of stills) { await pg.evaluate(t => window.renderAt(t), t); await pg.screenshot({ path: path.join(out, `s${t.toFixed(1)}.png`), omitBackground: true }); } await b.close(); return; }
  const N = Math.ceil(info.duration * FPS); let prev = null, list = [], cur = null, n = 0; const t0 = Date.now();
  for (let f = 0; f < N; f++) {
    const sig = await pg.evaluate(t => window.renderAt(t), f / FPS);
    if (sig !== prev) { const file = `u${String(n++).padStart(5, '0')}.png`; await pg.screenshot({ path: path.join(out, file), omitBackground: true });
      if (cur) list.push(cur); cur = { file, frames: 1 }; prev = sig; } else cur.frames++;
    if (f % 600 === 0) console.log(`frame ${f}/${N} unique ${n} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  list.push(cur);
  const txt = list.map(c => `file '${c.file}'\nduration ${(c.frames / FPS).toFixed(6)}`).join('\n') + `\nfile '${cur.file}'\n`;
  fs.writeFileSync(path.join(out, 'list.txt'), txt); console.log(`done: ${n} unique frames of ${N}`);
  await b.close();
})();
