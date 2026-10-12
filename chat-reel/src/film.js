// "צ'אט של אמא": a 40 s 9:16 reel for Merkaz Dialog's "קבוצת חברים". Pure function of time:
// window.seek(t) sets every style from t alone (no timers, transitions or state between frames).
// Part A (0-22.5 s): a mother and her son's class teacher chat on a phone. Part B: out of the phone,
// the group explained (built next). Layout is measured once at boot; motion uses closed-form springs.
/* global GRID, ICONS */

(() => {
  const PARAMS = new URLSearchParams(location.search);
  const RENDER = PARAMS.get('render') === '1';
  const PREVIEW = PARAMS.get('preview') === '1' || window.AUTOPLAY === true;
  const DURATION = 43.5;
  const SW = 1080, SH = 1920;

  // ------------------------------------------------------------------ math
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const f1 = (n) => n.toFixed(1), f2 = (n) => n.toFixed(2), f3 = (n) => n.toFixed(3);
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
  const EZ = { io: cb(0.65, 0, 0.35, 1), out: cb(0.16, 1, 0.3, 1), expand: cb(0.7, 0, 0.2, 1) };
  function spring(t, { stiffness = 170, damping = 18, mass = 1 } = {}) {
    if (t <= 0) return 0;
    const w0 = Math.sqrt(stiffness / mass), z = damping / (2 * Math.sqrt(stiffness * mass));
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  const SPR = { pop: { stiffness: 380, damping: 22 }, ui: { stiffness: 300, damping: 26 }, scroll: { stiffness: 180, damping: 24 }, phone: { stiffness: 120, damping: 15 } };
  const sp = (t, t0, cfg = SPR.ui) => spring(t - t0, cfg);

  // ------------------------------------------------------------------ the conversation (seconds)
  // who: 'out' = the mother (this phone), 'in' = the class teacher. type: when the typing starts.
  const MSGS = [
    { who: 'out', at: 1.05, type: 0.4, text: 'היי, אפשר שאלה קטנה?' },
    { who: 'in', at: 2.3, type: 1.6, text: 'בטח' },
    { who: 'out', at: 4.3, type: 3.3, text: 'יואב חוזר כל יום שקט מבית הספר. היום הוא סיפר לי שבהפסקה אין לו עם מי לשחק' },
    { who: 'in', at: 7.7, type: 6.8, text: 'שמתי לב. הוא ילד מקסים, פשוט קשה לו קצת להצטרף למשחק' },
    { who: 'out', at: 11.0, type: 10.0, text: 'מה אפשר לעשות? ניסיתי להפגיש אותו עם חבר והוא לא היה מוכן.' },
    { who: 'in', at: 14.3, type: 13.4, text: 'אני חושבת שכדאי לשקול להצטרף לקבוצה לפיתוח מיומנויות חברתיות.' },
    { who: 'out', at: 17.05, type: 16.55, text: 'מה זה בדיוק?' },
    { who: 'in', at: 17.9, type: 17.35, text: 'שולחת לך לינק' },
    { who: 'in', at: 18.55, type: 18.1, card: true },
  ];
  const TAP = 19.85, EXP0 = 20.1, EXP1 = 21.45;
  // part B (out of the phone): scene windows in seconds, items land on the beat grid (0.625 s)
  const B0 = 22.5, END0 = 41.85;
  const SC = { s1: [22.85, 25.3], s2: [25.3, 29.5], s3: [29.5, 32.7], s4: [32.7, 35.7], s5: [35.7, 39.7], s6: [39.7, END0] };
  const FOR = ['דימוי וביטחון עצמי', 'יכולת ליזום ולהשתלב חברתית', 'חרדה חברתית או ביישנות', 'הבנה וניתוח של מצבים חברתיים', 'תסכול וקושי בניהול קונפליקטים', 'גמישות מחשבתית וחשיבה חיובית'];
  const DO = [['puzzle', 'משחקים ופעילויות'], ['drama', 'משחקי תפקידים וסימולציות'], ['messages-square', 'שיח במרחב בטוח'], ['heart-handshake', 'הדרכת הורים']];
  const INFO = [['school', 'כיתות א׳–ו׳', 'שלוש קבוצות גיל'], ['users', 'עד 8 ילדים', 'בכל קבוצה'], ['calendar-days', 'ימי רביעי', 'אחר הצהריים'], ['map-pin', 'קריית אתא', 'שלום עליכם 5']];
  const BUB = ['#FDE3D8', '#E2F1FB', '#E8F4E0', '#FFF6C4', '#FDE3D8', '#E2F1FB'];
  const T_FOR = (i) => 25.65 + i * 0.3125, T_DO = (i) => 29.85 + i * 0.3125, T_INFO = (i) => 33.0 + i * 0.3125;
  const CLOCK = ['16:41', '16:41', '16:42', '16:42', '16:43', '16:43', '16:44', '16:44', '16:44'];

  // ------------------------------------------------------------------ DOM
  const ic = (name) => `<svg class="i" viewBox="0 0 24 24">${ICONS[name]}</svg>`;
  const LOGO_PATH = 'M56.7,35 C40,46.7 38.3,76.7 58.3,96.7 C70,108.3 83.3,116.7 92.7,124 L68.3,156.7 C65,161.7 68.3,165 75,163.3 L146.7,138.3 C173.3,136.7 200,133.3 217.3,120';
  const LOGO_DOTS = [[85, 63.3, 23.3, '#E98560'], [124.3, 106.7, 23.3, '#E5E783'], [148.3, 48.3, 19, '#6EB8EE'], [183.3, 100, 19, '#AFD6A5'], [195.7, 25, 15.7, '#A2ABBD']];
  const logoSVG = (id, w) => `<svg id="${id}" viewBox="0 0 243 183" width="${w}" height="${(w * 183) / 243}" style="overflow:visible">
    <path class="lstroke" d="${LOGO_PATH}" pathLength="1" fill="none" stroke="#4E4B5D" stroke-width="7.4" stroke-linejoin="round" stroke-linecap="round"/>
    ${LOGO_DOTS.map(([x, y, r, c]) => `<circle class="ld" cx="${x}" cy="${y}" r="${r}" fill="${c}" style="transform-box:fill-box;transform-origin:center"/>`).join('')}</svg>`;
  const ticks = `<svg class="ticks" viewBox="0 0 34 20"><path d="M2,11 L8,17 L19,4 M14,15 L16,17 L27,4" fill="none" stroke="#4A90B8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const mwk = (ws) => ws.map(([w, c]) => `<span class="mask"><span class="wd${c ? ' ' + c : ''}">${w}</span></span>`).join(' ');
  const msgHTML = (m, i) => m.card
    ? `<div class="msg in card" id="m${i}"><div class="pv">
         <div class="pvblob" style="width:220px;height:220px;left:-60px;top:-70px;background:#C0DFAE;opacity:.6"></div>
         <div class="pvblob" style="width:180px;height:180px;right:-40px;bottom:-60px;background:#90C6E9;opacity:.55"></div>
         ${logoSVG('pvLogo', 220)}</div>
         <div class="ttl">קבוצת חברים · מרכז דיאלוג</div>
         <div class="dsc">חברות היא מיומנות שאפשר ללמוד ולתרגל</div>
         <div class="dom">merkazdialog.com</div>
         <div class="meta"><span>${CLOCK[i]}</span></div></div>`
    : `<div class="msg ${m.who}" id="m${i}">${m.text}<div class="meta"><span>${CLOCK[i]}</span>${m.who === 'out' ? ticks : ''}</div></div>`;

  const stage = document.getElementById('stage');
  stage.innerHTML = `
    <div class="abs" id="bg" style="width:1080px;height:1920px">
      <div class="blob" id="b1" style="width:520px;height:520px;left:-180px;top:-120px;background:#FDE3D8"></div>
      <div class="blob" id="b2" style="width:420px;height:420px;left:780px;top:420px;background:#E2F1FB"></div>
      <div class="blob" id="b3" style="width:460px;height:460px;left:-120px;top:1500px;background:#E8F4E0"></div>
      <div class="blob" id="b4" style="width:300px;height:300px;left:860px;top:1560px;background:#FFF6C4"></div>
    </div>
    <div id="phone"><div id="screen">
      <div id="notch"></div>
      <div id="status"><span>16:44</span><span style="display:flex;gap:10px;align-items:center"><span style="font-size:24px">5G</span><span class="bat"></span></span></div>
      <div id="header"><div id="avatar">מ</div><div id="who"><div class="name">המחנכת של יואב</div><div class="st" id="st">מחוברת</div></div><div class="back">${ic('chevron-left')}</div></div>
      <div id="view"><div id="list"><div class="day">היום</div>${MSGS.map(msgHTML).join('')}</div></div>
      <div id="inputbar"><div id="field"></div><div id="send"><span style="display:grid;transform:scaleX(-1)">${ic('send-horizontal')}</span></div></div>
    </div></div>
    <div id="ripple"></div><div id="touch"></div>
    <div id="expand"><div class="inner">${logoSVG('exLogo', 300)}<div class="big">קבוצת חברים</div><div class="sub">מרכז דיאלוג</div></div></div>
    <div id="partB">
      <div class="scene" id="s1">
        <div class="bl bl1" style="top:780px">${mwk([['חברות'], ['היא'], ['מיומנות.', 'k']])}</div>
        <div class="bl bl2" style="top:930px">${mwk([['אפשר'], ['ללמוד'], ['ולתרגל', 'k'], ['אותה.']])}</div>
      </div>
      <div class="scene" id="s2">
        <div class="hd" style="top:520px">${mwk([['למי'], ['זה'], ['מתאים?']])}</div>
        <div class="bubs">${FOR.map((f, i) => `<div class="bub ${i % 2 ? 'l' : 'r'}" id="for${i}" style="background:${BUB[i]}">${f}</div>`).join('')}</div>
      </div>
      <div class="scene" id="s3">
        <div class="hd" style="top:520px">${mwk([['מה'], ['עושים'], ['בקבוצה?']])}</div>
        ${DO.map(([icn, txt], i) => `<div class="tile" id="do${i}" style="left:${i % 2 ? 90 : 560}px;top:${680 + Math.floor(i / 2) * 330}px"><div class="ico" style="background:${BUB[i]}">${ic(icn)}</div><div class="tt">${txt}</div></div>`).join('')}
        <div class="note" id="doNote" style="top:1360px">המנחה בונה לכל ילד תוכנית אישית</div>
      </div>
      <div class="scene" id="s4">
        <div class="hd" style="top:520px">${mwk([['הפרטים']])}</div>
        ${INFO.map(([icn, a, b], i) => `<div class="tile" id="info${i}" style="left:${i % 2 ? 90 : 560}px;top:${680 + Math.floor(i / 2) * 340}px"><div class="ico" style="background:${BUB[i]}">${ic(icn)}</div><div class="tt">${a}</div><div class="ts">${b}</div></div>`).join('')}
      </div>
      <div class="scene" id="s5">
        <div id="sgPhoto"><img src="@@SIGAL@@" alt=""></div>
        <div class="sgK" id="sgK">בהנחיית</div>
        <div class="sgN" id="sgN">סיגל וצלר</div>
        <div class="sgB" id="sgB1">מטפלת רגשית — פסיכותרפיסטית באמצעות משחק ו-<bdi>LI-CBT</bdi> מדריכת הורים ומנחה קבוצות הורים וילדים.</div>
        <div class="sgB" id="sgB2">בעלת תואר ראשון ושני (<bdi>M.A</bdi>) בחינוך לגיל הרך.</div>
      </div>
      <div class="scene" id="s6">
        <div class="dK" id="dK" style="top:560px">פתיחה</div>
        <div class="dD" id="dD" style="top:630px"><bdi>18.11</bdi></div>
        <div class="chip" id="dR" style="top:960px;background:#C46A5C;color:#fff">הרשמה עד <bdi>11.11</bdi></div>
        <div class="chip" id="dL" style="top:1130px;background:#E2F1FB;color:#3A3848"><span class="arw">${ic('arrow-up')}</span>הקישור בביו</div>
        <div class="dW" id="dW" style="top:1300px">או בוואטסאפ <bdi>050-6133093</bdi></div>
      </div>
    </div>
    <div id="grain"></div>`;
  const $ = (id) => document.getElementById(id);
  const el = { phone: $('phone'), list: $('list'), view: $('view'), st: $('st'), field: $('field'), send: $('send'), touch: $('touch'), ripple: $('ripple'), expand: $('expand') };
  $('grain').style.backgroundImage = 'url(@@GRAIN@@)';
  const msgEls = MSGS.map((_, i) => $(`m${i}`));

  // ------------------------------------------------------------------ layout, measured once
  let LAY = null;
  function measure() {
    const viewH = el.view.clientHeight;
    const bottoms = msgEls.map((m) => m.offsetTop + m.offsetHeight + 30);
    const target = bottoms.map((b) => Math.max(0, b - viewH));
    LAY = { viewH, target };
  }
  const scrollAt = (t) => {
    let s = 0, prev = 0;
    MSGS.forEach((m, i) => { const d = LAY.target[i] - prev; prev = LAY.target[i]; s += d * clamp(sp(t, m.at - 0.05, SPR.scroll), 0, 1.04); });
    return s;
  };

  // phone-space to stage-space for the card (the phone is not transformed while the card is tapped)
  function cardRect(t) {
    const card = msgEls[MSGS.length - 1];
    const ph = el.phone, sc = $('screen');
    const x = ph.offsetLeft + sc.offsetLeft + el.view.offsetLeft + el.list.offsetLeft + card.offsetLeft;
    const y = ph.offsetTop + sc.offsetTop + el.view.offsetTop + card.offsetTop - scrollAt(t);
    return { x, y, w: card.offsetWidth, h: card.offsetHeight };
  }

  // ------------------------------------------------------------------ the frame
  function apply(t) {
    applyB(t);
    // background blobs drift slowly
    [['b1', 0.3, 40], ['b2', 0.25, 30], ['b3', 0.2, 36], ['b4', 0.35, 26]].forEach(([id, f, a], i) => {
      $(id).style.transform = `translate(${f1(a * Math.sin(t * f + i))}px, ${f1(a * Math.cos(t * f * 0.8 + i * 2))}px)`;
    });

    // the phone rises in, then gives way to the card
    const pin = sp(t, 0, SPR.phone);
    const away = EZ.io(prog(t, EXP0, EXP1));
    el.phone.style.transform = `translateY(${f1((1 - pin) * 700 + away * 60)}px) scale(${f3(0.96 + 0.04 * clamp(pin) - 0.08 * away)})`;
    el.phone.style.opacity = f2(clamp(pin * 2) * (1 - prog(t, EXP1 - 0.3, EXP1)));

    // messages pop in from their corner (spring), the list scrolls up under them
    MSGS.forEach((m, i) => {
      const e = msgEls[i];
      const k = sp(t, m.at, SPR.pop);
      const on = t >= m.at;
      e.style.visibility = on ? 'visible' : 'hidden';
      if (!on) return;
      e.style.transformOrigin = m.who === 'out' ? '0% 100%' : '100% 100%';
      e.style.transform = `translateY(${f1((1 - clamp(k)) * 26)}px) scale(${f3(0.82 + 0.18 * k)})`;
      e.style.opacity = f2(clamp(k * 2.2));
    });
    el.list.style.transform = `translateY(${f1(-scrollAt(t))}px)`;

    // the teacher types: status line in the header
    const typingIn = MSGS.find((m) => m.who === 'in' && t >= m.type && t < m.at);
    if (typingIn) {
      const n = 1 + Math.floor(((t - typingIn.type) * 3) % 3);
      el.st.textContent = 'מקלידה' + '.'.repeat(n);
      el.st.className = 'st typing';
    } else { el.st.textContent = 'מחוברת'; el.st.className = 'st'; }

    // the mother types in the input field, then sends (the send button pops)
    const typingOut = MSGS.find((m) => m.who === 'out' && t >= m.type && t < m.at);
    if (typingOut) {
      const txt = typingOut.text;
      const n = Math.round(txt.length * clamp((t - typingOut.type) / (typingOut.at - typingOut.type - 0.12)));
      const shown = txt.slice(Math.max(0, n - 26), n);
      el.field.innerHTML = `<span>${n > 26 ? '…' : ''}${shown}</span><span class="caret" style="opacity:${((t * 2.2) % 1) < 0.6 ? 1 : 0}"></span>`;
    } else el.field.innerHTML = '<span class="ph">הודעה</span>';
    let press = 0;
    MSGS.forEach((m) => { if (m.who === 'out') press = Math.max(press, Math.exp(-(((t - m.at + 0.04) / 0.07) ** 2))); });
    el.send.style.transform = `scale(${f3(1 - 0.16 * press)})`;

    // the tap on the link card
    const r = cardRect(Math.min(t, TAP));
    const tx = r.x + r.w * 0.5, ty = r.y + 150;
    const tin = sp(t, TAP - 0.45, SPR.ui), tout = 1 - prog(t, TAP + 0.15, TAP + 0.4);
    const touchOn = t > TAP - 0.45 && t < TAP + 0.4;
    el.touch.style.display = touchOn ? '' : 'none';
    if (touchOn) {
      const pressK = Math.exp(-(((t - TAP) / 0.08) ** 2));
      el.touch.style.transform = `translate(${f1(tx + (1 - tin) * 120)}px, ${f1(ty + (1 - tin) * 160)}px) scale(${f3(1 - 0.25 * pressK)})`;
      el.touch.style.opacity = f2(clamp(tin) * tout);
    }
    const rp = prog(t, TAP, TAP + 0.5);
    el.ripple.style.display = rp > 0 && rp < 1 ? '' : 'none';
    if (rp > 0 && rp < 1) { el.ripple.style.transform = `translate(${f1(tx)}px, ${f1(ty)}px) scale(${f3(1 + EZ.out(rp) * 2.2)})`; el.ripple.style.opacity = f2(1 - rp); }
    const cardPress = Math.exp(-(((t - TAP - 0.03) / 0.09) ** 2));
    if (t > TAP - 0.2 && t < EXP0) msgEls[MSGS.length - 1].style.transform = `scale(${f3(1 - 0.03 * cardPress)})`;

    // the card leaves the phone: it grows from its place in the chat to the whole frame
    const ex = EZ.expand(prog(t, EXP0, EXP1));
    const exOn = t >= EXP0;
    el.expand.style.display = exOn ? '' : 'none';
    msgEls[MSGS.length - 1].style.opacity = exOn ? '0' : msgEls[MSGS.length - 1].style.opacity;
    if (exOn) {
      const rr = cardRect(EXP0);
      const x = lerp(rr.x, 0, ex), y = lerp(rr.y, 0, ex), w = lerp(rr.w, SW, ex), h = lerp(rr.h, SH, ex);
      Object.assign(el.expand.style, { transform: `translate(${f1(x)}px, ${f1(y)}px)`, width: `${f1(w)}px`, height: `${f1(h)}px`, borderRadius: `${f1(34 * (1 - ex))}px` });
      const inner = el.expand.querySelector('.inner');
      const ik = sp(t, EXP0 + 0.5, SPR.pop);
      const toHead = EZ.io(prog(t, B0, B0 + 0.6)), back = sp(t, END0, { stiffness: 170, damping: 16 });
      const hs = lerp(1, 0.42, toHead) + (1.04 - 0.42) * back * toHead;
      const hy = lerp(0, -620, toHead) * (1 - back);
      inner.style.transform = `translateY(${f1(hy)}px) scale(${f3(lerp(0.32, 1, ex) * (0.94 + 0.06 * clamp(ik)) * hs)})`;
      // the card colour settles into the paper background for part B
      const pb = EZ.io(prog(t, B0, B0 + 0.6));
      el.expand.style.background = `rgba(253,227,216,${f2(1 - pb)})`;
      inner.style.opacity = f2(clamp(ex * 1.5));
      // the logo draws itself again once the card fills the frame
      const lg = $('exLogo');
      lg.querySelector('.lstroke').style.strokeDasharray = '1';
      lg.querySelector('.lstroke').style.strokeDashoffset = f3(1 - EZ.out(prog(t, EXP1 - 0.2, EXP1 + 1.0)));
      lg.querySelectorAll('.ld').forEach((d, i) => { d.style.transform = `scale(${f3(clamp(sp(t, EXP1 + 0.2 + i * 0.12, SPR.pop), 0, 1.3) * (1 + 0.35 * Math.exp(-(((t - END0 - 0.25 - i * 0.12) / 0.09) ** 2))))})`; });
    }
  }

  function applyB(t) {
    // ---------------- part B
    const sceneK = (id) => {
      const [a, b] = SC[id];
      const on = t > a - 0.05 && t < b;
      const n = $(id);
      n.style.display = on ? '' : 'none';
      if (!on) return null;
      const out = EZ.io(prog(t, b - 0.3, b));
      n.style.opacity = f2(1 - out);
      n.style.transform = `translateY(${f1(-70 * out)}px)`;
      return n;
    };
    const pop = (node, t0, { dy = 50, s0 = 0.7, cfg = SPR.pop, base = '' } = {}) => {
      const k = sp(t, t0, cfg);
      node.style.opacity = f2(clamp(k * 2.2));
      node.style.transform = `${base} translateY(${f1((1 - k) * dy)}px) scale(${f3(s0 + (1 - s0) * k)})`;
    };
    const rise = (node, t0, step = 0.11) => node.querySelectorAll('.wd').forEach((w, i) => {
      const k = sp(t, t0 + i * step, SPR.pop);
      w.style.transform = `translateY(${f1((1 - k) * 120)}%)`;
    });
    $('partB').style.display = t > B0 ? '' : 'none';
    if (t > B0) {
      let n;
      if ((n = sceneK('s1'))) { rise(n.querySelector('.bl1'), 22.95); rise(n.querySelector('.bl2'), 23.9); }
      if ((n = sceneK('s2'))) {
        rise(n.querySelector('.hd'), 25.3);
        FOR.forEach((_, i) => { const b = $(`for${i}`); b.style.transformOrigin = i % 2 ? '0% 100%' : '100% 100%'; pop(b, T_FOR(i), { dy: 30, s0: 0.6 }); });
      }
      if ((n = sceneK('s3'))) {
        rise(n.querySelector('.hd'), 29.5);
        DO.forEach((_, i) => {
          const k = sp(t, T_DO(i), { stiffness: 220, damping: 16 });
          const c = $(`do${i}`);
          c.style.opacity = f2(clamp(k * 2.5));
          c.style.transform = `perspective(1200px) rotateY(${f1((1 - k) * 90)}deg) scale(${f3(0.85 + 0.15 * k)})`;
        });
        pop($('doNote'), 31.3, { dy: 30, s0: 0.95 });
      }
      if ((n = sceneK('s4'))) {
        rise(n.querySelector('.hd'), 32.7);
        INFO.forEach((_, i) => pop($(`info${i}`), T_INFO(i), { dy: 70, s0: 0.75 }));
      }
      if ((n = sceneK('s5'))) {
        pop($('sgPhoto'), 35.85, { dy: 40, s0: 0.55, base: 'translateX(-50%)' });
        pop($('sgK'), 36.25, { dy: 30, s0: 0.95 });
        pop($('sgN'), 36.45, { dy: 40, s0: 0.9 });
        pop($('sgB1'), 36.9, { dy: 30, s0: 0.97, cfg: SPR.ui });
        pop($('sgB2'), 37.4, { dy: 30, s0: 0.97, cfg: SPR.ui });
      }
      if ((n = sceneK('s6'))) {
        pop($('dK'), 39.85, { dy: 30, s0: 0.95 });
        pop($('dD'), 40.15, { dy: 80, s0: 0.5, cfg: { stiffness: 300, damping: 15 } });
        pop($('dR'), 40.6, { dy: 60, s0: 0.7, base: 'translateX(50%)' });
        pop($('dL'), 40.95, { dy: 60, s0: 0.7, base: 'translateX(50%)' });
        pop($('dW'), 41.25, { dy: 30, s0: 0.95 });
        $('dL').querySelector('.arw').style.transform = `translateY(${f1(-10 * Math.abs(Math.sin(t * TAU * 0.8)))}px)`;
      }
    }
  }

  // ------------------------------------------------------------------ sound on picture
  function hits() {
    const P = GRID.period, OFF = GRID.offset;
    const u = (s) => (s - OFF) / P;
    const H = [];
    const add = (s, label, sfx, o) => H.push([u(s), label, sfx, o]);
    add(0.05, 'phone in', 'whoosh', { len: 0.5, from: 300, to: 1400, gain: 0.08 });
    MSGS.forEach((m, i) => {
      if (m.who === 'out') {
        const n = Math.max(3, Math.round((m.at - m.type) * 9));
        for (let k = 0; k < n; k++) add(m.type + (k / n) * (m.at - m.type - 0.12), `type ${i}.${k}`, 'tick', { gain: 0.035 });
        add(m.at, `sent ${i + 1}`, 'blip', { pitch: 'A5', gain: 0.1 });
      } else add(m.at, `received ${i + 1}`, 'pop', { pitch: m.card ? 'D6' : 'F#5', gain: 0.13 });
    });
    add(TAP, 'tap', 'tok', { pitch: 'D5', gain: 0.14 });
    add(EXP0 + 0.05, 'card leaves the phone', 'whoosh', { len: 0.9, from: 300, to: 2200, gain: 0.14 });
    LOGO_DOTS.forEach((_, i) => add(EXP1 + 0.2 + i * 0.12, `logo dot ${i + 1}`, 'pop', { pitch: ['D5', 'F#5', 'A5', 'B5', 'D6'][i], gain: 0.08 }));
    add(B0, 'drop', 'impact', { gain: 0.16 });
    add(22.95, 'line 1', 'blip', { pitch: 'A5', gain: 0.07 });
    add(23.9, 'line 2', 'blip', { pitch: 'D6', gain: 0.07 });
    FOR.forEach((_, i) => add(T_FOR(i), `for ${i + 1}`, 'pop', { pitch: ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6'][i], gain: 0.1 }));
    DO.forEach((_, i) => add(T_DO(i), `do ${i + 1}`, 'click', { gain: 0.1 }));
    INFO.forEach((_, i) => add(T_INFO(i), `info ${i + 1}`, 'pop', { pitch: ['F#5', 'A5', 'B5', 'D6'][i], gain: 0.1 }));
    add(35.85, 'photo', 'pop', { pitch: 'D5', gain: 0.14 });
    add(40.15, 'date', 'thud', { pitch: 140, to: 60, gain: 0.2 });
    add(40.6, 'registration', 'pop', { pitch: 'F#5', gain: 0.12 });
    add(40.95, 'link in bio', 'bell', { pitch: 'A6', gain: 0.12 });
    add(END0, 'to the logo', 'whoosh', { len: 0.5, from: 500, to: 1800, gain: 0.08 });
    return H.sort((a, b) => a[0] - b[0]);
  }

  // ------------------------------------------------------------------ boot + harness
  let ready = null;
  async function boot() {
    await document.fonts.load('400 40px "Varela Round"', 'אבג Abc 123');
    await document.fonts.ready;
    measure();
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
  window.seek = async (t) => { await ready; apply(clamp(t, 0, DURATION)); };
  ready = boot().then(() => { window.filmReady = true; });

  if (PREVIEW) {
    const h = document.createElement('div');
    h.id = 'harness';
    h.innerHTML = `<button id="pp" type="button">❚❚</button><input id="scrub" type="range" min="0" max="${DURATION}" step="0.0167" value="0" aria-label="time"><span id="tc">0.00</span>`;
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
