// usage: node shot.js page.html out.png "js expression to run"
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const [page, out, expr] = process.argv.slice(2); const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  pg.on('pageerror', e => console.error('PAGEERROR', e.message)); pg.on('console', m => { if (m.type() === 'error' || m.type() === 'log') console.log('CONSOLE', m.text()); });
  await pg.goto('file://' + path.resolve(page)); await pg.evaluate(() => window.ready);
  const t0 = Date.now(); await pg.evaluate(expr); console.log('draw ms', Date.now() - t0);
  const d = await pg.evaluate(() => document.getElementById('c').toDataURL('image/png').slice(22));
  require('fs').writeFileSync(out, Buffer.from(d, 'base64')); await b.close();
})();
