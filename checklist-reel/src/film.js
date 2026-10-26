// "האם זה מוכר לך?": a 9:16 reel for Merkaz Dialog's "קבוצת חברים". Pure function of time:
// window.seek(t) sets every style from t alone. A notepad checklist: six lines, each ticked on the bar;
// a sticky note; the page flips to "את כל אלה אפשר לתרגל". The end card is a separate clip joined in ffmpeg.
/* global GRID, ICONS */

(() => {
  const PARAMS = new URLSearchParams(location.search);
  const RENDER = PARAMS.get('render') === '1';
  const PREVIEW = PARAMS.get('preview') === '1';
  const DURATION = 31.86;
  const SW = 1080, SH = 1920;

  // ------------------------------------------------------------------ math
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  function cb(x1, y1, x2, y2) {
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let u = x;
      for (let i = 0; i < 10; i++) {
        const bx = 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3 - x;
        const dx = 3 * x1 * (1 - u) ** 2 + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u * u;
        if (Math.abs(bx) < 1e-5 || Math.abs(dx) < 1e-6) break;
        u = clamp(u - bx / dx);
      }
      return 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
    };
  }
  const EZ = { io: cb(0.65, 0, 0.35, 1), out: cb(0.16, 1, 0.3, 1), pen: cb(0.4, 0, 0.2, 1), flip: cb(0.55, 0, 0.25, 1) };
  function spring(t, { stiffness = 170, damping = 18, mass = 1 } = {}) {
    if (t <= 0) return 0;
    const w0 = Math.sqrt(stiffness / mass), z = damping / (2 * Math.sqrt(stiffness * mass));
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  const SPR = { pop: { stiffness: 380, damping: 20 }, ui: { stiffness: 260, damping: 24 }, soft: { stiffness: 140, damping: 17 } };
  const sp = (t, t0, cfg = SPR.ui) => spring(t - t0, cfg);

  // ------------------------------------------------------------------ timeline (music: 99.4 bpm, bars from 0.65 s)
  const BAR = (n) => 0.65 + n * 4 * 0.6037;   // bar n downbeat (measured: 0.65, 3.065, 5.457, 7.872 ...)
  const T_TITLE = 0.65, T_SUB = 1.86;
  const ITEMS = [
    'מתבייש להצטרף למשחק בהפסקה',
    'לא יודעת איך להתחיל שיחה',
    'נעלב מהר ומתקשה לחזור למשחק',
    'לא מבינה למה החברים כעסו עליה',
    'קשה לו כשמשהו לא הולך לפי התוכנית',
    'אומרת "אף אחד לא רוצה לשחק איתי"',
  ];
  const SKILLS = [
    'להצטרף למשחק בביטחון',
    'ליזום שיחה עם חברים',
    'להתמודד עם עלבון ולחזור למשחק',
    'להבין מה קרה ולמה',
    'לזרום כשמשהו משתנה',
    'להאמין בעצמי',
  ];
  const T_ITEM = (i) => BAR(1 + i) - 0.0;       // 3.07, 5.46, 7.87, 10.26, 12.66, 15.07
  const T_CHECK = (i) => T_ITEM(i) + 2 * 0.6037; // two beats later: read, then tick
  const T_STICKY = 17.46;                       // bar 7
  const T_FLIP = 22.27;                         // bar 9, after the break in the music
  const T_P2TTL = 22.87;
  const T_SKILL = (i) => 23.48 + i * 0.6037;
  const T_TAG = 27.68;
  const ROW_Y = (i) => 300 + i * 118;           // page coordinates

  // ------------------------------------------------------------------ DOM
  const ic = (name) => `<svg class="i" viewBox="0 0 24 24">${ICONS[name]}</svg>`;
  const CHECK = (color) => `<svg viewBox="0 0 116 116"><path pathLength="1" d="M14,64 C22,70 30,80 38,94 C50,66 72,36 108,8" stroke="${color}"/></svg>`;
  const rules = Array.from({ length: 6 }, (_, i) => `<div class="rule" style="top:${ROW_Y(i) + 112}px"></div>`).join('');
  const rowHTML = (txt, i, p, g) => `<div class="row${g ? ' g' : ''}" id="${p}${i}" style="top:${ROW_Y(i)}px"><div class="box">${CHECK(g ? '#7BAA6C' : '#C46A5C')}</div><div class="txt">${txt}</div></div>`;

  const stage = document.getElementById('stage');
  stage.innerHTML = `
    <div class="abs" id="bg" style="width:1080px;height:1920px">
      <div class="blob" id="b1" style="width:560px;height:560px;background:#FDE3D8"></div>
      <div class="blob" id="b2" style="width:420px;height:420px;background:#E2F1FB"></div>
      <div class="blob" id="b3" style="width:480px;height:480px;background:#E8F4E0"></div>
      <div class="blob" id="b4" style="width:300px;height:300px;background:#FFF6C4"></div>
    </div>
    <div id="pad">
      <div class="page" id="p2"><div class="margin"></div>${rules}
        <div class="ttl t1" id="p2t" style="font-size:78px;top:92px">את כל אלה אפשר לתרגל</div>
        ${SKILLS.map((s, i) => rowHTML(s, i, 'k', true)).join('')}
        <div class="tag" id="tag">בקבוצת חברים · מרכז דיאלוג</div>
        <div class="shade" id="p2s" style="border-radius:34px"></div>
      </div>
      <div class="page" id="p1"><div class="margin"></div>${rules}
        <div class="ttl t1" id="t1">האם זה מוכר לך?</div>
        <div class="ttl t2" id="t2">סמנו מה מאפיין את הילד/ה שלכם</div>
        ${ITEMS.map((s, i) => rowHTML(s, i, 'r', false)).join('')}
        <div id="sticky" style="left:70px;top:18px"><div class="tape"></div><div class="s1">סימנתם אפילו אחד?</div><div class="s2">יש אפשרות שנוכל לעזור לכם.</div></div>
        <div class="shade" id="p1s" style="border-radius:34px"></div>
      </div>
    </div>
    <div id="rings">${'<span></span>'.repeat(12)}</div>
    <div id="cta"><div class="l1">להרשמה: <bdi>merkazdialog.com/social-skills</bdi></div><div class="l2">או בוואטסאפ <bdi>050-6133093</bdi></div></div>
    <div id="grain" style="background-image:url(@@GRAIN@@)"></div>`;

  const $ = (id) => document.getElementById(id);
  const E = {};
  ['b1', 'b2', 'b3', 'b4', 'pad', 'p1', 'p2', 'p1s', 'p2s', 't1', 't2', 'p2t', 'sticky', 'tag', 'cta', 'rings'].forEach((k) => { E[k] = $(k); });
  const R = ITEMS.map((_, i) => ({ row: $(`r${i}`), box: $(`r${i}`).querySelector('.box'), path: $(`r${i}`).querySelector('path'), txt: $(`r${i}`).querySelector('.txt') }));
  const K = SKILLS.map((_, i) => ({ row: $(`k${i}`), box: $(`k${i}`).querySelector('.box'), path: $(`k${i}`).querySelector('path'), txt: $(`k${i}`).querySelector('.txt') }));
  function measure() {
    // a line that does not fit the page width is set a little smaller
    const avail = 920 - 34 - 52 - 78 - 34;
    [...R, ...K].forEach((r) => { const w = r.txt.scrollWidth; if (w > avail) r.txt.style.fontSize = `${(48 * avail / w).toFixed(1)}px`; });
  }

  // ------------------------------------------------------------------ helpers
  function writeOn(el, t, t0, dur = 0.75) {
    // RTL handwriting: the text is uncovered from its right edge to its left
    const p = EZ.pen(prog(t, t0, t0 + dur));
    el.style.clipPath = `inset(-20px 0 -20px ${f(100 - p * 100)}%)`;
    el.style.opacity = p > 0 ? 1 : 0;
  }
  const f = (n) => n.toFixed(2);
  function popIn(el, t, t0, cfg = SPR.pop, from = 0.5) {
    const s = sp(t, t0, cfg);
    el.style.opacity = clamp((t - t0) / 0.12);
    el.style.transform = `scale(${f(lerp(from, 1, s))})`;
  }
  function tick(row, t, t0) {
    const p = EZ.pen(prog(t, t0, t0 + 0.32));
    row.path.style.strokeDasharray = '1 1';
    row.path.style.strokeDashoffset = f(1 - p);
    row.path.style.opacity = p > 0 ? 1 : 0;
    // the box nods when the pen lands
    const k = t > t0 ? Math.exp(-(t - t0 - 0.3) * 7) * Math.sin(Math.max(0, t - t0 - 0.3) * 26) : 0;
    return 1 + (t > t0 + 0.3 ? 0.08 * k : 0);
  }

  // ------------------------------------------------------------------ apply(t)
  function apply(t) {
    // background blobs drift slowly
    const d = (a, ph) => Math.sin(t * 0.35 + ph) * a;
    E.b1.style.transform = `translate(${f(-200 + d(30, 0))}px, ${f(-140 + d(24, 1))}px)`;
    E.b2.style.transform = `translate(${f(800 + d(26, 2))}px, ${f(160 + d(30, 3))}px)`;
    E.b3.style.transform = `translate(${f(-140 + d(28, 4))}px, ${f(1460 + d(22, 5))}px)`;
    E.b4.style.transform = `translate(${f(850 + d(20, 6))}px, ${f(1640 + d(26, 1.5))}px)`;

    // the pad arrives
    const a = sp(t, 0.05, SPR.soft);
    E.pad.style.transform = `translateY(${f((1 - a) * 160)}px)`;
    E.pad.style.opacity = clamp(t / 0.25);
    E.rings.style.transform = E.pad.style.transform;
    E.rings.style.opacity = E.pad.style.opacity;
    E.cta.style.opacity = clamp((t - 0.4) / 0.4);
    E.cta.style.transform = `translateY(${f((1 - sp(t, 0.4)) * 40)}px)`;

    // page 1: title, subtitle, six lines, ticks
    popIn(E.t1, t, T_TITLE, SPR.pop, 0.7);
    writeOn(E.t2, t, T_SUB, 0.9);
    R.forEach((r, i) => {
      popIn(r.box, t, T_ITEM(i), SPR.pop, 0.4);
      writeOn(r.txt, t, T_ITEM(i) + 0.12, 0.8);
      const s = tick(r, t, T_CHECK(i));
      if (t > T_CHECK(i)) r.box.style.transform = `scale(${f(s)})`;
    });
    // sticky note slaps on over the title
    const st = sp(t, T_STICKY, { stiffness: 320, damping: 19 });
    E.sticky.style.opacity = clamp((t - T_STICKY) / 0.08);
    E.sticky.style.transform = `translateY(${f((1 - st) * -60)}px) rotate(${f(lerp(-9, -2.5, st))}deg) scale(${f(lerp(1.25, 1, st))})`;

    // the flip: page 1 lifts over the top binding, page 2 is underneath
    const fp = EZ.flip(prog(t, T_FLIP, T_FLIP + 0.62));
    E.p1.style.transform = `rotateX(${f(fp * 118)}deg)`;
    E.p1.style.visibility = fp >= 0.99 ? 'hidden' : 'visible';
    E.p1s.style.opacity = f(fp * 0.25);
    E.p2.style.visibility = t >= T_FLIP - 0.05 ? 'visible' : 'hidden';
    E.p2s.style.opacity = f((1 - fp) * 0.18 * (fp > 0 ? 1 : 0));
    popIn(E.p2t, t, T_P2TTL, SPR.pop, 0.75);
    K.forEach((k, i) => {
      popIn(k.box, t, T_SKILL(i), SPR.pop, 0.4);
      writeOn(k.txt, t, T_SKILL(i) + 0.08, 0.55);
      const s = tick(k, t, T_SKILL(i) + 0.18);
      if (t > T_SKILL(i) + 0.18) k.box.style.transform = `scale(${f(s)})`;
    });
    popIn(E.tag, t, T_TAG, SPR.pop, 0.8);
  }

  // ------------------------------------------------------------------ sound on picture (seconds), read by sfx.py
  function hits() {
    const H = [['pad', 0.05, 'whoosh'], ['title', T_TITLE, 'pop'], ['subtitle', T_SUB, 'pencil']];
    ITEMS.forEach((_, i) => { H.push([`line ${i + 1}`, T_ITEM(i), 'pop']); H.push([`write ${i + 1}`, T_ITEM(i) + 0.12, 'pencil']); H.push([`tick ${i + 1}`, T_CHECK(i), 'check']); });
    H.push(['sticky', T_STICKY + 0.04, 'slap']);
    H.push(['flip', T_FLIP, 'flip']);
    H.push(['title 2', T_P2TTL, 'pop']);
    SKILLS.forEach((_, i) => H.push([`skill ${i + 1}`, T_SKILL(i) + 0.18, 'check']));
    H.push(['tag', T_TAG, 'pop']);
    return H;
  }

  // ------------------------------------------------------------------ boot + harness
  let ready = null;
  async function boot() {
    await document.fonts.load('400 40px "Varela Round"', 'אבג Abc 123');
    await document.fonts.ready;
    measure();
    window.HITS = hits();
    fit();
    apply(0);
  }
  function fit() {
    if (RENDER) { stage.style.transform = 'none'; return; }
    const bar = PREVIEW ? 54 : 0;
    const sc = Math.min(innerWidth / SW, (innerHeight - bar) / SH);
    stage.style.transform = `translate(${(innerWidth - SW * sc) / 2}px, ${(innerHeight - bar - SH * sc) / 2}px) scale(${sc})`;
  }
  addEventListener('resize', fit);
  window.DURATION = DURATION;
  window.seek = async (t) => { await ready; apply(clamp(t, 0, DURATION)); };
  ready = boot().then(() => { window.filmReady = true; });
})();
