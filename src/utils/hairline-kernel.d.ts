export interface RingSample {
  u: number;
  v: number;
  nu: number;
  nv: number;
}

export interface HairlineCamera {
  azDeg: number;
  k: number;
  S: number;
}

export type ProjFn = (x: number, y: number, z: number) => [number, number];

export interface HairlineTween {
  v: number;
}

export interface HairlineSpring {
  x: number;
  v: number;
  t: number;
}

export interface HairlineSolid {
  g: SVGGElement;
  sil: SVGPathElement;
  cr: SVGPathElement;
}

export interface HairlineKernel {
  Cam: (azDeg: number, k: number, S: number) => HairlineCamera;
  fit: (C: HairlineCamera, points: [number, number, number][], cx: number, cy: number) => void;
  proj: (C: HairlineCamera) => ProjFn;
  unproj: (C: HairlineCamera, sx: number, sy: number, z: number) => [number, number];
  facing: (C: HairlineCamera) => (q: RingSample) => boolean;
  circ: (R: number, n?: number) => RingSample[];
  rings: (x0: number, y0: number, x1: number, y1: number, r: number, b: number) => [RingSample[], RingSample[]];
  prism: (
    P: ProjFn,
    front: (q: RingSample) => boolean,
    ring: RingSample[],
    inner: RingSample[],
    z0: number,
    z1: number
  ) => { sil: string; crease: string };
  ringAt: (P: ProjFn, ring: RingSample[], z: number) => [number, number][];
  poly: (points: [number, number][]) => string;
  open: (points: [number, number][]) => string;
  seg: (a: [number, number], b: [number, number]) => string;
  clamp: (v: number, a: number, b: number) => number;
  spring: (x: number, opts?: { k?: number; c?: number; m?: number; eps?: number }) => HairlineSpring;
  stepS: (sp: HairlineSpring, dt: number) => boolean;
  tween: (v: number, dur?: number) => HairlineTween;
  tset: (tw: HairlineTween, to: number, now: number, delay: number) => void;
  tval: (tw: HairlineTween, now: number) => number;
  tdone: (tw: HairlineTween, now: number) => boolean;
  mk: (tag: string, attrs?: Record<string, string | number>, parent?: Element | null) => SVGElement;
  solid: (parent: Element) => HairlineSolid;
  put: (solid: HairlineSolid, paths: { sil: string; crease: string }) => void;
  flatDot: (parent: Element, C: HairlineCamera, r: number, cls: string) => SVGCircleElement;
  place: (el: Element, point: [number, number]) => void;
  register: (
    stage: HTMLElement,
    tick: (dt: number, now: number) => boolean
  ) => { wake: () => void; unregister: () => void };
  pointer: (
    stage: HTMLElement,
    handlers: {
      move?: (p: [number, number]) => void;
      down?: (p: [number, number]) => void;
      leave?: () => void;
    }
  ) => () => void;
  disposer: () => {
    add: (fn: () => void) => void;
    dispose: () => void;
  };
  inject: (root: Document) => void;
  tour: (
    stage: HTMLElement,
    stops: ([number, number] | null)[],
    onStop?: (i: number) => void
  ) => { stop: () => void };
}

export declare const HL: HairlineKernel;
