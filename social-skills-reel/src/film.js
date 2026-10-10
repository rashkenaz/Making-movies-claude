// מרכז דיאלוג · "קבוצת חברים": a 37.5 s 9:16 reel that is a pure function of time.
// window.seek(t) sets every style from t alone: no transitions, timers, rAF or state between frames.
// Timing is in beats (u) on the measured grid in beats.json (96 bpm, 60 beats). See docs/shotlist.md.
/* global GRID, ICONS */

(() => {
  const PARAMS = new URLSearchParams(location.search);
  const RENDER = PARAMS.get('render') === '1';
  const PREVIEW = PARAMS.get('preview') === '1';
  const P = GRID.period, OFF = GRID.offset;
  const DURATION = 37.5;
  const SW = 1080, SH = 1920;
  const U = (t) => (t - OFF) / P;
  const SIGAL = '@@SIGAL@@';

  // ------------------------------------------------------------------ math
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (u, a, b) => clamp((u - a) / (b - a));
  const E = {
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
    outCubic: (t) => 1 - (1 - t) ** 3,
    inCubic: (t) => t * t * t,
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
    ui: { stiffness: 320, damping: 27 },
    pop: { stiffness: 260, damping: 17 },
    gentle: { stiffness: 120, damping: 20 },
    cam: { stiffness: 40, damping: 12.6 },
  };
  const sp = (u, u0, cfg = SPR.ui) => spring((u - u0) * P, cfg);
  const win = (u, a, b, fade = 0.4) => Math.min(smooth(u, a, a + fade), 1 - smooth(u, b - fade, b));

  // ------------------------------------------------------------------ characters (pure shapes, illustrated, ~9 years old)
  const FIG_W = 160, FIG_H = 340, SIT_H = 300;
  const hairSVG = (style, c) => ({
    short: `<path d="M44 60 C40 22 62 12 82 12 C106 12 122 26 118 60 C112 40 100 32 80 32 C62 32 50 40 44 60 Z" fill="${c}"/>`,
    spiky: `<path d="M44 58 L46 30 L56 38 L60 18 L72 30 L80 12 L90 30 L102 18 L106 38 L116 30 L118 58 C110 40 98 34 80 34 C62 34 50 40 44 58 Z" fill="${c}"/>`,
    pony: `<path d="M44 62 C40 22 62 12 82 12 C106 12 122 24 118 62 C112 38 100 30 80 30 C62 30 50 38 44 62 Z" fill="${c}"/><path d="M114 40 C138 46 140 86 126 106 C130 80 124 62 112 54 Z" fill="${c}"/>`,
    curly: [[52, 38, 16], [68, 24, 18], [90, 22, 18], [108, 36, 16], [46, 56, 11], [116, 56, 11]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join(''),
    long: `<path d="M44 66 C38 22 62 12 82 12 C106 12 124 24 118 66 C112 38 100 30 80 30 C62 30 50 38 44 66 Z" fill="${c}"/>`,
    braids: `<path d="M44 62 C40 22 62 12 82 12 C106 12 122 24 118 62 C112 38 100 30 80 30 C62 30 50 38 44 62 Z" fill="${c}"/><rect x="34" y="56" width="12" height="44" rx="6" fill="${c}"/><rect x="114" y="56" width="12" height="44" rx="6" fill="${c}"/><circle cx="40" cy="102" r="6" fill="#F7987D"/><circle cx="120" cy="102" r="6" fill="#F7987D"/>`,
  })[style];
  const hairBack = (style, c) => (style === 'long' ? `<path d="M40 60 C34 120 40 150 46 168 L114 168 C122 150 128 120 120 60 Z" fill="${c}"/>` : '');
  const face = (o) => `<g class="eyes"><circle cx="68" cy="60" r="4.6" fill="#2A2A2E"/><circle cx="92" cy="60" r="4.6" fill="#2A2A2E"/></g>
      <circle cx="60" cy="74" r="6" fill="#F4A9A0" opacity=".45"/><circle cx="100" cy="74" r="6" fill="#F4A9A0" opacity=".45"/>
      <path class="mouth" d="${o.big ? 'M68 74 Q80 88 92 74 Z' : 'M70 76 Q80 84 90 76'}" stroke="#8A4B3E" stroke-width="3.4" stroke-linecap="round" fill="${o.big ? '#fff' : 'none'}"/>`;
  function standKid(o, id) {
    const bag = o.bag ? `<rect x="36" y="100" width="22" height="78" rx="9" fill="${o.bag}"/>` : '';
    return `<svg class="fig" id="${id}" width="${FIG_W}" height="${FIG_H}" viewBox="0 0 ${FIG_W} ${FIG_H}" style="transform-origin:50% 100%">
      <ellipse cx="80" cy="334" rx="46" ry="7" fill="#000" opacity=".08"/>
      <g class="legL" style="transform-origin:50% 0%"><rect x="56" y="196" width="22" height="122" rx="10" fill="${o.pants}"/><ellipse cx="64" cy="324" rx="16" ry="9" fill="${o.shoes}"/></g>
      <g class="legR" style="transform-origin:50% 0%"><rect x="82" y="196" width="22" height="122" rx="10" fill="${o.pants}"/><ellipse cx="96" cy="324" rx="16" ry="9" fill="${o.shoes}"/></g>
      ${bag}
      <g class="armL" style="transform-origin:50% 8%"><rect x="34" y="102" width="18" height="92" rx="9" fill="${o.shirt}"/><circle cx="43" cy="194" r="10" fill="${o.skin}"/></g>
      <g class="armR" style="transform-origin:50% 8%"><rect x="108" y="102" width="18" height="92" rx="9" fill="${o.shirt}"/><circle cx="117" cy="194" r="10" fill="${o.skin}"/></g>
      <rect x="48" y="96" width="64" height="112" rx="22" fill="${o.shirt}"/>
      ${o.bag ? `<path d="M56 100 L60 150 M104 100 L100 150" stroke="${o.bag}" stroke-width="6" stroke-linecap="round"/>` : ''}
      <g class="head" style="transform-origin:50% 92%">${hairBack(o.hair, o.hc)}<rect x="72" y="84" width="16" height="16" rx="6" fill="${o.skin2}"/>
      <circle cx="80" cy="58" r="36" fill="${o.skin}"/>${hairSVG(o.hair, o.hc)}${face(o)}</g></svg>`;
  }
  function sitKid(o, id, scale = 1) {
    return `<svg class="fig" id="${id}" width="${FIG_W}" height="${SIT_H}" viewBox="0 0 ${FIG_W} ${SIT_H}" style="transform-origin:50% 100%">
      <g class="armL" style="transform-origin:50% 8%"><rect x="36" y="102" width="18" height="86" rx="9" fill="${o.shirt}"/><circle cx="46" cy="190" r="10" fill="${o.skin}"/></g>
      <g class="armR" style="transform-origin:50% 8%"><rect x="106" y="102" width="18" height="86" rx="9" fill="${o.shirt}"/><circle cx="114" cy="190" r="10" fill="${o.skin}"/></g>
      <rect x="48" y="96" width="64" height="104" rx="22" fill="${o.shirt}"/>
      <rect x="44" y="184" width="72" height="38" rx="14" fill="${o.pants}"/>
      <rect x="52" y="212" width="22" height="72" rx="10" fill="${o.pants}"/><rect x="86" y="212" width="22" height="72" rx="10" fill="${o.pants}"/>
      <ellipse cx="60" cy="288" rx="16" ry="9" fill="${o.shoes}"/><ellipse cx="100" cy="288" rx="16" ry="9" fill="${o.shoes}"/>
      <g class="head" style="transform-origin:50% 92%">${hairBack(o.hair, o.hc)}<rect x="72" y="84" width="16" height="16" rx="6" fill="${o.skin2}"/>
      <circle cx="80" cy="58" r="36" fill="${o.skin}"/>${hairSVG(o.hair, o.hc)}${face(o)}</g></svg>`;
  }
  const chair = (c, id) => `<svg class="fig" id="${id}" width="${FIG_W}" height="${SIT_H}" viewBox="0 0 ${FIG_W} ${SIT_H}" style="transform-origin:50% 100%">
      <ellipse cx="80" cy="294" rx="62" ry="8" fill="#000" opacity=".08"/>
      <rect x="34" y="104" width="92" height="100" rx="22" fill="${c}"/>
      <rect x="30" y="196" width="100" height="26" rx="12" fill="${c}" style="filter:brightness(.92)"/>
      <rect x="38" y="218" width="10" height="76" rx="5" fill="#8C7B6B"/><rect x="112" y="218" width="10" height="76" rx="5" fill="#8C7B6B"/></svg>`;

  const KID = {
    hero: { skin: '#F2C9A8', skin2: '#E2B190', hair: 'short', hc: '#5A3A28', shirt: '#F7987D', pants: '#4E6E8E', shoes: '#3A3A48', bag: '#90C6E9' },
    a: { skin: '#D9A27C', skin2: '#C68D68', hair: 'curly', hc: '#2E2A28', shirt: '#90C6E9', pants: '#3E556E', shoes: '#F4F1EC', big: true },
    b: { skin: '#F4D0B5', skin2: '#E6BB9C', hair: 'pony', hc: '#B5703F', shirt: '#C0DFAE', pants: '#7A6A9A', shoes: '#E98560', big: true },
    c: { skin: '#C98E6A', skin2: '#B57B58', hair: 'braids', hc: '#1F1B1A', shirt: '#FFE36E', pants: '#5B7FA6', shoes: '#3A3A48', big: true },
    d: { skin: '#EBC09F', skin2: '#D9AA86', hair: 'spiky', hc: '#6B4A35', shirt: '#BBA3E3', pants: '#3E556E', shoes: '#F4F1EC', big: true },
    e: { skin: '#F1C7A8', skin2: '#E3B190', hair: 'long', hc: '#3B2A22', shirt: '#F7987D', pants: '#6E8E5E', shoes: '#3A3A48', big: true },
    f: { skin: '#E0B08C', skin2: '#CC9A76', hair: 'short', hc: '#1F1B1A', shirt: '#7BAA6C', pants: '#4E5B6E', shoes: '#F4F1EC', big: true },
    g: { skin: '#F4D0B5', skin2: '#E6BB9C', hair: 'long', hc: '#C58A4E', shirt: '#90C6E9', pants: '#7A6A9A', shoes: '#E98560', big: true },
  };
  const FAC = { skin: '#E6B48E', skin2: '#D49F79', hair: 'long', hc: '#2B2220', shirt: '#7FC4C0', pants: '#6B7C93', shoes: '#C46A5C', big: true };

  // ------------------------------------------------------------------ scenery
  const yardBG = `<svg class="fig" width="1080" height="1920" viewBox="0 0 1080 1920" style="left:0;top:0">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D4ECFA"/><stop offset="1" stop-color="#F3F9FD"/></linearGradient></defs>
    <rect width="1080" height="1060" fill="url(#sky)"/>
    <g fill="#fff" opacity=".9"><ellipse cx="170" cy="230" rx="90" ry="34"/><ellipse cx="230" cy="210" rx="70" ry="38"/><ellipse cx="880" cy="170" rx="100" ry="36"/><ellipse cx="950" cy="150" rx="66" ry="34"/></g>
    <circle cx="930" cy="560" r="64" fill="#FFE36E" opacity=".9"/>
    <rect x="170" y="640" width="740" height="400" rx="16" fill="#FBE9D7"/>
    <path d="M140 660 L540 520 L940 660 Z" fill="#E78C7C"/>
    <g fill="#B9DDF2" stroke="#fff" stroke-width="8">${[230, 390, 610, 770].map((x) => `<rect x="${x}" y="700" width="100" height="110" rx="12"/>`).join('')}${[230, 770].map((x) => `<rect x="${x}" y="850" width="100" height="110" rx="12"/>`).join('')}</g>
    <rect x="470" y="860" width="140" height="180" rx="16" fill="#C46A5C"/><circle cx="586" cy="952" r="6" fill="#FFE36E"/>
    <rect x="420" y="836" width="240" height="20" rx="10" fill="#E78C7C"/>
    <rect x="0" y="1030" width="1080" height="56" fill="#BBDEAB"/>
    <rect x="0" y="1080" width="1080" height="840" fill="#F6E7CC"/>
    <g stroke="#fff" stroke-width="8" fill="none" opacity=".9"><rect x="120" y="1500" width="110" height="110"/><rect x="120" y="1610" width="110" height="110"/><rect x="230" y="1555" width="110" height="110"/></g>
    <circle cx="560" cy="1700" r="130" fill="none" stroke="#fff" stroke-width="8" opacity=".8"/>
    <rect x="96" y="830" width="34" height="260" rx="12" fill="#A97C5E"/>
    <circle cx="113" cy="780" r="110" fill="#9CCB86"/><circle cx="50" cy="840" r="72" fill="#8CC07A"/><circle cx="180" cy="850" r="76" fill="#A8D294"/>
    <g><rect x="690" y="1140" width="390" height="190" rx="10" fill="#E7B7A3"/>
      ${[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => `<rect x="${700 + c * 78 + (r % 2) * 38}" y="${1150 + r * 45}" width="70" height="36" rx="6" fill="#F0C9B8"/>`).join('')).join('')}
      <rect x="680" y="1124" width="410" height="22" rx="10" fill="#D99C86"/></g>
  </svg>`;
  const roomBG = `<svg class="fig" width="1080" height="1920" viewBox="0 0 1080 1920" style="left:0;top:0">
    <defs><linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6EC"/><stop offset="1" stop-color="#FBEADB"/></linearGradient></defs>
    <rect width="1080" height="1160" fill="url(#wall)"/>
    <rect x="0" y="1160" width="1080" height="760" fill="#EFDCC5"/>
    ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="0" y="${1160 + i * 96}" width="1080" height="3" fill="#E4CDB2"/>`).join('')}
    <rect x="0" y="1150" width="1080" height="18" fill="#E2C7A8"/>
    <rect x="96" y="610" width="330" height="380" rx="26" fill="#fff"/><rect x="114" y="628" width="294" height="344" rx="16" fill="#CFE8F7"/>
    <rect x="258" y="628" width="8" height="344" fill="#fff"/><rect x="114" y="796" width="294" height="8" fill="#fff"/>
    <circle cx="350" cy="700" r="36" fill="#FFE36E" opacity=".8"/>
    <g>${['#F7987D', '#90C6E9', '#FFE36E', '#C0DFAE', '#BBA3E3', '#F7987D', '#90C6E9', '#FFE36E', '#C0DFAE'].map((c, i) => `<circle cx="${500 + i * 62}" cy="${600 + Math.sin(i * 0.9) * 14 + 22}" r="18" fill="${c}"/>`).join('')}
      <path d="M470 600 Q745 660 1040 600" fill="none" stroke="#C9B19A" stroke-width="3"/></g>
    <rect x="640" y="760" width="330" height="20" rx="8" fill="#D9B48F"/><rect x="640" y="900" width="330" height="20" rx="8" fill="#D9B48F"/>
    <rect x="660" y="690" width="60" height="70" rx="8" fill="#90C6E9"/><rect x="730" y="710" width="46" height="50" rx="8" fill="#F7987D"/><circle cx="830" cy="728" r="32" fill="#FFE36E"/><rect x="880" y="700" width="70" height="60" rx="8" fill="#C0DFAE"/>
    <rect x="670" y="836" width="110" height="64" rx="10" fill="#BBA3E3"/><rect x="800" y="850" width="56" height="50" rx="8" fill="#F7987D"/><circle cx="910" cy="866" r="32" fill="#90C6E9"/>
    <rect x="960" y="1040" width="70" height="110" rx="14" fill="#E78C7C"/>
    <ellipse cx="975" cy="1000" rx="22" ry="54" fill="#7FB07A" transform="rotate(-18 975 1000)"/><ellipse cx="1015" cy="996" rx="22" ry="58" fill="#93C08B" transform="rotate(16 1015 996)"/><ellipse cx="995" cy="980" rx="20" ry="62" fill="#6FA36B"/>
  </svg>`;

  // ------------------------------------------------------------------ layout data
  // yard: [key, from door to (x, y feet), start beat, activity]
  const YARD = [
    ['a', 300, 1250, 0.9], ['b', 470, 1170, 1.15], ['c', 380, 1400, 1.4],
    ['d', 260, 1560, 1.6], ['e', 560, 1600, 1.85], ['f', 150, 1110, 2.1], ['g', 650, 1270, 2.35],
  ];
  const DOOR = [540, 1040];
  const yScale = (y) => 0.6 + ((y - 1040) / 700) * 0.42;
  const HERO = { x: 860, y: 1440 };
  // room: chairs on an ellipse; seat -90 is the facilitator, 45 is the free chair
  const RC = { x: 540, y: 1440, rx: 380, ry: 170 };
  const SEATS = [[-90, 'fac', '#90C6E9'], [-140, 'a', '#FFE36E'], [-40, 'b', '#C0DFAE'], [180, 'c', '#F7987D'], [0, 'e', '#BBA3E3'], [135, 'd', '#90C6E9'], [45, 'hero', '#F7987D']]
    .map(([a, k, c]) => ({ a, k, c, x: RC.x + RC.rx * Math.cos((a * Math.PI) / 180), y: RC.y + RC.ry * Math.sin((a * Math.PI) / 180) }));
  const rScale = (y) => 0.95 + ((y - 1270) / 340) * 0.3;

  // ------------------------------------------------------------------ build the DOM
  const ic = (name) => `<svg class="i" viewBox="0 0 24 24">${ICONS[name]}</svg>`;
  const mw = (t) => t.split(' ').map((w) => `<span class="mask"><span class="wd">${w}</span></span>`).join(' ');
  const LOGO_PATH = 'M56.7,35 C40,46.7 38.3,76.7 58.3,96.7 C70,108.3 83.3,116.7 92.7,124 L68.3,156.7 C65,161.7 68.3,165 75,163.3 L146.7,138.3 C173.3,136.7 200,133.3 217.3,120';
  const LOGO_DOTS = [[85, 63.3, 23.3, '#E98560'], [124.3, 106.7, 23.3, '#E5E783'], [148.3, 48.3, 19, '#6EB8EE'], [183.3, 100, 19, '#AFD6A5'], [195.7, 25, 15.7, '#A2ABBD']];
  const logoSVG = (id, style = '') => `<svg id="${id}" viewBox="0 0 243 183" style="${style};overflow:visible">
    <path class="lstroke" d="${LOGO_PATH}" pathLength="1" fill="none" stroke="#4E4B5D" stroke-width="7.4" stroke-linejoin="round"/>
    ${LOGO_DOTS.map(([x, y, r, c]) => `<circle class="ld" cx="${x}" cy="${y}" r="${r}" fill="${c}" style="transform-box:fill-box;transform-origin:center"/>`).join('')}</svg>`;

  const PILLS = [
    ['משחקים', '#FDE3DA', '#F7987D'], ['משחקי תפקידים', '#E3F1FA', '#90C6E9'],
    ['מצבים חברתיים אמיתיים', '#E8F4E0', '#7BAA6C'], ['הדרכת הורים', '#FFF6C4', '#E5C93A'],
  ];
  const CARDS = [
    ['school', 'כיתות א׳–ו׳', '#FDE3DA'], ['users', 'עד 8 ילדים', '#E3F1FA'],
    ['calendar-days', 'ימי רביעי', '#E8F4E0'], ['map-pin', 'קריית אתא', '#FFF6C4'],
  ];

  const stage = document.getElementById('stage');
  stage.innerHTML = `
  <div class="layer" id="yard">${yardBG}
    <svg class="fig" id="bell" width="90" height="100" viewBox="0 0 90 100" style="left:495px;top:440px;transform-origin:50% 8%">
      <rect x="40" y="0" width="10" height="16" rx="4" fill="#C46A5C"/><path d="M14 74 C14 36 26 16 45 16 C64 16 76 36 76 74 Z" fill="#F4D04E"/>
      <rect x="8" y="70" width="74" height="12" rx="6" fill="#E5B92F"/><circle cx="45" cy="88" r="9" fill="#C46A5C"/></svg>
    <div class="fig" id="bellWaves" style="left:440px;top:420px;width:200px;height:140px"></div>
    <div id="kids">${YARD.map(([k]) => standKid(KID[k], `y_${k}`)).join('')}${standKid(KID.hero, 'y_hero')}</div>
    <svg class="fig" id="ball" width="54" height="54" viewBox="0 0 54 54"><circle cx="27" cy="27" r="25" fill="#F7987D"/><path d="M4 27 Q27 14 50 27 M27 2 Q38 27 27 52" stroke="#fff" stroke-width="4" fill="none"/></svg>
  </div>
  <div class="layer" id="yardText">
    <div class="tl h1" id="c1" style="top:250px">${mw('הצלצול להפסקה.')}</div>
    <div class="tl h2" id="c2" style="top:372px">${mw('הרגע הכי ארוך ביום שלו.')}</div>
  </div>
  <div class="fig" id="iris" style="left:0;top:0;border-radius:50%;background:#F7987D"></div>
  <div class="layer" id="room">${roomBG}
    <div id="seats">${SEATS.map((s) => chair(s.c, `ch_${s.k}`)).join('')}
      ${SEATS.filter((s) => s.k !== 'hero' && s.k !== 'fac').map((s) => sitKid(KID[s.k], `s_${s.k}`)).join('')}
      ${sitKid(FAC, 's_fac')}${sitKid(KID.hero, 's_hero')}${standKid(KID.hero, 'r_hero')}</div>
    <div class="tl h1" id="r1" style="top:262px">${mw('חברות היא מיומנות.')}</div>
    <div class="tl h2" id="r2" style="top:388px">${mw('אפשר לתרגל אותה.')}</div>
  </div>
  <div class="layer" id="panel" style="background:#FCFBF9;border-radius:80px 80px 0 0">
    <div class="fig" id="blobs" style="left:0;top:0;width:1080px;height:1920px">
      <div class="fig bl" style="left:-120px;top:120px;width:360px;height:360px;border-radius:50%;background:#FDE3DA"></div>
      <div class="fig bl" style="left:820px;top:300px;width:300px;height:300px;border-radius:50%;background:#E3F1FA"></div>
      <div class="fig bl" style="left:860px;top:1380px;width:280px;height:280px;border-radius:50%;background:#E8F4E0"></div>
      <div class="fig bl" style="left:-80px;top:1460px;width:240px;height:240px;border-radius:50%;background:#FFF6C4"></div>
    </div>
    <div id="sPills">
      <div class="tl h1" id="pH" style="top:300px">${mw('מה עושים בקבוצה?')}</div>
      ${PILLS.map(([t, bg, dot], i) => `<div class="pill" id="pill${i}" style="top:${600 + i * 230}px;background:${bg}"><i class="dot" style="background:${dot}"></i>${t}</div>`).join('')}
    </div>
    <div id="sCards">
      <div class="tl h1" id="kH" style="top:300px;color:#C46A5C">${mw('קבוצת חברים')}</div>
      ${CARDS.map(([ico, t, bg], i) => `<div class="card" id="card${i}" style="left:${i % 2 ? 80 : 560}px;top:${620 + Math.floor(i / 2) * 400}px"><div class="ico" style="background:${bg}">${ic(ico)}</div><div class="ct">${t}</div></div>`).join('')}
    </div>
    <div id="fac">
      <div id="facPhoto"><img src="${SIGAL}" alt=""></div>
      <div id="facKicker">בהנחיית</div>
      <div id="facName">סיגל וצלר</div>
      <div class="bio" id="bio1">מטפלת רגשית — פסיכותרפיסטית באמצעות משחק ו-<bdi>LI-CBT</bdi> מדריכת הורים ומנחה קבוצות הורים וילדים.</div>
      <div class="bio" id="bio2">בעלת תואר ראשון ושני (<bdi>M.A</bdi>) בחינוך לגיל הרך.</div>
    </div>
    <div id="sReg">
      <div class="big" id="gK" style="top:360px;font-size:64px;font-weight:500;color:#C46A5C">פתיחה</div>
      <div class="big" id="gD" style="top:440px;font-size:250px;letter-spacing:-4px"><bdi>18.11</bdi></div>
      <div class="chipR" id="gR" style="top:860px;background:#C46A5C;color:#fff">הרשמה עד <bdi>11.11</bdi></div>
      <div class="chipR" id="gL" style="top:1060px;background:#E3F1FA;color:#25415f">${ic('arrow-up')}הקישור בביו</div>
    </div>
    <div id="sEnd">
      ${logoSVG('logoZ', 'position:absolute;left:310px;top:470px;width:460px;height:346px')}
      <div class="tl h1" id="z1" style="top:900px;font-size:110px;color:#3A3848">${mw('מרכז דיאלוג')}</div>
      <div class="tl h2" id="z2" style="top:1050px;font-size:60px;color:#C46A5C">${mw('קבוצת חברים · קריית אתא')}</div>
    </div>
  </div>`;

  const $ = (id) => document.getElementById(id);
  const el = {};
  for (const n of ['yard', 'yardText', 'c1', 'c2', 'iris', 'room', 'r1', 'r2', 'panel', 'blobs', 'sPills', 'pH', 'sCards', 'kH', 'fac', 'facPhoto', 'facKicker', 'facName', 'bio1', 'bio2',
    'sReg', 'gK', 'gD', 'gR', 'gL', 'sEnd', 'logoZ', 'z1', 'z2', 'bell', 'bellWaves', 'ball', 'y_hero', 'r_hero', 's_hero']) el[n] = $(n);
  el.bellWaves.innerHTML = [0, 1, 2].map((i) => `<div class="fig wv" style="left:0;top:0;width:200px;height:140px;border-radius:50%;border:6px solid #F4D04E"></div>`).join('');

  // ------------------------------------------------------------------ helpers per frame
  const set = (e, k, v) => { if (e.style[k] !== v) e.style[k] = v; };
  const show = (e, on) => set(e, 'display', on ? '' : 'none');
  const place = (svg, x, y, s, h = FIG_H) => { svg.style.transform = `translate(${(x - FIG_W / 2).toFixed(2)}px, ${(y - h).toFixed(2)}px) scale(${s.toFixed(4)})`; };
  const limbs = (svg, swing, armSwing = swing, head = 0) => {
    svg.querySelector('.legL').style.transform = `rotate(${swing.toFixed(2)}deg)`;
    svg.querySelector('.legR').style.transform = `rotate(${(-swing).toFixed(2)}deg)`;
    svg.querySelector('.armL').style.transform = `rotate(${(-armSwing).toFixed(2)}deg)`;
    svg.querySelector('.armR').style.transform = `rotate(${armSwing.toFixed(2)}deg)`;
    svg.querySelector('.head').style.transform = `rotate(${head.toFixed(2)}deg)`;
  };
  const words = (node, u, u0, step = 0.22, cfg = SPR.pop) => node.querySelectorAll('.wd').forEach((w, i) => {
    const k = sp(u, u0 + i * step, cfg);
    w.style.transform = `translateY(${((1 - k) * 130).toFixed(2)}%)`;
  });
  const popIn = (node, u, u0, { dy = 60, s0 = 0.8, cfg = SPR.pop, out = Infinity } = {}) => {
    const k = sp(u, u0, cfg), o = 1 - smooth(u, out, out + 0.5);
    node.style.opacity = String(clamp(k * 1.8) * o);
    node.style.transform = `${node.dataset.base || ''} translateY(${((1 - k) * dy - (1 - o) * 80).toFixed(2)}px) scale(${(s0 + (1 - s0) * k).toFixed(4)})`;
  };

  // ball passes between a, b, g (feet positions -> hands)
  const BALLERS = ['a', 'b', 'g', 'a', 'b', 'g', 'a'];
  const PASS0 = 4.6, PASS = 1.15;
  const handAt = (k) => { const r = YARD.find((y) => y[0] === k); const s = yScale(r[2]); return [r[1], r[2] - 200 * s]; };

  // ------------------------------------------------------------------ the frame
  function apply(u) {
    // ===== scene ranges (beats)
    const yardOn = u < 13.4, roomOn = u > 11.6 && u < 23.2, panelOn = u > 21.4;
    show(el.yard, yardOn); show(el.yardText, u < 12); show(el.room, roomOn); show(el.panel, panelOn);

    if (yardOn) {
      // camera: settle on the boy by the wall
      const zk = sp(u, 4.6, SPR.cam);
      const s = 1 + 0.3 * zk;
      const fx = HERO.x - 60, fy = HERO.y - 160;
      const tx = lerp(fx, 760, zk), ty = lerp(fy, 1240, zk);
      el.yard.style.transform = `translate(${(tx - fx * s).toFixed(2)}px, ${(ty - fy * s).toFixed(2)}px) scale(${s.toFixed(4)})`;
      // bell rings three times
      const ringA = Math.sin(u * TAU * 2.2) * 16 * Math.exp(-Math.max(0, u - 0.3) * 0.9) * (u > 0.3 ? 1 : 0);
      el.bell.style.transform = `rotate(${ringA.toFixed(2)}deg)`;
      el.bellWaves.querySelectorAll('.wv').forEach((w, i) => {
        const d = u - (0.3 + i * 0.4);
        const on = d > 0 && d < 1.6;
        set(w, 'visibility', on ? 'visible' : 'hidden');
        if (on) { w.style.transform = `scale(${(0.3 + d * 0.8).toFixed(3)})`; w.style.opacity = String((1 - d / 1.6) * 0.8); }
      });
      // kids run out of the door to their spots, then play
      YARD.forEach(([k, x, y, u0]) => {
        const svg = $(`y_${k}`);
        const p = E.inOutSine(prog(u, u0, u0 + 2.4));
        const out = u > u0 - 0.05;
        set(svg, 'visibility', out ? 'visible' : 'hidden');
        let px = lerp(DOOR[0], x, p), py = lerp(DOOR[1] + 10, y, p);
        const moving = p > 0 && p < 1;
        let swing = moving ? 30 * Math.sin((u - u0) * TAU * 1.6) : 0;
        let bob = moving ? Math.abs(Math.sin((u - u0) * TAU * 1.6)) * 14 : 0;
        let arm = swing, head = 0;
        // tag: d chases e around the hopscotch
        if ((k === 'd' || k === 'e') && p >= 1) {
          const ph = (u - u0 - 2.4) * 0.28 + (k === 'd' ? -0.35 : 0);
          px = x + Math.sin(ph * TAU) * 150; py = y + Math.cos(ph * TAU) * 40;
          swing = 30 * Math.sin(u * TAU * 1.6); bob = Math.abs(Math.sin(u * TAU * 1.6)) * 14; arm = swing;
        }
        // f waves now and then (talking by the tree)
        if (k === 'f' && p >= 1) { arm = 0; head = 6 * Math.sin(u * TAU * 0.5); }
        // catchers lift their arms near a catch
        if ((k === 'a' || k === 'b' || k === 'g') && p >= 1) {
          let lift = 0;
          BALLERS.forEach((bk, i) => { if (bk === k) lift = Math.max(lift, Math.exp(-(((u - (PASS0 + i * PASS)) / 0.35) ** 2))); });
          arm = -0; svg.querySelector('.armL').style.transform = `rotate(${(140 * lift).toFixed(1)}deg)`;
          svg.querySelector('.armR').style.transform = `rotate(${(-140 * lift).toFixed(1)}deg)`;
          svg.querySelector('.legL').style.transform = svg.querySelector('.legR').style.transform = 'rotate(0deg)';
          svg.querySelector('.head').style.transform = `rotate(${(4 * Math.sin(u * TAU * 0.6)).toFixed(2)}deg)`;
          place(svg, px, py - bob, yScale(py));
          return;
        }
        limbs(svg, swing, arm, head);
        place(svg, px, py - bob, yScale(py));
      });
      // the ball
      const bi = Math.floor((u - PASS0) / PASS);
      const ballOn = u >= PASS0 && bi < BALLERS.length - 1;
      set(el.ball, 'visibility', ballOn ? 'visible' : 'hidden');
      if (ballOn) {
        const f = (u - PASS0 - bi * PASS) / PASS;
        const [x0, y0] = handAt(BALLERS[bi]), [x1, y1] = handAt(BALLERS[bi + 1]);
        const bx = lerp(x0, x1, f), by = lerp(y0, y1, f) - Math.sin(f * Math.PI) * 170;
        el.ball.style.transform = `translate(${(bx - 27).toFixed(1)}px, ${(by - 27).toFixed(1)}px) rotate(${(u * 220).toFixed(1)}deg)`;
      }
      // the boy by the wall: curious, then a small step toward the game
      const h = el.y_hero;
      const step = E.inOutSine(prog(u, 9.2, 10.6));
      const stepping = step > 0 && step < 1;
      const hx = lerp(HERO.x, HERO.x - 90, step);
      const look = 7 * Math.sin(u * TAU * 0.35) - 4;
      limbs(h, stepping ? 24 * Math.sin((u - 9.2) * TAU * 1.4) : 0, stepping ? 14 * Math.sin((u - 9.2) * TAU * 1.4) : 0, look);
      h.querySelector('.eyes').style.transform = `translateX(${(-3 - 2 * Math.sin(u * TAU * 0.35)).toFixed(2)}px)`;
      place(h, hx, HERO.y - (stepping ? Math.abs(Math.sin((u - 9.2) * TAU * 1.4)) * 10 : 0), yScale(HERO.y) * 1.04);
      h.style.zIndex = '5';
    }
    if (u < 12) {
      words(el.c1, u, 1.5, 0.2);
      words(el.c2, u, 3.4, 0.2);
      const o = 1 - smooth(u, 10.4, 11.2);
      el.yardText.style.opacity = String(o);
    }

    // ===== iris: a peach circle opens from the boy and fills the frame
    const ia = prog(u, 10.8, 12.2), ib = prog(u, 12.2, 13.4);
    show(el.iris, ia > 0 && ib < 1);
    if (ia > 0 && ib < 1) {
      const r = 2300 * E.inCubic(ia) + 10;
      const cx = 580, cy = 1100;
      Object.assign(el.iris.style, { width: `${2 * r}px`, height: `${2 * r}px`, transform: `translate(${cx - r}px, ${cy - r}px)`, opacity: String(1 - ib) });
    }

    // ===== the group room
    if (roomOn) {
      const rr = 2400 * E.outCubic(prog(u, 12.0, 13.4));
      el.room.style.clipPath = u < 13.4 ? `circle(${rr.toFixed(0)}px at 580px 1100px)` : 'none';
      const roomCam = 1.06 - 0.06 * sp(u, 12.2, SPR.cam);
      el.room.style.transform = `translate(${(540 - 540 * roomCam).toFixed(2)}px, ${(1100 - 1100 * roomCam).toFixed(2)}px) scale(${roomCam.toFixed(4)})`;
      SEATS.forEach((st) => {
        const s = rScale(st.y) * (st.k === 'fac' ? 1.0 : 1);
        const ch = $(`ch_${st.k}`);
        place(ch, st.x, st.y, s, SIT_H);
        ch.style.zIndex = String(Math.round(st.y));
        if (st.k === 'hero') return;
        const kid = $(`s_${st.k}`);
        // everyone greets the boy when he sits: a little bounce and a wave
        const greet = Math.exp(-(((u - 16.2) / 0.9) ** 2));
        const bounce = Math.max(0, Math.sin((u - 15.8 - (st.a + 180) / 900) * TAU * 1.2)) * 10 * greet;
        const sc = st.k === 'fac' ? s * 1.2 : s;
        place(kid, st.x, st.y - 18 * s - bounce, sc, SIT_H);
        kid.style.zIndex = String(Math.round(st.y) + 1);
        const wave = st.k === 'e' || st.k === 'b' ? 120 * greet + 12 * Math.sin(u * TAU * 1.4) * greet : 0;
        kid.querySelector('.armR').style.transform = `rotate(${(-wave).toFixed(1)}deg)`;
        kid.querySelector('.head').style.transform = `rotate(${(5 * Math.sin(u * TAU * 0.4 + st.a)).toFixed(2)}deg)`;
      });
      // the boy walks in and takes the free chair
      const hs = SEATS.find((s) => s.k === 'hero');
      const walk = E.inOutSine(prog(u, 13.0, 15.6));
      const seated = u >= 15.7;
      show(el.r_hero, !seated); show(el.s_hero, seated);
      const sH = rScale(hs.y);
      if (!seated) {
        const wx = lerp(1180, hs.x + 10, walk), wy = lerp(1700, hs.y + 24, walk);
        const w = walk > 0 && walk < 1;
        limbs(el.r_hero, w ? 26 * Math.sin((u - 13) * TAU * 1.5) : 0, w ? 18 * Math.sin((u - 13) * TAU * 1.5) : 0, 0);
        place(el.r_hero, wx, wy - (w ? Math.abs(Math.sin((u - 13) * TAU * 1.5)) * 12 : 0), sH * 1.02);
        el.r_hero.style.zIndex = '2000';
      } else {
        const hop = Math.max(0, 1 - sp(u, 15.7, SPR.pop)) * 22;
        place(el.s_hero, hs.x, hs.y - 18 * sH - hop, sH, SIT_H);
        el.s_hero.style.zIndex = String(Math.round(hs.y) + 1);
        el.s_hero.querySelector('.head').style.transform = `rotate(${(-4 + 4 * Math.sin(u * TAU * 0.4)).toFixed(2)}deg)`;
      }
      words(el.r1, u, 16.4, 0.22);
      words(el.r2, u, 18.1, 0.22);
    }

    // ===== the panel: rises over the room, then hosts the info scenes
    if (panelOn) {
      const up = sp(u, 21.4, SPR.gentle);
      el.panel.style.transform = `translateY(${((1 - up) * 1920).toFixed(1)}px)`;
      el.panel.style.borderRadius = `${(80 * (1 - prog(u, 22.4, 23.4))).toFixed(1)}px ${(80 * (1 - prog(u, 22.4, 23.4))).toFixed(1)}px 0 0`;
      el.blobs.querySelectorAll('.bl').forEach((b, i) => { b.style.transform = `translate(${(18 * Math.sin(u * 0.35 + i)).toFixed(1)}px, ${(22 * Math.cos(u * 0.3 + i * 2)).toFixed(1)}px)`; });

      // pills (22.4 - 31)
      const pillsOn = u < 31.6;
      show(el.sPills, pillsOn);
      if (pillsOn) {
        words(el.pH, u, 22.4, 0.2);
        el.pH.style.opacity = String(1 - smooth(u, 30.4, 31));
        PILLS.forEach((_, i) => {
          const p = $(`pill${i}`);
          p.dataset.base = 'translateX(-50%)';
          popIn(p, u, 23.4 + i * 1.5, { dy: 90, s0: 0.7, out: 30.4 + i * 0.12 });
        });
      }
      // info cards (31 - 38.6)
      const cardsOn = u > 30.8 && u < 39;
      show(el.sCards, cardsOn);
      if (cardsOn) {
        words(el.kH, u, 31, 0.22);
        el.kH.style.opacity = String(1 - smooth(u, 37.8, 38.4));
        CARDS.forEach((_, i) => popIn($(`card${i}`), u, 31.8 + i * 0.75, { dy: 80, s0: 0.75, out: 37.8 + i * 0.1 }));
      }
      // facilitator (38.4 - 47)
      const facOn = u > 38.2 && u < 47.4;
      show(el.fac, facOn);
      if (facOn) {
        const o = 1 - smooth(u, 46.4, 47.2);
        el.fac.style.opacity = String(o);
        popIn(el.facPhoto, u, 38.6, { dy: 40, s0: 0.6 });
        popIn(el.facKicker, u, 39.4, { dy: 40, s0: 0.95 });
        popIn(el.facName, u, 39.8, { dy: 50, s0: 0.9 });
        popIn(el.bio1, u, 40.8, { dy: 40, s0: 0.97, cfg: SPR.gentle });
        popIn(el.bio2, u, 41.8, { dy: 40, s0: 0.97, cfg: SPR.gentle });
      }
      // registration (47 - 53)
      const regOn = u > 46.8 && u < 53.4;
      show(el.sReg, regOn);
      if (regOn) {
        popIn(el.gK, u, 47.2, { dy: 40, s0: 0.95, out: 52.4 });
        popIn(el.gD, u, 47.5, { dy: 60, s0: 0.6, out: 52.5 });
        el.gR.dataset.base = el.gL.dataset.base = 'translateX(-50%)';
        popIn(el.gR, u, 48.6, { dy: 70, s0: 0.7, out: 52.6 });
        popIn(el.gL, u, 49.6, { dy: 70, s0: 0.7, out: 52.7 });
        el.gL.querySelector('svg').style.transform = `translateY(${(-10 * Math.abs(Math.sin(u * TAU * 0.5))).toFixed(1)}px)`;
      }
      // end card (53 - 60)
      const endOn = u > 52.8;
      show(el.sEnd, endOn);
      if (endOn) {
        el.logoZ.querySelector('.lstroke').style.strokeDasharray = '1';
        el.logoZ.querySelector('.lstroke').style.strokeDashoffset = String(1 - E.outCubic(prog(u, 53, 55.2)));
        el.logoZ.querySelectorAll('.ld').forEach((d, i) => { d.style.transform = `scale(${sp(u, 53.9 + i * 0.45, SPR.pop).toFixed(4)})`; });
        words(el.z1, u, 55.6, 0.2);
        words(el.z2, u, 56.4, 0.16);
      }
    }
  }

  // ------------------------------------------------------------------ hits (sound on picture)
  function hits() {
    const H = [];
    const add = (u, label, sfx, o) => H.push([u, label, sfx, o]);
    [0.3, 0.7, 1.1].forEach((u, i) => add(u, `school bell ${i + 1}`, 'bell', { pitch: i % 2 ? 'A5' : 'D6', gain: 0.24 }));
    add(1.2, 'kids run out', 'whoosh', { len: 0.5, from: 400, to: 1800, gain: 0.12 });
    add(1.5, 'caption 1', 'blip', { pitch: 'A5', gain: 0.1 });
    add(3.4, 'caption 2', 'blip', { pitch: 'D6', gain: 0.1 });
    BALLERS.slice(1).forEach((k, i) => add(PASS0 + (i + 1) * PASS, `catch ${i + 1}`, 'tok', { pitch: ['D5', 'F#5', 'A5'][i % 3], gain: 0.16 }));
    add(9.2, 'small step', 'tick', { gain: 0.14 });
    add(11.6, 'iris', 'whoosh', { len: 0.6, from: 400, to: 2400, gain: 0.16 });
    add(12.2, 'into the room', 'swell', { len: 0.8, gain: 0.1 });
    add(15.7, 'he sits', 'pop', { pitch: 'A5', gain: 0.22 });
    add(16.2, 'friends wave', 'blip', { pitch: 'E6', gain: 0.12 });
    add(16.4, 'line 1', 'blip', { pitch: 'A5', gain: 0.1 });
    add(18.1, 'line 2', 'blip', { pitch: 'D6', gain: 0.1 });
    add(21.6, 'panel rises', 'whoosh', { len: 0.5, from: 300, to: 1600, gain: 0.14 });
    PILLS.forEach((_, i) => add(23.4 + i * 1.5, `pill ${i + 1}`, 'pop', { pitch: ['D5', 'F#5', 'A5', 'D6'][i], gain: 0.2 }));
    add(31, 'cards title', 'blip', { pitch: 'A5', gain: 0.1 });
    CARDS.forEach((_, i) => add(31.8 + i * 0.75, `card ${i + 1}`, 'pop', { pitch: ['F#5', 'A5', 'B5', 'D6'][i], gain: 0.18 }));
    add(38.6, 'photo', 'pop', { pitch: 'D5', gain: 0.22 });
    add(39.8, 'name', 'blip', { pitch: 'A5', gain: 0.12 });
    add(47.5, 'date', 'thud', { pitch: 140, to: 60, gain: 0.18 });
    add(48.6, 'registration', 'pop', { pitch: 'F#5', gain: 0.2 });
    add(49.6, 'link in bio', 'bell', { pitch: 'A6', gain: 0.18 });
    add(52.8, 'to the end card', 'swell', { len: 0.9, gain: 0.12 });
    LOGO_DOTS.forEach((d, i) => add(53.9 + i * 0.45, `end dot ${i + 1}`, 'pop', { pitch: ['D5', 'F#5', 'A5', 'B5', 'D6'][i], gain: 0.2 }));
    add(55.6, 'end line', 'bell', { pitch: 'D6', gain: 0.2 });
    return H.sort((a, b) => a[0] - b[0]);
  }

  // ------------------------------------------------------------------ boot
  let ready = null;
  async function boot() {
    await Promise.all(['400 20px Rubik', '700 20px Rubik', '500 20px Rubik', '600 20px Rubik'].map((f) => document.fonts.load(f, 'אבג Abc 123')));
    await document.fonts.ready;
    await el.facPhoto.querySelector('img').decode().catch(() => {});
    window.HITS = hits();
    if (PREVIEW) document.body.classList.add('preview');
    fit();
    apply(U(0));
  }
  function fit() {
    if (RENDER) { stage.style.transform = 'none'; return; }
    const sc = Math.min(innerWidth / SW, (innerHeight - (PREVIEW ? 54 : 0)) / SH);
    stage.style.transform = `translate(${(innerWidth - SW * sc) / 2}px, ${(innerHeight - (PREVIEW ? 54 : 0) - SH * sc) / 2}px) scale(${sc})`;
  }
  addEventListener('resize', fit);

  window.DURATION = DURATION;
  window.seek = async (t) => { await ready; apply(U(clamp(t, 0, DURATION))); };
  ready = boot().then(() => { window.filmReady = true; });

  if (PREVIEW) {
    const h = document.createElement('div');
    h.id = 'harness';
    h.innerHTML = `<button id="pp">play</button><input id="scrub" type="range" min="0" max="${DURATION}" step="0.0167" value="0"><span id="tc">0.00</span>`;
    document.body.appendChild(h);
    let playing = false, t0 = 0, start = 0;
    const scrub = h.querySelector('#scrub'), tc = h.querySelector('#tc'), pp = h.querySelector('#pp');
    const showT = (t) => { scrub.value = t; tc.textContent = t.toFixed(2); window.seek(t); };
    const loop = (now) => { if (!playing) return; showT((t0 + (now - start) / 1000) % DURATION); requestAnimationFrame(loop); };
    pp.onclick = () => { playing = !playing; pp.textContent = playing ? 'pause' : 'play'; if (playing) { t0 = +scrub.value; start = performance.now(); requestAnimationFrame(loop); } };
    scrub.oninput = () => { playing = false; pp.textContent = 'play'; showT(+scrub.value); };
  }
})();
