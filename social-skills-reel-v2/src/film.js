// מרכז דיאלוג · "קבוצת חברים" v2, scene 1 (15 s): the schoolyard, acted with the 12 principles.
// Pure function of time: window.seek(t) rebuilds every pose from t. No timers, no state between frames.
// Acting is keyframed with custom cubic-bezier curves (slow in / slow out, anticipation, overshoot),
// paths are curves (arcs), bodies squash and stretch, heads and hair lag behind the body (follow-through).
/* global GRID */

(() => {
  const PARAMS = new URLSearchParams(location.search);
  const RENDER = PARAMS.get('render') === '1';
  const PREVIEW = PARAMS.get('preview') === '1' || PARAMS.get('play') === '1' || window.AUTOPLAY === true;
  const DURATION = 37.5;
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
    let L1 = chain(-HIP, -100, legs[0][0], 50, legs[0][1], 48), L2 = chain(HIP, -100, legs[1][0], 50, legs[1][1], 48);
    if (P.sit) { L1 = [[-HIP, -100], [-HIP - 3, -80], [-HIP - 4, -44]]; L2 = [[HIP, -100], [HIP + 3, -80], [HIP + 4, -44]]; }
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
      <g transform="rotate(${f2(P.lean || 0)}) scale(${f3(1 + sq * 0.6)},${f3(1 - sq)}) translate(0,${f1(-lift + (P.sit ? 46 : 0))})">
        <g transform="translate(0,${hy}) rotate(${f2(tilt)})">${headBack}</g>
        ${bag}${leg(L1)}${leg(L2)}${P.sit ? '' : skirt}
        <path d="${torsoD}" fill="${vol(o.shirt)}"/>${stripes}
        <path d="${torsoD}" fill="none" stroke="${L}" stroke-width="${f2(w)}" stroke-linejoin="round"/>
        <path d="M-11,-192 Q0,-181 11,-192" fill="none" stroke="${L}" stroke-width="${f2(w * 0.7)}" stroke-linecap="round"/>
        ${P.sit ? `<path d="M-34,-104 Q-36,-80 -24,-76 L24,-76 Q36,-80 34,-104 Z" fill="${vol(o.low === 'skirt' ? o.pants : o.low === 'pants' ? o.pants : o.pants)}" stroke="${L}" stroke-width="${f2(w)}" stroke-linejoin="round"/>` : ''}
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
    <ellipse cx="600" cy="1430" rx="124" ry="42" fill="none" stroke="#fff" stroke-width="7" opacity=".9"/>
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


  // ------------------------------------------------------------------ the group room (its own coordinates, seen through the round window)
  const ROOM_BG = `
    <rect x="-600" y="-200" width="2280" height="1360" fill="${C.blue.l}"/>
    <rect x="-600" y="1150" width="2280" height="1200" fill="${C.yellow.l}"/>
    ${[1190, 1240, 1300, 1370, 1450, 1540, 1640].map((y) => `<path d="M-600,${y} L1680,${y}" stroke="${C.yellow.d}" stroke-width="3" opacity=".35" fill="none"/>`).join('')}
    <path d="M-600,1150 L1680,1150" ${ol()} fill="none"/>
    <rect x="-600" y="1132" width="2280" height="18" fill="${C.blue.m}" opacity=".55"/>
    <!-- window with the sky outside -->
    <rect x="690" y="800" width="230" height="230" rx="26" fill="#fff" ${ol()}/>
    <rect x="708" y="818" width="194" height="194" rx="16" fill="#D4ECFA" ${ol(3)}/>
    <circle cx="860" cy="860" r="26" fill="${C.yellow.m}" ${ol(3)}/>
    <path d="M805,818 L805,1012 M708,915 L902,915" stroke="#fff" stroke-width="10"/>
    <!-- a drawing board -->
    <rect x="150" y="830" width="230" height="170" rx="18" fill="#fff" ${ol()}/>
    <circle cx="215" cy="900" r="26" fill="${C.yellow.m}" ${ol(3)}/><path d="M205,895 L205,897 M225,895 L225,897 M203,910 Q215,920 227,910" ${ol(3)} fill="none"/>
    <circle cx="300" cy="900" r="26" fill="${C.blue.m}" ${ol(3)}/><path d="M290,895 L290,897 M310,895 L310,897 M288,910 Q300,920 312,910" ${ol(3)} fill="none"/>
    <path d="M241,960 Q258,940 274,960" stroke="${C.coral.d}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M240,1000 L230,1070 M290,1000 L300,1070" ${ol()} fill="none"/>
    <!-- bunting -->
    <path d="M-40,760 Q540,840 1120,760" ${ol(3)} fill="none"/>
    ${Array.from({ length: 13 }, (_, i) => { const x = -10 + i * 90, y = 762 + Math.sin(((x + 40) / 1160) * Math.PI) * 42; return `<path d="M${x - 22},${y.toFixed(0)} L${x + 22},${y.toFixed(0)} L${x},${(y + 40).toFixed(0)} Z" fill="${[C.coral.m, C.blue.m, C.yellow.m, C.green.m, C.grey.m][i % 5]}" ${ol(3)}/>`; }).join('')}
    <!-- shelves with toys -->
    <rect x="980" y="900" width="200" height="16" rx="6" fill="${C.coral.d}" ${ol(3)}/>
    <rect x="995" y="852" width="44" height="48" rx="8" fill="${C.blue.m}" ${ol(3)}/><circle cx="1075" cy="876" r="24" fill="${C.yellow.m}" ${ol(3)}/>
    <rect x="-100" y="1000" width="200" height="16" rx="6" fill="${C.coral.d}" ${ol(3)}/>
    <rect x="-60" y="950" width="50" height="50" rx="8" fill="${C.green.m}" ${ol(3)}/><rect x="0" y="962" width="40" height="38" rx="8" fill="${C.coral.m}" ${ol(3)}/>
    <!-- game cards and a ball in the middle of the circle -->
    <g transform="translate(560,1238)">
      <ellipse cx="0" cy="8" rx="120" ry="16" fill="${L}" opacity=".06"/>
      <rect x="-80" y="-14" width="44" height="30" rx="6" fill="#fff" ${ol(3)} transform="rotate(-12 -58 1)"/><circle cx="-58" cy="1" r="7" fill="${C.coral.m}"/>
      <rect x="-28" y="-10" width="44" height="30" rx="6" fill="#fff" ${ol(3)} transform="rotate(8 -6 5)"/><path d="M-12,6 L0,-2 L10,8" stroke="${C.blue.d}" stroke-width="4" fill="none"/>
      <rect x="22" y="-12" width="44" height="30" rx="6" fill="#fff" ${ol(3)} transform="rotate(-4 44 3)"/><circle cx="44" cy="3" r="7" fill="${C.green.d}"/>
      <circle cx="94" cy="-6" r="20" fill="${vol(C.yellow.m)}" ${ol()}/><path d="M76,-10 Q94,-20 112,-10" stroke="#fff" stroke-width="4" fill="none"/>
    </g>
    <!-- plant -->
    <path d="M1010,1150 L1000,1060 L1080,1060 L1070,1150 Z" fill="${C.coral.m}" ${ol()}/>
    ${blob([[1020, 1020, 26], [1060, 1010, 28], [1040, 985, 26]], C.green.m)}
  `;
  const RC = { x: 560, y: 1235, rx: 255, ry: 92 };
  const SEATS = [[-90, 'fac', C.blue.m], [-140, 'a', C.yellow.m], [-40, 'g', C.coral.m], [-170, 'c', C.green.m], [-10, 'b', C.grey.m], [160, 'e', C.blue.m], [20, 'hero', C.coral.m]]
    .map(([ang, k, c]) => ({ ang, k, c, x: RC.x + RC.rx * Math.cos(ang * RAD), y: RC.y + RC.ry * Math.sin(ang * RAD) }));
  const FREE = SEATS.find((q) => q.k === 'hero');
  const rDepth = (y) => 0.95 + ((y - 1140) / 200) * 0.2;
  const FAC = { skin: '#E6B48E', hair: 'long', hc: '#2B2220', shirt: '#7FC4C0', low: 'pants', pants: C.grey.d, shoe: C.coral.d };
  function chairSVG(x, y, s, c) {
    const w = LW / s;
    return `<g transform="translate(${f1(x)},${f1(y)}) scale(${f3(s)})">
      <ellipse cx="0" cy="4" rx="54" ry="9" fill="${L}" opacity=".12"/>
      <path d="M-34,-56 L-38,0 M34,-56 L38,0 M-22,-50 L-24,-4 M22,-50 L24,-4" stroke="${L}" stroke-width="${f2(w * 2.2)}" stroke-linecap="round"/>
      <path d="M-34,-56 L-38,0 M34,-56 L38,0" stroke="${shade(c, -0.2)}" stroke-width="${f2(w * 1.2)}" stroke-linecap="round"/>
      <rect x="-42" y="-172" width="84" height="104" rx="26" fill="${vol(c)}" stroke="${L}" stroke-width="${f2(w)}"/>
      <rect x="-48" y="-72" width="96" height="22" rx="11" fill="${vol(shade(c, -0.08))}" stroke="${L}" stroke-width="${f2(w)}"/></g>`;
  }

  // ------------------------------------------------------------------ choreography (seconds)
  const DOOR = [540, 1100];
  const T_DOOR = 1.35;
  //    spot x, y, leave time, curve bend (px, + to the right of the path)
  const SPOT = {
    a: [300, 1240, 1.4, -120], g: [690, 1250, 1.52, 110], d: [490, 1430, 1.62, -60], e: [710, 1430, 1.74, 90],
    b: [190, 1400, 1.85, -150], c: [408, 1440, 1.96, -70], f: [130, 1180, 2.08, -40],
  };
  const HERO = [930, 1330];
  // a and g play catch: release times, flight 0.85 s (ballistic arc)
  const PASS0 = 3.45, PASS = 1.2, FLIGHT = 0.85;
  const passes = Array.from({ length: 30 }, (_, i) => ({ r: PASS0 + i * PASS, c: PASS0 + i * PASS + FLIGHT, from: i % 2 ? 'g' : 'a', to: i % 2 ? 'a' : 'g' }));
  const LAND = 99;
  const BALL_REST = [868, 1392];
  const PICK = 99, JUMP = 99, CATCH = 99, CHEER = 99;
  const STEP = 5.75, STEP_END = 6.35, STEP_DX = -54;   // the boy's small step toward the game
  const WIN = [700, 985];                             // where he looks: the round window opens here (scene 3)

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
    if (k === 'a' || k === 'g') {
      // catch: open the arms before the ball arrives, squash on the catch;
      // throw: wind back (anticipation), release on a stretch, follow through
      let arms = POSE.hold, sq = 0, lean = 0, mouth = 'open';
      const other = k === 'a' ? SPOT.g : SPOT.a;
      const dir = Math.sign(other[0] - P.x);
      for (const ps of passes) {
        if (ps.to === k && t > ps.c - 0.55 && t < ps.c + 0.35) {
          arms = kf(t, [[ps.c - 0.55, POSE.rest], [ps.c - 0.08, POSE.up, EZ.out], [ps.c + 0.3, POSE.hold, EZ.over]]);
          sq = 0.14 * bump(t, ps.c + 0.04, 0.06); mouth = t < ps.c ? 'o' : 'grin';
        }
        if (ps.from === k && t > ps.r - 0.45 && t < ps.r + 0.5) {
          arms = kf(t, [[ps.r - 0.45, POSE.hold], [ps.r - 0.05, POSE.back, EZ.anti], [ps.r + 0.1, POSE.up, EZ.out], [ps.r + 0.5, POSE.rest, EZ.io]]);
          sq = kf(t, [[ps.r - 0.45, 0], [ps.r - 0.05, 0.12, EZ.anti], [ps.r + 0.08, -0.12, EZ.out], [ps.r + 0.45, 0, EZ.io]]);
          lean = kf(t, [[ps.r - 0.45, 0], [ps.r - 0.05, -7 * dir], [ps.r + 0.15, 9 * dir, EZ.out], [ps.r + 0.5, 0]]);
          mouth = 'grin';
        }
        const holding = (ps.to === k && t >= ps.c + 0.35 && t <= ps.r + PASS - 0.45) ;
        if (holding) { arms = POSE.hold; mouth = 'smile'; }
        if (ps.from === k && ps.r === PASS0 && t < ps.r - 0.45) arms = POSE.hold;
      }
      if (k === 'g' && t < PASS0 + FLIGHT - 0.55) arms = POSE.rest;
      P.arms = arms; P.sq = (P.sq || 0) + sq; P.lean = (P.lean || 0) + lean; P.mouth = mouth;
      P.look = [dir * 4 * (P.flip ? -1 : 1), -1.5];
      P.hairSw = (P.hairSw || 0) - lean * 1.2;
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
      const CH = [600, 1430, 110, 36];
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

  // the boy by the wall: curious (never sad), bounces on his toes, takes one small step, looks up at the wall
  function hero(t, ballXY) {
    const P = { x: HERO[0], y: HERO[1], s: depth(HERO[1]) * 1.03, blink: blinkAt(t, 0.31) };
    const breathe = Math.sin(t * TAU * 0.4) * 0.012;
    const st = prog(t, STEP, STEP_END), stE = EZ.io(st);
    P.x = HERO[0] + STEP_DX * stE;
    // anticipation (lean back, settle low) -> the step on an arc -> land with a squash -> follow-through
    P.lean = kf(t, [[0, 0], [3.6, 0], [4.2, -3, EZ.io], [5.2, -3], [STEP - 0.3, 0], [STEP, 4, EZ.anti], [STEP + 0.3, -6, EZ.io], [STEP_END, -2, EZ.io]]) + wob(t, STEP_END, -5, 2.2, 3.2);
    P.lift = Math.sin(Math.PI * st) * 10 + kf(t, [[0, 0], [4.85, 0], [4.97, 7, EZ.up], [5.09, 0, EZ.in], [5.21, 6, EZ.up], [5.33, 0, EZ.in]]);
    P.sq = breathe + kf(t, [[0, 0], [STEP - 0.3, 0], [STEP, 0.07, EZ.anti], [STEP + 0.1, -0.05, EZ.out], [STEP_END - 0.02, 0], [STEP_END + 0.06, 0.08, EZ.out], [STEP_END + 0.35, 0, EZ.io]])
      + 0.06 * (bump(t, 5.09, 0.04) + bump(t, 5.33, 0.04));
    // the stepping leg lifts and swings forward; the other stays planted
    const legLift = Math.sin(Math.PI * st);
    P.legs = [[-16 * legLift - 4 * stE + 4 * (1 - stE), -42 * legLift], [-4, 0]];
    P.arms = kf(t, [[0, POSE.straps], [STEP - 0.25, POSE.straps], [STEP + 0.15, [[-16, 22], [18, -30]], EZ.io], [STEP_END + 0.2, POSE.straps, EZ.io]]);
    P.tilt = kf(t, [[0, -3], [3.6, -3], [4.4, 4, EZ.io], [6.9, 4], [7.35, -7, EZ.io]]) + wob(t, STEP_END, 4, 2.4, 3);
    P.hairSw = -P.lean;
    // face: watches the game, gets excited, then looks up and to the side at the wall
    if (t < 6.9) {
      P.look = ballXY ? lookToward(P, ballXY[0], ballXY[1]) : [-3, 0];
      P.mouth = t > 4.8 && t < 5.4 ? 'grin' : t > STEP_END ? 'grin' : 'smile';
      P.brow = t > 4.6 ? 4 : 2;
    } else {
      P.look = lookToward(P, WIN[0], WIN[1]);
      P.mouth = 'smile'; P.brow = 6;
      if (t < 7.05) P.blink = Math.sin(Math.PI * prog(t, 6.9, 7.05));
    }
    return P;
  }


  // the room: the group already sits in a circle; the boy walks in, sits on the free chair, everyone waves
  const ENTER = 8.95, ARRIVE = 10.05, SIT = 10.25, WAVE = 10.45;
  function roomScene(t) {
    const items = [];
    for (const st of SEATS) {
      const s = rDepth(st.y);
      items.push([st.y - 0.5, chairSVG(st.x, st.y, s, st.c)]);
      if (st.k === 'hero') continue;
      const o = st.k === 'fac' ? FAC : KIDS[st.k];
      const sd = hash(st.ang + 7) * 6;
      const P = { x: st.x, y: st.y + 2, s: s * (st.k === 'fac' ? 1.1 : 1), sit: true, mouth: 'smile', blink: blinkAt(t, sd) };
      P.arms = [[-14, 70], [14, -70]];                               // hands on the lap
      P.sq = 0.012 * Math.sin(t * TAU * 0.45 + sd);
      P.tilt = 3 * Math.sin(t * 1.1 + sd);
      // everyone turns to the boy as he comes in (eyes lead, then the head: overlapping action)
      const watch = EZ.io(prog(t, ENTER + 0.2 + hash(sd) * 0.3, ENTER + 0.7 + hash(sd) * 0.3));
      const look = lookToward(P, FREE.x + 80, FREE.y - 240);
      P.look = mix([0, 0], look, watch);
      P.tilt += watch * clamp((FREE.x - st.x) / 60, -6, 6);
      P.brow = 3 * watch;
      // the welcome: staggered waves with a bounce on the seat, big smiles
      const w0 = WAVE + hash(sd + 1) * 0.35;
      if (t > w0) {
        const wt = t - w0, env = Math.min(1, wt / 0.25) * (1 - prog(t, 13.2, 13.8));
        const wv = Math.sin(wt * TAU * 1.6);
        P.arms = mix(P.arms, [[-14, 70], [150 + 18 * wv, -26 - 18 * wv]], env);
        if (st.k === 'fac') P.arms = mix([[-14, 70], [14, -70]], POSE.open, env * 0.8);
        P.lift = Math.max(0, Math.sin(wt * TAU * 1.2)) * 8 * env * Math.exp(-wt * 0.5);
        P.mouth = env > 0.3 ? 'grin' : 'smile';
        P.hairSw = -P.lift;
      }
      items.push([st.y, kid('r_' + st.k, o, P)]);
    }
    // the boy: walk in on a gentle arc, a little turn (anticipation), sit down with a squash, settle
    if (t > ENTER - 0.1) {
      const s = rDepth(FREE.y);
      const u = EZ.run(prog(t, ENTER, ARRIVE));
      const x0 = 1060, y0 = 1420, x1 = FREE.x + 6, y1 = FREE.y + 26;
      const cx = 960, cy = 1290;
      const x = (1 - u) ** 2 * x0 + 2 * (1 - u) * u * cx + u * u * x1, y = (1 - u) ** 2 * y0 + 2 * (1 - u) * u * cy + u * u * y1;
      const P = { x, y, s: rDepth(y), blink: blinkAt(t, 0.31), mouth: 'smile', brow: 3 };
      if (t < ARRIVE) {
        Object.assign(P, runPose(u * 360, 0.45 + 0.4 * Math.sin(Math.PI * prog(t, ENTER, ARRIVE))));
        P.flip = true; P.lean = 4; P.look = [-3, 0];
        P.arms = POSE.straps.map((a, i) => [a[0] + (i ? 6 : -6) * Math.sin(u * 20), a[1]]);
      } else {
        const sitE = EZ.in(prog(t, SIT, SIT + 0.2));
        P.x = lerp(x1, FREE.x, sitE); P.y = lerp(y1, FREE.y + 2, sitE);
        P.s = rDepth(P.y);
        P.arms = t < SIT + 0.1 ? POSE.straps : mix(POSE.straps, [[-14, 70], [14, -70]], EZ.io(prog(t, SIT + 0.1, SIT + 0.5)));
        if (t < SIT) {
          P.sq = kf(t, [[ARRIVE, 0], [SIT, 0.1, EZ.anti]]);
          P.lean = wob(t, ARRIVE, -5, 2.4, 4);
          P.look = [-3, 0];
        } else {
          P.sit = true;
          P.lift = 46 * (1 - sitE);
          P.sq = 0.18 * bump(t, SIT + 0.22, 0.07) + wob(t, SIT + 0.25, 0.05, 3, 6) + 0.012 * Math.sin(t * TAU * 0.45);
          P.look = t < WAVE + 0.2 ? [-3, 0] : [-2.5 * Math.sin(t * 1.3), -0.5];
          P.mouth = t > WAVE + 0.1 ? 'grin' : 'smile';
          P.tilt = wob(t, SIT + 0.2, 6, 2, 3) + 3 * Math.sin(t * 1.1);
          P.brow = 4;
        }
      }
      items.push([P.y + 0.6, kid('r_hero', KIDS.hero, P)]);
    }
    items.sort((p, q) => p[0] - q[0]);
    return items.map((i) => i[1]).join('');
  }

  // ------------------------------------------------------------------ the ball (ballistic arcs, squash on contact)
  function ball(t, pose) {
    const a = pose.a, g = pose.g;
    if (!a) return null;
    const holdAt = (P) => { const l = handWorld(P, -1), r = handWorld(P, 1); return [(l[0] + r[0]) / 2, (l[1] + r[1]) / 2 - 6]; };
    if (t < PASS0 || !g) return { p: holdAt(a), sq: 0, rot: 0 };
    for (const ps of passes) {
      if (t >= ps.r && t < ps.c) {
        const f = prog(t, ps.r, ps.c);
        const p0 = holdAt(pose[ps.from]), p1 = holdAt(pose[ps.to]);
        const p = [lerp(p0[0], p1[0], f), lerp(p0[1], p1[1], f) - 230 * 4 * f * (1 - f)];
        return { p, sq: -0.1 * Math.sin(Math.PI * f), rot: (ps.from === 'a' ? 1 : -1) * f * 400 };
      }
      if (t >= ps.c && t < ps.r + PASS) return { p: holdAt(pose[ps.to]), sq: 0.28 * bump(t, ps.c, 0.05), rot: 0 };
    }
    return null;
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
    <svg id="roomLayer" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}" style="position:absolute;left:0;top:0">
      <defs><clipPath id="winClip"><circle id="winClipC" cx="0" cy="0" r="0"/></clipPath></defs>
      <g clip-path="url(#winClip)"><rect width="${SW}" height="${SH}" fill="${C.blue.l}"/><g id="room">${ROOM_BG}<g id="roomKids"></g></g></g>
      <g id="ring"></g>
    </svg>
    <svg id="leaders" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}"></svg>
    <div id="ui">
      <div class="tl cap1" id="c1" style="top:262px">${mw('הצלצול להפסקה.')}</div>
      <div class="tl cap2" id="c2" style="top:384px">${mw('הרגע הכי ארוך ביום שלו.')}</div>
      <div class="lab" id="lab1">הפסקה</div>
      <div class="lab" id="lab2">צעד קטן</div>
      <div class="lab" id="lab3">יש לו מקום</div>
      <div id="plate" style="position:absolute;left:70px;right:70px;top:272px;height:268px;border-radius:44px;background:var(--paper);border:3px solid var(--ink)"></div>
      <div class="tl cap1 end" id="r1" style="top:300px">${mw('חברות היא מיומנות.')}</div>
      <div class="tl cap1 end" id="r2" style="top:420px;color:${C.coral.d}">${mw('אפשר לתרגל אותה.')}</div>
    </div>
    <div id="grain"></div>`;
  const $ = (id) => document.getElementById(id);
  const world = $('world'), kidsG = $('kids'), ballG = $('ballG'), ballIn = $('ballIn'), bell = $('bell'), clapper = $('clapper'), wavesG = $('waves'), leaders = $('leaders'), dustG = $('dust');
  $('grain').style.backgroundImage = 'url(@@GRAIN@@)';
  wavesG.innerHTML = [0, 1, 2].map((i) => [-1, 1].map((sx) => `<path class="wv" data-i="${i}" pathLength="1" d="M${540 + sx * (54 + i * 26)},${540 - i * 6} Q${540 + sx * (72 + i * 30)},590 ${540 + sx * (54 + i * 26)},${640 + i * 6}"/>`).join('')).join('');

  // ------------------------------------------------------------------ camera (keyframed, slow in / slow out)
  function camera(t) {
    // [scale, focus x, focus y]: the focus point lands at screen (540, 1000).
    const k = kf(t, [[0, [1.0, 540, 1000]], [4.4, [1.035, 545, 1005], EZ.io], [6.3, [1.5, 860, 1170], EZ.io], [7.75, [1.62, 820, 1140], EZ.io], [8.8, [4.0, WIN[0], WIN[1]], cb(0.55, 0, 0.25, 1)], [11.4, [4.0, WIN[0], WIN[1]]], [12.9, [3.25, WIN[0], WIN[1] - 24], EZ.io], [14.2, [3.2, WIN[0], WIN[1] - 25], EZ.io]]);
    return { s: k[0], fx: k[1], fy: k[2], dy: 0 };
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
    const ringT = 0.5;
    const pre = kf(t, [[0, 0], [0.12, 0], [ringT - 0.05, -10, EZ.anti], [ringT, 0, EZ.in]]);
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
    const rattle = t > 0.85 && t < T_DOOR ? Math.sin(t * TAU * 9) * 0.03 * prog(t, 0.85, T_DOOR) : 0;
    const open = sp(t, T_DOOR, SPR.door);
    const ds = clamp(1 - 0.86 * open + rattle, 0.06, 1.05);
    $('doorL').setAttribute('transform', `translate(478,0) scale(${f3(ds)},1) translate(-478,0)`);
    $('doorR').setAttribute('transform', `translate(602,0) scale(${f3(ds)},1) translate(-602,0)`);

    // kids, the boy, the ball
    const { out, pose } = yardKids(t);
    const preBall = ball(t, pose);
    const heroP = hero(t, preBall ? preBall.p : null);
    out.push(['hero', heroP]);
    const B = preBall;
    out.sort((p, q) => p[1].y - q[1].y);
    const yardFade = f2(1 - prog(cam.s, 2.0, 2.9));
    kidsG.style.opacity = yardFade; ballG.style.opacity = yardFade;
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

    // the round cutaway: opens from the point the boy looks at (overshoot), the camera goes in, it stays open as a frame
    const RW = 120;
    const openK = t < 7.55 ? 0 : clamp(sp(t, 7.55, { stiffness: 210, damping: 13 }), 0, 1.2);
    const rS = RW * cam.s * openK;
    const [wcx, wcy] = toScreen(cam, WIN[0], WIN[1]);
    const roomOn = rS > 1;
    $('roomLayer').style.display = roomOn ? '' : 'none';
    let roomV = null;
    if (roomOn) {
      $('winClipC').setAttribute('cx', f1(wcx)); $('winClipC').setAttribute('cy', f1(wcy)); $('winClipC').setAttribute('r', f1(rS));
      const rv = kf(t, [[0, [520, 560, 1110]], [8.8, [330, 575, 1120], EZ.io], [9.6, [320, 600, 1125], EZ.io], [11.4, [318, 605, 1128]], [12.9, [345, 560, 1118], EZ.io]]);
      const rs = rS / rv[0];
      roomV = { s: rs, fx: rv[1], fy: rv[2], cx: wcx, cy: wcy };
      $('room').setAttribute('transform', `translate(${f2(wcx - rv[1] * rs)},${f2(wcy - rv[2] * rs)}) scale(${f3(rs)})`);
      $('roomKids').innerHTML = roomScene(t);
      const sparks = [];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + 0.3, d = t - 7.62 - (i % 3) * 0.05;
        if (d < 0 || d > 0.6) continue;
        const r = rS + 20 + EZ.out(d / 0.6) * 70;
        sparks.push(`<circle cx="${f1(wcx + Math.cos(a) * r)}" cy="${f1(wcy + Math.sin(a) * r)}" r="${f1(9 * (1 - d / 0.6) + 2)}" fill="${[C.yellow.m, C.coral.m, C.blue.m][i % 3]}" stroke="${L}" stroke-width="3" opacity="${f2(1 - d / 0.6)}"/>`);
      }
      $('ring').innerHTML = `<circle cx="${f1(wcx)}" cy="${f1(wcy)}" r="${f1(rS + 12)}" fill="none" stroke="${L}" stroke-width="${LW}"/>
        <circle cx="${f1(wcx)}" cy="${f1(wcy)}" r="${f1(rS + 6)}" fill="none" stroke="${C.yellow.m}" stroke-width="12"/>
        <circle cx="${f1(wcx)}" cy="${f1(wcy)}" r="${f1(rS)}" fill="none" stroke="${L}" stroke-width="${LW}"/>${sparks.join('')}`;
    }
    const pk = sp(t, 11.6, SPR.ui);
    $('plate').style.opacity = f2(clamp(pk * 1.5));
    $('plate').style.transform = `translateY(${f1((1 - pk) * 30)}px) scale(${f3(0.92 + 0.08 * pk)})`;
    words($('r1'), t, 11.75, 0.16);
    words($('r2'), t, 12.75, 0.16);

    // captions (the hook), then they clear the frame for the push-in
    words($('c1'), t, 0.6);
    words($('c2'), t, 1.9);
    $('ui').querySelectorAll('.tl:not(.end)').forEach((n) => { n.style.opacity = f2(1 - EZ.io(prog(t, 4.9, 5.4))); });

    const IDCAM = { s: 1, fx: 540, fy: 1000, dy: 0 };
    const chairScr = roomV ? [roomV.cx + (FREE.x - roomV.fx) * roomV.s, roomV.cy + (FREE.y - 150 * rDepth(FREE.y) - roomV.fy) * roomV.s] : [0, 0];
    leaders.innerHTML = label('lab1', t, 2.6, 4.45, [610, 1310], [96, 520], cam) + label('lab2', t, STEP + 0.05, 7.55, [HERO[0] + STEP_DX - 10, HERO[1] + 4], [650, 1290], cam)
      + label('lab3', t, 9.15, 11.45, chairScr, [700, 360], IDCAM);
  }

  // ------------------------------------------------------------------ sound on picture
  function hits() {
    const P = GRID.period, OFF = GRID.offset;
    const u = (s) => (s - OFF) / P;
    const H = [];
    const add = (s, label, sfx, o) => H.push([u(s), label, sfx, o]);
    [0, 0.42, 0.84].forEach((d, i) => add(0.5 + d, `bell ${i + 1}`, 'bell', { pitch: i % 2 ? 'A5' : 'D6', gain: 0.22 - i * 0.04 }));
    add(0.6, 'caption 1', 'blip', { pitch: 'A5', gain: 0.06 });
    add(1.9, 'caption 2', 'blip', { pitch: 'D6', gain: 0.06 });
    add(T_DOOR, 'doors burst open', 'whoosh', { len: 0.4, from: 300, to: 1800, gain: 0.13 });
    Object.entries(SPOT).forEach(([k, s], i) => add(s[2] + 0.4, `${k} lands`, 'pop', { pitch: ['D5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6'][i], gain: 0.07 }));
    passes.filter((p) => p.c < 7.6).forEach((p, i) => add(p.c, `catch ${i + 1}`, 'tok', { pitch: i % 2 ? 'F#5' : 'A5', gain: 0.09 }));
    add(2.6, 'label', 'blip', { pitch: 'E6', gain: 0.05 });
    add(STEP_END, 'small step', 'tok', { pitch: 'D5', gain: 0.14 });
    add(6.9, 'looks up', 'blip', { pitch: 'B5', gain: 0.07 });
    add(7.55, 'window opens', 'pop', { pitch: 'D6', gain: 0.16 });
    add(7.9, 'into the window', 'whoosh', { len: 0.8, from: 300, to: 2000, gain: 0.12 });
    add(9.15, 'label chair', 'blip', { pitch: 'A5', gain: 0.06 });
    add(SIT + 0.22, 'he sits', 'pop', { pitch: 'A5', gain: 0.2 });
    [0, 0.15, 0.3].forEach((d, i) => add(WAVE + d, `wave ${i + 1}`, 'blip', { pitch: ['D6', 'F#6', 'A6'][i], gain: 0.06 }));
    add(11.75, 'end line 1', 'blip', { pitch: 'A5', gain: 0.08 });
    add(12.75, 'end line 2', 'bell', { pitch: 'D6', gain: 0.14 });
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
