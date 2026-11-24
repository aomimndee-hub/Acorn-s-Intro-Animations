// Star that doesn't Exist: a feather-and-starlight cutscene for one token.
// Every frame is a pure function of the song's current time.
//
// Storyboard (times from public/audio/star.mp3, ~106 BPM, drop at 25.375 s):
// 1   0.6-9.45   feathers fall in S-curves; a yellow star slowly lights up;
//                a tilted lyric card slides into the frame; the moon at the corner
// 2   9.45-17    a 3D space colony drifts in from the left; lyric card at the top;
//                feathers drift down the right; a pink and gold star trail
// 3   17-25.4    cut to the moon; feathers fall from it; black bars close in,
//                a breath of silence, then a white flash on the drop
// 4   25.4-43    the token floats in space before the moon (no wings): swirling feathers,
//                turning pink four-point stars, a slow gold star, effects on the beat;
//                "Ascende verso lumen astria nonexa", then "Star that doesn't Exist"
import { TAU, clamp, easeInCubic, easeOutCubic, hash, lerp, prog, smooth } from "../cutscene/util.js";

const BEAT = 0.5675;
const BAR = BEAT * 4;
const DROP = 25.375;
const bar = (n) => DROP + n * BAR;

export const T = {
  open: 0.6,
  colony: 9.45,
  moon: 17.0,
  bars: 22.9,
  hush: 24.85,
  drop: DROP,
  latin: bar(5), // 36.73
  title: bar(6), // 38.99
  out: 42.1,
  end: 43.0,
  name: bar(2),
};

/**
 * Lines shown in the lyric card. The timings follow the vocal phrases; the words
 * are stand-ins in the spirit of the song, meant to be replaced with the real lyrics.
 */
export const LYRICS = [
  [1.6, 3.8, "Somewhere past the edge of the sky,"],
  [4.0, 6.8, "a single feather keeps on falling"],
  [7.0, 9.3, "toward a light that no one has seen."],
  [9.9, 12.3, "We built a home among the stars"],
  [12.5, 14.8, "and named the ones we could not reach."],
  [15.0, 16.9, "Still, we kept on looking up."],
  [17.6, 20.3, "The moon remembers what we lost,"],
  [20.5, 22.8, "and the quiet night begins to sing."],
  [bar(1), bar(2) - 0.15, "Rise, past every star that ever was,"],
  [bar(2), bar(3) - 0.15, "toward the one that never was."],
  [bar(3), bar(4) - 0.15, "Hold on to the light you carry,"],
  [bar(4), bar(5) - 0.2, "even if the sky forgets your name."],
];

const SERIF = '"Cormorant Garamond", Georgia, serif';
const CAPS = '"Cinzel", "Cormorant Garamond", Georgia, serif';

const beatPulse = (t, d = 0.1) => (t < DROP ? 0 : Math.exp(-((((t - DROP) % BEAT) + BEAT) % BEAT) / d));
const barPulse = (t, d = 0.3) => (t < DROP ? 0 : Math.exp(-((((t - DROP) % BAR) + BAR) % BAR) / d));
const barNo = (t) => Math.floor((t - DROP) / BAR);

// ---- helpers -------------------------------------------------------------------------------

function sprite(ctx, img, x, y, w, h = w, alpha = 1, rot = 0, mode = "lighter") {
  if (alpha <= 0.01 || w <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function text(ctx, str, x, y, size, { font = SERIF, weight = 500, italic = false, alpha = 1, spacing = 0, color = "#fff4fb", glow = "rgba(255,170,220,0.9)", align = "center" } = {}) {
  if (alpha <= 0.01 || !str) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${italic ? "italic" : ""} ${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing * size}px`;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = size * 0.45;
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

function fitSize(ctx, str, size, maxW, font, weight = 500, italic = false, spacing = 0) {
  ctx.save();
  ctx.font = `${italic ? "italic" : ""} ${weight} ${size}px ${font}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing * size}px`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w > maxW ? (size * maxW) / w : size;
}

/** The lyric line for time t (with its own fade), or null. */
function lyricAt(t) {
  for (const [t0, t1, s] of LYRICS) if (t >= t0 - 0.05 && t < t1 + 0.35) return { t0, t1, s };
  return null;
}

// ---- space ----------------------------------------------------------------------------------

function space(ctx, st, t, drift) {
  const { W, H, A } = st;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(Math.sin(t * 0.05) * 0.04);
  const s = 1.18;
  // the nebula sways rather than slides, so its edge never enters the frame
  ctx.drawImage(A.nebula, -W * s / 2 + Math.sin(drift * 0.6) * W * 0.04, -H * s / 2, W * s, H * s);
  ctx.restore();
  // two layers of star dust drifting at different speeds
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const [img, k, a] of [[A.dustB, 0.03, 0.8], [A.dustA, 0.06, 0.9]]) {
    const tile = Math.max(W, H) * 0.9;
    const ox = ((-(t * k + drift * k * 4) * tile) % tile + tile) % tile;
    const oy = ((t * k * 0.4 * tile) % tile + tile) % tile;
    ctx.globalAlpha = a;
    for (let ix = -1; ix <= 1; ix++) for (let iy = -1; iy <= 1; iy++) ctx.drawImage(img, ox + ix * tile, oy + iy * tile, tile, tile);
  }
  ctx.restore();
}

/** Pink four-point stars that turn slowly and twinkle; brighter on beats. */
function stars4(ctx, st, t, n, amount, seed = 0) {
  const { W, H, A } = st;
  for (let i = 0; i < n; i++) {
    const k = i + seed * 31;
    const x = W * (0.04 + hash(k * 7 + 1) * 0.92);
    const y = H * (0.06 + hash(k * 11 + 2) * 0.88);
    const tw = Math.pow(Math.max(0, Math.sin(t * (0.9 + hash(k) * 1.8) + k * 2.1)), 3);
    const s = H * (0.05 + hash(k * 13) * 0.1) * (0.55 + tw * 0.8 + beatPulse(t, 0.12) * 0.35);
    sprite(ctx, k % 5 ? A.sparkle : A.sparkleGold, x, y, s, s, (0.3 + tw * 0.9) * amount, t * (0.3 + hash(k * 3) * 0.6) * (k % 2 ? 1 : -1));
  }
}

/** The big gold star with pink beams: lights up slowly, turns and twinkles. */
function goldStar(ctx, st, t, x, y, size, alpha, beams = []) {
  const { A, U } = st;
  if (alpha <= 0.01) return;
  const tw = 0.85 + 0.15 * Math.sin(t * 4.3) + 0.1 * Math.sin(t * 7.1) + beatPulse(t, 0.12) * 0.3;
  // pink beams crossing through it, as in the storyboard
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (const [ang, len, w] of beams) {
    const dx = Math.cos(ang) * len;
    const dy = Math.sin(ang) * len;
    for (const [lw, a] of [[w * 5, 0.12], [w * 2, 0.35], [w, 0.9]]) {
      const g = ctx.createLinearGradient(x - dx, y - dy, x + dx, y + dy);
      g.addColorStop(0, "rgba(255,140,220,0)");
      g.addColorStop(0.5, `rgba(255,170,230,${a * alpha})`);
      g.addColorStop(1, "rgba(255,140,220,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = lw * U;
      ctx.beginPath();
      ctx.moveTo(x - dx, y - dy);
      ctx.lineTo(x + dx, y + dy);
      ctx.stroke();
    }
  }
  ctx.restore();
  sprite(ctx, A.glowP, x, y, size * 1.6, size * 1.6, alpha * 0.45);
  sprite(ctx, A.glowG, x, y, size * 0.9, size * 0.9, alpha * 0.8 * tw);
  sprite(ctx, A.sparkleGold, x, y, size * tw, size * tw, alpha, t * 0.12);
  sprite(ctx, A.sparkle, x, y, size * 0.55 * tw, size * 0.55 * tw, alpha * 0.8, -t * 0.2 + Math.PI / 4);
}

/**
 * Hexagonal aperture ghosts: a chain of iris-shaped reflections along the line
 * from the light through the frame centre, mirrored to the far side.
 */
const GHOSTS = [
  [0.22, 0.05, 0], [0.42, 0.09, 1], [0.62, 0.035, 2], [0.85, 0.13, 3], [1.1, 0.06, 4],
  [1.32, 0.1, 0], [1.55, 0.045, 1], [1.8, 0.18, 2], [2.05, 0.07, 3],
];
function hexGhosts(ctx, st, t, x, y, alpha) {
  const { W, H, A } = st;
  if (alpha <= 0.01) return;
  const cx = W / 2;
  const cy = H / 2;
  const shimmer = 0.85 + 0.15 * Math.sin(t * 3.1) + beatPulse(t, 0.15) * 0.4;
  for (const [k, r, c] of GHOSTS) {
    const gx = x + (cx - x) * k;
    const gy = y + (cy - y) * k;
    const s = H * r * (1 + 0.08 * Math.sin(t * 0.9 + k * 3));
    sprite(ctx, A.hex[c], gx, gy, s * 2, s * 2, alpha * shimmer * (0.55 + 0.45 * Math.sin(k * 5) ** 2), 0.15 + t * 0.02);
  }
}

function moon(ctx, st, t, x, y, r, alpha) {
  const { A } = st;
  if (alpha <= 0.01) return;
  sprite(ctx, A.glowM, x, y, r * 3, r * 3, alpha * 0.35);
  sprite(ctx, A.glowP, x, y, r * 2.6, r * 2.6, alpha * 0.15);
  sprite(ctx, A.moon, x, y, r * 2, r * 2, alpha, t * 0.008, "source-over");
}

// ---- feathers -----------------------------------------------------------------------------------

/** One feather on an S-shaped fall: it sways side to side, turns with its path and flips over. */
function fallingFeather(ctx, st, img, t, x0, y0, len, speed, sway, phase, alpha) {
  const { W, H } = st;
  const y = y0 + t * speed * H;
  const s = Math.sin(t * 1.25 + phase);
  const x = x0 + s * sway * W;
  const tilt = Math.cos(t * 1.25 + phase) * 0.9; // leans into the swing
  const h = len * H;
  const w = (img.width / img.height) * h;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(tilt * 0.6 + 0.9 + Math.sin(phase) * 0.5);
  ctx.scale(0.7 + 0.3 * Math.cos(t * 0.9 + phase), 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/** A field of falling feathers that loops; `xMin..xMax` limits where they fall. */
function featherFall(ctx, st, t, n, alpha, { xMin = 0, xMax = 1, speed = 0.06, size = 0.2, seed = 0 } = {}) {
  const { W, H, A } = st;
  for (let i = 0; i < n; i++) {
    const k = i + seed * 17;
    const img = A.feathers[k % A.feathers.length];
    const depth = 0.55 + hash(k * 3) * 0.7;
    const period = (1.5 + size) / (speed * depth);
    const local = ((t + hash(k * 5) * period) % period);
    const x0 = W * lerp(xMin, xMax, hash(k * 7));
    fallingFeather(ctx, st, img, local, x0, -H * 0.3, size * depth, speed * depth, 0.05 + hash(k * 9) * 0.04, k * 1.7, alpha * Math.min(1, depth));
  }
}

/** Feathers circling the token on tilted orbits; `front` draws only the near half. */
function featherSwirl(ctx, st, t, cx, cy, R, alpha, front) {
  const { A } = st;
  const gust = barPulse(t, 0.4);
  for (let i = 0; i < 22; i++) {
    const img = A.feathers[i % A.feathers.length];
    const a = (i / 22) * TAU + t * (0.35 + hash(i) * 0.25) + gust * 0.4;
    const depth = Math.sin(a);
    if ((depth > 0) !== front) continue;
    const r = R * (0.75 + hash(i * 3) * 0.7) * (1 + gust * 0.12);
    const x = cx + Math.cos(a) * r * 1.35;
    const y = cy + depth * r * 0.38 + (hash(i * 5) - 0.5) * R * 0.5 + Math.sin(t * 0.8 + i) * R * 0.06;
    const h = R * (0.36 + hash(i * 7) * 0.28) * (0.75 + depth * 0.3);
    const w = (img.width / img.height) * h;
    ctx.save();
    ctx.globalAlpha = alpha * (0.55 + 0.45 * (depth + 1) / 2);
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2 + Math.sin(t * 1.5 + i) * 0.3);
    ctx.scale(0.65 + 0.35 * Math.cos(t * 1.4 + i), 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

/** Mint light strokes curling around the token like wind (the green strokes in the storyboard). */
function windStrokes(ctx, st, t, cx, cy, R, alpha) {
  const { U } = st;
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    const a0 = (i / 9) * TAU + t * (0.5 + hash(i) * 0.3) * (i % 2 ? 1 : -1);
    const r = R * (1.1 + hash(i * 3) * 0.9);
    const span = 0.35 + hash(i * 5) * 0.5;
    const a = alpha * (0.35 + 0.4 * Math.sin(t * 1.7 + i) ** 2 + beatPulse(t, 0.15) * 0.3);
    for (const [w, k] of [[6, 0.15], [2, 0.8]]) {
      ctx.strokeStyle = `rgba(190,255,215,${a * k})`;
      ctx.lineWidth = w * U;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.3, r * 0.55, -0.25, a0, a0 + span);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---- the lyric card ------------------------------------------------------------------------------

/** A tilted card of pale paper with a dark outline; the line types itself on. */
function lyricCard(ctx, st, t, cx, cy, w, h, rot, slide, show) {
  const { U } = st;
  if (show <= 0.01) return;
  ctx.save();
  ctx.translate(cx + slide[0], cy + slide[1]);
  ctx.rotate(rot);
  ctx.globalAlpha = show;
  // shadow and card
  ctx.fillStyle = "rgba(20,0,16,0.35)";
  ctx.fillRect(-w / 2 + 6 * U, -h / 2 + 8 * U, w, h);
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  g.addColorStop(0, "rgba(255,246,252,0.94)");
  g.addColorStop(1, "rgba(246,226,244,0.94)");
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = "#2a0b22";
  ctx.lineWidth = 3 * U;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = "rgba(42,11,34,0.35)";
  ctx.lineWidth = 1 * U;
  ctx.strokeRect(-w / 2 + 7 * U, -h / 2 + 7 * U, w - 14 * U, h - 14 * U);
  // the line, typed on
  const L = lyricAt(t);
  if (L) {
    const n = Math.floor(clamp(prog(t, L.t0, L.t0 + Math.min(1.2, (L.t1 - L.t0) * 0.6))) * L.s.length);
    const a = 1 - smooth(t, L.t1, L.t1 + 0.35);
    const size = fitSize(ctx, L.s, h * 0.46, w * 0.9, SERIF, 600, true);
    text(ctx, L.s.slice(0, n), 0, 0, size, { italic: true, weight: 600, color: "#2a0b22", glow: null, alpha: a });
  }
  ctx.restore();
}

// ---- the token -----------------------------------------------------------------------------------

function hero(ctx, st, t, cx, cy, h, { alpha = 1, white = 0, rot = 0 } = {}) {
  const K = st.tokS;
  if (alpha <= 0.01) return;
  if (!K) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  // halo ring above the head
  ctx.strokeStyle = `rgba(255,225,240,${0.85 * alpha})`;
  ctx.lineWidth = h * 0.012;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.52, h * 0.2, h * 0.05, -0.12, 0, TAU);
  ctx.stroke();
  const hs = h * K.haloScale;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.7 * alpha;
  ctx.drawImage(K.halo, -hs / 2, -hs / 2, hs, hs);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = alpha;
  ctx.drawImage(K.base, -h / 2, -h / 2, h, h);
  if (white > 0.01) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha * clamp(white);
    ctx.drawImage(K.white, -h / 2, -h / 2, h, h);
  }
  ctx.restore();
}

// ---- scenes ---------------------------------------------------------------------------------------

/** 1: feathers falling, a star lighting up, the lyric card sliding in. */
function sceneFeathers(ctx, st, t) {
  const { W, H, U } = st;
  space(ctx, st, t, 0);
  moon(ctx, st, t, W * 1.02, -H * 0.02, H * 0.42, smooth(t, 1.0, 3.0));
  // the star in the upper left lights up slowly
  const light = smooth(t, 1.5, 7.5);
  goldStar(ctx, st, t, W * 0.13, H * 0.3, H * (0.18 + 0.42 * light), light, [[-0.32, W * 0.75, 1.6], [1.25, H * 0.7, 1.2]]);
  hexGhosts(ctx, st, t, W * 0.13, H * 0.3, light * 0.8);
  stars4(ctx, st, t, 10, smooth(t, 0.8, 2.5));
  featherFall(ctx, st, t + 6, 9, smooth(t, 0.6, 2.2), { xMin: 0.45, xMax: 0.85, speed: 0.07, size: 0.2 });
  // the card slides in along its own slant
  const slide = 1 - easeOutCubic(prog(t, 1.15, 2.6));
  const rot = -0.42;
  lyricCard(ctx, st, t, W * 0.34, H * 0.66, W * 0.44, H * 0.15, rot + Math.sin(t * 0.4) * 0.01,
    [-Math.cos(rot) * W * 0.6 * slide, -Math.sin(rot) * W * 0.6 * slide + H * 0.15 * slide], smooth(t, 1.1, 1.5) * (1 - smooth(t, T.colony - 0.3, T.colony)));
  // first light: fade in from black
  const black = 1 - smooth(t, T.open, T.open + 1.2);
  if (black > 0.01) {
    ctx.fillStyle = `rgba(0,0,0,${black})`;
    ctx.fillRect(-W, -H, W * 3, H * 3);
  }
}

/** 2: the space colony drifts across the frame. */
function sceneColony(ctx, st, t) {
  const { W, H, U, A } = st;
  const p = prog(t, T.colony, T.moon);
  space(ctx, st, t, p);
  // the gold and pink starlight trailing across the top right
  goldStar(ctx, st, t, W * 0.9, H * 0.12, H * 0.5, smooth(t, T.colony, T.colony + 0.8), [[0.12, W * 0.55, 1.4], [1.35, H * 0.9, 1.6]]);
  hexGhosts(ctx, st, t, W * 0.9, H * 0.12, smooth(t, T.colony, T.colony + 0.8) * 0.7);
  stars4(ctx, st, t, 7, 0.9, 3);
  if (st.colony) {
    const cv = st.colony.render(W, H, st.dpr3, t, p);
    ctx.drawImage(cv, 0, 0, W, H);
  } else {
    // flat stand-in without WebGL
    ctx.save();
    const cx = lerp(-W * 0.6, W * 0.35, easeOutCubic(p));
    ctx.fillStyle = "#e9dcec";
    ctx.beginPath();
    ctx.arc(cx, H * 1.6, H * 1.25, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // feathers from the first scene still drifting down the right side
  featherFall(ctx, st, t + 6, 6, 0.95, { xMin: 0.72, xMax: 0.95, speed: 0.08, size: 0.17, seed: 2 });
  lyricCard(ctx, st, t, W * 0.46, H * 0.13, W * 0.52, H * 0.12, -0.02, [0, -H * 0.3 * (1 - easeOutCubic(prog(t, T.colony, T.colony + 0.6)))], 1 - smooth(t, T.moon - 0.25, T.moon));
  // a quick white flash on the cut
  const f = Math.exp(-(t - T.colony) / 0.18);
  if (f > 0.01) {
    ctx.fillStyle = `rgba(255,240,250,${f * 0.8})`;
    ctx.fillRect(-W, -H, W * 3, H * 3);
  }
}

/** 3: the moon, feathers falling from it, then the bars close for the drop. */
function sceneMoon(ctx, st, t) {
  const { W, H, A } = st;
  const p = prog(t, T.moon, DROP);
  const hush = t >= T.hush;
  space(ctx, st, t, 1 + p);
  const mr = H * (0.55 + p * 0.06);
  moon(ctx, st, t, W / 2, -H * 0.02 + p * H * 0.03, mr, hush ? 0.25 : 1);
  stars4(ctx, st, t, 9, hush ? 0.15 : 1, 5);
  if (!hush) {
    // one feather falls out of the moon toward us, others drift behind it
    featherFall(ctx, st, t, 7, 0.85, { xMin: 0.15, xMax: 0.85, speed: 0.05, size: 0.15, seed: 4 });
    const lt = t - T.moon;
    fallingFeather(ctx, st, A.feathers[1], lt, W * 0.5, -H * 0.05, 0.26, 0.11, 0.05, 0.3, 1);
    lyricCard(ctx, st, t, W * 0.5, H * 0.8, W * 0.52, H * 0.12, 0.03, [0, H * 0.3 * (1 - easeOutCubic(prog(t, T.moon + 0.3, T.moon + 0.9)))], smooth(t, T.moon + 0.3, T.moon + 0.6) * (1 - smooth(t, T.bars, T.bars + 0.4)));
  }
  // in the silence: a dotted outline of a star that is not there
  if (hush) {
    const a = smooth(t, T.hush, T.hush + 0.1);
    const on = hash(Math.floor(t * 18)) > 0.25 ? 1 : 0.3;
    ctx.save();
    ctx.globalAlpha = a * on;
    ctx.strokeStyle = "#ffe8f6";
    ctx.lineWidth = 1.6 * st.U;
    ctx.setLineDash([6 * st.U, 7 * st.U]);
    ctx.beginPath();
    const R = H * 0.16;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * TAU - Math.PI / 2;
      const r = i % 2 ? R * 0.16 : R;
      ctx.lineTo(W / 2 + Math.cos(ang) * r, H * 0.5 + Math.sin(ang) * r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

/** 4: the token floats in space, with everything moving on the beat. */
function sceneFloat(ctx, st, t) {
  const { W, H, U, A } = st;
  const lt = t - DROP;
  const bp = beatPulse(t);
  const bars = barPulse(t);
  const rise = t >= T.title ? easeInCubic(prog(t, T.title + 0.6, T.out + 0.6)) : 0;
  space(ctx, st, t, 2 + lt * 0.15);
  moon(ctx, st, t, W * 0.5, H * 0.08, H * (0.62 + bars * 0.02), 1);
  // the gold star in the upper right turns slowly, beams sweeping with it
  const sr = t * 0.06;
  goldStar(ctx, st, t, W * 0.86, H * 0.2, H * (0.55 + bars * 0.12), 1, [[0.25 + sr, W * 0.6, 2.2], [1.95 + sr, H * 1.1, 3.2]]);
  hexGhosts(ctx, st, t, W * 0.86, H * 0.2, 0.9 + bars * 0.3);
  stars4(ctx, st, t, 16, 1, 7);
  // light bursts out from the token on each bar
  const cx = W * 0.5 + Math.sin(t * 0.45) * W * 0.05;
  const lift = smooth(t, T.latin - 0.6, T.latin + 0.4) * H * 0.1;
  const cy = H * 0.56 + Math.sin(t * 0.7) * H * 0.035 - lift - rise * H * 0.8;
  const h = H * 0.3 * (1 + bars * 0.04) * (1 - smooth(t, T.latin - 0.6, T.latin + 0.4) * 0.15);
  sprite(ctx, A.glowW, cx, cy, H * (0.9 + bars * 0.9), H * (0.9 + bars * 0.9), 0.25 + bars * 0.35);
  windStrokes(ctx, st, t, cx, cy, h, 1);
  featherSwirl(ctx, st, t, cx, cy, h * 1.3, 1, false);
  hero(ctx, st, t, cx, cy, h, {
    white: Math.exp(-lt / 0.5) * 1.2 + bp * 0.12 + rise,
    rot: Math.sin(t * 0.5) * 0.08,
  });
  featherSwirl(ctx, st, t, cx, cy, h * 1.3, 1, true);
  // falling feathers in the foreground
  featherFall(ctx, st, t, 6, 0.9, { xMin: 0, xMax: 1, speed: 0.09, size: 0.3, seed: 9 });
  // the light the token rises into at the end
  if (t >= T.title) {
    const la = smooth(t, T.title, T.title + 1.5);
    sprite(ctx, A.glowW, W / 2, -H * 0.05, W * 1.3 * la, H * la, la * 0.7);
  }
  // soft ring on each bar
  const d = (((t - DROP) % BAR) + BAR) % BAR;
  if (d < 1.2 && t < T.latin) {
    const pr = easeOutCubic(d / 1.2);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,200,240,${(1 - pr) * 0.6})`;
    ctx.lineWidth = (6 - 5 * pr) * U;
    ctx.beginPath();
    ctx.ellipse(cx, cy, W * 0.7 * pr, H * 0.6 * pr, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

// ---- overlays ---------------------------------------------------------------------------------------

/** Black bars: they close in before the drop, then open to a cinematic frame. */
function letterbox(ctx, st, t) {
  const { W, H } = st;
  let k = 0;
  if (t >= T.bars && t < DROP) k = 0.3 * easeOutCubic(prog(t, T.bars, T.hush)) + 0.16 * easeInCubic(prog(t, T.hush, DROP));
  else if (t >= DROP) k = lerp(0.46, 0.085, easeOutCubic(prog(t, DROP + 0.25, DROP + 1.6)));
  if (k <= 0.001) return;
  const tilt = t < DROP ? -0.025 : -0.012;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(tilt);
  ctx.fillStyle = "#000";
  ctx.fillRect(-W, -H * 0.5 - H, W * 2, H + H * k);
  ctx.fillRect(-W, H * 0.5 - H * k, W * 2, H + H * k);
  ctx.restore();
}

function words(ctx, st, t) {
  const { W, H, A } = st;
  // lyric lines after the drop, as subtitles above the lower bar
  if (t >= DROP && t < T.latin) {
    const L = lyricAt(t);
    if (L) {
      const a = smooth(t, L.t0, L.t0 + 0.3) * (1 - smooth(t, L.t1, L.t1 + 0.35));
      const size = fitSize(ctx, L.s, H * 0.048, W * 0.85, SERIF, 600, true);
      const band = ctx.createLinearGradient(0, H * 0.74, 0, H * 0.9);
      band.addColorStop(0, "rgba(14,0,12,0)");
      band.addColorStop(0.5, `rgba(14,0,12,${0.6 * a})`);
      band.addColorStop(1, "rgba(14,0,12,0)");
      ctx.fillStyle = band;
      ctx.fillRect(0, H * 0.74, W, H * 0.16);
      text(ctx, L.s, W / 2, H * 0.82, size, { italic: true, weight: 600, alpha: a, spacing: 0.03 });
    }
  }
  // the token's name, early in the float
  if (st.name && t >= T.name && t < T.name + BAR * 1.6) {
    const a = smooth(t, T.name, T.name + 0.4) * (1 - smooth(t, T.name + BAR * 1.3, T.name + BAR * 1.6));
    text(ctx, st.name.toUpperCase(), W / 2, H * 0.14, H * 0.045, { font: CAPS, weight: 600, spacing: 0.4, alpha: a });
  }
  // Ascende verso lumen astria nonexa
  if (t >= T.latin && t < T.title + 0.4) {
    const a = 1 - smooth(t, T.title - 0.2, T.title + 0.3);
    const latin = "Ascende verso lumen astria nonexa";
    const size = fitSize(ctx, `“${latin}”`, H * 0.075, W * 0.9, CAPS, 600, false, 0.06);
    const n = Math.floor(clamp(prog(t, T.latin, T.latin + 1.3)) * latin.length);
    const band = ctx.createLinearGradient(0, H * 0.66, 0, H * 0.92);
    band.addColorStop(0, "rgba(10,0,8,0)");
    band.addColorStop(0.5, `rgba(10,0,8,${0.55 * a})`);
    band.addColorStop(1, "rgba(10,0,8,0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, H * 0.66, W, H * 0.26);
    text(ctx, `“${latin.slice(0, n)}${n === latin.length ? "”" : ""}`, W / 2, H * 0.77, size, { font: CAPS, weight: 600, spacing: 0.06, alpha: a });
    text(ctx, "Journey toward the light of stars that were never meant to be", W / 2, H * 0.85, size * 0.45, { italic: true, alpha: smooth(t, T.latin + 1.3, T.latin + 2) * a, spacing: 0.04 });
  }
  // Star that doesn't Exist
  if (t >= T.title) {
    const a = smooth(t, T.title, T.title + 0.5) * (1 - smooth(t, T.out + 0.2, T.end - 0.1));
    const title = "Star that doesn’t Exist";
    const size = fitSize(ctx, title, H * 0.11, W * 0.86, CAPS, 600, false, 0.08);
    const sweep = prog(t, T.title + 0.2, T.title + 1.6);
    const band = ctx.createLinearGradient(0, H * 0.66, 0, H * 0.92);
    band.addColorStop(0, "rgba(10,0,8,0)");
    band.addColorStop(0.5, `rgba(10,0,8,${0.5 * a})`);
    band.addColorStop(1, "rgba(10,0,8,0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, H * 0.66, W, H * 0.26);
    text(ctx, title, W / 2, H * 0.77, size, { font: CAPS, weight: 600, spacing: 0.08, alpha: a });
    text(ctx, "a journey toward a star that was never there", W / 2, H * 0.855, size * 0.32, { italic: true, alpha: a * smooth(t, T.title + 0.6, T.title + 1.4), spacing: 0.1 });
    if (sweep > 0 && sweep < 1) sprite(ctx, A.sparkle, W * lerp(0.15, 0.85, sweep), H * 0.77, H * 0.22, H * 0.22, Math.sin(sweep * Math.PI) * a, t * 2);
  }
}

function camera(ctx, st, t) {
  const { W, H, U } = st;
  const b = barPulse(t, 0.18);
  const f = Math.floor(t * 60);
  const shake = (b * 12 + beatPulse(t, 0.06) * 3) * U * (t < T.latin ? 1 : 0.3);
  const zoom = 1.06 + 0.02 * Math.sin(t * 0.3) + b * 0.025;
  ctx.translate(W / 2 + Math.sin(t * 0.37) * W * 0.008 + (hash(f) - 0.5) * shake, H / 2 + Math.sin(t * 0.53) * H * 0.012 + (hash(f + 9) - 0.5) * shake);
  ctx.rotate(Math.sin(t * 0.21) * 0.015 + (barNo(t) % 2 ? 1 : -1) * b * 0.01);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H / 2);
}

export function render(ctx, st, t) {
  const { W, H, A } = st;
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  if (t >= T.open) {
    ctx.save();
    camera(ctx, st, t);
    if (t < T.colony) sceneFeathers(ctx, st, t);
    else if (t < T.moon) sceneColony(ctx, st, t);
    else if (t < DROP) sceneMoon(ctx, st, t);
    else sceneFloat(ctx, st, t);
    ctx.restore();
    letterbox(ctx, st, t);
    words(ctx, st, t);
    // white flash on the drop
    if (t >= DROP) {
      const f = Math.exp(-(t - DROP) / 0.4);
      if (f > 0.01) {
        ctx.fillStyle = `rgba(255,246,252,${f})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
    // white bloom, then black
    const bloom = smooth(t, T.out, T.out + 0.4) * (1 - smooth(t, T.out + 0.4, T.end));
    if (bloom > 0.01) {
      ctx.fillStyle = `rgba(255,244,250,${bloom})`;
      ctx.fillRect(0, 0, W, H);
    }
    const black = smooth(t, T.out + 0.4, T.end);
    if (black > 0.01) {
      ctx.fillStyle = `rgba(0,0,0,${black})`;
      ctx.fillRect(0, 0, W, H);
    }
    // grain
    if (!st._grainPat || st._grainCtx !== ctx) {
      st._grainPat = ctx.createPattern(A.grain, "repeat");
      st._grainCtx = ctx;
    }
    ctx.save();
    ctx.globalAlpha = 0.8;
    const gf = Math.floor(t * 24);
    ctx.translate(-Math.floor(hash(gf) * 256), -Math.floor(hash(gf + 3) * 256));
    ctx.fillStyle = st._grainPat;
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
  }
  ctx.restore();
}
