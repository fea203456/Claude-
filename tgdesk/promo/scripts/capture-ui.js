// Captures the real TgMod UI from tweb's popup sandbox (dev server + local sync server) for the promo:
// the decorated profile in every mod theme, the orbit effect, and a frame-exact bubbles sequence.
// Usage: node capture-ui.js <dev server url> <out dir> <seed script dir>
const {chromium} = require('playwright');
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const [url, out, seedDir] = process.argv.slice(2);
const CLIP = {x: 350, y: 16, width: 400, height: 768};
const seed = (frame, effect) => execFileSync('node', ['seed.mjs', '777002', frame, effect], {cwd: seedDir});

async function openProfile(page) {
  await page.goto(url + '/?popups=1');
  await page.waitForFunction(() => window.popupSandbox, null, {timeout: 120000});
  await page.evaluate(() => window.popupSandbox.ready);
  await page.evaluate(() => window.popupSandbox.open('peerProfile/user')).catch(() => {});
  await page.waitForSelector('.profile-avatars-container .tgmod-bubble', {timeout: 120000});
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Hide/.test(x.textContent)); b && b.click(); });
  await page.waitForTimeout(1500);
}

async function setTheme(page, base, id) {
  await page.evaluate(async([base, id]) => {
    const [settings, set] = window.useAppSettings();
    await set('theme', base);
    await set('tgmod', {...(settings.tgmod || {}), theme: id});
    window.themeController.setTheme();
  }, [base, id]);
  await page.waitForTimeout(1200);
}

(async() => {
  fs.mkdirSync(path.join(out, 'bubbles'), {recursive: true});
  const browser = await browser_();
  async function browser_() { return chromium.launch(); }

  // * themes, with the neon frame and the bubbles running
  seed('neon', 'bubbles');
  let page = await browser.newPage({viewport: {width: 1100, height: 800}, deviceScaleFactor: 2});
  await openProfile(page);
  for(const [base, id] of [['night', 'neon'], ['night', 'amoled'], ['night', 'glass'], ['day', 'sunset'], ['day', 'mint']]) {
    await setTheme(page, base, id);
    await page.screenshot({path: path.join(out, `theme-${id}.png`), clip: CLIP});
  }

  // * the bubbles, frame by frame on a fake clock: 6 s at 60 fps
  await setTheme(page, 'night', 'neon');
  await page.clock.install();
  await page.clock.runFor(500);
  for(let i = 0; i < 360; ++i) {
    await page.clock.runFor(1000 / 60);
    await page.screenshot({path: path.join(out, 'bubbles', String(i).padStart(4, '0') + '.png'), clip: {x: 350, y: 16, width: 400, height: 380}});
  }
  await page.close();

  // * the orbit with the gold frame
  seed('gold', 'orbit');
  page = await browser.newPage({viewport: {width: 1100, height: 800}, deviceScaleFactor: 2});
  await openProfile(page);
  await setTheme(page, 'night', 'neon');
  await page.screenshot({path: path.join(out, 'orbit.png'), clip: CLIP});
  await page.close();
  await browser.close();
  seed('neon', 'bubbles');
  console.log('captured');
})().catch((e) => { console.error(e); process.exit(1); });
