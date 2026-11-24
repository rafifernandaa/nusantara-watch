/**
 * Sortie-deck: six priority-province helipad dispatch bays on a stepped flight
 * deck with twelve apron cleats. Hovering a bay elevates its helipad platform
 * on a 700ms ease-out while surrounding bays step down, staggered by distance.
 */
const {
  Cam, circ, facing, fit, flatDot, open, poly, prism, proj, ringAt, rings, seg, unproj,
  tdone, tset, tval, tween, disposer, mk, place, pointer, put, register, solid,
} = HL;

const NX = 3, NY = 2, CELL = 40, PAD = 34, EX = NX * CELL, EY = NY * CELL, PB = 7;
const REST_H = [10, 18, 28, 14, 22, 12], REST_PEAK = 2, LIFT = 18;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.56);
  fit(C, [
    [-8, -10, -PB], [EX + 8, EY + 10, -PB], [EX + 8, -10, -PB],
    [-8, EY + 10, -PB], [-8, -10, 28 + LIFT], [EX + 8, -10, 28 + LIFT],
  ], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg), bays = [];
  const [pr, pi] = rings(-8, -10, EX + 8, EY + 10, 9, 2.2);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  // Back apron approach cleats (6) painted before the helipad bays.
  for (let i = 0; i < 6; i++) {
    const bx = i * (EX / 6) + 5;
    const [cr, ci] = rings(bx, -8, bx + 10, -3.5, 1.5, 0.5);
    put(solid(g), prism(P, front, cr, ci, 0, 4));
  }

  const padRing = circ(10.5, 18);
  // Six stepped helipad bays appended back-to-front by ascending i + j.
  for (let s = 0; s <= NX + NY - 2; s++) {
    for (let i = 0; i < NX; i++) {
      const j = s - i;
      if (j < 0 || j >= NY) continue;
      const idx = j * NX + i;
      const cx = (i + 0.5) * CELL, cy = (j + 0.5) * CELL;
      const x0 = cx - PAD / 2, y0 = cy - PAD / 2;
      const [ring, inner] = rings(x0, y0, x0 + PAD, y0 + PAD, 4.5, 1.1);
      const h0 = REST_H[idx];
      const bayGrp = mk("g", {}, g);
      const el = solid(bayGrp);
      const circle = mk("path", { class: idx === REST_PEAK ? "nf hi" : "nf lo" }, bayGrp);
      const cross = mk("path", { class: idx === REST_PEAK ? "nf hi" : "nf lo" }, bayGrp);
      const dots = [];
      for (let d = 0; d < 3; d++) {
        dots.push(flatDot(bayGrp, C, 0.55, d === 1 && idx === REST_PEAK ? "dot" : "dot off"));
      }
      bays.push({
        idx, i, j, cx, cy, h0, ring, inner, el, circle, cross, dots,
        z: tween(h0), lastZ: NaN,
      });
    }
  }

  // Front apron beacon cleats (6) painted after the bays.
  for (let i = 0; i < 6; i++) {
    const bx = i * (EX / 6) + 5;
    const [cr, ci] = rings(bx, EY + 3.5, bx + 10, EY + 8, 1.5, 0.5);
    put(solid(g), prism(P, front, cr, ci, 0, 3.5));
  }

  function drawBay(b, h, activeIdx) {
    const isHi = b.idx === activeIdx;
    b.el.sil.classList.toggle("hi", isHi);
    b.circle.classList.toggle("hi", isHi);
    b.circle.classList.toggle("lo", !isHi);
    b.cross.classList.toggle("hi", isHi);
    b.cross.classList.toggle("lo", !isHi);
    b.dots.forEach((el, d) => el.setAttribute("class", isHi ? (d === 1 ? "dot" : "dot m") : "dot off"));
    if (h === b.lastZ) return;
    b.lastZ = h;
    put(b.el, prism(P, front, b.ring, b.inner, 0, h));
    const shifted = padRing.map((q) => ({ u: q.u + b.cx, v: q.v + b.cy, nu: q.nu, nv: q.nv }));
    b.circle.setAttribute("d", poly(ringAt(P, shifted, h)));
    b.cross.setAttribute("d",
      seg(P(b.cx - 4.5, b.cy, h), P(b.cx + 4.5, b.cy, h)) +
      seg(P(b.cx, b.cy - 4.5, h), P(b.cx, b.cy + 4.5, h)),
    );
    b.dots.forEach((el, d) => place(el, P(b.cx + (d - 1) * 4.5, b.cy + PAD / 2 - 4, h)));
  }

  let act = -1;
  const B = register(stage, (_dt, now) => {
    let moving = false;
    const hiIdx = act >= 0 ? act : REST_PEAK;
    for (const b of bays) {
      drawBay(b, tval(b.z, now), hiIdx);
      if (!tdone(b.z, now)) moving = true;
    }
    return moving;
  });
  bag.add(B.unregister);

  // Rule 01 for stepped heights: unproject onto each bay's static rest top.
  function hit([sx, sy]) {
    let best = -1, bestDist = Infinity;
    for (const b of bays) {
      const w = unproj(C, sx, sy, b.h0);
      const dx = Math.abs(w[0] - b.cx), dy = Math.abs(w[1] - b.cy);
      if (dx <= PAD / 2 + 2 && dy <= PAD / 2 + 2) {
        const dist = Math.hypot(w[0] - b.cx, w[1] - b.cy);
        if (dist < bestDist) { bestDist = dist; best = b.idx; }
      }
    }
    return best;
  }

  function setActive(a) {
    if (a === act) return;
    const now = performance.now();
    const refIdx = a >= 0 ? a : act;
    const refBay = bays.find((b) => b.idx === refIdx) || bays[0];
    act = a;
    for (const b of bays) {
      const dist = Math.hypot(b.i - refBay.i, b.j - refBay.j);
      const delay = Math.round(dist * stag);
      const target = a < 0 ? b.h0 : (b.idx === a ? b.h0 + LIFT : Math.max(5, b.h0 - 4));
      tset(b.z, target, now, delay);
    }
    read.textContent = a < 0 ? "rest" : "pad 0" + (a + 1) + " · 0";
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { stag = v; },
    destroy: bag.dispose,
  };
}

hairline({
  name: "sortie-deck",
  means: "Six helipad bays on an air-ops deck: the bay under the pointer rises while adjacent bays step down.",
  rules: [1, 2, 4, 5, 8, 9],
  range: [0, 45, 90],
  tour: [[148, 162], [202, 130], [262, 168], null],
  mount,
});
