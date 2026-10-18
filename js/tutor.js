/* Shared tutorial engine (Previous / Next / Pause / Speed / Stop) and traceable calculation */
(function (L) {
  'use strict';
  const { $, el, NS, clamp, tnow, tcSet, TC, sleep } = L;
  const tut = { on: false, cancel: false, skip: false, idx: -1, ff: false, target: 0, restartTo: null, gen: 0, lab: null, live: null };
  L.tut = tut;
  const STOP = new Error('tutorial-stop'); L.STOP = STOP;
  const bar = $('tut-bar'), tTitle = $('tut-title'), tText = $('tut-text'), tF = $('tut-f');
  const btnPause = $('tut-pause'), selSpeed = $('tut-speed'), btnPrevS = $('tut-prev'), btnNextS = $('tut-next');
  const LABS = {};

  /* ---------- spotlight ---------- */
  const spotCap = document.createElement('div'); spotCap.className = 'spot-cap'; spotCap.setAttribute('aria-hidden', 'true'); document.body.appendChild(spotCap);
  const spotRing = document.createElement('div'); spotRing.className = 'spot-ring'; spotRing.setAttribute('aria-hidden', 'true'); document.body.appendChild(spotRing);
  let hiEls = [], spotT = null;
  function hi(...els) { hiEls.forEach(e => e.classList.remove('tut-hi')); hiEls = els.filter(Boolean); hiEls.forEach(e => e.classList.add('tut-hi')); }
  function boxRect(t) {
    const m = t.svg.getScreenCTM(); if (!m) return null; const b = typeof t.box === 'function' ? t.box() : t.box; if (!b) return null;
    const p1 = new DOMPoint(b[0], b[1]).matrixTransform(m), p2 = new DOMPoint(b[0] + b[2], b[1] + b[3]).matrixTransform(m);
    return { left: p1.x, top: p1.y, right: p2.x, bottom: p2.y, width: p2.x - p1.x, height: p2.y - p1.y };
  }
  function spot(t, label) {
    hi(); spotT = null; spotRing.classList.remove('on');
    if (!t) { spotCap.classList.remove('on'); return; }
    if (t.svg) { spotT = { box: t }; spotRing.classList.add('on'); }
    else if (t.namespaceURI === NS && t.tagName !== 'svg') { spotT = { ring: t }; spotRing.classList.add('on'); }
    else { hi(t); spotT = { el: t }; }
    spotCap.textContent = label || ''; spotCap.classList.toggle('on', !!label);
  }
  function spotRect() { if (!spotT) return null; if (spotT.box) return boxRect(spotT.box); const e = spotT.el || spotT.ring; return e.isConnected ? e.getBoundingClientRect() : null; }
  function rectOf(t) { if (!t) return null; if (t.svg) return boxRect(t); return t.getBoundingClientRect(); }
  const BAR_H = () => (bar.hidden ? 0 : bar.offsetHeight + 16);
  if (window.ResizeObserver) new ResizeObserver(() => document.documentElement.style.setProperty('--dock-h', (bar.hidden ? 0 : bar.offsetHeight + 16) + 'px')).observe(bar);
  function placeNear(node, r, prefer) {
    const w = node.offsetWidth, h = node.offsetHeight, vw = document.documentElement.clientWidth, vh = window.innerHeight - BAR_H();
    const x = clamp(r.left + r.width / 2 - w / 2, 8, Math.max(8, vw - w - 8));
    let y = prefer === 'below' ? r.bottom + 10 : r.top - h - 10;
    if (prefer === 'below' && y + h > vh && r.top - h - 10 > 8) y = r.top - h - 10;
    if (prefer !== 'below' && y < 8) y = r.bottom + 10;
    node.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  /* ---------- traceable calculation ---------- */
  const SUBD = '₀₁₂₃₄₅₆₇₈₉';
  const plain = h => String(h).replace(/<sub>(\d+)<\/sub>/g, (m, s) => s.replace(/\d/g, d => SUBD[+d])).replace(/<sub>([^<]*)<\/sub>/g, (m, s) => '_' + s).replace(/<sup>2<\/sup>/g, '²').replace(/<sup>3<\/sup>/g, '³').replace(/<sup>−1<\/sup>/g, '⁻¹').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
  L.plain = plain;
  const filled = e => !!e && (e.tagName === 'INPUT' ? e.value.trim() !== '' : !!e.textContent.trim() && e.textContent.trim() !== '—');
  L.filled = filled;
  const panels = [];
  function infoFor(node) { const p = panels.find(p => p.el.contains(node)); if (!p) return null; return p.INFO(node.dataset.ref || node.dataset.sym, node); }
  const trSvg = document.createElementNS(NS, 'svg'); trSvg.setAttribute('class', 'trace-svg'); trSvg.setAttribute('aria-hidden', 'true'); document.body.appendChild(trSvg);
  const trPath = el('path', { class: 'trace-line', d: '' }, trSvg), trEnd = el('circle', { class: 'trace-dot', r: 4.5, cx: -20, cy: -20 }, trSvg), trBeg = el('circle', { class: 'trace-dot0', r: 3, cx: -20, cy: -20 }, trSvg);
  const trTip = document.createElement('div'); trTip.className = 'trace-tip'; trTip.id = 'trace-tip'; trTip.setAttribute('role', 'tooltip'); document.body.appendChild(trTip);
  const TR = { on: false, from: null, srcFn: null, cur: null, pinned: false };
  L.TR = TR;
  function traceShow(node, o) {
    o = o || {};
    let inf = o.info; if (!inf) { inf = infoFor(node); if (!inf) return; }
    traceHide();
    const isNum = node.classList.contains('num');
    const title = o.info ? inf.title : isNum ? `${node.textContent.trim()} = ${inf.nm}` : inf.title;
    TR.on = true; TR.from = node; TR.srcFn = inf.src || (() => null); TR.cur = null; TR.pinned = !!o.pinned;
    node.classList.add('tr-act'); node.setAttribute('aria-describedby', 'trace-tip');
    trTip.innerHTML = `<b>${title}</b><span>${inf.where}</span><button type="button" class="trace-jump" tabindex="-1"></button>`;
    trTip.classList.add('on'); TR.title = plain(title); TR.where = plain(inf.where);
    drawTrace();
  }
  function traceHide() {
    if (!TR.on) return; TR.on = false;
    if (TR.from) { TR.from.classList.remove('tr-act'); TR.from.removeAttribute('aria-describedby'); }
    if (TR.cur) TR.cur.classList.remove('trace-src');
    TR.cur = null; trTip.classList.remove('on'); trSvg.classList.remove('on');
  }
  function drawTrace() {
    if (!TR.on) return;
    const from = TR.from; if (!from.isConnected || !from.offsetParent) { traceHide(); return; }
    const s = TR.srcFn(), src = s && s.isConnected && (s.namespaceURI === NS || filled(s)) ? s : null;
    if (TR.cur !== src) { if (TR.cur) TR.cur.classList.remove('trace-src'); TR.cur = src; if (TR.cur) TR.cur.classList.add('trace-src'); }
    const a = from.getBoundingClientRect();
    if (!TR.cur) { trSvg.classList.remove('on'); trTip.classList.remove('off'); placeNear(trTip, a, 'below'); return; }
    const b = TR.cur.getBoundingClientRect();
    const bcx = b.left + b.width / 2, bcy = b.top + b.height / 2, up = bcy < a.top + a.height / 2;
    placeNear(trTip, a, up ? 'below' : 'above');
    const sx = a.left + a.width / 2, sy = up ? a.top - 2 : a.bottom + 2;
    let ex = clamp(sx, b.left + 4, b.right - 4), ey = up ? b.bottom + 5 : b.top - 5;
    if (Math.abs(bcy - (a.top + a.height / 2)) < Math.max(a.height, b.height) / 2 + 6) { ey = bcy; ex = bcx < sx ? b.right + 5 : b.left - 5; }
    const my = (sy + ey) / 2;
    trPath.setAttribute('d', `M${sx.toFixed(1)} ${sy.toFixed(1)} C${sx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`);
    trEnd.setAttribute('cx', ex.toFixed(1)); trEnd.setAttribute('cy', ey.toFixed(1)); trBeg.setAttribute('cx', sx.toFixed(1)); trBeg.setAttribute('cy', sy.toFixed(1));
    trSvg.classList.add('on');
    const off = b.bottom < 0 ? 'up' : b.top > window.innerHeight - BAR_H() ? 'down' : '';
    trTip.classList.toggle('off', !!off);
    const j = trTip.querySelector('.trace-jump'); if (j) j.textContent = off === 'up' ? '↑ Jump to source' : off === 'down' ? '↓ Jump to source' : '';
  }
  (function overlays() {
    const r = spotRect();
    if (r && (spotT.ring || spotT.box)) { const p = 6; spotRing.style.transform = `translate(${Math.round(r.left - p)}px, ${Math.round(r.top - p)}px)`; spotRing.style.width = Math.round(r.width + 2 * p) + 'px'; spotRing.style.height = Math.round(r.height + 2 * p) + 'px'; }
    if (r && spotCap.classList.contains('on')) placeNear(spotCap, r, 'above');
    if (TR.on) drawTrace();
    requestAnimationFrame(overlays);
  })();
  let trHideT = null, lastPT = 'mouse', trHiding = false;
  const SEL = '.sym, .num';
  function trNode(e) { const n = e.target && e.target.closest ? e.target.closest(SEL) : null; return n && panels.some(p => p.el.contains(n)) ? n : null; }
  function registerTrace(panel, INFO) {
    panels.push({ el: panel, INFO });
    panel.addEventListener('pointerdown', e => { lastPT = e.pointerType || 'mouse'; }, true);
    panel.addEventListener('pointerover', e => {
      if (e.pointerType !== 'mouse' || tut.on) return;
      const n = trNode(e); if (!n) return;
      clearTimeout(trHideT); trHiding = false; if (!TR.on || TR.from !== n) traceShow(n);
    });
    panel.addEventListener('click', e => {
      const n = trNode(e); if (!n) return;
      e.preventDefault();
      if (tut.on || lastPT === 'mouse') return;
      if (TR.on && TR.from === n) traceHide(); else traceShow(n, { pinned: true });
    });
    panel.addEventListener('keydown', e => { const n = trNode(e); if (n && (e.key === 'Enter' || e.key === ' ') && !tut.on) { e.preventDefault(); if (TR.on && TR.from === n) traceHide(); else traceShow(n, { pinned: true }); } });
    panel.addEventListener('focusin', e => { const n = trNode(e); if (n && !tut.on && lastPT === 'mouse') traceShow(n); });
    panel.addEventListener('focusout', e => { const n = trNode(e); if (n && !tut.on && TR.from === n && !trTip.contains(e.relatedTarget)) traceHide(); });
  }
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || !TR.on || TR.pinned || tut.on) return;
    const t = e.target, over = t && t.closest && (TR.from.contains(t) || trTip.contains(t));
    if (over) { clearTimeout(trHideT); trHiding = false; }
    else if (!trHiding) { trHiding = true; trHideT = setTimeout(() => { trHiding = false; traceHide(); }, 260); }
  }, { passive: true });
  document.addEventListener('pointerdown', e => { if (TR.on && !tut.on && !(e.target.closest && (e.target.closest('.trace-tip') || trNode(e)))) traceHide(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !tut.on) traceHide(); });
  trTip.addEventListener('click', e => {
    if (!e.target.closest('.trace-jump') || !TR.cur) return;
    const r = TR.cur.getBoundingClientRect();
    window.scrollTo({ top: Math.max(0, window.scrollY + r.top - (window.innerHeight - BAR_H()) / 2 + r.height / 2), behavior: 'smooth' });
  });
  const NUM = (ref, v) => `<span class="num" tabindex="0" data-ref="${ref}">${v}</span>`;
  function setWork(w, html) { html = (html || '').replace(/ ÷ /g, ' <span class="op">÷</span> '); if (TR.on && w.contains(TR.from)) traceHide(); w.innerHTML = html || ''; }
  Object.assign(L, { traceShow, traceHide, registerTrace, NUM, setWork });

  /* ---------- playback ---------- */
  let pausedAnims = [];
  function setPaused(p) {
    tcSet({ paused: p });
    btnPause.classList.toggle('paused', p); btnPause.setAttribute('aria-pressed', p ? 'true' : 'false');
    btnPause.querySelector('.tl').textContent = p ? 'Resume' : 'Pause'; btnPause.title = p ? 'Resume (Space)' : 'Pause (Space)';
    document.body.classList.toggle('tut-paused', p);
    if (p) { pausedAnims = document.getAnimations().filter(a => a.playState === 'running'); pausedAnims.forEach(a => a.pause()); }
    else { pausedAnims.forEach(a => { try { a.play(); } catch (_) { /* finished */ } }); pausedAnims = []; }
  }
  function resetPlayback() { setPaused(false); tcSet({ speed: 1 }); selSpeed.value = '1'; }
  btnPause.addEventListener('click', () => { if (tut.on) setPaused(!TC.paused); });
  selSpeed.addEventListener('change', () => { tcSet({ speed: +selSpeed.value || 1 }); });
  document.addEventListener('keydown', e => {
    if (!tut.on || e.code !== 'Space' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest && e.target.closest('input, select, textarea, button, a, [role="button"], [role="slider"], [tabindex]')) return;
    e.preventDefault(); setPaused(!TC.paused);
  });
  function wait(ms) {
    return new Promise((res, rej) => { const t0 = tnow(); (function c() { if (tut.cancel) return rej(STOP); if (tut.skip || tnow() - t0 >= ms) return res(); setTimeout(c, 25); })(); });
  }
  /* a tween on the tutorial clock: honours pause, speed and step skipping; outside a tutorial it runs in real time */
  function tween(ms, fn) {
    return new Promise(res => {
      const t0 = tnow(), g0 = tut.gen;
      (function f() {
        if (g0 !== tut.gen) { fn(1); return res(); }
        let k = ms > 0 ? Math.min(1, (tnow() - t0) / ms) : 1; if (tut.on && (tut.skip || tut.cancel)) k = 1;
        fn(k);
        if (k < 1) requestAnimationFrame(f); else res();
      })();
    });
  }
  const ease = k => (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  function tScroll(y) { return tween(Math.min(900, 250 + Math.abs(y - window.scrollY) * .5), (() => { const y0 = window.scrollY; return k => window.scrollTo({ top: y0 + (y - y0) * ease(k), behavior: 'instant' }); })()); }
  function step(title, text, f) { navStep(); tTitle.textContent = title; tText.textContent = text; tF.innerHTML = f || ''; }
  const words = s => (String(s || '').replace(/<[^>]+>/g, ' ').match(/\S+/g) || []).length;
  const rt = (...s) => 2500 + 60 * s.reduce((a, x) => a + words(x), 0);
  /* the visible band between the sticky header (top bar, plus the section row on narrow screens) and the floating dock */
  function availRect() {
    let top = 0;
    const tb = document.querySelector('.topbar'); if (tb) top = Math.max(top, tb.getBoundingClientRect().bottom);
    const rail = document.getElementById('rail-nav');
    if (rail && getComputedStyle(rail).position === 'sticky') top = Math.max(top, rail.getBoundingClientRect().bottom);
    return [top + 8, window.innerHeight - BAR_H() - 8];
  }
  /* how much of a rect lies inside the visible band (0..1) */
  function visFrac(r) { if (!r || r.height <= 0) return 0; const [a0, a1] = availRect(); const vis = Math.max(0, Math.min(r.bottom, a1) - Math.max(r.top, a0)); return vis / r.height; }
  function unionOf(rs) { rs = rs.filter(Boolean); if (!rs.length) return null; const t = Math.min(...rs.map(r => r.top)), b = Math.max(...rs.map(r => r.bottom)); return { top: t, bottom: b, height: b - t }; }
  /* show a set of focus targets: all of them if they fit, otherwise the first (the apparatus), which is where the result happens */
  async function show(focus) {
    const rs = focus.map(rectOf).filter(Boolean); if (!rs.length) return;
    const [a0, a1] = availRect(), u = unionOf(rs);
    await bringIn(u.height <= a1 - a0 ? u : rs[0]);
  }
  async function bringIn(r) {
    if (!r) return;
    const [a0, a1] = availRect();
    if (r.top >= a0 - 2 && r.bottom <= a1 + 2) return;
    let y = window.scrollY + (r.top + r.bottom) / 2 - (a0 + a1) / 2;
    if (r.height > a1 - a0) y = window.scrollY + r.top - a0;
    await tScroll(Math.max(0, y)); await wait(350);
  }
  function unionRect(a, b) { const t = Math.min(a.top, b.top), btm = Math.max(a.bottom, b.bottom); return { top: t, bottom: btm, height: btm - t }; }
  async function teach(title, text, o) {
    o = o || {};
    traceHide();
    if (o.trace && !o.keepText) { const n = o.trace, inf = o.info || infoFor(n); title = plain(o.info ? inf.title : n.classList.contains('num') ? `${n.textContent.trim()} = ${inf.nm}` : inf.title); text = plain(inf.where); }
    step(title, text, o.f);
    let t = o.box || o.el;
    if (!o.focus && t) { /* anything on or inside an apparatus frame brings the whole apparatus into view */
      const node = t.svg || t, fr = node.closest && node.closest('.rig-frame');
      if (fr && fr !== t) o.focus = [fr];
    }
    if (o.focus) {
      const f = o.focus.filter(Boolean);
      await show(t && !f.includes(t) ? f.concat([t]) : f);
      if (t && visFrac(rectOf(t)) < .99 && o.alt) t = o.alt; /* the control is off-screen: point at the part of the apparatus it acts on */
      spot(t, o.label);
    } else if (t) { await bringIn(rectOf(t)); spot(t, o.label); } else spot(null);
    logStep(title, o.focus || (t ? [t] : []), t);
    if (o.trace) {
      const n = o.trace, inf = o.info || infoFor(n), s = inf && inf.src ? inf.src() : null;
      const nr = n.getBoundingClientRect();
      if (s && s.isConnected) { const sr = s.getBoundingClientRect(), [a0, a1] = availRect(); await bringIn(unionRect(nr, sr).height <= a1 - a0 - 90 ? unionRect(nr, sr) : sr); }
      else await bringIn(nr);
      traceShow(n, o.info ? { info: o.info } : null);
    }
    await wait(o.ms != null ? o.ms : rt(title, text, o.f));
  }
  /* step log for checks: how much of each focus target and of the spotlight target is in view when the step starts */
  tut.log = [];
  function logStep(title, focus, t) { tut.log.push({ idx: tut.idx, title, focus: focus.map(f => +visFrac(rectOf(f)).toFixed(3)), spot: t ? +visFrac(rectOf(t)).toFixed(3) : null }); }
  async function traceLine(w) {
    const seen = new Set();
    for (const n of w.querySelectorAll('.num')) { const k = n.dataset.ref; if (seen.has(k)) continue; seen.add(k); await teach('', '', { trace: n }); }
  }
  async function typeInto(inp, value, perChar) {
    inp.focus({ preventScroll: true }); inp.value = '';
    for (const ch of String(value)) { inp.value += ch; inp.dispatchEvent(new Event('input', { bubbles: true })); await wait(perChar || 90); }
    inp.blur(); inp.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function say(html) { tF.innerHTML = html || ''; }

  /* ---------- step navigation: Previous replays instantly up to the step before, Next finishes the current step ---------- */
  function updNav() { bar.dataset.step = tut.idx; bar.dataset.lab = tut.lab || ''; btnPrevS.disabled = !tut.on || (tut.restartTo != null ? tut.restartTo : tut.ff ? tut.target : tut.idx) <= 0; }
  function freezeNew() { const more = document.getAnimations().filter(a => a.playState === 'running'); more.forEach(a => a.pause()); pausedAnims.push(...more); }
  function navBegin(target, scope) {
    if (target === undefined) tut.live = Array.from(scope.querySelectorAll('[aria-live="polite"]')).filter(e => !bar.contains(e) && !e.querySelector('svg, canvas, input, button, select')).map(e => [e, e.innerHTML, e.className]);
    else if (tut.live) tut.live.forEach(([e, h, c]) => { e.innerHTML = h; e.className = c; });
    if (target !== undefined) {
      pausedAnims = pausedAnims.filter(a => {
        let finite = false; try { finite = a.effect && a.effect.getComputedTiming().endTime !== Infinity; } catch (_) { /* ignore */ }
        if (finite) { try { a.finish(); } catch (_) { /* ignore */ } }
        return !finite;
      });
    }
    tut.idx = -1; tut.target = target || 0; tut.ff = tut.target > 0; tut.skip = tut.ff; tut.restartTo = null;
    document.body.classList.toggle('tut-ff', tut.ff); updNav();
  }
  function navStep() {
    tut.idx++;
    if (tut.ff && tut.idx >= tut.target) { tut.ff = false; document.body.classList.remove('tut-ff'); }
    tut.skip = tut.ff;
    if (TC.paused && !tut.ff) requestAnimationFrame(freezeNew);
    updNav();
  }
  function navPrev() {
    if (!tut.on && tut.restartTo == null) return;
    if (tut.restartTo != null) tut.restartTo = Math.max(0, tut.restartTo - 1);
    else if (tut.ff) tut.target = Math.max(0, tut.target - 1);
    else { if (tut.idx <= 0) return; tut.restartTo = tut.idx - 1; tut.cancel = true; tut.gen++; }
    updNav();
  }
  function navNext() {
    if (!tut.on && tut.restartTo == null) return;
    if (tut.restartTo != null) tut.restartTo++;
    else if (tut.ff) tut.target++;
    else tut.skip = true;
    updNav();
  }
  btnPrevS.addEventListener('click', navPrev); btnNextS.addEventListener('click', navNext);
  document.addEventListener('keydown', e => {
    if (!tut.on || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    const t = e.target;
    if (t.closest && t.closest('select, textarea, input, [contenteditable], [role="slider"], [role="spinbutton"], [tabindex]:not(button):not(a)')) return;
    e.preventDefault(); if (e.key === 'ArrowLeft') navPrev(); else navNext();
  });
  function stop() { if (!tut.on) return; tut.restartTo = null; tut.cancel = true; tut.gen++; }
  $('tut-stop').addEventListener('click', stop);

  const T = { teach, step, wait, spot, tween, ease, traceLine, typeInto, bringIn, show, visFrac, say, rt, STOP, rectOf, get skip() { return tut.skip; } };
  async function run(lab, target) {
    const cfg = LABS[lab];
    tut.on = true; tut.cancel = false; tut.lab = lab; navBegin(target, cfg.scope);
    document.body.classList.add('tut-on'); bar.hidden = false; Object.values(LABS).forEach(c => { c.btn.disabled = true; });
    try {
      if (target === undefined) tut.log = [];
      cfg.reset(); cfg.seed();
      await cfg.run(T);
    } catch (e) {
      if (e !== STOP) throw e;
    } finally {
      const again = tut.restartTo; tut.restartTo = null; tut.gen++; tut.ff = false; document.body.classList.remove('tut-ff');
      tut.on = false; tut.skip = false; tut.cancel = false; if (again == null) resetPlayback(); spot(null); traceHide();
      cfg.cleanup();
      if (again == null) { document.body.classList.remove('tut-on'); bar.hidden = true; Object.values(LABS).forEach(c => { c.btn.disabled = false; }); tut.lab = null; }
      updNav();
      if (again != null) setTimeout(() => run(lab, again), 0);
    }
  }
  function registerLab(lab, cfg) { LABS[lab] = cfg; cfg.btn.addEventListener('click', () => { if (!tut.on) run(lab); }); }
  Object.assign(L, { registerLab, tutStop: stop, tween, ease, wait });
})(window.SOL);
