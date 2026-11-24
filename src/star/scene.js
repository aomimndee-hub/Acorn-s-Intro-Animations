// Star that doesn't Exist: a feather-and-starlight cutscene for one token.
// Every frame is a pure function of the song's current time.
//
// 0-14 s   prologue: deep space, falling feathers, the pale moon rising
// 14-23 s  the token wakes: wings unfurl, crystal shards orbit, threads of light
// 23-25 s  everything draws in; a breath of silence; a star that is not there
// 25.4 s   the drop: shards and feathers burst out, flying forward through space
// 39 s     "Ascende verso lumen astria nonexa", the token rises into the light
import { TAU, clamp, easeInCubic, easeOutCubic, easeOutExpo, hash, lerp, makeCanvas, prog, smooth } from "../cutscene/util.js";

// Measured from public/audio/star.mp3: ~106 BPM, bars of 2.27 s, drop at 25.375 s.
const BEAT = 0.5675;
const BAR = BEAT * 4;
const DROP = 25.375;

export const T = {
  open: 1.0,
  line: 3.9,
  lineOut: 7.6,
  moon: 7.0,
  wake: 14.3,
  wings: 15.0,
  shards: 16.3,
  brk: 23.0,
  hush: 24.85,
  drop: DROP,
  name: DROP + BAR * 2,
  nameOut: DROP + BAR * 4.5,
  text: 38.99,
  out: 42.1,
  end: 43.0,
};

const PULSES = [4.0, 5.5, 7.0, 8.5, 9.5, 11.0, 12.5]; // soft hits in the prologue
const SERIF = '"Cormorant Garamond", Georgia, serif';
const CAPS = '"Cinzel", "Cormorant Garamond", Georgia, serif';

const beatPulse = (t, d = 0.1) => (t < DROP ? 0 : Math.exp(-((((t - DROP) % BEAT) + BEAT) % BEAT) / d));
const barPulse = (t, d = 0.3) => (t < DROP ? 0 : Math.exp(-((((t - DROP) % BAR) + BAR) % BAR) / d));
const barNo = (t) => Math.floor((t - DROP) / BAR);
const nearPulse = (t, list, d) => list.reduce((v, t0) => v + (t >= t0 ? Math.exp(-(t - t0) / d) : 0), 0);

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

function text(ctx, str, x, y, size, { font = SERIF, weight = 500, italic = false, alpha = 1, spacing = 0, color = "#fff4fb", glow = "rgba(255,170,220,0.9)" } = {}) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${italic ? "italic" : ""} ${weight} ${size}px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing * size}px`;
  ctx.shadowColor = glow;
  ctx.shadowBlur = size * 0.45;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

// ---- background -------------------------------------------------------------------------------

/** How fast we fly forward: still at first, drifting in the build, rushing after the drop. */
function flight(t) {
  if (t < T.wake) return 0.02;
  if (t < T.brk) return lerp(0.03, 0.12, smooth(t, T.wake, T.brk));
  if (t < DROP) return lerp(0.12, 0.0, smooth(t, T.brk, T.hush));
  if (t < T.text) return 0.55 + 0.25 * barPulse(t, 0.4);
  return lerp(0.55, 0.2, smooth(t, T.text, T.out));
}

/** Distance travelled, integrated so the speed changes never jump. */
function travelled(t) {
  let d = 0;
  for (let u = 0; u < t; u += 1 / 20) d += flight(u) / 20;
  return d;
}

function background(ctx, st, t, dist) {
  const { W, H, A } = st;
  // nebula, slowly turning
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(Math.sin(t * 0.05) * 0.05);
  const s = 1.15 + dist * 0.03;
  ctx.drawImage(A.nebula, -W * s / 2, -H * s / 2, W * s, H * s);
  ctx.restore();
  // star dust: two tiles zooming out from the centre so we fly through them
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const [img, speed, base] of [[A.dustB, 0.6, 0.9], [A.dustA, 1, 0.7]]) {
    for (let k = 0; k < 2; k++) {
      const p = ((dist * speed + k * 0.5) % 1 + 1) % 1;
      const z = base * Math.pow(2.2, p * 2);
      ctx.globalAlpha = Math.sin(p * Math.PI) * 0.9;
      const tile = Math.max(W, H) * z;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      for (let ix = -1; ix <= 0; ix++) for (let iy = -1; iy <= 0; iy++) ctx.drawImage(img, ix * tile, iy * tile, tile, tile);
      ctx.restore();
    }
  }
  ctx.restore();
}

/** Twinkling pink sparkles scattered across the frame; brighter on beats. */
function twinkles(ctx, st, t, amount) {
  const { W, H, A } = st;
  for (let i = 0; i < 16; i++) {
    const x = W * hash(i * 7 + 1);
    const y = H * hash(i * 11 + 2);
    const tw = Math.pow(Math.max(0, Math.sin(t * (0.7 + hash(i) * 1.6) + i * 2.1)), 4);
    const s = H * (0.05 + hash(i * 13) * 0.12) * (0.5 + tw + beatPulse(t) * 0.4);
    sprite(ctx, i % 4 ? A.sparkle : A.sparkleGold, x, y, s, s, (0.25 + tw) * amount, 0);
  }
}

// ---- feathers -----------------------------------------------------------------------------------

/** Feathers drifting down, tumbling and flipping (a cos squash fakes the 3D turn). */
function drift(ctx, st, t, count, alpha, speed = 1) {
  const { W, H, A } = st;
  for (let i = 0; i < count; i++) {
    const img = A.feathers[i % A.feathers.length];
    const depth = 0.4 + hash(i * 3) * 0.9;
    const fall = (hash(i * 5) + t * 0.035 * speed * depth) % 1.3;
    const x = W * (hash(i * 7) * 1.1 - 0.05) + Math.sin(t * 0.7 + i) * W * 0.05;
    const y = fall * H * 1.2 - H * 0.2;
    const h = H * 0.2 * depth;
    const w = (img.width / img.height) * h;
    ctx.save();
    ctx.globalAlpha = alpha * Math.min(1, depth);
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 0.9 + i * 1.7) * 0.9 + i);
    ctx.scale(Math.cos(t * (0.8 + hash(i) * 0.8) + i), 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

/** Feathers blown out from the centre: they fly past the camera as we rush forward. */
function featherStorm(ctx, st, t, dist, amount) {
  const { W, H, A } = st;
  if (amount <= 0.01) return;
  const F = Math.max(W, H) * 0.4;
  for (let i = 0; i < 34; i++) {
    const img = A.feathers[i % A.feathers.length];
    const ang = hash(i * 13) * TAU;
    const rad = 0.25 + hash(i * 17) * 0.9;
    const z = 1.05 - ((hash(i * 19) + dist * 0.9) % 1) * 0.98;
    const x = W / 2 + (Math.cos(ang) * rad / z) * F;
    const y = H / 2 + (Math.sin(ang) * rad * 0.7 / z) * F;
    if (x < -W * 0.3 || x > W * 1.3 || y < -H * 0.4 || y > H * 1.4) continue;
    const h = (H * 0.07) / z;
    const w = (img.width / img.height) * h;
    ctx.save();
    ctx.globalAlpha = amount * smooth(1 - z, 0, 0.25);
    ctx.translate(x, y);
    ctx.rotate(ang + Math.PI / 2 + Math.sin(t * 2 + i) * 0.6);
    ctx.scale(Math.cos(t * 3 + i), 1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

// ---- crystal shards ---------------------------------------------------------------------------------

/** Shards on a tilted orbit around (cx, cy); `front` draws only the near half. */
function orbitShards(ctx, st, t, cx, cy, R, alpha, front, squeeze = 0) {
  const { A } = st;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + t * (0.35 + hash(i) * 0.15);
    const depth = Math.sin(a);
    if ((depth > 0) !== front) continue;
    const r = R * (0.85 + hash(i * 3) * 0.35) * (1 - squeeze);
    const x = cx + Math.cos(a) * r;
    const y = cy + depth * r * 0.32 + (hash(i * 5) - 0.5) * R * 0.3 * (1 - squeeze);
    const s = R * (0.13 + hash(i * 7) * 0.12) * (0.75 + depth * 0.3);
    sprite(ctx, A.shards[i % A.shards.length], x, y, s, s, alpha * (0.6 + 0.4 * (depth + 1) / 2), t * (0.5 + hash(i)) + i, "source-over");
  }
}

/** Shards rushing toward the camera after the drop; a fresh wave on every bar. */
function shardRush(ctx, st, t, dist, amount) {
  const { W, H, A } = st;
  if (amount <= 0.01) return;
  const F = Math.max(W, H) * 0.42;
  for (let i = 0; i < 26; i++) {
    const ang = hash(i * 23) * TAU;
    const rad = 0.2 + hash(i * 29) * 0.8;
    const z = 1.05 - ((hash(i * 31) + dist * 1.2) % 1) * 0.98;
    const x = W / 2 + (Math.cos(ang) * rad / z) * F;
    const y = H / 2 + (Math.sin(ang) * rad * 0.65 / z) * F;
    if (x < -W * 0.3 || x > W * 1.3 || y < -H * 0.4 || y > H * 1.4) continue;
    const s = (H * 0.05) / z;
    sprite(ctx, A.shards[i % A.shards.length], x, y, s, s, amount * smooth(1 - z, 0, 0.2), t * (1 + hash(i)) + i, "source-over");
  }
}

// ---- threads of light ------------------------------------------------------------------------------

/** Thin glowing threads (gold and violet), as in the reference art. */
function thread(ctx, st, x0, y0, x1, y1, rgb, alpha, width) {
  if (alpha <= 0.01) return;
  const { U } = st;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  for (const [w, a] of [[width * 6, 0.12], [width * 2.5, 0.35], [width, 1]]) {
    ctx.strokeStyle = `rgba(${rgb},${a * alpha})`;
    ctx.lineWidth = w * U;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.restore();
}

// ---- the token with wings ------------------------------------------------------------------------------

function hero(ctx, st, t, cx, cy, h, { wings = 1, alpha = 1, white = 0, flap = 0 } = {}) {
  const { A } = st;
  const K = st.tokS;
  if (alpha <= 0.01) return;
  // wings: unfurl from folded (scaled down, rotated in) to open, with a slow beat
  if (wings > 0.01) {
    const wh = h * 1.75 * (0.35 + 0.65 * wings);
    const ww = (A.wingL.width / A.wingL.height) * wh;
    const beat = Math.sin(t * 1.4) * 0.06 + flap * 0.12;
    for (const side of [-1, 1]) {
      const img = side < 0 ? A.wingL : A.wingR;
      ctx.save();
      ctx.globalAlpha = alpha * Math.min(1, wings * 1.4);
      ctx.translate(cx + side * h * 0.06, cy - h * 0.12);
      ctx.rotate(side * (lerp(0.9, 0, wings) + beat));
      // shoulder sits at the inner edge of the wing image
      const sx = side < 0 ? -ww + ww * (90 / A.wingL.width) : -ww * (90 / A.wingL.width);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha *= 0.35;
      ctx.drawImage(A.wingGlow, sx, -wh * 0.55, ww, wh);
      ctx.restore();
      ctx.drawImage(img, sx, -wh * 0.55, ww, wh);
      ctx.restore();
    }
  }
  if (!K) return;
  // halo ring above the head
  ctx.save();
  ctx.globalAlpha = alpha * 0.8 * wings;
  ctx.strokeStyle = "rgba(255,225,240,0.9)";
  ctx.lineWidth = h * 0.012;
  ctx.shadowColor = "rgba(255,170,220,0.9)";
  ctx.shadowBlur = h * 0.05;
  ctx.beginPath();
  ctx.ellipse(cx, cy - h * 0.52, h * 0.2, h * 0.05, -0.12, 0, TAU);
  ctx.stroke();
  ctx.restore();
  // soft halo, the token, and an over-exposure pass
  const hs = h * K.haloScale;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.7 * alpha;
  ctx.drawImage(K.halo, cx - hs / 2, cy - hs / 2, hs, hs);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(K.base, cx - h / 2, cy - h / 2, h, h);
  if (white > 0.01) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha * clamp(white);
    ctx.drawImage(K.white, cx - h / 2, cy - h / 2, h, h);
  }
  ctx.restore();
}

// ---- the star that is not there ------------------------------------------------------------------------

/** A star outline that flickers in and out, as if it were never quite there. */
function phantomStar(ctx, st, t, cx, cy, R, alpha) {
  const { U } = st;
  if (alpha <= 0.01) return;
  const f = Math.floor(t * 18);
  const on = hash(f) > 0.25 ? 1 : 0.25;
  ctx.save();
  ctx.globalAlpha = alpha * on;
  ctx.strokeStyle = "#ffe8f6";
  ctx.lineWidth = 1.6 * U;
  ctx.setLineDash([6 * U, 7 * U]);
  ctx.lineDashOffset = -t * 30;
  ctx.shadowColor = "rgba(255,170,230,1)";
  ctx.shadowBlur = 12 * U;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU - Math.PI / 2;
    const r = i % 2 ? R * 0.16 : R;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.4, 0, TAU);
  ctx.globalAlpha *= 0.5;
  ctx.stroke();
  ctx.restore();
}

// ---- composite -----------------------------------------------------------------------------------

function camera(ctx, st, t) {
  const { W, H, U } = st;
  const b = barPulse(t, 0.18);
  const f = Math.floor(t * 60);
  const shake = (b * 14 + beatPulse(t, 0.06) * 4) * U * (t < T.text ? 1 : 0.4);
  const zoom = 1.06 + 0.02 * Math.sin(t * 0.3) + b * 0.03;
  ctx.translate(W / 2 + Math.sin(t * 0.37) * W * 0.008 + (hash(f) - 0.5) * shake, H / 2 + Math.sin(t * 0.53) * H * 0.012 + (hash(f + 9) - 0.5) * shake);
  ctx.rotate(Math.sin(t * 0.21) * 0.02 + (barNo(t) % 2 ? 1 : -1) * b * 0.012);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H / 2);
}

export function render(ctx, st, t) {
  const { W, H, U, A } = st;
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  if (t < T.open) {
    ctx.restore();
    return;
  }
  const dist = travelled(t);
  const fadeIn = smooth(t, T.open, T.open + 2.0);
  const brk = smooth(t, T.brk, T.hush) * (1 - smooth(t, DROP - 0.02, DROP));
  const hush = t >= T.hush && t < DROP;
  const after = t >= DROP;
  const bp = beatPulse(t);
  const bars = barPulse(t);
  const cx = W / 2;
  const cy = H * 0.52;

  ctx.save();
  camera(ctx, st, t);
  ctx.globalAlpha = fadeIn;
  background(ctx, st, t, dist);
  ctx.globalAlpha = 1;
  if (hush) {
    ctx.fillStyle = `rgba(0,0,0,${smooth(t, T.hush, T.hush + 0.1) * 0.92})`;
    ctx.fillRect(-W, -H, W * 3, H * 3);
  }

  // the moon rises behind everything and swells with the music
  const moonA = smooth(t, T.moon, T.moon + 3) * fadeIn * (1 - 0.8 * brk) * (hush ? 0.15 : 1);
  if (moonA > 0.01) {
    const rise = easeOutCubic(prog(t, T.moon, T.wake + 2));
    const mr = H * (0.62 + rise * 0.18 + bars * 0.03 + (after ? 0.08 : 0));
    const my = lerp(H * 0.85, H * 0.3, rise);
    sprite(ctx, A.glowP, cx, my, mr * 2.2, mr * 2.2, moonA * 0.35);
    sprite(ctx, A.moon, cx, my, mr, mr, moonA, t * 0.01, "source-over");
  }

  twinkles(ctx, st, t, fadeIn * (1 - brk * 0.8) * (hush ? 0 : 1) + nearPulse(t, PULSES, 0.4) * 0.6);

  // threads of light: a gold one dropping through the frame, a violet one rising
  const thA = smooth(t, T.wake, T.wake + 1.5) * (1 - brk) * (hush ? 0 : 1) * (t < T.text ? 1 : 1 - smooth(t, T.text, T.text + 1));
  if (thA > 0) {
    const gx = cx + W * 0.06 + Math.sin(t * 0.4) * W * 0.02;
    thread(ctx, st, gx, -H * 0.1, gx - W * 0.015, cy + H * 0.05, "255,236,80", thA * (0.8 + bp), 2.2);
    sprite(ctx, A.glowG, gx - W * 0.015, cy + H * 0.05, H * 0.08, H * 0.08, thA);
    const vx = cx + W * 0.03 + Math.sin(t * 0.5 + 1) * W * 0.02;
    thread(ctx, st, vx, H * 1.1, vx + W * 0.01, cy + H * 0.3, "190,80,255", thA * 0.9, 2.6);
  }

  // prologue feathers falling; after the drop they fly past
  const driftA = fadeIn * (t < T.wake ? smooth(t, 1.5, 4) : 1) * (1 - brk) * (hush ? 0 : 1) * (after ? 0.35 : 1);
  drift(ctx, st, t, t < T.wake ? 8 : 14, driftA, after ? 2.2 : 1);
  featherStorm(ctx, st, t, dist, after ? 1 - smooth(t, T.out - 0.4, T.out) : 0);
  shardRush(ctx, st, t, dist, after && t < T.text ? 1 : after ? 1 - smooth(t, T.text, T.text + 1.5) : 0);

  // the token and its orbit
  const wake = smooth(t, T.wake, T.wake + 1.2);
  if (wake > 0.01 && !hush) {
    const rise = t >= T.text ? easeInCubic(prog(t, T.text + 0.4, T.out + 0.6)) : 0;
    const ty = cy + Math.sin(t * 0.9) * H * 0.012 - rise * H * 0.7 - brk * H * 0.02;
    const th = H * 0.32 * (1 + bars * 0.04 + (after ? 0.08 : 0)) * (1 - brk * 0.25);
    const wings = easeOutCubic(prog(t, T.wings, T.wings + 2.5)) * (1 - brk * 0.6) + (after ? brk : 0);
    const orbit = smooth(t, T.shards, T.shards + 1.2) * (t < T.text ? 1 : 1 - smooth(t, T.text, T.text + 1));
    const squeeze = brk;
    orbitShards(ctx, st, t, cx, ty, th * 1.5, orbit, false, squeeze);
    hero(ctx, st, t, cx, ty, th, {
      wings: Math.max(0, wings),
      alpha: wake,
      white: (1 - smooth(t, T.wake, T.wake + 1.5)) * 1.2 + Math.exp(-Math.max(0, t - DROP) / 0.3) * (after ? 1 : 0) + bp * 0.15 + rise * 0.8,
      flap: bars,
    });
    orbitShards(ctx, st, t, cx, ty, th * 1.5, orbit, true, squeeze);
    // the light it rises toward at the end
    if (t >= T.text) {
      const la = smooth(t, T.text, T.text + 1.5);
      sprite(ctx, A.glowW, cx, -H * 0.05, W * 1.2 * la, H * 0.9 * la, la * 0.75);
      sprite(ctx, A.sparkle, cx, H * 0.02, H * 0.9 * la, H * 0.9 * la, la, t * 0.1);
    }
  }

  // the hush: only a star that is not there
  if (hush) phantomStar(ctx, st, t, cx, cy, H * 0.2, smooth(t, T.hush, T.hush + 0.12));
  // drawing in before the drop: a bright point gathers at the centre
  if (brk > 0 && !hush) sprite(ctx, A.sparkle, cx, cy, H * (0.2 + brk * 0.7), H * (0.2 + brk * 0.7), brk, t * 0.4);
  ctx.restore();

  // shockwave and flash on the drop, light bursts on each bar after
  if (after) {
    const d = t - DROP;
    if (d < 1.2) {
      const p = easeOutCubic(d / 1.2);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(255,210,240,${1 - p})`;
      ctx.lineWidth = (10 - 8 * p) * U;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.hypot(W, H) * 0.6 * p, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    const flash = Math.exp(-d / 0.35);
    if (flash > 0.01) {
      ctx.fillStyle = `rgba(255,240,250,${flash})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (t < T.text) sprite(ctx, A.glowP, cx, cy, W * 1.3, W * 1.3, bars * 0.25);
  }

  // the token's name after the drop
  if (st.name && t >= T.name && t < T.nameOut + 0.6) {
    const a = smooth(t, T.name, T.name + 0.5) * (1 - smooth(t, T.nameOut, T.nameOut + 0.6));
    text(ctx, st.name.toUpperCase(), cx, H * 0.88, H * 0.05, { font: CAPS, weight: 600, spacing: 0.35, alpha: a });
  }

  // prologue line
  if (t >= T.line && t < T.lineOut + 0.8) {
    const a = smooth(t, T.line, T.line + 1) * (1 - smooth(t, T.lineOut, T.lineOut + 0.8));
    text(ctx, "a star that does not exist", cx, H * 0.5, H * 0.045, { italic: true, alpha: a, spacing: 0.08 });
  }

  // the closing words
  if (t >= T.text) {
    const la = smooth(t, T.text, T.text + 0.25) * (1 - smooth(t, T.out + 0.2, T.end - 0.1));
    const latin = "Ascende verso lumen astria nonexa";
    let size = H * 0.075;
    ctx.save();
    ctx.font = `600 ${size}px ${CAPS}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${0.06 * size}px`;
    const w = ctx.measureText(latin).width;
    ctx.restore();
    if (w > W * 0.9) size *= (W * 0.9) / w;
    // letters arrive one by one, each with a little flare
    const n = Math.floor(clamp(prog(t, T.text, T.text + 1.4)) * latin.length);
    const shown = latin.slice(0, n);
    // a dark band so the words read over the light
    const band = ctx.createLinearGradient(0, H * 0.6, 0, H * 0.86);
    band.addColorStop(0, "rgba(10,0,8,0)");
    band.addColorStop(0.5, `rgba(10,0,8,${0.55 * la})`);
    band.addColorStop(1, "rgba(10,0,8,0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, H * 0.6, W, H * 0.26);
    text(ctx, `“${shown}${n === latin.length ? "”" : ""}`, cx, H * 0.7, size, { font: CAPS, weight: 600, spacing: 0.06, alpha: la });
    const sa = smooth(t, T.text + 1.4, T.text + 2.2) * la;
    text(ctx, "Journey toward the light of stars that were never meant to be", cx, H * 0.79, size * 0.45, { italic: true, alpha: sa, spacing: 0.04, glow: "rgba(255,200,240,0.7)" });
    if (n > 0 && n < latin.length) {
      ctx.save();
      ctx.font = `600 ${size}px ${CAPS}`;
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${0.06 * size}px`;
      const full = ctx.measureText(`“${latin}”`).width;
      const part = ctx.measureText(`“${shown}`).width;
      ctx.restore();
      sprite(ctx, A.sparkle, cx - full / 2 + part, H * 0.7, H * 0.16, H * 0.16, la, t * 2);
    }
  }

  // white bloom then black
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
  ctx.restore();
}
