// מרכז דיאלוג · הדרכות מקצועיות: a 90 s explainer that is a pure function of time.
// window.seek(t) sets every style from t alone: no transitions, timers, rAF or state between frames.
// Timing is in beats (u) on the measured grid in beats.json (96 bpm); see docs/shotlist.md.
/* global GRID, ICONS, EMO, SHADOW */

(() => {
  const PARAMS = new URLSearchParams(location.search);
  const RENDER = PARAMS.get('render') === '1';
  const PREVIEW = PARAMS.get('preview') === '1';
  const P = GRID.period, OFF = GRID.offset;
  const DURATION = 90;
  const U = (t) => (t - OFF) / P;

  // ------------------------------------------------------------------ math
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (u, a, b) => clamp((u - a) / (b - a));
  const E = {
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
    outCubic: (t) => 1 - (1 - t) ** 3,
    inCubic: (t) => t * t * t,
    outQuint: (t) => 1 - (1 - t) ** 5,
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  };
  const smooth = (u, a, b) => E.inOutSine(prog(u, a, b));
  function spring(t, { stiffness = 170, damping = 18, mass = 1 } = {}) {
    if (t <= 0) return 0;
    const w0 = Math.sqrt(stiffness / mass), z = damping / (2 * Math.sqrt(stiffness * mass));
    if (z < 1) {
      const wd = w0 * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
    }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }
  const SPR = {
    ui: { stiffness: 320, damping: 27 },      // buttons, chips: quick, a hair of overshoot
    pop: { stiffness: 260, damping: 19 },     // things that arrive
    gentle: { stiffness: 120, damping: 20 },  // panels, pages
    cam: { stiffness: 34, damping: 11.2 },    // camera
    scroll: { stiffness: 46, damping: 13.4 }, // page scroll
  };
  const sp = (u, u0, cfg = SPR.ui) => spring((u - u0) * P, cfg);
  // keyed spring: [[u, value|array], ...]; each key is a step the spring chases (superposed, so pure in u)
  function springKeys(u, keys, cfg) {
    const arr = Array.isArray(keys[0][1]);
    let v = arr ? keys[0][1].slice() : keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const k = sp(u, keys[i][0], cfg);
      if (k === 0) break;
      if (arr) v = v.map((x, j) => x + (keys[i][1][j] - keys[i - 1][1][j]) * k);
      else v += (keys[i][1] - keys[i - 1][1]) * k;
    }
    return v;
  }
  // a value that is 0 before a, rises over `fade` beats, holds, falls before b
  const win = (u, a, b, fade = 0.3) => Math.min(smooth(u, a, a + fade), 1 - smooth(u, b - fade, b));
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hash01 = (i, seed = 1) => mulberry32((i * 374761393 + seed * 668265263) | 0)();
  function noise1(x, seed = 1) {
    const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
    return lerp(hash01(i, seed), hash01(i + 1, seed), s) * 2 - 1;
  }
  const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(t))).toString(16).padStart(2, '0')).join(''); };
  const SEG = new Intl.Segmenter('he', { granularity: 'grapheme' });
  const graphemes = (s) => [...SEG.segment(s)].map((x) => x.segment);

  // ------------------------------------------------------------------ markup helpers
  ICONS.cap2 = '<path d="M12 3.6 21.2 8.3 12 13 2.8 8.3z"/><path d="M6.4 10.4v4.4c0 1.7 2.5 3.2 5.6 3.2s5.6-1.5 5.6-3.2v-4.4"/>';
  const ic = (name, extra = '') => `<svg class="i" viewBox="0 0 24 24" ${extra}>${ICONS[name]}</svg>`;
  const C = {
    kids: { name: '<span>היחידה לטיפול בילדים ומתבגרים</span>', col: '#F7987D', tint: '#FDEDE7', ring: '#EE7A5C', ink: '#8A3A24', num: '#F07F60' },
    trauma: { name: '<span>היחידה לטיפול בטראומה</span>', col: '#BBA3E3', tint: '#F1ECFA', ring: '#9C83D6', ink: '#4B3A78', num: '#9C83D6' },
    cbt: { name: '<span>היחידה לטיפול <bdi>CBT</bdi></span>', col: '#90C6E9', tint: '#EAF4FB', ring: '#5BA4D6', ink: '#1F4E74', num: '#5BA4D6' },
  };
  const LOGO_PATH = 'M56.7,35 C40,46.7 38.3,76.7 58.3,96.7 C70,108.3 83.3,116.7 92.7,124 L68.3,156.7 C65,161.7 68.3,165 75,163.3 L146.7,138.3 C173.3,136.7 200,133.3 217.3,120';
  const LOGO_DOTS = [[85, 63.3, 23.3, '#E98560'], [124.3, 106.7, 23.3, '#E5E783'], [148.3, 48.3, 19, '#6EB8EE'], [183.3, 100, 19, '#AFD6A5'], [195.7, 25, 15.7, '#A2ABBD']];
  const logoSVG = (id, style = '') => `<svg id="${id}" viewBox="0 0 243 183" style="${style};overflow:visible">
    <path class="lstroke" d="${LOGO_PATH}" pathLength="1" fill="none" stroke="#4E4B5D" stroke-width="7.4" stroke-linejoin="round"/>
    ${LOGO_DOTS.map(([x, y, r, c]) => `<circle class="ld" cx="${x}" cy="${y}" r="${r}" fill="${c}" style="transform-box:fill-box;transform-origin:center"/>`).join('')}</svg>`;
  const miniLogo = (size) => `<svg viewBox="0 0 243 183" style="width:${size}px;height:${size * 0.75}px"><path d="${LOGO_PATH}" fill="none" stroke="#4E4B5D" stroke-width="11"/>${LOGO_DOTS.map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r * 1.08}" fill="${c}"/>`).join('')}</svg>`;

  // illustrated video-call participant (pure shapes, no real people)
  const HAIR = {
    short: (c) => `<path d="M208 160 C204 110 232 98 262 98 C294 98 318 114 312 160 C304 132 288 122 260 122 C234 122 216 134 208 160 Z" fill="${c}"/>`,
    long: (c) => `<path d="M210 150 C214 112 240 102 262 102 C290 102 312 118 312 150 C296 130 280 124 262 124 C240 124 222 132 210 150 Z" fill="${c}"/>`,
    bun: (c) => `<circle cx="260" cy="95" r="25" fill="${c}"/><path d="M208 160 C204 112 232 104 262 104 C294 104 318 116 312 160 C304 134 288 126 260 126 C234 126 216 136 208 160 Z" fill="${c}"/>`,
    curly: (c) => [[222, 128, 25], [246, 110, 27], [276, 110, 27], [300, 128, 25], [212, 152, 17], [310, 152, 17]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join(''),
    bald: (c) => `<path d="M214 178 C218 222 242 234 260 234 C278 234 302 222 306 178 C296 198 282 206 260 206 C238 206 224 198 214 178 Z" fill="${c}"/><path d="M211 168 C209 146 214 134 220 128 L222 160 Z M309 168 C311 146 306 134 300 128 L298 160 Z" fill="${c}"/>`,
  };
  function avatar(o, id) {
    const back = o.hs === 'long' ? `<path d="M200 172 C192 104 230 90 262 90 C298 90 330 108 322 174 C326 216 332 240 338 266 L186 266 C192 240 198 214 200 172 Z" fill="${o.hair}"/>` : '';
    const decor = o.decor === 0
      ? `<rect x="58" y="46" width="96" height="118" rx="6" fill="${o.wall2}"/><rect x="70" y="58" width="72" height="94" rx="3" fill="${o.art}"/><circle cx="98" cy="96" r="18" fill="#fff" opacity=".55"/>`
      : o.decor === 1
        ? `<rect x="392" y="214" width="56" height="64" rx="10" fill="${o.wall2}"/><ellipse cx="404" cy="190" rx="16" ry="34" fill="#7FB07A" transform="rotate(-20 404 190)"/><ellipse cx="436" cy="186" rx="16" ry="36" fill="#93C08B" transform="rotate(18 436 186)"/><ellipse cx="420" cy="172" rx="14" ry="38" fill="#6FA36B"/>`
        : `<rect x="0" y="222" width="150" height="10" fill="${o.wall2}"/><rect x="24" y="176" width="18" height="46" fill="${o.art}"/><rect x="46" y="186" width="14" height="36" fill="#E9C46A"/><rect x="64" y="170" width="20" height="52" fill="#9DB7D5"/>`;
    const glasses = o.glasses ? '<g fill="none" stroke="#2A2A2E" stroke-width="3.2"><circle cx="241" cy="168" r="14"/><circle cx="279" cy="168" r="14"/><path d="M255 168 h10"/></g>' : '';
    return `<svg class="av" viewBox="0 0 520 342" preserveAspectRatio="xMidYMid slice" id="${id}">
      <rect width="520" height="342" fill="${o.bg}"/>${decor}
      <g class="bd"><path d="M140 342 C140 270 196 244 260 244 C324 244 380 270 380 342 Z" fill="${o.shirt}"/>
      <rect x="238" y="200" width="44" height="56" rx="16" fill="${o.skin2}"/></g>
      <g class="hd">${back}<circle cx="210" cy="172" r="11" fill="${o.skin2}"/><circle cx="310" cy="172" r="11" fill="${o.skin2}"/>
      <ellipse cx="260" cy="166" rx="50" ry="58" fill="${o.skin}"/>${HAIR[o.hs](o.hair)}
      <circle cx="241" cy="168" r="5.5" fill="#2A2A2E"/><circle cx="279" cy="168" r="5.5" fill="#2A2A2E"/>${glasses}
      <path class="mo" d="M246 194 Q260 204 274 194" stroke="#8A4B3E" stroke-width="3.6" stroke-linecap="round" fill="none"/>
      <ellipse class="mo2" cx="260" cy="197" rx="9" ry="0" fill="#7A3B32"/></g></svg>`;
  }
  const PEOPLE = [
    { name: 'נועה · מנחה', bg: '#DCE7EF', wall2: '#C9D8E4', art: '#F3C9B7', skin: '#F1C7A8', skin2: '#E3B190', hair: '#5B3A29', hs: 'long', shirt: '#7FA6C9', decor: 0, glasses: false },
    { name: 'אורי', bg: '#EFE6DA', wall2: '#E2D5C3', art: '#B9D3C2', skin: '#D9A27C', skin2: '#C68D68', hair: '#2E2A28', hs: 'short', shirt: '#E6A57E', decor: 1, glasses: true },
    { name: 'דנה', bg: '#E8E3F1', wall2: '#D8D0E8', art: '#F2D98B', skin: '#F4D0B5', skin2: '#E6BB9C', hair: '#B5703F', hs: 'bun', shirt: '#9E8BC8', decor: 2, glasses: false },
    { name: 'יעל', bg: '#E2EEE4', wall2: '#CFE2D3', art: '#F2B8A6', skin: '#C98E6A', skin2: '#B57B58', hair: '#1F1B1A', hs: 'curly', shirt: '#F2C46D', decor: 0, glasses: false },
    { name: 'עמית', bg: '#F3E9E4', wall2: '#E8D9D0', art: '#A9C6E3', skin: '#EBC09F', skin2: '#D9AA86', hair: '#6B4A35', hs: 'bald', shirt: '#86B58A', decor: 1, glasses: true },
    { name: 'מיקי (אני)', bg: '#E9EEF3', wall2: '#D7DFE8', art: '#F6CFA0', skin: '#F0C6A4', skin2: '#E0AF8B', hair: '#3B2A22', hs: 'short', shirt: '#4E4B5D', decor: 2, glasses: false },
  ];

  const calendarIllus = `<svg class="cal" viewBox="0 0 170 200">
    <ellipse cx="88" cy="190" rx="62" ry="7" fill="#E9E6E1"/>
    <g transform="rotate(-5 85 110)">
      <rect x="22" y="52" width="128" height="138" rx="10" fill="#F7F5EF" stroke="#ECE8E0"/>
      <rect x="16" y="40" width="140" height="40" rx="12" fill="#34506F"/>
      <rect x="44" y="20" width="12" height="38" rx="6" fill="none" stroke="#EE8061" stroke-width="7"/>
      <rect x="112" y="20" width="12" height="38" rx="6" fill="none" stroke="#EE8061" stroke-width="7"/>
      <circle cx="58" cy="110" r="14" fill="#EE8061"/><circle cx="92" cy="98" r="11" fill="#5DADE2"/><circle cx="124" cy="96" r="8" fill="#B8BFC9"/>
      <circle cx="116" cy="126" r="11" fill="#9CCB8E"/><circle cx="96" cy="152" r="13" fill="#F2E25C"/><circle cx="62" cy="152" r="8" fill="#EE8061"/>
      <circle cx="130" cy="152" r="10" fill="#EE8061"/><circle cx="78" cy="134" r="4" fill="#EE8061"/></g></svg>`;

  function heroIllus() {
    // a laptop on a desk showing a gallery of six call tiles, warm light
    const tiles = PEOPLE.map((p, i) => {
      const x = 90 + (i % 3) * 142, y = 52 + Math.floor(i / 3) * 96;
      return `<foreignObject x="${x}" y="${y}" width="136" height="90"><div xmlns="http://www.w3.org/1999/xhtml" style="width:136px;height:90px;border-radius:8px;overflow:hidden;position:relative">${avatar(p, 'hi' + i)}</div></foreignObject>`;
    }).join('');
    return `<svg viewBox="0 0 600 380" style="width:600px;height:380px">
      <rect width="600" height="380" fill="#E7E2EF"/><rect y="292" width="600" height="88" fill="#D9C8B4"/>
      <circle cx="520" cy="70" r="80" fill="#F3EEF8"/>
      <rect x="74" y="36" width="452" height="230" rx="16" fill="#2B2B33"/>
      ${tiles}
      <path d="M40 300 L560 300 L540 322 L60 322 Z" fill="#3A3A44"/><rect x="250" y="300" width="100" height="6" rx="3" fill="#55555F"/>
      <rect x="60" y="322" width="480" height="8" rx="4" fill="#C3B19C"/>
      <path d="M470 330 C470 300 490 284 512 284 C534 284 548 300 548 330 Z" fill="#F6F0E6"/><rect x="500" y="262" width="22" height="26" rx="4" fill="#E98560"/>
    </svg>`;
  }
  const blocksImg = `<svg viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%">
    <rect width="400" height="230" fill="#FFF1E8"/><circle cx="330" cy="58" r="34" fill="#FBD38D"/>
    <rect y="186" width="400" height="44" fill="#F6DCCB"/>
    <g transform="rotate(-3 200 150)"><rect x="96" y="132" width="70" height="56" rx="8" fill="#F7987D"/><rect x="170" y="132" width="70" height="56" rx="8" fill="#90C6E9"/><rect x="244" y="132" width="70" height="56" rx="8" fill="#C0DFAE"/>
    <rect x="132" y="74" width="70" height="56" rx="8" fill="#F2E27A"/><rect x="206" y="74" width="70" height="56" rx="8" fill="#BBA3E3"/><rect x="170" y="18" width="70" height="54" rx="8" fill="#F7987D"/></g>
    <circle cx="60" cy="176" r="14" fill="#90C6E9"/><circle cx="340" cy="174" r="12" fill="#BBA3E3"/></svg>`;
  const face = (x, c, mood) => `<g transform="translate(${x} 0)"><rect x="-58" y="40" width="116" height="150" rx="16" fill="#fff" stroke="#E3E8EE" stroke-width="2"/>
    <circle cx="0" cy="104" r="40" fill="${c}"/><circle cx="-13" cy="96" r="5" fill="#2B2B33"/><circle cx="13" cy="96" r="5" fill="#2B2B33"/>
    <path d="${mood === 0 ? 'M-16 112 Q0 128 16 112' : mood === 1 ? 'M-16 122 Q0 108 16 122' : 'M-14 118 L14 118'}" stroke="#2B2B33" stroke-width="4" fill="none" stroke-linecap="round"/>
    ${mood === 2 ? '<path d="M-22 84 L-6 90 M22 84 L6 90" stroke="#2B2B33" stroke-width="4" stroke-linecap="round"/>' : ''}
    <rect x="-34" y="160" width="68" height="10" rx="5" fill="#E9EEF3"/></g>`;
  const feelImg = `<svg viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%">
    <rect width="400" height="230" fill="#EEF6FB"/>${face(70, '#F2E27A', 0)}${face(200, '#90C6E9', 1)}${face(330, '#F7987D', 2)}</svg>`;

  // ------------------------------------------------------------------ build the DOM
  const stage = document.getElementById('stage');
  // soft shadow from a pre-blurred image (a CSS blur filter re-rasterizes every frame and costs ~100 ms)
  const shadowCss = (x, y, w, h, drop) => { const iw = SHADOW.W - 2 * SHADOW.m, ih = SHADOW.H - 2 * SHADOW.m;
    return `position:absolute;left:${x - (w * SHADOW.m) / iw}px;top:${y - (h * SHADOW.m) / ih + drop}px;width:${(w * SHADOW.W) / iw}px;height:${(h * SHADOW.H) / ih}px;background:url(${SHADOW.shadow}) center/100% 100% no-repeat`; };
  const card = (k, day, date, time) => {
    const c = C[k];
    return `<div class="tcard" id="card_${k}">
      <div class="ubadge" style="background:${c.tint};border-color:${c.col}">${c.name}</div>
      <div class="dcirc" style="background:${c.col};color:${c.ink}"><div class="d1">${day}</div><div class="d2"><bdi>${date}</bdi></div><div class="d3">אוקטובר</div></div>
      <div class="tt">${c.name} - מפגש ראשון</div>
      <div class="tm">${ic('clock')}<bdi>${time}</bdi></div>
      <div class="free">חינם</div>
      <div class="tbtn" id="btn_${k}" style="background:${c.col}"><span class="reg">הירשם (חינם)</span><span class="load"><i class="spin"></i></span><span class="enter">כניסה למפגש</span></div>
      <div class="after" id="after_${k}"><div class="cal" id="cal_${k}">${ic('calendar-plus')}ליומן</div><div class="cancel">ביטול</div></div>
      <div class="foot">השתתפות חובה לחברי היחידה</div></div>`;
  };
  const header = (pg) => `<div class="apphdr"><div class="brandt"><span id="panel_${pg}" style="display:flex">${ic('panel-left')}</span>מרכז דיאלוג</div>
    <div class="side"><span class="bellw">${ic('bell')}</span><div class="homebtn">${ic('house')}דף הבית</div><span class="whoami">מיקי ברקוביץ</span></div></div>`;
  const ITEMS = {
    kids: [['book-open', 'הדרכת הורים: שגרה מרגיעה לפני השינה'], ['file-text', 'דף עבודה: מדחום הרגשות'], ['notepad-text', 'סיכום מפגש: עבודה עם חרדה בגיל הגן']],
    trauma: [['notepad-text', 'סיכום מפגש 1: עקרונות ייצוב'], ['file-text', 'דף עבודה: חלון הסבילות'], ['book-open', 'מאמר: טראומה מורכבת בקליניקה']],
    cbt: [['notepad-text', 'סיכום מפגש: מחשבות אוטומטיות'], ['file-text', 'דף עבודה: יומן מחשבות'], ['monitor-up', 'מצגת: חשיפה הדרגתית']],
  };
  const unit = (k) => {
    const c = C[k];
    const article = k !== 'kids' ? '' : `<div class="article" id="article"><div class="art" id="art">
        <div class="new">${ic('sparkles')}חדש</div>
        <h3 class="ap" data-i="0">משחק ככלי לוויסות רגשי</h3>
        <div class="am ap" data-i="1">מיקי ברקוביץ · היחידה לטיפול בילדים ומתבגרים · אוקטובר 2026</div>
        <div class="imgs"><div class="ap" data-i="2">${blocksImg}</div><div class="ap" data-i="3">${feelImg}</div></div>
        <div class="cols"><div class="ap" data-i="4"><h4>למה משחק?</h4><p>המשחק הוא השפה הטבעית של הילד. דרכו אפשר לזהות רגש, לתת לו שם ולתרגל דרכים להירגע.</p></div>
        <div class="ap" data-i="5"><h4>איך משלבים בטיפול</h4><ol><li><span class="n">1</span>פותחים במשחק קצר של זיהוי רגשות</li><li><span class="n">2</span>עוצרים באמצע ומתרגלים נשימה</li><li><span class="n">3</span>מסכמים יחד מה עזר להירגע</li></ol></div></div></div>
        <div class="aiwork" id="aiwork" style="left:0;top:12px;right:0;bottom:16px"><div class="lbl">${ic('sparkles')}ה-AI מעצב את הדף מהטקסט והתמונות…</div>
          <div class="skel" style="width:46%;height:30px;margin-top:6px"></div><div class="skel" style="width:62%"></div>
          <div style="display:flex;gap:18px"><div class="skel" style="flex:1;height:200px;border-radius:18px"></div><div class="skel" style="flex:1;height:200px;border-radius:18px"></div></div>
          <div class="skel" style="width:90%"></div><div class="skel" style="width:76%"></div><div class="skel" style="width:84%"></div>
          <div class="shine" id="shine" style="position:absolute;top:0;bottom:0;width:240px;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.75),rgba(255,255,255,0))"></div></div></div>`;
    return `<div class="unit" id="unit_${k}"><div class="uh"><div><div class="ut"><i class="dot" style="background:${c.col}"></i>${c.name}</div>
      <div class="pill drive">${ic('folder-open')}תיקיית <bdi>Drive</bdi> של היחידה</div></div>
      <div class="addbtn" id="add_${k}" style="background:${c.col}">${ic('plus')}הצעת תוכן</div></div>
      <div class="card ucard" id="ucard_${k}"><div class="uch">${ic('notepad-text')}תוכן היחידה</div>${article}
      <div class="itemlist">${ITEMS[k].map(([icon, t]) => `<div class="item"><div class="ic" style="background:${c.tint};color:${c.ring}">${ic(icon)}</div>
        <div><div class="it">${t}</div><div class="im">ספטמבר 2026</div></div><div class="go">${ic('chevron-left')}</div></div>`).join('')}</div></div></div>`;
  };
  const meetTiles = () => {
    const gx = 24, gy = 70, gw = 1592, gh = 680, gap = 14, tw = (gw - 2 * gap) / 3, th = (gh - gap) / 2;
    return PEOPLE.map((p, i) => {
      const x = gx + (2 - (i % 3)) * (tw + gap), y = gy + Math.floor(i / 3) * (th + gap);
      const mute = i === 2 || i === 4;
      return `<div class="tile" id="tile${i}" style="left:${x}px;top:${y}px;width:${tw}px;height:${th}px">${avatar(p, 'av' + i)}
        ${i === 0 ? '<div class="spk" id="spk"></div><div class="lvl" id="lvl"><i></i><i></i><i></i></div>' : ''}
        ${mute ? `<div class="mut">${ic('mic-off')}</div>` : ''}${i === 2 ? `<div class="mut" id="hand" style="left:54px;background:#F2C94C;color:#3A2E05">${ic('hand')}</div>` : ''}
        <div class="nm">${p.name}</div></div>`;
    }).join('');
  };

  stage.innerHTML = `
  <div id="world">
    <div id="browserShadow" style="${shadowCss(140, 60, 1640, 944, 36)}"></div>
    <div id="browser">
      <div id="tabs">
        <div class="winctl" style="left:22px"></div><div class="winctl" style="left:44px"></div><div class="winctl" style="left:66px"></div>
        <div class="tab" id="tab1" style="right:16px;width:270px"><span class="fav">${miniLogo(20)}</span><span class="tx">מרכז דיאלוג</span></div>
        <div class="tab" id="tab2" style="right:292px;width:0"><span class="fav" style="color:#1F6FD1;display:grid;place-items:center">${ic('video')}</span><span class="tx">מפגש · היחידה לטיפול <bdi>CBT</bdi></span></div>
      </div>
      <div id="urlrow"><span class="navbtn" style="right:22px">${ic('arrow-right')}</span><span class="navbtn" style="right:56px">${ic('arrow-left')}</span><span class="navbtn" style="right:90px;font-size:20px;top:13px">${ic('rotate-cw')}</span>
        <div id="url"><span class="lock">${ic('lock')}</span><span class="ltr" id="urltext">dialog-booking.com/Dashboard</span></div></div>
      <div id="vp">
        <div class="page" id="pHome"><div class="scroller"><div class="dash">
          <div class="hero" id="hero">
            <div class="blob" style="left:36px;top:-100px;width:330px;height:330px;background:radial-gradient(closest-side,#D3E8F7,rgba(211,232,247,0))"></div>
            <div class="blob" style="left:410px;top:190px;width:310px;height:310px;background:radial-gradient(closest-side,#F7F1C6,rgba(247,241,198,0))"></div>
            <div class="blob" style="right:610px;top:-10px;width:220px;height:220px;background:radial-gradient(closest-side,#DDEBF7,rgba(221,235,247,0))"></div>
            <div class="blob" style="right:-140px;bottom:-120px;width:440px;height:440px;background:radial-gradient(closest-side,#E5F1DC,rgba(229,241,220,0))"></div>
            ${calendarIllus}
            <h1>ניהול הקליניקה שלך במרכז דיאלוג</h1>
            <div class="hi">שלום מיקי ברקוביץ, טוב לראות אותך</div>
            <div class="btnrow">
              <div class="dbtn b1">${ic('bell')}הזמן חדר עכשיו</div><div class="dbtn b2">${ic('shopping-bag')}רכישת שעות</div>
              <div class="dbtn b3">${ic('search')}בדיקת זמינות</div><div class="dbtn b4">${ic('calendar')}ההזמנות שלי</div>
              <div class="dbtn b5" id="btnVideo">${ic('graduation-cap')}מדריכי וידאו</div><div class="dbtn b6" id="btnTrain">${ic('cap2')}הדרכות מקצועיות</div>
            </div></div>
          <div class="stats">
            <div class="stat" style="background:#FEF4F1"><div class="st">הזמנות קרובות</div><div class="sn">0</div><div class="ss"><bdi>3</bdi> ההזמנות הקרובות</div><div class="sic" style="background:#FFF0E0;color:#F97316">${ic('bell')}</div></div>
            <div class="stat" style="background:#F4F7F1"><div class="st">שעות נותרות</div><div class="sn">5</div><div class="ss">בכרטיסיות שלי</div><div class="sic" style="background:#C0DFAE;color:#fff">${ic('hourglass')}</div></div>
            <div class="stat" style="background:#FBFAF5"><div class="st">שעות הדרכה</div><div class="sn">5</div><div class="ss">נותרות 5 שעות בכרטיסיות שלי</div><div class="sic" style="background:#EFEDED;color:#4B5260">${ic('message-circle')}</div></div>
            <div class="stat" style="background:#F3F7F4"><div class="st">כרטיסיות פעילות</div><div class="sn">1</div><div class="ss">מוכנות לשימוש</div><div class="sic" style="background:#C0DFAE;color:#fff">${ic('credit-card')}</div></div>
          </div></div></div></div>

        <div class="page" id="pTrain"><div class="scroller" id="scTrain"><div class="wrap">
          <div class="toprow" id="trTop"><div class="toptext">
            <div class="eyebrow">מרכז דיאלוג · הדרכות לקהילת המטפלים</div>
            <div class="ph1">הדרכות ליחידות הקליניות</div>
            <div class="para">מערכת ההדרכות של מרכז דיאלוג נוצרה עבור קהילת המטפלים שלנו — מרחב גמיש להיפגש, להתייעץ על מקרים מהקליניקה ולקבל הדרכה מקצועית, בזמן ובקצב שמתאימים לכל מטפל/ת.</div>
            <div class="more">קרא עוד על ההדרכות ←</div></div>
            <div class="illus">${heroIllus()}</div></div>
          <div class="card welcome" id="welcome"><div class="r1">
            <div><div class="hello">שלום <b>מיקי</b> ${EMO.wave}</div><div style="margin-top:14px"><span class="hours" id="hours"><span class="n">5</span>שעות הדרכה ביתרה</span></div></div>
            <div class="msg" style="margin-right:56px">טרם נרשמת להדרכה — מצפים לפגוש אותך ${EMO.yheart}</div>
            <div class="pill w" style="margin-right:auto">כל המועדים</div></div>
            <div class="sep"></div><div class="r3"><div class="pill">האזור האישי שלי</div><div class="pill">רכישת שעות</div></div></div>
          <div class="sect" id="sectUnits"><h2 id="unitsTitle">הדרכות היחידה שלי</h2><div class="sub">הדרכות ייעודיות ליחידות שאתם משויכים אליהן — ללא עלות</div>
            <div class="cards" id="cards">${card('trauma', 'ה׳', '8.10', '08:30')}${card('cbt', 'ה׳', '8.10', '13:30')}${card('kids', 'ה׳', '15.10', '13:00')}</div></div>
          <div style="height:420px"></div></div></div></div>

        <div class="page" id="pContent"><div class="scroller" id="scContent"><div class="wrap">
          <div class="toprow" id="ctTop"><div class="toptext">
            <div class="eyebrow">מרכז דיאלוג · קהילת המטפלים</div>
            <div class="ph1">מרכז התוכן של היחידות הקליניות</div>
            <div class="para">כאן נאסף התוכן המקצועי של כל היחידות הקליניות — תובנות ממפגשי הדרכה, חומרים ותוכן שהצוות עצמו כתב ואושר לפרסום. כל מטפל/ת יכול/ה לעיין בתוכן של כל היחידות; חברי יחידה יכולים גם להוסיף לה תוכן משלהם, לאחר אישור מנהל.</div></div>
            <div class="legend">${['kids', 'trauma', 'cbt'].map((k) => `<div class="pill"><i class="dot" style="background:${C[k].col}"></i>${C[k].name}</div>`).join('')}</div></div>
          <div class="fpills">${['kids', 'trauma', 'cbt'].map((k) => `<div class="pill w"><i class="dot" style="background:${C[k].col}"></i>${C[k].name}</div>`).join('')}</div>
          <div class="card fbar"><div class="field" style="width:300px;background:#F7F6F2">${ic('search')}חיפוש בתוכן...</div>
            <div class="field">${ic('sparkles')}חיפוש חכם</div><div class="field" style="width:250px">כל היחידות<span style="margin-right:auto">${ic('chevron-down')}</span></div>
            <div class="field" style="width:170px">כל הנושאים<span style="margin-right:auto">${ic('chevron-down')}</span></div>
            <div class="field"><span class="ltr">dd/mm/yyyy</span>${ic('calendar')}</div><span style="color:#8E939C;font-size:18px">עד</span><div class="field"><span class="ltr">dd/mm/yyyy</span>${ic('calendar')}</div></div>
          ${unit('kids')}${unit('trauma')}${unit('cbt')}
          <div style="height:520px"></div></div></div></div>

        <div id="appHdr" style="position:absolute;left:0;top:0;z-index:6">${header('train')}</div>
        <div class="page meet" id="pMeet"><div class="mtop"><span>היחידה לטיפול <bdi>CBT</bdi> - מפגש ראשון</span><span style="opacity:.5">|</span><bdi>13:30</bdi><span class="cnt">${ic('users')}<bdi>6</bdi></span></div>
          ${meetTiles()}
          <div class="mbar"><span class="side"><bdi>13:30</bdi> | <span class="ltr">abc-defg-hij</span></span>
            <div class="mb">${ic('mic')}</div><div class="mb">${ic('video')}</div><div class="mb">${ic('captions')}</div><div class="mb">${ic('hand')}</div><div class="mb">${ic('monitor-up')}</div><div class="mb">${ic('ellipsis-vertical')}</div><div class="mb end">${ic('phone-off')}</div></div></div>

        <div class="abs" id="sideLayer" style="left:0;top:0;width:1640px;height:854px;z-index:10"><div class="dim" id="dim"></div>
          <div class="sidebar" id="sidebar"><div class="sh"><div class="sq">${ic('building-2')}</div><div><div class="sn">מרכז דיאלוג</div><div class="sr">מטפל</div></div></div>
            <div style="padding-top:8px">${[['file-text', 'ההזמנות שלי'], ['circle-check', 'אישור חודשי להזמנות קבועות'], ['shopping-bag', 'רכישת שעות'], ['ticket', 'הכרטיסיות שלי'], ['circle-play', 'מדריכי וידאו'], ['cap2', 'הדרכות מקצועיות'], ['folder', 'תוכן היחידות', 'miContent'], ['mail', 'הודעות'], ['users', 'סדנאות'], ['user', 'עריכת פרופיל']]
              .map(([i, t, id]) => `<div class="mitem" ${id ? `id="${id}"` : ''}>${t}${ic(i)}</div>`).join('')}</div>
            <div class="me"><div class="av">מ</div><div style="font-size:21px;font-weight:600">מיקי ברקוביץ</div></div></div></div>

        <div class="abs" id="modalLayer" style="left:0;top:0;width:1640px;height:854px;z-index:11"><div class="backdrop" id="backdrop"></div>
          <div class="modal" id="modal"><div class="x">${ic('x')}</div>
            <div class="mh">הצעת תוכן ליחידה</div><div class="ms">התוכן יישלח לאישור מנהל לפני שיוצג בספריית התוכן.</div>
            <div class="lab">כותרת</div><div class="inp" id="fTitle"><span class="ph">כותרת קצרה</span><span class="tv"></span><i class="caret"></i></div>
            <div class="lab">תוכן<span class="imp">${ic('upload')}ייבוא מקובץ (<bdi>Word / PDF</bdi> / טקסט)</span></div>
            <div class="inp ta" id="fBody"><span class="ph">כתבו כאן את התוכן שברצונכם לשתף…</span><span class="tv"></span><i class="caret"></i></div>
            <div class="lab">נושא</div><div class="trow"><div class="inp" id="fTopic"><span class="ph">לדוגמה: עבודה עם התנגדות</span><span class="tv"></span><i class="caret"></i></div><div class="aibtn">${ic('sparkles')}עזרה מ-<bdi>AI</bdi></div></div>
            <div class="help">תגית קצרה לסיווג וחיפוש. מתקשים למצוא כותרת או נושא? כתבו את התוכן ולחצו "עזרה מ-<bdi>AI</bdi>" — הוא יציע את שניהם.</div>
            <div class="filerow">קבצים ותמונות מצורפים (עד 5)<div class="addfile" id="addFile">${ic('upload')}הוספת קובץ</div></div>
            <div class="chips" id="chips"><div class="chipsin">
              <div class="fchip" id="fc0"><div class="th" style="background:#E3EEFB;color:#2B66B1;font-size:22px">${ic('file-text')}</div><span>משחק_ויסות.docx</span></div>
              <div class="fchip" id="fc1"><div class="th">${blocksImg}</div><span>תמונה_1.jpg</span></div>
              <div class="fchip" id="fc2"><div class="th">${feelImg}</div><span>תמונה_2.jpg</span></div></div></div>
            <div class="mfoot"><div class="cancel">ביטול</div><div class="send" id="send"><span class="s1">שליחה לאישור</span><span class="s2">${ic('check')}נשלח</span></div></div></div></div>
      </div>
    </div>

    <div id="veil" style="position:absolute;z-index:3;left:140px;top:60px;width:1640px;height:944px;border-radius:18px;background:#2A2830"></div>
    <div class="winShadow" id="calShadow" style="${shadowCss(490, 330, 940, 560, 30)}"></div>
    <div class="win" id="calWin" style="left:490px;top:330px;width:940px;height:560px">
      <div class="ev abs" id="evPane" style="left:0;top:0;right:0;bottom:0">
        <div class="evtop">${ic('calendar')}יומן<span class="evx">${ic('x')}</span></div>
        <div class="save" id="saveBtn">שמירה</div>
        <div class="evt">הדרכה קבוצתית — היחידה לטיפול <bdi>CBT</bdi> - מפגש ראשון</div>
        <div class="evrow">${ic('clock')}<span class="chip">יום ה׳, 8 באוקטובר 2026</span><span class="chip"><bdi>13:30</bdi></span>עד<span class="chip"><bdi>14:30</bdi></span><span style="color:#8E939C">שעון ישראל</span></div>
        <div class="evrow">${ic('video')}<span class="chip" style="background:#E8F0FE;color:#1F5FB8">קישור לשיחת וידאו מצורף</span></div>
        <div class="evrow">${ic('bell')}<span class="chip">תזכורת: 30 דקות לפני</span></div>
        <div class="evrow">${ic('user')}<span class="chip">מיקי ברקוביץ</span></div></div>
      <div class="week abs" id="weekPane" style="left:0;top:0;right:0;bottom:0">
        <div class="wh">${ic('calendar')}אוקטובר 2026</div>
        <div class="wgrid" id="wgrid" style="height:470px"></div></div>
    </div>

    <div id="phone" style="left:2150px;top:118px"><div class="scr">
      <div class="sb"><bdi>12:30</bdi><span class="r">${ic('signal')}${ic('wifi')}${ic('battery-full')}</span></div><div class="island"></div>
      <div class="ch">${ic('arrow-right', 'style="font-size:24px"')}<div class="pav">${miniLogo(40)}</div><div><div class="pn">מרכז דיאלוג</div><div class="ps"><span id="psA">חשבון עסקי</span><span id="psB">מקליד/ה…</span></div></div></div>
      <div class="datechip">היום</div>
      <div class="typing" id="typing" style="top:196px"><i></i><i></i><i></i></div>
      <div class="bub" id="bub" style="top:196px;width:350px">היי מיקי ${EMO.wave} תזכורת: בעוד שעה, ב-<bdi>13:30</bdi>, מתחיל המפגש הראשון של היחידה לטיפול <bdi>CBT</bdi>. מחכים לך! ${EMO.bheart}<div class="tm"><bdi>12:30</bdi></div></div>
      <div class="inbar"><div class="box">הודעה</div><div class="mic">${ic('mic')}</div></div></div></div>
    <div id="clockchip" style="left:2650px;top:236px"><div class="cd">יום ה׳ <bdi>8.10</bdi></div><div class="ct"><bdi>12:30</bdi></div></div>

    <div id="rings"></div>
    <div id="ripples"></div>
    <svg id="cursor" viewBox="0 0 34 46"><path d="M5 3 L5 36 L13.2 28.4 L18.6 41 L24.4 38.4 L19 26 L30 26 Z" fill="#fff" stroke="#1D1D1F" stroke-width="2.4" stroke-linejoin="round" style="filter:drop-shadow(0 3px 4px rgba(0,0,0,.28))"/></svg>
  </div>

  <div id="titles">
    ${logoSVG('logoA', 'position:absolute;left:150px;top:300px;width:440px;height:331px')}
    <div class="tl" id="tA1" style="right:180px;top:200px;font-size:66px;font-weight:700;color:#3A3848"><span class="mask"><span class="wd">מרכז</span></span> <span class="mask"><span class="wd">דיאלוג</span></span></div>
    <div class="tl" id="tA2" style="right:180px;top:296px;font-size:42px;font-weight:400;color:#6B717C"><span class="mask"><span class="wd">שמחים</span></span> <span class="mask"><span class="wd">להציג</span></span> <span class="mask"><span class="wd">לכם</span></span></div>
    <div class="tl" id="tA3" style="right:180px;top:420px;font-size:86px;font-weight:700;color:#23262E;letter-spacing:-1px"><span class="mask"><span class="wd">המערכת</span></span> <span class="mask"><span class="wd">להדרכות</span></span> <span class="mask"><span class="wd">מקצועיות</span></span></div>
    <div class="tl" id="tA4" style="right:180px;top:532px;font-size:86px;font-weight:700;color:#3E8BC4;letter-spacing:-1px"><span class="mask"><span class="wd">עבור</span></span> <span class="mask"><span class="wd">היחידות</span></span> <span class="mask"><span class="wd">הקליניות</span></span></div>
    <div class="tl" id="tA5" style="right:180px;top:700px;display:flex;gap:18px">
      <div class="tchip"><i class="dot" style="background:#E98560"></i>פשוט</div><div class="tchip"><i class="dot" style="background:#6EB8EE"></i>מהיר</div><div class="tchip"><i class="dot" style="background:#AFD6A5"></i>במקום אחד</div></div>
    ${logoSVG('logoZ', 'position:absolute;left:770px;top:210px;width:380px;height:286px')}
    <div class="tl" id="tZ" style="left:0;right:0;top:590px;text-align:center;font-size:66px;font-weight:600;color:#3A3848"><span class="mask"><span class="wd">מרכז</span></span> <span class="mask"><span class="wd">דיאלוג</span></span> <span class="mask"><span class="wd" style="color:#B7B2C4">·</span></span> <span class="mask"><span class="wd">קהילת</span></span> <span class="mask"><span class="wd">המטפלים</span></span> <span class="mask"><span class="wd">שלנו</span></span></div>
  </div>
  <div id="caps"></div>`;

  // week grid
  {
    const g = document.getElementById('wgrid');
    const days = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'], dates = [4, 5, 6, 7, 8, 9, 10];
    const colW = 112, x0 = 66, top = 80, rowH = 62;
    let h = '';
    days.forEach((d, i) => {
      h += `<div class="wday ${i === 4 ? 'today' : ''}" style="right:${x0 + i * colW}px;width:${colW}px">${d}<b>${dates[i]}</b></div>`;
      h += `<div class="wcol" style="right:${x0 + i * colW}px;top:${top}px;height:${rowH * 6}px"></div>`;
    });
    [11, 12, 13, 14, 15, 16].forEach((hr, j) => {
      h += `<div class="whour" style="top:${top + j * rowH - 9}px;width:56px;text-align:center"><bdi>${hr}:00</bdi></div>`;
      h += `<div class="wline" style="right:${x0}px;width:${colW * 7}px;top:${top + j * rowH}px"></div>`;
    });
    const blk = (i, from, len, cls, txt, id) => `<div class="evblock ${cls}" ${id ? `id="${id}"` : ''} style="right:${x0 + i * colW + 5}px;width:${colW - 10}px;top:${top + (from - 11) * rowH + 3}px;height:${len * rowH - 6}px">${txt}</div>`;
    h += blk(1, 11, 1, 'o', '') + blk(3, 14, 1, 'o', '') + blk(0, 12, 1.5, 'o', '') + blk(6, 15, 1, 'o', '');
    h += blk(4, 13.5, 1.25, '', 'הדרכה <bdi>CBT</bdi><br><bdi>13:30</bdi>', 'evCbt');
    g.innerHTML = h;
  }

  // captions
  const CAPS = [
    { a: 12.5, b: 16.6, n: 1, c: '#5BA4D6', t: 'נכנסים להדרכות ישר ממסך הבית' },
    { a: 18, b: 35.6, n: 2, c: '#9C83D6', t: 'כאן תוכלו לראות ולהירשם לכל מפגשי היחידה' },
    { a: 36, b: 45.6, n: 3, c: '#5BA4D6', t: 'נרשמים בלחיצה אחת, ללא עלות לחברי היחידה' },
    { a: 46.6, b: 59.6, n: 4, c: '#7DB866', t: 'המפגש נכנס ליומן שלך' },
    { a: 60.2, b: 71.6, n: 5, c: '#3FB37F', t: 'תזכורת בוואטסאפ, שעה לפני המפגש' },
    { a: 72, b: 87.6, n: 6, c: '#5BA4D6', t: 'לחיצה אחת, ונכנסים למפגש' },
    { a: 88, b: 107.6, n: 7, c: '#F07F60', t: 'ספריית התוכן המקצועי של כל היחידות', s: 'סיכומי מפגשים · תכנים מקצועיים' },
    { a: 108, b: 131.4, n: 8, c: '#F07F60', t: 'נשמח שגם אתם תשתפו', s: 'משתפים תוכן משלכם, וה-<bdi>AI</bdi> הופך אותו לדף מעוצב כדי שכולם יוכלו להיתרם ממנו' },
  ];
  document.getElementById('caps').innerHTML = CAPS.map((c, i) => `<div class="cap" id="cap${i}"><div class="num" style="background:${c.c}">${c.n}</div><div><div class="ct">${c.t}</div>${c.s ? `<div class="cs">${c.s}</div>` : ''}</div></div>`).join('');

  // ------------------------------------------------------------------ element cache
  const $ = (id) => document.getElementById(id);
  const el = {};
  for (const n of ['world', 'browser', 'browserShadow', 'titles', 'logoA', 'logoZ', 'tA1', 'tA2', 'tA3', 'tA4', 'tA5', 'tZ', 'tab1', 'tab2', 'urltext',
    'pHome', 'pTrain', 'pContent', 'pMeet', 'scTrain', 'scContent', 'btnTrain', 'hours', 'sideLayer', 'dim', 'sidebar', 'miContent', 'modalLayer',
    'backdrop', 'modal', 'fTitle', 'fBody', 'fTopic', 'addFile', 'chips', 'send', 'article', 'art', 'aiwork', 'shine', 'calWin', 'calShadow', 'evPane', 'weekPane',
    'saveBtn', 'evCbt', 'veil', 'appHdr', 'phone', 'clockchip', 'typing', 'bub', 'psA', 'psB', 'cursor', 'rings', 'ripples', 'spk', 'lvl', 'hand', 'cards', 'welcome']) el[n] = $(n);
  const CARD_KEYS = ['trauma', 'cbt', 'kids'];

  // ------------------------------------------------------------------ measurement (world coords, scroll 0)
  const R = {};
  function measure(ids) {
    const wr = el.world.getBoundingClientRect();
    for (const id of ids) {
      const r = $(id).getBoundingClientRect();
      R[id] = { x: r.left - wr.left, y: r.top - wr.top, w: r.width, h: r.height };
    }
  }
  const VP = { x: 140, y: 150, w: 1640, h: 854 };
  const BROWSER = { x: 140, y: 60, w: 1640, h: 944 };

  // ------------------------------------------------------------------ the plan (beats)
  // page shown in the viewport over time
  const NAV = [[0, 'pHome'], [16.7, 'pTrain'], [75.9, 'pMeet'], [88, 'pTrain'], [94.5, 'pContent']];
  const URLS = { pHome: 'dialog-booking.com/Dashboard', pTrain: 'dialog-booking.com/Trainings', pContent: 'dialog-booking.com/UnitContent', pMeet: 'meet.google.com/abc-defg-hij' };
  const CLICK = []; // filled in plan(): {u, color}
  const HITS = [];
  let SCROLL = {}, CAM = [], CUR = [], VIS = [], RINGS = [];
  const scrollAt = (page, u) => (SCROLL[page] ? springKeys(u, SCROLL[page], SPR.scroll) : 0);
  // world rect of an element at beat u (follows its page scroll)
  const PAGE_OF = {};
  const rect = (id, u) => { const r = R[id]; const s = PAGE_OF[id] ? scrollAt(PAGE_OF[id], u) : 0; return { x: r.x, y: r.y - s, w: r.w, h: r.h }; };
  const center = (r, dx = 0, dy = 0) => [r.x + r.w / 2 + dx, r.y + r.h / 2 + dy];
  const union = (...rs) => { const x = Math.min(...rs.map((r) => r.x)), y = Math.min(...rs.map((r) => r.y)); return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y }; };
  const AX = 960, AY = 476, AW = 1730, AH = 852; // camera anchor + usable area above the caption
  const focus = (r, { pad = 36, max = 1.9, dy = 0 } = {}) => [r.x + r.w / 2, r.y + r.h / 2 + dy, Math.min(max, AW / (r.w + 2 * pad), AH / (r.h + 2 * pad))];

  function plan() {
    const localY = (id, page) => R[id].y - VP.y; // y inside the page content at scroll 0
    // ---- scrolls
    const sWelcome = localY('welcome') - 110;
    const sCards = localY('sectUnits') - 92;
    SCROLL.pTrain = [[0, 0], [20.2, sWelcome], [24, sCards]];
    const sUnits = localY('unit_kids') - 104;
    const sMid = localY('unit_trauma') - 60;
    const sEnd = localY('unit_cbt') - 110;
    const sArticle = localY('ucard_kids') - 86;
    SCROLL.pContent = [[0, 0], [99.6, sUnits], [101.8, sMid], [103.8, sEnd], [106.2, sUnits], [127.5, sArticle]];
    for (const id of ['welcome', 'hours', 'sectUnits', 'unitsTitle', 'cards', 'card_trauma', 'card_cbt', 'card_kids', 'btn_trauma', 'btn_cbt', 'btn_kids', 'cal_cbt', 'after_cbt', 'trTop']) PAGE_OF[id] = 'pTrain';
    for (const id of ['ctTop', 'unit_kids', 'unit_trauma', 'unit_cbt', 'add_kids', 'ucard_kids', 'article', 'art']) PAGE_OF[id] = 'pContent';

    // ---- camera keys [u, [cx, cy, s]]
    const FULL = [960, 532, 0.92];
    const at = (id, u) => rect(id, u);
    const heroR = R.hero;
    const cbtCard = (u) => at('card_cbt', u);
    const modalTop = { x: R.modal.x, y: R.modal.y, w: R.modal.w, h: R.fBody.y + R.fBody.h - R.modal.y };
    const PAGE = [960, 475, 1.12];            // whole browser width, chrome included
    const CONTENT = [960, 611, 1.25];         // page content under the app header (header out of frame)
    const cardsX = R.card_cbt.x + R.card_cbt.w / 2;
    const CARDS = [cardsX, 230 + 476 / 1.3, 1.3], CARDS2 = [cardsX, 230 + 476 / 1.4, 1.4];
    CAM = [
      [0, FULL],
      [12.6, PAGE],
      [14.2, [960, 230 + 476 / 1.18, 1.18]],
      [16.7, PAGE],
      [20.4, CONTENT],
      [24.2, CARDS],
      [35.4, CARDS2],
      [46.6, focus(R.calWin, { pad: 40 })],
      [59.6, focus({ x: 2150, y: 96, w: 960, h: 640 }, { pad: 20 })],
      [71.4, CARDS2],
      [75.3, FULL],
      [94.8, PAGE],
      [99.4, CONTENT],
      [110.6, focus(modalTop, { pad: 40, max: 1.55 })],
      [119.4, focus(union(R.fTopic, R.chips), { pad: 60, max: 1.55 })],
      [124.8, focus(union(R.chips, R.send), { pad: 70, max: 1.55 })],
      [127.3, CONTENT],
      [135.6, [960, 560, 0.62]],
    ];

    // ---- cursor waypoints: {u (arrival), p, mv (beats of travel)}
    const c = (id, u, dx = 0, dy = 0) => center(rect(id, u), dx, dy);
    const inp = (id) => [R[id].x + R[id].w - 120, R[id].y + R[id].h / 2];
    CUR = [
      { u: 12.6, p: [VP.x + 520, VP.y + 980] },
      { u: 15.4, p: c('btnTrain', 15.4, 30, 6), mv: 2.4 },
      { u: 31.4, p: [cbtCard(31).x + 160, cbtCard(31).y + cbtCard(31).h + 260], mv: 0.1 },
      { u: 37, p: c('btn_cbt', 37, 20, 6), mv: 2.4 },
      { u: 44.6, p: c('cal_cbt', 44.6, 8, 4), mv: 1.6 },
      { u: 47.2, p: c('cal_cbt', 44.6, 8, 4), mv: 0.1 },
      { u: 51.4, p: center(R.saveBtn, 10, 6), mv: 2 },
      { u: 71.6, p: [cbtCard(72).x + 200, cbtCard(72).y + cbtCard(72).h + 200], mv: 0.1 },
      { u: 74.4, p: c('btn_cbt', 74.4, 24, 6), mv: 2 },
      { u: 88.4, p: [VP.x + 900, VP.y + 420], mv: 0.1 },
      { u: 90.6, p: center(R.panel_train, 2, 4), mv: 1.9 },
      { u: 93.4, p: center(R.miContent, 40, 4), mv: 1.4 },
      { u: 107.2, p: [VP.x + 500, VP.y + 560], mv: 0.1 },
      { u: 109.6, p: c('add_kids', 109.6, 10, 6), mv: 1.9 },
      { u: 111.4, p: inp('fTitle'), mv: 0.9 },
      { u: 114.9, p: inp('fBody'), mv: 0.6 },
      { u: 119.7, p: inp('fTopic'), mv: 0.6 },
      { u: 122.3, p: center(R.addFile, 8, 4), mv: 0.9 },
      { u: 125.9, p: center(R.send, 10, 4), mv: 1.4 },
    ];
    VIS = [[12.7, 1], [17.3, 0], [31.6, 1], [56.2, 0], [71.8, 1], [76, 0], [88.6, 1], [95.4, 0], [107.4, 1],
      [111.8, 0], [114.3, 1], [115.4, 0], [119.3, 1], [120.2, 0], [121.6, 1], [128, 0]];
    const CL = [[16, '#90C6E9'], [38, '#5BA4D6'], [46, '#5BA4D6'], [52, '#1F6FD1'], [75, '#5BA4D6'], [91, '#9C83D6'], [94, '#9C83D6'],
      [110, '#F07F60'], [111.6, '#9AA0A8'], [115.1, '#9AA0A8'], [119.9, '#9AA0A8'], [122.6, '#3A3848'], [126.4, '#5BA4D6']];
    CL.forEach(([u, color]) => CLICK.push({ u, color }));

    // ---- highlight rings {id, a, b, color, r(adius), pad}
    RINGS = [
      { id: 'btnTrain', a: 14.4, b: 16.4, color: '#5BA4D6', r: 22, pad: 9 },
      { id: 'hours', a: 21.4, b: 23.8, color: '#E2B93B', r: 34, pad: 8 },
      { id: 'card_trauma', a: 27.6, b: 29.2, color: '#9C83D6', r: 36, pad: 8 },
      { id: 'card_cbt', a: 29, b: 30.6, color: '#5BA4D6', r: 36, pad: 8 },
      { id: 'card_kids', a: 30.4, b: 32, color: '#F07F60', r: 36, pad: 8 },
      { id: 'btn_cbt', a: 36.4, b: 38.2, color: '#3E8BC4', r: 36, pad: 7 },
      { id: 'cal_cbt', a: 44.4, b: 46.2, color: '#3E8BC4', r: 14, pad: 8 },
      { id: 'saveBtn', a: 50.6, b: 52.2, color: '#1F6FD1', r: 34, pad: 7 },
      { id: 'btn_cbt', a: 73.2, b: 75.2, color: '#3E8BC4', r: 36, pad: 7 },
      { id: 'panel_train', a: 89.6, b: 91.2, color: '#9C83D6', r: 12, pad: 10 },
      { id: 'add_kids', a: 108.6, b: 110.2, color: '#EE7A5C', r: 34, pad: 7 },
      { id: 'addFile', a: 121.4, b: 122.8, color: '#3A3848', r: 14, pad: 7 },
      { id: 'send', a: 124.8, b: 126.6, color: '#3E8BC4', r: 16, pad: 7 },
    ];
    const rh = document.getElementById('rings');
    rh.innerHTML = RINGS.map((r, i) => `<div class="ring" id="ring${i}" style="border-color:${r.color};border-radius:${r.r + r.pad}px"></div>`).join('');
    document.getElementById('ripples').innerHTML = CLICK.map((cl, i) => `<div class="ripple" id="rip${i}" style="border-color:${cl.color}"></div>`).join('');
  }

  // ------------------------------------------------------------------ cursor
  function cursorPos(u) {
    if (u <= CUR[0].u) return CUR[0].p;
    for (let i = 1; i < CUR.length; i++) {
      const w = CUR[i], prev = CUR[i - 1];
      if (u < w.u) {
        const mv = w.mv ?? 1.4, a = w.u - mv;
        if (u <= a) return prev.p;
        const p = E.inOutCubic((u - a) / mv);
        const dx = w.p[0] - prev.p[0], dy = w.p[1] - prev.p[1], d = Math.hypot(dx, dy);
        const arc = Math.sin(Math.PI * p) * Math.min(80, d * 0.12);
        return [prev.p[0] + dx * p + (-dy / (d || 1)) * arc, prev.p[1] + dy * p + (dx / (d || 1)) * arc];
      }
    }
    return CUR[CUR.length - 1].p;
  }
  function cursorVis(u) {
    let v = 0;
    for (const [k, s] of VIS) { if (u >= k) v = s; }
    // fade around the latest switch
    let last = null;
    for (const k of VIS) if (u >= k[0]) last = k;
    if (!last) return 0;
    const f = clamp((u - last[0]) / 0.3);
    const prevState = VIS.indexOf(last) > 0 ? VIS[VIS.indexOf(last) - 1][1] : 0;
    return lerp(prevState, v, E.outCubic(f));
  }
  const press = (u) => { let s = 1; for (const c of CLICK) { const d = (u - c.u) * P; if (d > -0.02 && d < 0.2) s = Math.min(s, 1 - 0.1 * Math.sin(Math.PI * clamp((d + 0.02) / 0.2))); } return s; };
  const pressOf = (u, uc, amt = 0.04) => { const d = (u - uc) * P; return d < 0 || d > 0.28 ? 1 : 1 - amt * Math.sin(Math.PI * d / 0.28); };

  // ------------------------------------------------------------------ helpers for typing
  function typed(node, str, a, b, u, focusA, focusB) {
    const g = graphemes(str);
    const n = Math.round(g.length * clamp((u - a) / (b - a)));
    node.querySelector('.tv').textContent = g.slice(0, n).join('');
    node.querySelector('.ph').style.display = n > 0 ? 'none' : '';
    const focused = u >= focusA && u < focusB;
    const typing = u >= a && u <= b + 0.1;
    const blink = typing || Math.floor((u - focusA) * P / 0.53) % 2 === 0;
    node.querySelector('.caret').style.opacity = focused && blink ? 1 : 0;
    node.style.borderColor = focused ? '#1F2430' : '#E2DED8';
    node.style.boxShadow = focused ? 'inset 0 0 0 1px #1F2430' : 'none';
  }

  // ------------------------------------------------------------------ the frame
  const set = (e, k, v) => { if (e.style[k] !== v) e.style[k] = v; };
  function apply(u) {
    // ===== titles: intro (0-12) and end card (136-144)
    const lA = el.logoA, lZ = el.logoZ;
    const drawLogo = (svg, u0) => {
      svg.querySelector('.lstroke').style.strokeDasharray = '1';
      svg.querySelector('.lstroke').style.strokeDashoffset = String(1 - E.outCubic(prog(u, u0, u0 + 2.2)));
      svg.querySelectorAll('.ld').forEach((d, i) => { d.style.transform = `scale(${sp(u, u0 + 0.9 + i * 0.5, SPR.pop)})`; });
    };
    const words = (node, u0, step, cfg = SPR.pop) => node.querySelectorAll('.wd').forEach((w, i) => {
      const k = sp(u, u0 + i * step, cfg);
      w.style.transform = `translateY(${(1 - k) * 130}%)`;
    });
    // the browser pushes the intro up and out
    const enter = sp(u, 10.6, SPR.gentle);
    const introY = -enter * 760;
    const showIntro = u < 13;
    set(el.logoA, 'display', showIntro ? '' : 'none');
    ['tA1', 'tA2', 'tA3', 'tA4', 'tA5'].forEach((k) => set(el[k], 'display', showIntro ? '' : 'none'));
    if (showIntro) {
      drawLogo(lA, -0.9);
      lA.style.transform = `translateY(${introY}px)`;
      words(el.tA1, 3, 0.25);
      words(el.tA2, 4.4, 0.2);
      words(el.tA3, 6, 0.25);
      words(el.tA4, 7, 0.25);
      el.tA5.querySelectorAll('.tchip').forEach((ch, i) => {
        const k = sp(u, 8.5 + i * 0.5, SPR.pop);
        ch.style.transform = `translateY(${(1 - k) * 40}px) scale(${0.85 + 0.15 * k})`;
        ch.style.opacity = clamp(k * 1.6);
      });
      ['tA1', 'tA2', 'tA3', 'tA4', 'tA5'].forEach((k, i) => { el[k].style.transform = `translateY(${introY * (1 + i * 0.04)}px)`; });
    }
    const outro = sp(u, 135.6, SPR.gentle);
    const showEnd = u > 135.4;
    set(lZ, 'display', showEnd ? '' : 'none');
    set(el.tZ, 'display', showEnd ? '' : 'none');
    if (showEnd) {
      drawLogo(lZ, 136.2);
      words(el.tZ, 138.4, 0.18);
    }

    // ===== world: browser entrance + camera
    const worldIn = (1 - enter) * 1180;
    const [cx, cy, s0] = springKeys(u, CAM, SPR.cam);
    const s = s0;
    const tx = AX - cx * s, ty = AY - cy * s + worldIn;
    el.world.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(5)})`;
    el.world.style.opacity = String(1 - outro);
    set(el.world, 'visibility', u < 9.8 || outro > 0.999 ? 'hidden' : 'visible');

    // ===== tabs, url and pages
    const tab2w = 300 * sp(u, 75.4, SPR.ui);
    el.tab2.style.width = `${tab2w}px`;
    set(el.tab2, 'visibility', tab2w > 2 ? 'visible' : 'hidden');
    const meetOn = u >= 75.9 && u < 88;
    el.tab1.style.background = meetOn ? 'transparent' : '#fff';
    el.tab2.style.background = meetOn ? '#fff' : 'transparent';
    let cur = NAV[0], prev = null;
    for (let i = 0; i < NAV.length; i++) if (u >= NAV[i][0]) { cur = NAV[i]; prev = NAV[i - 1] || null; }
    el.urltext.textContent = URLS[cur[1]];
    const tabSwitch = prev && (cur[1] === 'pMeet' || prev[1] === 'pMeet');
    const na = !prev || tabSwitch ? 1 : smooth(u, cur[0] + 0.15, cur[0] + 0.6);
    const oa = !prev || tabSwitch ? 0 : 1 - smooth(u, cur[0], cur[0] + 0.22);
    for (const pid of ['pHome', 'pTrain', 'pContent', 'pMeet']) {
      const pe = el[pid];
      if (pid === cur[1] && na > 0) { set(pe, 'visibility', 'visible'); pe.style.opacity = String(na); pe.style.zIndex = '2'; pe.style.transform = `translateY(${((1 - na) * 22).toFixed(2)}px)`; }
      else if (prev && pid === prev[1] && oa > 0) { set(pe, 'visibility', 'visible'); pe.style.opacity = String(oa); pe.style.zIndex = '1'; pe.style.transform = 'none'; }
      else set(pe, 'visibility', 'hidden');
    }
    set(el.appHdr, 'visibility', cur[1] === 'pMeet' ? 'hidden' : 'visible');
    el.scTrain.style.transform = `translateY(${-scrollAt('pTrain', u).toFixed(2)}px)`;
    el.scContent.style.transform = `translateY(${-scrollAt('pContent', u).toFixed(2)}px)`;

    // ===== scene 1: home button press
    el.btnTrain.style.transform = `scale(${pressOf(u, 16)})`;

    // ===== scene 2: trainings cards rise, welcome
    CARD_KEYS.forEach((k, i) => {
      const ce = $(`card_${k}`);
      const rise = sp(u, 24.6 + i * 0.4, SPR.pop);
      const ring = RINGS.find((r) => r.id === `card_${k}`);
      const lift = ring ? win(u, ring.a, ring.b, 0.4) : 0;
      ce.style.transform = `translateY(${(1 - rise) * 90 - lift * 10}px)`;
      ce.style.opacity = String(u < 17 ? 1 : clamp(rise * 1.5));
    });

    // ===== scene 3: register on the CBT card (and the enter press in scene 6)
    {
      const b = $('btn_cbt');
      const hover = win(u, 36.9, 38.1, 0.2);
      const loading = u >= 38.15 && u < 39.6;
      const done = sp(u, 39.6, SPR.pop);
      const pale = u < 38.15 ? 0 : loading ? smooth(u, 38.15, 38.4) : 1 - smooth(u, 39.5, 39.8);
      b.style.background = mix(mix('#90C6E9', '#78B6E0', hover), '#CFE6F6', pale);
      const bump = u >= 39.6 ? 1 + 0.05 * Math.sin(Math.PI * clamp((u - 39.6) * P / 0.45)) : 1;
      b.style.transform = `scale(${(pressOf(u, 38) * pressOf(u, 75) * bump).toFixed(4)})`;
      const reg = b.querySelector('.reg'), ld = b.querySelector('.load'), en = b.querySelector('.enter');
      reg.style.opacity = String(1 - smooth(u, 38.1, 38.3));
      ld.style.opacity = String(loading ? smooth(u, 38.2, 38.4) * (1 - smooth(u, 39.4, 39.6)) : 0);
      ld.querySelector('.spin').style.transform = `rotate(${(u * P * 400) % 360}deg)`;
      en.style.opacity = String(clamp(done * 1.4));
      en.style.transform = `scale(${0.8 + 0.2 * done})`;
      const af = $('after_cbt');
      af.style.maxHeight = `${44 * sp(u, 39.8, SPR.gentle)}px`;
      af.style.opacity = String(clamp((u - 39.9) / 0.4));
      $('cal_cbt').style.transform = `scale(${pressOf(u, 46, 0.08)})`;
      for (const k of ['trauma', 'kids']) { const a2 = $(`after_${k}`); a2.style.maxHeight = '0px'; a2.style.opacity = '0'; $(`btn_${k}`).querySelector('.load').style.opacity = '0'; $(`btn_${k}`).querySelector('.enter').style.opacity = '0'; }
    }

    // ===== scene 4: calendar window: editor -> week view
    {
      const open = sp(u, 46.6, SPR.gentle);
      const close = sp(u, 59.4, SPR.gentle);
      const vis = u > 46.5 && close < 0.999;
      set(el.calWin, 'visibility', vis ? 'visible' : 'hidden');
      set(el.calShadow, 'visibility', vis ? 'visible' : 'hidden');
      const sc = 0.82 + 0.18 * open;
      const dx = -close * 900;
      el.calWin.style.transform = `translate(${dx}px, ${(1 - open) * 120}px) scale(${sc})`;
      el.calWin.style.opacity = String(clamp(open * 1.6) * (1 - close));
      el.calShadow.style.transform = el.calWin.style.transform;
      el.calShadow.style.opacity = String(clamp(open * 1.6) * (1 - close) * 0.9);
      set(el.veil, 'visibility', vis ? 'visible' : 'hidden');
      el.veil.style.opacity = String(0.42 * clamp(open * 1.4) * (1 - close));
      const sw = smooth(u, 52.5, 53.1);
      el.evPane.style.opacity = String(1 - sw);
      el.evPane.style.transform = `scale(${1 - 0.04 * sw})`;
      el.weekPane.style.opacity = String(sw);
      el.weekPane.style.transform = `scale(${1.04 - 0.04 * sw})`;
      el.saveBtn.style.transform = `scale(${pressOf(u, 52, 0.06)})`;
      el.saveBtn.style.background = mix('#1F6FD1', '#185BB0', win(u, 51.3, 52.3, 0.2));
      el.evPane.querySelectorAll('.evrow, .evt').forEach((r, i) => {
        const k = sp(u, 46.8 + i * 0.16, SPR.ui);
        r.style.transform = `translateY(${(1 - k) * 18}px)`;
        r.style.opacity = String(clamp(k * 1.5));
      });
      const drop = sp(u, 53.6, SPR.pop);
      el.evCbt.style.transform = `translateY(${(1 - drop) * -60}px) scale(${0.9 + 0.1 * drop})`;
      el.evCbt.style.opacity = String(clamp(drop * 2));
    }

    // ===== scene 5: reminder on the phone
    {
      const on = u > 58.5 && u < 73.5;
      set(el.phone, 'visibility', on ? 'visible' : 'hidden');
      set(el.clockchip, 'visibility', on ? 'visible' : 'hidden');
      const pin = sp(u, 59.4, SPR.gentle), pout = sp(u, 71.2, SPR.gentle);
      el.phone.style.transform = `translateY(${(1 - pin) * 260 + pout * 140}px)`;
      const ck = sp(u, 60.6, SPR.pop);
      el.clockchip.style.transform = `translateY(${(1 - ck) * 50}px)`;
      el.clockchip.style.opacity = String(clamp(ck * 1.4) * (1 - pout));
      const ty = u >= 62 && u < 64.6;
      const tk = sp(u, 62, SPR.pop);
      el.typing.style.opacity = String(ty ? clamp(tk * 2) : 0);
      el.typing.style.transform = `scale(${0.7 + 0.3 * tk})`;
      el.typing.querySelectorAll('i').forEach((d, i) => { d.style.transform = `translateY(${-5 * Math.max(0, Math.sin((u * P * 2.6 - i * 0.18) * Math.PI * 2))}px)`; });
      el.psA.style.display = ty ? 'none' : '';
      el.psB.style.display = ty ? '' : 'none';
      const bk = sp(u, 64.6, SPR.pop);
      el.bub.style.opacity = String(clamp(bk * 2));
      el.bub.style.transform = `scale(${0.6 + 0.4 * bk})`;
      el.bub.style.transformOrigin = '100% 0';
      el.typing.style.transformOrigin = '100% 0';
    }

    // ===== scene 6: the meeting
    {
      PEOPLE.forEach((p, i) => {
        const t = $(`tile${i}`);
        const k = sp(u, 76.1 + i * 0.16, SPR.pop);
        t.style.transform = `scale(${0.88 + 0.12 * k})`;
        t.style.opacity = String(clamp(k * 1.6));
        const av = $(`av${i}`);
        const nod = 2.2 * noise1(u * P * 0.7, 11 + i) + (i === 0 ? 1.6 * Math.sin(u * P * 2.2) : 0);
        av.querySelector('.hd').setAttribute('transform', `rotate(${nod.toFixed(2)} 260 236)`);
        av.querySelector('.bd').setAttribute('transform', `translate(0 ${(1.6 * Math.sin(u * P * 1.3 + i)).toFixed(2)})`);
        const talk = i === 0 && u > 78 ? clamp(0.5 + 0.8 * noise1(u * P * 7, 5)) : 0;
        av.querySelector('.mo2').setAttribute('ry', (talk * 9).toFixed(2));
        av.querySelector('.mo').style.opacity = talk > 0.15 ? '0' : '1';
      });
      const spk = u > 78 ? smooth(u, 78, 78.4) : 0;
      el.spk.style.opacity = String(spk);
      el.lvl.style.opacity = String(spk);
      el.lvl.querySelectorAll('i').forEach((b, j) => { b.style.height = `${(6 + 12 * clamp(0.5 + 0.7 * noise1(u * P * 9, 20 + j))).toFixed(1)}px`; });
      const hk = sp(u, 82.5, SPR.pop);
      el.hand.style.transform = `scale(${hk})`;
    }

    // ===== scene 7: side menu
    {
      const open = sp(u, 91.1, SPR.gentle), close = sp(u, 94.3, SPR.ui);
      const k = open * (1 - close);
      set(el.sideLayer, 'visibility', u > 91 && close < 0.999 ? 'visible' : 'hidden');
      el.dim.style.opacity = String(k);
      el.sidebar.style.transform = `translateX(${(1 - k) * 420}px)`;
      const hov = win(u, 93.2, 94.6, 0.2);
      el.miContent.style.background = mix('#FAFAFA', '#EFEDEA', hov);
      el.miContent.style.transform = `scale(${pressOf(u, 94, 0.03)})`;
      $('panel_train').style.transform = `scale(${pressOf(u, 91, 0.12)})`;
    }

    // ===== scene 8: share content
    {
      const open = sp(u, 110.4, SPR.ui), close = smooth(u, 127.2, 127.7);
      set(el.modalLayer, 'visibility', u > 110.3 && close < 1 ? 'visible' : 'hidden');
      el.backdrop.style.opacity = String(clamp(open * 1.5) * (1 - close));
      el.modal.style.opacity = String(clamp(open * 1.8) * (1 - close));
      el.modal.style.transform = `scale(${(0.94 + 0.06 * open - 0.03 * close).toFixed(4)})`;
      $('add_kids').style.transform = `scale(${pressOf(u, 110)})`;
      typed(el.fTitle, 'משחק ככלי לוויסות רגשי', 112, 114.1, u, 111.6, 115.1);
      typed(el.fBody, 'משחק מובנה עוזר לילדים לזהות רגשות ולתרגל עצירה והרגעה, במרחב בטוח ומהנה.', 115.6, 118.9, u, 115.1, 119.9);
      typed(el.fTopic, 'ויסות רגשי', 120.3, 121.2, u, 119.9, 122.6);
      el.addFile.style.transform = `scale(${pressOf(u, 122.6, 0.06)})`;
      const ch = sp(u, 122.9, SPR.gentle);
      el.chips.style.maxHeight = `${(72 * ch).toFixed(1)}px`;
      [0, 1, 2].forEach((i) => {
        const f = $(`fc${i}`), k = sp(u, 123 + i * 0.4, SPR.pop);
        f.style.transform = `translateY(${(1 - k) * 16}px) scale(${0.9 + 0.1 * k})`;
        f.style.opacity = String(clamp(k * 1.6));
      });
      const ready = smooth(u, 121.3, 121.6);
      const sent = u >= 126.5;
      el.send.style.background = sent ? mix('#5BA4D6', '#2E9E5B', smooth(u, 126.5, 126.8)) : mix('#C7E2F4', mix('#5BA4D6', '#3E8BC4', win(u, 125.7, 126.6, 0.2)), ready);
      el.send.style.transform = `scale(${pressOf(u, 126.4, 0.05)})`;
      el.send.querySelector('.s1').style.opacity = String(1 - smooth(u, 126.5, 126.7));
      el.send.querySelector('.s2').style.opacity = String(smooth(u, 126.6, 126.9));
      // the AI composes the page inside the unit
      const grow = sp(u, 128, SPR.gentle);
      el.article.style.maxHeight = `${(R.art_h + 28) * grow}px`;
      const aiOn = u >= 127.9 && u < 131.4;
      set(el.aiwork, 'visibility', aiOn ? 'visible' : 'hidden');
      el.aiwork.style.opacity = String(1 - smooth(u, 130.6, 131.2));
      el.shine.style.left = `${-260 + ((u - 128) * P * 900) % 1500}px`;
      el.art.querySelectorAll('.ap').forEach((a) => {
        const i = +a.dataset.i, k = sp(u, 130.7 + i * 0.22, SPR.pop);
        a.style.opacity = String(clamp(k * 1.5));
        a.style.transform = `translateY(${(1 - k) * 22}px)`;
      });
      const nb = sp(u, 131.8, SPR.pop);
      el.art.querySelector('.new').style.transform = `scale(${nb})`;
      el.art.style.borderColor = mix('#FFFFFF', '#F9C9BB', smooth(u, 130.6, 131.2));
    }

    // ===== captions
    CAPS.forEach((c, i) => {
      const ce = $(`cap${i}`);
      const k = sp(u, c.a, SPR.ui), out = smooth(u, c.b - 0.35, c.b);
      const on = u >= c.a - 0.01 && u < c.b + 0.01;
      set(ce, 'visibility', on ? 'visible' : 'hidden');
      if (on) {
        ce.style.opacity = String(clamp(k * 1.6) * (1 - out));
        ce.style.transform = `translateY(${((1 - k) * 34 + out * 14).toFixed(2)}px)`;
      }
    });

    // ===== highlight rings (world space; follow scroll)
    RINGS.forEach((r, i) => {
      const re = $(`ring${i}`);
      const on = u > r.a && u < r.b;
      set(re, 'visibility', on ? 'visible' : 'hidden');
      if (!on) return;
      const b = rect(r.id, u);
      const k = sp(u, r.a, SPR.pop), o = win(u, r.a, r.b, 0.35);
      const pulse = 1 + 0.025 * Math.sin((u - r.a) * P * Math.PI * 2 * 1.2);
      const sc = (1.18 - 0.18 * k) * pulse;
      re.style.left = `${b.x - r.pad}px`; re.style.top = `${b.y - r.pad}px`;
      re.style.width = `${b.w + 2 * r.pad}px`; re.style.height = `${b.h + 2 * r.pad}px`;
      re.style.transform = `scale(${sc.toFixed(4)})`;
      re.style.opacity = String(o * 0.95);
    });

    // ===== cursor + ripples
    const [px, py] = cursorPos(u);
    const cv = cursorVis(u);
    set(el.cursor, 'visibility', cv > 0.01 ? 'visible' : 'hidden');
    el.cursor.style.opacity = String(cv);
    el.cursor.style.transform = `translate(${(px - 5).toFixed(2)}px, ${(py - 3).toFixed(2)}px) scale(${(press(u) / Math.max(0.6, s) * 1.25).toFixed(4)})`;
    CLICK.forEach((c, i) => {
      const rp = $(`rip${i}`);
      const d = (u - c.u) * P;
      const on = d >= 0 && d < 0.6;
      set(rp, 'visibility', on ? 'visible' : 'hidden');
      if (!on) return;
      const [x, y] = cursorPos(c.u);
      const rr = (14 + 46 * E.outCubic(d / 0.6)) / Math.max(0.6, s) * 1.2;
      rp.style.left = `${x - rr}px`; rp.style.top = `${y - rr}px`;
      rp.style.width = rp.style.height = `${2 * rr}px`;
      rp.style.opacity = String(0.9 * (1 - d / 0.6));
    });
  }

  // ------------------------------------------------------------------ hits (sound on picture)
  function hits() {
    const H = [];
    const add = (u, label, sfx, o) => H.push([u, label, sfx, o]);
    ['D5', 'F#5', 'A5', 'B5', 'D6'].forEach((p, i) => add(i * 0.5, `logo dot ${i + 1}`, 'pop', { pitch: p, gain: 0.26 }));
    add(3, 'wordmark', 'tick', { gain: 0.16 });
    add(6, 'headline', 'whoosh', { len: 0.45, from: 500, to: 2200, gain: 0.16 });
    [8.5, 9, 9.5].forEach((u, i) => add(u, `chip ${i + 1}`, 'pop', { pitch: ['A5', 'D6', 'F#6'][i], gain: 0.22 }));
    add(11.4, 'browser rises', 'whoosh', { len: 0.6, from: 300, to: 1800, gain: 0.2 });
    add(12, 'browser lands', 'thud', { pitch: 120, to: 50, gain: 0.2 });
    for (const c of CAPS) add(c.a, `caption ${c.n}`, 'blip', { pitch: 'A5', gain: 0.1 });
    for (const c of CLICK) add(c.u, 'click', 'click', { gain: 0.32 });
    add(16.7, 'page: trainings', 'whoosh', { len: 0.4, from: 900, to: 2600, gain: 0.12 });
    add(20.2, 'scroll', 'whoosh', { len: 0.5, from: 300, to: 900, gain: 0.08 });
    add(21.4, 'hours ring', 'tick', { gain: 0.16 });
    add(24, 'scroll', 'whoosh', { len: 0.5, from: 300, to: 900, gain: 0.08 });
    [24.6, 25, 25.4].forEach((u, i) => add(u, `card ${i + 1}`, 'pop', { pitch: ['D5', 'F#5', 'A5'][i], gain: 0.2 }));
    [27.6, 29, 30.4].forEach((u) => add(u, 'card ring', 'tick', { gain: 0.14 }));
    add(39.6, 'registered', 'bell', { pitch: 'A6', gain: 0.22 });
    add(46.6, 'calendar opens', 'whoosh', { len: 0.45, from: 500, to: 2400, gain: 0.14 });
    add(53.6, 'event lands', 'pop+bell', { pitch: 'D6', gain: 0.2 });
    add(59.4, 'to the phone', 'whoosh', { len: 0.55, from: 400, to: 2000, gain: 0.16 });
    add(62, 'typing…', 'tick', { gain: 0.1 });
    add(64.6, 'message', 'blip', { pitch: 'E6', gain: 0.3 });
    add(64.85, 'message 2', 'blip', { pitch: 'A6', gain: 0.26 });
    add(71.2, 'back to the card', 'whoosh', { len: 0.5, from: 2000, to: 500, gain: 0.14 });
    add(75.9, 'meeting opens', 'whoosh', { len: 0.45, from: 600, to: 2600, gain: 0.14 });
    PEOPLE.forEach((p, i) => add(76.1 + i * 0.16, `tile ${i + 1}`, 'pop', { pitch: ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6'][i], gain: 0.12 }));
    add(82.5, 'hand up', 'pop', { pitch: 'B5', gain: 0.14 });
    add(88, 'back to tab', 'tick', { gain: 0.12 });
    add(91.1, 'menu opens', 'whoosh', { len: 0.35, from: 1200, to: 3000, gain: 0.1 });
    add(94.5, 'content page', 'whoosh', { len: 0.4, from: 900, to: 2600, gain: 0.12 });
    add(99.6, 'scroll', 'whoosh', { len: 0.5, from: 300, to: 900, gain: 0.08 });
    add(103.8, 'scroll', 'whoosh', { len: 0.5, from: 300, to: 900, gain: 0.07 });
    add(106.2, 'scroll back', 'whoosh', { len: 0.5, from: 900, to: 300, gain: 0.07 });
    add(110.4, 'modal', 'pop', { pitch: 'A5', gain: 0.18 });
    add(112, 'type title', 'type', { n: 22, len: 2.1 * P, gain: 0.12 });
    add(115.6, 'type body', 'type', { n: 44, len: 3.3 * P, gain: 0.1 });
    add(120.3, 'type topic', 'type', { n: 10, len: 0.9 * P, gain: 0.12 });
    [123, 123.4, 123.8].forEach((u, i) => add(u, `file ${i + 1}`, 'pop', { pitch: ['F#5', 'A5', 'D6'][i], gain: 0.18 }));
    add(126.5, 'sent', 'bell', { pitch: 'A6', gain: 0.2 });
    add(128, 'ai composing', 'riser', { len: 2.6 * P, gain: 0.08 });
    add(130.7, 'page appears', 'bell', { pitch: 'D7', gain: 0.18 });
    add(131.8, 'new badge', 'pop', { pitch: 'D6', gain: 0.18 });
    add(135.6, 'to the end card', 'swell', { len: 0.9, gain: 0.12 });
    LOGO_DOTS.forEach((d, i) => add(137.1 + i * 0.5, `end dot ${i + 1}`, 'pop', { pitch: ['D5', 'F#5', 'A5', 'B5', 'D6'][i], gain: 0.2 }));
    add(138.4, 'end line', 'bell', { pitch: 'D6', gain: 0.2 });
    return H.sort((a, b) => a[0] - b[0]);
  }

  // ------------------------------------------------------------------ boot
  let ready = null;
  async function boot() {
    await Promise.all(['400 20px Rubik', '700 20px Rubik', '500 20px Rubik', '600 20px Rubik'].map((f) => document.fonts.load(f, 'אבג Abc 123')));
    await document.fonts.ready;
    // measure pass A: article collapsed (layout of the content page before publishing)
    el.article.style.maxHeight = '0px';
    for (const k of ['trauma', 'kids']) $(`after_${k}`).style.maxHeight = '0px';
    measure(['hero', 'btnTrain', 'trTop', 'welcome', 'hours', 'sectUnits', 'unitsTitle', 'cards', 'card_trauma', 'card_cbt', 'card_kids', 'btn_cbt', 'cal_cbt',
      'after_cbt', 'ctTop', 'unit_kids', 'unit_trauma', 'unit_cbt', 'add_kids', 'ucard_kids', 'panel_train', 'miContent', 'modal', 'fTitle', 'fBody', 'fTopic', 'addFile',
      'chips', 'send', 'saveBtn', 'calWin']);
    el.article.style.maxHeight = 'none';
    measure(['article', 'art']);
    R.art_h = R.art.h;
    plan();
    window.HITS = hits();
    window.R = R;
    if (PREVIEW) document.body.classList.add('preview');
    fit();
    apply(U(0));
  }
  function fit() {
    if (RENDER) { stage.style.transform = 'none'; return; }
    const sc = Math.min(innerWidth / 1920, (innerHeight - (PREVIEW ? 54 : 0)) / 1080);
    stage.style.transform = `translate(${(innerWidth - 1920 * sc) / 2}px, ${(innerHeight - (PREVIEW ? 54 : 0) - 1080 * sc) / 2}px) scale(${sc})`;
  }
  addEventListener('resize', fit);

  window.DURATION = DURATION;
  window.seek = async (t) => {
    await ready;
    apply(U(clamp(t, 0, DURATION)));
  };
  ready = boot().then(() => { window.filmReady = true; });

  // ------------------------------------------------------------------ preview harness (?preview=1)
  if (PREVIEW) {
    const h = document.createElement('div');
    h.id = 'harness';
    h.innerHTML = '<button id="pp">play</button><input id="scrub" type="range" min="0" max="90" step="0.0167" value="0"><span id="tc">0.00</span>';
    document.body.appendChild(h);
    let playing = false, t0 = 0, start = 0;
    const scrub = h.querySelector('#scrub'), tc = h.querySelector('#tc'), pp = h.querySelector('#pp');
    const show = (t) => { scrub.value = t; tc.textContent = t.toFixed(2); window.seek(t); };
    const loop = (now) => { if (!playing) return; const t = (t0 + (now - start) / 1000) % DURATION; show(t); requestAnimationFrame(loop); };
    pp.onclick = () => { playing = !playing; pp.textContent = playing ? 'pause' : 'play'; if (playing) { t0 = +scrub.value; start = performance.now(); requestAnimationFrame(loop); } };
    scrub.oninput = () => { playing = false; pp.textContent = 'play'; show(+scrub.value); };
  }
})();
