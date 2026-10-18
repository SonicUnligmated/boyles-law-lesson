/* Figures, theory explorer, method steps, worked example and MCQs */
(function (L) {
  'use strict';
  const { el, txt, $, C, F_HEAD, F_BODY, raw, makePlot } = L;
  const P = 'boy';
  const T = (g, x, y, s, o) => txt(g, x, y, s, Object.assign({ 'font-family': F_BODY, 'font-size': 14, fill: C.ink2 }, o || {}));
  const W = (g, d, o) => el('path', Object.assign({ d, fill: 'none', stroke: C.ink2, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, o || {}), g);
  const OIL = raw('#f0a640'), GLASS = 'rgba(160,220,255,.10)', GLINE = 'rgba(160,220,255,.55)';
  const sgf = (v, d) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(d);

  /* a small tube: air of height h above oil, with n molecules spread through the air */
  function tube(g, x, y, w, H, h, n, seed) {
    el('rect', { x, y, width: w, height: H, rx: w / 2, fill: GLASS, stroke: GLINE, 'stroke-width': 1.6 }, g);
    el('rect', { x: x + 3, y: y + h, width: w - 6, height: H - h - 3, rx: 2, fill: OIL, opacity: .85 }, g);
    el('path', { d: `M${x + 3} ${y + h} Q${x + w / 2} ${y + h + 5} ${x + w - 3} ${y + h}`, fill: 'none', stroke: raw('#ffd890'), 'stroke-width': 1.4 }, g);
    const r = L.mulberry32(seed || 5);
    for (let i = 0; i < n; i++) el('circle', { cx: x + 5 + r() * (w - 10), cy: y + 6 + r() * (h - 10), r: 2.4, fill: C.acc2, opacity: .85 }, g);
  }
  /* small axes for P against 1/V */
  function lineFig(g, x, y, w, h, o) {
    o = o || {}; const oy = y + h * (o.zero || .62);
    W(g, `M${x} ${y + h} L${x} ${y}`, { stroke: C.ink, 'stroke-width': 1.6 }); W(g, `M${x} ${oy} L${x + w} ${oy}`, { stroke: C.ink, 'stroke-width': 1.6 });
    const y0 = y + h - 8, y1 = y + 10, x1 = x + w - 10;
    const xs = [.36, .5, .63, .77, .9];
    W(g, `M${x} ${y0} L${x + w * .3} ${y0 - (y0 - y1) * .3}`, { stroke: C.acc, 'stroke-dasharray': '6 5' });
    W(g, `M${x + w * .3} ${y0 - (y0 - y1) * .3} L${x1} ${y1}`, { stroke: C.acc, 'stroke-width': 2.6 });
    xs.forEach(f => el('circle', { cx: x + w * f, cy: y0 - (y0 - y1) * (f * w / (x1 - x)) + (f === .63 ? 2 : f === .5 ? -2 : 0), r: 4.5, fill: C.ink, stroke: 'var(--bg)', 'stroke-width': 1.5 }, g));
    el('circle', { cx: x, cy: y0, r: 6, fill: 'none', stroke: C.warn, 'stroke-width': 2 }, g);
    T(g, x + 12, y0 + 5, '−P₀', { fill: C.warn, 'font-weight': 700, 'font-family': F_HEAD, 'font-size': 15 });
    txt(g, x + w + 4, oy + 18, '1/V', { 'text-anchor': 'end', 'font-size': 14, fill: C.ink, 'font-style': 'italic', 'font-family': F_BODY });
    T(g, x + 8, y + 6, 'P', { 'font-size': 14, fill: C.ink, 'font-style': 'italic' });
    T(g, x - 8, oy + 5, '0', { 'text-anchor': 'end', 'font-size': 13 });
    return { oy, y0 };
  }

  /* aim figure */
  (function aim() {
    const s = $(P + '-aim-fig'); if (!s) return; const g = el('g', null, s);
    tube(g, 90, 30, 46, 220, 150, 24, 3); tube(g, 230, 30, 46, 220, 75, 24, 3);
    T(g, 113, 280, 'low P', { 'text-anchor': 'middle', fill: C.ink, 'font-weight': 600 }); T(g, 253, 280, 'high P', { 'text-anchor': 'middle', fill: C.ink, 'font-weight': 600 });
    W(g, 'M150 110 L214 110', { stroke: C.aqua, 'stroke-width': 2 }); W(g, 'M206 104 L214 110 L206 116', { stroke: C.aqua, 'stroke-width': 2 });
    T(g, 182, 98, 'squeeze', { 'text-anchor': 'middle', 'font-size': 12.5, fill: C.aqua });
    T(g, 330, 95, 'Same air, same temperature:', { fill: C.ink, 'font-weight': 600 });
    T(g, 330, 122, 'half the volume, twice the pressure', { fill: C.ink2 });
    T(g, 330, 160, '(P + P₀) V = constant', { fill: C.acc2, 'font-weight': 700, 'font-family': F_HEAD, 'font-size': 17 });
    lineFig(g, 590, 40, 180, 220);
  })();

  /* theory explorer: piston over molecules, with P against V and P against 1/V */
  (function explorer() {
    const s = $(P + '-th-svg'), inp = $(P + '-th-v'), out = $(P + '-th-out'); if (!s) return;
    const K = 48.66, N = 46, r = L.mulberry32(9);
    const mol = Array.from({ length: N }, () => ({ x: r(), y: r(), vx: r() - .5, vy: r() - .5 }));
    s.innerHTML = ''; const g = el('g', null, s);
    /* cylinder: base at y 270, piston height proportional to V */
    const cx = 40, cw = 200, base = 270, pxPer = 3.6;
    el('rect', { x: cx - 6, y: 40, width: cw + 12, height: base - 40 + 8, rx: 6, fill: 'none', stroke: GLINE, 'stroke-width': 2 }, g);
    const gas = el('rect', { x: cx, y: 0, width: cw, height: 0, fill: 'rgba(70,210,232,.08)' }, g);
    const molG = el('g', null, g);
    mol.forEach(() => el('circle', { r: 3, fill: C.acc2 }, molG));
    const pis = el('g', null, g);
    el('rect', { x: cx, y: -14, width: cw, height: 14, rx: 3, fill: 'var(--rg-steel-2)', stroke: 'var(--rg-steel-4)' }, pis);
    el('rect', { x: cx + cw / 2 - 6, y: -60, width: 12, height: 46, fill: 'var(--rg-steel-3)' }, pis);
    const pT = T(g, cx + cw / 2, 30, '', { 'text-anchor': 'middle', fill: C.ink, 'font-weight': 700, 'font-family': F_HEAD });
    /* two small plots */
    const p1 = { x: 300, y: 40, w: 180, h: 200 }, p2 = { x: 530, y: 40, w: 180, h: 200 };
    const VM = 60, PM = 4.2, IM = 1 / 12;
    [[p1, 'V (cm³)', 'P–V: a curve'], [p2, '1/V (cm⁻³)', 'P–1/V: a line']].forEach(([p, xl, tl]) => {
      W(g, `M${p.x} ${p.y} L${p.x} ${p.y + p.h} L${p.x + p.w} ${p.y + p.h}`, { stroke: C.ink, 'stroke-width': 1.6 });
      T(g, p.x + p.w / 2, p.y + p.h + 24, xl, { 'text-anchor': 'middle', 'font-size': 12.5, 'font-style': 'italic' });
      T(g, p.x + 6, p.y + 4, 'P + P₀ (atm)', { 'font-size': 12.5, 'font-style': 'italic' });
      T(g, p.x + p.w / 2, p.y + p.h + 46, tl, { 'text-anchor': 'middle', 'font-size': 13, fill: C.acc2, 'font-weight': 600 });
    });
    let d1 = '', d2 = '';
    for (let v = 12; v <= VM; v += .5) { const pp = K / v; d1 += `${d1 ? 'L' : 'M'}${p1.x + v / VM * p1.w} ${p1.y + p1.h - pp / PM * p1.h} `; }
    for (let v = 12; v <= VM; v += 1) { const pp = K / v; d2 += `${d2 ? 'L' : 'M'}${p2.x + (1 / v) / IM * p2.w} ${p2.y + p2.h - pp / PM * p2.h} `; }
    W(g, d1, { stroke: C.aqua, 'stroke-width': 2.4 }); W(g, d2, { stroke: C.acc, 'stroke-width': 2.4 });
    const dot1 = el('circle', { r: 6, fill: C.warn, stroke: 'var(--bg)', 'stroke-width': 2 }, g), dot2 = el('circle', { r: 6, fill: C.warn, stroke: 'var(--bg)', 'stroke-width': 2 }, g);
    let top = 0;
    function draw() {
      const v = +inp.value, pa = K / v; $(P + '-th-vv').textContent = v + ' cm³';
      top = base - v * pxPer; gas.setAttribute('y', top); gas.setAttribute('height', base - top); pis.setAttribute('transform', `translate(0 ${top})`);
      pT.textContent = `P + P₀ = ${pa.toFixed(2)} atm`;
      dot1.setAttribute('cx', p1.x + v / VM * p1.w); dot1.setAttribute('cy', p1.y + p1.h - pa / PM * p1.h);
      dot2.setAttribute('cx', p2.x + (1 / v) / IM * p2.w); dot2.setAttribute('cy', p2.y + p2.h - pa / PM * p2.h);
      out.innerHTML = `V = ${v} cm³ → P + P₀ = ${K} ÷ ${v} = <b>${pa.toFixed(2)} atm</b>, gauge reading ${(pa - 0.993).toFixed(2)} atm. (P + P₀)V = ${(pa * v).toFixed(1)} atm cm³ at every volume. Halving V doubles the rate of impacts on the walls.`;
    }
    let lt = performance.now();
    (function anim(n) {
      const dt = Math.min(.05, (n - lt) / 1000); lt = n;
      if (s.getBoundingClientRect().height > 0 && !L.reduced) {
        const h = Math.max(4, base - top - 6), sp = 1.4;
        mol.forEach((m, i) => {
          m.x += m.vx * sp * dt; m.y += m.vy * sp * dt * (120 / h);
          if (m.x < 0) { m.x = -m.x; m.vx = -m.vx; } if (m.x > 1) { m.x = 2 - m.x; m.vx = -m.vx; }
          if (m.y < 0) { m.y = -m.y; m.vy = -m.vy; } if (m.y > 1) { m.y = 2 - m.y; m.vy = -m.vy; }
          const c = molG.childNodes[i]; c.setAttribute('cx', cx + 4 + m.x * (cw - 8)); c.setAttribute('cy', top + 3 + m.y * h);
        });
      } else if (L.reduced) { const h = Math.max(4, base - top - 6); mol.forEach((m, i) => { const c = molG.childNodes[i]; c.setAttribute('cx', cx + 4 + m.x * (cw - 8)); c.setAttribute('cy', top + 3 + m.y * h); }); }
      requestAnimationFrame(anim);
    })(lt);
    inp.addEventListener('input', draw); draw();
  })();

  /* temperature after a compression */
  (function temp() {
    const s = $(P + '-th-temp'); if (!s) return;
    const pl = makePlot(s, { W: 520, H: 240, ml: 60, mt: 36, mb: 50, mr: 20, xmax: 90, ymin: 24, ymax: 30, xstep: 15, ystep: 1, xdec: 0, ydec: 0, xlabel: ['time after the change (s)'], ylabel: ['air temperature (°C)'] });
    let d = ''; for (let t = 0; t <= 90; t += 1) { const k = t >= 60 ? 0 : (Math.exp(-t / 14) - Math.exp(-60 / 14)) / (1 - Math.exp(-60 / 14)); d += `${d ? 'L' : 'M'}${pl.X(t)} ${pl.Y(25 + 4 * k)} `; }
    W(pl.g, d, { stroke: C.warn, 'stroke-width': 2.6 });
    W(pl.g, `M${pl.X(0)} ${pl.Y(25)} L${pl.X(90)} ${pl.Y(25)}`, { stroke: C.acc, 'stroke-dasharray': '5 5', 'stroke-width': 1.4 });
    W(pl.g, `M${pl.X(60)} ${pl.Y(24)} L${pl.X(60)} ${pl.Y(29.4)}`, { stroke: C.good, 'stroke-width': 1.6 });
    T(pl.g, pl.X(60) + 6, pl.Y(28.9), 'read from here', { fill: C.good, 'font-weight': 600, 'font-size': 13 });
    T(pl.g, pl.X(88), pl.Y(25) - 8, 'room, 25 °C', { 'text-anchor': 'end', fill: C.acc2, 'font-size': 13 });
  })();

  /* gauge intercept */
  (function gauge() {
    const s = $(P + '-th-gauge'); if (!s) return; const g = el('g', null, s);
    const { oy, y0 } = lineFig(g, 80, 30, 380, 230, { zero: .6 });
    W(g, `M70 ${oy} L70 ${y0}`, { stroke: C.warn, 'stroke-width': 1.6 }); W(g, `M64 ${oy} L76 ${oy} M64 ${y0} L76 ${y0}`, { stroke: C.warn, 'stroke-width': 1.6 });
    T(g, 60, (oy + y0) / 2 + 5, 'P₀', { 'text-anchor': 'end', fill: C.warn, 'font-weight': 700, 'font-family': F_HEAD });
    T(g, 290, 60, 'slope k = (P + P₀)V', { fill: C.acc2, 'font-weight': 700, 'font-family': F_HEAD });
    T(g, 200, 290, 'P = k (1/V) − P₀', { 'text-anchor': 'middle', fill: C.ink, 'font-weight': 700, 'font-family': F_HEAD, 'font-size': 16 });
  })();

  /* spirometer */
  (function spiro() {
    const s = $(P + '-th-spiro'); if (!s) return; const g = el('g', null, s);
    el('rect', { x: 40, y: 140, width: 200, height: 130, rx: 6, fill: 'rgba(70,160,232,.10)', stroke: GLINE, 'stroke-width': 1.6 }, g);
    el('rect', { x: 42, y: 180, width: 196, height: 88, fill: 'rgba(80,170,240,.25)' }, g);
    T(g, 140, 255, 'water', { 'text-anchor': 'middle', 'font-size': 12.5 });
    el('rect', { x: 70, y: 110, width: 140, height: 110, rx: 4, fill: 'rgba(200,220,240,.12)', stroke: C.ink2, 'stroke-width': 2 }, g);
    T(g, 140, 150, 'bell', { 'text-anchor': 'middle', 'font-size': 13, fill: C.ink, 'font-weight': 600 });
    W(g, 'M140 110 L140 50 L330 50 L330 120', { stroke: C.ink2, 'stroke-width': 1.4 });
    el('circle', { cx: 140, cy: 50, r: 9, fill: 'none', stroke: C.ink2, 'stroke-width': 2 }, g); el('circle', { cx: 330, cy: 50, r: 9, fill: 'none', stroke: C.ink2, 'stroke-width': 2 }, g);
    el('rect', { x: 318, y: 120, width: 24, height: 34, rx: 3, fill: 'var(--rg-steel-3)' }, g); T(g, 352, 142, 'counterweight', { 'font-size': 12.5 });
    W(g, 'M330 154 L330 176 L360 176', { stroke: C.ink2, 'stroke-width': 1.4 }); el('circle', { cx: 362, cy: 176, r: 3, fill: C.warn }, g);
    el('rect', { x: 362, y: 140, width: 130, height: 120, rx: 4, fill: 'var(--card)', stroke: C.line2 }, g);
    let d = ''; for (let x = 0; x <= 126; x += 2) d += `${d ? 'L' : 'M'}${364 + x} ${200 + 18 * Math.sin(x / 10)} `; W(g, d, { stroke: C.acc, 'stroke-width': 2 });
    T(g, 427, 280, 'volume trace', { 'text-anchor': 'middle', 'font-size': 12.5 });
    W(g, 'M100 230 L100 290 L20 290', { stroke: C.aqua, 'stroke-width': 3 }); T(g, 22, 284, 'breath', { 'font-size': 12.5, fill: C.aqua });
  })();

  /* equipment icons */
  (function icons() {
    const ic = [
      g => { el('rect', { x: 30, y: 4, width: 22, height: 52, rx: 2, fill: raw('#e9e1cc') }, g); for (let i = 0; i < 9; i++) el('line', { x1: 44, y1: 8 + i * 5, x2: 52, y2: 8 + i * 5, stroke: raw('#333'), 'stroke-width': .8 }, g); tube(g, 56, 4, 14, 52, 22, 5, 1); },
      g => { el('rect', { x: 36, y: 10, width: 48, height: 46, rx: 4, fill: 'var(--rg-steel-2)', stroke: 'var(--rg-steel-4)' }, g); el('rect', { x: 54, y: 26, width: 12, height: 26, rx: 2, fill: raw('#1a2230') }, g); el('rect', { x: 55, y: 34, width: 10, height: 17, fill: OIL }, g); },
      g => { el('circle', { cx: 60, cy: 30, r: 24, fill: raw('#f2efe6'), stroke: 'var(--rg-steel-3)', 'stroke-width': 4 }, g); W(g, 'M44 40 A18 18 0 1 1 76 40', { stroke: raw('#333'), 'stroke-width': 1.2 }); W(g, 'M60 30 L71 18', { stroke: raw('#c0392b'), 'stroke-width': 2 }); el('circle', { cx: 60, cy: 30, r: 2.5, fill: raw('#222') }, g); },
      g => { el('rect', { x: 20, y: 34, width: 80, height: 10, fill: 'var(--rg-steel-3)' }, g); el('rect', { x: 48, y: 26, width: 24, height: 26, rx: 4, fill: raw('#b48a3a') }, g); el('rect', { x: 57, y: 6, width: 6, height: 22, rx: 2, fill: raw('#c0392b') }, g); },
      g => { el('rect', { x: 48, y: 18, width: 22, height: 38, rx: 3, fill: 'var(--rg-steel-2)', stroke: 'var(--rg-steel-4)' }, g); el('rect', { x: 57, y: 8, width: 4, height: 12, fill: 'var(--rg-steel-3)' }, g); el('rect', { x: 42, y: 4, width: 34, height: 7, rx: 3, fill: raw('#222') }, g); W(g, 'M48 48 C30 48 26 30 14 30', { stroke: raw('#222'), 'stroke-width': 4 }); },
      g => { el('rect', { x: 26, y: 14, width: 68, height: 32, rx: 5, fill: raw('#1b222c'), stroke: 'var(--rg-steel-4)' }, g); T(g, 60, 36, '25.0 °C', { 'text-anchor': 'middle', 'font-size': 14, fill: 'var(--rg-lcd-on)', 'font-family': F_HEAD, 'font-weight': 700 }); }
    ];
    ic.forEach((f, i) => { const s = $(`${P}-eq-${i}`); if (s) f(el('g', null, s)); });
  })();

  /* method step figure: a simplified bench drawn for each step */
  (function stepFig() {
    const s = $(P + '-step-svg'); if (!s) return;
    const S = [
      { p: 0, h: 150, v: 'open', pump: true, cap: 'The pump hose goes on the reservoir inlet, through the valve. With the valve open the gauge reads 0: the air is at atmospheric pressure.' },
      { p: 2.5, h: 72, v: 'open', pump: true, cap: 'Each pump stroke adds air above the oil. The oil rises and the trapped air shrinks until the gauge reaches its maximum.' },
      { p: 2.5, h: 72, v: 'closed', clock: true, cap: 'The valve is closed and the air left for a minute: the warming from the compression fades and the temperature returns to that of the room.' },
      { p: 2.5, h: 72, v: 'closed', read: true, cap: 'V is read on the scale at the meniscus, eye level with it; P is read on the gauge from straight in front.' },
      { p: 2.0, h: 84, v: 'slight', cap: 'The valve is opened slightly: air leaks out slowly, the oil falls and the air expands. It is closed again and left another minute.' },
      { p: 2.0, h: 84, v: 'closed', read: true, cap: 'The new V and P are read the same way.' },
      { p: 1.0, h: 120, v: 'closed', read: true, cap: 'Repeated down the scale, for at least five pairs of readings spread from the maximum towards zero.' },
      { graph: true, cap: 'P against 1/V gives a straight line. Extended back to the P-axis, it meets it at −P₀.' }
    ];
    function draw(i) {
      s.innerHTML = ''; const g = el('g', null, s), st = S[i];
      if (st.graph) { lineFig(g, 90, 40, 360, 260); T(g, 270, 340, 'P against 1/V, extended to the P-axis', { 'text-anchor': 'middle', fill: C.ink, 'font-weight': 600 }); return; }
      el('rect', { x: 60, y: 30, width: 90, height: 300, rx: 6, fill: 'var(--rg-wood-2)' }, g);
      el('rect', { x: 72, y: 40, width: 30, height: 280, rx: 2, fill: raw('#e9e1cc') }, g);
      for (let k = 0; k <= 12; k++) el('line', { x1: 92, y1: 50 + k * 22, x2: 102, y2: 50 + k * 22, stroke: raw('#333'), 'stroke-width': k % 2 ? .8 : 1.4 }, g);
      tube(g, 108, 44, 24, 276, st.h + 4, 14, 2);
      el('rect', { x: 210, y: 210, width: 70, height: 110, rx: 6, fill: 'var(--rg-steel-2)', stroke: 'var(--rg-steel-4)' }, g);
      W(g, 'M132 316 L210 316', { stroke: OIL, 'stroke-width': 6 });
      const gx = 245, gy = 140; el('circle', { cx: gx, cy: gy, r: 44, fill: raw('#f2efe6'), stroke: 'var(--rg-steel-3)', 'stroke-width': 6 }, g);
      W(g, `M${gx} 184 L${gx} 210`, { stroke: 'var(--rg-steel-3)', 'stroke-width': 6 });
      const a = (-135 + 270 * st.p / 3) * Math.PI / 180; W(g, `M${gx} ${gy} L${gx + 34 * Math.sin(a)} ${gy - 34 * Math.cos(a)}`, { stroke: raw('#c0392b'), 'stroke-width': 2.6 });
      txt(g, gx, gy + 26, `${st.p.toFixed(1)} atm`, { 'text-anchor': 'middle', 'font-size': 12, fill: raw('#222'), 'font-family': F_HEAD, 'font-weight': 700 });
      W(g, 'M280 240 L340 240', { stroke: 'var(--rg-steel-3)', 'stroke-width': 8 });
      el('rect', { x: 330, y: 226, width: 24, height: 28, rx: 4, fill: raw('#b48a3a') }, g);
      const la = st.v === 'closed' ? 90 : st.v === 'slight' ? 62 : 0;
      el('rect', { x: 339, y: 196, width: 6, height: 32, rx: 2, fill: raw('#c0392b'), transform: `rotate(${la} 342 228)` }, g);
      T(g, 342, 280, `valve ${st.v === 'slight' ? 'slightly open' : st.v}`, { 'text-anchor': 'middle', 'font-size': 13, fill: st.v === 'closed' ? C.good : C.warn, 'font-weight': 600 });
      W(g, 'M354 240 C400 240 410 300 440 300', { stroke: raw('#222'), 'stroke-width': 6 });
      el('rect', { x: 430, y: 190, width: 30, height: 130, rx: 4, fill: 'var(--rg-steel-2)', stroke: 'var(--rg-steel-4)' }, g); el('rect', { x: 418, y: st.pump && i === 1 ? 150 : 172, width: 54, height: 10, rx: 4, fill: raw('#222') }, g);
      if (st.clock) { el('circle', { cx: 440, cy: 90, r: 30, fill: 'none', stroke: C.acc, 'stroke-width': 2.4 }, g); W(g, 'M440 90 L440 68 M440 90 L456 98', { stroke: C.acc, 'stroke-width': 2.4 }); T(g, 440, 140, '1 min', { 'text-anchor': 'middle', fill: C.acc2, 'font-weight': 700 }); }
      if (st.read) { const vy = 44 + st.h + 4; W(g, `M30 ${vy} L104 ${vy}`, { stroke: C.acc, 'stroke-dasharray': '4 4', 'stroke-width': 1.6 }); el('circle', { cx: 24, cy: vy, r: 6, fill: 'none', stroke: C.acc, 'stroke-width': 2 }, g); T(g, 20, vy - 14, 'eye', { 'font-size': 12, fill: C.acc2 }); }
    }
    L.methodSteps($(P + '-steps'), $(P + '-step-cap'), draw, S.map(x => x.cap));
  })();

  /* worked example (example values): read after a minute at each pressure */
  (function example() {
    const tb = document.querySelector(`#${P}-ex-table tbody`); if (!tb) return;
    const rows = [[2.50, 13.9], [2.00, 16.3], [1.50, 19.5], [1.00, 24.4], [0.50, 32.6]].map(([p, v]) => ({ p, v, i: 1 / v }));
    const A = { x: 0.0300, y: 0.47 }, B = { x: 0.0720, y: 2.51 };
    const k = (B.y - A.y) / (B.x - A.x), kS = k.toFixed(1), c = A.y - (+kS) * A.x, cS = sgf(c, 2), P0 = -(+c.toFixed(2)), P0S = P0.toFixed(2);
    const pv = rows.map(r => (r.p + P0) * r.v), mean = pv.reduce((a, b) => a + b, 0) / pv.length, pe = Math.abs(P0 - 1) * 100;
    tb.innerHTML = rows.map((r, j) => `<tr><td>${r.p.toFixed(2)}</td><td>${r.v.toFixed(1)}</td><td class="calc-c">${r.i.toFixed(5)}</td><td class="calc-c">${pv[j].toFixed(1)}</td></tr>`).join('');
    const s = $(P + '-ex-graph');
    const pl = makePlot(s, { W: 680, H: 470, ml: 70, mt: 50, xmax: 0.08, ymin: -1.5, ymax: 3, xstep: 0.01, xminor: 0.005, ystep: 0.5, yminor: 0.25, xdec: 2, ydec: 1, xlabel: ['1/', { i: 'V' }, ' (cm', { sup: '−3' }, ')'], ylabel: [{ i: 'P' }, ' (atm, gauge)'] });
    const Y = x => c + (+kS) * x;
    el('line', { x1: pl.X(0), y1: pl.Y(Y(0)), x2: pl.X(0.025), y2: pl.Y(Y(0.025)), stroke: C.acc, 'stroke-width': 2, 'stroke-dasharray': '6 5' }, pl.g);
    el('line', { x1: pl.X(0.025), y1: pl.Y(Y(0.025)), x2: pl.X(0.078), y2: pl.Y(Y(0.078)), stroke: C.acc, 'stroke-width': 2.6 }, pl.g);
    el('path', { d: `M${pl.X(A.x)} ${pl.Y(A.y)} L${pl.X(B.x)} ${pl.Y(A.y)} L${pl.X(B.x)} ${pl.Y(B.y)}`, fill: 'none', stroke: C.aqua, 'stroke-dasharray': '5 4', 'stroke-width': 1.6 }, pl.g);
    T(pl.g, pl.X((A.x + B.x) / 2), pl.Y(A.y) + 20, `Δ(1/V) = ${(B.x - A.x).toFixed(4)}`, { 'text-anchor': 'middle', fill: C.aqua2, 'font-weight': 700, 'font-size': 13 });
    T(pl.g, pl.X(B.x) + 8, pl.Y((A.y + B.y) / 2), `ΔP = ${(B.y - A.y).toFixed(2)}`, { fill: C.aqua2, 'font-weight': 700, 'font-size': 13 });
    rows.forEach(r => el('circle', { cx: pl.X(r.i), cy: pl.Y(r.p), r: 5.5, fill: C.ink, stroke: 'var(--bg)', 'stroke-width': 2 }, pl.g));
    [A, B].forEach((h, j) => { el('rect', { x: pl.X(h.x) - 6, y: pl.Y(h.y) - 6, width: 12, height: 12, fill: C.acc, transform: `rotate(45 ${pl.X(h.x)} ${pl.Y(h.y)})` }, pl.g); T(pl.g, pl.X(h.x) - 10, pl.Y(h.y) - 12, `(${h.x.toFixed(4)}, ${h.y.toFixed(2)})`, { 'text-anchor': 'end', 'font-size': 12.5, fill: C.acc2, 'font-weight': 600 }); void j; });
    el('circle', { cx: pl.X(0), cy: pl.Y(c), r: 7, fill: 'none', stroke: C.warn, 'stroke-width': 2.2 }, pl.g);
    T(pl.g, pl.X(0) + 12, pl.Y(c) + 22, `c = ${cS} atm`, { fill: C.warn, 'font-weight': 700, 'font-family': F_HEAD });
    $(P + '-ex-calc').innerHTML = `
      <div class="calc-step"><span class="cs-n">1</span><span class="sub">Slope of the line</span><span class="eq-line">k = (2.51 − 0.47) ÷ (0.0720 − 0.0300) = 2.04 ÷ 0.0420 = <b>${kS} atm cm³</b></span></div>
      <div class="calc-step"><span class="cs-n">2</span><span class="sub">Intercept on the P-axis</span><span class="eq-line">c = y₁ − k x₁ = 0.47 − ${kS} × 0.0300 = <b>${cS} atm</b></span></div>
      <div class="calc-step"><span class="cs-n">3</span><span class="sub">Atmospheric pressure</span><span class="eq-line">P₀ = −c = <b>${P0S} atm</b></span></div>
      <div class="calc-step"><span class="cs-n">4</span><span class="sub">Boyle check: (P + P₀)V for each pair</span><span class="eq-line">(${pv.map(x => x.toFixed(1)).join(' + ')}) ÷ 5 = <b>${mean.toFixed(1)} atm cm³</b> ≈ k</span></div>
      <div class="calc-step result"><span class="cs-n">✓</span><span class="sub">Percentage error</span><span class="eq-line">|${P0S} − 1| ÷ 1 × 100 = <b>${pe.toFixed(1)} %</b></span></div>`;
    $(P + '-ex-res').innerHTML = `<thead><tr><th>Result</th><th>Value</th></tr></thead><tbody><tr><td>Atmospheric pressure from the graph, P₀</td><td>${P0S} atm</td></tr><tr><td>Standard atmospheric pressure</td><td>1 atm</td></tr><tr><td>Percentage error</td><td>${pe.toFixed(1)} %</td></tr><tr><td>(P + P₀)V, mean of the pairs</td><td>${mean.toFixed(1)} atm cm³</td></tr></tbody>`;
  })();

  L.mcq($(P + '-mcq-list'), L.MCQ.boy, $(P + '-mcq-score'), $(P + '-mcq-reset'));
})(window.SOL);
