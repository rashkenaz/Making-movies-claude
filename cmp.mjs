import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });
async function grab(file, ts) {
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + file + '?render=1'); await p.waitForFunction(() => window.filmReady === true);
  const out = [];
  for (const t of ts) { await p.evaluate((x) => window.seek(x), t); out.push(await p.screenshot()); }
  await p.close(); return out;
}
const ts = [0.5, 6, 9.5, 14, 25, 31, 40, 50, 58, 66, 71, 76, 82, 88];
const a = await grab('/tmp/claude-0/oldfilm/index.html', ts), c = await grab(process.cwd() + '/dialog-trainings/index.html', ts);
ts.forEach((t, i) => console.log(t, a[i].equals(c[i]) ? 'identical' : 'DIFFERENT'));
await b.close();
