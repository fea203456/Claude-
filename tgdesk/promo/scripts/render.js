// Renders a range of the promo's subframes (120 per second) straight into FFmpeg, which averages each
// pair into one 60 fps frame (a light motion blur) and encodes an intermediate H.264 file.
// Usage: node render.js <url> <first subframe> <end subframe> <out.mp4>
const {chromium} = require('playwright');
const {spawn} = require('child_process');

const SUB = 120;
(async() => {
  const [url, first, end, out] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1920, height: 1080}});
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  await page.goto(url);
  await page.evaluate(() => window.ready);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(SUB), '-i', '-',
    '-vf', "tmix=frames=2:weights='1 1',select='mod(n\\,2)',setpts=N/60/TB", '-r', '60',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p', out], {stdio: ['pipe', 'inherit', 'inherit']});
  const t0 = Date.now();
  for(let i = +first; i < +end; ++i) {
    await page.evaluate((t) => window.renderAt(t), i / SUB);
    const buf = await page.screenshot({type: 'jpeg', quality: 95, animations: 'disabled', caret: 'initial'});
    if(!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if((i - first) % 240 === 0) console.log(out, i, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
  console.log('done', out);
})().catch((e) => { console.error(e); process.exit(1); });
