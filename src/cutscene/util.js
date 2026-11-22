// Small math helpers shared by the cutscene renderer.

export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (t, a, b) => {
  const x = prog(t, a, b);
  return x * x * (3 - 2 * x);
};
export const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
export const easeInCubic = (x) => x * x * x;
export const easeOutExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Deterministic pseudo random in [0, 1) for an integer seed. */
export function hash(n) {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** Seeded generator — the same seed always yields the same sequence. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Exponential "kick" envelope summed over a list of [time, strength, decay]. */
export function pulses(t, list) {
  let v = 0;
  for (const [t0, s, d] of list) {
    const dt = t - t0;
    if (dt >= 0 && dt < d * 6) v += s * Math.exp(-dt / d);
  }
  return v;
}

export function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export const supportsFilter = (() => {
  try {
    const c = document.createElement("canvas").getContext("2d");
    return typeof c.filter === "string";
  } catch {
    return false;
  }
})();
