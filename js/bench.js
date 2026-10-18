/* Boyle's law bench: trapped air column, oil reservoir, Bourdon gauge, valve and pump.
   Bench time is a state variable: it runs freely outside the tutorial and is advanced explicitly inside it,
   so the tutorial reaches the same state at every playback speed. */
(function (L) {
  'use strict';
  const { el, txt, $, clamp, parseNum, near, C, F_HEAD, F_BODY, defs, NUM, setWork, tween, tut, raw } = L;
  const P = 'boy', G = 'boyg';
  /* physical model (example values) */
  const PATM = 0.993;            /* atmospheric pressure on the bench day, atm */
  const V0 = 49.0;               /* air volume with the gauge at 0, cm³ */
  const K = PATM * V0;           /* (P + P0) V at room temperature, atm cm³ */
  const T0 = 298.15, TROOM = 25.0;
  const PMAX = 2.5, STROKE = 0.25;   /* the pump stops raising the gauge at 2.5 atm */
  const HEAT = 1.6;              /* K of warming per atm of compression (cooling on expansion) */
  const A_P = 0.5;               /* share of the warm excess that shows on the gauge */
  const TAU = 14, SETTLE = 60;   /* thermal time constant and settling time, bench seconds */
  const KB = 0.02;               /* leak rate through the valve when fully open, per bench second */
  const RATE = 6;                /* bench seconds per real second */
  const Y0 = 96, PX = 7;         /* scale: 0 cm³ at y = 96, 7 px per cm³ */
  const GX = 608, GY = 214, GR = 100; /* gauge dial */
  const yOf = v => Y0 + PX * v;
  const ang = p => (-135 + 270 * clamp(p, -0.03, 3.02) / 3) * Math.PI / 180;
  const ept = (r, a) => [GX + r * Math.sin(a), GY - r * Math.cos(a)];

  const svg = $(P + '-rig'); defs(svg, G);
  const V = n => `var(--${n})`;
  const T = (g, x, y, s, o) => txt(g, x, y, s, Object.assign({ 'font-family': F_BODY, 'font-size': 14, fill: C.ink2 }, o || {}));
  const d0 = svg.querySelector('defs');
  function lin(name, stops, x2, y2) { const g = el('linearGradient', { id: `${G}-${name}`, x1: 0, y1: 0, x2: x2 || 0, y2: y2 == null ? 1 : y2 }, d0); stops.forEach(([o, c, op]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': op == null ? 1 : op }, g)); }
  lin('oilV', [[0, raw('#a85a0c')], [.25, raw('#ffc35c')], [.55, raw('#f0a640')], [1, raw('#8c4a08')]], 1, 0);
  lin('oilTop', [[0, raw('#ffe2a6'), .9], [1, raw('#f0a640'), 0]]);
  lin('gasV', [[0, raw('#8fd8ff'), .10], [.5, raw('#d8f4ff'), .18], [1, raw('#8fd8ff'), .10]], 1, 0);
  lin('board', [[0, V('rg-wood-1')], [1, V('rg-wood-3')]], 1, 0);
  lin('cyl', [[0, V('rg-steel-4')], [.15, V('rg-steel-2')], [.35, V('rg-steel-1')], [.6, V('rg-steel-2')], [1, V('rg-steel-4')]], 1, 0);
  lin('hose', [[0, raw('#0c0f14')], [.45, raw('#3b4350')], [1, raw('#0c0f14')]], 0, 1);
  const lensClip = el('clipPath', { id: `${G}-lens` }, d0); const lensC = el('circle', { cx: 0, cy: 0, r: 64 }, lensClip);

  /* ---------- scene ---------- */
  const scene = el('g', { id: `${G}-scene` }, svg);
  el('rect', { x: 0, y: 0, width: 1000, height: 620, fill: 'transparent' }, scene);
  el('rect', { x: 0, y: 556, width: 1000, height: 64, fill: `url(#${G}-bench)` }, scene);
  el('rect', { x: 0, y: 556, width: 1000, height: 64, fill: `url(#${G}-grain)`, opacity: .5 }, scene);
  el('rect', { x: 0, y: 556, width: 1000, height: 1.5, fill: raw('#8fb6d4'), opacity: .25 }, scene);
  /* backboard and stand */
  el('ellipse', { cx: 350, cy: 560, rx: 120, ry: 7, fill: 'black', opacity: .45, filter: `url(#${G}-blur)` }, scene);
  el('rect', { x: 262, y: 46, width: 176, height: 506, rx: 10, fill: `url(#${G}-board)`, stroke: V('rg-case-edge'), 'stroke-width': 1, filter: `url(#${G}-sh)` }, scene);
  el('rect', { x: 262, y: 46, width: 176, height: 506, rx: 10, fill: `url(#${G}-grain)`, opacity: .35 }, scene);
  el('rect', { x: 240, y: 540, width: 220, height: 18, rx: 4, fill: `url(#${G}-iron)` }, scene);
  [276, 424].forEach(x => el('circle', { cx: x, cy: 62, r: 4, fill: `url(#${G}-cap)` }, scene));
  /* printed scale */
  el('rect', { x: 292, y: 70, width: 72, height: 462, rx: 3, fill: `url(#${G}-ivory)`, stroke: V('rg-ivory-2') }, scene);
  const sc = el('g', null, scene);
  for (let v = 0; v <= 60; v++) {
    const y = yOf(v), big = v % 10 === 0, mid = v % 5 === 0;
    el('line', { x1: 364 - (big ? 22 : mid ? 15 : 8), y1: y, x2: 364, y2: y, stroke: V('rg-print'), 'stroke-width': big ? 1.6 : mid ? 1.2 : .8 }, sc);
    if (mid) T(sc, 336 - (big ? 4 : 0), y + 4.5, String(v), { 'text-anchor': 'end', 'font-size': big ? 13 : 11, 'font-weight': big ? 700 : 500, fill: V('rg-print'), 'font-family': F_HEAD });
  }
  T(sc, 328, 84, 'cm³', { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: V('rg-print'), 'font-family': F_HEAD });
  /* reservoir */
  el('ellipse', { cx: 608, cy: 560, rx: 80, ry: 7, fill: 'black', opacity: .45, filter: `url(#${G}-blur)` }, scene);
  el('rect', { x: 548, y: 372, width: 120, height: 180, rx: 12, fill: `url(#${G}-cyl)`, stroke: V('rg-steel-4'), filter: `url(#${G}-sh)` }, scene);
  el('rect', { x: 540, y: 366, width: 136, height: 14, rx: 4, fill: `url(#${G}-steelv)`, stroke: V('rg-steel-4') }, scene);
  el('rect', { x: 540, y: 540, width: 136, height: 14, rx: 4, fill: `url(#${G}-steelv)`, stroke: V('rg-steel-4') }, scene);
  [556, 660].forEach(x => [373, 547].forEach(y => el('circle', { cx: x, cy: y, r: 3, fill: `url(#${G}-cap)` }, scene)));
  el('rect', { x: 594, y: 392, width: 28, height: 140, rx: 6, fill: raw('#0b1220'), stroke: V('rg-steel-4') }, scene);
  const resOil = el('rect', { x: 597, y: 450, width: 22, height: 79, rx: 3, fill: `url(#${G}-oilV)` }, scene);
  el('rect', { x: 597, y: 395, width: 22, height: 134, rx: 3, fill: `url(#${G}-glass)`, opacity: .55 }, scene);
  T(scene, 608, 548, 'OIL RESERVOIR', { 'text-anchor': 'middle', 'font-size': 8.5, 'font-weight': 700, 'letter-spacing': '.14em', fill: V('rg-steel-4'), 'font-family': F_HEAD });
  /* pipe from the reservoir bottom to the tube */
  el('path', { d: 'M548 524 H398 V540', fill: 'none', stroke: `url(#${G}-steelv)`, 'stroke-width': 14, 'stroke-linejoin': 'round' }, scene);
  el('path', { d: 'M548 524 H398 V540', fill: 'none', stroke: raw('#a85a0c'), 'stroke-width': 6, 'stroke-linejoin': 'round', opacity: .8 }, scene);
  /* glass tube */
  const TX0 = 377, TX1 = 395, TCX = 386;
  el('rect', { x: 368, y: 78, width: 36, height: 470, rx: 18, fill: `url(#${G}-glassWall)`, opacity: .55 }, scene);
  el('rect', { x: TX0, y: 88, width: TX1 - TX0, height: 452, rx: 9, fill: raw('#0b1220'), opacity: .55 }, scene);
  const gas = el('rect', { x: TX0, y: 90, width: TX1 - TX0, height: 10, rx: 8, fill: `url(#${G}-gasV)` }, scene);
  const molG = el('g', null, scene);
  const oil = el('rect', { x: TX0, y: 300, width: TX1 - TX0, height: 240, fill: `url(#${G}-oilV)` }, scene);
  const men = el('path', { d: '', fill: `url(#${G}-oilTop)`, stroke: raw('#ffd890'), 'stroke-width': 1 }, scene);
  el('rect', { x: 368, y: 78, width: 36, height: 470, rx: 18, fill: 'none', stroke: V('rg-glass-edge'), 'stroke-width': 1.2, opacity: .7 }, scene);
  el('rect', { x: 372, y: 96, width: 4, height: 430, rx: 2, fill: `url(#${G}-streak)`, opacity: .75 }, scene);
  el('rect', { x: 397, y: 110, width: 2.4, height: 400, rx: 1.2, fill: `url(#${G}-streak)`, opacity: .4 }, scene);
  el('rect', { x: 364, y: 528, width: 44, height: 22, rx: 4, fill: `url(#${G}-steelv)`, stroke: V('rg-steel-4') }, scene);
  /* gauge stem and dial */
  el('rect', { x: 600, y: 326, width: 16, height: 46, fill: `url(#${G}-steel)`, stroke: V('rg-steel-4') }, scene);
  el('rect', { x: 592, y: 352, width: 32, height: 16, rx: 3, fill: `url(#${G}-brass)` }, scene);
  el('circle', { cx: GX, cy: GY, r: 122, fill: 'black', opacity: .4, filter: `url(#${G}-blur)` }, scene);
  el('circle', { cx: GX, cy: GY, r: 118, fill: `url(#${G}-steel)`, stroke: V('rg-steel-4'), 'stroke-width': 1.2 }, scene);
  el('circle', { cx: GX, cy: GY, r: 110, fill: raw('#11161d') }, scene);
  el('circle', { cx: GX, cy: GY, r: 106, fill: `url(#${G}-face)` }, scene);
  const dial = el('g', null, scene);
  /* red zone above the maximum working pressure */
  const arc = (r1, p1, p2) => { const a1 = ang(p1), a2 = ang(p2), [x1, y1] = ept(r1, a1), [x2, y2] = ept(r1, a2); return `M${x1} ${y1} A${r1} ${r1} 0 ${a2 - a1 > Math.PI ? 1 : 0} 1 ${x2} ${y2}`; };
  el('path', { d: arc(89, 2.6, 3), fill: 'none', stroke: raw('#c8302a'), 'stroke-width': 7, opacity: .85 }, dial);
  el('path', { d: arc(71, 0, 3), fill: 'none', stroke: V('rg-mirror-2'), 'stroke-width': 5, opacity: .5 }, dial);
  for (let i = 0; i <= 60; i++) {
    const p = i * 0.05, a = ang(p), big = i % 10 === 0, mid = i % 5 === 0;
    const [x1, y1] = ept(big ? 76 : mid ? 80 : 84, a), [x2, y2] = ept(93, a);
    el('line', { x1, y1, x2, y2, stroke: V('rg-print'), 'stroke-width': big ? 2.2 : mid ? 1.4 : .8 }, dial);
    if (big) { const [tx, ty] = ept(62, a); T(dial, tx, ty + 5, String(p / 1 === Math.round(p) ? p : p.toFixed(1)), { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: V('rg-print'), 'font-family': F_HEAD }); }
  }
  T(dial, GX, GY - 30, 'GAUGE PRESSURE', { 'text-anchor': 'middle', 'font-size': 7.5, 'font-weight': 700, 'letter-spacing': '.14em', fill: V('rg-print'), 'font-family': F_HEAD });
  T(dial, GX, GY + 40, 'atm', { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: V('rg-print'), 'font-family': F_HEAD });
  T(dial, GX, GY + 58, 'BOURDON · 0–3', { 'text-anchor': 'middle', 'font-size': 7, 'font-weight': 600, 'letter-spacing': '.12em', fill: V('rg-print'), opacity: .7, 'font-family': F_HEAD });
  const needle = el('g', null, scene);
  el('path', { d: `M${GX - 3.4} ${GY + 2} L${GX - .9} ${GY - 92} L${GX + .9} ${GY - 92} L${GX + 3.4} ${GY + 2} Z`, fill: raw('#c8302a') }, needle);
  el('path', { d: `M${GX - 5} ${GY} L${GX + 5} ${GY} L${GX + 3} ${GY + 24} L${GX - 3} ${GY + 24} Z`, fill: raw('#1a1d22') }, needle);
  el('circle', { cx: GX, cy: GY, r: 9, fill: `url(#${G}-cap)`, stroke: raw('#2a2f36'), 'stroke-width': .8 }, scene);
  /* cover glass: a soft glare band and a rim highlight */
  el('circle', { cx: GX, cy: GY, r: 106, fill: `url(#${G}-glare)` }, scene);
  el('path', { d: `M${GX - 84} ${GY - 52} A100 100 0 0 1 ${GX + 40} ${GY - 96}`, fill: 'none', stroke: 'white', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: .16 }, scene);
  /* valve on the side pipe */
  el('rect', { x: 668, y: 422, width: 140, height: 16, fill: `url(#${G}-steelv)`, stroke: V('rg-steel-4') }, scene);
  el('rect', { x: 724, y: 410, width: 40, height: 40, rx: 6, fill: `url(#${G}-brass)`, stroke: raw('#6b4c18'), filter: `url(#${G}-sh2)` }, scene);
  el('rect', { x: 737, y: 400, width: 14, height: 14, rx: 2, fill: `url(#${G}-brass)`, stroke: raw('#6b4c18') }, scene);
  const valveG = el('g', { class: 'live', id: `${P}-valve-h`, tabindex: 0, role: 'button', 'aria-label': 'Valve handle' }, scene);
  el('circle', { cx: 744, cy: 404, r: 40, fill: 'transparent' }, valveG);
  const lever = el('g', null, valveG);
  el('rect', { x: 744, y: 399, width: 54, height: 10, rx: 5, fill: raw('#c8302a'), stroke: raw('#6e1510') }, lever);
  el('circle', { cx: 744, cy: 404, r: 8, fill: `url(#${G}-cap)`, stroke: raw('#2a2f36') }, valveG);
  T(scene, 744, 474, 'VALVE', { 'text-anchor': 'middle', 'font-size': 8.5, 'font-weight': 700, 'letter-spacing': '.14em', fill: C.muted, 'font-family': F_HEAD });
  /* hose to the pump */
  el('path', { d: 'M806 430 C850 430 846 528 878 532', fill: 'none', stroke: `url(#${G}-hose)`, 'stroke-width': 11, 'stroke-linecap': 'round' }, scene);
  el('path', { d: 'M806 427 C846 427 842 524 876 528', fill: 'none', stroke: 'white', 'stroke-width': 1.4, opacity: .12 }, scene);
  /* hand pump */
  el('ellipse', { cx: 893, cy: 562, rx: 60, ry: 6, fill: 'black', opacity: .45, filter: `url(#${G}-blur)` }, scene);
  el('rect', { x: 842, y: 542, width: 102, height: 14, rx: 5, fill: `url(#${G}-iron)` }, scene);
  const pumpG = el('g', { class: 'live', id: `${P}-pump-h`, tabindex: 0, role: 'button', 'aria-label': 'Pump handle: one stroke' }, scene);
  el('rect', { x: 830, y: 210, width: 126, height: 340, fill: 'transparent' }, pumpG);
  const rod = el('rect', { x: 889, y: 236, width: 8, height: 80, fill: `url(#${G}-steel)` }, pumpG);
  const handle = el('g', null, pumpG);
  el('rect', { x: 838, y: 228, width: 110, height: 16, rx: 8, fill: raw('#1a1f27'), stroke: raw('#000000') }, handle);
  el('rect', { x: 842, y: 230, width: 102, height: 5, rx: 2.5, fill: 'white', opacity: .1 }, handle);
  el('rect', { x: 873, y: 300, width: 40, height: 244, rx: 8, fill: `url(#${G}-cyl)`, stroke: V('rg-steel-4') }, pumpG);
  el('rect', { x: 869, y: 296, width: 48, height: 12, rx: 3, fill: `url(#${G}-steelv)` }, pumpG);
  T(pumpG, 893, 430, 'AIR PUMP', { 'text-anchor': 'middle', 'font-size': 8.5, 'font-weight': 700, 'letter-spacing': '.14em', fill: V('rg-steel-4'), transform: 'rotate(-90 893 430)', 'font-family': F_HEAD });
  /* thermometer (optional): a probe in the sealed top of the tube and a small display */
  const thermoG = el('g', { opacity: 0 }, scene);
  el('path', { d: 'M248 128 C300 128 330 76 386 78 V112', fill: 'none', stroke: raw('#2a3140'), 'stroke-width': 3 }, thermoG);
  el('rect', { x: 384, y: 92, width: 4, height: 22, rx: 2, fill: V('rg-steel-2') }, thermoG);
  el('rect', { x: 120, y: 98, width: 132, height: 62, rx: 9, fill: `url(#${G}-bake)`, stroke: V('rg-bake-edge'), filter: `url(#${G}-sh)` }, thermoG);
  el('rect', { x: 128, y: 106, width: 116, height: 40, rx: 5, fill: V('rg-lcd-bg') }, thermoG);
  const thT = T(thermoG, 236, 135, '25.0 °C', { 'text-anchor': 'end', 'font-size': 22, 'font-weight': 700, fill: V('rg-lcd-on'), 'font-family': F_HEAD });
  T(thermoG, 186, 156, 'AIR TEMPERATURE', { 'text-anchor': 'middle', 'font-size': 6.8, 'font-weight': 700, 'letter-spacing': '.14em', fill: raw('#8f9bb0'), 'font-family': F_HEAD });
  /* tags */
  const tagG = el('g', null, scene);
  function tag(x, y, s, lx, ly) { const g = el('g', null, tagG); if (lx != null) el('line', { x1: x, y1: y, x2: lx, y2: ly, stroke: C.acc, 'stroke-width': 1, opacity: .7 }, g); const w = s.length * 6.6 + 18; el('rect', { x: x - w / 2, y: y - 11, width: w, height: 22, rx: 11, fill: V('rg-tag-bg'), stroke: V('rg-tag-line') }, g); T(g, x, y + 4.2, s, { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, fill: V('rg-tag-ink'), 'font-family': F_HEAD }); return g; }
  const gasTag = tag(470, 150, 'trapped air', 398, 150);
  tag(470, 470, 'oil', 398, 470);
  /* magnifier */
  const lensG = el('g', { opacity: 0, 'pointer-events': 'none' }, svg);
  const lensView = el('g', { 'clip-path': `url(#${G}-lens)` }, lensG);
  el('circle', { cx: 0, cy: 0, r: 64, fill: V('rig-bg') }, lensView);
  const lensUse = el('use', { href: `#${G}-scene` }, lensView);
  el('circle', { cx: 0, cy: 0, r: 64, fill: 'none', stroke: raw('#0b0f16'), 'stroke-width': 7 }, lensG);
  el('circle', { cx: 0, cy: 0, r: 64, fill: 'none', stroke: `url(#${G}-steel)`, 'stroke-width': 4 }, lensG);
  el('path', { d: 'M-40 -36 A54 54 0 0 1 20 -58', fill: 'none', stroke: 'white', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: .3 }, lensG);
  el('line', { x1: 46, y1: 46, x2: 92, y2: 92, stroke: raw('#1a1f27'), 'stroke-width': 12, 'stroke-linecap': 'round' }, lensG);
  el('line', { x1: -10, y1: 0, x2: 10, y2: 0, stroke: C.acc, 'stroke-width': 1, opacity: .7 }, lensG);

  /* ---------- state and model ---------- */
  const st = { simT: 0, tChange: -999, dT0: 0, pg: 0, valve: 1, rows: [], nid: 0, rng: Math.random, thermo: false, mag: false, lens: { x: 386, y: 300 }, needle: 0, nv: 0, lastStroke: -9 };
  const mrnd = L.mulberry32(77), mols = Array.from({ length: 26 }, () => ({ fx: mrnd(), fy: mrnd(), ph: mrnd() * 6.28, sp: .8 + mrnd() * 1.4 }));
  const relax = t => t >= SETTLE ? 0 : (Math.exp(-t / TAU) - Math.exp(-SETTLE / TAU)) / (1 - Math.exp(-SETTLE / TAU));
  const since = () => Math.max(0, st.simT - st.tChange);
  const dT = () => st.dT0 * relax(since());
  function stateAt(dt) { const pabs = (st.pg + PATM) * (1 + A_P * dt / T0); const pd = pabs - PATM; return { p: pd, v: K * (1 + dt / T0) / pabs, t: TROOM + dt }; }
  const now = () => stateAt(dT());
  function change(dp) { const d = dT(); st.pg = clamp(st.pg + dp, 0, PMAX); st.dT0 = d + HEAT * dp; st.tChange = st.simT; }

  /* ---------- drawing ---------- */
  const msg = $(P + '-msg'), recMsg = $(P + '-recmsg'), statusEl = $(P + '-status'), timerEl = $(P + '-timer');
  function say(t, cls) { msg.className = 'rig-msg' + (cls ? ' ' + cls : ''); msg.innerHTML = t; }
  function rsay(t, cls) { recMsg.className = 'rec-msg' + (cls ? ' ' + cls : ''); recMsg.innerHTML = t; }
  const mmss = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function leverAngle(v) { return v <= 0 ? -90 : v < 1 ? -62 : 0; }
  let leverA = leverAngle(st.valve), handleY = 0;
  function render(realNow) {
    const s = now(), yM = yOf(s.v);
    gas.setAttribute('height', Math.max(2, yM - 90));
    oil.setAttribute('y', yM); oil.setAttribute('height', 540 - yM);
    men.setAttribute('d', `M${TX0} ${yM - 3.2} Q${TCX} ${yM + 3.2} ${TX1} ${yM - 3.2} L${TX1} ${yM + 2} L${TX0} ${yM + 2} Z`);
    const ry = 402 + (V0 - s.v) * 2.4; resOil.setAttribute('y', ry); resOil.setAttribute('height', 529 - ry);
    /* molecules spread through the column; the same molecules crowd together when the column is shorter */
    const t = (realNow || performance.now()) / 1000, h = yM - 98;
    if (molG.childNodes.length !== mols.length) { molG.innerHTML = ''; mols.forEach(() => el('circle', { r: 1.5, fill: raw('#bff3ff'), opacity: .8 }, molG)); }
    mols.forEach((m, i) => { const c = molG.childNodes[i]; const fx = (m.fx + .06 * Math.sin(t * m.sp + m.ph)) % 1, fy = clamp(m.fy + .03 * Math.cos(t * m.sp * 1.3 + m.ph), 0, 1); c.setAttribute('cx', TX0 + 3 + Math.abs(fx) * (TX1 - TX0 - 6)); c.setAttribute('cy', 95 + fy * Math.max(2, h)); });
    gasTag.setAttribute('transform', `translate(0 ${clamp((90 + yM) / 2 - 150, -60, 380)})`);
    /* needle: a damped spring towards the reading */
    needle.setAttribute('transform', `rotate(${ang(st.needle) * 180 / Math.PI} ${GX} ${GY})`);
    lever.setAttribute('transform', `rotate(${leverA} 744 404)`);
    handle.setAttribute('transform', `translate(0 ${handleY})`); rod.setAttribute('y', 236 + handleY); rod.setAttribute('height', 66 - handleY);
    thermoG.setAttribute('opacity', st.thermo ? 1 : 0);
    thT.textContent = `${s.t.toFixed(1)} °C`;
    lensG.setAttribute('opacity', st.mag ? 1 : 0);
    const z = 2.6, lx = st.lens.x, ly = st.lens.y; lensG.setAttribute('transform', `translate(${lx} ${ly})`); lensUse.setAttribute('transform', `scale(${z}) translate(${-lx} ${-ly})`);
    timerEl.textContent = st.valve > 0 ? 'valve open' : mmss(since());
    timerEl.classList.toggle('ok', st.valve === 0 && since() >= SETTLE);
  }
  function updStatus() {
    const s = since(), settled = st.valve === 0 && s >= SETTLE;
    statusEl.innerHTML = `Valve: <b>${st.valve <= 0 ? 'closed' : st.valve < 1 ? 'slightly open' : 'open'}</b> · air: <b>${st.valve > 0 ? 'changing' : settled ? 'at room temperature' : 'settling'}</b> · pairs recorded: <b>${st.rows.length}</b> (at least 5)`;
  }
  function physMsg() {
    if (st.valve > 0 && st.pg <= 0.001) say('The valve is open and the gauge reads 0: the trapped air is at atmospheric pressure. Pump strokes push air into the reservoir above the oil.');
    else if (st.valve > 0) say(`The valve is ${st.valve < 1 ? 'slightly open' : 'open'}: air leaks back out and the pressure falls. Close the valve to hold it.`, 'warn');
    else if (since() < SETTLE) say(`Valve closed. The air was ${st.dT0 >= 0 ? 'warmed by the compression' : 'cooled by the expansion'} and is returning to room temperature: wait about a minute before reading (${mmss(since())} so far).`, 'warn');
    else say('Valve closed and the air back at room temperature: the meniscus and the needle are steady and can be read.', 'ok');
  }
  /* free running: bench time advances only outside the tutorial */
  let lastF = performance.now(), lastMsg = '';
  function loop(n) {
    const dt = Math.min(.25, (n - lastF) / 1000); lastF = n;
    if (!tut.on) {
      const ds = dt * RATE; st.simT += ds;
      if (st.valve > 0 && st.pg > 0) { const dp = -KB * st.valve * st.pg * ds; change(dp); if (st.pg < .002) { st.pg = 0; } }
    }
    {
      const key = `${st.valve}|${since() >= SETTLE}|${Math.floor(since() / 10)}`; if (key !== lastMsg) { lastMsg = key; physMsg(); updStatus(); }
    }
    const tgt = now().p; st.nv += ((tgt - st.needle) * 60 - st.nv * 9) * dt; st.needle += st.nv * dt;
    if (Math.abs(tgt - st.needle) < 1e-4 && Math.abs(st.nv) < 1e-3) st.needle = tgt;
    render(n); requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* ---------- controls ---------- */
  const guard = f => () => { if (!tut.on) f(); };
  const valveBtns = Array.from($(P + '-valve').querySelectorAll('button'));
  function setValve(v, animMs) {
    st.valve = v; valveBtns.forEach(b => b.setAttribute('aria-pressed', +b.dataset.v === v ? 'true' : 'false'));
    const a0 = leverA, a1 = leverAngle(v);
    if (!animMs) { leverA = a1; } else tween(animMs, k => { leverA = a0 + (a1 - a0) * k; });
    if (v === 0) { const d = dT(); st.dT0 = d; st.tChange = st.simT; }
    physMsg(); updStatus();
  }
  valveBtns.forEach(b => b.addEventListener('click', guard(() => setValve(+b.dataset.v, 300))));
  $(P + '-valve-h').addEventListener('click', guard(() => setValve(st.valve > 0 ? 0 : 0.3, 300)));
  function stroke() {
    if (st.valve <= 0) { say('The valve is closed, so the pump cannot push air into the reservoir. Open the valve to pump.', 'warn'); return false; }
    if (st.pg >= PMAX - 1e-6) { say(`The gauge is at the maximum of the pump, ${PMAX.toFixed(1)} atm: further strokes do not raise it. Close the valve to hold the pressure.`, 'warn'); return false; }
    change(Math.min(STROKE, PMAX - st.pg)); return true;
  }
  function strokeAnim(ms) { return tween(ms, k => { handleY = 60 * Math.sin(Math.PI * k); }); }
  $(P + '-pump').addEventListener('click', guard(() => { if (stroke()) strokeAnim(420); }));
  $(P + '-pump-h').addEventListener('click', guard(() => { if (stroke()) strokeAnim(420); }));
  $(P + '-wait').addEventListener('click', guard(() => { const s0 = st.simT; tween(1500, k => { st.simT = s0 + 60 * k; }); }));
  const btnTh = $(P + '-thermo'), btnMag = $(P + '-mag');
  function setThermo(on) { st.thermo = on; btnTh.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  function setMag(on) { st.mag = on; btnMag.setAttribute('aria-pressed', on ? 'true' : 'false'); svg.classList.toggle('mag-on', on); }
  btnTh.addEventListener('click', guard(() => setThermo(!st.thermo)));
  btnMag.addEventListener('click', guard(() => setMag(!st.mag)));
  svg.addEventListener('pointermove', e => { if (!st.mag || tut.on) return; const p = L.svgPoint(svg, e); st.lens = { x: clamp(p.x, 40, 960), y: clamp(p.y, 40, 580) }; });
  svg.addEventListener('pointerdown', e => { if (!st.mag || tut.on || e.target.closest('.live')) return; const p = L.svgPoint(svg, e); st.lens = { x: clamp(p.x, 40, 960), y: clamp(p.y, 40, 580) }; });

  /* ---------- readings ---------- */
  const tbody = $(P + '-tbody');
  function readNow() {
    const s = now(), e1 = (st.rng() * 2 - 1) * 0.008, e2 = (st.rng() * 2 - 1) * 0.08;
    const p = Math.max(0, Math.round((s.p + e1) * 100) / 100), v = Math.round((s.v + e2) * 10) / 10;
    return { p, v, inv: 1 / v, early: since() < SETTLE, wait: since(), t: s.t };
  }
  const P0in = () => { const v = parseNum($(P + '-in-P0').value); return isFinite(v) && v > 0.5 && v < 1.6 ? v : NaN; };
  function rowCell(id, c) { const tr = tbody.querySelector(`tr[data-r="${id}"]`); return tr ? tr.children[c] : null; }
  function renderTable(fresh, cols) {
    const p0 = P0in();
    if (!st.rows.length) tbody.innerHTML = '<tr class="empty"><td colspan="4">No readings yet.</td></tr>';
    else tbody.innerHTML = st.rows.map(r => {
      const hid = c => cols != null && r.id === fresh && cols < c;
      return `<tr data-r="${r.id}"${r.id === fresh && cols == null ? ' class="fresh"' : ''}${r.early ? ' data-early="1"' : ''}><td>${hid(0) ? '' : r.p.toFixed(2)}${r.early ? ' <span class="early" title="read before the air was back at room temperature">early</span>' : ''}</td><td>${hid(1) ? '' : r.v.toFixed(1)}</td><td class="calc-c">${hid(2) ? '' : r.inv.toFixed(5)}</td><td class="calc-c pv">${hid(3) || !isFinite(p0) ? '—' : ((r.p + p0) * r.v).toFixed(1)}</td></tr>`;
    }).join('');
    $(P + '-pvnote').hidden = isFinite(p0);
    drawGraph(); workKT();
  }
  function record(partial, pre) {
    if (st.valve > 0) { rsay('Close the valve first, so the pressure holds steady while it is read.', 'warn'); return null; }
    if (st.rows.length >= 8) { rsay('Eight pairs are plenty. Delete one to take another.', 'warn'); return null; }
    const r = pre || readNow();
    if (st.rows.some(q => Math.abs(q.p - r.p) < 0.1)) { rsay(`There is already a pair near ${r.p.toFixed(2)} atm. Open the valve slightly to lower the pressure for the next pair.`, 'warn'); return null; }
    r.id = ++st.nid; st.rows.push(r); st.rows.sort((a, b) => b.p - a.p);
    renderTable(r.id, partial); updStatus();
    if (r.early) rsay(`Recorded P = ${r.p.toFixed(2)} atm, V = ${r.v.toFixed(1)} cm³, but only ${mmss(r.wait)} after the change: the air was still ${r.t > TROOM ? 'warmer' : 'cooler'} than the room (${r.t.toFixed(1)} °C), so this pair is marked early.`, 'warn');
    else rsay(`Recorded P = ${r.p.toFixed(2)} atm and V = ${r.v.toFixed(1)} cm³; 1/V = ${r.inv.toFixed(5)} cm⁻³.`, 'ok');
    return r;
  }
  function undo() { if (!st.rows.length) return; const last = st.rows.reduce((a, b) => (b.id > a.id ? b : a)); st.rows = st.rows.filter(r => r !== last); renderTable(); updStatus(); rsay('Last pair deleted.'); }
  $(P + '-record').addEventListener('click', guard(() => record())); $(P + '-undo').addEventListener('click', guard(undo));

  /* ---------- graph: P against 1/V with a draggable line extended to the P-axis ---------- */
  const gsvg = $(P + '-graph');
  const XM = 0.08, YMIN = -1.5, YMAX = 3;
  const PL = L.makePlot(gsvg, { W: 680, H: 470, ml: 70, mt: 50, xmax: XM, ymin: YMIN, ymax: YMAX, xstep: 0.01, xminor: 0.005, ystep: 0.5, yminor: 0.25, xdec: 2, ydec: 1, xlabel: ['1/', { i: 'V' }, ' (cm', { sup: '−3' }, ')'], ylabel: [{ i: 'P' }, ' (atm, gauge)'] });
  const lineG = el('g', null, PL.g), ptsG = el('g', null, PL.g), hG = el('g', null, PL.g);
  const extLine = el('line', { stroke: C.acc, 'stroke-width': 2, 'stroke-dasharray': '6 5', opacity: .9 }, lineG);
  const fitLine = el('line', { class: 'fit-line', stroke: C.acc, 'stroke-width': 2.6 }, lineG);
  const tri = el('path', { fill: 'none', stroke: C.aqua, 'stroke-dasharray': '5 4', 'stroke-width': 1.6 }, lineG);
  const lDP = T(lineG, 0, 0, 'ΔP', { 'text-anchor': 'start', fill: C.aqua2, 'font-weight': 700 }), lDX = T(lineG, 0, 0, 'Δ(1/V)', { 'text-anchor': 'middle', fill: C.aqua2, 'font-weight': 700 });
  const icpt = el('g', null, lineG);
  el('circle', { r: 7, fill: 'none', stroke: C.warn, 'stroke-width': 2.2 }, icpt); el('circle', { r: 2.4, fill: C.warn }, icpt);
  const icptT = T(icpt, 12, 22, '', { fill: C.warn, 'font-weight': 700, 'font-family': F_HEAD });
  const HDEF = { A: { x: 0.02, y: 0.3 }, B: { x: 0.07, y: 2.0 } };
  const H = { A: Object.assign({}, HDEF.A), B: Object.assign({}, HDEF.B) };
  const handles = ['A', 'B'].map((k, i) => {
    const g = el('g', { class: 'gh', 'data-h': k, tabindex: 0, role: 'slider', 'aria-label': `Handle ${i + 1} on the line` }, hG);
    el('circle', { r: 17, fill: 'transparent' }, g);
    el('rect', { x: -7, y: -7, width: 14, height: 14, fill: C.acc, stroke: V('bg'), 'stroke-width': 2, transform: 'rotate(45)' }, g);
    T(g, 0, -16, String(i + 1), { 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, fill: C.acc2, 'font-family': F_HEAD });
    return g;
  });
  const gread = $(P + '-gread');
  const slopeH = () => (H.B.y - H.A.y) / (H.B.x - H.A.x || 1e-9);
  const cH = () => H.A.y - slopeH() * H.A.x;
  function fit(xs, ys) { const n = xs.length; if (n < 2) return null; const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) * (x - mx); }); const m = sxx ? sxy / sxx : NaN; return { m, c: my - m * mx }; }
  const fitInv = () => fit(st.rows.map(r => r.inv), st.rows.map(r => r.p));
  const fitV = () => fit(st.rows.map(r => r.v), st.rows.map(r => r.p));
  function clipSeg(x1, x2) { const m = slopeH(), c = cH(), y = x => c + m * x; let a = x1, b = x2; const cl = (x) => clamp(x, x1, x2); if (Math.abs(m) > 1e-9) { const xa = (YMIN - c) / m, xb = (YMAX - c) / m; const lo = Math.min(xa, xb), hi = Math.max(xa, xb); a = Math.max(a, lo); b = Math.min(b, hi); } a = cl(a); b = cl(b); return [[a, y(a)], [b, y(b)]]; }
  function drawGraph() {
    ptsG.innerHTML = '';
    st.rows.forEach(r => el('circle', { class: 'gpt', 'data-r': r.id, cx: PL.X(r.inv), cy: PL.Y(r.p), r: 5.5, fill: r.early ? C.warn : V('ink'), stroke: V('bg'), 'stroke-width': 2 }, ptsG));
    const L1 = H.A.x <= H.B.x ? H.A : H.B, R1 = H.A.x <= H.B.x ? H.B : H.A;
    const [e1, e2] = clipSeg(0, L1.x), [f1, f2] = clipSeg(L1.x, XM);
    extLine.setAttribute('x1', PL.X(e1[0])); extLine.setAttribute('y1', PL.Y(e1[1])); extLine.setAttribute('x2', PL.X(e2[0])); extLine.setAttribute('y2', PL.Y(e2[1]));
    fitLine.setAttribute('x1', PL.X(f1[0])); fitLine.setAttribute('y1', PL.Y(f1[1])); fitLine.setAttribute('x2', PL.X(f2[0])); fitLine.setAttribute('y2', PL.Y(f2[1]));
    tri.setAttribute('d', `M${PL.X(L1.x)} ${PL.Y(L1.y)} L${PL.X(R1.x)} ${PL.Y(L1.y)} L${PL.X(R1.x)} ${PL.Y(R1.y)}`);
    lDX.setAttribute('x', PL.X((L1.x + R1.x) / 2)); lDX.setAttribute('y', PL.Y(L1.y) + 20); lDP.setAttribute('x', PL.X(R1.x) + 8); lDP.setAttribute('y', PL.Y((L1.y + R1.y) / 2) + 5);
    const c = cH(), inR = c >= YMIN && c <= YMAX;
    icpt.setAttribute('opacity', inR ? 1 : 0); icpt.setAttribute('transform', `translate(${PL.X(0)} ${PL.Y(clamp(c, YMIN, YMAX))})`);
    icptT.textContent = `c = ${c < 0 ? '−' : ''}${Math.abs(c).toFixed(2)} atm`;
    handles[0].setAttribute('transform', `translate(${PL.X(H.A.x)} ${PL.Y(H.A.y)})`); handles[1].setAttribute('transform', `translate(${PL.X(H.B.x)} ${PL.Y(H.B.y)})`);
    gread.innerHTML = `Handle 1: (<b>${H.A.x.toFixed(4)}</b>, <b>${H.A.y.toFixed(2)}</b>) · Handle 2: (<b>${H.B.x.toFixed(4)}</b>, <b>${H.B.y.toFixed(2)}</b>) · slope <b>${slopeH().toFixed(1)}</b> atm cm³ · intercept <b>${c < 0 ? '−' : ''}${Math.abs(c).toFixed(2)}</b> atm`;
    workK(); workC();
  }
  let gd = null;
  const setH = (k, x, y) => { H[k] = { x: +clamp(x, 0, XM).toFixed(4), y: +clamp(y, YMIN, YMAX).toFixed(2) }; };
  hG.addEventListener('pointerdown', e => { const h = e.target.closest('.gh'); if (!h || tut.on) return; e.preventDefault(); gsvg.setPointerCapture(e.pointerId); gd = h.dataset.h; });
  gsvg.addEventListener('pointermove', e => { if (!gd) return; const p = L.svgPoint(gsvg, e); setH(gd, PL.ix(p.x), PL.iy(p.y)); drawGraph(); });
  const gEnd = () => { gd = null; }; gsvg.addEventListener('pointerup', gEnd); gsvg.addEventListener('pointercancel', gEnd);
  hG.addEventListener('keydown', e => { const h = e.target.closest('.gh'); if (!h || tut.on) return; const k = h.dataset.h, d = { ArrowLeft: [-.0005, 0], ArrowRight: [.0005, 0], ArrowUp: [0, .01], ArrowDown: [0, -.01] }[e.key]; if (!d) return; e.preventDefault(); setH(k, H[k].x + d[0], H[k].y + d[1]); drawGraph(); });
  $(P + '-greset').addEventListener('click', guard(() => { H.A = Object.assign({}, HDEF.A); H.B = Object.assign({}, HDEF.B); drawGraph(); }));

  /* ---------- calculation ---------- */
  const IN = { k: $(P + '-in-k'), c: $(P + '-in-c'), P0: $(P + '-in-P0'), kT: $(P + '-in-kT'), pe: $(P + '-in-pe') };
  const wk = k => $(P + '-w-' + k), chk = $(P + '-chk'), res = $(P + '-result');
  const val = k => parseNum(IN[k].value), str = k => IN[k].value.trim();
  const sg = v => (v < 0 ? '−' : '') + Math.abs(v);
  function workK() { const A = H.A, B = H.B; setWork(wk('k'), `= (${NUM('y2', B.y.toFixed(2))} − ${NUM('y1', A.y.toFixed(2))}) ÷ (${NUM('x2', B.x.toFixed(4))} − ${NUM('x1', A.x.toFixed(4))}) = ${NUM('dPv', (B.y - A.y).toFixed(2))} ÷ ${NUM('dXv', (B.x - A.x).toFixed(4))} = ${NUM('r-k', slopeH().toFixed(1))}`); }
  function workC() { const k = val('k'); setWork(wk('c'), isFinite(k) ? `= ${NUM('y1c', H.A.y.toFixed(2))} − ${NUM('kv', str('k'))} × ${NUM('x1c', H.A.x.toFixed(4))} = ${NUM('r-c', sgf(H.A.y - k * H.A.x, 2))}` : ''); }
  const sgf = (v, d) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
  function workP0() { const c = val('c'); setWork(wk('P0'), isFinite(c) ? `= − (${NUM('cv2', sgf(c, 2))}) = ${NUM('r-P0', sgf(-c, 2))}` : ''); }
  function meanPV(p0) { return st.rows.length ? st.rows.reduce((a, r) => a + (r.p + p0) * r.v, 0) / st.rows.length : NaN; }
  function workKT() { const p0 = P0in(); setWork(wk('kT'), st.rows.length && isFinite(p0) ? `= (${st.rows.map((r, i) => NUM('pv' + r.id, ((r.p + p0) * r.v).toFixed(1))).join(' + ')}) ÷ ${NUM('nR', st.rows.length)} = ${NUM('r-kT', meanPV(p0).toFixed(1))}` : ''); }
  function workPE() { const p = val('P0'); setWork(wk('pe'), isFinite(p) ? `= |${NUM('P0v', str('P0'))} − ${NUM('one', '1')}| ÷ ${NUM('one2', '1')} × 100 = ${NUM('r-pe', (Math.abs(p - 1) * 100).toFixed(1))}` : ''); }
  Object.values(IN).forEach(i => i.addEventListener('input', () => { i.classList.remove('flag', 'okf'); workC(); workP0(); workPE(); if (i === IN.P0) renderTable(); }));
  function check() {
    const v = {}; for (const k in IN) v[k] = val(k);
    const notes = []; Object.values(IN).forEach(i => i.classList.remove('flag', 'okf'));
    if (st.rows.length < 5) { chk.className = 'check-msg nudge'; chk.innerHTML = 'Record at least five pairs of readings, from the maximum pressure down, before the calculation.'; res.hidden = true; return false; }
    const flag = (k, t) => { IN[k].classList.add('flag'); notes.push(t); }, ok = k => IN[k].classList.add('okf');
    const early = st.rows.filter(r => r.early);
    if (early.length) notes.push(`${early.length === 1 ? 'One pair was' : early.length + ' pairs were'} read too soon after a change (marked early): the air was not yet back at room temperature, so PV comes out off by about 1 %. Delete ${early.length === 1 ? 'it' : 'them'}, wait a minute and record again.`);
    const kh = slopeH(), ch = cH(), F = fitInv(), FV = fitV();
    if (F && (!near(kh, F.m, .03) || Math.abs(ch - F.c) > .06)) notes.push(`The line through the two handles does not follow the points (slope ${kh.toFixed(1)}, intercept ${sgf(ch, 2)}; the points suggest about ${F.m.toFixed(1)} and ${sgf(F.c, 2)}). Drag both handles onto the best straight line, far apart.`);
    if (near(v.k, kh, .01)) ok('k');
    else if (isFinite(v.k) && (v.k < 0 || (FV && near(v.k, FV.m, .1)))) flag('k', 'A negative slope comes from P against V, which is a curve. Boyle\'s law gives a straight line for P against 1/V, rising to the right: k = ΔP ÷ Δ(1/V).');
    else if (near(v.k, kh * 1e6, .02) || near(v.k, kh * 1e-6, .02)) flag('k', 'The slope is a million times off: 1/V must be in cm⁻³, as on the graph, not m⁻³.');
    else if (near(v.k, kh / 1000, .02) || near(v.k, kh * 1000, .02)) flag('k', 'The slope is a thousand times off: V is in cm³ on the scale, not litres.');
    else flag('k', 'k = (y₂ − y₁) ÷ (x₂ − x₁), with the two handle positions shown under the graph.');
    if (isFinite(v.c) && Math.abs(v.c - ch) <= .015) ok('c');
    else if (isFinite(v.c) && Math.abs(v.c + ch) <= .02) flag('c', `The line meets the P-axis below zero: the intercept is negative, c = ${sgf(ch, 2)} atm.`);
    else if (isFinite(v.c) && FV && Math.abs(v.c - FV.c) < .3) flag('c', 'That intercept belongs to P against V. The intercept used here is where the P against 1/V line meets the P-axis.');
    else flag('c', 'c = y₁ − k x₁: the value of P on the line where 1/V = 0, marked on the graph.');
    const cRef = isFinite(v.c) ? v.c : ch;
    if (isFinite(v.P0) && Math.abs(v.P0 + cRef) <= .006 && v.P0 > 0) ok('P0');
    else if (isFinite(v.P0) && v.P0 < 0) flag('P0', `P₀ is minus the intercept: c = ${sgf(cRef, 2)} atm, so P₀ = ${sgf(-cRef, 2)} atm, a positive pressure.`);
    else if (isFinite(v.P0) && v.P0 > 80 && v.P0 < 120) flag('P0', 'That looks like kPa. The gauge and the manual use atm, so P₀ is about 1 atm.');
    else if (isFinite(v.P0) && v.P0 > 12 && v.P0 < 17) flag('P0', 'That looks like psi. The gauge and the manual use atm.');
    else flag('P0', 'P₀ = −c, with c the intercept above.');
    const p0 = P0in(), mk = meanPV(isFinite(p0) ? p0 : -ch), mg = meanPV(0);
    if (near(v.kT, mk, .005)) ok('kT');
    else if (near(v.kT, mg, .02)) flag('kT', 'That is the mean of P V with the gauge reading only. The gauge reads the excess over the atmosphere; Boyle\'s law needs the absolute pressure P + P₀.');
    else flag('kT', 'The mean of the last column of the table, (P + P₀)V, once P₀ is entered.');
    const peT = isFinite(v.P0) ? Math.abs(v.P0 - 1) * 100 : NaN;
    if (isFinite(peT) && Math.abs(v.pe - peT) <= .15) ok('pe');
    else if (isFinite(peT) && peT > .3 && Math.abs(v.pe - peT / 100) <= .002) flag('pe', 'That is the fraction. Multiply by 100 for a percentage.');
    else flag('pe', '% error = |P₀ − 1 atm| ÷ 1 atm × 100, with P₀ from above.');
    if (!notes.length) {
      chk.className = 'check-msg good'; chk.innerHTML = `All values check out. P against 1/V is a straight line and (P + P₀)V stays at about ${mk.toFixed(1)} atm cm³, the slope of the line: Boyle's law holds.`;
      const dk = Math.abs(mk - v.k) / v.k * 100;
      res.hidden = false;
      res.innerHTML = `<h3>Result</h3><table class="res-t"><thead><tr><th></th><th>Value</th></tr></thead><tbody><tr><td>Atmospheric pressure from the graph, <i>P</i><sub>0</sub></td><td>${NUM('resP0', str('P0'))} atm</td></tr><tr><td>Standard atmospheric pressure</td><td>${NUM('resStd', '1')} atm</td></tr><tr><td>Percentage error</td><td>${NUM('resPe', str('pe'))} %</td></tr><tr><td>Slope <i>k</i> of the line</td><td>${NUM('resK', str('k'))} atm cm³</td></tr><tr><td>Mean (<i>P</i> + <i>P</i><sub>0</sub>)<i>V</i></td><td>${NUM('resKT', str('kT'))} atm cm³ <span class="small muted">(${dk.toFixed(1)} % apart)</span></td></tr></tbody></table><p class="small">Boyle's law is verified: at constant temperature (P + P₀)V is constant, so P ∝ 1/V for the absolute pressure.</p>`;
      return true;
    }
    chk.className = 'check-msg nudge'; chk.innerHTML = 'Not yet:<ul>' + notes.map(n => `<li>${n}</li>`).join('') + '</ul>'; res.hidden = true;
    return false;
  }
  $(P + '-check').addEventListener('click', guard(check));

  /* ---------- traceable calculation ---------- */
  const lSym = (row, k) => document.querySelector(`#${P}-cr-${row} label .sym[data-sym="${k}"]`);
  const wNum = (k, ref) => wk(k) && wk(k).querySelector(`.num[data-ref="${ref}"]`);
  const firstPV = () => { const r = st.rows[0]; return r ? rowCell(r.id, 3) : null; };
  function INFO(k) {
    const m = /^pv(\d+)$/.exec(k);
    if (m) { const r = st.rows.find(q => q.id === +m[1]); return { title: '', nm: '(P + P<sub>0</sub>)V for one pair, in atm cm³', where: r ? `(${r.p.toFixed(2)} + ${str('P0')}) × ${r.v.toFixed(1)}. Table, last column of the ${r.p.toFixed(2)} atm row.` : 'Table, last column.', src: () => (r ? rowCell(r.id, 3) : null) }; }
    switch (k) {
      case 'k': return { title: '<i>k</i>: slope of the P against 1/V line, in atm cm³', nm: 'k', where: 'Rise over run between the two handles on the best-fit line. It equals (P + P₀)V, the Boyle constant.', src: () => fitLine };
      case 'dP': case 'dPv': return { title: 'Δ<i>P</i>: the rise between the handles, in atm', nm: 'ΔP = y₂ − y₁, in atm', where: 'The vertical side of the dashed triangle on the graph.', src: () => tri };
      case 'dX': case 'dXv': return { title: 'Δ(1/<i>V</i>): the run between the handles, in cm⁻³', nm: 'Δ(1/V) = x₂ − x₁, in cm⁻³', where: 'The horizontal side of the dashed triangle on the graph.', src: () => tri };
      case 'y1': case 'y1c': return { title: '', nm: 'y₁, the pressure at handle 1, in atm', where: 'Read on the P-axis, level with handle 1.', src: () => handles[0] };
      case 'y2': return { title: '', nm: 'y₂, the pressure at handle 2, in atm', where: 'Read on the P-axis, level with handle 2.', src: () => handles[1] };
      case 'x1': case 'x1c': return { title: '', nm: 'x₁, 1/V at handle 1, in cm⁻³', where: 'Read on the 1/V axis, straight below handle 1.', src: () => handles[0] };
      case 'x2': return { title: '', nm: 'x₂, 1/V at handle 2, in cm⁻³', where: 'Read on the 1/V axis, straight below handle 2.', src: () => handles[1] };
      case 'r-k': return { title: '', nm: 'k in atm cm³', where: 'The result of this line. It goes into the answer box and into the intercept below.', src: () => wNum('c', 'kv') || IN.k };
      case 'kv': return { title: '', nm: 'k from the line above', where: 'From the slope answer box.', src: () => IN.k };
      case 'c': return { title: '<i>c</i>: intercept on the P-axis, in atm', nm: 'c', where: 'Where the extended line meets the P-axis (1/V = 0), marked on the graph with a ring.', src: () => icpt };
      case 'Pax': return { title: 'The P-axis', nm: 'P-axis', where: 'The vertical axis, 1/V = 0: the line is extended (dashed) back to it.', src: () => icpt };
      case 'r-c': return { title: '', nm: 'c in atm', where: 'The result of this line. It goes into the answer box and gives P₀ below.', src: () => wNum('P0', 'cv2') || IN.c };
      case 'P0': return { title: '<i>P</i><sub>0</sub>: atmospheric pressure, in atm', nm: 'P₀', where: 'Minus the intercept: (P + P₀) V = k gives P = k(1/V) − P₀.', src: () => wNum('P0', 'r-P0') || IN.P0 };
      case 'cv': case 'cv2': return { title: '<i>c</i> from the line above', nm: 'c in atm', where: 'From the intercept answer box.', src: () => IN.c };
      case 'r-P0': return { title: '', nm: 'P₀ in atm', where: 'The result of this line. It goes into the answer box, the last column of the table, the percentage error and the Result.', src: () => firstPV() || IN.P0 };
      case 'PV': return { title: '(<i>P</i> + <i>P</i><sub>0</sub>)<i>V</i>: absolute pressure times volume, in atm cm³', nm: '(P + P₀)V', where: 'The last column of the table; it should be the same for every pair.', src: firstPV };
      case 'nR': return { title: '', nm: 'the number of pairs', where: 'How many pairs of readings are in the table.', src: () => tbody };
      case 'r-kT': return { title: '', nm: 'mean (P + P₀)V in atm cm³', where: 'The result of this line. It goes into the answer box and is compared with the slope k in the Result.', src: () => IN.kT };
      case 'pe': return { title: 'Percentage error of P₀', nm: '% error', where: 'How far P₀ is from the standard 1 atm, as a percentage of 1 atm.', src: () => wNum('pe', 'r-pe') || IN.pe };
      case 'P0p': case 'P0v': return { title: '<i>P</i><sub>0</sub> from above', nm: 'P₀ in atm', where: 'From the P₀ answer box.', src: () => IN.P0 };
      case 'Pstd': case 'Pstd2': case 'one': case 'one2': return { title: 'Standard atmospheric pressure', nm: 'the standard atmosphere, 1 atm', where: '1 atm = 101.325 kPa, the reference value for P₀.', src: null };
      case 'r-pe': return { title: '', nm: 'the percentage error', where: 'The result of this line. It goes into the answer box and the Result.', src: () => IN.pe.value.trim() ? IN.pe : null };
      case 'resP0': return { title: '', nm: 'P₀ in atm', where: 'From the P₀ answer box: minus the intercept of the graph.', src: () => IN.P0 };
      case 'resStd': return { title: '', nm: 'the standard atmosphere', where: '1 atm = 101.325 kPa.', src: null };
      case 'resPe': return { title: '', nm: 'the percentage error', where: 'From the % error answer box.', src: () => IN.pe };
      case 'resK': return { title: '', nm: 'k in atm cm³', where: 'From the slope answer box.', src: () => IN.k };
      case 'resKT': return { title: '', nm: 'mean (P + P₀)V in atm cm³', where: 'From the Boyle check answer box.', src: () => IN.kT };
    }
    return null;
  }
  L.registerTrace($(P + '-calc'), INFO);

  /* ---------- start over ---------- */
  function reset() {
    Object.assign(st, { simT: 0, tChange: -999, dT0: 0, pg: 0, rows: [], nid: 0, lens: { x: 386, y: 300 }, needle: 0, nv: 0 });
    setValve(1); setThermo(false); setMag(false); handleY = 0;
    H.A = Object.assign({}, HDEF.A); H.B = Object.assign({}, HDEF.B);
    Object.values(IN).forEach(i => { i.value = ''; i.classList.remove('flag', 'okf'); });
    L.traceHide(); ['c', 'P0', 'pe', 'kT'].forEach(k => setWork(wk(k), '')); chk.className = 'check-msg'; chk.innerHTML = ''; res.hidden = true; res.innerHTML = '';
    renderTable(); rsay(''); physMsg(); updStatus();
  }
  $(P + '-reset').addEventListener('click', guard(reset));
  L.onLeave[P + '-practical'] = () => L.tutStop();

  /* ---------- tutorial ---------- */
  const B = b => ({ svg, box: b });
  const TUBE = B([284, 64, 160, 480]), GAUGE = B([GX - 116, GY - 116, 232, 232]), RES = B([540, 360, 136, 196]), VALVE = B([708, 372, 76, 92]), PUMP = B([856, 214, 76, 340]);
  const THERMO = B([118, 98, 136, 62]);
  const COLG = B([284, 64, 400, 492]);
  const adv = (sec, ms) => { const s0 = st.simT; return tween(ms, k => { st.simT = s0 + sec * k; }); };
  function bleedTo(target, ms) {
    const p0 = st.pg, d0 = dT(), t0 = st.simT, sec = Math.log((p0 + 1e-9) / target) / (KB * 0.3);
    return tween(ms, k => { st.pg = p0 + (target - p0) * k; st.simT = t0 + sec * k; st.tChange = st.simT; st.dT0 = d0 + HEAT * (st.pg - p0); }).then(() => sec);
  }
  const lensTo = (x, y, ms) => { const a = Object.assign({}, st.lens); return tween(ms, k => { const e = L.ease(k); st.lens = { x: a.x + (x - a.x) * e, y: a.y + (y - a.y) * e }; }); };
  const tip = p => ept(80, ang(p));
  async function pumpUp(Tt, n) {
    for (let i = 0; i < n; i++) { stroke(); await Promise.all([strokeAnim(700), adv(1.5, 700)]); await Tt.wait(150); }
  }
  async function readPair(Tt, full) {
    const r0 = readNow(), yM = yOf(now().v);
    if (full) {
      setMag(true);
      await Tt.teach('Magnifier on the meniscus', `The magnifier shows the oil surface against the scale. The oil curves slightly; the reading is taken at the level of the curve, with the eye level with it so there is no parallax. The scale reads ${r0.v.toFixed(1)} cm³, to the nearest 0.1 cm³.`, { box: B([TCX - 90, yM - 70, 180, 140]), label: `V ≈ ${r0.v.toFixed(1)} cm³`, focus: [$(P + '-rig-frame')], ms: 400 });
      await lensTo(TCX - 10, yM, 1400); await Tt.wait(Tt.rt('magnifier meniscus reading the level of the curve with the eye level no parallax scale reads'));
      const [nx, ny] = tip(r0.p);
      await Tt.teach('Magnifier on the needle', `Over the gauge the needle tip sits against the fine divisions, 0.05 atm apart: ${r0.p.toFixed(2)} atm above atmospheric pressure.`, { box: B([nx - 70, ny - 70, 140, 140]), label: `P ≈ ${r0.p.toFixed(2)} atm`, focus: [$(P + '-rig-frame')], ms: 400 });
      await lensTo(nx, ny, 1400); await Tt.wait(Tt.rt('over the gauge the needle tip sits against the fine divisions atm apart above atmospheric'));
      setMag(false);
      await Tt.teach('Record', 'Record writes the two readings into a new row of the table.', { el: $(P + '-record'), label: 'Record', ms: 2200 });
      const r = record(0, r0);
      await Tt.teach('Row: P', `P = ${r.p.toFixed(2)} atm is the gauge reading: the pressure above atmospheric.`, { el: rowCell(r.id, 0), label: `P = ${r.p.toFixed(2)}` });
      renderTable(r.id, 1);
      await Tt.teach('Row: V', `V = ${r.v.toFixed(1)} cm³, the volume of the trapped air read on the scale.`, { el: rowCell(r.id, 1), label: `V = ${r.v.toFixed(1)}` });
      renderTable(r.id, 2);
      await Tt.teach('Row: 1/V', 'The third column is the reciprocal of the volume, used on the graph.', { el: rowCell(r.id, 2), label: '1/V', f: `1/V = 1 ÷ ${r.v.toFixed(1)} = ${r.inv.toFixed(5)} cm⁻³` });
      renderTable(r.id, 3);
      await Tt.teach('Row: (P + P₀)V', 'The last column needs the atmospheric pressure, which comes from the graph at the end; it stays blank until then.', { el: rowCell(r.id, 3), label: '(P + P₀)V' });
      renderTable();
      return r;
    }
    const r = readNow();
    const text = `The oil has settled. The meniscus reads ${r.v.toFixed(1)} cm³ and the needle ${r.p.toFixed(2)} atm. Record adds the row.`;
    Tt.step(`Read at ${r.p.toFixed(2)} atm`, text, `P = ${r.p.toFixed(2)} atm · V = ${r.v.toFixed(1)} cm³`);
    await Tt.show([$(P + '-rig-frame')]); Tt.spot(COLG, `V = ${r.v.toFixed(1)} cm³ · P = ${r.p.toFixed(2)} atm`);
    await Tt.wait(Tt.rt(text));
    const rr = record(undefined, r);
    await Tt.teach(`Row ${rr.p.toFixed(2)} atm`, '1/V fills in next to the readings.', { el: tbody.querySelector(`tr[data-r="${rr.id}"]`), label: `${rr.p.toFixed(2)} atm row`, f: `1/V = 1 ÷ ${rr.v.toFixed(1)} = ${rr.inv.toFixed(5)} cm⁻³` });
    return rr;
  }
  async function settle(Tt, full, cooled) {
    const rig = $(P + '-rig-frame');
    if (full) {
      await Tt.teach('Valve closed: wait', `The ${cooled ? 'expansion cooled' : 'compression warmed'} the air by about ${Math.abs(dT()).toFixed(1)} °C, and warm air takes up a little more room. Readings are taken only when it is back at room temperature, so the temperature is the same for every pair: that is the condition for Boyle's law. The timer counts the minute.`, { el: timerEl, label: 'timer', focus: [rig, timerEl], alt: THERMO, ms: 600 });
      Tt.spot(COLG, 'the air settles');
      await adv(60, 5200);
      await Tt.teach('Settled', `After a minute the thermometer is back at ${TROOM.toFixed(1)} °C. The oil crept ${cooled ? 'down' : 'up'} a little as the air ${cooled ? 'warmed back' : 'cooled'}, and the needle eased slightly. Now the meniscus and the needle are steady.`, { box: THERMO, label: `${TROOM.toFixed(1)} °C`, focus: [rig] });
    } else {
      Tt.step('Wait a minute', 'Valve closed. The air returns to room temperature while the timer runs a full minute.', `T → ${TROOM.toFixed(1)} °C`);
      await Tt.show([rig]); Tt.spot(COLG, 'settling');
      await adv(60, 3400);
    }
  }
  async function run(Tt) {
    const rig = $(P + '-rig-frame');
    await Tt.teach('The apparatus', 'A sealed glass tube holds a fixed mass of air above oil. The oil connects to a reservoir; a pump pushes air into the reservoir and a gauge shows its pressure. Each part is shown in turn.', { el: rig });
    await Tt.teach('Trapped air and scale', 'The air column is at the top of the tube, closed at its upper end. The scale beside it reads the volume of the air in cm³, with 0 at the closed end, so the oil level gives V directly.', { box: TUBE, label: 'trapped air' });
    await Tt.teach('Oil reservoir', 'The oil in the reservoir is joined to the tube at the bottom. Air pumped in above the oil presses it into the tube, which squeezes the trapped air.', { box: RES, label: 'reservoir' });
    await Tt.teach('Bourdon gauge', 'The gauge reads 0 to 3 atm in divisions of 0.05 atm. It shows gauge pressure, the excess over the atmosphere: open to the room it reads 0. The absolute pressure of the air is P + P₀.', { box: GAUGE, label: 'gauge, atm' });
    await Tt.teach('Valve and pump', 'The valve joins the pump to the reservoir. Open, each pump stroke adds air; closed, the pressure is held. Slightly open, air leaks out slowly and the pressure falls.', { box: B([708, 214, 224, 340]), label: 'valve · pump' });
    await Tt.teach('At atmospheric pressure', `With the valve open and nothing pumped, the gauge reads 0 and the air fills ${V0.toFixed(1)} cm³ of the tube at atmospheric pressure.`, { box: COLG, label: `V = ${V0.toFixed(1)} cm³`, focus: [rig] });
    setThermo(true);
    await Tt.teach('Thermometer', `A thermometer in the air shows its temperature: ${TROOM.toFixed(1)} °C, the room temperature.`, { el: btnTh, alt: THERMO, focus: [rig, btnTh], label: 'thermometer' });
    await Tt.teach('Pump to the maximum', 'Step 1 of the method: the pressure is raised to the maximum first. Each stroke adds 0.25 atm; the needle climbs, the oil rises and the air column shortens.', { el: $(P + '-pump'), alt: PUMP, focus: [rig, $(P + '-pump')], label: 'Pump stroke', ms: 3000 });
    Tt.step('Pumping', 'Ten strokes take the gauge to 2.5 atm, the maximum of the pump.', 'P: 0 → 2.50 atm');
    await Tt.show([rig]); Tt.spot(COLG, 'P rises · V falls');
    await pumpUp(Tt, Math.round(PMAX / STROKE));
    await Tt.teach('Close the valve', `The valve handle turns across the pipe: the pressure is held. The thermometer shows ${now().t.toFixed(1)} °C: the compression has warmed the air.`, { box: VALVE, label: 'valve closed', focus: [rig], ms: 1400 });
    await tween(700, k => { leverA = -90 * k; }); setValve(0);
    await Tt.wait(Tt.rt('valve handle turns across the pipe the pressure is held thermometer shows compression warmed'));
    await settle(Tt, true, false);
    await readPair(Tt, true);
    /* the remaining pairs */
    for (const tgt of [2.0, 1.5, 1.0, 0.5]) {
      const first = tgt === 2.0;
      await Tt.teach(first ? 'Lower the pressure' : `Down to ${tgt.toFixed(1)} atm`, first ? 'Opening the valve slightly lets air out slowly. The needle falls, the oil sinks and the air column grows; the valve is closed again near 2.0 atm.' : `Slightly open until the gauge nears ${tgt.toFixed(1)} atm, then closed.`, { box: VALVE, label: 'slightly open', focus: [rig], ms: first ? 3800 : 1600 });
      await tween(500, k => { leverA = -90 + 28 * k; }); setValve(0.3);
      Tt.spot(COLG, `P → ${tgt.toFixed(2)} atm`);
      await bleedTo(tgt, first ? 4200 : 3000);
      await tween(500, k => { leverA = -62 - 28 * k; }); setValve(0);
      await settle(Tt, false, true);
      await readPair(Tt, false);
    }
    setThermo(false);
    /* the graph */
    const F = fitInv();
    await Tt.teach('P against 1/V', 'Each row is one point. They lie on a straight line: P rises in step with 1/V. P against V would give a curve, which is harder to test by eye.', { el: gsvg, label: 'P against 1/V' });
    const xa = 0.025, xb = 0.07, A = Object.assign({}, H.A), Bh = Object.assign({}, H.B);
    await Tt.teach('Best straight line', 'The two handles are dragged onto the best line through the points, placed far apart.', { el: gsvg, ms: 1200 });
    await tween(2200, k => { const e = L.ease(k); setH('A', A.x + (xa - A.x) * e, A.y + (F.c + F.m * xa - A.y) * e); setH('B', Bh.x + (xb - Bh.x) * e, Bh.y + (F.c + F.m * xb - Bh.y) * e); drawGraph(); });
    await Tt.wait(1400);
    await Tt.teach('Extended to the P-axis', `Dashed, the line is carried back to 1/V = 0, where it meets the P-axis below zero, at c = ${sgf(cH(), 2)} atm. This is the gauge reading the air would have at an infinite volume: zero absolute pressure, so c = −P₀.`, { el: icpt, label: `c = ${sgf(cH(), 2)} atm`, focus: [gsvg] });
    /* calculation */
    const calc = $(P + '-calc');
    await Tt.teach('Calculation', 'In order: the slope k, the intercept c, the atmospheric pressure P₀ = −c, a check that (P + P₀)V stays constant, then the percentage error against 1 atm. A dotted line runs from each symbol or number to its source.', { el: calc });
    await Tt.traceLine(wk('k'));
    const kS = slopeH().toFixed(1);
    await Tt.teach('Slope k', `k = ${kS} atm cm³, rise over run between the handles.`, { el: IN.k, ms: 1400 }); await Tt.typeInto(IN.k, kS); await Tt.wait(400);
    await Tt.traceLine(wk('c'));
    const cS = sgf(H.A.y - (+kS) * H.A.x, 2);
    await Tt.teach('Intercept c', `c = ${cS} atm, the same value marked on the graph. It is negative.`, { el: IN.c, ms: 1400 }); await Tt.typeInto(IN.c, cS); await Tt.wait(400);
    await Tt.traceLine(wk('P0'));
    const p0S = (-parseNum(cS)).toFixed(2);
    await Tt.teach('Atmospheric pressure', `P₀ = −c = ${p0S} atm.`, { el: IN.P0, ms: 1400 }); await Tt.typeInto(IN.P0, p0S); await Tt.wait(400);
    await Tt.teach('(P + P₀)V in the table', 'With P₀ known, the last column fills in: the absolute pressure times the volume, almost the same for every row.', { el: $(P + '-table'), label: '(P + P₀)V' });
    await Tt.traceLine(wk('kT'));
    const kT = meanPV(+p0S).toFixed(1);
    await Tt.teach('Boyle check', `The mean, ${kT} atm cm³, agrees with the slope k: the constant of Boyle's law found two ways.`, { el: IN.kT, ms: 1400 }); await Tt.typeInto(IN.kT, kT); await Tt.wait(400);
    await Tt.traceLine(wk('pe'));
    const pe = (Math.abs(+p0S - 1) * 100).toFixed(1);
    await Tt.teach('% error', `P₀ against the standard 1 atm: ${pe} %.`, { el: IN.pe, ms: 1400 }); await Tt.typeInto(IN.pe, pe); await Tt.wait(400);
    await Tt.teach('Check', 'Check compares each answer with the graph and the table, and catches the usual slips: a slope from P against V, a positive intercept used as P₀, gauge pressure in place of absolute, a unit off by 1000, readings taken before the air settled.', { el: $(P + '-check'), label: 'Check', ms: 3400 });
    check();
    for (const k of ['resP0', 'resStd', 'resPe']) { const n = res.querySelector(`.num[data-ref="${k}"]`); if (n) await Tt.teach('', '', { trace: n }); }
    await Tt.teach('Done', `Atmospheric pressure ${p0S} atm from the graph, ${pe} % from 1 atm, and (P + P₀)V constant at about ${kT} atm cm³: Boyle's law verified. Hovering (or tapping) any symbol or number in the Calculation shows its meaning and source. Start over to run the bench by hand.`, { el: chk });
  }
  L.registerLab(P, {
    btn: $(P + '-tut'), scope: $(`view-${P}-practical`), reset,
    seed: () => { st.rng = L.mulberry32(20261022); },
    run, cleanup: () => { st.rng = Math.random; leverA = leverAngle(st.valve); handleY = 0; renderTable(); updStatus(); physMsg(); }
  });
  reset();
  L.BOY = { st, now, check, record, reset, setValve, stroke, change, fitInv, H, setH, drawGraph, IN, PATM, K, dT, since };
})(window.SOL);
