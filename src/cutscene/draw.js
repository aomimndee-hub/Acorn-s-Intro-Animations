// Drawing primitives for the cutscene. All functions draw in CSS pixels; `U`
// is a resolution-independent unit (1 U ≈ 1px on a 1280×720 screen).
import { TAU, clamp, hash, lerp } from "./util.js";

export const SERIF = '"Cormorant Garamond", "EB Garamond", Georgia, serif';
export const DISPLAY = '"Cinzel", "Cormorant Garamond", Georgia, serif';

/** Additive sprite centred on (x, y). */
export function sprite(ctx, img, x, y, w, h = w, alpha = 1, rot = 0) {
  if (alpha <= 0.002 || w <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/** Bright gem-like light source: halo, spikes, core and anamorphic streak. */
export function star(ctx, S, x, y, size, t, alpha = 1, opts = {}) {
  if (alpha <= 0 || size <= 0) return;
  const rot = (opts.rot ?? 0) + t * (opts.spin ?? 0.05);
  sprite(ctx, S.glowLav, x, y, size * 1.6, size * 1.6, 0.55 * alpha);
  sprite(ctx, S.star, x, y, size * 1.25, size * 1.25, 0.9 * alpha, rot);
  sprite(ctx, S.star2, x, y, size * 0.9, size * 0.9, 0.6 * alpha, -rot * 1.7 + 0.3);
  sprite(ctx, S.glowWhite, x, y, size * 0.32, size * 0.32, alpha);
  sprite(ctx, S.glowWhite, x, y, size * 0.12, size * 0.12, alpha);
  if (opts.flare !== false) {
    const fw = size * (opts.flareW ?? 3.2);
    sprite(ctx, S.flare, x, y, fw, size * 0.09, 0.85 * alpha);
    sprite(ctx, S.flare, x, y, fw * 0.45, size * 0.035, alpha);
  }
}

/** Lens ghosts: soft hexagons + rainbow arcs along the line from the light to the centre. */
export function lensGhosts(ctx, S, W, H, lx, ly, alpha, U) {
  if (alpha <= 0.01) return;
  const cx = W / 2;
  const cy = H / 2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const ghosts = [
    [0.35, 26, "rgba(160,140,255,", 0.1],
    [0.7, 14, "rgba(120,220,255,", 0.2],
    [1.25, 46, "rgba(200,150,255,", 0.06],
    [1.6, 20, "rgba(255,190,140,", 0.12],
  ];
  for (const [k, r, col, a] of ghosts) {
    const gx = lerp(lx, cx, k);
    const gy = lerp(ly, cy, k);
    ctx.fillStyle = `${col}${a * alpha})`;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * TAU + 0.3;
      ctx.lineTo(gx + Math.cos(ang) * r * U, gy + Math.sin(ang) * r * U);
    }
    ctx.fill();
  }
  ctx.restore();
  // rainbow arc around the light
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * 0.35;
  ctx.translate(lx, ly);
  ctx.rotate(-0.6);
  ctx.drawImage(S.rainbow, -260 * U, -330 * U, 520 * U, 40 * U);
  ctx.restore();
}

/**
 * A faceted crystal prism from its base (x0,y0) to its tip (x1,y1).
 * tone: "bright" (lit glass), "dark" (backlit, bright edges), "glass" (translucent).
 */
export function crystal(ctx, S, x0, y0, x1, y1, w, t, opts = {}) {
  const tone = opts.tone || "bright";
  const alpha = opts.alpha ?? 1;
  const seed = opts.seed ?? 1;
  const U = opts.U ?? 1;
  if (alpha <= 0.01) return;
  const L = Math.hypot(x1 - x0, y1 - y0);
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const tip = opts.tip ?? Math.min(L * 0.22, w * 2.2);
  const Lb = L - tip;
  const ys = [-w, -w * 0.42, w * 0.18, w];

  ctx.save();
  ctx.translate(x0, y0);
  ctx.rotate(ang);
  ctx.globalAlpha = alpha;

  // outer glow
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha * (tone === "dark" ? 0.18 : 0.3) * (opts.glow ?? 1);
  ctx.drawImage(S.glowLav, -L * 0.05, -w * 2.6, L * 1.1, w * 5.2);
  ctx.restore();

  const palettes = {
    bright: [
      ["#d8d4ff", "#8f89c4"],
      ["#ffffff", "#c9c4f2"],
      ["#6f6a9e", "#2b2944"],
    ],
    dark: [
      ["#3b3960", "#151424"],
      ["#5c5a86", "#1d1c30"],
      ["#121120", "#07070d"],
    ],
    glass: [
      ["rgba(220,216,255,0.55)", "rgba(120,114,180,0.25)"],
      ["rgba(255,255,255,0.5)", "rgba(190,186,240,0.25)"],
      ["rgba(110,104,170,0.45)", "rgba(40,38,70,0.3)"],
    ],
  };
  const pal = palettes[tone];

  const outline = () => {
    ctx.beginPath();
    ctx.moveTo(0, ys[0]);
    ctx.lineTo(Lb, ys[0]);
    ctx.lineTo(L, 0);
    ctx.lineTo(Lb, ys[3]);
    ctx.lineTo(0, ys[3]);
    ctx.closePath();
  };

  // faces
  for (let f = 0; f < 3; f++) {
    const a = ys[f];
    const b = ys[f + 1];
    const g = ctx.createLinearGradient(0, a, 0, b);
    g.addColorStop(0, pal[f][0]);
    g.addColorStop(1, pal[f][1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, a);
    ctx.lineTo(Lb, a);
    ctx.lineTo(L, 0);
    ctx.lineTo(Lb, b);
    ctx.lineTo(0, b);
    ctx.closePath();
    ctx.fill();
  }
  // tip facets catch more light
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const tg = ctx.createLinearGradient(Lb, 0, L, 0);
  tg.addColorStop(0, "rgba(255,255,255,0)");
  tg.addColorStop(1, `rgba(255,255,255,${tone === "dark" ? 0.25 : 0.45})`);
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(Lb, ys[1]);
  ctx.lineTo(L, 0);
  ctx.lineTo(Lb, ys[2]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // inner light streaks flowing along the axis
  ctx.save();
  outline();
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  const streaks = opts.streaks ?? 26;
  const speed = opts.flow ?? 0.25;
  for (let i = 0; i < streaks; i++) {
    const r1 = hash(seed * 131 + i);
    const r2 = hash(seed * 177 + i * 7);
    const r3 = hash(seed * 211 + i * 13);
    const y = lerp(-w, w, r1);
    const len = L * (0.15 + r2 * 0.45);
    const x = (((r3 + t * speed * (0.5 + r2)) % 1.6) - 0.3) * L;
    const lw = (0.6 + r2 * r2 * 5) * U;
    const a = (tone === "dark" ? 0.25 : 0.45) * (0.3 + r3 * 0.7);
    const g = ctx.createLinearGradient(x, 0, x + len, 0);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, `rgba(240,236,255,${a})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y - lw / 2, len, lw);
  }
  // internal fractures
  ctx.strokeStyle = `rgba(255,255,255,${tone === "dark" ? 0.12 : 0.18})`;
  ctx.lineWidth = 0.8 * U;
  for (let i = 0; i < 6; i++) {
    const r1 = hash(seed * 31 + i * 3);
    const r2 = hash(seed * 37 + i * 5);
    const x = r1 * Lb;
    ctx.beginPath();
    ctx.moveTo(x, -w);
    ctx.lineTo(x + (r2 - 0.5) * w * 3, w);
    ctx.stroke();
  }
  ctx.restore();

  // facet edges
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  ctx.strokeStyle = `rgba(255,255,255,${tone === "dark" ? 0.75 : 0.55})`;
  ctx.lineWidth = 1.4 * U;
  outline();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1 * U;
  for (const y of [ys[1], ys[2]]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(Lb, y);
    ctx.lineTo(L, 0);
    ctx.stroke();
  }
  // travelling glint along the top edge
  const gp = ((t * 0.35 + hash(seed)) % 1.3) - 0.15;
  ctx.globalAlpha = alpha * 0.9;
  ctx.drawImage(S.glowWhite, gp * Lb - 30 * U, ys[0] - 30 * U, 60 * U, 60 * U);
  ctx.drawImage(S.flare, gp * Lb - 90 * U, ys[0] - 4 * U, 180 * U, 8 * U);
  // dispersion along the lower edge
  if (opts.rainbow !== false) {
    ctx.globalAlpha = alpha * 0.32;
    ctx.drawImage(S.rainbow, L * 0.05, ys[3] - 2 * U, L * 0.8, 22 * U);
  }
  ctx.restore();

  ctx.restore();
}

/** Partially drawn concentric ripple rings around a light source. */
export function rings(ctx, x, y, R, t, alpha, opts = {}) {
  if (alpha <= 0.01) return;
  const count = opts.count ?? 6;
  const seed = opts.seed ?? 3;
  const U = opts.U ?? 1;
  const squash = opts.squash ?? 0.92;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(opts.rot ?? -0.25);
  ctx.scale(1, squash);
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < count; i++) {
    const r = R * (0.35 + i * 0.22) * (1 + (opts.grow ?? 0.04) * t);
    const segs = 3 + Math.floor(hash(seed + i * 17) * 4);
    for (let s = 0; s < segs; s++) {
      const a0 = hash(seed * 7 + i * 31 + s * 3) * TAU + t * (0.06 + 0.04 * (i % 3)) * (i % 2 ? 1 : -1);
      const ext = 0.25 + hash(seed * 11 + i * 5 + s) * 1.1;
      const lw = (0.6 + hash(seed + i * 3 + s * 5) * 2.4) * U;
      ctx.strokeStyle = `rgba(225,220,255,${alpha * (0.18 + 0.35 * hash(seed + i + s * 9))})`;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(0, 0, r, a0, a0 + ext);
      ctx.stroke();
    }
    // fine dotted texture ring
    if (i % 2 === 1) {
      ctx.setLineDash([1.5 * U, 5 * U]);
      ctx.strokeStyle = `rgba(210,205,255,${alpha * 0.2})`;
      ctx.lineWidth = 1.2 * U;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.04, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}

/** Expanding shockwave ring. */
export function shockwave(ctx, S, x, y, t0, t, maxR, U, alpha = 1) {
  const dt = t - t0;
  if (dt < 0 || dt > 1.4) return;
  const p = 1 - Math.pow(1 - dt / 1.4, 3);
  const r = maxR * p;
  const a = alpha * (1 - dt / 1.4);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(230,225,255,${a * 0.8})`;
  ctx.lineWidth = (10 - 8 * p) * U;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = `rgba(160,140,255,${a * 0.35})`;
  ctx.lineWidth = 30 * (1 - p) * U + 2;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.96, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/** One crystal fragment (irregular polygon) with a glint. */
export function shard(ctx, S, x, y, size, rot, seed, alpha, U, dark = false) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  const n = 3 + Math.floor(hash(seed) * 3);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + hash(seed + i * 7) * 0.9;
    const r = size * (0.5 + hash(seed + i * 13) * 0.8) * (i === 0 ? 1.8 : 1);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.55);
  }
  ctx.closePath();
  if (dark) {
    ctx.fillStyle = "#000";
    ctx.fill();
  } else {
    const g = ctx.createLinearGradient(-size, -size, size, size);
    g.addColorStop(0, "rgba(255,255,255,0.85)");
    g.addColorStop(0.5, "rgba(170,165,220,0.35)");
    g.addColorStop(1, "rgba(80,76,130,0.6)");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 0.8 * U;
    ctx.stroke();
    const tw = 0.5 + 0.5 * Math.sin(rot * 3 + seed);
    if (tw > 0.85) ctx.drawImage(S.glowWhite, -size * 1.5, -size * 1.5, size * 3, size * 3);
  }
  ctx.restore();
}

/** Fast light streak ("meteor") flying across the frame. */
export function streak(ctx, x, y, len, ang, w, alpha) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createLinearGradient(-len, 0, 0, 0);
  g.addColorStop(0, "rgba(200,190,255,0)");
  g.addColorStop(0.8, `rgba(230,228,255,${alpha * 0.6})`);
  g.addColorStop(1, `rgba(255,255,255,${alpha})`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-len, 0);
  ctx.lineTo(0, -w);
  ctx.lineTo(w * 1.5, 0);
  ctx.lineTo(0, w);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Drifting dust motes. */
export function dust(ctx, S, W, H, t, count, seed, alpha, U, opts = {}) {
  if (alpha <= 0.01) return;
  const vy = opts.vy ?? -0.02;
  const vx = opts.vx ?? 0.008;
  for (let i = 0; i < count; i++) {
    const r1 = hash(seed + i * 3);
    const r2 = hash(seed + i * 5 + 1);
    const r3 = hash(seed + i * 7 + 2);
    const x = (((r1 + t * vx * (0.5 + r3)) % 1) + 1) % 1;
    const y = (((r2 + t * vy * (0.5 + r3)) % 1) + 1) % 1;
    const tw = 0.5 + 0.5 * Math.sin(t * (1 + r3 * 3) + i);
    const s = (2 + r3 * 7) * U;
    sprite(ctx, S.glowWhite, x * W, y * H, s * 2, s * 2, alpha * (0.15 + 0.6 * tw) * r3);
  }
}

/** Smoke layer: several drifting clouds. */
export function smokeLayer(ctx, S, W, H, t, alpha, opts = {}) {
  if (alpha <= 0.01) return;
  const n = opts.count ?? 7;
  const seed = opts.seed ?? 1;
  const yMin = opts.yMin ?? 0;
  const yMax = opts.yMax ?? 1;
  const scale = opts.scale ?? 1;
  ctx.save();
  ctx.globalCompositeOperation = opts.mode || "lighter";
  for (let i = 0; i < n; i++) {
    const img = S.smokes[i % S.smokes.length];
    const r1 = hash(seed * 19 + i);
    const r2 = hash(seed * 23 + i * 3);
    const sz = (0.55 + r2 * 0.7) * Math.max(W, H) * scale;
    const x = ((r1 * 1.4 - 0.2 + t * (opts.drift ?? 0.012) * (r2 - 0.4)) % 1.4) * W;
    const y = lerp(yMin, yMax, r2) * H + Math.sin(t * 0.3 + i) * 0.02 * H;
    ctx.globalAlpha = alpha * (0.5 + 0.5 * r1);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.02 * (r1 - 0.5) + i);
    ctx.drawImage(img, -sz / 2, -sz / 2, sz, sz);
    ctx.restore();
  }
  ctx.restore();
}

/** Glowing curved ribbon ("wing" strands around the reveal). */
export function ribbon(ctx, pts, width, alpha, U) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    ctx.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]);
  };
  ctx.strokeStyle = `rgba(170,160,255,${alpha * 0.18})`;
  ctx.lineWidth = width * 6 * U;
  path();
  ctx.stroke();
  ctx.strokeStyle = `rgba(225,222,255,${alpha * 0.45})`;
  ctx.lineWidth = width * 2 * U;
  path();
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.85})`;
  ctx.lineWidth = width * 0.7 * U;
  path();
  ctx.stroke();
  ctx.restore();
}

/**
 * Subtitle-card label, the cutscene's typographic signature: it lands as a
 * white card, flips through grey, then settles into a dark translucent card.
 */
export function label(ctx, text, x, y, opts) {
  const { t, t0, size } = opts;
  const dt = t - t0;
  if (dt < 0) return;
  const end = opts.end ?? Infinity;
  const fadeOut = opts.fadeOut ?? 0.25;
  let a = clamp(dt / 0.05) * (1 - clamp((t - end) / fadeOut)) * (opts.alpha ?? 1);
  if (a <= 0.01) return;

  const invert = !!opts.invert;
  let box;
  let ink;
  if (opts.plain) {
    box = null;
    ink = opts.color || "rgba(235,232,245,0.92)";
  } else if (dt < 0.07) {
    box = invert ? "#111" : "#f5f4ff";
    ink = invert ? "#fff" : "#141418";
  } else if (dt < 0.17) {
    box = "#8f8d9f";
    ink = "#fff";
  } else {
    box = invert ? "rgba(70,70,74,0.92)" : "rgba(10,10,15,0.8)";
    ink = "#f2f1f8";
  }

  const pop = 1 + (opts.pop ?? 0.14) * Math.exp(-dt * 16);
  ctx.save();
  ctx.translate(x + (opts.driftX ?? 0) * dt, y + (opts.driftY ?? 0) * dt);
  ctx.rotate(((opts.rot ?? 0) * Math.PI) / 180);
  ctx.scale(pop, pop);
  ctx.globalAlpha = a;
  ctx.font = `${opts.weight ?? 500} ${size}px ${opts.font ?? SERIF}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = opts.align ?? "center";
  const w = ctx.measureText(text).width;
  const padX = size * 0.32;
  const h = size * 1.22;
  const bx = ctx.textAlign === "left" ? -padX : -w / 2 - padX;
  if (box) {
    ctx.fillStyle = box;
    ctx.fillRect(bx, -h / 2, w + padX * 2, h);
  }
  if (opts.glow) {
    ctx.shadowColor = "rgba(220,215,255,0.65)";
    ctx.shadowBlur = size * 0.5;
  }
  ctx.fillStyle = ink;
  ctx.fillText(text, 0, size * 0.04);
  ctx.restore();
}
