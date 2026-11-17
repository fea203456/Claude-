// Puts the web client together for the desktop app: tweb's static files from `public/`
// (fonts, sounds, stickers, wasm), then the fresh build from `dist/` on top. Source maps and
// the stale bundles committed at the top of `public/` are left out.
// Usage: node assemble-app.js <tweb dir> <output dir>
const fs = require('fs');
const path = require('path');

const [twebDir, outDir] = process.argv.slice(2);
if(!twebDir || !outDir) {
  console.error('usage: node assemble-app.js <tweb dir> <output dir>');
  process.exit(1);
}

function copyTree(from, to, skip) {
  for(const entry of fs.readdirSync(from, {withFileTypes: true})) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if(skip(entry, source)) continue;
    if(entry.isDirectory()) {
      fs.mkdirSync(target, {recursive: true});
      copyTree(source, target, skip);
    } else if(entry.isFile()) {
      fs.copyFileSync(source, target);
    }
  }
}

const publicDir = path.join(twebDir, 'public');
const distDir = path.join(twebDir, 'dist');
fs.rmSync(outDir, {recursive: true, force: true});
fs.mkdirSync(outDir, {recursive: true});

const isMap = (entry) => entry.isFile() && entry.name.endsWith('.map');
copyTree(publicDir, outDir, (entry, source) => isMap(entry) || (
  path.dirname(source) === publicDir && entry.isFile() && /\.(js|css)$/.test(entry.name)
));
copyTree(distDir, outDir, isMap);
console.log('assembled', outDir);
