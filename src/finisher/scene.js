// Slash Finisher: token A cuts token B to pieces, leaps out and lands.
// Like the crystal cutscene, every frame is a pure function of time.
import { TAU, clamp, easeInCubic, easeOutCubic, easeOutExpo, hash, lerp, makeCanvas, prog, rng, smooth } from "../cutscene/util.js";

export const T = {
  lock: 1.35, flash: 2.5, rush: 2.72, last: 5.35, split: 5.72,
  leap: 6.55, land: 7.25, card: 8.05, exit: 11.0, end: 11.5,
};

const GOLD = "#ffc94d";
const INK = "#09090b";
const PAPER = "#f7f3ec";
const HIT_COUNT = 24;

/** Strikes accelerate from a readable rhythm into a blur. */
export const HITS = (() => {
  const gaps = [];
  for (let i = 0, g = 1; i < HIT_COUNT - 1; i++, g = Math.max(0.3, g * 0.93)) gaps.push(g);
  const scale = (T.last - 0.06 - T.rush) / gaps.reduce((a, b) => a + b, 0);
  const out = [];
  let at = T.rush;
  for (let i = 0; i < HIT_COUNT; i++) {
    const a = (i * 2.399963 + hash(i + 7) * 0.7) % TAU;
    out.push({ t: at, a, seed: i + 11 });
    at += (gaps[i] || 0) * scale;
  }
  return out;
})();

// ---- sprites ---------------------------------------------------------------
function tinted(src, color) {
  const c = makeCanvas(src.width, src.height);
  const x = c.getContext("2d");
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

export function buildTokenSprite(source, accent) {
  const S = 720;
  const base = makeCanvas(S, S);
  const b = base.getContext("2d");
  const sw = source.naturalWidth || source.videoWidth || source.width || S;
  const sh = source.naturalHeight || source.videoHeight || source.height || S;
  const fit = (S * 0.86) / Math.max(sw, sh);
  b.imageSmoothingQuality = "high";
  b.drawImage(source, (S - sw * fit) / 2, (S - sh * fit) / 2, sw * fit, sh * fit);

  const white = tinted(base, "#fff");
  const black = tinted(base, INK);
  const red = tinted(base, accent);
  const cyan = tinted(base, "#22e6ff");
  const sticker = makeCanvas(S, S);
  const s = sticker.getContext("2d");
  s.globalAlpha = 0.85;
  s.drawImage(black, 13, 15);
  s.globalAlpha = 1;
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU;
    s.drawImage(white, Math.cos(a) * 8, Math.sin(a) * 8);
  }
  s.drawImage(base, 0, 0);
  return { base, white, black, red, cyan, sticker };
}

let dotCache = null;
let grainCache = null;
function dots(ctx, color) {
  dotCache ??= {};
  if (!dotCache[color]) {
    const c = makeCanvas(12, 12);
    const x = c.getContext("2d");
    x.fillStyle = color;
    x.beginPath();
    x.arc(6, 6, 3, 0, TAU);
    x.fill();
    dotCache[color] = c;
  }
  return ctx.createPattern(dotCache[color], "repeat");
}

function grain(ctx) {
  if (!grainCache) {
    const c = makeCanvas(160, 160);
    const x = c.getContext("2d");
    const r = rng(9);
    for (let i = 0; i < 2600; i++) {
      x.fillStyle = r() > 0.5 ? "rgba(255,255,255,.5)" : "rgba(0,0,0,.6)";
      x.fillRect(r() * 160, r() * 160, 1, 1);
    }
    grainCache = c;
  }
  return ctx.createPattern(grainCache, "repeat");
}

// ---- drawing primitives ----------------------------------------------------
function sprite(ctx, img, x, y, size, { rot = 0, flip = 1, sx = 1, sy = 1, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(flip * sx, sy);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
}

function speedLines(ctx, W, H, cx, cy, color, count, seed, inner, alpha = 1) {
  const R = Math.hypot(W, H);
  const r = rng(seed);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < count; i++) {
    const a = r() * TAU;
    const w = 0.004 + r() * 0.018;
    const near = inner * (0.82 + r() * 0.7);
    ctx.moveTo(cx + Math.cos(a) * near, cy + Math.sin(a) * near);
    ctx.lineTo(cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R);
    ctx.lineTo(cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
}

function crescent(ctx, len, belly, thick) {
  ctx.beginPath();
  ctx.moveTo(-len, 0);
  ctx.quadraticCurveTo(0, -belly - thick, len, 0);
  ctx.quadraticCurveTo(0, -belly + thick, -len, 0);
  ctx.closePath();
}

/** A blade arc: grows along its length, then thins out. */
function slash(ctx, x, y, angle, len, p, accent, flip = 1) {
  if (p <= 0 || p >= 1) return;
  const grow = easeOutExpo(clamp(p / 0.28));
  const fade = 1 - smooth(p, 0.35, 1);
  const L = len * grow;
  const belly = len * 0.17;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(1, flip);
  ctx.globalAlpha = fade;
  ctx.fillStyle = INK;
  crescent(ctx, L * 1.05, belly, len * 0.075 * fade + 2);
  ctx.fill();
  ctx.fillStyle = accent;
  crescent(ctx, L * 1.02, belly, len * 0.052 * fade + 1.5);
  ctx.fill();
  ctx.fillStyle = GOLD;
  crescent(ctx, L * 0.98, belly, len * 0.027 * fade + 1);
  ctx.fill();
  ctx.fillStyle = "#fff";
  crescent(ctx, L * 0.94, belly, len * 0.013 * fade + 0.7);
  ctx.fill();
  ctx.restore();
}

function burst(ctx, x, y, radius, rot, color, spikes, seed) {
  const r = rng(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * TAU;
    const d = radius * (i % 2 ? 0.34 + r() * 0.12 : 0.72 + r() * 0.5);
    ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * d, Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function star4(ctx, x, y, r, rot, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const d = i % 2 ? r * 0.13 : r;
    ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * d, Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function sparks(ctx, x, y, dt, life, U, seed, count, baseAngle) {
  if (dt < 0 || dt > life) return;
  const p = dt / life;
  const r = rng(seed);
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const a = baseAngle + (r() - 0.5) * 2.5 + (r() > 0.5 ? Math.PI : 0);
    const speed = (150 + r() * 430) * U;
    const d = speed * easeOutCubic(p) * life * 2.2;
    const tail = (16 + r() * 38) * U * (1 - p);
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d + 150 * U * p * p;
    ctx.strokeStyle = i % 3 ? GOLD : "#fff";
    ctx.globalAlpha = 1 - p;
    ctx.lineWidth = (1 + r() * 2.6) * U;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - Math.cos(a) * tail, py - Math.sin(a) * tail);
    ctx.stroke();
  }
  ctx.restore();
}

function inkBlot(ctx, x, y, size, seed, color, p) {
  const r = rng(seed);
  const s = size * easeOutExpo(clamp(p));
  ctx.fillStyle = color;
  ctx.beginPath();
  const n = 26;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const d = s * (i % 2 ? 0.36 + r() * 0.17 : 0.58 + r() * 0.5);
    ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 18; i++) {
    const a = r() * TAU;
    const d = s * (0.75 + r() * 0.75);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, s * (0.012 + r() * 0.05), 0, TAU);
    ctx.fill();
  }
}

function fillPoly(ctx, W, H, color, pts, dx = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  pts.forEach(([x, y], i) => ctx[i ? "lineTo" : "moveTo"](x * W + dx, y * H));
  ctx.closePath();
  ctx.fill();
}

function halftone(ctx, W, H, color, alpha, fromLeft = true) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = dots(ctx, color);
  ctx.beginPath();
  if (fromLeft) {
    ctx.moveTo(-40, -40); ctx.lineTo(W * 0.62, -40); ctx.lineTo(W * 0.2, H + 40); ctx.lineTo(-40, H + 40);
  } else {
    ctx.moveTo(W + 40, -40); ctx.lineTo(W * 0.5, -40); ctx.lineTo(W * 0.82, H + 40); ctx.lineTo(W + 40, H + 40);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function chroma(ctx, tok, x, y, size, amount, opts = {}) {
  if (amount > 0.3) {
    sprite(ctx, tok.cyan, x - amount, y, size, { ...opts, alpha: 0.75 });
    sprite(ctx, tok.red, x + amount, y, size, { ...opts, alpha: 0.85 });
  }
  sprite(ctx, tok.sticker, x, y, size, opts);
}

// ---- shots -----------------------------------------------------------------
function shotOpen(ctx, st, t) {
  const { W, H, U, A, B, accent } = st;
  ctx.fillStyle = "#0b0204";
  ctx.fillRect(-60, -60, W + 120, H + 120);
  const on = smooth(t, 0.28, 0.85);
  const g = ctx.createRadialGradient(W * 0.62, H * 0.42, 0, W * 0.62, H * 0.42, Math.hypot(W, H) * 0.62);
  g.addColorStop(0, accent);
  g.addColorStop(0.55, "#4a050b");
  g.addColorStop(1, "#120204");
  ctx.save();
  ctx.globalAlpha = on;
  ctx.fillStyle = g;
  ctx.fillRect(-60, -60, W + 120, H + 120);
  ctx.restore();
  halftone(ctx, W, H, "#000", 0.2 * on);

  const drift = easeOutCubic(prog(t, 0, T.flash));
  const size = Math.max(H * 1.28, Math.min(W, H) * 1.3);
  sprite(ctx, B.black, W * lerp(0.74, 0.63, drift), H * 0.56, size * 0.82, { alpha: 0.72 * on });
  sprite(ctx, A.black, W * lerp(-0.08, 0.16, drift), H * lerp(0.82, 0.68, drift), size * 1.12, { alpha: on });

  [[0.3, 0.26, 0.75], [0.74, 0.17, 1.03], [0.48, 0.68, 1.3], [0.88, 0.58, 1.6]].forEach(([x, y, at], i) => {
    const p = prog(t, at, at + 0.55);
    if (p <= 0 || p >= 1) return;
    ctx.save();
    ctx.globalAlpha = Math.sin(p * Math.PI);
    star4(ctx, W * x, H * y, 62 * U * Math.sin(p * Math.PI), p * 1.4 + i, GOLD);
    ctx.restore();
  });

  if (t > T.lock) {
    const p = easeOutExpo(prog(t, T.lock, T.lock + 0.5));
    const cx = W * 0.63;
    const cy = H * 0.47;
    const R = Math.min(W, H) * 0.3;
    const spin = (t - T.lock) * 0.9;
    ctx.save();
    ctx.strokeStyle = GOLD;
    ctx.fillStyle = GOLD;
    ctx.lineWidth = 2.4 * U;
    ctx.beginPath(); ctx.arc(cx, cy, R * (1.5 - 0.5 * p), spin, spin + TAU * p); ctx.stroke();
    ctx.setLineDash([16 * U, 9 * U]);
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.68 * (1.7 - 0.7 * p), -spin * 1.6, -spin * 1.6 + TAU * p); ctx.stroke();
    ctx.setLineDash([]);
    const reach = Math.hypot(W, H) * p;
    ctx.beginPath();
    for (const a of [0.42, 2.72, 3.56, 5.58]) {
      ctx.moveTo(cx + Math.cos(a) * R * 0.2, cy + Math.sin(a) * R * 0.2);
      ctx.lineTo(cx + Math.cos(a) * reach, cy + Math.sin(a) * reach);
    }
    ctx.moveTo(cx - R * 1.25 * p, cy); ctx.lineTo(cx + R * 1.25 * p, cy);
    ctx.moveTo(cx, cy - R * 1.25 * p); ctx.lineTo(cx, cy + R * 1.25 * p);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = spin * -1.2 + (i / 4) * TAU;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * R * 1.08, cy + Math.sin(a) * R * 1.08);
      ctx.rotate(a + Math.PI);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-20 * U, -10 * U); ctx.lineTo(-20 * U, 10 * U); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    star4(ctx, cx, cy, 34 * U * (1 + 0.2 * Math.sin(t * 22)), spin, "#fff");
    ctx.restore();
  }

  // The picture opens from a single bright line.
  const open = easeOutExpo(prog(t, 0.2, 0.62));
  const bar = (H / 2) * (1 - open);
  ctx.fillStyle = "#000";
  ctx.fillRect(-60, -60, W + 120, bar + 60);
  ctx.fillRect(-60, H - bar, W + 120, bar + 60);
  if (open < 1) {
    ctx.fillStyle = "#fff";
    const w = W * easeOutExpo(prog(t, 0.02, 0.22));
    ctx.fillRect((W - w) / 2, H / 2 - bar * 0 - 1.5 * U, w, 3 * U * (1 - open));
  }
}

function shotRush(ctx, st, t) {
  const { W, H, U, A, B, accent } = st;
  const cx = W / 2;
  const cy = H * 0.52;
  const base = Math.min(H * 0.86, W * 0.62);
  let idx = 0;
  for (let i = 0; i < HITS.length; i++) if (HITS[i].t <= t) idx = i;
  const hit = HITS[idx];
  const dt = t - hit.t;

  // Background changes slowly on purpose: no rapid full-screen flashing.
  const dark = Math.floor((t - T.rush) / 0.92) % 2 === 1;
  ctx.fillStyle = dark ? "#16040a" : accent;
  ctx.fillRect(-60, -60, W + 120, H + 120);
  speedLines(ctx, W, H, cx, cy, dark ? accent : INK, 54, Math.floor(t * 20) + 3, base * 0.46, dark ? 0.55 : 0.8);
  halftone(ctx, W, H, dark ? accent : "#000", 0.24, idx % 2 === 0);
  fillPoly(ctx, W, H, INK, [[-0.05, 0.84], [0.32, 0.76], [0.66, 0.86], [1.05, 0.78], [1.05, 1.05], [-0.05, 1.05]]);

  // Ink builds up with every strike.
  for (let i = 0; i <= idx; i++) {
    const h = HITS[i];
    if (i % 2) continue;
    const r = rng(h.seed);
    const d = base * (0.25 + r() * 0.42);
    const x = cx + Math.cos(h.a + 1.2) * d * 1.25;
    const y = cy + Math.sin(h.a + 1.2) * d * 0.8;
    ctx.save();
    ctx.globalAlpha = 0.9;
    inkBlot(ctx, x, y, base * (0.09 + r() * 0.1), h.seed, dark ? "#7d0711" : "#6f0009", (t - h.t) / 0.1);
    ctx.restore();
  }

  const dirX = Math.cos(hit.a);
  const dirY = Math.sin(hit.a) * 0.55;
  const recoil = Math.exp(-dt / 0.055) * 30 * U;
  const wob = Math.sin(dt * 70) * Math.exp(-dt / 0.08) * 0.09;
  const bx = cx + dirX * recoil;
  const by = cy + dirY * recoil;
  chroma(ctx, B, bx, by, base, Math.exp(-dt / 0.05) * 13 * U, { rot: wob, sx: 1 + Math.exp(-dt / 0.05) * 0.06, sy: 1 - Math.exp(-dt / 0.05) * 0.05 });
  if (dt < 0.05) sprite(ctx, B.white, bx, by, base, { rot: wob, alpha: 1 - dt / 0.05 });

  // The attacker dashes straight through the target and leaves afterimages.
  const R = Math.hypot(W, H) * 0.34;
  const dash = easeOutExpo(clamp(dt / 0.075));
  const at = (p) => [cx + dirX * lerp(-R, R, p), cy + dirY * lerp(-R, R, p)];
  const flip = dirX >= 0 ? 1 : -1;
  const asz = base * 0.74;
  const lean = flip * 0.3;
  for (let k = 6; k >= 1; k--) {
    const [x, y] = at(clamp(dash - k * 0.1));
    sprite(ctx, k % 2 ? A.red : A.black, x, y, asz, { flip, rot: lean, sx: 1.12, sy: 0.94, alpha: (0.5 * (7 - k)) / 7 });
  }
  const [ax, ay] = at(dash);
  sprite(ctx, A.sticker, ax, ay, asz, { flip, rot: lean * (1 - smooth(dt, 0.04, 0.2) * 0.65) });

  const life = 0.24;
  for (let i = Math.max(0, idx - 3); i <= idx; i++) {
    const h = HITS[i];
    const d = t - h.t;
    const p = d / life;
    if (p < 1) {
      const pop = easeOutExpo(clamp(p / 0.35));
      ctx.save();
      ctx.globalAlpha = 1 - smooth(p, 0.3, 0.8);
      burst(ctx, cx, cy, base * 0.3 * pop, h.a, i % 2 ? "#fff" : GOLD, 11, h.seed);
      burst(ctx, cx, cy, base * 0.18 * pop, h.a + 0.3, INK, 9, h.seed + 2);
      ctx.restore();
    }
    slash(ctx, cx, cy, h.a, base * 0.92, p, accent, i % 2 ? 1 : -1);
    sparks(ctx, cx, cy, d, 0.42, U, h.seed * 3, 13, h.a);
  }
  for (let i = Math.max(0, idx - 5); i < idx; i++) sparks(ctx, cx, cy, t - HITS[i].t, 0.42, U, HITS[i].seed * 3, 13, HITS[i].a);

  // Combo counter
  const scale = 1 + Math.exp(-dt / 0.05) * 0.55;
  ctx.save();
  ctx.translate(W - 26 * U, 26 * U);
  ctx.rotate(0.06);
  ctx.scale(scale, scale);
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.font = `900 ${82 * U}px Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif`;
  ctx.lineJoin = "round";
  ctx.lineWidth = 12 * U;
  ctx.strokeStyle = INK;
  ctx.strokeText(String(idx + 1), -96 * U, 0);
  ctx.fillStyle = "#fff";
  ctx.fillText(String(idx + 1), -96 * U, 0);
  ctx.font = `900 ${34 * U}px Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif`;
  ctx.lineWidth = 8 * U;
  ctx.strokeText("HITS", 0, 40 * U);
  ctx.fillStyle = GOLD;
  ctx.fillText("HITS", 0, 40 * U);
  ctx.restore();
}

function clipHalf(ctx, W, H, cx, cy, angle, side) {
  const R = Math.hypot(W, H) * 1.5;
  const nx = Math.cos(angle + Math.PI / 2) * side;
  const ny = Math.sin(angle + Math.PI / 2) * side;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  ctx.beginPath();
  ctx.moveTo(cx - ux * R, cy - uy * R);
  ctx.lineTo(cx + ux * R, cy + uy * R);
  ctx.lineTo(cx + ux * R + nx * R, cy + uy * R + ny * R);
  ctx.lineTo(cx - ux * R + nx * R, cy - uy * R + ny * R);
  ctx.closePath();
  ctx.clip();
}

function shotFinalCut(ctx, st, t) {
  const { W, H, U, A, B, accent } = st;
  const cx = W / 2;
  const cy = H * 0.52;
  const base = Math.min(H * 0.86, W * 0.62);
  const angle = -0.62;

  // Negative-print freeze frame
  ctx.fillStyle = PAPER;
  ctx.fillRect(-60, -60, W + 120, H + 120);
  speedLines(ctx, W, H, cx, cy, INK, 64, 77, base * 0.6, 0.95);
  halftone(ctx, W, H, INK, 0.18);

  const sep = easeInCubic(prog(t, T.split, T.leap)) * base * 0.62;
  if (t < T.split) {
    sprite(ctx, B.black, cx, cy, base, { rot: Math.sin((t - T.last) * 90) * 0.012 });
  } else {
    for (const side of [-1, 1]) {
      ctx.save();
      const nx = Math.cos(angle + Math.PI / 2) * side;
      const ny = Math.sin(angle + Math.PI / 2) * side;
      ctx.translate(nx * sep + Math.cos(angle) * sep * 0.35 * side, ny * sep + Math.sin(angle) * sep * 0.35 * side);
      clipHalf(ctx, W, H, cx, cy, angle, side);
      sprite(ctx, B.black, cx, cy, base, { alpha: 1 - smooth(t, T.leap - 0.3, T.leap) * 0.35 });
      ctx.restore();
    }
    const p = prog(t, T.split, T.split + 0.42);
    inkBlot(ctx, cx, cy, base * 0.62, 91, accent, p / 0.3);
    sparks(ctx, cx, cy, t - T.split, 0.8, U * 1.6, 501, 56, angle);
  }

  const slide = easeOutExpo(prog(t, T.last, T.last + 0.16));
  const R = Math.hypot(W, H) * 0.42;
  const ax = cx + Math.cos(angle) * lerp(-R, R * 0.92, slide);
  const ay = cy + Math.sin(angle) * lerp(-R, R * 0.92, slide);
  for (let k = 8; k >= 1; k--) {
    const q = clamp(slide - k * 0.07);
    sprite(ctx, A.red, cx + Math.cos(angle) * lerp(-R, R * 0.92, q), cy + Math.sin(angle) * lerp(-R, R * 0.92, q), base * 0.72, { rot: 0.28, sx: 1.16, alpha: (0.55 * (9 - k)) / 9 });
  }
  sprite(ctx, A.sticker, ax, ay, base * 0.72, { rot: 0.28 * (1 - smooth(t, T.last + 0.12, T.split) * 0.7) });

  // The cut line itself stays on screen, then blooms.
  const line = easeOutExpo(prog(t, T.last, T.last + 0.12));
  const thick = (T.split <= t ? lerp(16, 0, prog(t, T.split, T.split + 0.45)) : 5) * U;
  const L = Math.hypot(W, H) * line;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  if (thick > 0.2) {
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(0, -thick * 1.9); ctx.lineTo(L, 0); ctx.lineTo(0, thick * 1.9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(0, -thick * 0.8); ctx.lineTo(L, 0); ctx.lineTo(0, thick * 0.8); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function ground(W, H) {
  return [[-0.05, 0.72], [0.2, 0.67], [0.42, 0.74], [0.6, 0.62], [0.78, 0.66], [1.05, 0.8], [1.05, 1.05], [-0.05, 1.05]];
}

function shotLeap(ctx, st, t) {
  const { W, H, U, A, B, accent } = st;
  ctx.fillStyle = accent;
  ctx.fillRect(-60, -60, W + 120, H + 120);
  const sunX = W * 0.62;
  const sunY = H * 0.44;
  const sun = Math.min(W, H) * 0.42;
  ctx.save();
  ctx.translate(sunX, sunY);
  ctx.rotate((t - T.leap) * 0.16);
  ctx.fillStyle = "rgba(0,0,0,.16)";
  ctx.beginPath();
  const R = Math.hypot(W, H);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    ctx.lineTo(Math.cos(a + 0.16) * R, Math.sin(a + 0.16) * R);
    ctx.closePath();
  }
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(255,240,226,.92)";
  ctx.beginPath();
  ctx.arc(sunX, sunY, sun * easeOutExpo(prog(t, T.leap, T.leap + 0.35)), 0, TAU);
  ctx.fill();
  halftone(ctx, W, H, "#000", 0.2, false);
  fillPoly(ctx, W, H, INK, ground(W, H));

  // The fallen target, far behind on the ridge.
  sprite(ctx, B.black, W * 0.18, H * 0.665, H * 0.34, { rot: 1.46 });

  const landed = t >= T.land;
  const groundY = H * 0.64;
  const size = Math.min(H * 0.92, W * 0.74);
  const standY = groundY - size * 0.36;
  if (!landed) {
    const p = prog(t, T.leap, T.land);
    const x = lerp(W * 0.05, W * 0.62, p);
    const arc = Math.sin(p * Math.PI) * H * 0.62;
    const y = standY + lerp(H * 0.62, 0, p) - arc;
    const rot = lerp(-TAU * 1.25, 0, easeOutCubic(p));
    const step = 0.05;
    for (let k = 7; k >= 1; k--) {
      const q = clamp(p - k * step);
      const qx = lerp(W * 0.05, W * 0.62, q);
      const qy = standY + lerp(H * 0.62, 0, q) - Math.sin(q * Math.PI) * H * 0.62;
      sprite(ctx, k % 2 ? A.white : A.black, qx, qy, size * 0.8, { rot: lerp(-TAU * 1.25, 0, easeOutCubic(q)), alpha: (0.42 * (8 - k)) / 8 });
    }
    sprite(ctx, A.black, x, y, size * 0.8, { rot });
  } else {
    const d = t - T.land;
    const squash = Math.exp(-d / 0.07) * Math.cos(d * 34) * 0.26;
    const x = W * 0.62;
    const yy = groundY + size * 0.14;
    // Rim light appears as the figure rises out of the landing crouch.
    ctx.save();
    ctx.translate(x, yy);
    ctx.scale(1 + squash, 1 - squash);
    ctx.translate(-x, -yy);
    const rim = smooth(d, 0.2, 0.62);
    if (rim > 0) sprite(ctx, A.white, x + 6 * U, standY - 3 * U, size, { alpha: rim });
    sprite(ctx, A.black, x, standY, size);
    ctx.restore();

    // Landing shockwave and dust
    const p = prog(d, 0, 0.6);
    if (p < 1) {
      ctx.save();
      ctx.translate(x, groundY + size * 0.13);
      ctx.scale(1, 0.2);
      ctx.strokeStyle = "#fff";
      ctx.globalAlpha = 1 - p;
      ctx.lineWidth = 16 * U * (1 - p);
      ctx.beginPath();
      ctx.arc(0, 0, W * 0.5 * easeOutExpo(p), 0, TAU);
      ctx.stroke();
      ctx.restore();
      const r = rng(303);
      for (let i = 0; i < 30; i++) {
        const dir = r() > 0.5 ? 1 : -1;
        const px = x + dir * (40 + r() * W * 0.34) * easeOutCubic(p) * U ** 0;
        const py = groundY + size * 0.13 - r() * 90 * U * Math.sin(p * Math.PI);
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = i % 3 ? INK : PAPER;
        ctx.beginPath();
        ctx.arc(px, py, (3 + r() * 11) * U * (1 - p * 0.6), 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

function shotCard(ctx, st, t) {
  const { W, H, U, A, accent } = st;
  const d = t - T.card;
  ctx.fillStyle = PAPER;
  ctx.fillRect(-60, -60, W + 120, H + 120);
  halftone(ctx, W, H, INK, 0.22, false);

  const left = easeOutExpo(clamp(d / 0.24));
  const right = easeOutExpo(clamp((d - 0.03) / 0.24));
  fillPoly(ctx, W, H, accent, [[-0.05, -0.05], [1.05, -0.05], [1.05, 0.24], [0.67, 0.38], [0.47, 0.21], [-0.05, 0.6]], (1 - right) * W * 1.1);
  fillPoly(ctx, W, H, INK, [[-0.05, 0.68], [0.52, 0.53], [1.05, 0.9], [1.05, 1.05], [-0.05, 1.05]], -(1 - left) * W * 1.1);
  halftone(ctx, W, H, "#000", 0.2, true);

  const m = Math.min(W, H);
  const sp = clamp((d - 0.06) / 0.28);
  if (sp > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(sp * 4);
    inkBlot(ctx, W * 0.27, H * 0.56, m * 0.56, 41, accent, sp);
    ctx.restore();
  }
  const star = easeOutExpo(clamp((d - 0.04) / 0.36));
  if (star > 0) {
    ctx.save();
    ctx.translate(W * 0.22, H * 0.32);
    ctx.rotate(lerp(-2.1, -0.14, star));
    ctx.scale(star, star);
    const r = m * 0.3;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * TAU;
      const q = i % 2 ? r * 0.4 : r;
      ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * q, Math.sin(a) * q);
    }
    ctx.closePath();
    ctx.fillStyle = "#77767b";
    ctx.fill();
    ctx.clip();
    ctx.strokeStyle = "#a3a2a7";
    ctx.lineWidth = 3 * U;
    ctx.beginPath();
    for (let i = -24; i < 24; i++) {
      ctx.moveTo(i * 10 * U, -r);
      ctx.lineTo(i * 10 * U + r, r);
    }
    ctx.stroke();
    ctx.restore();
  }

  const slam = clamp((d - 0.1) / 0.3);
  if (slam > 0) {
    const e = easeOutExpo(slam);
    const size = Math.min(H * 1.1, W * 0.78);
    const breathe = 1 + smooth(d, 0.42, 3) * 0.025;
    const x = lerp(W * 1.04, W * 0.66, e);
    const y = H * 0.53;
    const scale = lerp(1.5, 1, e) * breathe;
    sprite(ctx, A.sticker, x, y, size * scale, { rot: lerp(0.15, 0, e), alpha: clamp(slam * 3) });
  }

  drawCaption(ctx, st, d);

  const n = clamp((d - 0.72) / 0.24);
  if (n > 0 && st.name) {
    ctx.save();
    const fs = clamp(30 * U, 16, 38);
    ctx.font = `italic 900 ${fs}px "Arial Black", "Leelawadee UI", Tahoma, sans-serif`;
    const tw = ctx.measureText(st.name).width;
    const px = W - tw - 42 * U + (1 - easeOutCubic(n)) * 90 * U;
    const py = H - fs * 1.9 - 12 * U;
    ctx.globalAlpha = n;
    ctx.transform(1, 0, -0.2, 1, py * 0.2, 0);
    ctx.fillStyle = INK;
    ctx.fillRect(px - 16 * U, py, tw + 32 * U, fs * 1.55);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(st.name, px, py + fs * 0.8);
    ctx.restore();
  }
}

function drawCaption(ctx, st, d) {
  const { H, U, accent, caption } = st;
  const segs = "Segmenter" in Intl
    ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(caption)].map((s) => s.segment)
    : [...caption];
  const family = 'Impact, Haettenschweiler, "Arial Narrow Bold", "Leelawadee UI", Tahoma, sans-serif';
  let fs = Math.min(st.W, H) * 0.14;
  ctx.save();
  const widthAt = (size) => {
    ctx.font = `900 ${size}px ${family}`;
    return segs.reduce((sum, g) => sum + (g.trim() ? ctx.measureText(g).width + size * 0.2 : size * 0.3), 0);
  };
  const limit = H * 0.94;
  const total = widthAt(fs);
  if (total > limit) fs *= limit / total;
  const box = fs * 1.16;
  ctx.font = `900 ${fs}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(14 * U + box / 2, H - 14 * U);
  ctx.rotate(-Math.PI / 2);
  let x = 0;
  segs.forEach((g, i) => {
    const blank = !g.trim();
    const w = blank ? fs * 0.3 : ctx.measureText(g).width + fs * 0.2;
    const p = clamp((d - 0.34 - i * 0.03) / 0.13);
    if (!blank && p > 0) {
      const e = easeOutCubic(p);
      const s = lerp(2.3, 1, e);
      const kind = i % 3;
      ctx.save();
      ctx.translate(x + w / 2, (kind - 1) * fs * 0.05);
      ctx.rotate([-0.05, 0.035, -0.02][kind]);
      ctx.scale(s, s);
      ctx.globalAlpha = clamp(p * 2.5);
      ctx.fillStyle = [INK, "#fff", accent][kind];
      ctx.fillRect(-w / 2, -box / 2, w, box);
      ctx.fillStyle = kind === 1 ? INK : "#fff";
      ctx.fillText(g, 0, fs * 0.04);
      ctx.restore();
    }
    x += w;
  });
  ctx.restore();
}

// ---- main ------------------------------------------------------------------
const FLASHES = [T.flash, T.last, T.card];

function shakeAt(t, U) {
  let amp = 0;
  for (const h of HITS) {
    const d = t - h.t;
    if (d >= 0 && d < 0.2) amp += 8 * Math.exp(-d / 0.04);
  }
  for (const [at, s] of [[T.last, 26], [T.split, 22], [T.land, 34], [T.card, 22]]) {
    const d = t - at;
    if (d >= 0 && d < 0.5) amp += s * Math.exp(-d / 0.09);
  }
  amp = Math.min(amp, 38) * U;
  const f = Math.floor(t * 60);
  return [(hash(f) - 0.5) * 2 * amp, (hash(f + 913) - 0.5) * 2 * amp];
}

export function render(ctx, st, t) {
  const { W, H } = st;
  ctx.save();
  const [sx, sy] = shakeAt(t, st.U);
  ctx.translate(sx, sy);
  if (t < T.flash + 0.22) shotOpen(ctx, st, t);
  else if (t < T.last) shotRush(ctx, st, Math.max(t, T.rush));
  else if (t < T.leap) shotFinalCut(ctx, st, t);
  else if (t < T.card) shotLeap(ctx, st, t);
  else shotCard(ctx, st, t);
  ctx.restore();

  // Only three full-screen flashes, each at least half a second apart.
  for (const at of FLASHES) {
    const d = t - at;
    if (d >= 0 && d < 0.3) {
      ctx.fillStyle = `rgba(255,255,255,${Math.pow(1 - d / 0.3, 2)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.hypot(W, H) * 0.62);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,.34)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.05;
  const f = Math.floor(t * 18);
  ctx.translate((f * 37) % 160, (f * 71) % 160);
  ctx.fillStyle = grain(ctx);
  ctx.fillRect(-160, -160, W + 320, H + 320);
  ctx.restore();

  if (t > T.exit) {
    const p = easeInCubic(prog(t, T.exit, T.end));
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W * 1.25 * p, 0);
    ctx.lineTo(W * 1.25 * p - W * 0.2, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
  }
}
