// Renders each Hebrew overlay as a transparent 1080x1920 PNG (Varela Round, brand colours).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const b64 = (p) => fs.readFileSync(path.join(DIR, p)).toString('base64');
export const OV = [
  // id, html, top(px)
  ['title', `<div class="plate"><div class="big">מתכון לחברות</div><div class="sub">מנה אחת · לילד/ה אחד/ת</div></div>`, 270],
  ['ing1', `<div class="pill"><i style="background:#F7987D"></i>כוס גדושה של ביטחון עצמי</div>`, 290],
  ['ing2', `<div class="pill"><i style="background:#90C6E9"></i>כוס אומץ ליזום</div>`, 290],
  ['ing3', `<div class="pill"><i style="background:#BFE0F2"></i>כפית רוגע</div>`, 290],
  ['ing4', `<div class="pill"><i style="background:#9CC48C"></i>חופן הקשבה</div>`, 290],
  ['ing5', `<div class="pill"><i style="background:#F2D64B"></i>קורט סבלנות לתור</div>`, 290],
  ['ing6', `<div class="pill"><i style="background:#FFFFFF;border:3px solid #C9C2B8"></i>כף גמישות</div>`, 290],
  ['mix1', `<div class="pill">מערבבים במשחקים</div>`, 290],
  ['mix2', `<div class="pill">מוסיפים משחקי תפקידים</div>`, 290],
  ['mix3', `<div class="pill">מתבלים בשיח במרחב בטוח</div>`, 290],
  ['mix4', `<div class="pill">ומגישים עם הדרכת הורים</div>`, 290],
  ['cook1', `<div class="pill">פירגון על תוצאות</div>`, 290],
  ['cook2', `<div class="plate"><div class="big" style="font-size:84px">זמן הכנה: תלוי בכם.</div></div>`, 270],
  ['cta', `<div class="cta"><div class="l1">להרשמה: <bdi>merkazdialog.com/social-skills</bdi></div><div class="l2">או בוואטסאפ <bdi>050-6133093</bdi></div></div>`, 1580],
];
const css = `
@font-face{font-family:V;src:url(data:font/woff2;base64,${b64('fonts/varela-he.woff2')}) format('woff2');unicode-range:U+0590-05FF,U+200C-2010,U+FB1D-FB4F}
@font-face{font-family:V;src:url(data:font/woff2;base64,${b64('fonts/varela-la.woff2')}) format('woff2');unicode-range:U+0000-00FF,U+2000-206F}
*{margin:0;padding:0;box-sizing:border-box} html,body{width:1080px;height:1920px;background:transparent;font-family:V,sans-serif;direction:rtl}
.wrap{position:absolute;left:0;right:0;display:flex;justify-content:center}
.plate{background:rgba(252,246,236,.94);border-radius:48px;padding:26px 56px 34px;text-align:center;box-shadow:0 14px 40px rgba(58,56,72,.18)}
.big{font-size:100px;color:#3A3848;line-height:1.15}
.sub{font-size:50px;color:#C46A5C;margin-top:8px}
.pill{display:flex;align-items:center;gap:24px;background:rgba(255,255,255,.95);border-radius:70px;padding:24px 50px 28px;font-size:56px;color:#3A3848;box-shadow:0 14px 36px rgba(58,56,72,.18);white-space:nowrap}
.pill i{display:block;width:38px;height:38px;border-radius:50%}
.cta{margin:0 80px;width:920px;background:#C46A5C;color:#fff;border-radius:40px;padding:14px 20px 18px;text-align:center;box-shadow:0 14px 34px rgba(58,56,72,.22)}
.cta .l1{font-size:40px;line-height:1.3}.cta .l2{font-size:34px;line-height:1.3}
bdi{unicode-bidi:isolate}`;
const out = path.join(DIR, 'build/ov');
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
for (const [id, html, top] of OV) {
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div class="wrap" style="top:${top}px">${html}</div></body></html>`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(out, `${id}.png`), omitBackground: true });
}
await b.close();
console.log('overlays:', OV.length);
