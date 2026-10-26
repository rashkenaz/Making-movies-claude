import { chromium } from 'playwright';
import path from 'node:path';
const [film, out, ...ts] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push(m.text()));
await p.goto('file://' + path.resolve(film, 'index.html') + '?render=1');
await p.waitForFunction(() => window.filmReady);
for (const t of ts) { await p.evaluate(x => window.seek(x), +t); await p.screenshot({ path: `${out}/s_${t}.png` }); }
console.log('errors:', errs);
await b.close();
