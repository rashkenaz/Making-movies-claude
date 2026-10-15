// Builds end/index.html: the 9 s Merkaz Dialog end card for the recipe reel (pure function of time).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIR = path.dirname(fileURLToPath(import.meta.url));
const b64 = (p, m) => `data:${m};base64,${fs.readFileSync(path.join(DIR, '..', p)).toString('base64')}`;
const LOGO_PATH = 'M56.7,35 C40,46.7 38.3,76.7 58.3,96.7 C70,108.3 83.3,116.7 92.7,124 L68.3,156.7 C65,161.7 68.3,165 75,163.3 L146.7,138.3 C173.3,136.7 200,133.3 217.3,120';
const DOTS = [[85, 63.3, 23.3, '#E98560'], [124.3, 106.7, 23.3, '#E5E783'], [148.3, 48.3, 19, '#6EB8EE'], [183.3, 100, 19, '#AFD6A5'], [195.7, 25, 15.7, '#A2ABBD']];
const TILES = [['כיתות א׳–ו׳', 'שלוש קבוצות גיל', '#FDE3D8'], ['עד 8 ילדים', 'בכל קבוצה', '#E2F1FB'], ['ימי רביעי', 'אחר הצהריים', '#E8F4E0'], ['קריית אתא', 'שלום עליכם 5', '#FFF6C4']];
const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:V;src:url(${b64('fonts/varela-he.woff2', 'font/woff2')}) format('woff2');unicode-range:U+0590-05FF,U+200C-2010,U+FB1D-FB4F}
@font-face{font-family:V;src:url(${b64('fonts/varela-la.woff2', 'font/woff2')}) format('woff2');unicode-range:U+0000-00FF,U+2000-206F}
*{margin:0;padding:0;box-sizing:border-box} html,body{width:1080px;height:1920px;overflow:hidden;background:#FCF6EC;font-family:V,sans-serif}
#stage{position:absolute;left:0;top:0;width:1080px;height:1920px;overflow:hidden;background:#FCF6EC}
.b{position:absolute;border-radius:50%}
.c{position:absolute;left:0;right:0;text-align:center;white-space:nowrap}
.tile{position:absolute;width:420px;height:200px;border-radius:40px;background:#fff;box-shadow:0 14px 36px rgba(58,56,72,.08);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.tile .t{font-size:52px;color:#3A3848}.tile .s{font-size:34px;color:#8C8797}
.tile i{position:absolute;top:22px;right:24px;width:26px;height:26px;border-radius:50%}
#sg{position:absolute;left:0;right:0;top:1200px;display:flex;justify-content:center;align-items:center;gap:30px}
#sg img{width:150px;height:150px;border-radius:50%;object-fit:cover;box-shadow:0 10px 30px rgba(58,56,72,.18)}
#sg div{font-size:50px;color:#3A3848}#sg span{color:#C46A5C}
#dt{position:absolute;left:50%;top:1395px;transform:translateX(-50%);background:#C46A5C;color:#fff;border-radius:60px;padding:22px 56px 26px;font-size:52px;white-space:nowrap}
.cta{position:absolute;left:80px;width:920px;top:1592px;background:#C46A5C;color:#fff;border-radius:40px;padding:14px 20px 18px;text-align:center;box-shadow:0 14px 34px rgba(58,56,72,.22)}
.cta .l1{font-size:40px;line-height:1.3}.cta .l2{font-size:34px;line-height:1.3}
bdi{unicode-bidi:isolate}
#grain{position:absolute;inset:0;opacity:.06;mix-blend-mode:multiply;background:url(${b64('assets/grain.png', 'image/png')});background-size:256px}
</style></head><body><div id="stage">
<div class="b" id="b1" style="width:520px;height:520px;left:-180px;top:-120px;background:#FDE3D8"></div>
<div class="b" id="b2" style="width:420px;height:420px;left:800px;top:520px;background:#E2F1FB"></div>
<div class="b" id="b3" style="width:460px;height:460px;left:-140px;top:1420px;background:#E8F4E0"></div>
<svg id="logo" viewBox="0 0 243 183" width="250" height="188" style="position:absolute;left:415px;top:250px;overflow:visible">
<path id="ls" d="${LOGO_PATH}" pathLength="1" fill="none" stroke="#4E4B5D" stroke-width="7.4" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1"/>
${DOTS.map(([x, y, r, c], i) => `<circle class="ld" cx="${x}" cy="${y}" r="${r}" fill="${c}" style="transform-box:fill-box;transform-origin:center;transform:scale(0)"/>`).join('')}</svg>
<div class="c" id="t1" style="top:470px;font-size:96px;color:#3A3848">קבוצת חברים</div>
<div class="c" id="t2" style="top:600px;font-size:42px;color:#C46A5C">קבוצה לפיתוח מיומנויות חברתיות · מרכז דיאלוג</div>
${TILES.map(([a, s, c], i) => `<div class="tile" id="tl${i}" style="left:${i % 2 ? 100 : 560}px;top:${720 + Math.floor(i / 2) * 230}px"><i style="background:${c}"></i><div class="t">${a}</div><div class="s">${s}</div></div>`).join('')}
<div id="sg"><img src="${b64('assets/sigal.jpg', 'image/jpeg')}" alt=""><div>בהנחיית <span>סיגל וצלר</span></div></div>
<div id="dt">פתיחה <bdi>18.11</bdi> · הרשמה עד <bdi>11.11</bdi></div>
<div class="cta"><div class="l1">להרשמה: <bdi>merkazdialog.com/social-skills</bdi></div><div class="l2">או בוואטסאפ <bdi>050-6133093</bdi></div></div>
<div id="grain"></div></div>
<script>
const DURATION=9, clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)), prog=(t,a,b)=>clamp((t-a)/(b-a));
const spring=(t,k=260,d=17)=>{if(t<=0)return 0;const w=Math.sqrt(k),z=d/(2*Math.sqrt(k)),wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+z*w/wd*Math.sin(wd*t));};
const out=(x)=>1-(1-x)**3;
const pop=(el,t0,t,dy=50,s0=.8,base='')=>{const k=spring(t-t0);el.style.opacity=clamp(k*2.2).toFixed(2);el.style.transform=base+' translateY('+((1-k)*dy).toFixed(1)+'px) scale('+(s0+(1-s0)*k).toFixed(3)+')';};
function apply(t){
  ['b1','b2','b3'].forEach((id,i)=>{document.getElementById(id).style.transform='translate('+(30*Math.sin(t*.3+i)).toFixed(1)+'px,'+(30*Math.cos(t*.25+i*2)).toFixed(1)+'px)';});
  document.getElementById('ls').setAttribute('stroke-dashoffset',(1-out(prog(t,0.05,1.1))).toFixed(3));
  document.querySelectorAll('.ld').forEach((d,i)=>{d.style.transform='scale('+clamp(spring(t-0.7-i*.1),0,1.3).toFixed(3)+')';});
  pop(document.getElementById('t1'),0.35,t,40,.9); pop(document.getElementById('t2'),0.6,t,30,.95);
  for(let i=0;i<4;i++) pop(document.getElementById('tl'+i),1.0+i*0.28,t,60,.75);
  pop(document.getElementById('sg'),2.4,t,40,.9);
  pop(document.getElementById('dt'),3.0,t,60,.6,'translateX(-50%)');
}
window.DURATION=DURATION; window.seek=async(t)=>{await document.fonts.ready;apply(clamp(t,0,DURATION));};
document.fonts.ready.then(()=>{apply(0);window.filmReady=true;});
</script></body></html>`;
fs.writeFileSync(path.join(DIR, 'index.html'), html);
fs.writeFileSync(path.join(DIR, 'film.json'), JSON.stringify({ title: 'recipe end card', duration: 9, formats: ['9x16'] }));
console.log('end/index.html written');
