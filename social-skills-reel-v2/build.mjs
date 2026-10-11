// Build the single self-contained index.html: CSS + JS + fonts (base64) + icons + beat grid inlined.
//   node social-skills-reel-v2/build.mjs   (from the project folder)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..');
const rd = (p) => fs.readFileSync(path.join(DIR, p), 'utf8');
const b64 = (p, mime) => `data:${mime};base64,${fs.readFileSync(path.join(DIR, p)).toString('base64')}`;
let css = rd('src/film.css')
  .replace('@@FONT_RUBIK_HE@@', b64('fonts/rubik-hebrew.woff2', 'font/woff2'))
  .replace('@@FONT_RUBIK_LA@@', b64('fonts/rubik-latin.woff2', 'font/woff2'))
;
const js = rd('src/film.js').replace('@@SIGAL@@', b64('assets/sigal.jpg', 'image/jpeg')).replace('@@GRAIN@@', b64('assets/grain.png', 'image/png'));
const beats = JSON.parse(rd('beats.json'));
const grid = { period: beats.period, offset: beats.offset, bpm: beats.bpm };
const ICON_DIR = path.join(ROOT, 'node_modules/lucide-static/icons');
const names = new Set([...js.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]).filter((n) => fs.existsSync(path.join(ICON_DIR, `${n}.svg`))));
const icons = {};
for (const n of names) {
  const svg = fs.readFileSync(path.join(ICON_DIR, `${n}.svg`), 'utf8');
  icons[n] = svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>')).replace(/\s+/g, ' ').trim();
}
const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>מרכז דיאלוג · קבוצת חברים</title>
<style>${css}</style>
</head>
<body>
<div id="stage"></div>
<script>
const GRID = ${JSON.stringify(grid)};
const ICONS = ${JSON.stringify(icons)};
const EMO = ${rd('assets/emoji.json')};
const SHADOW = ${rd('assets/shadow.json')};
</script>
<script>
${js}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(DIR, 'index.html'), html);
console.log(`index.html ${(html.length / 1024).toFixed(0)} KB, ${names.size} icons`);
