// Renders single frames of the promo at given times: node stills.js <url> <out dir> <t1> <t2> ...
const {chromium} = require('playwright');
(async() => {
  const [url, out, ...times] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1920, height: 1080}});
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto(url);
  await page.evaluate(() => window.ready);
  for(const t of times) {
    await page.evaluate((t) => window.renderAt(t), +t);
    await page.screenshot({path: `${out}/still-${t}.png`, animations: 'disabled', caret: 'initial'});
  }
  await browser.close();
})();
