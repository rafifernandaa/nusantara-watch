/**
 * Firms-matrix: an 8 × 4 thermal matrix of 32 sector pillars on a plinth (33
 * solids) encoding active satellite Fire Radiative Power (MW). The pointer
 * projects onto the ground plane, lifting nearby columns on springs; the
 * active peak takes the bright stroke and a 3-dot crown rides its lid.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, unproj, spring, stepS,
  flatDot, mk, place, pointer, put, register, disposer, solid,
} = HL;

const NX = 8, NY = 4, CX = 15, CY = 18, FX = 11.5, FY = 14.2, HMAX = 54;
const EX = NX * CX, EY = NY * CY, PB = 6, UNIT = 16;

// Fourteen seeded thermal peaks distributed across the 8 × 4 archipelago grid.
const HOTSPOTS = new Map([
  ["0,0", 16], ["1,1", 28], ["2,1", 40], ["1,2", 24],
  ["2,2", 18], ["3,0", 22], ["3,1", 34], ["4,1", 30],
  ["4,2", 16], ["5,1", 26], ["5,2", 36], ["6,2", 20],
  ["6,3", 14], ["7,1", 19],
]);

const falloff = (u) =>
  u <= 0 ? 1 : u <= 0.42 ? 1 - (u / 0.42) * 0.69 : u <= 1 ? 0.31 - ((u - 0.42) / 0.58) * 0.22 : 0.09;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.54);
  fit(C, [
    [-6, -9, -PB], [EX + 6, EY + 6, -PB], [EX + 6, -9, -PB],
    [-6, EY + 6, -PB], [-6, -9, HMAX], [EX + 6, -9, HMAX],
  ], 200, 166);
  const P = proj(C), front = facing(C);
  let R = value * UNIT, over = null;

  const g = mk("g", {}, svg), cols = [], datumDots = [];
  const [pr, pi] = rings(-6, -9, EX + 6, EY + 6, 8, 2.0);
  put(solid(g), prism(P, front, pr, pi, -PB, 0));

  for (let i = 0; i < NX; i++) {
    const dot = flatDot(g, C, 0.5, "dot off");
    place(dot, P((i + 0.5) * CX, -4.5, 0));
    datumDots.push(dot);
  }

  for (let s = 0; s <= NX + NY - 2; s++) {
    for (let i = 0; i < NX; i++) {
      const j = s - i;
      if (j < 0 || j >= NY) continue;
      const key = i + "," + j;
      const h0 = HOTSPOTS.get(key) ?? 4.5;
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
      datumDots.forEach((d, idx) => d.setAttribute("class", idx === mc.i ? "dot m" : "dot off"));
    }
    const cx = (mc.i + 0.5) * CX, cy = (mc.j + 0.5) * CY, h = Math.max(0.8, mc.sp.x);
    md.forEach((el, k) => place(el, P(cx + (k - 1) * 2.6, cy, h)));
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
      read.textContent = `hs ${i + 1}·${j + 1} · ${Math.round(want.sp.t * 2.4)}mw`;
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
  name: "firms-matrix",
  means: "A thermal matrix of active hotspots sized by radiative power: hovering previews a fire.",
  rules: [1, 3, 4, 5, 9],
  range: [1.4, 2.6, 4.2],
  tour: [[138, 162], [206, 138], [268, 172], null],
  mount,
});
