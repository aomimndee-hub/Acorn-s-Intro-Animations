// Spica: a silver, star-lit cutscene. The first 32 s follow the source video,
// re-timed onto the song; after the break the token is revealed and the
// finale (34.8 s to the end) is an original design built from the same motifs.
// Every frame is a pure function of the song's current time.
import { TAU, clamp, easeInCubic, easeOutCubic, easeOutExpo, hash, lerp, makeCanvas, prog, rng, smooth } from "../cutscene/util.js";

// Measured from public/audio/spica.mp3: ~117 BPM, bars of 2.06 s, drop at 16.23 s.
const BAR = 2.06;
const BEAT = BAR / 4;
const DROP = 16.23;
const bar = (n) => DROP + n * BAR;

export const T = {
  peace: 0.3,
  salvation: 2.06,
  hope: 3.48,
  star: 6.17,
  line1: 6.55,
  halo: 8.23,
  flare: 11.7,
  squares: 12.31,
  line2: 12.6,
  build: 15.3,
  drop: DROP,
  flareShot: bar(3), // 22.41
  crest: [bar(5), bar(6), bar(7)], // 26.53, 28.59, 30.65
  brk: 32.2,
  reveal: bar(9), // 34.77
  ring: bar(10),
  squares2: bar(11),
  warp: bar(12),
  stars: bar(13),
  name: bar(14),
  final: bar(15),
  out: 48.9,
  end: 49.5,
};

const LINE1 = "“Now, let's bring back the lost light.”";
const LINE2 = "“There's nothing to fear anymore...”";

const beatPulse = (t, decay = 0.1) => {
  const k = ((((t - DROP) % BEAT) + BEAT) % BEAT);
  return Math.exp(-k / decay);
};
const barPulse = (t, decay = 0.25) => {
  const k = ((((t - DROP) % BAR) + BAR) % BAR);
  return Math.exp(-k / decay);
};
const beatNo = (t) => Math.floor((t - DROP) / BEAT);

const CINZEL = '"Cinzel", "Cormorant Garamond", Georgia, serif';

// Virgo, around Spica (index 0), in a unit box.
const VIRGO = [
  [0.53, 0.72], [0.45, 0.58], [0.47, 0.42], [0.37, 0.32], [0.39, 0.45], [0.58, 0.4],
  [0.66, 0.3], [0.3, 0.6], [0.62, 0.55], [0.74, 0.47], [0.26, 0.22],
];
const VIRGO_LINES = [[0, 1], [1, 2], [2, 4], [4, 3], [3, 10], [2, 5], [5, 6], [1, 7], [0, 8], [8, 9], [5, 8]];

// ---- sprites ------------------------------------------------------------------

function glow(size, stops) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  return c;
}

/** Slim four-point star with very long, thin arms (the Spica glint). */
function starSprite(size = 1024) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const R = size / 2;
  x.translate(R, R);
  x.globalCompositeOperation = "lighter";
  const halo = x.createRadialGradient(0, 0, 0, 0, 0, R * 0.35);
  halo.addColorStop(0, "rgba(255,255,255,0.9)");
  halo.addColorStop(0.3, "rgba(230,235,255,0.35)");
  halo.addColorStop(1, "rgba(200,210,255,0)");
  x.fillStyle = halo;
  x.fillRect(-R, -R, size, size);
  for (let i = 0; i < 4; i++) {
    x.save();
    x.rotate((i / 4) * TAU);
    const g = x.createLinearGradient(0, 0, R, 0);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(245,248,255,0.85)");
    g.addColorStop(1, "rgba(220,230,255,0)");
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(0, -R * 0.06);
    x.quadraticCurveTo(R * 0.12, -R * 0.012, R, 0);
    x.quadraticCurveTo(R * 0.12, R * 0.012, 0, R * 0.06);
    x.closePath();
    x.fill();
    x.restore();
  }
  return c;
}

function grainSprite() {
  const S = 256;
  const c = makeCanvas(S, S);
  const x = c.getContext("2d");
  const img = x.createImageData(S, S);
  const r = rng(13);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 18;
  }
  x.putImageData(img, 0, 0);
  return c;
}

/** The ornate halo frame: double rims with leaves, thorns, beads and arcs. */
function ringSprite(size = 1400) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const R = size / 2;
  x.translate(R, R);
  x.strokeStyle = "#fff";
  x.fillStyle = "#fff";
  x.lineCap = "round";
  const circle = (r, w) => {
    x.lineWidth = w;
    x.beginPath();
    x.arc(0, 0, r, 0, TAU);
    x.stroke();
  };
  circle(R * 0.97, size * 0.004);
  circle(R * 0.9, size * 0.006);
  circle(R * 0.78, size * 0.003);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    x.save();
    x.rotate(a);
    if (i % 3 === 0) {
      // crescent leaf
      x.beginPath();
      x.arc(R * 0.84, 0, R * 0.05, -Math.PI / 2, Math.PI / 2);
      x.arc(R * 0.855, 0, R * 0.04, Math.PI / 2, -Math.PI / 2, true);
      x.fill();
    } else if (i % 3 === 1) {
      // thorns
      for (let k = 0; k < 4; k++) {
        x.beginPath();
        x.moveTo(R * 0.9, (k - 1.5) * R * 0.018);
        x.lineTo(R * 0.845, (k - 1.5) * R * 0.018 + R * 0.01);
        x.lineTo(R * 0.9, (k - 1.5) * R * 0.018 + R * 0.014);
        x.fill();
      }
    } else {
      // bead
      x.beginPath();
      x.arc(R * 0.84, 0, R * 0.014, 0, TAU);
      x.fill();
    }
    // curls on the outer rim
    x.lineWidth = size * 0.003;
    x.beginPath();
    x.arc(R * 0.935, R * 0.04, R * 0.025, Math.PI, TAU * 0.95);
    x.stroke();
    x.restore();
  }
  // broken arcs inside
  x.lineWidth = size * 0.004;
  for (let i = 0; i < 9; i++) {
    const a0 = (i / 9) * TAU;
    x.beginPath();
    x.arc(0, 0, R * 0.72, a0, a0 + 0.35);
    x.stroke();
  }
  return c;
}

/** The crest: circle, cardinal points and a stylised blossom of crescents. */
function crestSprite(size = 900) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const R = size / 2;
  x.translate(R, R);
  x.strokeStyle = "#fff";
  x.fillStyle = "#fff";
  x.lineWidth = size * 0.006;
  for (const k of [0.72, 0.64]) {
    x.beginPath();
    x.arc(0, 0, R * k, 0, TAU);
    x.stroke();
  }
  for (let i = 0; i < 4; i++) {
    x.save();
    x.rotate((i / 4) * TAU);
    x.beginPath();
    x.moveTo(0, -R * 0.98);
    x.lineTo(R * 0.06, -R * 0.74);
    x.lineTo(0, -R * 0.78);
    x.lineTo(-R * 0.06, -R * 0.74);
    x.closePath();
    x.fill();
    x.restore();
  }
  for (let i = 0; i < 6; i++) {
    x.save();
    x.rotate((i / 6) * TAU);
    x.beginPath();
    x.arc(0, -R * 0.3, R * 0.18, 0.2, Math.PI - 0.2);
    x.arc(0, -R * 0.38, R * 0.17, Math.PI - 0.35, 0.35, true);
    x.fill();
    x.restore();
  }
  x.beginPath();
  x.arc(0, 0, R * 0.09, 0, TAU);
  x.fill();
  return c;
}

export function buildSprites() {
  return {
    star: starSprite(),
    glowW: glow(256, [[0, "rgba(255,255,255,1)"], [0.2, "rgba(255,255,255,0.5)"], [0.5, "rgba(235,240,255,0.14)"], [1, "rgba(235,240,255,0)"]]),
    glowS: glow(256, [[0, "rgba(200,210,235,0.5)"], [0.6, "rgba(160,170,200,0.12)"], [1, "rgba(160,170,200,0)"]]),
    ring: ringSprite(),
    crest: crestSprite(),
    grain: grainSprite(),
  };
}

// ---- helpers --------------------------------------------------------------------

function sprite(ctx, img, x, y, w, h = w, alpha = 1, rot = 0, add = true) {
  if (alpha <= 0.01 || w <= 0) return;
  ctx.save();
  if (add) ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function fill(ctx, W, H, c) {
  ctx.fillStyle = c;
  ctx.fillRect(0, 0, W, H);
}

function title(ctx, str, x, y, size, { alpha = 1, spacing = 0.04, blur = 0, weight = 400, align = "center" } = {}) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${CINZEL}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing * size}px`;
  ctx.shadowColor = "rgba(255,255,255,0.75)";
  ctx.shadowBlur = size * (0.25 + blur);
  ctx.fillStyle = "#f4f5f8";
  ctx.fillText(str, x, y);
  ctx.restore();
}

/** Word with its oversized ghost echo drifting behind it, as in the source titles. */
function echoWord(ctx, st, str, t0, t1, t) {
  const { W, H } = st;
  const lt = t - t0;
  const a = smooth(t, t0, t0 + 0.18) * (1 - smooth(t, t1 - 0.25, t1));
  if (a <= 0.01) return;
  const ghost = lerp(1.55, 1.18, easeOutCubic(prog(lt, 0, 1.2)));
  title(ctx, str, W / 2, H * 0.5, H * 0.115 * ghost, { alpha: a * 0.22, blur: 0.6 });
  title(ctx, str, W / 2, H * 0.5, H * 0.1 * (1 + lt * 0.015), { alpha: a });
}

/** Typewriter line at the lower left. */
function typed(ctx, st, line, t0, t1, t, { x = 0.06, y = 0.86, end = Infinity } = {}) {
  const { W, H } = st;
  const n = Math.floor(clamp(prog(t, t0, t1)) * line.length);
  if (n <= 0) return;
  const a = 1 - smooth(t, end - 0.3, end);
  title(ctx, line.slice(0, n).toUpperCase(), W * x, H * y, H * 0.03, { alpha: a, spacing: 0.06, align: "left" });
}

// ---- flying forward through the stars (after the drop) ------------------------------------

// A few recognisable star patterns (unit coordinates, roughly centred).
const SHAPES = [
  // Orion
  { pts: [[-0.3, -0.5], [0.3, -0.45], [-0.08, 0], [0, 0.02], [0.08, 0.04], [-0.32, 0.5], [0.28, 0.55]], lines: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]] },
  // Cassiopeia
  { pts: [[-0.5, -0.1], [-0.25, 0.2], [0, -0.05], [0.25, 0.22], [0.5, -0.15]], lines: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  // Big Dipper
  { pts: [[-0.55, -0.2], [-0.32, -0.12], [-0.12, -0.05], [0.08, 0.02], [0.12, 0.3], [0.45, 0.32], [0.48, 0.05]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
  // Cygnus
  { pts: [[0, -0.55], [0, -0.15], [0, 0.15], [0, 0.55], [-0.45, -0.05], [0.45, -0.25]], lines: [[0, 1], [1, 2], [2, 3], [4, 1], [1, 5]] },
  // Leo
  { pts: [[-0.45, 0.25], [-0.2, 0.05], [0.05, 0.1], [0.25, -0.15], [0.2, -0.4], [0.4, -0.45], [0.45, 0.2]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6], [6, 0]] },
  // Lyra
  { pts: [[0, -0.5], [-0.15, -0.1], [0.15, -0.05], [-0.1, 0.35], [0.2, 0.4]], lines: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4]] },
  // Virgo
  { pts: VIRGO.map(([x, y]) => [(x - 0.5) * 1.4, (y - 0.47) * 1.4]), lines: VIRGO_LINES },
];

/** Distance travelled: steady cruise plus a surge on every bar. */
function travelPhase(t) {
  const lt = Math.max(0, t - DROP);
  const bars = lt / BAR;
  const whole = Math.floor(bars);
  const surge = whole + easeOutCubic(clamp((bars - whole) * BAR / 0.45));
  return lt * 0.42 + surge * 0.22;
}

function travel(ctx, st, t, amount) {
  if (amount <= 0.01) return;
  const { W, H, U, S } = st;
  const ph = travelPhase(t);
  const cx = W / 2;
  const cy = H * 0.48;
  const F = Math.max(W, H) * 0.32; // focal length in pixels
  const D = Math.hypot(W, H) * 0.62;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // speed lines: always streaming out from the vanishing point
  for (let i = 0; i < 90; i++) {
    const a = hash(i * 7 + 3) * TAU;
    const d = (hash(i * 13) + ph * (0.9 + hash(i * 5) * 0.8)) % 1;
    const r0 = Math.pow(d, 1.8) * D;
    const len = (0.04 + d * 0.32) * D;
    const al = Math.sin(d * Math.PI) * 0.5 * amount;
    if (al < 0.01) continue;
    const g = ctx.createLinearGradient(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len));
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(1, `rgba(235,240,255,${al})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = (0.6 + d * 2.4) * U;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len));
    ctx.stroke();
  }

  // small stars rushing past, drawn as short trails
  const proj = (x, y, z) => [cx + (x / z) * F, cy + (y / z) * F];
  for (let i = 0; i < 220; i++) {
    const x = (hash(i * 3) - 0.5) * 4;
    const y = (hash(i * 5) - 0.5) * 2.6;
    if (Math.abs(x) < 0.08 && Math.abs(y) < 0.08) continue;
    const z = 1 - ((hash(i * 7) + ph * 0.55) % 1) * 0.94;
    const z2 = Math.min(1, z + 0.03 + 0.04 * amount);
    const [px, py] = proj(x, y, z);
    const [qx, qy] = proj(x, y, z2);
    if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;
    const near = 1 - z;
    ctx.strokeStyle = `rgba(255,255,255,${(0.25 + 0.75 * near) * amount})`;
    ctx.lineWidth = (0.5 + near * 2.5) * U;
    ctx.beginPath();
    ctx.moveTo(qx, qy);
    ctx.lineTo(px, py);
    ctx.stroke();
  }

  // constellations floating toward us and sliding past
  const LANES = 3;
  const P = 2.1; // phase units per constellation in a lane
  for (let j = 0; j < LANES; j++) {
    const k = ph / P + j / LANES;
    const id = Math.floor(k) * LANES + j;
    const u = k - Math.floor(k);
    const shape = SHAPES[Math.floor(hash(id * 17 + 5) * SHAPES.length)];
    const ang = hash(id * 23) * TAU;
    const rad = 0.55 + hash(id * 29) * 0.5;
    const ox = Math.cos(ang) * rad * 1.5;
    const oy = Math.sin(ang) * rad;
    const rot = (hash(id * 31) - 0.5) * 1.2;
    const sc = 0.85 + hash(id * 37) * 0.5;
    const z = 1.05 - u * 0.98;
    const al = smooth(u, 0, 0.25) * (1 - smooth(u, 0.82, 1)) * amount;
    if (al < 0.01) continue;
    const pts = shape.pts.map(([x, y]) => {
      const rx = x * Math.cos(rot) - y * Math.sin(rot);
      const ry = x * Math.sin(rot) + y * Math.cos(rot);
      return proj(ox + rx * sc, oy + ry * sc, z);
    });
    ctx.strokeStyle = `rgba(230,236,255,${0.8 * al})`;
    ctx.shadowColor = "rgba(255,255,255,0.9)";
    ctx.shadowBlur = 6 * U;
    ctx.lineWidth = (1.2 + (1 - z) * 2.4) * U;
    ctx.beginPath();
    for (const [a, b] of shape.lines) {
      ctx.moveTo(pts[a][0], pts[a][1]);
      ctx.lineTo(pts[b][0], pts[b][1]);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    const size = H * (0.05 + (1 - z) * 0.2);
    pts.forEach(([x, y], n) => {
      const tw = 0.75 + 0.25 * Math.sin(t * 5 + n + id);
      sprite(ctx, S.glowW, x, y, size * 0.6, size * 0.6, al * 0.8);
      sprite(ctx, S.star, x, y, size * tw, size * tw, al, (n % 2) * 0.4);
    });
  }
  ctx.restore();
}

/** Spectrum bars hugging all four edges of the screen. */
function spectrum(ctx, st, t, amount) {
  if (amount <= 0.01) return;
  const { W, H, U } = st;
  const N = 48;
  const v = new Array(N);
  if (st.freq && st.analyser) {
    const f = st.freq;
    for (let i = 0; i < N; i++) {
      // log-spaced bins so the bass does not hog the bars
      const lo = Math.floor(Math.pow(i / N, 1.7) * (f.length - 1));
      const hi = Math.max(lo + 1, Math.floor(Math.pow((i + 1) / N, 1.7) * (f.length - 1)));
      let m = 0;
      for (let b = lo; b < hi; b++) m = Math.max(m, f[b]);
      v[i] = Math.pow(m / 255, 1.6);
    }
  } else {
    // stand-in when no live audio: driven by the beat grid
    const fr = Math.floor(t * 20);
    const bp = beatPulse(t, 0.14);
    const bars = barPulse(t, 0.3);
    for (let i = 0; i < N; i++) {
      const tilt = 1 - (i / N) * 0.6;
      const n = 0.5 * hash(i * 7 + fr) + 0.5 * hash(i * 13 + fr - 1);
      v[i] = clamp(tilt * (0.18 + 0.55 * bp * (i < 10 ? 1 : 0.5) + 0.35 * bars) * (0.5 + 0.6 * n));
    }
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = `rgba(240,244,255,${0.85 * amount})`;
  ctx.shadowColor = "rgba(255,255,255,0.9)";
  ctx.shadowBlur = 8 * U;
  const maxH = H * 0.11;
  // bottom and top: mirrored from the centre outward
  const bw = W / 2 / N;
  for (let i = 0; i < N; i++) {
    const h = Math.max(1.5 * U, v[i] * maxH);
    for (const side of [-1, 1]) {
      const x = W / 2 + side * (i + 0.5) * bw - bw * 0.3;
      ctx.fillRect(x, H - h, bw * 0.6, h);
      ctx.fillRect(x, 0, bw * 0.6, h * 0.75);
    }
  }
  // left and right: mirrored from the middle up and down
  const bh = H / 2 / N;
  for (let i = 0; i < N; i++) {
    const w = Math.max(1.5 * U, v[i] * maxH * 0.8);
    for (const side of [-1, 1]) {
      const y = H / 2 + side * (i + 0.5) * bh - bh * 0.3;
      ctx.fillRect(0, y, w, bh * 0.6);
      ctx.fillRect(W - w, y, w, bh * 0.6);
    }
  }
  ctx.restore();
}

/** Travel runs from the drop to the end; it eases off in the quiet break. */
function travelAmount(t) {
  if (t < DROP || t >= T.out) return 0;
  const brk = smooth(t, T.brk, T.brk + 0.4) * (1 - smooth(t, T.reveal - 0.3, T.reveal));
  return smooth(t, DROP, DROP + 0.3) * (1 - brk * 0.75);
}

function backdrop(ctx, st, t, lift = 0) {
  const { W, H, U, S } = st;
  const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.hypot(W, H) * 0.6);
  g.addColorStop(0, `rgb(${70 + lift * 120},${72 + lift * 120},${80 + lift * 120})`);
  g.addColorStop(0.55, `rgb(${32 + lift * 60},${33 + lift * 60},${38 + lift * 60})`);
  g.addColorStop(1, "#0b0b0e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // faint concentric halos of light
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < 4; i++) {
    ctx.lineWidth = (18 + i * 10) * U;
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.5, H * (0.45 + i * 0.22) + Math.sin(t * 0.4 + i) * 6 * U, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  // star dust
  for (let i = 0; i < 90; i++) {
    const x = W * hash(i * 3);
    const y = H * hash(i * 7);
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.6 + hash(i) * 2) + i));
    ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.55 * tw * hash(i * 11)})`;
    const r = (0.6 + hash(i * 13) * 1.3) * U;
    ctx.fillRect(x, y, r, r);
  }
  // a few hollow rings drifting, like the source's floating bubbles
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = U;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(W * (0.2 + hash(i * 5) * 0.7), H * (0.2 + hash(i * 9) * 0.6) - t * 4 * U, (3 + hash(i) * 3) * U, 0, TAU);
    ctx.stroke();
  }
  travel(ctx, st, t, travelAmount(t));
}

function letterbox(ctx, st, k) {
  if (k <= 0) return;
  const { W, H } = st;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H * 0.075 * k);
  ctx.fillRect(0, H - H * 0.085 * k, W, H * 0.085 * k);
}

function starGlint(ctx, st, x, y, size, rot, alpha = 1) {
  const { S } = st;
  sprite(ctx, S.glowW, x, y, size * 0.45, size * 0.45, 0.8 * alpha);
  sprite(ctx, S.star, x, y, size, size, alpha, rot);
}

/** Bright bars of light crossing the frame. */
function beams(ctx, st, t, t0, pair) {
  const { W, H } = st;
  const lt = t - t0;
  if (lt < 0) return;
  const a = Math.exp(-lt / 1.1) * 0.95 + 0.05;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const [ang, off, wid] of pair) {
    ctx.save();
    ctx.translate(W / 2 + off * W, H / 2);
    ctx.rotate(ang + lt * 0.02);
    const w = H * wid * (1 + Math.exp(-lt / 0.15) * 0.6);
    const g = ctx.createLinearGradient(0, -w, 0, w);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, `rgba(255,255,255,${a})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-W * 1.5, -w, W * 3, w * 2);
    ctx.restore();
  }
  ctx.restore();
}

function squares(ctx, st, t, count, size, spin, alpha, cx, cy) {
  const { U } = st;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.shadowColor = "rgba(255,255,255,0.8)";
  ctx.shadowBlur = 8 * U;
  ctx.lineWidth = 1.6 * U;
  for (let i = 0; i < count; i++) {
    ctx.save();
    ctx.rotate((i / Math.max(1, count)) * (Math.PI / 2) + spin * (1 + i * 0.12));
    const s = size * (1 + (i % 2) * 0.04);
    ctx.strokeRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }
  ctx.restore();
}

function heroToken(ctx, st, x, y, h, { alpha = 1, white = 0, sil = 0 } = {}) {
  const K = st.tokS;
  if (!K || alpha <= 0.01) return;
  const hs = h * K.haloScale;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.7 * alpha;
  ctx.drawImage(K.halo, x - hs / 2, y - hs / 2, hs, hs);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = alpha * (1 - sil);
  ctx.drawImage(K.base, x - h / 2, y - h / 2, h, h);
  ctx.restore();
  const w = Math.max(white, sil);
  if (w > 0.01) {
    ctx.save();
    ctx.globalAlpha = alpha * clamp(w);
    ctx.globalCompositeOperation = sil > white ? "source-over" : "lighter";
    ctx.drawImage(K.white, x - h / 2, y - h / 2, h, h);
    ctx.restore();
  }
}

// ---- shots ------------------------------------------------------------------------

function shotWords(ctx, st, t) {
  const { W, H, S } = st;
  backdrop(ctx, st, t);
  // the ornate ring turns slowly around the words
  const ringA = smooth(t, T.peace, T.peace + 0.5) * (1 - smooth(t, T.star - 0.7, T.star - 0.1));
  const R = H * lerp(1.75, 1.55, smooth(t, T.peace, T.star));
  ctx.save();
  ctx.globalAlpha = ringA * 0.9;
  ctx.translate(W / 2, H / 2);
  ctx.rotate(t * 0.08);
  ctx.drawImage(S.ring, -R / 2, -R / 2, R, R);
  ctx.rotate(-t * 0.18);
  ctx.globalAlpha = ringA * 0.35;
  ctx.drawImage(S.ring, -R * 0.62, -R * 0.62, R * 1.24, R * 1.24);
  ctx.restore();
  // a soft spotlight behind the words
  sprite(ctx, S.glowS, W / 2, H * 0.5, W * 0.9, H * 0.6, 0.6 * ringA);
  echoWord(ctx, st, "“PEACE”", T.peace, T.salvation, t);
  echoWord(ctx, st, "“SALVATION”", T.salvation, T.hope, t);
  echoWord(ctx, st, "“THE LAST HOPE”", T.hope, T.star - 0.1, t);
}

function shotStar(ctx, st, t) {
  const { W, H, U, S } = st;
  backdrop(ctx, st, t, smooth(t, T.flare, T.squares) * 0.6);
  const lt = t - T.star;
  const grow = easeOutCubic(prog(lt, 0, 1.6));
  const size = H * (0.18 + 0.55 * grow) * (1 + 0.15 * smooth(t, T.flare, T.squares));
  const cx = W / 2;
  const cy = H * 0.44;
  // halo rings that open on the louder bar
  const h = smooth(t, T.halo, T.halo + 0.8);
  if (h > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${(0.22 - i * 0.05) * h})`;
      ctx.lineWidth = (6 - i * 1.5) * U;
      ctx.beginPath();
      ctx.arc(cx, cy, H * (0.11 + i * 0.05) * (1 + 0.06 * Math.sin(t * 2 + i)), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
  starGlint(ctx, st, cx, cy, size, 0, smooth(lt, 0, 0.5));
  typed(ctx, st, LINE1, T.line1, 10.6, t, { y: 0.84 });
  const white = smooth(t, T.flare, T.squares - 0.05);
  if (white > 0) fill(ctx, W, H, `rgba(255,255,255,${white * 0.9})`);
}

function shotSquares(ctx, st, t) {
  const { W, H, S } = st;
  const lt = t - T.squares;
  const build = smooth(t, T.build, DROP);
  backdrop(ctx, st, t, build * 0.5);
  // squares join on each beat and spin up into a star polygon
  const count = Math.min(5, 1 + Math.floor(lt / (BEAT * 2.2)));
  const spin = lt * (0.25 + build * 1.8) + build * build * 2;
  squares(ctx, st, t, count, H * (0.42 + 0.03 * Math.sin(lt * 2)), spin, 0.85, W / 2, H * 0.47);
  squares(ctx, st, t, 2, H * 0.75, -spin * 0.4, 0.25, W / 2, H * 0.47);
  typed(ctx, st, LINE2, T.line2, 15.2, t, { y: 0.5, x: 0.07 });
  const w = Math.exp(-lt / 0.2);
  if (w > 0.01) fill(ctx, W, H, `rgba(255,255,255,${w})`);
  // build into the drop: light swells from the centre
  if (build > 0) sprite(ctx, S.glowW, W / 2, H * 0.47, W * 2 * build, W * 2 * build, build * build);
}

function shotTitle(ctx, st, t) {
  const { W, H, S } = st;
  const lt = t - DROP;
  backdrop(ctx, st, t, 0.15);
  // beams cross on each bar, alternating
  const k = Math.floor(lt / BAR);
  const t0 = DROP + k * BAR;
  const pairs = [
    [[-0.62, 0.05, 0.03], [1.2, 0.12, 0.022]],
    [[1.35, 0.02, 0.025], [0.3, -0.05, 0.03]],
    [[-0.45, -0.08, 0.028], [1.1, 0.15, 0.02]],
  ];
  beams(ctx, st, t, t0, pairs[k % 3]);
  const pop = 1 + Math.exp(-lt / 0.12) * 0.35;
  title(ctx, `“${st.title.toUpperCase()}”`, W / 2, H * 0.5, H * 0.13 * pop * (1 + lt * 0.01), { alpha: 1 - smooth(t, T.flareShot - 0.6, T.flareShot), spacing: 0.06 });
  letterbox(ctx, st, 1);
  const w = Math.exp(-lt / 0.25);
  if (w > 0.01) fill(ctx, W, H, `rgba(255,255,255,${w})`);
  const wash = smooth(t, T.flareShot - 0.5, T.flareShot);
  if (wash > 0) fill(ctx, W, H, `rgba(220,222,228,${wash})`);
}

function shotFlare(ctx, st, t) {
  const { W, H, S } = st;
  const lt = t - T.flareShot;
  backdrop(ctx, st, t, 0.1 + Math.exp(-lt / 0.4) * 0.6);
  const cx = W / 2;
  const cy = H * 0.5;
  // the glint turns on the beat, its arms swinging like a lens catching light
  const b = beatNo(t);
  const ease = easeOutExpo(clamp((((t - DROP) % BEAT) + BEAT) % BEAT / 0.18));
  const rot = lerp(hash(b - 1) * 0.9 - 0.45, hash(b) * 0.9 - 0.45, ease);
  const size = H * (1.6 + 0.35 * beatPulse(t)) * (1 + smooth(t, 31.3, T.brk) * 1.5);
  // the glint shrinks back while the crest is shown, so the crest reads
  const crestOn = T.crest.reduce((v, c0) => v + (t >= c0 && t < c0 + BAR ? Math.exp(-(t - c0) / 0.7) : 0), 0);
  starGlint(ctx, st, cx, cy, size * (1 - 0.55 * crestOn), rot + Math.PI / 4 * (b % 2 ? 0.25 : 0), 1 - 0.4 * crestOn);
  // crest blooms over the glint on three bars
  for (const c0 of T.crest) {
    const ct = t - c0;
    if (ct >= 0 && ct < BAR) {
      const a = Math.exp(-ct / 0.7);
      const cs = H * 0.78 * (1 + ct * 0.05) * (1 + Math.exp(-ct / 0.1) * 0.15);
      sprite(ctx, S.glowW, cx, cy, cs * 1.2, cs * 1.2, a * 0.15);
      sprite(ctx, S.crest, cx, cy, cs, cs, a, ct * 0.08, false);
    }
  }
  letterbox(ctx, st, 1);
  const white = smooth(t, 31.4, T.brk - 0.1);
  if (white > 0) fill(ctx, W, H, `rgba(240,242,248,${white})`);
}

/** Break: Virgo lights star by star, then its lines gather into the token. */
function shotConstellation(ctx, st, t) {
  const { W, H, U, S } = st;
  const lt = t - T.brk;
  fill(ctx, W, H, "#050507");
  const fadeIn = smooth(lt, 0, 0.4);
  const box = H * 0.9;
  const ox = W / 2 - box / 2;
  const oy = H * 0.05;
  const gather = smooth(t, 33.9, T.reveal - 0.05);
  const pts = VIRGO.map(([x, y], i) => {
    const px = ox + x * box;
    const py = oy + y * box;
    return [lerp(px, W / 2, gather * 0.85), lerp(py, H * 0.5, gather * 0.85), i];
  });
  // stars ignite one per beat
  pts.forEach(([x, y, i]) => {
    const on = smooth(t, T.brk + i * 0.2, T.brk + i * 0.2 + 0.15);
    const big = i === 0 ? 2.2 : 1;
    sprite(ctx, S.glowW, x, y, 26 * U * big, 26 * U * big, on * fadeIn);
    if (i === 0) starGlint(ctx, st, x, y, H * 0.3, 0, on);
  });
  // lines draw between them
  ctx.save();
  ctx.strokeStyle = `rgba(230,235,255,${0.55 * fadeIn * (1 - gather)})`;
  ctx.lineWidth = 1.2 * U;
  VIRGO_LINES.forEach(([a, b], k) => {
    const p = smooth(t, T.brk + 0.4 + k * 0.14, T.brk + 0.7 + k * 0.14);
    if (p <= 0) return;
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(lerp(ax, bx, p), lerp(ay, by, p));
    ctx.stroke();
  });
  ctx.restore();
  // the token's silhouette forms where the lines meet
  const sil = smooth(t, 33.9, T.reveal);
  if (sil > 0) heroToken(ctx, st, W / 2, H * 0.48, H * 0.46, { alpha: sil, sil: 1 });
  const w = smooth(t, T.reveal - 0.12, T.reveal);
  if (w > 0) fill(ctx, W, H, `rgba(255,255,255,${w})`);
}

// ---- finale (original design) --------------------------------------------------------

function shotFinale(ctx, st, t) {
  const { W, H, U, S } = st;
  const lt = t - T.reveal;
  const bp = beatPulse(t);
  const bars = barPulse(t);
  const cx = W / 2;
  const cy = H * 0.47;
  const climax = smooth(t, T.final, T.out);
  backdrop(ctx, st, t, 0.08 + bars * 0.15 + climax * 0.5);
  const barNo = Math.floor((t - DROP) / BAR);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(t * 0.6) * 0.025 + (barNo % 2 ? 0.02 : -0.02) * bars);
  const kick = 1 + bars * 0.05 + climax * 0.12;
  ctx.scale(kick, kick);
  ctx.translate(-cx, -cy);

  // the crest behind everything from the name bar on
  const crestA = smooth(t, T.name - 0.2, T.name + 0.4);
  if (crestA > 0) sprite(ctx, S.crest, cx, cy, H * 0.95 * (1 + bars * 0.04), H * 0.95 * (1 + bars * 0.04), crestA * 0.55, t * 0.05, false);

  // ornate rings
  const ringA = smooth(t, T.ring, T.ring + 0.3);
  if (ringA > 0) {
    const R = H * (1.0 + 0.04 * bp);
    ctx.save();
    ctx.globalAlpha = ringA * 0.8;
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.25);
    ctx.drawImage(S.ring, -R / 2, -R / 2, R, R);
    ctx.rotate(-t * 0.6);
    ctx.globalAlpha = ringA * 0.4;
    ctx.drawImage(S.ring, -R * 0.68, -R * 0.68, R * 1.36, R * 1.36);
    ctx.restore();
  }

  // squares spin up again as a star polygon
  const sqA = smooth(t, T.squares2, T.squares2 + 0.3);
  if (sqA > 0) squares(ctx, st, t, 5, H * (0.62 + 0.04 * bp), t * 0.9 + climax * 4, 0.75 * sqA, cx, cy);

  // constellation sparks ignite around the token, one per beat
  if (t >= T.stars) {
    const n = Math.min(VIRGO.length, 1 + beatNo(t) - beatNo(T.stars));
    for (let i = 0; i < n; i++) {
      const a = (i / VIRGO.length) * TAU + 0.3;
      const r = H * (0.36 + hash(i * 5) * 0.08);
      const x = cx + Math.cos(a) * r * 1.3;
      const y = cy + Math.sin(a) * r;
      starGlint(ctx, st, x, y, H * 0.12 * (1 + (i === n - 1 ? bp : 0)), 0, 0.9);
      if (i > 0) {
        const pa = ((i - 1) / VIRGO.length) * TAU + 0.3;
        const pr = H * (0.36 + hash((i - 1) * 5) * 0.08);
        ctx.strokeStyle = "rgba(235,240,255,0.45)";
        ctx.lineWidth = 1.2 * U;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(pa) * pr * 1.3, cy + Math.sin(pa) * pr);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  }

  // the big glint behind the token
  const glintRot = t * 0.15 + (beatNo(t) % 2) * 0.12;
  starGlint(ctx, st, cx, cy, H * (1.5 + 0.3 * bp + climax * 2.5), glintRot, 1);

  // crossing beams on every bar
  const k = Math.floor((t - DROP) / BAR);
  beams(ctx, st, t, DROP + k * BAR, k % 2 ? [[-0.6, 0, 0.022], [0.95, 0.05, 0.018]] : [[0.62, 0.02, 0.022], [-1.0, -0.05, 0.018]]);

  // the token
  const rev = easeOutExpo(prog(lt, 0, 0.6));
  const h = H * 0.46 * lerp(1.25, 1, rev) * (1 + 0.025 * bp);
  heroToken(ctx, st, cx, cy + Math.sin(t * 1.1) * H * 0.008, h, { white: (1 - rev) * 1.2 + bp * 0.15 + climax * 0.6 });

  // shockwave rings on the reveal and on each bar
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const sw = (t0, strength) => {
    const d = t - t0;
    if (d < 0 || d > 1.2) return;
    const p = easeOutCubic(d / 1.2);
    ctx.strokeStyle = `rgba(255,255,255,${(1 - p) * strength})`;
    ctx.lineWidth = (8 - 7 * p) * U;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.hypot(W, H) * 0.6 * p, 0, TAU);
    ctx.stroke();
  };
  sw(T.reveal, 1);
  sw(DROP + k * BAR, 0.5);
  ctx.restore();
  ctx.restore(); // camera

  // name card
  const nameA = smooth(t, T.name, T.name + 0.35);
  if (nameA > 0 && st.name) {
    const pop = 1 + Math.exp(-(t - T.name) / 0.12) * 0.3;
    // dark band so the name reads over the rings
    const band = ctx.createLinearGradient(0, H * 0.74, 0, H * 0.95);
    band.addColorStop(0, "rgba(5,5,8,0)");
    band.addColorStop(0.35, `rgba(5,5,8,${0.75 * nameA})`);
    band.addColorStop(1, `rgba(5,5,8,${0.75 * nameA})`);
    ctx.fillStyle = band;
    ctx.fillRect(0, H * 0.74, W, H * 0.21);
    title(ctx, `“${st.name.toUpperCase()}”`, cx, H * 0.83, H * 0.075 * pop, { alpha: nameA, spacing: 0.08, weight: 600 });
    title(ctx, st.title.toUpperCase(), cx, H * 0.91, H * 0.026, { alpha: nameA * 0.85, spacing: 0.5 });
  }
  letterbox(ctx, st, 1);
  const flash = Math.exp(-lt / 0.3);
  if (flash > 0.01) fill(ctx, W, H, `rgba(255,255,255,${flash})`);
  const white = smooth(t, 48.4, T.out);
  if (white > 0) fill(ctx, W, H, `rgba(255,255,255,${white})`);
}

function shotEnd(ctx, st, t) {
  const { W, H, S } = st;
  fill(ctx, W, H, "#000");
  const a = 1 - smooth(t, T.out, T.end);
  starGlint(ctx, st, W / 2, H * 0.47, H * 0.5 * a, 0, a);
}

// ---- composite ------------------------------------------------------------------------

// ---- post-drop impact effects ------------------------------------------------------------

/** How hard the music is hitting right now (0 before the drop and in the break). */
function hitEnergy(t) {
  if (t < DROP || t >= T.out) return { bar: 0, beat: 0, k: 0 };
  // the break is quiet: let the effects rest there
  const k = t >= T.brk && t < T.reveal ? 0.15 : t >= T.final ? 1.5 : 1;
  return { bar: barPulse(t, 0.16) * k, beat: beatPulse(t, 0.07) * k, k };
}

function tempCanvas(st, key, w, h) {
  const c = (st._tmp ||= {})[key];
  if (c && c.width === w && c.height === h) return c;
  const n = makeCanvas(w, h);
  st._tmp[key] = n;
  return n;
}

/** RGB split: keep green in place, shift red and blue apart. Works in device pixels. */
function chromatic(ctx, st, px) {
  if (px < 0.6) return;
  const c = ctx.canvas;
  const w = c.width;
  const h = c.height;
  const src = tempCanvas(st, "src", w, h);
  const sx = src.getContext("2d");
  sx.globalCompositeOperation = "copy";
  sx.drawImage(c, 0, 0);
  const ch = (key, color) => {
    const o = tempCanvas(st, key, w, h);
    const x = o.getContext("2d");
    x.globalCompositeOperation = "copy";
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = "multiply";
    x.fillStyle = color;
    x.fillRect(0, 0, w, h);
    return o;
  };
  const red = ch("r", "#ff0000");
  const blue = ch("b", "#0000ff");
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "#00ff00";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";
  // the shifted copies are scaled up a touch so no bare strip shows at the edges
  const g = px * 2;
  ctx.drawImage(red, -px - g, -g, w + g * 2, h + g * 2);
  ctx.drawImage(blue, px - g, px * 0.3 - g, w + g * 2, h + g * 2);
  ctx.restore();
}

/** Zoom smear: brighter, larger copies of the frame stacked over it. */
function zoomBlur(ctx, st, amount) {
  if (amount < 0.03) return;
  const c = ctx.canvas;
  const src = tempCanvas(st, "zoom", c.width, c.height);
  const sx = src.getContext("2d");
  sx.globalCompositeOperation = "copy";
  sx.drawImage(c, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  for (let i = 1; i <= 3; i++) {
    const s = 1 + amount * 0.05 * i;
    ctx.globalAlpha = amount * 0.16 / i;
    ctx.drawImage(src, (c.width - c.width * s) / 2, (c.height - c.height * s) * 0.48, c.width * s, c.height * s);
  }
  ctx.restore();
}

/** Horizontal glitch slices on some bar hits. */
function glitch(ctx, st, t, amount) {
  if (amount < 0.15) return;
  const c = ctx.canvas;
  const src = tempCanvas(st, "glitch", c.width, c.height);
  const sx = src.getContext("2d");
  sx.globalCompositeOperation = "copy";
  sx.drawImage(c, 0, 0);
  const f = Math.floor(t * 30);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < 9; i++) {
    if (hash(i * 7 + f) > 0.6) continue;
    const y = Math.floor(hash(i * 13 + f) * c.height);
    const h = Math.floor((0.01 + hash(i * 17 + f) * 0.05) * c.height);
    const dx = (hash(i * 19 + f) - 0.5) * c.width * 0.08 * amount;
    ctx.drawImage(src, 0, y, c.width, h, dx, y, c.width, h);
  }
  ctx.restore();
}

/** Light leaking in from the edges on bar hits, and a vignette that breathes with the beat. */
function edges(ctx, st, t, bar, beat) {
  const { W, H } = st;
  const side = Math.floor((t - DROP) / BAR) % 2;
  if (bar > 0.03) {
    const g = ctx.createLinearGradient(side ? W : 0, 0, side ? W * 0.55 : W * 0.45, 0);
    g.addColorStop(0, `rgba(255,255,255,${0.45 * bar})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  const v = ctx.createRadialGradient(W / 2, H / 2, H * (0.45 - beat * 0.08), W / 2, H / 2, Math.hypot(W, H) * 0.6);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, `rgba(0,0,0,${0.35 + 0.3 * beat})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

export function render(ctx, st, t) {
  const { W, H, U } = st;
  const e = hitEnergy(t);
  ctx.save();
  const fl = travelAmount(t) > 0 ? Math.max(0.4, travelAmount(t)) : 0;
  if (fl > 0 || e.k > 0) {
    // continuous float up and down and a slow tilt left and right
    const fy = Math.sin(t * 0.85) * H * 0.022 * fl;
    const fx = Math.sin(t * 0.47 + 1) * W * 0.008 * fl;
    const tilt = Math.sin(t * 0.52) * 0.045 * fl;
    // shake: hard on the bar, lighter on every beat
    const f = Math.floor(t * 60);
    const amp = (16 * e.bar + 6 * e.beat) * U;
    ctx.translate(W / 2 + fx + (hash(f) - 0.5) * amp * 2, H / 2 + fy + (hash(f + 31) - 0.5) * amp * 2);
    ctx.rotate(tilt + (hash(f + 77) - 0.5) * 0.02 * e.bar);
    // overscan so the tilt never shows a bare corner
    const z = (1 + 0.1 * fl) * (1 + 0.03 * e.bar + 0.01 * e.beat);
    ctx.scale(z, z);
    ctx.translate(-W / 2, -H / 2);
  }
  if (t < T.peace) fill(ctx, W, H, "#000");
  else if (t < T.star) shotWords(ctx, st, t);
  else if (t < T.squares) shotStar(ctx, st, t);
  else if (t < DROP) shotSquares(ctx, st, t);
  else if (t < T.flareShot) shotTitle(ctx, st, t);
  else if (t < T.brk) shotFlare(ctx, st, t);
  else if (t < T.reveal) shotConstellation(ctx, st, t);
  else if (t < T.out) shotFinale(ctx, st, t);
  else shotEnd(ctx, st, t);
  ctx.restore();
  if (e.k > 0) {
    edges(ctx, st, t, e.bar, e.beat);
    zoomBlur(ctx, st, e.bar);
    // every other bar glitches on its downbeat; the climax glitches more
    const barNo = Math.floor((t - DROP) / BAR);
    if (barNo % 2 === 1 || t >= T.final) glitch(ctx, st, t, e.bar);
    chromatic(ctx, st, (e.bar * 9 + e.beat * 3) * (ctx.canvas.width / W) * U);
  }
  spectrum(ctx, st, t, travelAmount(t) > 0 ? Math.max(0.35, travelAmount(t)) : 0);
  if (t > T.peace && t < T.out) {
    ctx.save();
    ctx.globalAlpha = 0.8;
    const f = Math.floor(t * 24);
    ctx.translate(-Math.floor(hash(f) * 256), -Math.floor(hash(f + 9) * 256));
    ctx.fillStyle = ctx.createPattern(st.S.grain, "repeat");
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
  }
}
