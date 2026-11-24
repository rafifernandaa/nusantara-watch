/**
 * Canal-locks: a peatland canal flume holding six sluice gates (sekat kanal).
 * The gate under the pointer rises to inspection height on a 700ms ease-out,
 * while neighbouring gates lean away staggered by distance.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, open, poly, proj, rad, ringAt, rrect, seg,
  run, tdone, tset, tval, tween, disposer, mk, place, pointer, reflect, register,
} = HL;

const N = 6, W = 86, H = 48, G = 17, PIER = 16, NOTCH = 8, TK = 1.6;
const REST = -10, BACK = -22, FWD = 18, REST_LIFT = 10, LIFT = 20, REST_FOCUS = 2;
const X0 = -6, X1 = W + 6, Y0 = -10, Y1 = (N - 1) * G + 10, WH = 22, WR = 6, WT = 2.6;

const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

function flume(P, front, outer, inner) {
  const far = [
    [poly(hull(ringAt(P, outer, 0).concat(ringAt(P, outer, WH)))), "sil"],
    [poly(ringAt(P, inner, WH)), "nf"],
    [open(ringAt(P, run(inner, (q) => !front(q)), 3)), "nf lo"],
  ];
  const iF = LR(ringAt(P, run(inner, front), WH));
  const oT = LR(ringAt(P, run(outer, front), WH));
  const oB = LR(ringAt(P, run(outer, front), 0));
  const hx = (X0 + X1) / 2, onFront = (ring) => ring.map((q) => P(q.u, Y1, q.v));
  const near = [
    [poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), "fo"],
    [open(oT), "nf lo"],
    [open(iF), "nf"],
    [open([oT[0], ...oB, oT[oT.length - 1]]), "nf sil"],
    [poly(onFront(rrect(hx - 14, 7, hx + 14, 14, 3.2, 5))), "nf"],
    [poly(onFront(rrect(hx - 12, 8.8, hx + 12, 12.2, 1.5, 5))), "nf lo"],
  ];
  return { far, near };
}

function makeGate(i) {
  const n = N - i;
  const shape = fillet(
    [
      [0, 0], [W, 0], [W, H + NOTCH], [W - PIER, H + NOTCH],
      [W - PIER, H], [PIER, H], [PIER, H + NOTCH], [0, H + NOTCH],
    ],
    [1.2, 1.2, 2.4, 2.4, 1.8, 1.8, 2.4, 2.4],
  );
  return { n, shape };
}

function pose(P, i, shape, th, lift) {
  const yb = i * G, s = Math.sin(rad(th)), c = Math.cos(rad(th));
  const w = (u, v) => P(u, yb + v * s, v * c + lift);
  const wb = (u, v) => P(u, yb + v * s - TK * c, v * c + TK * s + lift);
  const punch = [];
  for (let k = 0; k < N; k++) {
    punch.push(w(PIER / 2 + ((k % 2) - 0.5) * 4.4, H + NOTCH - 3.5 - Math.floor(k / 2) * 3.8));
  }
  const ribs = [H - 8, H - 16, H - 24, H - 32].map((v) => seg(w(6, v), w(W - 6, v))).join("");
  return {
    back: poly(shape.map((p) => wb(p[0], p[1]))),
    face: poly(shape.map((p) => w(p[0], p[1]))),
    crest: seg(w(PIER + 2, H - 3), w(W - PIER - 2, H - 3)),
    ribs,
    punch,
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.66);
  fit(C, [
    [X0, Y0, -4], [X1, Y1, -6], [X1, Y0, 0], [X0, Y1, 0],
    [X0, Y0, H + NOTCH + LIFT], [X1, Y0, H + NOTCH + LIFT],
  ], 200, 166);
  const P = proj(C), front = facing(C);
  const outer = rrect(X0, Y0, X1, Y1, WR, 6), inner = rrect(X0 + WT, Y0 + WT, X1 - WT, Y1 - WT, WR - WT, 6);
  const paths = flume(P, front, outer, inner);

  const g = mk("g", {}, svg);
  reflect(svg, g, P, front, outer, 0, 14);
  for (const [d, cls] of paths.far) mk("path", { d, class: cls }, g);

  const gates = [];
  for (let i = 0; i < N; i++) {
    const { n, shape } = makeGate(i);
    const grp = mk("g", {}, g);
    const back = mk("path", { class: "lo" }, grp);
    const face = mk("path", { class: i === REST_FOCUS ? "sil hi" : "sil" }, grp);
    const crest = mk("path", { class: i === REST_FOCUS ? "nf hi" : "nf" }, grp);
    const ribs = mk("path", { class: "nf lo" }, grp);
    const punch = [];
    for (let k = 0; k < N; k++) {
      punch.push(mk("circle", { r: 1.05, class: "dot " + (k === n - 1 ? "m" : "off") }, grp));
    }
    const z0 = i === REST_FOCUS ? REST_LIFT : 0;
    gates.push({ n, shape, back, face, crest, ribs, punch, a: tween(REST), z: tween(z0), lastA: NaN, lastZ: NaN });
  }

  for (const [d, cls] of paths.near) mk("path", { d, class: cls }, g);

  const top = (i) => P(W / 2, i * G + H * Math.sin(rad(REST)), H * Math.cos(rad(REST)));
  const c0 = top(0), c1 = top(1), dv = [c1[0] - c0[0], c1[1] - c0[1]];
  const px0 = P(0, 0, 0), px1 = P(1, 0, 0), ex = [px1[0] - px0[0], px1[1] - px0[1]];
  const HALF = W / 2 + 8, det = dv[0] * ex[1] - dv[1] * ex[0];

  function hit([x, y]) {
    const qx = x - c0[0], qy = y - c0[1];
    const s = (qx * ex[1] - qy * ex[0]) / det, r = (dv[0] * qy - dv[1] * qx) / det;
    if (Math.abs(r) > HALF || s < -0.5 || s > N - 0.1) return -1;
    return clamp(Math.round(s), 0, N - 1);
  }

  function draw(i, th, lift) {
    const gt = gates[i];
    if (th === gt.lastA && lift === gt.lastZ) return;
    gt.lastA = th;
    gt.lastZ = lift;
    const q = pose(P, i, gt.shape, th, lift);
    gt.back.setAttribute("d", q.back);
    gt.face.setAttribute("d", q.face);
    gt.crest.setAttribute("d", q.crest);
    gt.ribs.setAttribute("d", q.ribs);
    gt.punch.forEach((el, k) => place(el, q.punch[k]));
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    gates.forEach((gt, i) => {
      draw(i, tval(gt.a, now), tval(gt.z, now));
      if (!tdone(gt.a, now) || !tdone(gt.z, now)) moving = true;
    });
    return moving;
  });
  bag.add(B.unregister);

  let act = -1;
  const caption = (a) => (a < 0 ? "rest" : "sekat " + String(N - a).padStart(2, "0") + " · 0");

  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    const hiIdx = a >= 0 ? a : REST_FOCUS;
    gates.forEach((gt, i) => {
      const delay = Math.abs(i - from) * stag;
      const th = a < 0 ? REST : i < a ? BACK : i > a ? FWD : 0;
      const zl = a < 0 ? (i === REST_FOCUS ? REST_LIFT : 0) : (i === a ? LIFT : 0);
      tset(gt.a, th, now, delay);
      tset(gt.z, zl, now, delay);
      gt.face.classList.toggle("hi", i === hiIdx);
      gt.crest.classList.toggle("hi", i === hiIdx);
      gt.punch[gt.n - 1].classList.toggle("m", i !== a);
      gt.punch[gt.n - 1].classList.toggle("dot", true);
    });
    read.textContent = caption(a);
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
  name: "canal-locks",
  means: "Six peatland canal-blocking gates in a flume: the gate under the pointer lifts and its neighbours part.",
  rules: [1, 2, 4, 5, 8, 10],
  range: [0, 45, 90],
  tour: [[155, 165], [200, 130], [260, 120], null],
  mount,
});
