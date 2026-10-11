// מרכז דיאלוג · "קבוצת חברים" v2: an illustrated reel that is a pure function of time.
// Style follows the illustration spec in the motion-studio skill: flat children's-book illustration,
// one dark outline colour, brand fills (light/mid/dark), static grain, labels in an HTML layer,
// camera = transform on the root group on closed-form springs. window.seek(t) sets everything from t.
/* global GRID */

(() => {
  const PARAMS = new URLSearchParams(location.search);
  const RENDER = PARAMS.get('render') === '1';
  const PREVIEW = PARAMS.get('preview') === '1';
  const DURATION = 37.5;
  const SW = 1080, SH = 1920;

  // ------------------------------------------------------------------ palette
  const L = '#4E4B5D';             // the one outline colour (the logo's ink)
  const LW = 4.5;                  // outline width in screen px
  const PAPER = '#FCF6EC';
  const C = {
    coral: { l: '#FDE0D6', m: '#F7987D', d: '#DE7458' },
    blue: { l: '#E2F1FB', m: '#90C6E9', d: '#5E9FCC' },
    green: { l: '#E5F2DC', m: '#C0DFAE', d: '#8DBE76' },
    yellow: { l: '#FFF5CF', m: '#FFE98A', d: '#E9C949' },
    grey: { l: '#E9EBF1', m: '#A2ABBD', d: '#7D879C' },
  };
  const NS = 'vector-effect="non-scaling-stroke"';
  const ol = (w = LW) => `stroke="${L}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" ${NS}`;

  // ------------------------------------------------------------------ math
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  const outCubic = (t) => 1 - (1 - t) ** 3;
  function spring(t, { stiffness = 170, damping = 18, mass = 1 } = {}) {
    if (t <= 0) return 0;
    const w0 = Math.sqrt(stiffness / mass), z = damping / (2 * Math.sqrt(stiffness * mass));
    if (z < 1) {
      const wd = w0 * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
    }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }
  const SPR = { pop: { stiffness: 260, damping: 17 }, ui: { stiffness: 300, damping: 26 }, cam: { stiffness: 14, damping: 7.5 } };
  const sp = (t, t0, cfg = SPR.ui) => spring(t - t0, cfg);
  const f1 = (n) => n.toFixed(1), f2 = (n) => n.toFixed(2);

  // ------------------------------------------------------------------ blobs: merged circles with one clean outline
  const blob = (circles, fill, w = LW) =>
    `<g>${circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + w / 2}" fill="${L}"/>`).join('')}${circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - w / 2}" fill="${fill}"/>`).join('')}</g>`;

  // ------------------------------------------------------------------ kids (age ~9: long legs, head about 1/4.5 of height)
  const KIDS = {
    hero: { skin: '#F3CDB0', hair: 'short', hc: '#6B4430', shirt: C.coral.m, shirtD: C.coral.d, low: 'shorts', pants: C.blue.d, shoe: '#FFFFFF', bag: true },
    a: { skin: '#D9A27C', hair: 'curly', hc: '#3A2A24', shirt: C.blue.m, shirtD: C.blue.d, low: 'pants', pants: C.grey.d, shoe: C.coral.d },
    g: { skin: '#F4D3BA', hair: 'pony', hc: '#C27B45', shirt: C.green.m, shirtD: C.green.d, low: 'skirt', pants: C.yellow.m, shoe: C.blue.d },
    b: { skin: '#C68B66', hair: 'braids', hc: '#2A2020', shirt: C.yellow.m, shirtD: C.yellow.d, low: 'shorts', pants: C.blue.d, shoe: C.coral.m },
    c: { skin: '#EEC3A2', hair: 'spiky', hc: '#7A5238', shirt: C.grey.m, shirtD: C.grey.d, low: 'shorts', pants: C.green.d, shoe: C.yellow.m },
    d: { skin: '#E4B48F', hair: 'short', hc: '#2E2420', shirt: C.green.d, shirtD: '#6FA05A', low: 'pants', pants: C.blue.d, shoe: '#FFFFFF', stripes: C.green.l },
    e: { skin: '#F6D8C2', hair: 'long', hc: '#4A3226', shirt: C.blue.m, shirtD: C.blue.d, low: 'skirt', pants: C.grey.m, shoe: C.coral.d, stripes: '#FFFFFF' },
    f: { skin: '#CF9874', hair: 'short', hc: '#1F1A18', shirt: C.yellow.m, shirtD: C.yellow.d, low: 'shorts', pants: C.grey.d, shoe: C.blue.m },
  };
  const HAIR = {
    short: (c, w) => `<path d="M-31,4 C-35,-28 -12,-40 6,-37 C26,-34 36,-18 31,4 C29,-8 24,-14 16,-15 C8,-10 -6,-10 -14,-15 C-22,-14 -28,-8 -31,4 Z" fill="${c}" stroke="${L}" stroke-width="${w}" stroke-linejoin="round"/>`,
    spiky: (c, w) => `<path d="M-31,2 L-30,-18 L-22,-14 L-20,-32 L-10,-24 L-2,-40 L6,-26 L16,-36 L18,-22 L28,-26 L31,2 C26,-10 18,-14 0,-14 C-18,-14 -26,-10 -31,2 Z" fill="${c}" stroke="${L}" stroke-width="${w}" stroke-linejoin="round"/>`,
    pony: (c, w) => `<path d="M-31,2 C-34,-30 -10,-40 6,-37 C26,-34 35,-18 31,2 C24,-14 10,-18 -2,-16 C-14,-14 -26,-10 -31,2 Z" fill="${c}" stroke="${L}" stroke-width="${w}" stroke-linejoin="round"/><circle cx="27" cy="-21" r="5" fill="${C.coral.m}" stroke="${L}" stroke-width="${w * 0.7}"/>`,
    long: (c, w) => `<path d="M-31,6 C-35,-28 -12,-40 4,-37 C26,-34 36,-16 31,6 C27,-10 16,-18 2,-12 C-10,-18 -26,-12 -31,6 Z" fill="${c}" stroke="${L}" stroke-width="${w}" stroke-linejoin="round"/>`,
    braids: (c, w) => HAIR.pony(c, w).split('<circle')[0],
    curly: (c, w) => blob([[-22, -14, 14], [-8, -26, 15], [10, -26, 15], [24, -14, 13], [-29, 0, 9], [30, 0, 9], [0, -30, 12]], c, w),
  };
  const HAIR_BACK = {
    long: (c, w) => `<path d="M-33,-4 C-38,30 -36,54 -28,64 L28,64 C36,54 38,30 33,-4 Z" fill="${c}" stroke="${L}" stroke-width="${w}" stroke-linejoin="round"/>`,
    pony: (c, w) => `<path d="M26,-22 C50,-26 56,8 42,30 C40,10 36,-4 22,-10 Z" fill="${c}" stroke="${L}" stroke-width="${w}" stroke-linejoin="round"/>`,
    braids: (c, w) => [-1, 1].map((sx) => `${limb([[sx * 26, 0], [sx * 30, 24], [sx * 28, 46]], 11, c, w)}<circle cx="${sx * 28}" cy="50" r="5" fill="${C.coral.m}" stroke="${L}" stroke-width="${w * 0.7}"/>`).join(''),
  };
  function chain(x, y, a1, l1, a2rel, l2) {
    const x1 = x + Math.sin(a1 * RAD) * l1, y1 = y + Math.cos(a1 * RAD) * l1, a2 = a1 + a2rel;
    return [[x, y], [x1, y1], [x1 + Math.sin(a2 * RAD) * l2, y1 + Math.cos(a2 * RAD) * l2]];
  }
  const pd = (pts) => 'M' + pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' L');
  function limb(pts, w, color, lw) {
    const d = pd(pts);
    return `<path d="${d}" fill="none" stroke="${L}" stroke-width="${w + 2 * lw}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const part = (pts, t) => [pts[0], [lerp(pts[0][0], pts[1][0], t), lerp(pts[0][1], pts[1][1], t)]];

  // P: x, y (feet), s (scale), flip, legs [[thigh, knee] x2], arms [[upper, elbow] x2], tilt, look, mouth, lift, brow
  function kid(id, o, P) {
    const s = P.s, w = LW / s;              // keep the outline the same width on screen at every depth
    const legs = P.legs || [[4, 0], [-4, 0]], arms = P.arms || [[-12, 8], [12, -8]];
    const hipY = -100 - (P.lift || 0) * 0;
    const L1 = chain(-12, hipY, legs[0][0], 50, legs[0][1], 48), L2 = chain(12, hipY, legs[1][0], 50, legs[1][1], 48);
    const A1 = chain(-25, -176, arms[0][0], 40, arms[0][1], 38), A2 = chain(25, -176, arms[1][0], 40, arms[1][1], 38);
    const leg = (pts) => {
      const foot = pts[2];
      const lower = o.low === 'pants' ? limb(pts, 21, o.pants, w) : limb(pts, 17, o.skin, w) + (o.low === 'shorts' ? limb(part(pts, 0.95), 23, o.pants, w) : '');
      return `${lower}<ellipse cx="${f1(foot[0] + 3)}" cy="${f1(foot[1] + 3)}" rx="15" ry="9" fill="${o.shoe}" stroke="${L}" stroke-width="${w}"/>
        <path d="M${f1(foot[0] - 11)},${f1(foot[1] + 7)} L${f1(foot[0] + 17)},${f1(foot[1] + 7)}" stroke="${L}" stroke-width="${w * 0.6}" stroke-linecap="round"/>`;
    };
    const arm = (pts) => `${limb(pts, 15, o.skin, w)}${limb(part(pts, 0.62), 19, o.shirt, w)}<circle cx="${f1(pts[2][0])}" cy="${f1(pts[2][1])}" r="8.5" fill="${o.skin}" stroke="${L}" stroke-width="${w}"/>`;
    const torsoD = 'M-30,-170 Q-30,-186 -14,-186 L14,-186 Q30,-186 30,-170 L28,-106 Q28,-96 18,-96 L-18,-96 Q-28,-96 -28,-106 Z';
    const stripes = o.stripes ? `<clipPath id="cl_${id}"><path d="${torsoD}"/></clipPath><g clip-path="url(#cl_${id})">${[-160, -140, -120].map((y) => `<rect x="-32" y="${y}" width="64" height="8" fill="${o.stripes}"/>`).join('')}</g>` : '';
    const skirt = o.low === 'skirt' ? `<path d="M-28,-108 L28,-108 L38,-64 Q0,-56 -38,-64 Z" fill="${o.pants}" stroke="${L}" stroke-width="${w}" stroke-linejoin="round"/>` : '';
    const lx = P.look || 0, tilt = P.tilt || 0;
    const mouth = P.mouth === 'open'
      ? `<path d="M-9,13 Q0,27 9,13 Z" fill="#8A3F3A" stroke="${L}" stroke-width="${w * 0.8}" stroke-linejoin="round"/>`
      : `<path d="M-8,14 Q0,22 8,14" fill="none" stroke="${L}" stroke-width="${w * 0.8}" stroke-linecap="round"/>`;
    const browY = -10 - (P.brow || 0);
    const headBack = HAIR_BACK[o.hair] ? HAIR_BACK[o.hair](o.hc, w) : '';
    const head = `<rect x="-8" y="16" width="16" height="24" rx="6" fill="${o.skin}" stroke="${L}" stroke-width="${w}"/>
      <circle cx="-29" cy="4" r="7" fill="${o.skin}" stroke="${L}" stroke-width="${w}"/><circle cx="29" cy="4" r="7" fill="${o.skin}" stroke="${L}" stroke-width="${w}"/>
      <circle cx="0" cy="0" r="30" fill="${o.skin}" stroke="${L}" stroke-width="${w}"/>
      ${HAIR[o.hair](o.hc, w)}
      <g transform="translate(${f2(lx)},0)">
        <ellipse cx="-11" cy="3" rx="3.6" ry="4.4" fill="${L}"/><ellipse cx="11" cy="3" rx="3.6" ry="4.4" fill="${L}"/>
        <circle cx="-9.8" cy="1.6" r="1.3" fill="#fff"/><circle cx="12.2" cy="1.6" r="1.3" fill="#fff"/>
      </g>
      <path d="M-16,${browY} Q-11,${browY - 3} -6,${browY}" fill="none" stroke="${L}" stroke-width="${w * 0.7}" stroke-linecap="round"/>
      <path d="M6,${browY} Q11,${browY - 3} 16,${browY}" fill="none" stroke="${L}" stroke-width="${w * 0.7}" stroke-linecap="round"/>
      <path d="M-2,9 Q0,11 2,9" fill="none" stroke="${L}" stroke-width="${w * 0.6}" stroke-linecap="round"/>
      ${mouth}
      <ellipse cx="-19" cy="12" rx="5.5" ry="3.4" fill="${C.coral.m}" opacity=".45"/><ellipse cx="19" cy="12" rx="5.5" ry="3.4" fill="${C.coral.m}" opacity=".45"/>`;
    const bag = o.bag ? `<rect x="-38" y="-182" width="76" height="74" rx="16" fill="${C.blue.m}" stroke="${L}" stroke-width="${w}"/>` : '';
    const straps = o.bag ? `${limb([[-17, -185], [-20, -150], [-20, -126]], 7, C.blue.d, w * 0.7)}${limb([[17, -185], [20, -150], [20, -126]], 7, C.blue.d, w * 0.7)}` : '';
    const hx = 0, hy = -224;
    const body = `
      <ellipse cx="0" cy="${f1(4 + (P.lift || 0))}" rx="${f1(46 - (P.lift || 0) * 0.5)}" ry="8" fill="${L}" opacity=".12"/>
      <g transform="translate(0,${f1(-(P.lift || 0))})">
        <g transform="translate(${hx},${hy}) rotate(${f2(tilt)})">${headBack}</g>
        ${bag}${leg(L1)}${leg(L2)}${skirt}
        ${P.armsBehind ? arm(A1) + arm(A2) : ''}
        <path d="${torsoD}" fill="${o.shirt}"/>${stripes}
        <path d="M14,-185 Q30,-185 30,-170 L28,-106 Q28,-96 18,-96 L13,-96 Q21,-140 14,-185 Z" fill="${o.shirtD}" opacity=".55"/>
        <path d="${torsoD}" fill="none" stroke="${L}" stroke-width="${w}" stroke-linejoin="round"/>
        <path d="M-10,-186 Q0,-176 10,-186" fill="none" stroke="${L}" stroke-width="${w * 0.7}" stroke-linecap="round"/>
        ${straps}
        ${P.armsBehind ? '' : arm(A1) + arm(A2)}
        <g transform="translate(${hx},${hy}) rotate(${f2(tilt)})">${head}</g>
        ${P.extra || ''}
      </g>`;
    return `<g transform="translate(${f1(P.x)},${f1(P.y)}) scale(${f2((P.flip ? -1 : 1) * s)},${f2(s)})">${body}</g>`;
  }
  const depth = (y) => 0.95 + ((y - 1095) / 400) * 0.35;

  // ------------------------------------------------------------------ poses
  const run = (ph, amp = 1) => ({
    legs: [[24 * amp * Math.sin(ph), -26 * amp * Math.max(0, Math.sin(ph))], [-24 * amp * Math.sin(ph), -26 * amp * Math.max(0, -Math.sin(ph))]],
    arms: [[-20 - 16 * amp * Math.sin(ph), 30], [20 - 16 * amp * Math.sin(ph), -30]],
    bob: Math.abs(Math.sin(ph)) * 12 * amp,
  });
  const stand = (t, k = 0) => ({ legs: [[4, 0], [-4, 0]], arms: [[-12 + 3 * Math.sin(t * 2 + k), 8], [12 - 3 * Math.sin(t * 2 + k), -8]], bob: Math.sin(t * 3 + k) * 1.2 });

  // ------------------------------------------------------------------ scenery (static, built once)
  const scenery = `
    <rect x="-400" y="-400" width="1880" height="1520" fill="${C.blue.l}"/>
    <g id="clouds">
      <g class="cloud" data-v="6">${blob([[690, 540, 24], [722, 526, 32], [760, 540, 24], [726, 552, 20]], '#FFFFFF')}</g>
    </g>
    <g id="sun" transform="translate(950,620)">
      <g id="rays">${Array.from({ length: 10 }, (_, i) => `<path d="M0,-66 L0,-84" transform="rotate(${i * 36})" ${ol(5)} fill="none"/>`).join('')}</g>
      <circle r="50" fill="${C.yellow.m}" ${ol()}/><circle cx="12" cy="-12" r="16" fill="${C.yellow.l}" opacity=".7"/>
    </g>
    <!-- bell tower -->
    <rect x="482" y="548" width="116" height="120" rx="12" fill="${C.green.l}" ${ol()}/>
    <path d="M504,668 L504,590 A36,36 0 0 1 576,590 L576,668 Z" fill="${C.grey.m}" ${ol()}/>
    <path d="M466,556 L540,494 L614,556 Z" fill="${C.green.m}" ${ol()}/>
    <circle cx="540" cy="494" r="8" fill="${C.yellow.m}" ${ol()}/>
    <!-- building -->
    <path d="M170,1080 L170,750 L910,750 L910,1080 Z" fill="${C.coral.l}" ${ol()}/>
    <path d="M170,1040 L910,1040 L910,1080 L170,1080 Z" fill="${C.coral.m}" opacity=".35"/>
    <path d="M128,760 L540,620 L952,760 Z" fill="${C.coral.m}" ${ol()}/>
    <path d="M128,760 L952,760" ${ol(14)} stroke="${C.coral.d}"/><path d="M128,760 L540,620 L952,760 Z" fill="none" ${ol()}/>
    <circle cx="540" cy="700" r="26" fill="${C.yellow.l}" ${ol()}/><path d="M540,700 L540,684 M540,700 L552,708" ${ol(4)} fill="none"/>
    ${[[220, 800], [350, 800], [640, 800], [770, 800], [220, 930], [770, 930]].map(([x, y]) => `
      <rect x="${x}" y="${y}" width="96" height="96" rx="16" fill="${C.blue.l}" ${ol()}/>
      <path d="M${x + 48},${y + 4} L${x + 48},${y + 92} M${x + 4},${y + 48} L${x + 92},${y + 48}" stroke="#fff" stroke-width="7" fill="none"/>
      <path d="M${x + 14},${y + 22} L${x + 30},${y + 12}" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9"/>
      <rect x="${x - 8}" y="${y + 92}" width="112" height="14" rx="7" fill="${C.coral.d}" ${ol()}/>`).join('')}
    ${[[220, 1036], [770, 1036]].map(([x, y]) => `<rect x="${x - 2}" y="${y}" width="100" height="22" rx="8" fill="${C.green.d}" ${ol()}/>
      ${[10, 34, 58, 82].map((dx, i) => `<circle cx="${x + dx}" cy="${y - 4}" r="9" fill="${[C.coral.m, C.yellow.m, C.coral.m, C.blue.m][i]}" ${ol(3)}/>`).join('')}`).join('')}
    <!-- door -->
    <rect x="458" y="860" width="164" height="30" rx="12" fill="${C.blue.m}" ${ol()}/>
    ${[490, 520, 550, 580].map((x, i) => `<circle cx="${x + 5}" cy="875" r="6" fill="${['#E98560', '#E5E783', '#6EB8EE', '#AFD6A5'][i]}"/>`).join('')}
    <path d="M478,1080 L478,960 A62,62 0 0 1 602,960 L602,1080 Z" fill="#5D5970" ${ol()}/>
    <g id="doorL"><path d="M478,1080 L478,960 A62,62 0 0 1 540,898 L540,1080 Z" fill="${C.coral.d}" ${ol()}/><circle cx="528" cy="1000" r="5" fill="${C.yellow.m}" ${ol(3)}/></g>
    <g id="doorR"><path d="M602,1080 L602,960 A62,62 0 0 0 540,898 L540,1080 Z" fill="${C.coral.d}" ${ol()}/><circle cx="552" cy="1000" r="5" fill="${C.yellow.m}" ${ol(3)}/></g>
    <!-- ground -->
    <rect x="-400" y="1080" width="1880" height="900" fill="${C.yellow.l}"/>
    <path d="M-400,1080 L1480,1080 L1480,1112 L-400,1112 Z" fill="${C.green.m}"/>
    <path d="M-400,1080 L1480,1080 M-400,1112 L1480,1112" ${ol()} fill="none"/>
    <rect x="452" y="1076" width="176" height="22" rx="9" fill="${C.grey.l}" ${ol()}/>
    ${[[250, 1084, 1], [340, 1088, 0.8], [740, 1088, 0.8], [840, 1084, 1]].map(([x, y, k]) => blob([[x - 30 * k, y, 22 * k], [x, y - 14 * k, 28 * k], [x + 30 * k, y, 22 * k]], C.green.m)).join('')}
    <!-- tree -->
    <path d="M86,1110 C92,1020 92,940 98,860 L124,860 C128,940 132,1020 140,1110 Z" fill="#C49272" ${ol()}/>
    <path d="M112,930 C130,910 146,906 160,900" ${ol()} fill="none"/>
    ${blob([[60, 820, 62], [120, 770, 74], [180, 820, 60], [110, 860, 56], [30, 880, 40], [200, 880, 40]], C.green.m)}
    <path d="M150,800 C178,812 190,840 186,866" stroke="${C.green.d}" stroke-width="10" stroke-linecap="round" fill="none"/>
    ${[[80, 800], [150, 760], [70, 870], [180, 870]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8" fill="${C.coral.m}" ${ol(3)}/>`).join('')}
    <!-- yard details -->
    <g fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round">
      ${[[370, 1400], [370, 1330], [330, 1260], [410, 1260]].map(([x, y]) => `<rect x="${x}" y="${y}" width="76" height="66" rx="8"/>`).join('')}
    </g>
    <ellipse cx="640" cy="1390" rx="190" ry="54" fill="none" stroke="#fff" stroke-width="7" opacity=".9"/>
    ${[[60, 1300], [1000, 1460], [260, 1470], [700, 1200]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="14" ry="8" fill="${C.grey.l}" ${ol(3)}/>`).join('')}

    <!-- foreground flower bed -->
    <path d="M-400,1590 C-200,1560 0,1600 200,1572 C400,1548 600,1600 800,1570 C1000,1546 1200,1590 1480,1570 L1480,2000 L-400,2000 Z" fill="${C.green.m}" ${ol()}/>
    ${[[40, 1600, 1.3], [250, 1590, 1], [520, 1610, 1.2], [790, 1590, 1], [1040, 1600, 1.3]].map(([x, y, k]) => blob([[x - 40 * k, y, 30 * k], [x, y - 22 * k, 40 * k], [x + 40 * k, y, 30 * k]], C.green.d)).join('')}
    ${[[110, 1640], [180, 1700], [330, 1660], [430, 1720], [610, 1650], [690, 1730], [880, 1660], [960, 1720], [60, 1760], [520, 1780], [800, 1790]].map(([x, y], i) => `<path d="M${x},${y + 30} L${x},${y + 6}" ${ol(4)} fill="none"/>` + blob([[x - 9, y, 9], [x + 9, y, 9], [x, y - 9, 9], [x, y + 9, 9]], [C.coral.m, C.yellow.m, C.blue.m, '#FFFFFF'][i % 4], 3) + `<circle cx="${x}" cy="${y}" r="5" fill="${C.yellow.d}"/>`).join('')}
    <!-- low wall on the right (the boy stands by it) -->
    <rect x="800" y="1150" width="320" height="140" rx="14" fill="${C.grey.l}" ${ol()}/>
    <g stroke="${C.grey.m}" stroke-width="5" stroke-linecap="round">
      ${[1190, 1230, 1270].map((y, r) => `<path d="M810,${y} L1100,${y}"/>${[0, 1, 2, 3].map((i) => `<path d="M${850 + i * 72 + (r % 2) * 36},${y - 36} L${850 + i * 72 + (r % 2) * 36},${y}"/>`).join('')}`).join('')}
    </g>
    <rect x="788" y="1136" width="344" height="30" rx="12" fill="${C.grey.m}" ${ol()}/>
  `;

  // ------------------------------------------------------------------ yard choreography (seconds)
  const DOOR = [540, 1100];
  const SPOT = {
    a: [300, 1240, 0.95], g: [690, 1250, 1.1], d: [560, 1330, 1.25], e: [700, 1420, 1.35],
    b: [190, 1400, 1.5], c: [408, 1440, 1.65], f: [130, 1180, 1.8],
  };
  const runDur = (k) => Math.hypot(SPOT[k][0] - DOOR[0], SPOT[k][1] - DOOR[1]) / 330 + 0.35;
  const HERO = [930, 1330];
  const TOSS0 = 3.0, TOSS = 1.05;   // a <-> g ball passes
  const CHASE = [610, 1385, 150, 42];

  function yardKids(t) {
    const out = [];
    const hands = {};
    for (const k of Object.keys(SPOT)) {
      const [x1, y1, t0] = SPOT[k];
      if (t < t0) continue;
      const dur = runDur(k);
      const p = ease(prog(t, t0, t0 + dur));
      let x = lerp(DOOR[0], x1, p), y = lerp(DOOR[1], y1, p) - Math.sin(Math.PI * p) * 10;
      let P;
      const arrived = t > t0 + dur;
      if (!arrived) {
        const r = run((t - t0) * TAU * 2.1);
        P = { ...r, flip: x1 < DOOR[0], look: x1 < DOOR[0] ? -2 : 2, mouth: 'open' };
        y -= r.bob;
      } else if (k === 'd' || k === 'e') {
        // chase around the circle drawn on the ground
        const ta = t - (t0 + dur);
        const base = Math.atan2((y1 - CHASE[1]) / CHASE[3], (x1 - CHASE[0]) / CHASE[2]);
        const ramp = clamp(ta / 0.6);
        const ang = base + ta * 2.0 * ramp * 0.9;
        x = CHASE[0] + Math.cos(ang) * CHASE[2]; y = CHASE[1] + Math.sin(ang) * CHASE[3];
        const r = run(t * TAU * 2.1 + (k === 'e' ? 1.3 : 0), ramp);
        P = { ...r, flip: Math.sin(ang) < 0, mouth: 'open', look: Math.sin(ang) < 0 ? -2 : 2 };
        y -= r.bob;
      } else if (k === 'a' || k === 'g') {
        // tossing the ball: arms up around each catch
        let up = 0;
        for (let i = -1; i < 8; i++) {
          const tc = TOSS0 + i * TOSS;
          const catcher = i % 2 === 0 ? 'g' : 'a';
          if (catcher === k) up = Math.max(up, Math.exp(-(((t - tc) / 0.32) ** 2)));
        }
        if (t < TOSS0 && k === 'a') up = Math.max(up, 0.5);
        const lift = 150 * up;
        P = { legs: [[6, 0], [-6, 0]], arms: [[-lift - 10, 20 * up + 10], [lift + 10, -20 * up - 10]], mouth: up > 0.4 ? 'open' : 'smile', look: k === 'a' ? 3 : -3, tilt: k === 'a' ? 4 : -4 };
        hands[k] = [x, y - 210 * depth(y) - 90 * up * depth(y)];
      } else if (k === 'b') {
        // jump rope: jump while the rope passes under the feet
        const th = (t - (t0 + dur)) * TAU * 1.5;
        const lift = 26 * Math.max(0, Math.cos(th)) ** 2;
        const s = depth(y);
        const hy = -108, hxs = 50;
        const apex = lerp(-330, 22, (Math.cos(th) + 1) / 2) + lift;
        const cy = 2 * apex - hy;
        const rope = `<path d="M${-hxs},${hy} Q0,${f1(cy)} ${hxs},${hy}" fill="none" stroke="${C.coral.d}" stroke-width="${f1(5 / s)}" stroke-linecap="round"/>`;
        P = { legs: [[8, -18 * lift / 26], [-8, 18 * lift / 26]], arms: [[-42, 44], [42, -44]], mouth: 'open', lift, extra: Math.sin(th) > 0 ? rope : '', back: Math.sin(th) <= 0 ? rope : '' };
      } else if (k === 'c') {
        // hopscotch: hop up the squares and back
        const ta = t - (t0 + dur);
        const hop = Math.floor(ta / 0.48), f = (ta / 0.48) % 1;
        const path = [[408, 1440], [408, 1370], [408, 1300], [408, 1370]];
        const p0 = path[hop % 4], p1 = path[(hop + 1) % 4];
        x = lerp(p0[0], p1[0], ease(f)); y = lerp(p0[1], p1[1], ease(f));
        const lift = Math.sin(Math.PI * f) * 30;
        P = { legs: [[4, -40 * Math.sin(Math.PI * f)], [-4, 0]], arms: [[-60, 30], [60, -30]], lift, mouth: 'open' };
      } else if (k === 'f') {
        const wave = Math.sin(t * TAU * 1.6) * 18;
        P = { ...stand(t, 2), arms: [[-8, 14], [150 + wave, -20]], mouth: 'open', look: 3, tilt: 3 };
      }
      P.x = x; P.y = y; P.s = depth(y1 === y ? y : y);
      out.push([k, P]);
    }
    return { out, hands };
  }

  // ------------------------------------------------------------------ DOM
  const ICONS_OK = typeof GRID !== 'undefined';
  const stage = document.getElementById('stage');
  const mw = (txt) => txt.split(' ').map((w) => `<span class="mask"><span class="wd">${w}</span></span>`).join(' ');
  stage.innerHTML = `
    <svg id="scene" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}">
      <g id="world">
        ${scenery}
        <g id="bell" transform="translate(540,590)">
          <path d="M0,-22 L0,-6" ${ol(4)}/>
          <path d="M-26,30 C-26,2 -16,-12 0,-12 C16,-12 26,2 26,30 Z" fill="${C.yellow.m}" ${ol()}/>
          <path d="M10,-8 C20,0 24,12 24,30 L14,30 C14,16 12,4 10,-8 Z" fill="${C.yellow.d}" opacity=".6"/>
          <rect x="-32" y="26" width="64" height="12" rx="6" fill="${C.yellow.d}" ${ol()}/>
          <g id="clapper"><circle cx="0" cy="44" r="7" fill="${C.coral.d}" ${ol(3)}/></g>
        </g>
        <g id="waves" fill="none" stroke="${C.coral.d}" stroke-width="6" stroke-linecap="round"></g>
        <g id="kids"></g>
        <g id="ballG"><circle r="20" fill="${C.coral.m}" ${ol()}/><path d="M-19,-4 Q0,-14 19,-4 M-6,-19 Q6,0 -4,19" fill="none" stroke="#fff" stroke-width="4"/></g>
      </g>
    </svg>
    <svg id="leaders" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}"></svg>
    <div id="ui">
      <div class="tl cap1" id="c1" style="top:262px">${mw('הצלצול להפסקה.')}</div>
      <div class="tl cap2" id="c2" style="top:384px">${mw('הרגע הכי ארוך ביום שלו.')}</div>
      <div class="lab" id="lab1">כולם יוצאים לשחק</div>
    </div>
    <div id="grain"></div>`;
  const $ = (id) => document.getElementById(id);
  const world = $('world'), kidsG = $('kids'), ballG = $('ballG'), bell = $('bell'), clapper = $('clapper'), wavesG = $('waves'), leaders = $('leaders');
  $('grain').style.backgroundImage = 'url(@@GRAIN@@)';
  const WAVES = [0, 1, 2].map((i) => [-1, 1].map((sx) => `<path class="wv" data-i="${i}" pathLength="1" d="M${540 + sx * (54 + i * 26)},${560 - 20 - i * 6} Q${540 + sx * (70 + i * 30)},${590} ${540 + sx * (54 + i * 26)},${620 + 20 + i * 6}"/>`).join('')).join('');
  wavesG.innerHTML = WAVES;

  // ------------------------------------------------------------------ camera
  function camera(t) {
    // a slow push-in, anchored high so the tower stays clear of the captions
    const k = sp(t, 0, SPR.cam);
    return { ax: 540, ay: 700, s: 1 + 0.05 * k, dx: 0, dy: 0 };
  }
  const toScreen = (cam, x, y) => [cam.ax + (x - cam.ax) * cam.s + cam.dx, cam.ay + (y - cam.ay) * cam.s + cam.dy];

  // ------------------------------------------------------------------ labels with a thin leader line
  function label(id, t, t0, t1, anchorWorld, boxXY, cam) {
    const el = $(id);
    const k = sp(t, t0, SPR.ui), out = 1 - ease(prog(t, t1 - 0.35, t1));
    const on = t > t0 && t < t1;
    el.style.display = on ? '' : 'none';
    if (!on) return '';
    const o = clamp(k * 1.6) * out;
    el.style.opacity = f2(o);
    el.style.transform = `translate(${f1(boxXY[0])}px, ${f1(boxXY[1] + (1 - k) * 22)}px)`;
    const [ax, ay] = toScreen(cam, ...anchorWorld);
    const sx = boxXY[0] + el.offsetWidth / 2, sy = boxXY[1] + el.offsetHeight + 6 + (1 - k) * 22;
    const len = prog(t, t0 + 0.1, t0 + 0.5);
    const ex = lerp(sx, ax, ease(len)), ey = lerp(sy, ay, ease(len));
    return `<g opacity="${f2(o)}"><path d="M${f1(sx)},${f1(sy)} L${f1(ex)},${f1(ey)}" stroke="${L}" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round" fill="none"/>
      <circle cx="${f1(ex)}" cy="${f1(ey)}" r="${f1(8 * ease(len))}" fill="${C.coral.m}" stroke="${L}" stroke-width="3"/></g>`;
  }
  const words = (node, t, t0, step = 0.13) => node.querySelectorAll('.wd').forEach((w, i) => {
    const k = sp(t, t0 + i * step, SPR.pop);
    w.style.transform = `translateY(${f1((1 - k) * 120)}%)`;
  });

  // ------------------------------------------------------------------ the frame
  function apply(t) {
    const cam = camera(t);
    world.setAttribute('transform', `translate(${f2(cam.ax + cam.dx)},${f2(cam.ay + cam.dy)}) scale(${cam.s.toFixed(4)}) translate(${-cam.ax},${-cam.ay})`);

    // clouds drift, sun turns
    world.querySelectorAll('.cloud').forEach((c) => c.setAttribute('transform', `translate(${f1(t * +c.dataset.v)},0)`));
    $('rays').setAttribute('transform', `rotate(${f1(t * 12)})`);

    // the bell rings three times
    const env = Math.exp(-Math.max(0, t - 0.15) * 1.3) * (t > 0.15 ? 1 : 0);
    bell.setAttribute('transform', `translate(540,568) rotate(${f2(24 * Math.sin((t - 0.15) * TAU * 2.6) * env)})`);
    clapper.setAttribute('transform', `rotate(${f2(-14 * Math.sin((t - 0.25) * TAU * 2.6) * env)})`);
    wavesG.querySelectorAll('.wv').forEach((p) => {
      const i = +p.dataset.i;
      const d = t - (0.2 + i * 0.12);
      const pulse = (d % 0.55 + 0.55) % 0.55, n = Math.floor(d / 0.55);
      const on = d > 0 && n < 3;
      p.style.display = on ? '' : 'none';
      if (!on) return;
      p.setAttribute('stroke-dasharray', '1 1');
      p.setAttribute('stroke-dashoffset', f2(1 - outCubic(prog(pulse, 0, 0.25))));
      p.setAttribute('opacity', f2(1 - prog(pulse, 0.3, 0.55)));
    });

    // the doors open as the kids come out
    const dOpen = sp(t, 0.55, SPR.ui);
    $('doorL').setAttribute('transform', `translate(478,0) scale(${f2(1 - 0.82 * dOpen)},1) translate(-478,0)`);
    $('doorR').setAttribute('transform', `translate(602,0) scale(${f2(1 - 0.82 * dOpen)},1) translate(-602,0)`);

    // kids
    const { out, hands } = yardKids(t);
    // the boy by the wall: curious, following the ball with his eyes
    const ballX = ballPos(t, hands)?.[0] ?? 500;
    const look = clamp((ballX - HERO[0]) / 140, -1, 1) * 4;
    out.push(['hero', { ...stand(t, 1), x: HERO[0], y: HERO[1], s: depth(HERO[1]) * 1.03,
      arms: [[-6, 28], [6, -28]], look, tilt: look * 1.2, brow: 2, mouth: 'smile' }]);
    out.sort((p, q) => p[1].y - q[1].y);
    kidsG.innerHTML = out.map(([k, P]) => (P.back ? `<g transform="translate(${f1(P.x)},${f1(P.y - (P.lift || 0) * P.s)}) scale(${f2(P.s)})">${P.back}</g>` : '') + kid(k, KIDS[k], P)).join('');

    // ball
    const bp = ballPos(t, hands);
    ballG.style.display = bp ? '' : 'none';
    if (bp) ballG.setAttribute('transform', `translate(${f1(bp[0])},${f1(bp[1])}) rotate(${f1(t * 300)}) scale(${f2(depth(1250))})`);

    // captions (hook)
    words($('c1'), t, 0.85);
    words($('c2'), t, 2.0);

    // label: everyone goes out to play
    leaders.innerHTML = label('lab1', t, 1.35, 3.6, [540, 1050], [96, 520], cam);
  }
  function ballPos(t, hands) {
    if (!hands.a || !hands.g) return hands.a ? [hands.a[0] + 26, hands.a[1] - 10] : null;
    if (t < TOSS0) return [hands.a[0] + 26, hands.a[1] - 10];
    const i = Math.floor((t - TOSS0) / TOSS), f = ((t - TOSS0) / TOSS) % 1;
    const [p, q] = i % 2 === 0 ? [hands.a, hands.g] : [hands.g, hands.a];
    return [lerp(p[0], q[0], f), lerp(p[1], q[1], f) - Math.sin(Math.PI * f) * 190];
  }

  // ------------------------------------------------------------------ boot + harness
  let ready = null;
  async function boot() {
    await Promise.all(['700 20px Rubik', '800 20px Rubik'].map((f) => document.fonts.load(f, 'אבג Abc 123')));
    await document.fonts.ready;
    if (PREVIEW) document.body.classList.add('preview');
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
  window.HITS = [];
  window.seek = async (t) => { await ready; apply(clamp(t, 0, DURATION)); };
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
