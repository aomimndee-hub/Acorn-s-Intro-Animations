// The cutscene, frame by frame. render() is a pure function of time `t`, so
// every viewer sees the same frame for the same moment in the music, and the
// picture can never drift from the audio.
//
// Times are in seconds of the original soundtrack. The bundled intro.mp3 starts
// at AUDIO_OFFSET, so audio.currentTime + AUDIO_OFFSET === t.
import {
  DISPLAY, SERIF, crystal, dust, label, lensGhosts, ribbon, rings, shard,
  shockwave, smokeLayer, sprite, star, streak,
} from "./draw.js";
import {
  TAU, clamp, easeInCubic, easeOutCubic, easeOutExpo, hash, lerp, prog, pulses, smooth,
} from "./util.js";

export const AUDIO_OFFSET = 4.4;
export const START = 4.4;
export const END = 35.3;

// Story beats (see README for the full cue sheet).
export const CUE = {
  shotA: 4.62, // crystal pillar emerges from black
  line1: 6.3, // "i - started with few"
  shotB: 8.15, // the crystal tip
  line2: 10.1, // "ii - only less it gets."
  shotC: 11.95, // violet nebula
  line3: 13.7, // "iii - time by time, now empty"
  shotD: 15.65, // white flash, big star
  ink: 17.45, // inverted ink + "iv - and there was nothing left."
  black: 18.45, // "get out of my head"
  reveal: 19.45, // whiteout -> THE TOKEN
  gone: 21.3, // "it wasn't gone"
  goneSmall: 23.05,
  fragments: 25.1, // "with only 5 fragments left"
  words: 26.9, // "how much do you believe in this world?"
  wordsOut: 29.8,
  surge: 30.0, // name card
  grey: 31.4, // desaturation
  close: 32.1, // final squeeze
  greyFlash: 33.45,
};

const WORDS = ["how", "much", "do", "you", "believe", "in", "this", "world?"];
const WORD_TIMES = [26.9, 27.1, 27.35, 27.6, 27.85, 28.1, 28.3, 28.5];

// white flashes: [time, strength, decay seconds]
const FLASHES = [
  [4.62, 0.55, 0.12],
  [6.3, 0.18, 0.1],
  [8.15, 0.6, 0.1],
  [10.1, 0.15, 0.1],
  [11.95, 0.55, 0.1],
  [13.55, 0.25, 0.18],
  [15.65, 1.0, 0.22],
  [19.42, 1.25, 0.55],
  [21.3, 0.12, 0.12],
  [25.1, 0.1, 0.12],
  [30.0, 0.7, 0.3],
];
// camera shake: [time, strength, decay]
const SHAKES = [
  [4.62, 1, 0.18], [6.3, 0.6, 0.15], [8.15, 0.9, 0.15], [10.1, 0.5, 0.15],
  [11.95, 0.8, 0.15], [13.6, 0.8, 0.2], [15.65, 1.4, 0.2], [17.45, 1.8, 0.12],
  [19.45, 2.2, 0.3], [21.3, 0.6, 0.15], [25.1, 0.4, 0.15], [30.0, 1.6, 0.3],
];
// scene squeezes into a horizontal slit: [closeStart, closeEnd, openEnd]
const SQUEEZES = [
  [7.62, 8.13, 8.42],
  [11.42, 11.93, 12.22],
  [15.17, 15.63, 15.85],
  [32.1, 33.4, 33.4],
];

// --------------------------------------------------------------------------

function camera(ctx, W, H, zoom, rot, panX, panY, shake, t, U) {
  const sx = (hash(Math.floor(t * 60)) - 0.5) * shake * 14 * U;
  const sy = (hash(Math.floor(t * 60) + 999) - 0.5) * shake * 14 * U;
  ctx.translate(W / 2 + sx + panX, H / 2 + sy + panY);
  ctx.rotate(rot);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H / 2);
}

function bg(ctx, W, H, top, mid, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(0.5, mid);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(-W * 0.2, -H * 0.2, W * 1.4, H * 1.4);
}

function vignette(ctx, W, H, strength) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.62);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- shots ---

/** i — a colossal crystal pillar, a spark igniting at its edge. */
function shotA(ctx, S, W, H, U, t) {
  const lt = t - CUE.shotA;
  bg(ctx, W, H, "#040309", "#07060f", "#030207");
  smokeLayer(ctx, S, W, H, t, 0.25 * smooth(t, 5.2, 7), { seed: 2, count: 5, yMin: 0.2, yMax: 0.9 });
  const sparkX = W * 0.47;
  const sparkY = H * 0.74;
  const grow = easeOutCubic(prog(t, 5.0, 6.4)) + 0.25 * pulses(t, [[6.3, 1, 0.3]]);
  rings(ctx, sparkX, sparkY, H * 0.9, lt, smooth(t, 5.6, 6.6) * 0.8, { U, seed: 5, count: 7, rot: -0.35 });
  const slide = easeOutExpo(prog(t, CUE.shotA, CUE.shotA + 0.6));
  const ox = (1 - slide) * W * 0.25;
  crystal(ctx, S, W * 0.6 + ox, H * 1.25, W * 1.0 + ox, -H * 0.45, W * 0.1, t, {
    U, seed: 3, tone: "bright", alpha: smooth(t, CUE.shotA, CUE.shotA + 0.15), flow: 0.4, tip: 1,
  });
  crystal(ctx, S, W * 0.78 + ox, H * 1.25, W * 1.12 + ox, -H * 0.3, W * 0.05, t, {
    U, seed: 8, tone: "glass", alpha: 0.6 * slide, flow: 0.5, tip: 1,
  });
  star(ctx, S, sparkX, sparkY, H * (0.08 + 0.75 * grow), t, clamp(grow * 1.4), { spin: 0.08 });
  lensGhosts(ctx, S, W, H, sparkX, sparkY, smooth(t, 5.8, 6.6), U);
  // rainbow leak in the upper left
  sprite(ctx, S.rainbow, W * 0.2, H * 0.3, W * 0.45, H * 0.06, 0.4 * smooth(t, 6.0, 6.8), -0.5);
  dust(ctx, S, W, H, t, 60, 11, smooth(t, 4.8, 5.6), U);
  for (let i = 0; i < 10; i++) {
    const p = ((lt * 0.9 + hash(i * 5)) % 1);
    const a = -2.6 + hash(i * 9) * 1.2;
    const d = p * W * 0.6;
    streak(ctx, sparkX + Math.cos(a) * d, sparkY + Math.sin(a) * d, 60 * U * (0.5 + p), a, 1.5 * U, (1 - p) * grow * 0.7);
  }
}

/** ii — the tip of the crystal, light pooling at its point. */
function shotB(ctx, S, W, H, U, t) {
  const lt = t - CUE.shotB;
  bg(ctx, W, H, "#050409", "#0b0a16", "#060510");
  smokeLayer(ctx, S, W, H, t, 0.18 + 0.25 * smooth(t, 9, 11.5), { seed: 4, count: 6, yMin: 0.1, yMax: 0.9 });
  const tipX = W * 0.46;
  const tipY = H * 0.63;
  rings(ctx, tipX, tipY, H * 0.95, lt, smooth(t, 8.8, 9.6), { U, seed: 9, count: 8, rot: -0.2 });
  // ripples emitted from the tip
  for (let k = 0; k < 5; k++) {
    const t0 = 9.0 + k * 0.55;
    const p = prog(t, t0, t0 + 2.2);
    if (p <= 0 || p >= 1) continue;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(220,215,255,${(1 - p) * 0.35})`;
    ctx.lineWidth = (3 - 2 * p) * U;
    ctx.beginPath();
    ctx.ellipse(tipX, tipY, p * W * 0.55, p * W * 0.5, -0.2, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  const push = easeOutCubic(prog(t, CUE.shotB, CUE.shotB + 3.5));
  crystal(ctx, S, W * 0.78, -H * 0.35, tipX + (1 - push) * W * 0.03, tipY - (1 - push) * H * 0.05, W * 0.042, t, {
    U, seed: 14, tone: "dark", flow: 0.6, tip: W * 0.08,
  });
  const bright = smooth(t, 8.3, 9.2) + 0.3 * pulses(t, [[10.1, 1, 0.3]]);
  star(ctx, S, tipX, tipY, H * (0.35 + 0.25 * bright), t, clamp(bright), { spin: -0.06 });
  // shards flying in from the right
  for (let i = 0; i < 9; i++) {
    const t0 = 8.6 + hash(i * 13) * 3;
    const p = prog(t, t0, t0 + 0.55);
    if (p <= 0 || p >= 1) continue;
    const y = H * (0.05 + hash(i * 17) * 0.35);
    streak(ctx, lerp(W * 1.1, W * 0.55, p), y + p * H * 0.08, 110 * U, Math.PI + 0.2, 2.4 * U, 1 - p * 0.6);
  }
  dust(ctx, S, W, H, t, 50, 23, 0.9, U, { vx: -0.01 });
}

/** iii — the violet nebula; a new star swells and bursts. */
function shotC(ctx, S, W, H, U, t) {
  const lt = t - CUE.shotC;
  bg(ctx, W, H, "#1d1a35", "#2c2850", "#15132a");
  smokeLayer(ctx, S, W, H, t, 0.6, { seed: 7, count: 9, scale: 1.1, drift: 0.02 });
  smokeLayer(ctx, S, W, H, t * 1.3, 0.35, { seed: 17, count: 5, scale: 0.6, yMin: 0.3, yMax: 0.9 });
  const sx = W * 0.44;
  const sy = H * 0.43;
  const burst = smooth(t, 13.35, 13.75);
  const grow = 0.25 + 0.4 * smooth(t, 12.2, 13.3) + 0.6 * burst + 0.25 * pulses(t, [[13.6, 1, 0.35]]);
  rings(ctx, sx, sy, H * (0.7 + burst * 0.5), lt, 0.25 + 0.6 * burst, { U, seed: 31, count: 8 });
  star(ctx, S, sx, sy, H * 0.55 * grow, t, clamp(grow), { spin: 0.05 });
  lensGhosts(ctx, S, W, H, sx, sy, burst * 0.8, U);
  crystal(ctx, S, W * 0.6, H * 1.2, W * 0.8 + lt * 2 * U, -H * 0.3, W * 0.06, t, {
    U, seed: 21, tone: "dark", flow: 0.5, tip: 1,
  });
  for (let i = 0; i < 14; i++) {
    const x = W * (0.05 + hash(i * 7) * 0.9);
    const y = H * (0.1 + hash(i * 11) * 0.8) - lt * 6 * U * (1 + hash(i));
    shard(ctx, S, x, y, (5 + hash(i * 3) * 12) * U, lt * (hash(i) - 0.5) * 2 + i, i * 37, 0.7, U);
  }
  dust(ctx, S, W, H, t, 70, 41, 1, U);
}

/** A white flash and a giant star facing a crystal blade. */
function shotD(ctx, S, W, H, U, t) {
  const lt = t - CUE.shotD;
  bg(ctx, W, H, "#25223f", "#34305a", "#1a1830");
  smokeLayer(ctx, S, W, H, t, 0.5, { seed: 27, count: 8, drift: 0.03 });
  const sx = W * 0.57;
  const sy = H * 0.42;
  rings(ctx, sx, sy, H * 1.0, lt * 2, 0.85, { U, seed: 51, count: 9, grow: 0.12 });
  star(ctx, S, sx, sy, H * (0.75 + lt * 0.05), t, 1, { spin: 0.1, flareW: 2.6 });
  lensGhosts(ctx, S, W, H, sx, sy, 0.8, U);
  const push = easeOutExpo(prog(t, CUE.shotD, CUE.shotD + 0.8));
  crystal(ctx, S, -W * 0.1, H * 1.05, W * (0.3 + 0.06 * push), H * (0.52 - 0.04 * push), W * 0.085, t, {
    U, seed: 33, tone: "bright", flow: 0.8, tip: W * 0.11,
  });
  dust(ctx, S, W, H, t, 70, 61, 1, U, { vx: 0.03 });
}

/** iv — everything inverts into ink: there was nothing left. */
function inkShot(ctx, S, W, H, U, t) {
  const lt = t - CUE.ink;
  // stutter-frame jitter, like a projector skipping
  const step = Math.floor(lt * 12);
  const jx = (hash(step * 3) - 0.5) * 10 * U;
  const jy = (hash(step * 5) - 0.5) * 10 * U;
  ctx.save();
  ctx.translate(jx, jy);
  ctx.fillStyle = "#f4f4f6";
  ctx.fillRect(-W, -H, W * 3, H * 3);
  const pop = 0.82 + 0.18 * easeOutExpo(prog(lt, 0, 0.25));
  const s = H * 0.95 * pop;
  ctx.drawImage(S.ink, W * 0.64 - s / 2, H * 0.36 - s / 2, s, s);
  // black arcs around the blot
  ctx.strokeStyle = "#000";
  for (let i = 0; i < 9; i++) {
    ctx.lineWidth = (1 + hash(i * 3) * 3) * U;
    const r = H * (0.35 + i * 0.07);
    const a0 = hash(i * 7) * TAU;
    ctx.beginPath();
    ctx.arc(W * 0.64, H * 0.36, r, a0, a0 + 0.3 + hash(i * 11) * 0.8);
    ctx.stroke();
  }
  // crystal silhouette: a tapered blade shedding splinters
  ctx.save();
  ctx.translate(-W * 0.02, H * 1.02);
  ctx.rotate(-0.62);
  const L = W * 0.46;
  const w = W * 0.048;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(0, -w);
  ctx.lineTo(L * 0.82, -w * 0.78);
  ctx.lineTo(L * 1.12, -w * 0.05);
  ctx.lineTo(L * 0.86, w * 0.85);
  ctx.lineTo(0, w);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1;
    const x = L * (0.1 + hash(i * 7) * 0.8);
    const len = (25 + hash(i * 11) * 110) * U;
    const a = side * (0.35 + hash(i * 13) * 0.5);
    const bw = (3 + hash(i * 17) * 7) * U;
    ctx.beginPath();
    ctx.moveTo(x - bw, side * w * 0.8);
    ctx.lineTo(x + Math.cos(a) * len, side * w * 0.8 + Math.sin(a) * len);
    ctx.lineTo(x + bw, side * w * 0.8);
    ctx.closePath();
    ctx.fill();
  }
  // white facet lines and cracks cut into the silhouette
  ctx.strokeStyle = "#f4f4f6";
  ctx.lineWidth = 1.6 * U;
  ctx.beginPath();
  ctx.moveTo(L * 0.02, -w * 0.2);
  ctx.lineTo(L * 0.84, -w * 0.15);
  ctx.lineTo(L * 1.1, -w * 0.05);
  ctx.stroke();
  ctx.lineWidth = 0.9 * U;
  for (let i = 0; i < 9; i++) {
    const x = L * (0.08 + i * 0.09);
    ctx.beginPath();
    ctx.moveTo(x, -w * 0.7);
    ctx.lineTo(x + w * (hash(i) - 0.3) * 1.4, -w * 0.1);
    ctx.lineTo(x + w * (hash(i * 3) - 0.5), w * 0.6);
    ctx.stroke();
  }
  ctx.restore();
  // black splinters and debris
  for (let i = 0; i < 40; i++) {
    const a = hash(i * 13) * TAU;
    const d = H * (0.3 + hash(i * 17) * 0.6) * (1 + lt * 0.3);
    shard(ctx, S, W * 0.5 + Math.cos(a) * d, H * 0.5 + Math.sin(a) * d * 0.7, (3 + hash(i) * 10) * U, a + lt, i * 3, 1, U, true);
  }
  for (let i = 0; i < 12; i++) {
    ctx.save();
    ctx.translate(W * hash(i * 23), H * hash(i * 29));
    ctx.rotate(-0.9 + hash(i * 31) * 0.5);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, (30 + hash(i) * 120) * U, (1 + hash(i * 2) * 2) * U);
    ctx.restore();
  }
  ctx.restore();
}

/** "get out of my head" — silence before the reveal. */
function blackShot(ctx, S, W, H, U, t) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  const lt = t - CUE.black;
  const flick = lt < 0.25 ? (hash(Math.floor(lt * 40)) > 0.35 ? 1 : 0.3) : 1;
  const size = H * 0.026;
  // faint chromatic ghosts behind the whisper
  const off = (2 + 3 * smooth(t, 18.9, 19.4)) * U;
  for (const [dx, col] of [[-off, "rgba(255,70,110,0.35)"], [off, "rgba(80,210,255,0.35)"]]) {
    label(ctx, "get out of my head", W / 2 + dx, H * 0.5, {
      t, t0: CUE.black + 0.02, size, plain: true, color: col, pop: 0, alpha: flick * smooth(t, 18.8, 19.3),
    });
  }
  label(ctx, "get out of my head", W / 2, H * 0.5, {
    t, t0: CUE.black + 0.02, size, plain: true, pop: 0, alpha: flick,
  });
  // the light gathering, about to break through
  const gather = smooth(t, 19.05, 19.45);
  sprite(ctx, S.glowLav, W / 2, H * 0.42, H * 1.2 * gather, H * 1.2 * gather, gather * 0.6);
  sprite(ctx, S.flare, W / 2, H * 0.42, W * 1.6 * gather, H * 0.04, gather);
}

// --------------------------------------------------------------- reveal ---

function revealBackdrop(ctx, S, W, H, U, t, lt) {
  bg(ctx, W, H, "#121220", "#2a2942", "#100f1c");
  sprite(ctx, S.glowLav, W / 2, H * 0.42, H * 2.0, H * 1.5, 0.22);
  smokeLayer(ctx, S, W, H, t, 0.4, { seed: 71, count: 8, drift: 0.015 });
  smokeLayer(ctx, S, W, H, t * 1.4, 0.65, { seed: 73, count: 6, yMin: 0.75, yMax: 1.05, scale: 0.8 });

  // god rays
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 7; i++) {
    const sway = Math.sin(t * 0.4 + i) * 0.04;
    const a = -Math.PI / 2 + (i - 3) * 0.16 + sway;
    const len = H * 1.3;
    const g = ctx.createLinearGradient(W / 2, H * 0.42, W / 2 + Math.cos(a) * len, H * 0.42 + Math.sin(a) * len);
    g.addColorStop(0, "rgba(230,225,255,0.09)");
    g.addColorStop(1, "rgba(230,225,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(W / 2, H * 0.42);
    ctx.lineTo(W / 2 + Math.cos(a - 0.05) * len, H * 0.42 + Math.sin(a - 0.05) * len);
    ctx.lineTo(W / 2 + Math.cos(a + 0.05) * len, H * 0.42 + Math.sin(a + 0.05) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // the central pillar the token is bound to
  crystal(ctx, S, W / 2, H * 1.2, W / 2, -H * 0.6, W * 0.045, t, {
    U, seed: 91, tone: "glass", flow: -0.35, tip: 1, alpha: 0.85, rainbow: false,
  });
  // falling light threads
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 18; i++) {
    const x = W * (0.1 + hash(i * 41) * 0.8);
    const p = (lt * (0.25 + hash(i * 43) * 0.3) + hash(i * 47)) % 1;
    const y = p * H * 1.3 - H * 0.15;
    const g = ctx.createLinearGradient(x, y - H * 0.18, x, y);
    g.addColorStop(0, "rgba(220,215,255,0)");
    g.addColorStop(1, "rgba(235,232,255,0.4)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y - H * 0.18, 1.2 * U, H * 0.18);
  }
  ctx.restore();

  // crystal clusters framing the shot
  crystal(ctx, S, W * 0.83, H * 1.15, W * 1.04, H * 0.05, W * 0.055, t, { U, seed: 93, tone: "bright", flow: 0.3, tip: W * 0.05 });
  crystal(ctx, S, W * 0.93, H * 1.2, W * 1.15, H * 0.3, W * 0.045, t, { U, seed: 94, tone: "glass", flow: 0.4, tip: W * 0.04 });
  crystal(ctx, S, W * 0.18, H * 1.1, -W * 0.05, H * 0.35, W * 0.04, t, { U, seed: 95, tone: "glass", flow: 0.3, tip: W * 0.04, alpha: 0.8 });
  for (let i = 0; i < 9; i++) {
    const bx = W * (0.04 + hash(i * 53) * 0.3);
    const len = H * (0.08 + hash(i * 59) * 0.22);
    const a = -Math.PI / 2 + (hash(i * 61) - 0.5) * 0.9;
    crystal(ctx, S, bx, H * 1.02, bx + Math.cos(a) * len, H * 1.02 + Math.sin(a) * len, W * (0.006 + hash(i) * 0.01), t, {
      U, seed: 100 + i, tone: "glass", flow: 0.3, alpha: 0.75, glow: 0.5, rainbow: false,
    });
  }
}

function wings(ctx, W, H, U, t, cx, cy, alpha) {
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 5; i++) {
      const wave = Math.sin(t * 0.9 + i * 0.8) * H * 0.02;
      const spread = 1 - i * 0.12;
      ribbon(ctx, [
        cx + side * W * 0.03, cy - H * 0.02 * i,
        cx + side * W * 0.16 * spread, cy - H * (0.2 + 0.03 * i) + wave,
        cx + side * W * 0.32 * spread, cy - H * (0.18 + 0.02 * i) - wave,
        cx + side * W * (0.5 - i * 0.03), cy - H * (0.07 - i * 0.04) + wave,
      ], 1 - i * 0.15, alpha * (0.9 - i * 0.13), U);
    }
    // crescent halo
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(235,230,255,${alpha * 0.55})`;
    ctx.lineWidth = 2.2 * U;
    ctx.beginPath();
    const r = H * 0.2;
    const mid = side < 0 ? Math.PI : 0;
    ctx.arc(cx, cy, r, mid - 0.7, mid + 0.7);
    ctx.stroke();
    ctx.restore();
  }
}

/** Orbit ellipse; draws only the back or the front half for fake depth. */
function orbit(ctx, S, cx, cy, rx, ry, tilt, t, speed, front, alpha, U) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(230,226,255,${alpha * (front ? 0.75 : 0.3)})`;
  ctx.lineWidth = (front ? 1.8 : 1.2) * U;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
  ctx.stroke();
  for (let k = 0; k < 3; k++) {
    const a = (t * speed + k / 3) * TAU;
    const isFront = Math.sin(a) > 0;
    if (isFront !== front) continue;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    ctx.drawImage(S.glowWhite, x - 18 * U, y - 18 * U, 36 * U, 36 * U);
    ctx.drawImage(S.flare, x - 50 * U, y - 3 * U, 100 * U, 6 * U);
  }
  ctx.restore();
}

function runeCircle(ctx, cx, cy, r, t, alpha, U) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalCompositeOperation = "lighter";
  ctx.rotate(t * 0.15);
  ctx.strokeStyle = `rgba(220,215,255,${alpha * 0.45})`;
  ctx.lineWidth = 1 * U;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.07, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU;
    const long = i % 6 === 0;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.lineTo(Math.cos(a) * r * (long ? 1.07 : 1.03), Math.sin(a) * r * (long ? 1.07 : 1.03));
    ctx.stroke();
  }
  ctx.rotate(-t * 0.4);
  ctx.setLineDash([10 * U, 6 * U, 2 * U, 6 * U]);
  ctx.strokeStyle = `rgba(200,190,255,${alpha * 0.35})`;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.86, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawToken(ctx, S, T, W, H, U, t) {
  const lt = t - CUE.reveal;
  const appear = easeOutCubic(prog(lt, 0, 1.1));
  const surge = pulses(t, [[CUE.surge, 1, 0.45]]);
  const wordsDim = smooth(t, CUE.words - 0.2, CUE.words + 0.6) * (1 - smooth(t, CUE.wordsOut, CUE.surge + 0.05));
  const dim = 1 - wordsDim * 0.5;
  const R = H * 0.14;
  const cx = W / 2;
  const cy = H * 0.42 + Math.sin(t * 1.3) * H * 0.008;
  const scale = (1.35 - 0.35 * appear) * (1 + 0.1 * surge);
  const size = R * 2 * scale;

  // light behind the token
  star(ctx, S, cx, cy, R * (3.2 + 1.5 * surge) * dim, t, (0.55 + 0.45 * surge) * dim, { spin: 0.03, flareW: 4 });
  sprite(ctx, S.flare, cx, cy, W * 1.3, H * 0.05, 0.8 * dim);
  orbit(ctx, S, cx, cy, R * 1.75, R * 0.42, -0.22, t, 0.18, false, appear * dim, U);
  orbit(ctx, S, cx, cy, R * 1.55, R * 0.36, 0.3, t, -0.13, false, appear * dim, U);
  runeCircle(ctx, cx, cy, R * 1.28 * (1.2 - 0.2 * appear), t, appear * dim, U);

  if (T) {
    const hs = size * T.haloScale;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = (0.85 + 0.6 * surge) * appear * dim;
    ctx.drawImage(T.halo, cx - hs / 2, cy - hs / 2, hs, hs);
    // chromatic fringe
    const off = (3 + 10 * surge + 12 * (1 - appear)) * U;
    ctx.globalAlpha = 0.45 * appear;
    ctx.drawImage(T.cyan, cx - size / 2 - off, cy - size / 2, size, size);
    ctx.drawImage(T.red, cx - size / 2 + off, cy - size / 2, size, size);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = appear;
    ctx.drawImage(T.base, cx - size / 2, cy - size / 2, size, size);
    // fade to the dimmed look during the question
    if (wordsDim > 0) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.globalAlpha = wordsDim * 0.5;
      ctx.drawImage(T.black, cx - size / 2, cy - size / 2, size, size);
    }
    ctx.restore();
    // over-exposure: born from white light
    const over = clamp(1 - prog(lt, 0.1, 1.6)) + surge * 0.8;
    if (over > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = clamp(over);
      ctx.drawImage(T.white, cx - size / 2, cy - size / 2, size, size);
      ctx.restore();
    }
  }
  orbit(ctx, S, cx, cy, R * 1.75, R * 0.42, -0.22, t, 0.18, true, appear * dim, U);
  orbit(ctx, S, cx, cy, R * 1.55, R * 0.36, 0.3, t, -0.13, true, appear * dim, U);
  sprite(ctx, S.glowWhite, cx, cy, R * 0.6, R * 0.6, 0.25 * dim);
  return { cx, cy, R };
}

function nameCard(ctx, S, W, H, U, t, name, subtitle, cy) {
  const lt = t - (CUE.surge + 0.12);
  if (lt < 0 || !name) return;
  const fade = 1 - smooth(t, CUE.close + 0.6, CUE.close + 1.2);
  const text = name.toUpperCase();
  let size = H * 0.07;
  ctx.save();
  ctx.font = `600 ${size}px ${DISPLAY}`;
  const spacing0 = 0.28;
  const measure = (sp) => {
    let w = 0;
    for (const ch of text) w += ctx.measureText(ch).width + size * sp;
    return w - size * sp;
  };
  const maxW = W * 0.84;
  const fit = measure(spacing0);
  if (fit > maxW) size *= maxW / fit;
  ctx.font = `600 ${size}px ${DISPLAY}`;
  const spacing = lerp(0.9, spacing0, easeOutExpo(prog(lt, 0, 1.2)));
  const total = measure(spacing);
  let x = W / 2 - total / 2;
  const y = cy;
  // soft shadow band so the title reads over the light pillar
  ctx.save();
  ctx.globalAlpha = 0.75 * clamp(lt / 0.4) * fade;
  ctx.translate(W / 2, y);
  ctx.scale(1, 0.16);
  const band = ctx.createRadialGradient(0, 0, 0, 0, 0, total * 0.65);
  band.addColorStop(0, "rgba(8,6,20,0.85)");
  band.addColorStop(0.6, "rgba(8,6,20,0.5)");
  band.addColorStop(1, "rgba(8,6,20,0)");
  ctx.fillStyle = band;
  ctx.fillRect(-total, -total, total * 2, total * 2);
  ctx.restore();
  ctx.textBaseline = "middle";
  const chars = [...text];
  chars.forEach((ch, i) => {
    const a = clamp((lt - i * 0.035) / 0.25) * fade;
    const cw = ctx.measureText(ch).width;
    if (a > 0) {
      const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.55, "#e4e0ff");
      g.addColorStop(1, "#a79cff");
      ctx.globalAlpha = a;
      ctx.shadowColor = "rgba(190,175,255,0.9)";
      ctx.shadowBlur = size * 0.45;
      ctx.fillStyle = g;
      ctx.fillText(ch, x, y + (1 - a) * size * 0.25);
    }
    x += cw + size * spacing;
  });
  ctx.restore();
  // rules either side + glint sweep
  const lineP = easeOutExpo(prog(lt, 0.1, 1.0));
  const lw = W * 0.2 * lineP;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.globalCompositeOperation = "lighter";
  for (const side of [-1, 1]) {
    const x0 = W / 2 + side * (total / 2 + size * 0.5);
    const g = ctx.createLinearGradient(x0, 0, x0 + side * lw, 0);
    g.addColorStop(0, "rgba(235,230,255,0.85)");
    g.addColorStop(1, "rgba(235,230,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(Math.min(x0, x0 + side * lw), cy - 0.75 * U, lw, 1.5 * U);
    ctx.drawImage(S.glowWhite, x0 - 6 * U, cy - 6 * U, 12 * U, 12 * U);
  }
  const sweep = prog(lt, 0.3, 1.3);
  if (sweep > 0 && sweep < 1) {
    sprite(ctx, S.flare, W / 2 - total / 2 + total * sweep, cy, size * 4, size * 0.5, Math.sin(sweep * Math.PI));
  }
  ctx.restore();
  if (subtitle) {
    label(ctx, subtitle, W / 2, cy + size * 1.05, {
      t, t0: CUE.surge + 0.7, size: Math.max(size * 0.45, H * 0.03), plain: true, pop: 0, weight: 600, glow: true,
      color: "rgba(240,236,255,0.95)", alpha: fade, end: CUE.close + 0.6, fadeOut: 0.6,
    });
  }
}

function revealShot(ctx, S, T, W, H, U, t, payload) {
  const lt = t - CUE.reveal;
  revealBackdrop(ctx, S, W, H, U, t, lt);
  const wingA = smooth(lt, 0.2, 1.5) * (1 - 0.4 * smooth(t, CUE.words, CUE.words + 0.6) * (1 - smooth(t, CUE.wordsOut, CUE.surge)));
  wings(ctx, W, H, U, t, W / 2, H * 0.42, wingA);

  // floating fragments rising around the token
  for (let i = 0; i < 64; i++) {
    const r1 = hash(i * 71);
    const r2 = hash(i * 73);
    const r3 = hash(i * 79);
    const x = W * (0.04 + r1 * 0.92);
    const yy = ((r2 - lt * (0.015 + r3 * 0.03)) % 1.2 + 1.2) % 1.2 - 0.1;
    const depth = 0.4 + r3 * 0.8;
    shard(ctx, S, x, yy * H, (3 + r3 * 13) * U * depth, lt * (r1 - 0.5) * 1.5 + i, 500 + i, 0.75 * depth, U);
  }

  const tok = drawToken(ctx, S, T, W, H, U, t);

  // surge: burst of shards and a shockwave
  shockwave(ctx, S, tok.cx, tok.cy, CUE.surge, t, W * 0.75, U, 1);
  shockwave(ctx, S, tok.cx, tok.cy, CUE.reveal + 0.05, t, W * 0.9, U, 0.8);
  const bt = t - CUE.surge;
  if (bt > 0 && bt < 2.5) {
    for (let i = 0; i < 46; i++) {
      const a = hash(i * 83) * TAU;
      const v = (0.35 + hash(i * 89) * 0.75) * W;
      const d = v * easeOutCubic(clamp(bt / 2.2));
      shard(ctx, S, tok.cx + Math.cos(a) * d, tok.cy + Math.sin(a) * d * 0.75, (4 + hash(i) * 9) * U, a + bt * 4, 900 + i, 1 - bt / 2.5, U);
    }
  }
  // the token's own reveal burst
  if (lt < 2.2) {
    for (let i = 0; i < 40; i++) {
      const a = hash(i * 97) * TAU;
      const d = (0.1 + hash(i * 101) * 0.9) * W * 0.7 * easeOutExpo(clamp(lt / 1.8));
      streak(ctx, tok.cx + Math.cos(a) * d, tok.cy + Math.sin(a) * d, 70 * U, a, 1.6 * U, 1 - lt / 2.2);
    }
  }
  dust(ctx, S, W, H, t, 90, 131, 1, U, { vy: -0.03 });

  // ---- subtitle beats ----
  const dimLabels = 1 - 0.6 * smooth(t, 25.9, 26.9);
  const goneOut = CUE.wordsOut;
  // big sweeping line, then it settles small
  if (t < CUE.goneSmall) {
    const p = prog(t, CUE.gone, CUE.goneSmall);
    label(ctx, "it wasn't gone", lerp(-W * 0.02, W * 0.22, easeOutCubic(p)), H * 0.62, {
      t, t0: CUE.gone, size: H * 0.06, align: "left", pop: 0.05, end: CUE.goneSmall - 0.02, fadeOut: 0.02,
    });
  }
  label(ctx, "it wasn't gone", W * 0.27, H * 0.66, {
    t, t0: CUE.goneSmall, size: H * 0.026, alpha: dimLabels, end: goneOut, fadeOut: 0.3, driftX: 2 * U,
  });
  label(ctx, "with only 5 fragments left", W * 0.73, H * 0.55, {
    t, t0: CUE.fragments, size: H * 0.024, rot: 5, alpha: dimLabels, end: goneOut, fadeOut: 0.3, driftX: -1.5 * U,
  });
  // the question, one word at a time, down the pillar
  const top = H * 0.12;
  const gap = H * 0.1;
  WORDS.forEach((w, i) => {
    label(ctx, w, W / 2, top + i * gap, {
      t, t0: WORD_TIMES[i], size: H * 0.042, end: goneOut, fadeOut: 0.35, pop: 0.18,
    });
  });

  nameCard(ctx, S, W, H, U, t, payload.name, payload.subtitle, tok.cy + tok.R * 1.95);
}

// ----------------------------------------------------------- composite ---

function shotLabels(ctx, W, H, t) {
  if (t >= CUE.line1 && t < CUE.shotB) {
    label(ctx, "i - started with few", W * 0.29, H * 0.475, { t, t0: CUE.line1, size: H * 0.03, rot: -3, driftX: 4 });
  }
  if (t >= CUE.line2 && t < CUE.shotC) {
    label(ctx, "ii - only less it gets.", W * 0.69, H * 0.78, { t, t0: CUE.line2, size: H * 0.034, rot: 6, driftX: -3 });
  }
  if (t >= CUE.line3 && t < CUE.shotD) {
    label(ctx, "iii - time by time, now empty", W * 0.38, H * 0.585, { t, t0: CUE.line3, size: H * 0.036, rot: -21, driftX: 3 });
  }
  if (t >= CUE.ink && t < CUE.black) {
    label(ctx, "iv - and there was nothing left.", W * 0.73, H * 0.68, { t, t0: CUE.ink + 0.03, size: H * 0.04, rot: -12, invert: true });
  }
}

/** Letterbox bars + the slit squeeze between shots. */
function letterbox(ctx, W, H, t, U) {
  const bar = H * 0.045;
  let half = H / 2 - bar;
  let cy = H / 2;
  let slit = 0;
  for (const [a, b, c] of SQUEEZES) {
    if (t >= a && t < b) {
      const p = easeInCubic(prog(t, a, b));
      half *= 1 - p;
      cy += p * H * 0.04;
      slit = p;
    } else if (t >= b && t < c) {
      half *= easeOutCubic(prog(t, b, c));
    }
  }
  half = Math.max(0, half);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, cy - half);
  ctx.fillRect(0, cy + half, W, H - cy - half);
  if (slit > 0.4) {
    const a = (slit - 0.4) / 0.6;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "rgba(200,190,255,0)");
    g.addColorStop(0.5, `rgba(255,255,255,${a})`);
    g.addColorStop(1, "rgba(200,190,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, cy - 1.5 * U, W, 3 * U);
    ctx.restore();
  }
}

/**
 * Draws the frame for time t.
 * S: sprites, T: token sprites (or null), state: { W, H, U, payload }.
 */
export function render(ctx, S, T, state, t) {
  const { W, H, U, payload } = state;
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  if (t < CUE.shotA) {
    // fade-in from the black of the trigger
  } else if (t < CUE.greyFlash) {
    const shake = pulses(t, SHAKES);
    ctx.save();
    if (t < CUE.shotB) {
      const lt = t - CUE.shotA;
      camera(ctx, W, H, 1.0 + lt * 0.025, -0.01 * lt, 0, 0, shake, t, U);
      shotA(ctx, S, W, H, U, t);
    } else if (t < CUE.shotC) {
      const lt = t - CUE.shotB;
      camera(ctx, W, H, 1.06 - lt * 0.012, 0.004 * lt, -lt * 3 * U, 0, shake, t, U);
      shotB(ctx, S, W, H, U, t);
    } else if (t < CUE.shotD) {
      const lt = t - CUE.shotC;
      camera(ctx, W, H, 1.0 + lt * 0.03, 0.006 * lt, 0, 0, shake, t, U);
      shotC(ctx, S, W, H, U, t);
    } else if (t < CUE.ink) {
      const lt = t - CUE.shotD;
      camera(ctx, W, H, 1.12 - lt * 0.05, -0.01 * lt, 0, 0, shake, t, U);
      shotD(ctx, S, W, H, U, t);
    } else if (t < CUE.black) {
      camera(ctx, W, H, 1.0, 0, 0, 0, shake * 0.5, t, U);
      inkShot(ctx, S, W, H, U, t);
    } else if (t < CUE.reveal) {
      blackShot(ctx, S, W, H, U, t);
    } else {
      const lt = t - CUE.reveal;
      const zoom = 1.18 - 0.14 * easeOutCubic(prog(lt, 0, 4)) + 0.03 * smooth(t, CUE.surge, CUE.greyFlash);
      camera(ctx, W, H, zoom, 0, 0, -lt * 0.6 * U, shake, t, U);
      revealShot(ctx, S, T, W, H, U, t, payload);
    }
    ctx.restore();
    if (t < CUE.black) shotLabels(ctx, W, H, t);

    // grade
    if (t >= CUE.shotA && t < CUE.ink) vignette(ctx, W, H, 0.75);
    else if (t >= CUE.reveal) vignette(ctx, W, H, 0.55);

    const flash = pulses(t, FLASHES);
    if (flash > 0.005) {
      ctx.fillStyle = `rgba(255,255,255,${clamp(flash)})`;
      ctx.fillRect(0, 0, W, H);
    }
    letterbox(ctx, W, H, t, U);
  } else {
    // grey flash and fade out
    const lt = t - CUE.greyFlash;
    if (lt < 0.17) ctx.fillStyle = "#a9a9ad";
    else if (lt < 0.36) ctx.fillStyle = "#2c2c30";
    else ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
  }

  // film grain
  if (t > CUE.shotA && t < CUE.greyFlash) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    const ox = Math.floor(hash(Math.floor(t * 24)) * 256);
    const oy = Math.floor(hash(Math.floor(t * 24) + 77) * 256);
    ctx.translate(-ox, -oy);
    ctx.fillStyle = ctx.createPattern(S.grain, "repeat");
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
  }
  ctx.restore();
}

/** Saturation for the canvas CSS filter (the ending drains to monochrome). */
export function grayscaleAt(t) {
  return smooth(t, CUE.grey, CUE.close + 0.4);
}
