/**
 * Peat-table: thirty-three peatland core blocks (11 × 3) on a rounded plinth
 * with a back survey rail. The pointer projects onto the ground plane and lifts
 * nearby cores on springs; the active core takes the bright stroke and a 3-dot
 * survey mark rides its lid.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, unproj, spring, stepS,
  flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const NX = 11, NY = 3, CX = 13, CY = 26, FX = 10.2, FY = 21, HMAX = 54;
const EX = NX * CX, EY = NY * CY, PB = 6, UNIT = 16;

const falloff = (u) =>
  u <= 0 ? 1 : u <= 0.42 ? 1 - (u / 0.42) * 0.69 : u <= 1 ? 0.31 - ((u - 0.42) / 0.58) * 0.22 : 0.09;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.46);
  fit(C, [
    [-6, -11, -PB], [EX + 6, EY + 6, -PB], [EX + 6, -11, -PB],
    [-6, EY + 6, -PB], [-6, -11, HMAX], [EX + 6, -11, HMAX],
  ], 200, 166);
  const P = proj(C), front = facing(C);
  let R = value * UNIT, over = null;

  const g = mk("g", {}, svg), cols = [], railDots = [];
  const [pr, pi] = rings(-6, -11, EX + 6, EY + 6, 8, 2.0);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  // Back reference rail behind the 11 columns, painted before all blocks.
  const [rr, ri] = rings(1, -8, EX - 1, -2.5, 2.0, 0.7);
  put(solid(g), prism(P, front, rr, ri, 0, 8));
  for (let i = 0; i < NX; i++) {
    const dot = flatDot(g, C, 0.5, "dot off");
    place(dot, P((i + 0.5) * CX, -5.25, 8));
    railDots.push(dot);
  }

  // Thirty-three peat cores, appended back-to-front by ascending i + j.
  for (let s = 0; s <= NX + NY - 2; s++) {
    for (let i = 0; i < NX; i++) {
      const j = s - i;
      if (j < 0 || j >= NY) continue;
      const u = i / (NX - 1), v = j / (NY - 1);
      const h0 = 6 + 26 * Math.exp(-((u - 0.27) ** 2 + (v - 0.5) ** 2) / 0.08) +
        14 * Math.exp(-((u - 0.78) ** 2 + (v - 0.3) ** 2) / 0.05);
      const x0 = i * CX + (CX - FX) / 2, y0 = j * CY + (CY - FY) / 2;
      const [ring, inner] = rings(x0, y0, x0 + FX, y0 + FY, 2.4, 0.85);
      cols.push({ i, j, h0, ring, inner, sp: spring(h0, { eps: 0.04 }), el: solid(g), drawn: NaN });
    }
  }

  const mark = mk("g", {}, g), md = [];
  for (let k = 0; k < 3; k++) md.push(flatDot(mark, C, 0.55, k === 1 ? "dot" : "dot m"));
  const peak = cols.reduce((a, b) => (b.h0 > a.h0 ? b : a));
  const byCell = new Map();
  cols.forEach((c) => byCell.set(c.i + "," + c.j, c));
  let mc = null, want = peak;

  function syncMark() {
    if (want !== mc) {
      mc = want;
      mc.el.g.after(mark);
      railDots.forEach((d, idx) => d.setAttribute("class", idx === mc.i ? "dot m" : "dot off"));
    }
    const cx = (mc.i + 0.5) * CX, cy = (mc.j + 0.5) * CY, h = Math.max(0.8, mc.sp.x);
    md.forEach((el, k) => place(el, P(cx, cy + (k - 1) * 4.2, h)));
  }

  function drawCol(c) {
    const h = Math.max(0.8, c.sp.x);
    if (h === c.drawn && (c === want) === c.el.sil.classList.contains("hi")) return;
    c.drawn = h;
    put(c.el, prism(P, front, c.ring, c.inner, 0, h));
    c.el.sil.classList.toggle("hi", c === want);
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const c of cols) {
      if (stepS(c.sp, dt)) m = true;
      drawCol(c);
    }
    syncMark();
    return m;
  });
  bag.add(B.unregister);

  function retarget() {
    for (const c of cols) {
      if (!over) { c.sp.t = c.h0; continue; }
      const dx = (c.i + 0.5) * CX - over[0], dy = (c.j + 0.5) * CY - over[1];
      c.sp.t = clamp(HMAX * falloff(Math.hypot(dx, dy) / R), 4, HMAX);
    }
    if (over) {
      const i = clamp(Math.floor(over[0] / CX), 0, NX - 1);
      const j = clamp(Math.floor(over[1] / CY), 0, NY - 1);
      want = byCell.get(i + "," + j);
      read.textContent = `peat ${i + 1}·${j + 1} · 0`;
    } else {
      want = peak;
      read.textContent = "rest";
    }
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { over = unproj(C, p[0], p[1], 0); retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { R = v * UNIT; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "peat-table",
  means: "Thirty-three peatland core blocks rise under the pointer to inspect empty hotspot cells.",
  rules: [1, 3, 4, 5, 9],
  range: [1.5, 3, 4.8],
  tour: [[140, 165], [215, 145], [275, 175], null],
  mount,
});
