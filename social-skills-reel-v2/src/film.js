// מרכז דיאלוג · "קבוצת חברים" v2, scene 1 (15 s): the schoolyard, acted with the 12 principles.
// Pure function of time: window.seek(t) rebuilds every pose from t. No timers, no state between frames.
// Acting is keyframed with custom cubic-bezier curves (slow in / slow out, anticipation, overshoot),
// paths are curves (arcs), bodies squash and stretch, heads and hair lag behind the body (follow-through).
/* global GRID */

(() => {
  const PARAMS = new URLSearchParams(location.search);
  const RENDER = PARAMS.get('render') === '1';
  const PREVIEW = PARAMS.get('preview') === '1' || PARAMS.get('play') === '1' || window.AUTOPLAY === true;
  const DURATION = 15;
  const SW = 1080, SH = 1920;

  // ------------------------------------------------------------------ palette
  const L = '#4E4B5D';
  const LW = 4.5;
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
  const f1 = (n) => n.toFixed(1), f2 = (n) => n.toFixed(2), f3 = (n) => n.toFixed(3);
  // cubic-bezier easing, solved with Newton steps (same curves as CSS)
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
  const EZ = {
    io: cb(0.65, 0, 0.35, 1),          // slow in, slow out
    out: cb(0.16, 1, 0.3, 1),          // fast start, long settle
    in: cb(0.55, 0, 0.9, 0.45),        // gravity: accelerate into contact
    up: cb(0.1, 0.7, 0.4, 1),          // launch: decelerate to the apex
    over: cb(0.34, 1.56, 0.64, 1),     // overshoot then settle
    anti: cb(0.6, -0.4, 0.7, 1),       // pull back before going
    run: cb(0.45, 0.05, 0.25, 1),      // accelerate off the mark, ease into the stop
  };
  // keyframes: [[time, value, easeIntoThisKey], ...]; values may be numbers or nested arrays
  const mix = (a, b, e) => (Array.isArray(a) ? a.map((v, i) => mix(v, b[i], e)) : a + (b - a) * e);
  function kf(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, v0] = keys[i], [t1, v1, e = EZ.io] = keys[i + 1];
      if (t <= t1) return mix(v0, v1, e(prog(t, t0, t1)));
    }
    return keys[keys.length - 1][1];
  }
  function spring(t, { stiffness = 170, damping = 18, mass = 1 } = {}) {
    if (t <= 0) return 0;
    const w0 = Math.sqrt(stiffness / mass), z = damping / (2 * Math.sqrt(stiffness * mass));
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  const SPR = { pop: { stiffness: 260, damping: 17 }, ui: { stiffness: 300, damping: 26 }, door: { stiffness: 220, damping: 11 } };
  const sp = (t, t0, cfg = SPR.ui) => spring(t - t0, cfg);
  // a decaying wobble after an event (follow-through / settle)
  const wob = (t, t0, amp, freq = 9, decay = 5) => (t < t0 ? 0 : amp * Math.exp(-(t - t0) * decay) * Math.sin((t - t0) * TAU * freq / 2));
  const bump = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
  const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

  // ------------------------------------------------------------------ soft volume: radial gradients per fill
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k)));
    return '#' + ch.map((c) => c.toString(16).padStart(2, '0')).join('');
  };
  const GRADS = new Map();
  const vol = (hex) => {
    if (!GRADS.has(hex)) GRADS.set(hex, `<radialGradient id="v${hex.slice(1)}" cx="38%" cy="30%" r="78%"><stop offset="0" stop-color="${shade(hex, 0.32)}"/><stop offset=".55" stop-color="${hex}"/><stop offset="1" stop-color="${shade(hex, -0.14)}"/></radialGradient>`);
    return `url(#v${hex.slice(1)})`;
  };

  const blob = (circles, fill, w = LW) =>
    `<g>${circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + w / 2}" fill="${L}"/>`).join('')}${circles.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - w / 2}" fill="${fill}"/>`).join('')}</g>`;

  // ------------------------------------------------------------------ characters (round, big expressive eyes)
  const KIDS = {
    hero: { skin: '#F3CDB0', hair: 'short', hc: '#6B4430', shirt: C.coral.m, low: 'shorts', pants: C.blue.d, shoe: '#FFFFFF', bag: true },
    a: { skin: '#D9A27C', hair: 'curly', hc: '#3A2A24', shirt: C.blue.m, low: 'pants', pants: C.grey.d, shoe: C.coral.d },
    g: { skin: '#F4D3BA', hair: 'pony', hc: '#C27B45', shirt: C.green.m, low: 'skirt', pants: C.yellow.m, shoe: C.blue.d },
    b: { skin: '#C68B66', hair: 'braids', hc: '#2A2020', shirt: C.yellow.m, low: 'shorts', pants: C.blue.d, shoe: C.coral.m },
    c: { skin: '#EEC3A2', hair: 'spiky', hc: '#7A5238', shirt: C.grey.m, low: 'shorts', pants: C.green.d, shoe: C.yellow.m },
    d: { skin: '#E4B48F', hair: 'short', hc: '#2E2420', shirt: C.green.d, low: 'pants', pants: C.blue.d, shoe: '#FFFFFF', stripes: C.green.l },
    e: { skin: '#F6D8C2', hair: 'long', hc: '#4A3226', shirt: C.blue.m, low: 'skirt', pants: C.grey.m, shoe: C.coral.d, stripes: '#FFFFFF' },
    f: { skin: '#CF9874', hair: 'short', hc: '#1F1A18', shirt: C.yellow.m, low: 'shorts', pants: C.grey.d, shoe: C.blue.m },
  };
  const R = 34; // head radius
  const HAIR = {
    short: (c, w) => `<path d="M-35,6 C-39,-32 -14,-45 6,-42 C30,-38 41,-20 35,6 C32,-9 27,-16 18,-17 C9,-11 -7,-11 -16,-17 C-25,-16 -32,-9 -35,6 Z" fill="${vol(c)}" stroke="${L}" stroke-width="${w}" stroke-linejoin="round"/>`,
    spiky: (c, w) => `<path d="M-35,4 L-34,-20 L-25,-16 L-23,-36 L-11,-27 L-2,-46 L7,-30 L18,-41 L20,-25 L32,-29 L35,4 C30,-11 20,-16 0,-16 C-20,-16 -30,-11 -35,4 Z" fill="${vol(c)}" stroke="${L}" stroke-width="${w}" stroke-linejoin="round"/>`,
    pony: (c, w) => `<path d="M-35,4 C-39,-34 -11,-45 7,-42 C30,-38 40,-20 35,4 C27,-16 11,-20 -2,-18 C-16,-16 -30,-11 -35,4 Z" fill="${vol(c)}" stroke="${L}" stroke-width="${w}" stroke-linejoin="round"/><circle cx="31" cy="-24" r="5.5" fill="${C.coral.m}" stroke="${L}" stroke-width="${w * 0.7}"/>`,
    long: (c, w) => `<path d="M-35,8 C-40,-32 -14,-45 5,-42 C30,-38 41,-18 35,8 C31,-11 18,-20 2,-14 C-11,-20 -30,-14 -35,8 Z" fill="${vol(c)}" stroke="${L}" stroke-width="${w}" stroke-linejoin="round"/>`,
    braids: (c, w) => HAIR.pony(c, w).split('<circle')[0],
    curly: (c, w) => blob([[-25, -16, 16], [-9, -30, 17], [11, -30, 17], [27, -16, 15], [-33, 0, 10], [34, 0, 10], [0, -34, 14]], c, w),
  };
  // back hair swings with the body (secondary action): sw is a lag angle in degrees
  const HAIR_BACK = {
    long: (c, w, sw) => `<g transform="rotate(${f2(sw * 0.4)} 0 -6)"><path d="M-38,-4 C-43,34 -40,60 -31,72 L31,72 C40,60 43,34 38,-4 Z" fill="${vol(c)}" stroke="${L}" stroke-width="${w}" stroke-linejoin="round"/></g>`,
    pony: (c, w, sw) => `<g transform="rotate(${f2(sw)} 30 -24)"><path d="M30,-26 C58,-30 64,10 48,34 C46,12 41,-4 25,-11 Z" fill="${vol(c)}" stroke="${L}" stroke-width="${w}" stroke-linejoin="round"/></g>`,
    braids: (c, w, sw) => [-1, 1].map((sx) => `<g transform="rotate(${f2(sw)} ${sx * 30} 0)">${limb([[sx * 30, 0], [sx * 34, 28], [sx * 32, 52]], 12, c, w)}<circle cx="${sx * 32}" cy="57" r="5.5" fill="${C.coral.m}" stroke="${L}" stroke-width="${w * 0.7}"/></g>`).join(''),
  };
  function chain(x, y, a1, l1, a2rel, l2) {
    const x1 = x + Math.sin(a1 * RAD) * l1, y1 = y + Math.cos(a1 * RAD) * l1, a2 = a1 + a2rel;
    return [[x, y], [x1, y1], [x1 + Math.sin(a2 * RAD) * l2, y1 + Math.cos(a2 * RAD) * l2]];
  }
  // a smooth limb: quadratic through the knee/elbow so joints read as soft bends, not hinges
  const pd = (p) => `M${f1(p[0][0])},${f1(p[0][1])} Q${f1(p[1][0])},${f1(p[1][1])} ${f1(p[2][0])},${f1(p[2][1])}`;
  function limb(pts, w, color, lw) {
    const d = pd(pts);
    return `<path d="${d}" fill="none" stroke="${L}" stroke-width="${f2(w + 2 * lw)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
  }
  const part = (pts, t) => [pts[0], [lerp(pts[0][0], pts[1][0], t / 2), lerp(pts[0][1], pts[1][1], t / 2)], [lerp(pts[0][0], pts[1][0], t), lerp(pts[0][1], pts[1][1], t)]];
  const SHOULDER = 27, HIP = 13;
  const handLocal = (side, arm) => chain(side * SHOULDER, -176, arm[0], 40, arm[1], 38)[2];

  // P: x, y feet; s depth scale; flip; legs, arms; lift (px up); sq (+ squash / - stretch); lean (deg, about the feet);
  // tilt (head deg); look [x,y] (pupils); blink 0..1; brow (raise); browAng (determined); mouth; hairSw
  function kid(id, o, P) {
    const s = P.s, w = LW / s;
    const legs = P.legs || [[4, 0], [-4, 0]], arms = P.arms || [[-12, 8], [12, -8]];
    const sq = P.sq || 0, lift = P.lift || 0;
    const L1 = chain(-HIP, -100, legs[0][0], 50, legs[0][1], 48), L2 = chain(HIP, -100, legs[1][0], 50, legs[1][1], 48);
    const A1 = chain(-SHOULDER, -176, arms[0][0], 40, arms[0][1], 38), A2 = chain(SHOULDER, -176, arms[1][0], 40, arms[1][1], 38);
    const leg = (pts) => {
      const ft = pts[2];
      const lower = o.low === 'pants' ? limb(pts, 22, o.pants, w) : limb(pts, 18, o.skin, w) + (o.low === 'shorts' ? limb(part(pts, 0.9), 25, o.pants, w) : '');
      return `${lower}<ellipse cx="${f1(ft[0] + 3)}" cy="${f1(ft[1] + 3)}" rx="17" ry="10.5" fill="${vol(o.shoe)}" stroke="${L}" stroke-width="${f2(w)}"/>`;
    };
    const arm = (pts) => `${limb(pts, 16, o.skin, w)}${limb(part(pts, 0.62), 21, o.shirt, w)}<circle cx="${f1(pts[2][0])}" cy="${f1(pts[2][1])}" r="9.5" fill="${vol(o.skin)}" stroke="${L}" stroke-width="${f2(w)}"/>`;
    const torsoD = 'M-32,-160 C-32,-186 -20,-192 0,-192 C20,-192 32,-186 32,-160 L30,-112 C30,-99 22,-93 0,-93 C-22,-93 -30,-99 -30,-112 Z';
    const stripes = o.stripes ? `<clipPath id="cl_${id}"><path d="${torsoD}"/></clipPath><g clip-path="url(#cl_${id})" opacity=".9">${[-164, -142, -120].map((y) => `<rect x="-34" y="${y}" width="68" height="9" fill="${o.stripes}"/>`).join('')}</g>` : '';
    const skirt = o.low === 'skirt' ? `<path d="M-30,-110 L30,-110 L41,-64 Q0,-55 -41,-64 Z" fill="${vol(o.pants)}" stroke="${L}" stroke-width="${f2(w)}" stroke-linejoin="round"/>` : '';
    const [lx, ly] = P.look || [0, 0];
    const blink = clamp(P.blink || 0);
    const eye = (ex) => blink > 0.6
      ? `<path d="M${ex - 8},2 Q${ex},7 ${ex + 8},2" fill="none" stroke="${L}" stroke-width="${f2(w * 0.8)}" stroke-linecap="round"/>`
      : `<g transform="translate(${ex},1) scale(1,${f2(1 - blink)})"><ellipse rx="9" ry="11.5" fill="#fff" stroke="${L}" stroke-width="${f2(w * 0.7)}"/>
         <circle cx="${f2(lx)}" cy="${f2(ly + 1)}" r="6" fill="${L}"/><circle cx="${f2(lx + 2.2)}" cy="${f2(ly - 2)}" r="2.2" fill="#fff"/></g>`;
    const bY = -15 - (P.brow || 0), bA = P.browAng || 0;
    const mouths = {
      smile: `<path d="M-9,17 Q0,25 9,17" fill="none" stroke="${L}" stroke-width="${f2(w * 0.8)}" stroke-linecap="round"/>`,
      open: `<path d="M-11,15 Q0,31 11,15 Z" fill="#8A3F3A" stroke="${L}" stroke-width="${f2(w * 0.8)}" stroke-linejoin="round"/><path d="M-5,23 Q0,20 5,23 Q0,27 -5,23Z" fill="#E98A86"/>`,
      grin: `<path d="M-14,13 Q0,34 14,13 Z" fill="#8A3F3A" stroke="${L}" stroke-width="${f2(w * 0.8)}" stroke-linejoin="round"/><path d="M-12,14 L12,14 L10,18 L-10,18 Z" fill="#fff"/>`,
      o: `<ellipse cx="0" cy="20" rx="5.5" ry="7" fill="#8A3F3A" stroke="${L}" stroke-width="${f2(w * 0.8)}"/>`,
      hmm: `<path d="M-7,20 Q2,17 9,21" fill="none" stroke="${L}" stroke-width="${f2(w * 0.8)}" stroke-linecap="round"/>`,
    };
    const headBack = HAIR_BACK[o.hair] ? HAIR_BACK[o.hair](o.hc, w, P.hairSw || 0) : '';
    const head = `<rect x="-9" y="20" width="18" height="24" rx="7" fill="${o.skin}" stroke="${L}" stroke-width="${f2(w)}"/>
      <circle cx="-33" cy="5" r="8" fill="${o.skin}" stroke="${L}" stroke-width="${f2(w)}"/><circle cx="33" cy="5" r="8" fill="${o.skin}" stroke="${L}" stroke-width="${f2(w)}"/>
      <circle cx="0" cy="0" r="${R}" fill="${vol(o.skin)}" stroke="${L}" stroke-width="${f2(w)}"/>
      ${HAIR[o.hair](o.hc, w)}
      ${eye(-13)}${eye(13)}
      <path d="M-21,${f1(bY + bA)} Q-13,${f1(bY - 4)} -6,${f1(bY - bA * 0.3)}" fill="none" stroke="${L}" stroke-width="${f2(w * 0.85)}" stroke-linecap="round"/>
      <path d="M6,${f1(bY - bA * 0.3)} Q13,${f1(bY - 4)} 21,${f1(bY + bA)}" fill="none" stroke="${L}" stroke-width="${f2(w * 0.85)}" stroke-linecap="round"/>
      <ellipse cx="0" cy="11" rx="3.4" ry="2.6" fill="${shade(o.skin, -0.12)}"/>
      ${mouths[P.mouth || 'smile']}
      <ellipse cx="-22" cy="14" rx="6.5" ry="4" fill="${C.coral.m}" opacity=".45"/><ellipse cx="22" cy="14" rx="6.5" ry="4" fill="${C.coral.m}" opacity=".45"/>`;
    const bag = o.bag ? `<rect x="-40" y="-184" width="80" height="78" rx="20" fill="${vol(C.blue.m)}" stroke="${L}" stroke-width="${f2(w)}"/>` : '';
    const straps = o.bag ? `${limb([[-18, -188], [-21, -152], [-21, -126]], 8, C.blue.d, w * 0.7)}${limb([[18, -188], [21, -152], [21, -126]], 8, C.blue.d, w * 0.7)}` : '';
    const tilt = P.tilt || 0;
    const hy = -232;
    const shadowW = 50 * (1 - clamp(lift / 220)) ;
    const body = `
      <g transform="rotate(${f2(P.lean || 0)}) scale(${f3(1 + sq * 0.6)},${f3(1 - sq)}) translate(0,${f1(-lift)})">
        <g transform="translate(0,${hy}) rotate(${f2(tilt)})">${headBack}</g>
        ${bag}${leg(L1)}${leg(L2)}${skirt}
        <path d="${torsoD}" fill="${vol(o.shirt)}"/>${stripes}
        <path d="${torsoD}" fill="none" stroke="${L}" stroke-width="${f2(w)}" stroke-linejoin="round"/>
        <path d="M-11,-192 Q0,-181 11,-192" fill="none" stroke="${L}" stroke-width="${f2(w * 0.7)}" stroke-linecap="round"/>
        ${straps}${arm(A1)}${arm(A2)}
        <g transform="translate(0,${hy}) rotate(${f2(tilt)})">${head}</g>
        ${P.extra || ''}
      </g>`;
    const shadow = `<ellipse cx="0" cy="4" rx="${f1(shadowW)}" ry="${f1(9 * (1 - clamp(lift / 260)))}" fill="${L}" opacity=".13"/>`;
    return `<g transform="translate(${f1(P.x)},${f1(P.y)}) scale(${f3((P.flip ? -1 : 1) * s * (P.spinX ?? 1))},${f3(s)})">${shadow}${body}</g>`;
  }
  // world position of a hand (ignores lean/squash, close enough for props)
  const handWorld = (P, side) => {
    const [hx, hy] = handLocal(side, (P.arms || [[-12, 8], [12, -8]])[side < 0 ? 0 : 1]);
    return [P.x + hx * P.s * (P.flip ? -1 : 1), P.y + (hy - (P.lift || 0)) * P.s];
  };
  const depth = (y) => 0.95 + ((y - 1095) / 400) * 0.35;

  // ------------------------------------------------------------------ poses
  const POSE = {
    rest: [[-12, 8], [12, -8]],
    straps: [[-6, 28], [6, -28]],
    hold: [[-12, 78], [12, -78]],            // hugging the ball at the chest
    back: [[-48, 34], [48, -34]],            // wound up (anticipation)
    up: [[-168, 8], [168, -8]],
    open: [[-118, 26], [118, -26]],
    cheeks: [[-30, 150], [30, -150]],        // "oops": hands to the cheeks
    chin: [[-6, 28], [25, -175]],            // thinking, hand at the chin
    fists: [[-20, 120], [20, -120]],         // determined
    down: [[8, -12], [-8, 12]],              // reaching for the ball
    wave: [[-12, 8], [150, -24]],
  };
  // a run cycle driven by distance travelled, so the stride slows down with the body (no constant loop)
  function runPose(dist, amp) {
    const ph = dist / 46 * Math.PI;
    const sn = Math.sin(ph);
    return {
      legs: [[26 * amp * sn, -34 * amp * Math.max(0, sn)], [-26 * amp * sn, -34 * amp * Math.max(0, -sn)]],
      arms: [[-22 - 22 * amp * sn, 38 * amp + 6], [22 - 22 * amp * sn, -38 * amp - 6]],
      lift: Math.abs(sn) * 16 * amp,
      sq: (0.07 * (1 - Math.abs(sn)) - 0.04 * Math.abs(sn)) * amp,
    };
  }

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

  // ------------------------------------------------------------------ choreography (seconds)
  const DOOR = [540, 1100];
  const T_DOOR = 3.0;
  //    spot x, y, leave time, curve bend (px, + to the right of the path)
  const SPOT = {
    a: [300, 1240, 3.05, -120], g: [690, 1250, 3.2, 110], d: [520, 1330, 3.32, -60], e: [690, 1420, 3.45, 90],
    b: [190, 1400, 3.58, -150], c: [408, 1440, 3.7, -70], f: [130, 1180, 3.84, -40],
  };
  const HERO = [930, 1330];
  const THROW = 5.05, LAND = 6.1;                    // a throws, the ball sails over g and lands by the boy
  const BALL_REST = [868, 1392];
  const PICK = 11.85, JUMP = 12.05, CATCH = 13.0;    // the boy picks it up, jumps, throws it back to a
  const CHEER = 13.0;

  const curve = (k) => {
    const [x1, y1, , bend] = SPOT[k];
    const mx = (DOOR[0] + x1) / 2, my = (DOOR[1] + y1) / 2;
    const dx = x1 - DOOR[0], dy = y1 - DOOR[1], n = Math.hypot(dx, dy) || 1;
    const cx = mx + (-dy / n) * bend, cy = my + (dx / n) * bend;
    return (u) => [(1 - u) ** 2 * DOOR[0] + 2 * (1 - u) * u * cx + u * u * x1, (1 - u) ** 2 * DOOR[1] + 2 * (1 - u) * u * cy + u * u * y1];
  };
  const runDur = (k) => Math.hypot(SPOT[k][0] - DOOR[0], SPOT[k][1] - DOOR[1]) / 300 + 0.55;
  const blinkAt = (t, seed) => { const p = ((t + seed * 1.7) % 3.1) / 3.1; return p < 0.035 ? Math.sin((p / 0.035) * Math.PI) : 0; };

  // travel state along the curved path with slow-in/slow-out and lean from (lagged) velocity
  function travel(k, t) {
    const [, , t0] = SPOT[k], dur = runDur(k), path = curve(k);
    const hop = 0.4;                                            // the jump out of the doorway
    const u = EZ.run(prog(t, t0 + hop * 0.6, t0 + hop * 0.6 + dur));
    const at = (tt) => path(EZ.run(prog(tt, t0 + hop * 0.6, t0 + hop * 0.6 + dur)));
    const [x, y] = path(u);
    const [xb, yb] = at(t - 0.07), [xa] = at(t - 0.14);
    const vx = (x - xb) / 0.07, spd = Math.hypot(x - xb, y - yb) / 0.07;
    // distance travelled for the stride (sampled, monotone)
    let dist = 0, prev = path(0);
    for (let i = 1; i <= 24; i++) { const q = path(u * i / 24); dist += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
    const amp = clamp(spd / 260);
    const arrive = t0 + hop * 0.6 + dur;
    const dir = Math.sign(SPOT[k][0] - DOOR[0]) || 1;
    const leanV = clamp((x - xa) / 0.14 / 40, -14, 14);
    return { x, y, amp, dist, vx, leanV, arrive, dir, t0, hop };
  }

  function yardKids(t) {
    const out = [];
    const pose = {};
    for (const k of Object.keys(SPOT)) {
      const [x1, y1, t0] = SPOT[k];
      if (t < t0) continue;
      const tr = travel(k, t);
      const P = { x: tr.x, y: tr.y, s: depth(tr.y), mouth: 'open', look: [tr.dir * 3, 0], blink: blinkAt(t, hash(k.charCodeAt(0))) };
      // 1) pop out of the doorway: crouch, spring up on an arc, squash on landing
      const hp = prog(t, t0, t0 + tr.hop);
      if (hp < 1) {
        P.lift = Math.sin(Math.PI * EZ.io(hp)) * 52;
        P.sq = hp < 0.15 ? 0.14 * (hp / 0.15) : -0.12 * Math.sin(Math.PI * hp);
        P.arms = POSE.up; P.legs = [[10, -50 * Math.sin(Math.PI * hp)], [-10, -50 * Math.sin(Math.PI * hp)]];
        P.flip = tr.dir < 0;
      } else if (t < tr.arrive + 0.05) {
        // 2) run on the curve; stride, bounce and arm swing scale with speed
        const r = runPose(tr.dist, Math.max(0.25, tr.amp));
        Object.assign(P, r);
        P.sq = (P.sq || 0) + wob(t, t0 + tr.hop, 0.12, 6, 9);   // landing squash from the hop
        P.flip = tr.vx < 0;
        P.lean = tr.leanV * (P.flip ? -1 : 1) * -1;
        P.tilt = -P.lean * 0.5;
      } else {
        // 3) arrive: overshoot lean and settle (follow-through), then the activity
        const ta = t - tr.arrive;
        P.lean = wob(t, tr.arrive, 9 * tr.dir, 2.4, 3.2);
        P.tilt = -P.lean * 0.7 + wob(t, tr.arrive + 0.08, 6 * tr.dir, 2.2, 3);
        P.hairSw = wob(t, tr.arrive, 22 * tr.dir, 2.6, 2.4);
        P.sq = wob(t, tr.arrive, 0.06, 3, 6);
        P.mouth = 'smile';
        activity(k, t, ta, P);
        const sd = hash(k.charCodeAt(0) + 3) * 6;
        P.sq = (P.sq || 0) + 0.014 * Math.sin(t * TAU * 0.45 + sd);
        P.tilt = (P.tilt || 0) + 2.5 * Math.sin(t * 1.1 + sd);
      }
      if (P.hairSw === undefined) P.hairSw = -(P.lean || 0) * 1.4 - tr.vx / 40;
      P.s = depth(P.y);
      out.push([k, P]);
      pose[k] = P;
    }
    return { out, pose };
  }

  // the boy (left of his eyes) and the ball state, used by the kids' reactions
  const reactT = LAND + 0.25;
  function lookToward(P, tx, ty) {
    const dx = tx - P.x, dy = ty - (P.y - 230 * P.s);
    const n = Math.hypot(dx, dy) || 1;
    return [clamp(dx / n * 4.5 * (P.flip ? -1 : 1), -4, 4), clamp(dy / n * 3.5, -3.5, 3.5)];
  }

  function activity(k, t, ta, P) {
    const cheerDelay = { a: 0.15, g: 0, b: 0.25, c: 0.1, d: 0.3, e: 0.2, f: 0.35 }[k];
    const tc = CHEER + cheerDelay;
    const cheering = t > tc;
    if (k === 'a') {
      // holds the ball, winds up (anticipation), throws on an arc, follows through, "oops", waves the boy over, catches
      P.arms = kf(t, [[0, POSE.hold], [THROW - 0.45, POSE.hold], [THROW - 0.05, POSE.back, EZ.anti], [THROW + 0.12, POSE.up, EZ.out], [THROW + 0.55, POSE.open], [LAND + 0.1, POSE.open], [LAND + 0.35, POSE.cheeks, EZ.over], [LAND + 1.4, POSE.cheeks], [LAND + 1.9, POSE.wave], [CATCH - 0.4, POSE.wave], [CATCH - 0.05, POSE.up, EZ.out], [CATCH + 0.25, POSE.hold, EZ.over]]);
      P.sq = (P.sq || 0) + kf(t, [[0, 0], [THROW - 0.45, 0], [THROW - 0.05, 0.13, EZ.anti], [THROW + 0.1, -0.12, EZ.out], [THROW + 0.45, 0, EZ.io]]);
      P.lean = (P.lean || 0) + kf(t, [[0, 0], [THROW - 0.45, 0], [THROW - 0.05, -8], [THROW + 0.15, 10, EZ.out], [THROW + 0.6, 0]]);
      P.mouth = t > LAND && t < LAND + 1.5 ? 'o' : t > THROW - 0.3 && t < THROW + 0.4 ? 'grin' : 'open';
      P.look = t > THROW && t < CATCH ? lookToward(P, 820, 900) : [3, 0];
      if (t > LAND + 1.9 && t < CATCH - 0.4) { const w = Math.sin((t - LAND - 1.9) * TAU * 1.4); P.arms = [[-12, 8], [150 + 20 * w, -24 - 20 * w]]; P.mouth = 'open'; }
    } else if (k === 'g') {
      // anticipates the catch, jumps for it on an arc, just misses, lands with a squash, laughs it off
      const jt = 5.82;
      P.lift = kf(t, [[0, 0], [jt - 0.32, 0], [jt, 70, EZ.up], [jt + 0.34, 0, EZ.in]]);
      P.sq = (P.sq || 0) + kf(t, [[0, 0], [jt - 0.55, 0], [jt - 0.32, 0.16, EZ.io], [jt - 0.22, -0.14, EZ.out], [jt + 0.3, -0.05], [jt + 0.36, 0.17, EZ.out], [jt + 0.62, 0, EZ.io]]);
      P.arms = kf(t, [[0, POSE.rest], [THROW, POSE.rest], [jt - 0.3, POSE.open, EZ.io], [jt, POSE.up, EZ.out], [jt + 0.7, POSE.up], [jt + 1.2, POSE.rest]]);
      P.look = t > THROW ? lookToward(P, t < LAND ? 760 : HERO[0], t < LAND ? 860 : 1150) : [-3, 0];
      P.mouth = t > jt - 0.4 && t < jt + 0.5 ? 'o' : 'grin';
      P.hairSw = (P.hairSw || 0) + kf(t, [[0, 0], [jt - 0.3, 0], [jt, -24, EZ.up], [jt + 0.4, 18, EZ.in], [jt + 1.2, 0, EZ.out]]);
    } else if (k === 'b') {
      // jump rope (rope arcs over the head and under the feet), stops when the ball lands
      const stopAt = reactT + 0.2;
      const spinT = Math.min(ta, stopAt - (t - ta)) ;
      const th = spinT * TAU * 1.5;
      const going = t < stopAt;
      const lift = going ? 30 * Math.max(0, Math.cos(th)) ** 3 : 0;
      P.lift = lift; P.sq = (P.sq || 0) + (going ? 0.12 * Math.max(0, Math.cos(th + 0.9)) ** 6 - 0.06 * lift / 30 : 0);
      P.legs = [[8, -22 * lift / 30], [-8, 22 * lift / 30]];
      P.arms = [[-44, 46], [44, -46]];
      const hy = -108, hxs = 52;
      const apex = going ? lerp(-340, 26, (Math.cos(th) + 1) / 2) + lift : 26 + lift;
      const rope = `<path d="M${-hxs},${hy} Q0,${f1(2 * apex - hy)} ${hxs},${hy}" fill="none" stroke="${C.coral.d}" stroke-width="${f1(5.5 / P.s)}" stroke-linecap="round"/>`;
      if (Math.sin(th) > 0 || !going) P.extra = rope; else P.back = rope;
      P.mouth = going ? 'open' : 'smile';
      P.look = going ? [0, 0] : lookToward(P, HERO[0], HERO[1] - 200);
    } else if (k === 'c') {
      // hopscotch: each hop is anticipation, arc, squash
      const stopAt = reactT + 0.1;
      const tt = Math.min(ta, stopAt - (t - ta));
      const hopLen = 0.52, n = Math.floor(tt / hopLen), f = (tt % hopLen) / hopLen;
      const path = [[408, 1440], [408, 1372], [408, 1302], [408, 1372]];
      const p0 = path[n % 4], p1 = path[(n + 1) % 4];
      const air = prog(f, 0.22, 0.8);
      P.x = lerp(p0[0], p1[0], EZ.io(air)); P.y = lerp(p0[1], p1[1], EZ.io(air));
      P.lift = Math.sin(Math.PI * air) * 36;
      P.sq = (P.sq || 0) + (f < 0.22 ? 0.13 * Math.sin(Math.PI * f / 0.22) : f > 0.8 ? 0.15 * Math.sin(Math.PI * (f - 0.8) / 0.2) : -0.1 * Math.sin(Math.PI * air));
      P.legs = [[4, -46 * Math.sin(Math.PI * air)], [-4, -8]];
      P.arms = air > 0 && air < 1 ? POSE.open : POSE.back;
      P.mouth = 'open';
      if (t > stopAt) { P.lift = 0; P.legs = [[4, 0], [-4, 0]]; P.arms = POSE.rest; P.look = lookToward(P, HERO[0], HERO[1] - 200); P.mouth = 'smile'; }
    } else if (k === 'd' || k === 'e') {
      // tag around the circle; they ease to a stop when the ball lands
      const CH = [610, 1388, 150, 44];
      const tr = travel(k, t);
      const base = Math.atan2((SPOT[k][1] - CH[1]) / CH[3], (SPOT[k][0] - CH[0]) / CH[2]);
      const stopAt = reactT + (k === 'd' ? 0.1 : 0.25);
      // angular speed eases up from 0 and eases back down to 0 (slow in, slow out)
      const angAt = (tt) => {
        const a1 = tt - tr.arrive;
        if (a1 <= 0) return 0;
        const ramp = Math.min(a1, 0.7);
        const full = 1.9;
        let ang = full * (ramp * ramp / 1.4) + full * Math.max(0, Math.min(a1, stopAt - tr.arrive) - 0.7);
        const over = a1 - (stopAt - tr.arrive);
        if (over > 0) ang += full * (Math.min(over, 0.8) - Math.min(over, 0.8) ** 2 / 1.6);
        return ang;
      };
      const ang = base + angAt(t);
      const dAng = angAt(t) - angAt(t - 0.05);
      const speed = clamp(dAng / 0.05 / 1.9);
      P.x = CH[0] + Math.cos(ang) * CH[2]; P.y = CH[1] + Math.sin(ang) * CH[3];
      const dist = angAt(t) * 120;
      if (speed > 0.05) {
        Object.assign(P, runPose(dist, speed));
        P.flip = Math.sin(ang) < 0;
        P.lean = (P.flip ? 1 : -1) * 6 * speed;
        P.mouth = 'open';
      } else {
        P.look = lookToward(P, HERO[0], HERO[1] - 200);
        P.lean = wob(t, stopAt + 0.7, 6, 2.2, 3);
      }
    } else if (k === 'f') {
      // waves to the others from the tree, then turns to watch the boy
      const wv = Math.sin(t * TAU * 1.3);
      P.arms = t < reactT ? [[-12, 8], [150 + 22 * wv, -26 - 22 * wv]] : POSE.rest;
      P.look = t < reactT ? [3, -1] : lookToward(P, HERO[0], HERO[1] - 200);
      P.tilt = t < reactT ? 5 * Math.sin(t * TAU * 0.65) : 0;
      P.mouth = 'open';
    }
    // everyone watches the boy while he decides
    if (t > reactT && !cheering && k !== 'a') P.mouth = t > JUMP ? 'open' : 'smile';
    if (t > 9.3 && t < CHEER && k !== 'a') { P.brow = 3; }
    // cheer: staggered hops with arms up (overlapping action)
    if (cheering) {
      const ct = t - tc;
      const hop = Math.max(0, Math.sin(ct * TAU * 1.25)) * 34 * Math.exp(-ct * 0.35);
      P.lift = (P.lift || 0) * 0 + hop;
      P.sq = 0.1 * Math.max(0, -Math.sin(ct * TAU * 1.25)) * Math.exp(-ct * 0.35);
      P.legs = [[6, -30 * hop / 34], [-6, -30 * hop / 34]];
      P.arms = k === 'a' && ct < 0.4 ? POSE.hold : mix(POSE.open, POSE.up, 0.5 + 0.5 * Math.sin(ct * TAU * 1.25));
      P.mouth = 'grin';
      P.look = lookToward(P, HERO[0], HERO[1] - 220);
      P.hairSw = -hop * 0.5;
      P.extra = undefined; P.back = undefined;
    }
  }

  // the boy by the wall: curious, startled by the ball, thinks it over, decides, and joins in
  function hero(t, ballXY) {
    const P = { x: HERO[0], y: HERO[1], s: depth(HERO[1]) * 1.03, blink: blinkAt(t, 0.31) };
    const breathe = Math.sin(t * TAU * 0.4) * 0.012;
    P.arms = kf(t, [[0, POSE.straps], [LAND + 0.02, POSE.straps], [LAND + 0.16, [[-34, 30], [34, -30]], EZ.out], [LAND + 0.8, POSE.straps, EZ.io],
      [7.5, POSE.straps], [8.1, POSE.chin, EZ.io], [10.15, POSE.chin], [10.4, POSE.fists, EZ.over], [11.25, POSE.fists], [PICK, POSE.down, EZ.io],
      [JUMP - 0.04, POSE.down], [JUMP + 0.14, POSE.up, EZ.out], [JUMP + 0.75, POSE.up], [13.25, POSE.open, EZ.io], [14.2, POSE.open], [14.7, POSE.wave, EZ.io]]);
    if (t > 14.7) { const w = Math.sin((t - 14.7) * TAU * 1.4); P.arms = [[-118, 26], [150 + 20 * w, -24 - 20 * w]]; }
    // body: surprise hop at the thud, crouch to pick up the ball (anticipation), big spring jump, land, spin
    P.lift = kf(t, [[0, 0], [LAND, 0], [LAND + 0.14, 16, EZ.up], [LAND + 0.34, 0, EZ.in], [JUMP, 0], [JUMP + 0.32, 118, EZ.up], [JUMP + 0.62, 0, EZ.in], [13.3, 0], [13.55, 40, EZ.up], [13.8, 0, EZ.in]]);
    P.sq = breathe + kf(t, [[0, 0], [LAND, 0], [LAND + 0.08, -0.1, EZ.out], [LAND + 0.34, -0.03], [LAND + 0.42, 0.08, EZ.out], [LAND + 0.7, 0, EZ.io],
      [11.25, 0], [PICK, 0.17, EZ.io], [JUMP - 0.05, 0.22, EZ.io], [JUMP + 0.06, -0.18, EZ.out], [JUMP + 0.3, -0.04, EZ.io], [JUMP + 0.58, -0.1], [JUMP + 0.66, 0.22, EZ.out], [JUMP + 0.95, 0, EZ.io],
      [13.3, 0], [13.36, 0.08, EZ.out], [13.45, -0.08], [13.8, -0.04], [13.86, 0.12, EZ.out], [14.1, 0, EZ.io]]);
    // sway while thinking (slow in/out), a quick determined head shake, then a happy spin
    const sway = 7.6 < t && t < 10.2 ? 5 * Math.sin((t - 7.6) / 2.6 * TAU * 1.5) * Math.sin(Math.PI * prog(t, 7.6, 10.2)) : 0;
    P.lean = sway + kf(t, [[0, 0], [11.25, 0], [PICK, -6, EZ.io], [JUMP, -8], [JUMP + 0.2, 4, EZ.out], [JUMP + 0.65, 0]]);
    const shake = 10.35 < t && t < 11.0 ? 9 * Math.sin((t - 10.35) * TAU * 5.5) * (1 - prog(t, 10.35, 11.0)) : 0;
    P.tilt = shake + sway * 0.8 + kf(t, [[0, -3], [LAND, -3], [LAND + 0.3, 4, EZ.out], [7.5, 4], [8.1, -6], [10.2, -6]]) * (t < 10.2 ? 1 : 0);
    const spin = EZ.io(prog(t, 13.3, 13.68));
    P.spinX = Math.cos(spin * TAU);
    if (Math.abs(P.spinX) < 0.08) P.spinX = 0.08 * Math.sign(P.spinX || 1);
    P.hairSw = -P.lean;
    // face
    if (t < LAND) {
      P.look = ballXY ? lookToward(P, ballXY[0], ballXY[1]) : [-3, 0];
      P.mouth = 'smile'; P.brow = 2;
    } else if (t < 7.5) {
      P.look = t < LAND + 0.4 ? [0, -1] : [-3, 3.2];
      P.mouth = t < LAND + 0.7 ? 'o' : 'smile'; P.brow = t < LAND + 0.7 ? 7 : 3;
      if (t < LAND + 0.5) P.blink = 0;
    } else if (t < 10.25) {
      P.look = [2.5 * Math.sin((t - 7.5) * 1.6), -3];
      P.mouth = 'smile'; P.brow = 6;
    } else if (t < 11.3) {
      P.look = [0, 0]; P.mouth = t < 10.7 ? 'smile' : 'grin'; P.browAng = t < 10.7 ? 3 : 0; P.brow = t < 10.7 ? 0 : 4;
    } else if (t < JUMP) {
      P.look = [-2.5, 3.5]; P.mouth = 'grin';
    } else {
      P.look = ballXY && t < CATCH ? lookToward(P, ballXY[0], ballXY[1]) : [-3, 0];
      P.mouth = 'grin'; P.brow = 3;
    }
    return P;
  }

  // ------------------------------------------------------------------ the ball (ballistic arcs, squash on contact)
  function ball(t, pose, heroP) {
    const a = pose.a;
    if (!a) return null;
    const handA = () => { const l = handWorld(a, -1), r = handWorld(a, 1); return [(l[0] + r[0]) / 2, (l[1] + r[1]) / 2 - 6]; };
    if (t < THROW) return { p: handA(), sq: 0, rot: 0 };
    const B0 = [318, 1020];
    const G = (p, q, f, H) => [lerp(p[0], q[0], f), lerp(p[1], q[1], f) - H * 4 * f * (1 - f)];
    if (t < LAND) {
      const f = prog(t, THROW, LAND);
      return { p: G(B0, [820, BALL_REST[1]], f, 640), sq: -0.12 * Math.sin(Math.PI * f) * 0.5, rot: f * 540 };
    }
    // bounces lose energy: each shorter and lower, squash at every contact
    const B = [[LAND, 820, 0.5, 74], [LAND + 0.5, 850, 0.3, 24]];
    for (const [tb, xb, d, h] of B) {
      if (t < tb + d) {
        const f = prog(t, tb, tb + d);
        const x0 = xb, x1 = xb === 820 ? 850 : BALL_REST[0] - 6;
        const contact = Math.max(bump(t, tb, 0.035), bump(t, tb + d, 0.035) * 0.5);
        return { p: G([x0, BALL_REST[1]], [x1, BALL_REST[1]], f, h), sq: 0.32 * contact * (h / 74), rot: 540 + (t - LAND) * 400 };
      }
    }
    if (t < PICK + 0.12) {
      const f = EZ.out(prog(t, LAND + 0.8, LAND + 2.0));
      return { p: [lerp(BALL_REST[0] - 6, BALL_REST[0], f), BALL_REST[1]], sq: 0, rot: 700 + f * 40 };
    }
    const handH = () => { const l = handWorld(heroP, -1), r = handWorld(heroP, 1); return [(l[0] + r[0]) / 2, (l[1] + r[1]) / 2 - 8]; };
    if (t < JUMP + 0.14) {
      const f = EZ.io(prog(t, PICK, PICK + 0.12));
      const hh = handH();
      return { p: [lerp(BALL_REST[0], hh[0], f), lerp(BALL_REST[1], hh[1], f)], sq: 0, rot: 740 };
    }
    if (t < CATCH) {
      const f = prog(t, JUMP + 0.14, CATCH);
      const from = handH(), to = handA();
      const start = [HERO[0] - 8, HERO[1] - 420];
      return { p: G(start, to, f, 300), sq: -0.1 * Math.sin(Math.PI * f), rot: 740 - f * 720 };
    }
    return { p: handA(), sq: 0.25 * bump(t, CATCH, 0.05), rot: 20 };
  }

  // ------------------------------------------------------------------ DOM
  const stage = document.getElementById('stage');
  const mw = (txt) => txt.split(' ').map((w) => `<span class="mask"><span class="wd">${w}</span></span>`).join(' ');
  stage.innerHTML = `
    <svg id="scene" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}">
      <defs id="defs"></defs>
      <g id="world">
        ${scenery}
        <g id="bell"><g id="bellBody">
          <path d="M0,-22 L0,-6" ${ol(4)}/>
          <path d="M-26,30 C-26,2 -16,-12 0,-12 C16,-12 26,2 26,30 Z" fill="${vol(C.yellow.m)}" ${ol()}/>
          <rect x="-32" y="26" width="64" height="12" rx="6" fill="${C.yellow.d}" ${ol()}/>
          <g id="clapper"><circle cx="0" cy="44" r="7" fill="${C.coral.d}" ${ol(3)}/></g>
        </g></g>
        <g id="waves" fill="none" stroke="${C.coral.d}" stroke-width="6" stroke-linecap="round"></g>
        <g id="dust"></g>
        <g id="kids"></g>
        <g id="ballG"><g id="ballIn"><circle r="21" fill="${vol(C.coral.m)}" ${ol()}/><path d="M-20,-4 Q0,-15 20,-4 M-6,-20 Q6,0 -4,20" fill="none" stroke="#fff" stroke-width="4"/></g></g>
      </g>
    </svg>
    <svg id="leaders" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}"></svg>
    <div id="ui">
      <div class="tl cap1" id="c1" style="top:262px">${mw('הצלצול להפסקה.')}</div>
      <div class="tl cap2" id="c2" style="top:384px">${mw('הרגע הכי ארוך ביום שלו.')}</div>
      <div class="lab" id="lab1">כולם יוצאים לשחק</div>
      <div class="lab" id="lab2">צעד קטן</div>
    </div>
    <div id="grain"></div>`;
  const $ = (id) => document.getElementById(id);
  const world = $('world'), kidsG = $('kids'), ballG = $('ballG'), ballIn = $('ballIn'), bell = $('bell'), clapper = $('clapper'), wavesG = $('waves'), leaders = $('leaders'), dustG = $('dust');
  $('grain').style.backgroundImage = 'url(@@GRAIN@@)';
  wavesG.innerHTML = [0, 1, 2].map((i) => [-1, 1].map((sx) => `<path class="wv" data-i="${i}" pathLength="1" d="M${540 + sx * (54 + i * 26)},${540 - i * 6} Q${540 + sx * (72 + i * 30)},590 ${540 + sx * (54 + i * 26)},${640 + i * 6}"/>`).join('')).join('');

  // ------------------------------------------------------------------ camera (keyframed, slow in / slow out)
  function camera(t) {
    // [scale, focus x, focus y]: the focus point lands at screen (540, 1000).
    // Establish, push in close on the boy while he decides, pull back out for the payoff.
    const k = kf(t, [[0, [1.0, 540, 1000]], [6.5, [1.035, 545, 1010], EZ.io], [9.0, [1.55, 880, 1180], EZ.io], [11.7, [1.6, 885, 1190], EZ.io], [13.1, [1.03, 560, 1010], EZ.io], [15, [1.05, 560, 1010], EZ.io]]);
    const dip = wob(t, LAND, 10, 7, 9) + wob(t, JUMP + 0.62, 9, 7, 10);
    return { s: k[0], fx: k[1], fy: k[2], dy: dip };
  }
  const toScreen = (cam, x, y) => [540 + (x - cam.fx) * cam.s, 1000 + (y - cam.fy) * cam.s + cam.dy];

  function label(id, t, t0, t1, anchorWorld, boxXY, cam) {
    const el = $(id);
    const k = sp(t, t0, SPR.ui), out = 1 - EZ.io(prog(t, t1 - 0.35, t1));
    const on = t > t0 && t < t1;
    el.style.display = on ? '' : 'none';
    if (!on) return '';
    const o = clamp(k * 1.6) * out;
    el.style.opacity = f2(o);
    el.style.transform = `translate(${f1(boxXY[0])}px, ${f1(boxXY[1] + (1 - k) * 22)}px)`;
    const [ax, ay] = toScreen(cam, ...anchorWorld);
    const sx = boxXY[0] + el.offsetWidth / 2, sy = boxXY[1] + el.offsetHeight + 6 + (1 - k) * 22;
    const len = EZ.io(prog(t, t0 + 0.1, t0 + 0.55));
    const ex = lerp(sx, ax, len), ey = lerp(sy, ay, len);
    return `<g opacity="${f2(o)}"><path d="M${f1(sx)},${f1(sy)} L${f1(ex)},${f1(ey)}" stroke="${L}" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round" fill="none"/>
      <circle cx="${f1(ex)}" cy="${f1(ey)}" r="${f1(8 * len)}" fill="${C.coral.m}" stroke="${L}" stroke-width="3"/></g>`;
  }
  const words = (node, t, t0, step = 0.13) => node.querySelectorAll('.wd').forEach((w, i) => {
    const k = sp(t, t0 + i * step, SPR.pop);
    w.style.transform = `translateY(${f1((1 - k) * 120)}%)`;
  });

  // ------------------------------------------------------------------ the frame
  function apply(t) {
    const cam = camera(t);
    world.setAttribute('transform', `translate(${f2(540 - cam.fx * cam.s)},${f2(1000 - cam.fy * cam.s + cam.dy)}) scale(${f3(cam.s)})`);
    world.querySelectorAll('.cloud').forEach((c) => c.setAttribute('transform', `translate(${f1(t * +c.dataset.v)},0)`));
    $('rays').setAttribute('transform', `rotate(${f1(t * 10)})`);

    // bell: a small pull back (anticipation), then a ring that swings on an arc and dies away
    const ringT = 0.9;
    const pre = kf(t, [[0, 0], [0.45, 0], [ringT - 0.05, -10, EZ.anti], [ringT, 0, EZ.in]]);
    const swing = t > ringT ? 28 * Math.exp(-(t - ringT) * 1.1) * Math.sin((t - ringT) * TAU * 2.4) : 0;
    bell.setAttribute('transform', `translate(540,568) rotate(${f2(pre + swing)})`);
    clapper.setAttribute('transform', `rotate(${f2(t > ringT ? -0.6 * swing * Math.cos((t - ringT) * 3) : 0)})`);
    const ringSq = 0.1 * Math.max(bump(t, ringT, 0.05), bump(t, ringT + 0.42, 0.05) * 0.8, bump(t, ringT + 0.84, 0.05) * 0.6);
    $('bellBody').setAttribute('transform', `scale(${f3(1 + ringSq)},${f3(1 - ringSq)})`);
    wavesG.querySelectorAll('.wv').forEach((p) => {
      const i = +p.dataset.i;
      const d = t - (ringT + i * 0.1);
      const n = Math.floor(d / 0.42), pulse = d - n * 0.42;
      const on = d > 0 && n < 3;
      p.style.display = on ? '' : 'none';
      if (!on) return;
      p.setAttribute('stroke-dasharray', '1 1');
      p.setAttribute('stroke-dashoffset', f2(1 - EZ.out(prog(pulse, 0, 0.22))));
      p.setAttribute('opacity', f2((1 - prog(pulse, 0.22, 0.42)) * (1 - n * 0.25)));
      p.setAttribute('stroke-width', f2(6 / cam.s));
    });

    // doors: rattle as the kids push (anticipation), then burst open with overshoot
    const rattle = t > 2.1 && t < T_DOOR ? Math.sin(t * TAU * 9) * 0.03 * prog(t, 2.1, T_DOOR) : 0;
    const open = sp(t, T_DOOR, SPR.door);
    const ds = clamp(1 - 0.86 * open + rattle, 0.06, 1.05);
    $('doorL').setAttribute('transform', `translate(478,0) scale(${f3(ds)},1) translate(-478,0)`);
    $('doorR').setAttribute('transform', `translate(602,0) scale(${f3(ds)},1) translate(-602,0)`);

    // kids, the boy, the ball
    const { out, pose } = yardKids(t);
    const preBall = pose.a && t < PICK ? ball(t, pose, null) : null;
    const heroP = hero(t, preBall ? preBall.p : null);
    out.push(['hero', heroP]);
    const B = ball(t, pose, heroP);
    if (B && t > JUMP + 0.14 && t < CATCH) heroP.look = lookToward(heroP, B.p[0], B.p[1]);
    out.sort((p, q) => p[1].y - q[1].y);
    kidsG.innerHTML = out.map(([k, P]) => (P.back ? `<g transform="translate(${f1(P.x)},${f1(P.y)}) scale(${f3((P.flip ? -1 : 1) * P.s)},${f3(P.s)})"><g transform="scale(${f3(1 + (P.sq || 0) * 0.6)},${f3(1 - (P.sq || 0))}) translate(0,${f1(-(P.lift || 0))})">${P.back}</g></g>` : '') + kid(k, KIDS[k], P)).join('');
    ballG.style.display = B ? '' : 'none';
    if (B) {
      const s = depth(Math.min(B.p[1] + 40, 1400));
      ballG.setAttribute('transform', `translate(${f1(B.p[0])},${f1(B.p[1])}) scale(${f3(s * (1 + B.sq * 0.7))},${f3(s * (1 - B.sq))})`);
      ballIn.setAttribute('transform', `rotate(${f1(B.rot)})`);
      // the ball should sit in front of whoever is holding it
      kidsG.parentNode.appendChild(ballG);
    }
    // dust puffs where the ball and the boy land (the thud)
    const puffs = [];
    for (const [t0, x, y, n] of [[LAND, 820, BALL_REST[1] + 18, 5], [JUMP + 0.62, HERO[0], HERO[1] + 6, 6]]) {
      const d = t - t0;
      if (d < 0 || d > 0.7) continue;
      for (let i = 0; i < n; i++) {
        const a = Math.PI + (i / (n - 1)) * Math.PI;
        const r = EZ.out(d / 0.7) * 70;
        puffs.push(`<circle cx="${f1(x + Math.cos(a) * r * 1.4)}" cy="${f1(y + Math.sin(a) * r * 0.35)}" r="${f1(14 * (1 - d / 0.7) + 4)}" fill="#fff" stroke="${L}" stroke-width="${f2(3 / cam.s)}" opacity="${f2(1 - d / 0.7)}"/>`);
      }
    }
    dustG.innerHTML = puffs.join('');

    // captions (the hook), then they clear the frame for the push-in
    words($('c1'), t, 1.15);
    words($('c2'), t, 2.6);
    $('ui').querySelectorAll('.tl').forEach((n) => { n.style.opacity = f2(1 - EZ.io(prog(t, 6.7, 7.2))); });

    leaders.innerHTML = label('lab1', t, 3.3, 5.5, [540, 1040], [96, 520], cam) + label('lab2', t, JUMP + 0.1, 14.7, [HERO[0], HERO[1] - 300], [560, 300], cam);
  }

  // ------------------------------------------------------------------ sound on picture
  function hits() {
    const P = GRID.period, OFF = GRID.offset;
    const u = (s) => (s - OFF) / P;
    const H = [];
    const add = (s, label, sfx, o) => H.push([u(s), label, sfx, o]);
    [0, 0.42, 0.84].forEach((d, i) => add(0.9 + d, `bell ${i + 1}`, 'bell', { pitch: i % 2 ? 'A5' : 'D6', gain: 0.26 - i * 0.04 }));
    add(1.15, 'caption 1', 'blip', { pitch: 'A5', gain: 0.08 });
    add(2.6, 'caption 2', 'blip', { pitch: 'D6', gain: 0.08 });
    add(T_DOOR, 'doors burst open', 'whoosh', { len: 0.45, from: 300, to: 1800, gain: 0.16 });
    Object.entries(SPOT).forEach(([k, s], i) => add(s[2] + 0.4, `${k} lands`, 'pop', { pitch: ['D5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6'][i], gain: 0.1 }));
    add(THROW, 'throw', 'whoosh', { len: 0.5, from: 500, to: 2200, gain: 0.14 });
    add(LAND, 'thud', 'thud', { pitch: 120, to: 50, gain: 0.3 });
    add(LAND + 0.5, 'bounce', 'tok', { pitch: 'D5', gain: 0.14 });
    add(LAND + 0.8, 'bounce small', 'tok', { pitch: 'F#5', gain: 0.08 });
    add(10.4, 'decides', 'blip', { pitch: 'A5', gain: 0.12 });
    add(JUMP, 'jump', 'boing', { gain: 0.16 });
    add(JUMP + 0.62, 'lands', 'thud', { pitch: 140, to: 70, gain: 0.18 });
    add(CATCH, 'catch', 'pop', { pitch: 'A5', gain: 0.22 });
    add(13.3, 'spin', 'whoosh', { len: 0.5, from: 600, to: 2400, gain: 0.12 });
    add(13.4, 'cheer', 'bell', { pitch: 'D6', gain: 0.18 });
    return H.sort((a, b) => a[0] - b[0]);
  }

  // ------------------------------------------------------------------ boot + harness
  let ready = null;
  async function boot() {
    await Promise.all(['700 20px Rubik', '800 20px Rubik'].map((f) => document.fonts.load(f, 'אבג Abc 123')));
    await document.fonts.ready;
    apply(0);
    $('defs').innerHTML = [...GRADS.values()].join('');
    window.HITS = hits();
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
  window.seek = async (t) => {
    await ready;
    apply(clamp(t, 0, DURATION));
    if ($('defs').childElementCount < GRADS.size) $('defs').innerHTML = [...GRADS.values()].join('');
  };
  ready = boot().then(() => { window.filmReady = true; });

  if (PREVIEW) {
    const h = document.createElement('div');
    h.id = 'harness';
    h.innerHTML = `<button id="pp" type="button">❚❚</button><input id="scrub" type="range" min="0" max="${DURATION}" step="0.0167" value="0" aria-label="זמן"><span id="tc">0.00</span>`;
    document.body.appendChild(h);
    let playing = true, t0 = 0, start = performance.now();
    const scrub = h.querySelector('#scrub'), tc = h.querySelector('#tc'), pp = h.querySelector('#pp');
    const showT = (t) => { scrub.value = t; tc.textContent = t.toFixed(2); window.seek(t); };
    const loop = (now) => { if (!playing) return; showT((t0 + (now - start) / 1000) % DURATION); requestAnimationFrame(loop); };
    ready.then(() => { start = performance.now(); requestAnimationFrame(loop); });
    pp.onclick = () => { playing = !playing; pp.textContent = playing ? '❚❚' : '▶'; if (playing) { t0 = +scrub.value; start = performance.now(); requestAnimationFrame(loop); } };
    scrub.oninput = () => { playing = false; pp.textContent = '▶'; showT(+scrub.value); };
  }
})();
