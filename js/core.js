/* Boyle's law lesson: shared engine (no dependencies) */
window.SOL = (function () {
  'use strict';
  const L = {};

  /* tutorial clock: virtual milliseconds that stop while paused and run faster at higher speed */
  const TC = { speed: 1, paused: false, base: 0, at: performance.now() };
  function tnow() { const n = performance.now(); if (!TC.paused) TC.base += (n - TC.at) * TC.speed; TC.at = n; return TC.base; }
  function tcSet(o) { tnow(); Object.assign(TC, o); }

  /* ---------- helpers ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* theme-aware colours: every literal hex colour given to an SVG paint attribute becomes a CSS variable
     whose light value is the literal and whose dark value is derived (neutrals and pale tints are inverted in
     lightness, saturated mid tones are kept), so figures follow the light and dark themes */
  const FIXED = { '#b8336a': 'var(--acc)', '#8a2550': 'var(--acc-2)', '#e07aa3': 'var(--acc-3)', '#fbe9f0': 'var(--acc-pale)', '#fbecf2': 'var(--acc-pale)', '#fdf3f7': 'var(--acc-pale)', '#f2c4cf': 'var(--acc-line)', '#e7c9d6': 'var(--acc-line)',
    '#2b8fb3': 'var(--aqua)', '#1d6d8a': 'var(--aqua-2)', '#e3f2f8': 'var(--aqua-pale)', '#e5f3f8': 'var(--aqua-pale)', '#fff': 'var(--card)', '#ffffff': 'var(--card)', '#1c2230': 'var(--ink)', '#384152': 'var(--ink-2)', '#687284': 'var(--muted)', '#9aa3b0': 'var(--slate-3)', '#5d6878': 'var(--slate)', '#3f4856': 'var(--slate-2)', '#c9cfd7': 'var(--line-2)', '#dfe3e8': 'var(--line)' };
  const PAINT = { fill: 1, stroke: 1, 'stop-color': 1, 'flood-color': 1, color: 1 };
  let hexSheet = null; const hexSeen = new Set();
  function hsl(h) { h = h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h; const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let s = 0, hh = 0; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; } return [hh, s, l]; }
  function darkOf(h) {
    let [hh, s, l] = hsl(h);
    if (s < .3 || l > .82 || l < .26) { l = .13 + (1 - l) * .72; s = Math.min(s, .35) * .8; } else { l = Math.min(.72, l + .08); }
    return `hsl(${hh.toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%)`;
  }
  function themed(v) {
    const k = v.toLowerCase(); if (FIXED[k]) return FIXED[k];
    const name = '--h' + k.slice(1);
    if (!hexSeen.has(k)) {
      hexSeen.add(k);
      if (!hexSheet) { hexSheet = document.createElement('style'); hexSheet.id = 'hex-theme'; document.head.appendChild(hexSheet); }
      hexSheet.textContent += `:root{${name}:${k}}html[data-theme=dark]{${name}:${darkOf(k)}}\n`;
    }
    return `var(${name})`;
  }
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) { let v = attrs[k]; if (PAINT[k] && typeof v === 'string' && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v)) v = themed(v); e.setAttribute(k, v); }
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, attrs) {
    const t = el('text', Object.assign({ x, y }, attrs || {}), parent);
    if (typeof s === 'string' && /R_[a-z]/.test(s)) {
      /* R_s, R_p: draw the subscript letter smaller and lowered */
      s.split(/(R_[a-z])/).forEach(part => {
        if (!part) return;
        const m = /^R_([a-z])$/.exec(part);
        if (m) { el('tspan', {}, t).textContent = 'R'; const u = el('tspan', { 'baseline-shift': 'sub', 'font-size': '72%' }, t); u.textContent = m[1]; el('tspan', {}, t).textContent = '\u200a'; }
        else el('tspan', {}, t).textContent = part;
      });
    } else t.textContent = s;
    return t;
  }
  function tsub(parent, x, y, parts, attrs) {
    const t = el('text', Object.assign({ x, y }, attrs || {}), parent);
    parts.forEach(p => {
      if (typeof p === 'string') { const s = el('tspan', null, t); s.textContent = p; }
      else if (p.i) { const s = el('tspan', { 'font-style': 'italic' }, t); s.textContent = p.i; }
      else { const s = el('tspan', { 'baseline-shift': p.sup ? 'super' : 'sub', 'font-size': '72%' }, t); s.textContent = p.sub || p.sup; }
    });
    return t;
  }
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function svgPoint(svg, e) { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
  function parseNum(s) { if (s == null) return NaN; s = String(s).trim().replace(',', '.').replace(/\s/g, '').replace('−', '-'); if (!s) return NaN; return Number(s); }
  const near = (a, b, tol) => isFinite(a) && isFinite(b) && b !== 0 && Math.abs(a - b) / Math.abs(b) <= tol;
  const fmt = (v, d) => (Math.abs(v) < 1e-12 ? 0 : v).toFixed(d);
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const F_HEAD = 'var(--f-head)', F_BODY = 'var(--f-body)';
  const C = { ink: 'var(--ink)', ink2: 'var(--ink-2)', muted: 'var(--muted)', acc: 'var(--acc)', acc2: 'var(--acc-2)', acc3: 'var(--acc-3)', accPale: 'var(--acc-pale)', aqua: 'var(--aqua)', aqua2: 'var(--aqua-2)', aquaPale: 'var(--aqua-pale)', copper: 'var(--copper)', slate: 'var(--slate)', slate2: 'var(--slate-2)', slate3: 'var(--slate-3)', line: 'var(--line)', line2: 'var(--line-2)', paper: 'var(--card)', good: 'var(--good)', bad: 'var(--bad)', warn: 'var(--warn)' };
  /* shared apparatus materials: gradients and filters drawn from the theme's material tokens */
  /* a literal colour that must not follow the theme (a physical colour such as an LED or a red plug) */
  const raw = h => `rgb(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)})`;
  let noiseURL = null;
  function noise() {
    if (noiseURL) return noiseURL;
    const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'), im = x.createImageData(96, 96), r = mulberry32(11);
    for (let i = 0; i < im.data.length; i += 4) { const v = 110 + r() * 145; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 26; }
    x.putImageData(im, 0, 0); noiseURL = c.toDataURL(); return noiseURL;
  }
  function defs(svg, id) {
    const d = svg.querySelector('defs') || el('defs', null, svg), V = n => `var(--${n})`;
    function lin(name, stops, x2, y2, x1, y1) {
      const g = el('linearGradient', { id: `${id}-${name}`, x1: x1 || 0, y1: y1 || 0, x2: x2 || 0, y2: y2 == null ? 1 : y2 }, d);
      stops.forEach(([o, c, op]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': op == null ? 1 : op }, g));
    }
    function rad(name, stops, cx, cy, r, fx, fy) {
      const g = el('radialGradient', { id: `${id}-${name}`, cx: cx == null ? .5 : cx, cy: cy == null ? .5 : cy, r: r || .5, fx: fx == null ? cx : fx, fy: fy == null ? cy : fy }, d);
      stops.forEach(([o, c, op]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': op == null ? 1 : op }, g));
    }
    /* glass: dark refracting edges, a clear middle and two specular streaks */
    lin('glass', [[0, V('rg-glass-edge'), .55], [.07, V('rg-glass-tint'), .35], [.16, V('rg-glass-hi'), .9], [.24, V('rg-glass-tint'), .12], [.72, V('rg-glass-tint'), .1], [.82, V('rg-glass-hi'), .55], [.93, V('rg-glass-tint'), .3], [1, V('rg-glass-edge'), .6]], 1, 0);
    lin('glassWall', [[0, V('rg-glass-edge'), .7], [.35, V('rg-glass-tint'), .45], [.6, V('rg-glass-hi'), .85], [1, V('rg-glass-edge'), .6]], 1, 0);
    lin('streak', [[0, V('rg-glass-hi'), 0], [.15, V('rg-glass-hi'), .75], [.85, V('rg-glass-hi'), .5], [1, V('rg-glass-hi'), 0]]);
    lin('water', [[0, V('rg-water-1'), .78], [.35, V('rg-water-2'), .78], [1, V('rg-water-3'), .9]]);
    lin('waterCol', [[0, V('rg-water-3'), .95], [.45, V('rg-water-1'), .95], [1, V('rg-water-3'), .95]], 1, 0);
    lin('waterH', [[0, V('rg-water-2')], [.5, V('rg-water-1')], [1, V('rg-water-2')]], 1, 0);
    lin('surface', [[0, V('rg-water-1'), .2], [.5, V('rg-glass-hi'), .7], [1, V('rg-water-1'), .2]], 1, 0);
    /* metals */
    lin('steel', [[0, V('rg-steel-3')], [.18, V('rg-steel-1')], [.42, V('rg-steel-2')], [.7, V('rg-steel-1')], [1, V('rg-steel-4')]], 1, 0);
    lin('steelv', [[0, V('rg-steel-1')], [.45, V('rg-steel-2')], [1, V('rg-steel-4')]]);
    lin('iron', [[0, V('rg-iron-hi')], [.12, V('rg-iron-1')], [1, V('rg-iron-2')]]);
    lin('brass', [[0, raw('#f3d79a')], [.45, raw('#c99a45')], [1, raw('#7d5a20')]]);
    lin('copper', [[0, raw('#e7b07a')], [.5, raw('#b97338')], [1, raw('#7b4519')]]);
    /* instrument cases and faces */
    lin('case', [[0, V('rg-case-1')], [.55, V('rg-case-2')], [1, V('rg-case-3')]]);
    lin('caseEdge', [[0, V('rg-glass-hi'), .7], [.08, V('rg-glass-hi'), 0], [.92, V('rg-bake-edge'), 0], [1, V('rg-bake-edge'), .35]]);
    lin('bake', [[0, V('rg-bake-1')], [1, V('rg-bake-2')]]);
    lin('face', [[0, V('rg-face-1')], [1, V('rg-face-2')]]);
    lin('ivory', [[0, V('rg-ivory-2')], [.18, V('rg-ivory-1')], [.8, V('rg-ivory-1')], [1, V('rg-ivory-2')]], 1, 0);
    lin('mirror', [[0, V('rg-mirror-2')], [.3, V('rg-mirror-1')], [.55, V('rg-mirror-2')], [.8, V('rg-mirror-1')], [1, V('rg-mirror-2')]], 1, 0);
    lin('glare', [[0, 'white', .0], [.42, 'white', .0], [.5, 'white', .28], [.62, 'white', .06], [1, 'white', 0]], 1, 1);
    lin('panel', [[0, V('rg-bake-1')], [1, V('rg-bake-2')]]);
    lin('lcd', [[0, V('rg-lcd-bg')], [1, V('rg-lcd-bg')]]);
    lin('bench', [[0, V('rg-bench-1')], [.18, V('rg-bench-2')], [1, V('rg-bench-3')]]);
    lin('board', [[0, V('rg-board-1')], [1, V('rg-board-2')]]);
    lin('knob', [[0, raw('#59625f')], [.5, raw('#2b3130')], [1, raw('#121615')]], 1, 1);
    lin('res', [[0, V('rg-res-3')], [.3, V('rg-res-2')], [.55, V('rg-res-1')], [1, V('rg-res-3')]]);
    lin('res2', [[0, V('rg-res2-3')], [.3, V('rg-res2-2')], [.55, V('rg-res2-1')], [1, V('rg-res2-3')]]);
    lin('plastic', [[0, V('rg-plastic-2')], [.3, V('rg-plastic-1')], [.62, V('rg-plastic-1')], [1, V('rg-plastic-2')]], 1, 0);
    lin('rubber', [[0, raw('#4a5150')], [.5, V('rg-rubber')], [1, raw('#0d100f')]], 1, 0);
    lin('plugR', [[0, raw('#7c1d17')], [.35, raw('#e2574b')], [.6, raw('#c7382d')], [1, raw('#6a1611')]], 1, 0);
    lin('plugK', [[0, raw('#050606')], [.38, raw('#4a5150')], [.6, raw('#262b2a')], [1, raw('#050606')]], 1, 0);
    rad('vignette', [[0, 'black', 0], [.72, 'black', 0], [1, 'black', .32]]);
    rad('cap', [[0, V('rg-steel-1')], [.6, V('rg-steel-2')], [1, V('rg-steel-4')]], .38, .32, .7);
    rad('ledOn', [[0, raw('#eaffef')], [.35, raw('#4be38f')], [1, raw('#14794a')]], .4, .35, .65);
    rad('ledOff', [[0, raw('#6a7774')], [1, raw('#2b3331')]], .4, .35, .65);
    rad('pinR', [[0, raw('#ff9c8f')], [.4, raw('#d8443a')], [1, raw('#6e1510')]], .38, .32, .7);
    rad('pinK', [[0, raw('#7c8584')], [.4, raw('#2c3231')], [1, raw('#050606')]], .38, .32, .7);
    /* filters: soft drop shadow, blurred contact shadow, LCD glow */
    const sh = el('filter', { id: `${id}-sh`, x: '-20%', y: '-20%', width: '140%', height: '160%' }, d);
    el('feDropShadow', { dx: 0, dy: 4, stdDeviation: 4, 'flood-color': raw('#06100d'), 'flood-opacity': .2 }, sh);
    const sh2 = el('filter', { id: `${id}-sh2`, x: '-30%', y: '-30%', width: '160%', height: '180%' }, d);
    el('feDropShadow', { dx: 0, dy: 1.5, stdDeviation: 1.4, 'flood-color': raw('#06100d'), 'flood-opacity': .35 }, sh2);
    const bl = el('filter', { id: `${id}-blur`, x: '-50%', y: '-200%', width: '200%', height: '500%' }, d);
    el('feGaussianBlur', { stdDeviation: 5 }, bl);
    const gl = el('filter', { id: `${id}-glow`, x: '-30%', y: '-30%', width: '160%', height: '160%' }, d);
    el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 2.2, result: 'b' }, gl);
    const m = el('feMerge', null, gl); el('feMergeNode', { in: 'b' }, m); el('feMergeNode', { in: 'SourceGraphic' }, m);
    /* grain: a tiny noise tile, used as a pattern on bench and cases (no live filter cost) */
    const pt = el('pattern', { id: `${id}-grain`, patternUnits: 'userSpaceOnUse', width: 96, height: 96 }, d);
    el('image', { href: noise(), width: 96, height: 96 }, pt);
    /* knurling */
    const kn = el('pattern', { id: `${id}-knurl`, patternUnits: 'userSpaceOnUse', width: 3, height: 3, patternTransform: 'rotate(45)' }, d);
    el('rect', { width: 3, height: 3, fill: 'black', opacity: .0 }, kn); el('path', { d: 'M0 0V3M0 0H3', stroke: 'black', 'stroke-width': .8, opacity: .35 }, kn);
    return d;
  }

  /* ---------- background: drifting gas molecules; the whole cloud slowly expands and contracts, so the spacing breathes ---------- */
  function background() {
    const cv = $('bg'), ctx = cv.getContext('2d');
    let W = 0, H = 0, col = null, last = 0, mol = [];
    function readCols() { const cs = getComputedStyle(document.documentElement); col = { a: cs.getPropertyValue('--bg-line-rgb').trim(), b: cs.getPropertyValue('--bg-line2-rgb').trim() }; }
    function build() {
      const rnd = mulberry32(1010), n = Math.min(150, Math.round(W * H / 11000) + 20); mol = [];
      for (let k = 0; k < n; k++) mol.push({ x: rnd() * W, y: rnd() * H, r: .8 + rnd() * 1.8, c: k % 4 ? 'a' : 'b', ph: rnd() * 6.283, sp: .25 + rnd() * .5, ax: 6 + rnd() * 14, ay: 6 + rnd() * 14, f: .7 + rnd() * .6 });
    }
    function size() { const dpr = Math.min(window.devicePixelRatio || 1, 1.5); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); build(); }
    function draw(now) {
      const t = now / 1000; ctx.clearRect(0, 0, W, H); if (!col) readCols();
      const cx = W / 2, cy = H * .45, k = 1 + .075 * Math.sin(t * 2 * Math.PI / 16), pts = [];
      mol.forEach(m => {
        const x = cx + (m.x - cx) * k + Math.sin(t * m.sp + m.ph) * m.ax, y = cy + (m.y - cy) * k + Math.cos(t * m.sp * m.f + m.ph) * m.ay;
        pts.push([x, y, m]);
      });
      const R = 120; ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], d = dx * dx + dy * dy; if (d > R * R) continue;
        ctx.strokeStyle = `rgba(${col.a},${(.075 * (1 - Math.sqrt(d) / R)).toFixed(3)})`; ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke();
      }
      pts.forEach(([x, y, m]) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, m.r * 5); g.addColorStop(0, `rgba(${col[m.c]},.34)`); g.addColorStop(1, `rgba(${col[m.c]},0)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, m.r * 5, 0, 6.283); ctx.fill();
        ctx.fillStyle = `rgba(${col[m.c]},.55)`; ctx.beginPath(); ctx.arc(x, y, m.r * .7, 0, 6.283); ctx.fill();
      });
    }
    function frame(n) { if (n - last > 33) { draw(n); last = n; } requestAnimationFrame(frame); }
    window.addEventListener('resize', () => { size(); draw(performance.now()); }); size();
    if (reduced) draw(performance.now()); else requestAnimationFrame(frame);
  }

  /* ---------- navigation: segmented lab tabs in the top bar, numbered dots for the pages of the current lab ---------- */
  const onEnter = {}, onLeave = {};
  let views = [], ids = [], items = [], current = -1, tabs = [];
  const keyOf = v => v.id.replace('view-', '').split('-')[0];
  /* section rail: Practical is always open; every other section stays locked until it is opened */
  const ICON = {
    practical: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
    aim: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
    theory: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
    method: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.3"/><circle cx="4.5" cy="12" r="1.3"/><circle cx="4.5" cy="18" r="1.3"/>',
    obs: '<rect x="3.5" y="4" width="17" height="16" rx="1.5"/><path d="M3.5 9.5h17M3.5 15h17M10 4v16"/>',
    mcq: '<path d="M4 5h16v11H9l-5 4z"/><path d="M10 9a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2"/><circle cx="12" cy="14" r=".6" fill="currentColor"/>'
  };
  const SHORT = { practical: 'Practical', aim: 'Aim', theory: 'Theory', method: 'Method', obs: 'Data', mcq: 'MCQs' };
  const LOCK = '<svg class="ri-lock" viewBox="0 0 16 16" aria-hidden="true"><path class="shackle" d="M5 7V5a3 3 0 0 1 6 0v2"/><rect x="3.5" y="7" width="9" height="7" rx="1.5"/></svg>';
  const secOf = v => v.id.replace('view-', '').split('-').slice(1).join('-');
  const unlockKey = k => 'sol-unlocked-' + k;
  function unlockedSet(k) { try { return new Set(JSON.parse(sessionStorage.getItem(unlockKey(k)) || '[]')); } catch (_) { return new Set(); } }
  function isOpen(v) { const s = secOf(v); return s === 'practical' || unlockedSet(keyOf(v)).has(s); }
  function unlock(v) {
    const k = keyOf(v), set = unlockedSet(k); set.add(secOf(v));
    try { sessionStorage.setItem(unlockKey(k), JSON.stringify([...set])); } catch (_) { /* storage unavailable: unlocked for this page view only */ }
    memo.add(v.id);
  }
  const memo = new Set();
  const open = v => isOpen(v) || memo.has(v.id);
  function paintLocks() { items.forEach((b, j) => { const o = open(views[j]); b.classList.toggle('locked', !o); b.setAttribute('aria-label', views[j].dataset.title + (o ? '' : ' (locked: opens on click)')); }); }
  function nav() {
    views = Array.from(document.querySelectorAll('.view')); ids = views.map(v => v.id.replace('view-', ''));
    const navEl = $('rail-nav');
    items = views.map((v, i) => {
      const sec = secOf(v), b = document.createElement('button'); b.type = 'button'; b.className = 'ri ri-' + sec; b.dataset.key = keyOf(v); b.dataset.sec = sec;
      b.innerHTML = `<span class="ri-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[sec] || ''}</svg>${sec === 'practical' ? '' : LOCK}</span><span class="ri-l">${v.dataset.title}</span><span class="ri-s">${SHORT[sec] || v.dataset.title}</span><span class="ri-tip" aria-hidden="true">${v.dataset.title}</span>`;
      b.addEventListener('click', () => {
        if (open(v)) { goTo(i, true); return; }
        if (b.classList.contains('unlocking')) return;
        unlock(v); b.classList.add('unlocking');
        setTimeout(() => { b.classList.remove('unlocking'); paintLocks(); goTo(i, true); }, reduced ? 0 : 520);
      });
      navEl.appendChild(b); return b;
    });
    tabs = Array.from(document.querySelectorAll('.lab-tab'));
    tabs.forEach(t => t.addEventListener('click', () => { const i = views.findIndex(v => keyOf(v) === t.dataset.key); if (keyOf(views[current]) !== t.dataset.key) goTo(i, true); }));
    window.addEventListener('popstate', () => goTo(fromHash(), false));
    window.addEventListener('hashchange', () => goTo(fromHash(), false));
  }
  function goTo(i, push) {
    i = clamp(i, 0, views.length - 1);
    if (i === current) return;
    if (!open(views[i])) unlock(views[i]); /* a direct link opens that one section only */
    if (current >= 0 && onLeave[ids[current]]) onLeave[ids[current]]();
    current = i;
    const k = keyOf(views[i]);
    views.forEach((v, j) => v.classList.toggle('active', j === i));
    items.forEach((b, j) => {
      b.hidden = b.dataset.key !== k;
      b.classList.toggle('current', j === i);
      if (j === i) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    paintLocks();
    tabs.forEach((t, j) => { const on = t.dataset.key === k; t.setAttribute('aria-selected', on ? 'true' : 'false'); if (on) $('lab-tabs').dataset.at = String(j); });
    $('top-crumb').innerHTML = `${views[i].dataset.lab} · <b>${views[i].dataset.title}</b>`;
    if (push && location.hash !== '#' + ids[i]) history.pushState(null, '', '#' + ids[i]);
    window.scrollTo({ top: 0 });
    document.title = views[i].dataset.title + ' · ' + views[i].dataset.lab;
    if (onEnter[ids[i]]) onEnter[ids[i]]();
  }
  function fromHash() { const k = ids.indexOf(location.hash.replace('#', '')); return k < 0 ? 0 : k; }

  /* ---------- custom cursor: a droplet, its tip is the hotspot ---------- */
  let cursorOn = false, lastTick = 0;
  function cursor() {
    const cur = $('cursor');
    if (!window.matchMedia('(pointer:fine)').matches) return;
    window.addEventListener('mousemove', e => {
      if (!cursorOn) { document.body.classList.add('has-cursor'); cursorOn = true; }
      cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
      cur.classList.remove('hidden');
      const t = e.target && e.target.closest ? e.target : null;
      const grab = t && t.closest('.drag, .gh, .term-pt');
      const hot = t && t.closest('button:not(:disabled), a, select, label, input[type=range], .live, .sym, .num');
      cur.classList.toggle('grab', !!grab); cur.classList.toggle('hot', !!hot && !grab);
    }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.add('hidden'));
    window.addEventListener('blur', () => cur.classList.add('hidden'));
    document.addEventListener('pointerdown', () => cursorTick(), true);
  }
  function cursorTick() {
    if (!cursorOn) return; const n = performance.now(); if (n - lastTick < 90) return; lastTick = n;
    const cur = $('cursor'); cur.classList.remove('tick'); void cur.offsetWidth; cur.classList.add('tick');
  }

  /* ---------- plot frame: upright axis labels, unsigned ticks ---------- */
  /* positive ticks carry no sign; negative ones a true minus */
  const tick = (v, d) => { const s = Math.abs(v).toFixed(d || 0); return v < -1e-9 ? '−' + s : s; };
  function makePlot(svg, o) {
    const W = o.W, H = o.H, ml = o.ml || 78, mr = o.mr || 26, mt = o.mt || 46, mb = o.mb || 62;
    const x0 = o.xmin || 0, y0 = o.ymin || 0;
    const X = v => ml + (v - x0) / (o.xmax - x0) * (W - ml - mr), Y = v => H - mb - (v - y0) / (o.ymax - y0) * (H - mt - mb);
    const ix = px => x0 + (px - ml) / (W - ml - mr) * (o.xmax - x0), iy = py => y0 + (H - mb - py) / (H - mt - mb) * (o.ymax - y0);
    svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const g = el('g', null, svg);
    el('rect', { x: ml, y: mt, width: W - ml - mr, height: H - mt - mb, fill: 'var(--plot)' }, g);
    for (let v = x0; v <= o.xmax + 1e-9; v += (o.xminor || o.xstep / 2)) for (let w = y0; w <= o.ymax + 1e-9; w += (o.yminor || o.ystep / 2)) el('circle', { cx: X(v), cy: Y(w), r: 1.3, fill: 'var(--plot-dot)' }, g);
    for (let v = x0; v <= o.xmax + 1e-9; v += o.xstep) {
      el('line', { x1: X(v), y1: mt, x2: X(v), y2: H - mb, stroke: 'var(--plot-grid)', 'stroke-width': 1, 'stroke-dasharray': '3 5' }, g);
      el('line', { x1: X(v), y1: H - mb - 6, x2: X(v), y2: H - mb, stroke: C.acc, 'stroke-width': 1.2 }, g);
      txt(g, X(v), H - mb + 24, tick(v, o.xdec), { 'text-anchor': 'middle', 'font-size': 15, fill: C.ink2, 'font-family': F_BODY });
    }
    for (let v = y0; v <= o.ymax + 1e-9; v += o.ystep) {
      el('line', { x1: ml, y1: Y(v), x2: W - mr, y2: Y(v), stroke: 'var(--plot-grid)', 'stroke-width': 1, 'stroke-dasharray': '3 5' }, g);
      el('line', { x1: ml, y1: Y(v), x2: ml + 6, y2: Y(v), stroke: C.acc, 'stroke-width': 1.2 }, g);
      txt(g, ml - 10, Y(v) + 5, tick(v, o.ydec), { 'text-anchor': 'end', 'font-size': 15, fill: C.ink2, 'font-family': F_BODY });
    }
    el('line', { x1: ml, y1: H - mb, x2: W - mr + 8, y2: H - mb, stroke: C.ink, 'stroke-width': 1.6 }, g);
    if (y0 < 0) el('line', { x1: ml, y1: Y(0), x2: W - mr + 8, y2: Y(0), stroke: C.ink2, 'stroke-width': 1.2 }, g);
    el('line', { x1: ml, y1: H - mb, x2: ml, y2: mt - 10, stroke: C.ink, 'stroke-width': 1.6 }, g);
    tsub(g, (ml + W - mr) / 2, H - 14, o.xlabel, { 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600, fill: C.ink, 'font-family': F_BODY });
    tsub(g, ml - 8, mt - 20, o.ylabel, { 'text-anchor': 'start', 'font-size': 16, 'font-weight': 600, fill: C.ink, 'font-family': F_BODY });
    const plot = el('g', null, svg);
    return { X, Y, ix, iy, g: plot, ml, mr, mt, mb, W, H };
  }

  /* ---------- MCQs: numbered, choices shuffled, hint on a wrong pick, explanation on the right one ---------- */
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function mcq(listEl, data, scoreEl, resetBtn) {
    let solved = 0, firstTry = 0;
    function render() {
      solved = 0; firstTry = 0; listEl.innerHTML = '';
      data.forEach((q, qi) => {
        const li = document.createElement('li'); li.className = 'mcq';
        li.innerHTML = `<p class="mcq-q"><span class="mcq-n">${qi + 1}.</span><span>${q.q}</span></p><div class="mcq-opts"></div><div class="mcq-fb" aria-live="polite"></div>`;
        const opts = li.querySelector('.mcq-opts'), fb = li.querySelector('.mcq-fb'); let tries = 0;
        shuffle(q.o.map((t, i) => ({ t, i }))).forEach(c => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.innerHTML = c.t; b.dataset.k = c.i === 0 ? 'right' : 'wrong';
          b.addEventListener('click', () => {
            tries++;
            if (c.i === 0) {
              b.classList.add('right'); opts.querySelectorAll('.opt').forEach(x => x.disabled = true);
              fb.className = 'mcq-fb show explain'; fb.innerHTML = q.e; li.classList.add('solved'); solved++; if (tries === 1) firstTry++; upd();
            } else { b.classList.add('wrong'); b.disabled = true; fb.className = 'mcq-fb show hint'; fb.innerHTML = q.h; }
          });
          opts.appendChild(b);
        });
        listEl.appendChild(li);
      });
      upd();
    }
    function upd() { scoreEl.textContent = `${solved} / ${data.length} answered · ${firstTry} on the first try`; }
    resetBtn.addEventListener('click', render); render();
  }

  /* ---------- extras: opens upward, closes about 500 ms after the pointer leaves ---------- */
  function extras() {
    document.querySelectorAll('.extras').forEach(box => {
      const btn = box.querySelector('.extras-toggle'); let t = null, openedAt = 0;
      const open = () => { clearTimeout(t); if (!box.classList.contains('open')) openedAt = Date.now(); box.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); };
      const close = () => { clearTimeout(t); box.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
      const later = () => { clearTimeout(t); t = setTimeout(close, 500); };
      box.addEventListener('mouseenter', open); box.addEventListener('mouseleave', later);
      btn.addEventListener('click', () => { if (!box.classList.contains('open')) open(); else if (Date.now() - openedAt > 350) close(); });
      box.addEventListener('focusin', open); box.addEventListener('focusout', e => { if (!box.contains(e.relatedTarget)) later(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    });
  }

  /* ---------- method steps: a list that drives a figure ---------- */
  function methodSteps(listEl, capEl, draw, caps) {
    const btns = Array.from(listEl.querySelectorAll('.step'));
    function sel(i) { btns.forEach((b, k) => b.setAttribute('aria-pressed', k === i ? 'true' : 'false')); capEl.textContent = caps[i]; draw(i); }
    btns.forEach((b, i) => b.addEventListener('click', () => sel(i)));
    sel(0);
  }

  Object.assign(L, { raw, TC, tnow, tcSet, NS, reduced, el, txt, tsub, $, clamp, sleep, svgPoint, parseNum, near, fmt, mulberry32, F_HEAD, F_BODY, C, defs, makePlot, mcq, methodSteps, onEnter, onLeave, goTo, cursorTick, shuffle });
  L._init = [background, nav, cursor, extras];
  L.boot = () => { L._init.forEach(f => f()); goTo(fromHash(), false); };
  return L;
})();
