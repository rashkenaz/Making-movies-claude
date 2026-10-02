// Frame-exact render with sub-frame motion blur, straight from Playwright into ffmpeg (no PNGs on disk).
// Each output frame = 4 sub-frames spread over half the frame duration, piped at 240 fps, merged with
// tmix=frames=4, then select keeps the frame where all four were merged, setpts makes it 60 fps.
// Workers render contiguous segments in parallel; segments are concatenated without re-encoding.
//   node render-pipe.mjs <film> [--workers 2] [--from 0] [--to 90]
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const film = process.argv[2];
const opt = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const W = opt('workers', 2), FPS = 60, SUB = 4, SHUTTER = 0.5;
const fi = process.argv.indexOf('--format'); const FMT = fi > 0 ? process.argv[fi + 1] : '16x9';
const [VW, VH] = FMT === '9x16' ? [1080, 1920] : [1920, 1080];
const cfg = JSON.parse(fs.readFileSync(path.join(film, 'film.json'), 'utf8'));
const FROM = opt('from', 0), TO = opt('to', cfg.duration);
const OUT = path.join('out', film);
const SEG = path.join(OUT, `segments_${FMT}`);
fs.rmSync(SEG, { recursive: true, force: true });
fs.mkdirSync(SEG, { recursive: true });
const f0 = Math.round(FROM * FPS), f1 = Math.round(TO * FPS), N = f1 - f0;
const per = Math.ceil(N / W);
const url = 'file://' + path.resolve(film, 'index.html') + `?render=1&format=${FMT}`;
const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });
const t0 = Date.now();
let done = 0;
const tick = () => { done++; if (done % 120 === 0) process.stdout.write(`\r  ${done}/${N} frames  ${(done / ((Date.now() - t0) / 1000)).toFixed(2)} fps  `); };

async function segment(w) {
  const a = f0 + w * per, b = Math.min(f1, a + per);
  if (a >= b) return null;
  const page = await browser.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page]', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.filmReady === true, null, { timeout: 60000 });
  const cdp = await page.context().newCDPSession(page);
  const file = path.join(SEG, `seg${String(w).padStart(2, '0')}.mp4`);
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-c:v', 'png', '-i', '-',
    '-vf', `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/(${FPS}*TB),scale=out_color_matrix=bt709:out_range=tv,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const closed = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exit ${c}`)))));
  for (let i = a; i < b; i++) {
    for (let k = 0; k < SUB; k++) {
      const t = i / FPS + ((k + 0.5) / SUB - 0.5) * (SHUTTER / FPS);
      await page.evaluate((x) => window.seek(Math.max(0, x)), t);
      const buf = Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true })).data, 'base64');
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    tick();
  }
  ff.stdin.end();
  await closed;
  await page.close();
  return file;
}
const files = (await Promise.all(Array.from({ length: W }, (_, w) => segment(w)))).filter(Boolean);
await browser.close();
fs.writeFileSync(path.join(SEG, 'list.txt'), files.map((f) => `file '${path.resolve(f)}'`).join('\n'));
const dst = path.join(OUT, FROM === 0 && TO === cfg.duration ? `video_${FMT}.mp4` : `video_part_${FMT}_${FROM}-${TO}.mp4`);
const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(SEG, 'list.txt'), '-c', 'copy', '-movflags', '+faststart', dst], { stdio: 'inherit' });
if (r.status !== 0) process.exit(1);
console.log(`\n-> ${dst}  (${((Date.now() - t0) / 60000).toFixed(1)} min)`);
