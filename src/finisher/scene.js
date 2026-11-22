// Team Assault: up to four tokens appear in glass, rush one target in black
// silhouette, and the lead lands for the final pose. Every frame is a pure
// function of the music's current time.
import { crystal, shockwave, star as gemStar } from "../cutscene/draw.js";
import { TAU, clamp, easeInCubic, easeOutCubic, easeOutExpo, hash, lerp, makeCanvas, prog, rng, smooth } from "../cutscene/util.js";

// Cue points measured from public/audio/finisher.mp3.
export const T = {
  glass: 0.42,
  reveal: [1.24, 1.86, 2.46, 3.2],
  shatter: 3.8,
  lock: 4.42,
  assault: 5.14,
  volley: 10.26,
  finale: 11.0,
  bloom: 11.6,
  field: 12.22,
  drop: 12.94,
  stand: 13.56,
  card: 14.16,
  exit: 15.42,
  end: 15.7,
};

const GOLD = "#ffc94d";
const CREAM = "#f6dcb8";
const INK = "#050506";
const PAPER = "#f7f3ec";

// Strikes per beat rise from three to ten, so the rush keeps accelerating.
const BEATS = [5.14, 5.76, 6.36, 6.98, 7.62, 8.32, 9.04, 9.66, 10.26, 11.0];
const SUBDIVIDE = [3, 4, 4, 5, 5, 6, 7, 8, 10];
export const STRIKES = (() => {
  const out = [];
  SUBDIVIDE.forEach((n, b) => {
    const gap = (BEATS[b + 1] - BEATS[b]) / n;
    for (let i = 0; i < n; i++) {
      const k = out.length;
      out.push({ t: BEATS[b] + gap * i, a: (k * 2.399963 + hash(k + 5) * 0.5) % TAU, k, seed: k + 17 });
    }
  });
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

/** Real colours for the glass and final card, black silhouettes for the action. */
export function buildTokenSprite(source) {
  const S = 720;
  const base = makeCanvas(S, S);
  const b = base.getContext("2d");
  const sw = source.naturalWidth || source.videoWidth || source.width || S;
  const sh = source.naturalHeight || source.videoHeight || source.height || S;
  const fit = (S * 0.86) / Math.max(sw, sh);
  b.imageSmoothingQuality = "high";
  b.drawImage(source, (S - sw * fit) / 2, (S - sh * fit) / 2, sw * fit, sh * fit);
  const black = tinted(base, INK);
  const white = tinted(base, "#fff");
  const sticker = makeCanvas(S, S);
  const s = sticker.getContext("2d");
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU;
    s.drawImage(white, Math.cos(a) * 9, Math.sin(a) * 9);
  }
  s.drawImage(base, 0, 0);
  // A small copy keeps the many motion-blur samples cheap.
  const fast = makeCanvas(256, 256);
  fast.getContext("2d").drawImage(black, 0, 0, 256, 256);
  return { base, black, white, sticker, fast };
}

const dotCache = {};
function dots(ctx, color) {
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

let grainCache = null;
function grain(ctx) {
  if (!grainCache) {
    grainCache = makeCanvas(160, 160);
    const x = grainCache.getContext("2d");
    const r = rng(9);
    for (let i = 0; i < 2600; i++) {
      x.fillStyle = r() > 0.5 ? "rgba(255,255,255,.5)" : "rgba(0,0,0,.6)";
      x.fillRect(r() * 160, r() * 160, 1, 1);
    }
  }
  return ctx.createPattern(grainCache, "repeat");
}

// ---- primitives ------------------------------------------------------------
function sprite(ctx, img, x, y, size, { rot = 0, flip = 1, sx = 1, sy = 1, alpha = 1 } = {}) {
  if (alpha <= 0.003) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(flip * sx, sy);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
}

function star4(ctx, x, y, r, rot, color, waist = 0.1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const d = i % 2 ? r * waist : r * (i % 4 === 0 ? 1 : 0.62);
    ctx[i ? "lineTo" : "moveTo"](Math.cos(a) * d, Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function halftone(ctx, W, H, color, alpha, fromLeft = true) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = dots(ctx, color);
  ctx.beginPath();
  if (fromLeft) {
    ctx.moveTo(-60, -60); ctx.lineTo(W * 0.62, -60); ctx.lineTo(W * 0.2, H + 60); ctx.lineTo(-60, H + 60);
  } else {
    ctx.moveTo(W + 60, -60); ctx.lineTo(W * 0.5, -60); ctx.lineTo(W * 0.82, H + 60); ctx.lineTo(W + 60, H + 60);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function fillPoly(ctx, W, H, color, pts, dx = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  pts.forEach(([x, y], i) => ctx[i ? "lineTo" : "moveTo"](x * W + dx, y * H));
  ctx.closePath();
  ctx.fill();
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

function sparks(ctx, x, y, dt, life, U, seed, count, baseAngle) {
  if (dt < 0 || dt > life) return;
  const p = dt / life;
  const r = rng(seed);
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const a = baseAngle + (r() - 0.5) * 2.6 + (r() > 0.5 ? Math.PI : 0);
    const d = (170 + r() * 470) * U * easeOutCubic(p) * life * 2.2;
    const tail = (18 + r() * 42) * U * (1 - p);
    const px = x + Math.cos(a) * d;
    const py = y + Math.sin(a) * d + 130 * U * p * p;
    ctx.strokeStyle = i % 3 ? GOLD : CREAM;
    ctx.globalAlpha = 1 - p;
    ctx.lineWidth = (1 + r() * 2.8) * U;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - Math.cos(a) * tail, py - Math.sin(a) * tail);
    ctx.stroke();
  }
  ctx.restore();
}

/** Hand-drawn gold constellation of circles and lines around the target. */
function scribble(ctx, cx, cy, R, seed, p, U, spin) {
  const r = rng(seed);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(spin);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2.2 * U;
  ctx.lineCap = "round";
  for (let i = 0; i < 5; i++) {
    const x = (r() - 0.5) * R * 1.2;
    const y = (r() - 0.5) * R * 0.9;
    const rad = R * (0.14 + r() * 0.34);
    const from = r() * TAU;
    ctx.beginPath();
    ctx.arc(x, y, rad, from, from + TAU * clamp(p * 1.25 - i * 0.04));
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU;
    const len = R * (0.8 + r() * 1.5) * easeOutExpo(p);
    ctx.moveTo(Math.cos(a) * R * 0.12, Math.sin(a) * R * 0.12);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
  }
  ctx.stroke();
  ctx.restore();
}

function inkStroke(ctx, cx, cy, angle, len, thick, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(-len, 0);
  ctx.quadraticCurveTo(-len * 0.1, -thick, len * 0.2, -thick * 0.45);
  ctx.lineTo(len, 0);
  ctx.quadraticCurveTo(len * 0.1, thick * 0.5, -len, 0);
  ctx.fill();
  ctx.restore();
}

// ---- 1. glass reveal -------------------------------------------------------
const SLOTS = { 1: [0], 2: [0, 1], 3: [0, 2, 1], 4: [0, 3, 1, 2] };

/** Supports appear first; the lead always takes the final, biggest beat. */
function revealOrder(st) {
  const others = st.team.filter((_, i) => i !== st.leadIndex);
  const list = [...others, st.team[st.leadIndex]];
  const beats = T.reveal.slice(4 - list.length);
  return list.map((tok, i) => ({ tok, at: beats[i], slot: SLOTS[list.length][i], lead: i === list.length - 1 }));
}

function panePath(ctx, W, H, slot, n, open = 1) {
  const w = W / n;
  const skew = W * 0.075;
  const x0 = w * slot;
  const x1 = w * (slot + 1);
  const mid = H / 2;
  const top = lerp(mid, -H * 0.04, open);
  const bot = lerp(mid, H * 1.04, open);
  const g = 2.5;
  ctx.beginPath();
  ctx.moveTo(x0 + skew + g, top);
  ctx.lineTo(x1 + skew - g, top);
  ctx.lineTo(x1 - skew - g, bot);
  ctx.lineTo(x0 - skew + g, bot);
  ctx.closePath();
}

function drawPane(ctx, st, item, n, t) {
  const { W, H, U } = st;
  const d = t - item.at;
  if (d < 0) return;
  const open = easeOutExpo(clamp(d / 0.2));
  const w = W / n;
  const cx = w * (item.slot + 0.5);
  ctx.save();
  panePath(ctx, W, H, item.slot, n, open);
  ctx.save();
  ctx.clip();
  const g = ctx.createLinearGradient(cx - w, 0, cx + w, H);
  g.addColorStop(0, "#fff");
  g.addColorStop(0.32, item.lead ? "#ffe9e0" : "#d9d5ff");
  g.addColorStop(0.68, item.lead ? "#ff5b58" : "#8f89c4");
  g.addColorStop(1, item.lead ? "#a30010" : "#34304f");
  ctx.fillStyle = g;
  ctx.fillRect(cx - w * 1.2, -20, w * 2.4, H + 40);

  // Facets and a band of light sliding across the glass.
  const r = rng(item.slot * 13 + 3);
  for (let i = 0; i < 6; i++) {
    const a = cx - w + r() * w * 2;
    const b = a + (r() - 0.5) * w;
    ctx.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "40,30,90"},${0.07 + r() * 0.16})`;
    ctx.beginPath();
    ctx.moveTo(a, -10);
    ctx.lineTo(a + w * 0.34, -10);
    ctx.lineTo(b + w * 0.1, H + 10);
    ctx.lineTo(b - w * 0.2, H + 10);
    ctx.closePath();
    ctx.fill();
  }
  const sweep = lerp(-w, w * 1.2, prog(d, 0, 0.5));
  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.beginPath();
  ctx.moveTo(cx + sweep + w * 0.25, -10);
  ctx.lineTo(cx + sweep + w * 0.42, -10);
  ctx.lineTo(cx + sweep - w * 0.1, H + 10);
  ctx.lineTo(cx + sweep - w * 0.27, H + 10);
  ctx.closePath();
  ctx.fill();

  const size = Math.min(H * (item.lead ? 1.12 : 0.98), w * 1.7);
  const scale = lerp(1.32, 1, easeOutExpo(clamp(d / 0.36))) + (t - item.at) * 0.012;
  sprite(ctx, item.tok.base, cx + lerp(w * 0.2, 0, easeOutExpo(clamp(d / 0.3))), H * 0.55, size * scale);

  // Reflections sit on top of the token, so it reads as being inside the glass.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const glint = ctx.createLinearGradient(cx - w * 0.6, 0, cx + w * 0.6, H);
  glint.addColorStop(0, "rgba(255,255,255,.24)");
  glint.addColorStop(0.3, "rgba(255,255,255,0)");
  glint.addColorStop(0.72, "rgba(255,255,255,0)");
  glint.addColorStop(1, item.lead ? "rgba(255,120,90,.24)" : "rgba(150,140,255,.22)");
  ctx.fillStyle = glint;
  ctx.fillRect(cx - w * 1.2, -20, w * 2.4, H + 40);
  const shine = lerp(-w * 1.1, w * 1.3, prog(d, 0.02, 0.52));
  ctx.fillStyle = "rgba(255,255,255,.5)";
  ctx.beginPath();
  ctx.moveTo(cx + shine + w * 0.2, -10);
  ctx.lineTo(cx + shine + w * 0.31, -10);
  ctx.lineTo(cx + shine - w * 0.13, H + 10);
  ctx.lineTo(cx + shine - w * 0.24, H + 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,.95)";
  ctx.lineWidth = 2.5 * U;
  ctx.stroke();
  ctx.restore();

  if (d < 0.45) {
    const p = d / 0.45;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    gemStar(ctx, st.S, cx, H * 0.34, Math.min(W, H) * 0.42 * easeOutCubic(clamp(p * 2.4)), t, 1, { flareW: 2.4 });
    ctx.restore();
  }
}

function drawGlassBackdrop(ctx, st, t) {
  const { W, H, U, S } = st;
  ctx.fillStyle = "#040308";
  ctx.fillRect(-70, -70, W + 140, H + 140);
  const on = smooth(t, T.glass - 0.2, T.glass + 0.35);
  const g = ctx.createRadialGradient(W / 2, H * 0.48, 0, W / 2, H * 0.48, Math.hypot(W, H) * 0.56);
  g.addColorStop(0, "rgba(120,16,34,.95)");
  g.addColorStop(0.55, "rgba(44,12,48,.8)");
  g.addColorStop(1, "rgba(4,3,8,0)");
  ctx.save();
  ctx.globalAlpha = on;
  ctx.fillStyle = g;
  ctx.fillRect(-70, -70, W + 140, H + 140);
  ctx.restore();
  const rise = easeOutExpo(prog(t, T.glass, T.glass + 0.7));
  const low = lerp(H * 0.7, 0, rise);
  crystal(ctx, S, W * 0.08, H * 1.25 + low, W * 0.34, H * 0.14 + low, W * 0.05, t, { U, seed: 61, tone: "dark", flow: 0.35, alpha: on });
  crystal(ctx, S, W * 0.94, H * 1.25 + low, W * 0.66, H * 0.08 + low, W * 0.055, t, { U, seed: 62, tone: "dark", flow: 0.35, alpha: on });
  crystal(ctx, S, W * 0.5, H * 1.3 + low, W * 0.52, H * 0.26 + low, W * 0.04, t, { U, seed: 63, tone: "glass", flow: 0.5, alpha: on });
  const p = prog(t, T.glass, T.glass + 0.55);
  if (p > 0 && p < 1) gemStar(ctx, S, W / 2, H * 0.42, Math.min(W, H) * 0.7 * Math.sin(p * Math.PI), t, 1 - p * 0.3);
}

function shotGlass(ctx, st, t) {
  drawGlassBackdrop(ctx, st, t);
  const items = revealOrder(st);
  for (const item of items) drawPane(ctx, st, item, items.length, t);
  if (t > T.shatter - 0.3) {
    // Cracks race across the glass just before it breaks.
    const p = prog(t, T.shatter - 0.3, T.shatter);
    const r = rng(404);
    const { W, H, U } = st;
    ctx.save();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.8 * U;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      let x = W / 2;
      let y = H * 0.48;
      const a = (i / 16) * TAU + r() * 0.3;
      const reach = Math.hypot(W, H) * 0.62 * p * (0.6 + r() * 0.5);
      ctx.moveTo(x, y);
      for (let k = 1; k <= 5; k++) {
        const aa = a + (r() - 0.5) * 0.3;
        x = W / 2 + Math.cos(aa) * (reach * k) / 5;
        y = H * 0.48 + Math.sin(aa) * (reach * k) / 5;
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }
}

/** The finished glass wall, cached so it can break into real pieces. */
function glassPlate(st) {
  const key = `${st.W}x${st.H}`;
  if (st._plateKey !== key) {
    const k = Math.min(1.5, 1600 / st.W);
    const c = makeCanvas(st.W * k, st.H * k);
    const x = c.getContext("2d");
    x.scale(k, k);
    const items = revealOrder(st);
    for (const item of items) drawPane(x, st, { ...item, at: T.shatter - 2 }, items.length, T.shatter);
    st._plate = c;
    st._plateScale = k;
    st._plateKey = key;
    const r = rng(77);
    const cols = 9;
    const rows = 6;
    const pts = [];
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const edge = i === 0 || j === 0 || i === cols || j === rows;
        const jx = edge ? 0 : (r() - 0.5) * 0.72;
        const jy = edge ? 0 : (r() - 0.5) * 0.72;
        pts.push([((i + jx) / cols) * st.W, ((j + jy) / rows) * st.H]);
      }
    }
    const tris = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = pts[j * (cols + 1) + i];
        const b = pts[j * (cols + 1) + i + 1];
        const c2 = pts[(j + 1) * (cols + 1) + i];
        const d = pts[(j + 1) * (cols + 1) + i + 1];
        const pair = r() > 0.5 ? [[a, b, c2], [b, d, c2]] : [[a, b, d], [a, d, c2]];
        for (const tri of pair) {
          tris.push({
            tri,
            cx: (tri[0][0] + tri[1][0] + tri[2][0]) / 3,
            cy: (tri[0][1] + tri[1][1] + tri[2][1]) / 3,
            spin: (r() - 0.5) * 7,
            speed: 0.55 + r() * 1.25,
            delay: r() * 0.07,
          });
        }
      }
    }
    st._tris = tris;
  }
  return st._plate;
}

function drawShards(ctx, st, t) {
  const d = t - T.shatter;
  if (d < 0 || d > 0.95) return;
  const plate = glassPlate(st);
  const { W, H } = st;
  const k = st._plateScale;
  for (const s of st._tris) {
    const q = clamp((d - s.delay) / 0.9);
    const e = easeOutCubic(q);
    const dx = s.cx - W / 2;
    const dy = s.cy - H * 0.48;
    ctx.save();
    ctx.globalAlpha = 1 - smooth(q, 0.45, 1);
    ctx.translate(s.cx + dx * e * s.speed * 1.5, s.cy + dy * e * s.speed * 1.5 + 260 * st.U * q * q);
    ctx.rotate(s.spin * e);
    ctx.scale(1 - q * 0.25, 1 - q * 0.25);
    ctx.translate(-s.cx, -s.cy);
    ctx.beginPath();
    ctx.moveTo(s.tri[0][0], s.tri[0][1]);
    ctx.lineTo(s.tri[1][0], s.tri[1][1]);
    ctx.lineTo(s.tri[2][0], s.tri[2][1]);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(plate, 0, 0, plate.width / k, plate.height / k);
    ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
  shockwave(ctx, st.S, W / 2, H * 0.48, T.shatter, t, Math.hypot(W, H) * 0.7, st.U, 0.9);
}

// ---- 2. target lock and assault --------------------------------------------
/** Expensive full-screen paints are drawn once and then reused every frame. */
function layer(st, key, paint, scale = 1) {
  const id = `${key}:${st.W}x${st.H}`;
  st._layers ??= new Map();
  if (!st._layers.has(id)) {
    const c = makeCanvas(st.W * scale, st.H * scale);
    const x = c.getContext("2d");
    x.scale(scale, scale);
    paint(x);
    st._layers.set(id, c);
  }
  return st._layers.get(id);
}

function redField(ctx, st, heat) {
  const { W, H, accent } = st;
  const cold = layer(st, "field-cold", (x) => {
    x.fillStyle = "#3f0408";
    x.fillRect(0, 0, W, H);
    halftone(x, W, H, "#000", 0.16);
  });
  const hot = layer(st, `field-hot-${accent}`, (x) => {
    const g = x.createRadialGradient(W / 2, H * 0.48, 0, W / 2, H * 0.48, Math.hypot(W, H) * 0.62);
    g.addColorStop(0, accent);
    g.addColorStop(0.7, accent);
    g.addColorStop(1, "#5a050b");
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    halftone(x, W, H, "#000", 0.16);
  });
  ctx.drawImage(cold, -70, -70, W + 140, H + 140);
  ctx.save();
  ctx.globalAlpha = 0.42 + heat * 0.58;
  ctx.drawImage(hot, -70, -70, W + 140, H + 140);
  ctx.restore();
}

function shotLock(ctx, st, t) {
  const { W, H, U } = st;
  redField(ctx, st, 0.15 * prog(t, T.shatter, T.assault));
  const cx = W / 2;
  const cy = H * 0.52;
  const base = Math.min(H * 0.92, W * 0.62);
  const on = easeOutCubic(prog(t, T.shatter, T.shatter + 0.35));
  const push = prog(t, T.shatter, T.assault);

  // The team circles in the foreground, huge and out of focus.
  st.team.forEach((tok, i) => {
    const side = i % 2 ? 1 : -1;
    const y = H * (0.72 + (i > 1 ? 0.05 : -0.05));
    const x = cx + side * W * lerp(0.62, 0.36 + (i > 1 ? 0.12 : 0), easeOutCubic(push));
    sprite(ctx, tok.black, x, y, base * 1.08, { flip: -side, alpha: on * 0.96 });
  });
  sprite(ctx, st.target.black, cx, cy, base * lerp(1.08, 1, push), { alpha: on });

  [[0.26, 0.24, 3.98], [0.74, 0.2, 4.14], [0.42, 0.72, 4.3]].forEach(([x, y, at], i) => {
    const p = prog(t, at, at + 0.5);
    if (p <= 0 || p >= 1) return;
    star4(ctx, W * x, H * y, 74 * U * Math.sin(p * Math.PI), p * 1.4 + i, GOLD);
  });

  if (t >= T.lock) {
    const p = easeOutExpo(prog(t, T.lock, T.lock + 0.42));
    const R = Math.min(W, H) * 0.42;
    const spin = (t - T.lock) * 0.9;
    scribble(ctx, cx, cy, R, 31, prog(t, T.lock, T.lock + 0.55), U, spin * 0.12);
    ctx.save();
    ctx.strokeStyle = GOLD;
    ctx.fillStyle = GOLD;
    ctx.lineWidth = 3 * U;
    ctx.beginPath();
    ctx.arc(cx, cy, R * (1.5 - 0.5 * p), spin, spin + TAU * p);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = -spin * 1.3 + (i / 4) * TAU;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * R * 1.08 * (1.5 - 0.5 * p), cy + Math.sin(a) * R * 1.08 * (1.5 - 0.5 * p));
      ctx.rotate(a + Math.PI);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(-24 * U, -12 * U); ctx.lineTo(-24 * U, 12 * U);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    star4(ctx, cx, cy, 44 * U * (1 + 0.16 * Math.sin(t * 20)), spin, CREAM);
  }
}

const DASH_IN = 0.04;
const DASH_OUT = 0.07;
const WINDUP = 0.026;
let detail = 1;

let goldGlowCache = null;
function goldGlow() {
  if (!goldGlowCache) {
    goldGlowCache = makeCanvas(256, 256);
    const x = goldGlowCache.getContext("2d");
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,248,214,1)");
    g.addColorStop(0.16, "rgba(255,202,90,.8)");
    g.addColorStop(0.46, "rgba(255,84,20,.26)");
    g.addColorStop(1, "rgba(255,30,0,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
  }
  return goldGlowCache;
}

function bloom(ctx, x, y, size, alpha) {
  if (alpha <= 0.004) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(goldGlow(), x - size / 2, y - size / 2, size, size);
  ctx.restore();
}

/** Tapered streak of light from the tail of a dash to its head. */
function lightTrail(ctx, x0, y0, x1, y1, width, alpha) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 1 || alpha <= 0) return;
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, "rgba(255,120,30,0)");
  g.addColorStop(0.55, `rgba(255,190,70,${0.55 * alpha})`);
  g.addColorStop(1, `rgba(255,250,225,${alpha})`);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1 + nx * width, y1 + ny * width);
  ctx.lineTo(x1 - nx * width, y1 - ny * width);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Smear frame: the silhouette is cut into strips and each strip is dragged
 * along the motion by a different amount, like a hand-drawn in-between.
 */
function smear(ctx, tok, x, y, angle, length, size, alpha, seed) {
  const img = tok.fast;
  const S = img.width;
  const n = detail < 1 ? 9 : 14;
  const r = rng(seed);
  const rowH = (size * 0.86) / n;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  for (let i = 0; i < n; i++) {
    const mid = 1 - Math.abs((i / (n - 1)) * 2 - 1);
    const len = length * (0.3 + 0.7 * Math.pow(mid, 0.7)) * (0.62 + r() * 0.62);
    const lag = (r() - 0.5) * length * 0.2;
    ctx.drawImage(img, 0, S * (0.07 + (0.86 * i) / n), S, (S * 0.86) / n, -len * 0.86 + lag, -size * 0.43 + i * rowH, len + size * 0.3, rowH + 0.8);
  }
  ctx.restore();
}

/** Each member snaps back, smears through the target, and skids to a hold. */
function drawMember(ctx, st, m, t, cx, cy, base) {
  const own = STRIKES.filter((s) => s.k % st.team.length === m);
  let cur = -1;
  for (let i = 0; i < own.length; i++) if (own[i].t - DASH_IN - WINDUP <= t) cur = i;
  if (cur < 0) return;
  const { W, H, U } = st;
  const tok = st.team[m];
  const R = Math.hypot(W, H) * 0.7;
  const rest = (s) => [cx + Math.cos(s.a) * W * 0.36, cy + Math.sin(s.a) * H * 0.31];
  const s = own[cur];
  const start = cur > 0 ? rest(own[cur - 1]) : [cx - Math.cos(s.a) * R, cy - Math.sin(s.a) * R * 0.72];
  const end = rest(s);
  const inA = Math.atan2(cy - start[1], cx - start[0]);
  const inAt = s.t - DASH_IN;
  const at = (time) => {
    if (time < inAt) {
      const back = Math.sin(clamp((time - (inAt - WINDUP)) / WINDUP) * Math.PI * 0.5) * 20 * U;
      return [start[0] - Math.cos(inA) * back, start[1] - Math.sin(inA) * back];
    }
    if (time < s.t) {
      const p = easeInCubic(clamp((time - inAt) / DASH_IN));
      return [lerp(start[0], cx, p), lerp(start[1], cy, p)];
    }
    const q = easeOutExpo(clamp((time - s.t) / DASH_OUT));
    return [lerp(cx, end[0], q), lerp(cy, end[1], q)];
  };

  const [x, y] = at(t);
  const [px, py] = at(t - 1 / 120);
  const vx = (x - px) * 120;
  const vy = (y - py) * 120;
  const speed = Math.hypot(vx, vy);
  const size = base * 0.66;
  const facing = speed > 200 * U ? vx : cx - x;
  const flip = facing >= 0 ? 1 : -1;

  if (speed > 1100 * U) {
    const angle = Math.atan2(vy, vx);
    const shutter = 1 / 26;
    const [tx, ty] = at(t - shutter * 1.7);
    lightTrail(ctx, tx, ty, x, y, size * 0.2, 0.85);
    // True motion blur: many faint samples across the shutter.
    const N = detail < 1 ? 5 : 9;
    const a = Math.min(1, 2.8 / N);
    for (let k = N - 1; k >= 0; k--) {
      const [bx, by] = at(t - (k / (N - 1)) * shutter);
      sprite(ctx, tok.fast, bx, by, size, { flip, rot: flip * 0.34, sx: 1.08, sy: 0.96, alpha: a });
    }
    const stretch = clamp(speed / (5200 * U), 0.3, 1) * Math.hypot(W, H) * 0.46;
    smear(ctx, tok, x, y, angle, stretch + size * 0.55, size * 0.9, 0.94, s.seed + m * 7);
  } else {
    const held = smooth(t, s.t + DASH_OUT * 0.5, s.t + DASH_OUT + 0.05);
    const contact = Math.exp(-Math.max(0, t - s.t) / 0.02);
    sprite(ctx, tok.black, x, y, size, {
      flip,
      rot: flip * lerp(0.3, 0.07, held),
      sx: 1 + contact * 0.16 - (1 - held) * 0.04,
      sy: 1 - contact * 0.12 + (1 - held) * 0.03,
    });
  }
}

/** Six pre-drawn sets of speed lines, cycled so the air keeps rushing past. */
function speedField(ctx, st, cx, cy, frame, color, count, alpha, inner) {
  const { W, H } = st;
  const variant = ((frame % 6) + 6) % 6;
  const img = layer(st, `speed-${color}-${count}-${variant}`, (x) => {
    const R = Math.hypot(W, H);
    const r = rng(variant * 31 + count + 7);
    x.fillStyle = color;
    x.beginPath();
    for (let i = 0; i < count; i++) {
      const a = r() * TAU;
      const w = 0.003 + r() * 0.012;
      const near = inner * (0.9 + r() * 0.8);
      x.moveTo(cx + Math.cos(a) * near, cy + Math.sin(a) * near);
      x.lineTo(cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R);
      x.lineTo(cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R);
      x.closePath();
    }
    x.fill();
  }, 0.5);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, 0, 0, W, H);
  ctx.restore();
}

function drawImpact(ctx, st, s, t, cx, cy, base) {
  const d = t - s.t;
  if (d < 0 || d > 0.42) return;
  const r = rng(s.seed);
  const ox = (r() - 0.5) * base * 0.36;
  const oy = (r() - 0.5) * base * 0.46;
  const x = cx + ox;
  const y = cy + oy;
  if (d < 0.15) {
    const p = d / 0.15;
    const size = base * (0.42 + r() * 0.34) * easeOutExpo(clamp(p * 2.6));
    const fade = 1 - smooth(p, 0.3, 1);
    bloom(ctx, x, y, size * 2.3, fade * 0.95);

    // Black impact spikes give the light something to punch against.
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = INK;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = s.a + (i / 10) * TAU + r() * 0.3;
      const inner = size * 0.34;
      const outer = size * (0.82 + r() * 0.62);
      const w = 0.09;
      ctx.moveTo(x + Math.cos(a - w) * inner, y + Math.sin(a - w) * inner);
      ctx.lineTo(x + Math.cos(a) * outer, y + Math.sin(a) * outer);
      ctx.lineTo(x + Math.cos(a + w) * inner, y + Math.sin(a + w) * inner);
      ctx.closePath();
    }
    ctx.fill();
    star4(ctx, x, y, size * 1.04, s.a + 0.2, s.k % 2 ? CREAM : GOLD, 0.065);
    star4(ctx, x, y, size * 0.52, s.a + 0.98, "#fff", 0.09);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 4 * st.U * (1 - p);
    ctx.beginPath();
    ctx.arc(x, y, size * lerp(0.3, 0.86, p), s.a, s.a + TAU * 0.8);
    ctx.stroke();
    ctx.restore();
  }
  sparks(ctx, x, y, d, 0.4, st.U, s.seed * 3, detail < 1 ? 5 : 8, s.a);
}

function shotAssault(ctx, st, t) {
  const { W, H, U } = st;
  const heat = smooth(t, T.assault, T.finale);
  redField(ctx, st, 0.25 + heat * 0.75);
  const cx = W / 2;
  const cy = H * 0.52;
  const base = Math.min(H * 0.9, W * 0.6);

  let idx = -1;
  for (let i = 0; i < STRIKES.length; i++) if (STRIKES[i].t <= t) idx = i;
  const hit = idx >= 0 ? STRIKES[idx] : null;
  const dt = hit ? t - hit.t : 1;

  // Each hit punches the camera in, then it eases straight back out.
  const punch = 1 + Math.exp(-dt / 0.04) * 0.04 + heat * 0.05;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(punch, punch);
  ctx.translate(-cx, -cy);

  const frame = Math.floor(t * 30);
  speedField(ctx, st, cx, cy, frame, INK, 70, 0.46 + heat * 0.2, base * 0.5);
  speedField(ctx, st, cx, cy, frame + 3, GOLD, 12, 0.34, base * 0.62);
  scribble(ctx, cx, cy, Math.min(W, H) * 0.44, 31 + Math.floor((t - T.assault) / 0.31), 1, U, (t - T.assault) * 0.5);
  bloom(ctx, cx, cy, base * 1.9, 0.2 + heat * 0.22);

  // Black strokes hang in the air after each pass, like the ink of the rush.
  for (let i = Math.max(0, idx - 15); i <= idx; i++) {
    const s = STRIKES[i];
    const age = t - s.t;
    if (age > 0.75) continue;
    const r = rng(s.seed + 90);
    const off = (r() - 0.5) * base * 0.8;
    inkStroke(
      ctx,
      cx - Math.sin(s.a) * off,
      cy + Math.cos(s.a) * off,
      s.a,
      Math.hypot(W, H) * (0.24 + r() * 0.3) * easeOutExpo(clamp(age / 0.05)),
      (12 + r() * 30) * U,
      0.84 * (1 - smooth(age, 0.16, 0.75)),
    );
  }

  // The target takes every hit with a blurred recoil.
  const kick = Math.exp(-dt / 0.038) * 40 * U;
  const wob = Math.sin(dt * 90) * Math.exp(-dt / 0.06) * 0.11;
  const kx = hit ? Math.cos(hit.a) : 0;
  const ky = hit ? Math.sin(hit.a) * 0.6 : 0;
  const pose = { rot: wob, sx: 1 + Math.exp(-dt / 0.04) * 0.08, sy: 1 - Math.exp(-dt / 0.04) * 0.07 };
  if (dt < 0.09) {
    for (let k = 5; k >= 1; k--) {
      sprite(ctx, st.target.fast, cx + kx * kick * (1 + k * 0.45), cy + ky * kick * (1 + k * 0.45), base, { ...pose, alpha: 0.13 });
    }
  }
  sprite(ctx, st.target.black, cx + kx * kick, cy + ky * kick, base, pose);

  for (let m = 0; m < st.team.length; m++) drawMember(ctx, st, m, t, cx, cy, base);
  for (let i = Math.max(0, idx - 8); i <= idx; i++) drawImpact(ctx, st, STRIKES[i], t, cx, cy, base);

  // Last beat: the whole team converges from the corners in one smeared blur.
  if (t > T.finale - 0.14) {
    const p = prog(t, T.finale - 0.14, T.finale);
    const corners = [[-0.12, -0.08], [1.12, -0.08], [-0.12, 1.08], [1.12, 1.08]];
    st.team.forEach((tok, i) => {
      const sx = corners[i][0] * W;
      const sy = corners[i][1] * H;
      const q = easeInCubic(p);
      const x = lerp(sx, cx, q);
      const y = lerp(sy, cy, q);
      const angle = Math.atan2(cy - sy, cx - sx);
      const [tx, ty] = [lerp(sx, cx, easeInCubic(clamp(p - 0.3))), lerp(sy, cy, easeInCubic(clamp(p - 0.3)))];
      lightTrail(ctx, tx, ty, x, y, base * 0.15, 1);
      smear(ctx, tok, x, y, angle, Math.hypot(W, H) * 0.34 * clamp(q + 0.3), base * 0.72, 1, 300 + i);
    });
    bloom(ctx, cx, cy, base * 2.6 * p, p);
  }
  ctx.restore();
}

// ---- 3. red bloom ----------------------------------------------------------
function petal(ctx, len, width) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.22, -width, len * 0.82, -width * 0.9, len, 0);
  ctx.bezierCurveTo(len * 0.8, width * 0.74, len * 0.26, width * 0.86, 0, 0);
  ctx.closePath();
}

function shotBloom(ctx, st, t) {
  const { W, H, U, accent } = st;
  ctx.fillStyle = "#fbf1e6";
  ctx.fillRect(-70, -70, W + 140, H + 140);
  const cx = W / 2;
  const cy = H * 0.5;

  // A small red flame hangs on the white, then opens to fill the frame.
  const flame = easeOutCubic(prog(t, T.finale + 0.06, T.bloom));
  const open = easeInCubic(prog(t, T.bloom - 0.05, T.field));
  const R = Math.hypot(W, H) * 1.05;
  const len = lerp(Math.min(W, H) * 0.32 * flame, R, open);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(lerp(-0.4, 0.75, open) + (t - T.finale) * 0.22);
  ctx.fillStyle = accent;
  const n = 6;
  for (let i = 0; i < n; i++) {
    ctx.save();
    ctx.rotate((i / n) * TAU + (i % 2 ? 0.1 : -0.06));
    const k = i % 2 ? 0.74 : 1;
    petal(ctx, len * k, len * lerp(0.2, 0.62, open));
    ctx.fill();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, len * 0.16, 0, TAU);
  ctx.fill();
  ctx.restore();

  const s = t - T.bloom;
  if (s >= 0 && s < 0.5) sparks(ctx, cx, cy, s, 0.5, U * 1.4, 811, 24, 0.7);
}

// ---- 4. the lead lands ------------------------------------------------------
const groundY = (x) => lerp(0.58, 0.82, x);

function shotField(ctx, st, t) {
  const { W, H, U, accent } = st;
  ctx.fillStyle = accent;
  ctx.fillRect(-70, -70, W + 140, H + 140);
  fillPoly(ctx, W, H, INK, [[-0.06, groundY(-0.06)], [1.06, groundY(1.06)], [1.06, 1.08], [-0.06, 1.08]]);

  const allies = st.team.filter((_, i) => i !== st.leadIndex);
  allies.forEach((tok, i) => {
    const x = 0.085 + i * 0.125;
    const size = H * (0.3 + i * 0.035);
    const p = easeOutExpo(prog(t, T.field + 0.04 + i * 0.1, T.field + 0.3 + i * 0.1));
    if (p <= 0) return;
    const foot = groundY(x) * H + size * 0.04;
    ctx.save();
    ctx.translate(W * x, foot);
    ctx.scale(lerp(1.3, 1, p), p);
    ctx.drawImage(tok.black, -size / 2, -size * 0.93, size, size);
    ctx.restore();
  });

  // The defeated target lies far down the slope.
  const fallX = 0.93;
  const fall = easeOutCubic(prog(t, T.field, T.field + 0.34));
  sprite(ctx, st.target.black, W * fallX, groundY(fallX) * H - H * 0.035, H * 0.3, { rot: lerp(0.6, 1.5, fall) });

  const lead = st.team[st.leadIndex];
  const x = W * 0.58;
  const footY = H * 1.03;
  const size = Math.min(H * 1.12, W * 0.82);
  if (t >= T.drop - 0.14) {
    const landAt = T.drop + 0.04;
    if (t < landAt) {
      const p = easeInCubic(prog(t, T.drop - 0.14, landAt));
      const y = lerp(-size * 1.05, 0, p);
      for (let k = 4; k >= 1; k--) {
        ctx.save();
        ctx.globalAlpha = 0.16 * (5 - k);
        ctx.translate(x, footY + y - k * 46 * U);
        ctx.scale(0.86, 1.2);
        ctx.drawImage(lead.black, -size / 2, -size * 0.95, size, size);
        ctx.restore();
      }
      ctx.save();
      ctx.translate(x, footY + y);
      ctx.scale(0.86, 1.2);
      ctx.drawImage(lead.black, -size / 2, -size * 0.95, size, size);
      ctx.restore();
    } else {
      const d = t - landAt;
      // Deep crouch, a slow confident rise, then a slight settle.
      const rise = smooth(d, 0.1, T.stand - landAt);
      const crouch = lerp(0.46, 1, rise);
      const spread = lerp(1.36, 1, rise);
      const settle = Math.sin(clamp((t - T.stand) / 0.5) * Math.PI) * 0.012;
      const tilt = lerp(0.1, -0.025, rise) + settle;
      ctx.save();
      ctx.translate(x, footY);
      ctx.rotate(tilt);
      ctx.scale(spread, crouch * (1 + smooth(t, T.stand, T.card) * 0.012));
      ctx.drawImage(lead.black, -size / 2, -size * 0.95, size, size);
      ctx.restore();

      const q = prog(d, 0, 0.55);
      if (q < 1) {
        const gy = groundY(0.58) * H + 18 * U;
        ctx.save();
        ctx.translate(x, gy);
        ctx.rotate(Math.atan2((groundY(1) - groundY(0)) * H, W));
        ctx.scale(1, 0.16);
        ctx.strokeStyle = "#fff";
        ctx.globalAlpha = 1 - q;
        ctx.lineWidth = 18 * U * (1 - q);
        ctx.beginPath();
        ctx.arc(0, 0, W * 0.56 * easeOutExpo(q), 0, TAU);
        ctx.stroke();
        ctx.restore();
        sparks(ctx, x, gy, d, 0.55, U * 1.3, 919, 26, 0);
      }
    }
  }
}

// ---- 5. final card ---------------------------------------------------------
function shotCard(ctx, st, t) {
  const { W, H, U, accent } = st;
  const d = t - T.card;
  const lead = st.team[st.leadIndex];
  ctx.fillStyle = PAPER;
  ctx.fillRect(-70, -70, W + 140, H + 140);
  halftone(ctx, W, H, INK, 0.22, false);

  const left = easeOutExpo(clamp(d / 0.2));
  const right = easeOutExpo(clamp((d - 0.025) / 0.2));
  fillPoly(ctx, W, H, accent, [[-0.05, -0.05], [1.05, -0.05], [1.05, 0.24], [0.67, 0.38], [0.47, 0.21], [-0.05, 0.6]], (1 - right) * W * 1.1);
  fillPoly(ctx, W, H, INK, [[-0.05, 0.68], [0.52, 0.53], [1.05, 0.9], [1.05, 1.05], [-0.05, 1.05]], -(1 - left) * W * 1.1);
  halftone(ctx, W, H, "#000", 0.2, true);

  const m = Math.min(W, H);
  const sp = clamp((d - 0.05) / 0.22);
  if (sp > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(sp * 4);
    inkBlot(ctx, W * 0.27, H * 0.56, m * 0.56, 41, accent, sp);
    ctx.restore();
  }
  const starP = easeOutExpo(clamp((d - 0.03) / 0.3));
  if (starP > 0) {
    ctx.save();
    ctx.translate(W * 0.22, H * 0.32);
    ctx.rotate(lerp(-2.1, -0.14, starP));
    ctx.scale(starP, starP);
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

  const slam = clamp((d - 0.07) / 0.22);
  if (slam > 0) {
    const e = easeOutExpo(slam);
    const size = Math.min(H * 1.78, W * 1.04);
    const drawn = size * lerp(0.76, 1, e) * (1 + smooth(d, 0.28, 1.5) * 0.04);
    const x = lerp(W * 1.14, W > H ? W * 0.7 : W * 0.56, e);
    const y = H * 0.035 + drawn * 0.43;

    // Light fans out from behind the face.
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(x, H * 0.34);
    ctx.rotate(d * 0.22);
    ctx.fillStyle = `rgba(255,214,150,${0.2 * e})`;
    ctx.beginPath();
    const rays = Math.hypot(W, H);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * rays, Math.sin(a) * rays);
      ctx.lineTo(Math.cos(a + 0.12) * rays, Math.sin(a + 0.12) * rays);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
    bloom(ctx, x, H * 0.34, m * 1.5, 0.5 * e);

    if (slam < 1) {
      for (let k = 5; k >= 1; k--) {
        sprite(ctx, lead.white, x + k * 34 * U * (1 - e), y, drawn, { alpha: 0.14 * (1 - e) });
      }
    }
    sprite(ctx, lead.sticker, x, y, drawn, { rot: lerp(0.12, 0, e), alpha: clamp(slam * 4) });
    if (d < 0.32) sprite(ctx, lead.white, x, y, drawn, { rot: lerp(0.12, 0, e), alpha: 0.85 * (1 - smooth(d, 0.1, 0.32)) });
  }

  drawCaption(ctx, st, d);

  const n = clamp((d - 0.46) / 0.2);
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
    const p = clamp((d - 0.22 - i * 0.02) / 0.1);
    if (!blank && p > 0) {
      const s = lerp(2.3, 1, easeOutCubic(p));
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
// Full-screen flashes stay few and far apart for photosensitive players.
const FLASHES = [T.shatter, T.finale, T.card];

function shakeAt(t, U) {
  let amp = 0;
  for (const s of STRIKES) {
    const d = t - s.t;
    if (d >= 0 && d < 0.18) amp += 3.4 * Math.exp(-d / 0.035);
  }
  for (const [at, s] of [[T.shatter, 28], [T.lock, 8], [T.finale, 32], [T.drop + 0.04, 34], [T.card, 22]]) {
    const d = t - at;
    if (d >= 0 && d < 0.5) amp += s * Math.exp(-d / 0.09);
  }
  amp = Math.min(amp, 36) * U;
  const f = Math.floor(t * 60);
  return [(hash(f) - 0.5) * 2 * amp, (hash(f + 913) - 0.5) * 2 * amp];
}

export function render(ctx, st, t) {
  const { W, H } = st;
  detail = st.quality ?? 1;
  ctx.save();
  const [sx, sy] = shakeAt(t, st.U);
  ctx.translate(sx, sy);
  if (t < T.shatter) {
    shotGlass(ctx, st, t);
  } else if (t < T.assault) {
    shotLock(ctx, st, t);
    drawShards(ctx, st, t);
  } else if (t < T.finale) {
    shotAssault(ctx, st, t);
  } else if (t < T.field) {
    shotBloom(ctx, st, t);
  } else if (t < T.card) {
    shotField(ctx, st, t);
  } else {
    shotCard(ctx, st, t);
  }
  ctx.restore();

  for (const at of FLASHES) {
    const d = t - at;
    if (d >= 0 && d < 0.3) {
      ctx.fillStyle = `rgba(255,255,255,${Math.pow(1 - d / 0.3, 2)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  if (!(t >= T.finale && t < T.field)) {
    const vignette = layer(st, "vignette", (x) => {
      const v = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.hypot(W, H) * 0.62);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(1, "rgba(0,0,0,.3)");
      x.fillStyle = v;
      x.fillRect(0, 0, W, H);
    }, 0.5);
    ctx.drawImage(vignette, 0, 0, W, H);
  }

  // Film grain would only be lost in the motion of the rush.
  if (t < T.assault || t >= T.finale) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    const f = Math.floor(t * 18);
    ctx.translate((f * 37) % 160, (f * 71) % 160);
    ctx.fillStyle = grain(ctx);
    ctx.fillRect(-160, -160, W + 320, H + 320);
    ctx.restore();
  }

  if (t < T.glass - 0.12) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
  }
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
