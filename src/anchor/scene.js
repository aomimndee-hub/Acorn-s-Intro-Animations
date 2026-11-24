// Anchor: a two-tone (electric blue / white) lyric cutscene starring one token.
// Every frame is a pure function of the song's current time, so picture and
// music stay locked together for every viewer.
import { TAU, clamp, easeInCubic, easeOutCubic, easeOutExpo, hash, lerp, makeCanvas, prog, rng, smooth, supportsFilter } from "../cutscene/util.js";

export const BLUE = "#2410ff";
const BLUE_RGB = [36, 16, 255];
const LAV = "#8d7fff";
const PALE = "#ebe8ff";
const WHITE = "#fbfbfe";
const NAVY = "#0b0548";
const INKTXT = "#16112e";

const SERIF = '"Instrument Serif", "Cormorant Garamond", Georgia, serif';
const BOOK = '"EB Garamond", "Cormorant Garamond", Georgia, serif';
const JP = '"Noto Serif JP", "Hiragino Mincho ProN", "Yu Mincho", serif';

// The song runs at ~190 BPM; this grid drives every pulse and step.
const BEAT = 0.316;
const PHASE = 0.15;
const beatIndex = (t) => Math.floor((t - PHASE) / BEAT);
const beatPulse = (t, decay = 0.09) => Math.exp(-((((t - PHASE) % BEAT) + BEAT) % BEAT) / decay);

// Shot boundaries, in seconds of public/audio/anchor.mp3.
export const T = {
  name: 0.22,
  title: 1.4,
  globe: 2.2,
  sea: 2.95,
  words: 5.22,
  sky: 8.0,
  split: 9.7,
  rain: 10.22,
  hush: 12.22,
  forever: 12.95,
  shore: 16.4,
  wide: 17.12,
  dark: 17.9,
  emblem: 20.45,
  burst: 21.45,
  collide: 21.7,
  star: 22.22,
  film: 22.95,
  fire: 30.1, // the harpoon drops in from above
  hook: 30.9, // it catches the token
  anchor: 33.2,
  fall: 38.2,
  slit: 42.72,
  fade: 43.25,
  end: 46.7,
};

const FLASHES = [
  [T.sky, 0.35, 0.08], [T.rain, 0.3, 0.08], [T.emblem, 0.5, 0.1], [T.burst, 0.6, 0.08],
  [T.collide, 0.45, 0.08], [T.film, 0.45, 0.1], [T.anchor, 0.55, 0.1], [T.hook, 0.6, 0.12], [T.fall, 0.5, 0.1],
  [39.0, 0.9, 0.22],
];
const SHAKES = [
  [T.sea, 0.6, 0.15], [T.sky, 1, 0.12], [T.split, 0.5, 0.1], [T.rain, 0.6, 0.12], [T.shore, 0.6, 0.12],
  [T.emblem, 0.8, 0.12], [T.burst, 1.4, 0.15], [T.collide, 1.2, 0.12], [T.film, 0.8, 0.12],
  [T.anchor, 1.4, 0.18], [T.hook, 1.8, 0.22], [T.fall, 1.6, 0.18], [39.0, 0.8, 0.15],
];

function pulses(t, list) {
  let v = 0;
  for (const [t0, s, d] of list) {
    const dt = t - t0;
    if (dt >= 0 && dt < d * 6) v += s * Math.exp(-dt / d);
  }
  return v;
}

// ---- token sprites ----------------------------------------------------------

const tint = (src, color) => {
  const c = makeCanvas(src.width, src.height);
  const x = c.getContext("2d");
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
};

/**
 * The token in every look the cutscene needs: silhouettes in blue and white,
 * a blue/white duotone (high-contrast grey mapped onto blue), and a
 * blue-tinted full-colour copy for the underwater shot. None of this reads
 * pixels back, so tokens served without CORS headers still work.
 */
export function buildTokenSet(img) {
  const S = 640;
  const iw = img.naturalWidth || img.videoWidth || img.width;
  const ih = img.naturalHeight || img.videoHeight || img.height;
  const k = Math.min(S / iw, S / ih);
  const base = makeCanvas(S, S);
  base.getContext("2d").drawImage(img, (S - iw * k) / 2, (S - ih * k) / 2, iw * k, ih * k);

  const duo = makeCanvas(S, S);
  const d = duo.getContext("2d");
  if (supportsFilter) {
    d.fillStyle = "#000";
    d.fillRect(0, 0, S, S);
    d.filter = "grayscale(1) contrast(2.6) brightness(1.15)";
    d.drawImage(base, 0, 0);
    d.filter = "none";
    d.globalCompositeOperation = "screen";
    d.fillStyle = BLUE;
    d.fillRect(0, 0, S, S);
    d.globalCompositeOperation = "destination-in";
    d.drawImage(base, 0, 0);
  } else {
    d.drawImage(tint(base, BLUE), 0, 0);
  }

  const sea = makeCanvas(S, S);
  const s = sea.getContext("2d");
  s.drawImage(base, 0, 0);
  s.globalCompositeOperation = "source-atop";
  s.fillStyle = "rgba(20,40,170,0.45)";
  s.fillRect(0, 0, S, S);

  // dark navy body that keeps a little of the token's own shading,
  // with violet light catching its upper-left edges
  const deep = makeCanvas(S, S);
  const dp = deep.getContext("2d");
  const rimC = tint(base, "#8f7dff");
  dp.globalAlpha = 0.9;
  dp.drawImage(rimC, -5, -6);
  dp.globalAlpha = 0.5;
  dp.drawImage(rimC, 4, -3);
  dp.globalAlpha = 1;
  const body = makeCanvas(S, S);
  const bx = body.getContext("2d");
  bx.drawImage(base, 0, 0);
  bx.globalCompositeOperation = "source-atop";
  bx.fillStyle = "rgba(14,12,52,0.82)";
  bx.fillRect(0, 0, S, S);
  const shade = bx.createLinearGradient(0, 0, S * 0.4, S);
  shade.addColorStop(0, "rgba(120,100,255,0.28)");
  shade.addColorStop(0.5, "rgba(40,30,140,0)");
  shade.addColorStop(1, "rgba(0,0,20,0.4)");
  bx.fillStyle = shade;
  bx.fillRect(0, 0, S, S);
  dp.drawImage(body, 0, 0);

  return { size: S, base, duo, sea, deep, blue: tint(base, BLUE), white: tint(base, "#fff"), navy: tint(base, NAVY) };
}

/** Token as a card turning in 3D: narrowed by cos(yaw) with a slight shear. */
function tok3(ctx, img, x, y, h, rot, yaw, alpha = 1) {
  if (!img || alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.transform(Math.cos(yaw), Math.sin(yaw) * 0.14, 0, 1, 0, 0);
  ctx.drawImage(img, -h / 2, -h / 2, h, h);
  ctx.restore();
}

function tok(ctx, img, x, y, h, rot = 0, flip = 1, alpha = 1) {
  if (!img || alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(flip, 1);
  ctx.drawImage(img, -h / 2, -h / 2, h, h);
  ctx.restore();
}

// ---- pre-rendered layers ----------------------------------------------------

function globeTexture(size) {
  const c = makeCanvas(size * 2, size);
  const x = c.getContext("2d");
  const r = rng(41);
  x.fillStyle = BLUE;
  for (let i = 0; i < 26; i++) {
    const cx = r() * size * 2;
    const cy = size * (0.15 + r() * 0.7);
    const blobs = 4 + Math.floor(r() * 7);
    for (let b = 0; b < blobs; b++) {
      const bx = cx + (r() - 0.5) * size * 0.35;
      const by = cy + (r() - 0.5) * size * 0.2;
      const rr = size * (0.02 + r() * 0.07);
      for (const ox of [0, -size * 2, size * 2]) {
        x.beginPath();
        x.ellipse(bx + ox, by, rr * 1.5, rr, r() * 3, 0, TAU);
        x.fill();
      }
    }
  }
  return c;
}

/** Ragged blue foam for the close shore shot. */
function foamLayer(W, H) {
  const c = makeCanvas(W, H);
  const x = c.getContext("2d");
  const r = rng(77);
  x.fillStyle = BLUE;
  // lower mass with a ragged top edge
  x.beginPath();
  x.moveTo(0, H);
  for (let i = 0; i <= 60; i++) {
    const px = (i / 60) * W;
    const base = lerp(0.38, 0.66, Math.pow(i / 60, 0.6));
    x.lineTo(px, H * (base + (r() - 0.5) * 0.05));
  }
  x.lineTo(W, H);
  x.fill();
  // upper-left wisps
  for (let i = 0; i < 220; i++) {
    const px = Math.pow(r(), 1.4) * W * 0.5;
    const py = H * (0.02 + r() * 0.42);
    const w = (14 + r() * 110) * (1 - px / (W * 0.55));
    if (w <= 2) continue;
    x.beginPath();
    x.ellipse(px, py, w / 2, 1.5 + r() * 7, (r() - 0.5) * 0.15, 0, TAU);
    x.fill();
  }
  // white holes in the foam
  x.fillStyle = WHITE;
  for (let i = 0; i < 90; i++) x.fillRect(r() * W * 0.6, H * (0.45 + r() * 0.5), 4 + r() * 40, 1 + r() * 3);
  return c;
}

/** Threshold-looking beach: white sky, dashed sea bands, dense pebbles. */
function beachLayer(W, H) {
  const c = makeCanvas(W, H);
  const x = c.getContext("2d");
  const r = rng(91);
  x.fillStyle = WHITE;
  x.fillRect(0, 0, W, H);
  x.fillStyle = BLUE;
  const horizon = H * 0.2;
  for (let row = 0; row < 220; row++) {
    const p = row / 220;
    const y = horizon + Math.pow(p, 1.5) * H * 0.85;
    const density = 0.25 + p * 0.75;
    const dashes = Math.floor(40 + p * 160);
    for (let i = 0; i < dashes; i++) {
      if (r() > density) continue;
      const w = (6 + r() * 60) * (1 - p * 0.6);
      x.fillRect(r() * W, y + (r() - 0.5) * 3, w, 1 + p * 3 * r());
    }
  }
  // foam bands across the sea
  x.fillStyle = WHITE;
  for (let b = 0; b < 3; b++) {
    const y = H * (0.36 + b * 0.09);
    for (let i = 0; i < 140; i++) x.fillRect(r() * W, y + (r() - 0.5) * H * 0.03, 10 + r() * 80, 2 + r() * 4);
  }
  return c;
}

function cloudLayer(seed) {
  const S = 512;
  const c = makeCanvas(S, S / 2);
  const x = c.getContext("2d");
  const r = rng(seed);
  for (let i = 0; i < 40; i++) {
    const px = S * (0.1 + r() * 0.8);
    const py = S * (0.12 + r() * 0.25);
    const rr = S * (0.04 + r() * 0.1);
    const g = x.createRadialGradient(px, py, 0, px, py, rr);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.82, "rgba(255,255,255,0.92)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.beginPath();
    x.arc(px, py, rr, 0, TAU);
    x.fill();
  }
  return c;
}

function paperGrain() {
  const S = 256;
  const c = makeCanvas(S, S);
  const x = c.getContext("2d");
  const img = x.createImageData(S, S);
  const r = rng(5);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 16;
  }
  x.putImageData(img, 0, 0);
  return c;
}

function fishSprite(blur) {
  const c = makeCanvas(160, 64);
  const x = c.getContext("2d");
  if (supportsFilter && blur) x.filter = `blur(${blur}px)`;
  x.fillStyle = "rgba(6,10,34,0.92)";
  x.beginPath();
  x.moveTo(140, 32);
  x.quadraticCurveTo(118, 14, 70, 18);
  x.quadraticCurveTo(44, 22, 36, 32);
  x.quadraticCurveTo(44, 42, 70, 46);
  x.quadraticCurveTo(118, 50, 140, 32);
  x.fill();
  x.beginPath();
  x.moveTo(40, 32);
  x.lineTo(14, 16);
  x.lineTo(20, 32);
  x.lineTo(14, 48);
  x.closePath();
  x.fill();
  return c;
}

/** Layers that depend on the screen size are cached per size. */
function layers(st) {
  const key = `${st.W}x${st.H}`;
  if (st._layersKey === key) return st._layers;
  const w = Math.min(1600, Math.round(st.W));
  const h = Math.round((w * st.H) / st.W);
  st._layers = {
    foam: foamLayer(w, h),
    beach: beachLayer(w, h),
    globe: st._layers?.globe || globeTexture(256),
    clouds: st._layers?.clouds || [cloudLayer(3), cloudLayer(8), cloudLayer(14)],
    grain: st._layers?.grain || paperGrain(),
    fish: st._layers?.fish || [fishSprite(0.6), fishSprite(2.2), fishSprite(5)],
  };
  st._layersKey = key;
  return st._layers;
}

// ---- drawing helpers ----------------------------------------------------------

function fill(ctx, W, H, color) {
  ctx.fillStyle = color;
  ctx.fillRect(-W, -H, W * 3, H * 3);
}

function text(ctx, str, x, y, size, opts = {}) {
  if ((opts.alpha ?? 1) <= 0.01 || !str) return 0;
  ctx.save();
  ctx.globalAlpha *= opts.alpha ?? 1;
  ctx.translate(x, y);
  if (opts.rot) ctx.rotate(opts.rot);
  ctx.font = `${opts.style || ""} ${opts.weight || 400} ${size}px ${opts.font || SERIF}`;
  ctx.textAlign = opts.align || "center";
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${(opts.spacing || 0) * size}px`;
  if (opts.glow) {
    ctx.shadowColor = opts.glow;
    ctx.shadowBlur = size * 0.35;
  }
  ctx.fillStyle = opts.color || BLUE;
  ctx.fillText(str, 0, 0);
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

/** Four-point sparkle. */
function star4(ctx, x, y, r, rot, color, waist = 0.16) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    const rr = i % 2 ? r * waist : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function letterbox(ctx, W, H, top, bottom = top) {
  ctx.fillStyle = "#000";
  if (top > 0) ctx.fillRect(0, 0, W, top);
  if (bottom > 0) ctx.fillRect(0, H - bottom, W, bottom);
}

/** A ship's anchor, ring at the top, flukes at the bottom. */
function drawAnchor(ctx, x, y, s, rot, color, detail = WHITE) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // ring
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.arc(0, -s * 0.88, s * 0.11, 0, TAU);
  ctx.stroke();
  // stock with knobs
  ctx.fillRect(-s * 0.42, -s * 0.68, s * 0.84, s * 0.1);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * s * 0.45, -s * 0.63, s * 0.07, 0, TAU);
    ctx.fill();
  }
  // shank
  ctx.beginPath();
  ctx.moveTo(-s * 0.08, -s * 0.76);
  ctx.lineTo(s * 0.08, -s * 0.76);
  ctx.lineTo(s * 0.1, s * 0.62);
  ctx.lineTo(-s * 0.1, s * 0.62);
  ctx.closePath();
  ctx.fill();
  // arms
  ctx.lineWidth = s * 0.13;
  ctx.beginPath();
  ctx.arc(0, s * 0.18, s * 0.52, Math.PI * 0.12, Math.PI * 0.88);
  ctx.stroke();
  // flukes
  for (const side of [-1, 1]) {
    const fx = Math.cos(side > 0 ? Math.PI * 0.12 : Math.PI * 0.88) * s * 0.52;
    const fy = s * 0.18 + Math.sin(Math.PI * 0.12) * s * 0.52;
    ctx.beginPath();
    ctx.moveTo(fx - side * s * 0.08, fy + s * 0.04);
    ctx.lineTo(fx + side * s * 0.14, fy - s * 0.32);
    ctx.lineTo(fx + side * s * 0.22, fy + s * 0.06);
    ctx.closePath();
    ctx.fill();
  }
  // crown
  ctx.beginPath();
  ctx.moveTo(-s * 0.16, s * 0.62);
  ctx.lineTo(0, s * 0.8);
  ctx.lineTo(s * 0.16, s * 0.62);
  ctx.closePath();
  ctx.fill();
  // engraved highlights
  ctx.strokeStyle = detail;
  ctx.globalAlpha *= 0.7;
  ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.beginPath();
  ctx.moveTo(-s * 0.03, -s * 0.6);
  ctx.lineTo(-s * 0.04, s * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, s * 0.18, s * 0.5, Math.PI * 0.2, Math.PI * 0.45);
  ctx.stroke();
  ctx.restore();
}

function chain(ctx, x0, y0, x1, y1, link, color) {
  const L = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.ceil(L / (link * 0.85));
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = link * 0.2;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    ctx.save();
    ctx.translate(lerp(x0, x1, p), lerp(y0, y1, p));
    ctx.rotate(a);
    ctx.beginPath();
    if (i % 2) ctx.ellipse(0, 0, link * 0.55, link * 0.1, 0, 0, TAU);
    else ctx.ellipse(0, 0, link * 0.55, link * 0.3, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** Draws the magic circle at rest; used as the 3D disc's texture. */
export const drawCircleTexture = (ctx, x, y, r) => magicCircle(ctx, x, y, r, 0, BLUE);

function magicCircle(ctx, x, y, r, t, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.globalAlpha *= 0.75;
  ctx.rotate(t * 0.4);
  ctx.lineWidth = Math.max(1, r * 0.012);
  for (const k of [1, 0.88, 0.62]) {
    ctx.beginPath();
    ctx.arc(0, 0, r * k, 0, TAU);
    ctx.stroke();
  }
  // hexagram
  for (let tri = 0; tri < 2; tri++) {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = tri * Math.PI / 3 + (i / 3) * TAU - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62);
    }
    ctx.closePath();
    ctx.stroke();
  }
  // glyph band
  ctx.font = `${r * 0.09}px ${BOOK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const glyphs = "ANCHORMEINYOURSKY·HOLDMEWHERETHESTORMCANTFIND·";
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * TAU;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(0, -r * 0.94);
    ctx.fillText(glyphs[i % glyphs.length], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

function umbrella(ctx, x, y, w, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const h = w * 0.3;
  ctx.beginPath();
  ctx.moveTo(-w / 2, h * 0.55);
  ctx.quadraticCurveTo(-w * 0.42, -h * 0.9, 0, -h);
  ctx.quadraticCurveTo(w * 0.42, -h * 0.9, w / 2, h * 0.55);
  for (let i = 4; i >= 0; i--) {
    const x0 = -w / 2 + (w / 5) * (i + 1);
    const x1 = -w / 2 + (w / 5) * i;
    ctx.quadraticCurveTo((x0 + x1) / 2, h * 0.3, x1, h * 0.55);
  }
  ctx.closePath();
  ctx.fillStyle = BLUE;
  ctx.fill();
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = Math.max(1.5, w * 0.008);
  ctx.stroke();
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = Math.max(2, w * 0.012);
  ctx.beginPath();
  ctx.moveTo(0, -h * 1.12);
  ctx.lineTo(0, -h);
  ctx.moveTo(w * 0.02, h * 0.4);
  ctx.lineTo(w * 0.06, h * 3.1);
  ctx.stroke();
  ctx.restore();
}

function waveform(ctx, x0, x1, cy, amp, t, color) {
  ctx.save();
  const g = ctx.createLinearGradient(0, cy - amp * 1.6, 0, cy + amp * 1.6);
  g.addColorStop(0, "rgba(74,56,255,0)");
  g.addColorStop(0.32, "rgba(74,56,255,0.55)");
  g.addColorStop(0.5, color);
  g.addColorStop(0.68, "rgba(74,56,255,0.55)");
  g.addColorStop(1, "rgba(74,56,255,0)");
  ctx.fillStyle = g;
  const step = 1.6;
  const frame = Math.floor(t * 30);
  for (let x = x0; x < x1; x += step) {
    const i = Math.floor(x / step);
    const r = hash(i * 7 + frame * 131);
    const r2 = hash(i * 13 + frame * 71);
    const env = 0.45 + 0.55 * Math.sin(((x - x0) / (x1 - x0)) * Math.PI);
    const h = amp * (0.2 + 1.4 * r * r * r + 0.3 * r2) * env;
    ctx.globalAlpha = 0.35 + 0.6 * r2;
    ctx.fillRect(x, cy - h, 1, h * 2);
  }
  ctx.restore();
}

/** Blue film strip with notched sprocket holes and a bulging inner edge. */
function filmStrip(ctx, W, H, side, width, offset, U) {
  const outer = side < 0 ? 0 : W;
  const inner = outer - side * width;
  const bulge = side * -width * 0.18;
  ctx.save();
  ctx.fillStyle = BLUE;
  ctx.beginPath();
  ctx.moveTo(outer, -10);
  ctx.lineTo(inner, -10);
  ctx.quadraticCurveTo(inner + bulge, H / 2, inner, H + 10);
  ctx.lineTo(outer, H + 10);
  ctx.closePath();
  ctx.fill();
  // sprockets
  const gap = H * 0.115;
  const hw = width * 0.32;
  const hh = H * 0.045;
  const cx = outer - side * width * 0.42;
  ctx.fillStyle = WHITE;
  for (let y = -gap + (offset % gap); y < H + gap; y += gap) {
    const bend = Math.sin((y / H) * Math.PI) * bulge * 0.35;
    const x = cx + bend;
    ctx.beginPath();
    ctx.moveTo(x - hw / 2, y - hh / 2);
    ctx.lineTo(x + hw / 2, y - hh / 2);
    ctx.lineTo(x + hw / 2, y + hh / 2);
    ctx.lineTo(x + hw * 0.3, y + hh / 2);
    ctx.lineTo(x + hw * 0.3, y + hh * 0.05);
    ctx.lineTo(x - hw * 0.3, y + hh * 0.05);
    ctx.lineTo(x - hw * 0.3, y + hh / 2);
    ctx.lineTo(x - hw / 2, y + hh / 2);
    ctx.closePath();
    ctx.fill();
  }
  // thin frame line in the white area
  ctx.strokeStyle = "rgba(60,60,90,0.35)";
  ctx.lineWidth = Math.max(1, U);
  ctx.beginPath();
  ctx.moveTo(inner - side * width * 0.14, 0);
  ctx.quadraticCurveTo(inner - side * width * 0.14 + bulge * 0.6, H / 2, inner - side * width * 0.14, H);
  ctx.stroke();
  ctx.restore();
}

// ---- shots -------------------------------------------------------------------

function shotName(ctx, st, t) {
  const { W, H } = st;
  const name = (st.name || "").toUpperCase();
  let bg = BLUE;
  if (t >= 0.5) {
    const p = smooth(t, 0.5, 0.8);
    bg = p < 0.5 ? LAV : p < 0.85 ? PALE : WHITE;
  }
  fill(ctx, W, H, bg);
  const size = H * 0.055;
  const onBlue = t < 0.5;
  const color = onBlue ? "#1a06b8" : BLUE;
  const glitch = t > 1.2;
  if (!glitch) {
    text(ctx, name, W / 2, H * 0.5, size, { color, spacing: 0.06, alpha: onBlue ? 0.75 : 1, glow: onBlue ? "rgba(10,0,120,0.6)" : null });
  } else {
    // slice glitch on the way out
    const slices = 7;
    const a = 1 - smooth(t, 1.3, 1.4);
    for (let i = 0; i < slices; i++) {
      const y0 = H * 0.5 - size * 0.6 + (i / slices) * size * 1.2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y0, W, (size * 1.2) / slices + 1);
      ctx.clip();
      const dx = (hash(i * 13 + Math.floor(t * 30)) - 0.5) * size * 3 * smooth(t, 1.2, 1.35);
      text(ctx, name, W / 2 + dx, H * 0.5, size, { color, spacing: 0.06, alpha: a });
      ctx.restore();
    }
  }
  if (t > 0.45 && t < 1.38) {
    const bar = H * 0.1 * smooth(t, 0.45, 0.6) * (1 - smooth(t, 1.2, 1.38));
    letterbox(ctx, W, H, bar * 0.35, bar);
  }
}

function shotTitle(ctx, st, t) {
  const { W, H, U } = st;
  fill(ctx, W, H, WHITE);
  const lt = t - T.title;
  const size = H * 0.075;
  const p = easeOutCubic(prog(lt, 0, 0.45));
  const zoom = 1 + lt * 0.05;
  const fade = 1 - smooth(t, T.globe - 0.12, T.globe);
  ctx.save();
  ctx.translate(W / 2, H * 0.48);
  ctx.scale(zoom, zoom);
  // written-in reveal, left to right
  ctx.font = `400 ${size}px ${SERIF}`;
  const w = ctx.measureText(st.title).width * 1.15;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-w / 2 - size, -size, (w + size * 2) * p, size * 2);
  ctx.clip();
  const first = st.title.charAt(0);
  const rest = st.title.slice(1);
  ctx.font = `400 ${size * 1.3}px ${SERIF}`;
  const fw = ctx.measureText(first).width;
  ctx.font = `400 ${size}px ${SERIF}`;
  const rw = ctx.measureText(rest).width;
  const x0 = -(fw + rw) / 2;
  text(ctx, first, x0, -size * 0.05, size * 1.3, { align: "left", alpha: fade });
  text(ctx, rest, x0 + fw, 0, size, { align: "left", alpha: fade, spacing: 0.02 });
  ctx.restore();
  // cursive swash drawn with the pen
  const swash = prog(lt, 0.05, 0.6);
  if (swash > 0) {
    ctx.save();
    ctx.globalAlpha = 0.55 * fade;
    ctx.strokeStyle = LAV;
    ctx.lineWidth = Math.max(1.2, 1.6 * U);
    ctx.lineCap = "round";
    const len = size * 9;
    ctx.setLineDash([len, len]);
    ctx.lineDashOffset = len * (1 - swash);
    ctx.beginPath();
    ctx.moveTo(-(fw + rw) / 2 - size * 0.4, size * 0.7);
    ctx.bezierCurveTo(-size * 2.2, size * 1.3, -size * 2.6, -size * 0.2, -size * 1.2, size * 0.1);
    ctx.bezierCurveTo(size * 0.3, size * 0.6, size * 1.5, -size * 0.9, (fw + rw) / 2 + size * 0.1, -size * 0.75);
    ctx.bezierCurveTo((fw + rw) / 2 + size * 0.6, -size * 0.9, (fw + rw) / 2 + size * 0.1, -size * 0.2, (fw + rw) / 2 - size * 0.3, -size * 0.45);
    ctx.stroke();
    ctx.restore();
  }
  text(ctx, st.kana, size * 0.15, size * 0.62, size * 0.32, { font: JP, alpha: smooth(lt, 0.3, 0.55) * fade, spacing: 0.05 });
  ctx.restore();
}

function shotGlobe(ctx, st, t) {
  const { W, H, U } = st;
  fill(ctx, W, H, WHITE);
  const lt = t - T.globe;
  const L = layers(st);
  const appear = easeOutExpo(prog(lt, 0, 0.18));
  const leave = smooth(t, 2.6, 2.75);
  const R = H * 0.12 * appear * (1 - leave * 0.9);
  if (R < 1) return;
  const cx = W / 2;
  const cy = H * 0.5;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(lt * 0.8 + leave * 2);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.clip();
  ctx.fillStyle = WHITE;
  ctx.fillRect(-R, -R, R * 2, R * 2);
  const tex = L.globe;
  const scroll = ((lt * 0.6) % 1) * R * 2;
  ctx.drawImage(tex, -R - scroll, -R, R * 4, R * 2);
  ctx.drawImage(tex, -R - scroll + R * 4, -R, R * 4, R * 2);
  ctx.restore();
  // brush ring strokes
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = BLUE;
  ctx.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    const a0 = hash(i * 7) * TAU - lt * (1.5 + i * 0.2);
    ctx.lineWidth = (2 + hash(i * 3) * 9) * U * appear;
    ctx.beginPath();
    ctx.arc(0, 0, R * (1.02 + hash(i * 5) * 0.12), a0, a0 + 0.4 + hash(i) * 1.4);
    ctx.stroke();
  }
  ctx.restore();
}

/** One fish of the school; depth 0 (far, blurred, small) to 1 (near). */
function drawFish(ctx, L, x, y, len, ang, depth, alpha) {
  const img = depth < 0.35 ? L.fish[2] : depth > 0.8 ? L.fish[0] : L.fish[1];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.drawImage(img, -len * 0.55, -len * 0.2, len, len * 0.4);
  ctx.restore();
}

function shotSeaGL(ctx, st, t) {
  const { W, H, U } = st;
  const lt = t - T.sea;
  const L = layers(st);
  const bloom = smooth(t, 4.82, T.words);
  st.three.sea(W, H, st.dpr3, t, bloom);
  // slow push in toward the character
  const zoom = 1 + lt * 0.025;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H / 2);
  ctx.drawImage(st.three.canvas, -W * 0.02, -H * 0.02, W * 1.04, H * 1.04);
  ctx.restore();

  // marine snow drifting through the light
  for (let i = 0; i < 70; i++) {
    const depth = hash(i * 29);
    const x = ((hash(i * 17) + lt * 0.006 * (hash(i * 3) - 0.5)) % 1) * W;
    const y = ((((hash(i * 19) - lt * 0.012 * (0.4 + depth)) % 1) + 1) % 1) * H;
    ctx.fillStyle = `rgba(210,228,255,${(0.12 + 0.4 * depth) * (1 - bloom)})`;
    ctx.beginPath();
    ctx.arc(x, y, (0.5 + depth * 1.8) * U, 0, TAU);
    ctx.fill();
  }

  // the school: a ribbon of fish streaming past the character toward the lower right
  const cx = W * 0.49;
  const cy = H * 0.47 + Math.sin(t * 1.3) * H * 0.008;
  const school = (front) => {
    for (let i = 0; i < 34; i++) {
      const depth = hash(i * 41);
      if ((depth > 0.55) !== front) continue;
      const u = (hash(i * 7) + lt * (0.05 + depth * 0.03)) % 1;
      const along = lerp(-0.1, 1.15, u);
      const bx = cx + W * (0.06 + along * 0.38);
      const by = cy - H * 0.1 + along * H * 0.42 + Math.sin(along * 4 + i) * H * 0.02;
      const spread = (hash(i * 13) - 0.5) * H * (0.06 + along * 0.14);
      const len = (24 + depth * 46) * U;
      const wiggle = Math.sin(t * 9 + i) * 0.08;
      const fade = clamp(u * 6) * clamp((1 - u) * 5);
      const a = fade * (0.55 + depth * 0.45) * (1 - bloom * 0.4);
      // a faint trailing copy reads as motion blur
      drawFish(ctx, L, bx + spread * 0.4 - len * 0.18, by + spread - len * 0.14, len, 0.72 + wiggle, depth * 0.5, a * 0.35);
      drawFish(ctx, L, bx + spread * 0.4, by + spread, len, 0.72 + wiggle, depth, a);
    }
  };
  school(false);

  // title, slightly soft as if seen through water
  const titleA = smooth(lt, 0, 0.3) * (1 - bloom);
  text(ctx, st.title, W / 2, H * 0.3, H * 0.1, { color: "rgba(244,248,255,0.92)", glow: "rgba(180,210,255,0.85)", spacing: 0.005, alpha: titleA });

  // the character: dark against the water, lit violet from above
  tok(ctx, st.tok.deep, cx, cy, H * 0.3, -0.22 + Math.sin(t * 0.9) * 0.07);
  school(true);
}

function shotSea(ctx, st, t) {
  if (st.three) return shotSeaGL(ctx, st, t);
  const { W, H, U } = st;
  const lt = t - T.sea;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1b3fc2");
  g.addColorStop(0.55, "#2c5fd8");
  g.addColorStop(1, "#3f72e0");
  ctx.fillStyle = g;
  ctx.fillRect(-W, -H, W * 3, H * 3);
  // light from the surface
  const lg = ctx.createRadialGradient(W / 2, -H * 0.1, 0, W / 2, -H * 0.1, H * 0.9);
  lg.addColorStop(0, "rgba(160,200,255,0.55)");
  lg.addColorStop(1, "rgba(160,200,255,0)");
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);
  // shafts
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 6; i++) {
    const x = W * (0.3 + i * 0.08) + Math.sin(t * 0.7 + i) * W * 0.02;
    const sg = ctx.createLinearGradient(x, 0, x, H * 0.7);
    sg.addColorStop(0, "rgba(140,190,255,0.12)");
    sg.addColorStop(1, "rgba(140,190,255,0)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(x - W * 0.01, 0);
    ctx.lineTo(x + W * 0.01, 0);
    ctx.lineTo(x + W * 0.06, H * 0.7);
    ctx.lineTo(x - W * 0.03, H * 0.7);
    ctx.fill();
  }
  ctx.restore();
  // caustic floor in perspective
  ctx.save();
  ctx.strokeStyle = "rgba(220,235,255,0.28)";
  for (let row = 0; row < 26; row++) {
    const p = row / 26;
    const y = H * (0.66 + Math.pow(p, 1.6) * 0.36);
    ctx.lineWidth = (0.6 + p * 2.2) * U;
    ctx.beginPath();
    for (let x = -20; x <= W + 20; x += 18) {
      const yy = y + Math.sin(x * 0.012 * (1.4 - p) + t * 2.1 + row) * (2 + p * 7) * U;
      if (x === -20) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
  // title
  text(ctx, st.title, W / 2, H * 0.31, H * 0.085, { color: "#f4f6ff", glow: "rgba(200,220,255,0.9)", spacing: 0.01, alpha: smooth(lt, 0, 0.25) });
  // the token, floating
  const bob = Math.sin(t * 1.6) * H * 0.012;
  tok(ctx, st.tok.sea, W * 0.49, H * 0.5 + bob, H * 0.3, -0.18 + Math.sin(t * 0.9) * 0.08);
  // school of fish
  ctx.save();
  ctx.fillStyle = "rgba(8,14,60,0.78)";
  for (let i = 0; i < 24; i++) {
    const u = ((i / 24 + lt * 0.07 + hash(i) * 0.08) % 1);
    const px = lerp(W * 0.56, W * 0.92, u) + Math.sin(u * 9 + i) * W * 0.02;
    const py = lerp(H * 0.46, H * 0.82, u) + (hash(i * 3) - 0.5) * H * 0.12;
    const s = (8 + hash(i * 5) * 8) * U * (0.7 + u * 0.6);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(0.55 + Math.sin(t * 6 + i) * 0.15);
    ctx.globalAlpha = 0.5 + 0.5 * hash(i * 9);
    ctx.beginPath();
    ctx.ellipse(0, 0, s, s * 0.32, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, 0);
    ctx.lineTo(-s * 1.5, -s * 0.4);
    ctx.lineTo(-s * 1.5, s * 0.4);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  // bubbles
  ctx.fillStyle = "rgba(230,240,255,0.5)";
  for (let i = 0; i < 30; i++) {
    const x = W * hash(i * 17);
    const y = ((((hash(i * 19) - lt * 0.08 * (0.5 + hash(i))) % 1) + 1) % 1) * H;
    ctx.beginPath();
    ctx.arc(x, y, (1 + hash(i * 23) * 2.5) * U, 0, TAU);
    ctx.fill();
  }
  // bloom into white
  const bloom = smooth(t, 4.85, T.words);
  if (bloom > 0) {
    const R = Math.max(W, H) * (0.2 + bloom * 1.2);
    const bg = ctx.createRadialGradient(W / 2, H * 0.48, 0, W / 2, H * 0.48, R);
    bg.addColorStop(0, `rgba(255,255,255,${bloom})`);
    bg.addColorStop(0.5, `rgba(235,245,255,${bloom * 0.8})`);
    bg.addColorStop(1, "rgba(235,245,255,0)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
  }
}

const WORDS = [
  { s: "ME", t0: 5.22, t1: 6.15, x: 0.5, y: 0.5, k: 1 },
  { s: "IN", t0: 6.15, t1: 6.55, x: 0.21, y: 0.5, k: 1 },
  { s: "IN", t0: 6.55, t1: 7.0, x: 0.44, y: 0.5, k: 1 },
  { s: "IN YOUR", t0: 7.0, t1: 7.48, x: 0.5, y: 0.5, k: 1 },
  { s: "IN YOUR", t0: 7.48, t1: 8.0, x: 0.48, y: 0.56, k: 0.85 },
];

function dustSpecks(ctx, W, H, t, U, color, n = 44) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const x = ((hash(i * 3) + t * 0.006 * (hash(i * 7) - 0.5)) % 1) * W;
    const y = ((hash(i * 5) + t * 0.01 * hash(i * 11)) % 1) * H;
    ctx.globalAlpha = 0.25 + 0.5 * hash(i * 13);
    ctx.beginPath();
    ctx.arc(x, y, (0.6 + hash(i * 17) * 1.4) * U, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function shotWords(ctx, st, t) {
  const { W, H, U } = st;
  fill(ctx, W, H, WHITE);
  dustSpecks(ctx, W, H, t, U, "#1b1640");
  for (const w of WORDS) {
    if (t < w.t0 || t >= w.t1) continue;
    const lt = t - w.t0;
    const flick = lt < 0.08 ? (hash(Math.floor(lt * 60) + w.t0 * 100) > 0.4 ? 1 : 0.2) : 1;
    const zoom = 1 + lt * 0.05;
    text(ctx, w.s, W * w.x, H * w.y, H * 0.058 * w.k * zoom, { alpha: flick, spacing: 0.01 });
  }
}

function shotSky(ctx, st, t) {
  const { W, H, U } = st;
  const lt = t - T.sky;
  fill(ctx, W, H, WHITE);
  const split = easeInCubic(prog(t, T.split, T.rain));
  const three = st.three;
  if (three) three.city(W, H, st.dpr3, lt);
  const drawCity = () => {
    if (three) {
      ctx.drawImage(three.canvas, 0, 0, W, H);
    } else {
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(-0.32 + lt * 0.02);
      ctx.scale(1.15 + lt * 0.04, 1.15 + lt * 0.04);
      ctx.translate(-W / 2, -H / 2);
      ctx.fillStyle = BLUE;
      ctx.beginPath();
      ctx.moveTo(W * 0.2, -H * 0.6);
      ctx.lineTo(W * 0.78, -H * 0.6);
      ctx.lineTo(W * 0.74, H * 1.5);
      ctx.lineTo(W * 0.3, H * 1.5);
      ctx.closePath();
      ctx.fill();
      for (const [x, w] of [[0.83, 0.07], [0.95, 0.05], [0.06, 0.03]]) ctx.fillRect(W * x, -H, W * w, H * 3);
      ctx.restore();
    }
    // kana and title
    text(ctx, st.kana, W * 0.62, H * 0.07, H * 0.045, { font: JP, color: three ? BLUE : WHITE, spacing: 0.04 });
    text(ctx, "SKY", W * 0.52, H * 0.42, H * 0.17, { style: "italic", color: "#06021c", spacing: -0.02 });
    // the token as a white cut-out
    tok(ctx, st.tok.white, W * 0.5, H * 0.6, H * 0.26, Math.sin(t * 2) * 0.04);
  };
  if (split <= 0) {
    drawCity();
  } else {
    const gap = split * H * 0.9 + H * 0.012;
    for (const [y0, y1, dy] of [[0, H / 2, -gap / 2], [H / 2, H, gap / 2]]) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y0 + dy, W, y1 - y0);
      ctx.clip();
      ctx.translate(0, dy);
      drawCity();
      ctx.restore();
    }
    text(ctx, "Hold me", W / 2, H * 0.5, H * 0.03, { font: BOOK, color: INKTXT, alpha: smooth(t, T.split, T.split + 0.08) });
  }
}

function shotRain(ctx, st, t) {
  const { W, H, U } = st;
  const lt = t - T.rain;
  fill(ctx, W, H, WHITE);
  const zoom = 1.08 - 0.06 * easeOutCubic(prog(lt, 0, 2));
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H / 2);
  // drop rings behind
  ctx.strokeStyle = "rgba(60,60,110,0.35)";
  ctx.lineWidth = Math.max(1, U);
  for (let i = 0; i < 4; i++) {
    const cx = W * (0.42 + hash(i * 3) * 0.3) + Math.sin(t * 0.6 + i) * W * 0.03;
    const cy = H * (0.25 + hash(i * 7) * 0.3);
    ctx.beginPath();
    ctx.arc(cx, cy, H * (0.1 + hash(i * 11) * 0.12) * (1 + lt * 0.08), 0, TAU);
    ctx.stroke();
  }
  // the token under the umbrella
  tok(ctx, st.tok.blue, W * 0.46, H * 0.8, H * 0.62);
  umbrella(ctx, W * 0.52, H * 0.2, W * 0.34, -0.08 + Math.sin(t * 1.4) * 0.02);
  ctx.restore();
  // rain
  ctx.strokeStyle = "rgba(36,16,255,0.55)";
  for (let i = 0; i < 46; i++) {
    const x = W * hash(i * 13);
    const len = H * (0.06 + hash(i * 17) * 0.18);
    const y = (((hash(i * 19) + lt * (1.6 + hash(i) * 1.2)) % 1.3) - 0.2) * H;
    ctx.lineWidth = Math.max(0.8, (0.6 + hash(i * 23)) * U);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * 0.03, y + len);
    ctx.stroke();
  }
  text(ctx, "where the storm can't find", W * 0.84, H * 0.5, H * 0.032, { font: BOOK, spacing: 0.01, alpha: smooth(lt, 0.05, 0.3) });
}

function shotHush(ctx, st, t) {
  const { W, H, U } = st;
  fill(ctx, W, H, "#000");
  const lt = t - T.hush;
  const a = 1 - smooth(lt, 0.3, 0.7);
  ctx.strokeStyle = `rgba(36,16,255,${0.4 * a})`;
  ctx.lineWidth = U;
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.47, H * 0.16, 0, TAU);
  ctx.stroke();
  star4(ctx, W / 2, H * 0.47, H * 0.012 * a, lt, `rgba(80,60,255,${a})`);
}

function flower(ctx, x, y, r, rot, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha *= alpha;
  for (let i = 0; i < 7; i++) {
    ctx.save();
    ctx.rotate((i / 7) * TAU);
    ctx.fillStyle = i % 2 ? "rgba(140,140,150,0.55)" : "rgba(170,170,180,0.4)";
    ctx.beginPath();
    ctx.ellipse(r * 0.9, 0, r * 0.55, r * 0.14, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  for (let i = 0; i < 9; i++) {
    ctx.save();
    ctx.rotate((i / 9) * TAU + 0.3);
    const g = ctx.createLinearGradient(0, 0, r * 0.7, 0);
    g.addColorStop(0, "#1a0a90");
    g.addColorStop(1, "#5b4bff");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(r * 0.35, 0, r * 0.38, r * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#0b0640";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.14, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function shotForever(ctx, st, t) {
  const { W, H, U } = st;
  const lt = t - T.forever;
  fill(ctx, W, H, "#000");
  const vig = 1 - smooth(lt, 0.15, 0.45);
  if (vig > 0) {
    const g = ctx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, Math.hypot(W, H) * 0.55);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, `rgba(130,130,135,${vig})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  const y = lerp(H * 0.12, H * 0.38, easeOutCubic(prog(lt, 0, 1.4)));
  const dim = 1 - 0.45 * smooth(lt, 1.6, 3.4);
  flower(ctx, W / 2, y - H * 0.01, H * 0.055, lt * 0.25, 0.55 * dim);
  const blue = smooth(lt, 0.2, 0.6);
  const col = `rgb(${Math.round(lerp(245, 92, blue))},${Math.round(lerp(245, 72, blue))},255)`;
  text(ctx, "If forever's", W / 2, y, H * 0.05, { font: BOOK, weight: 600, color: col, alpha: dim, glow: "rgba(70,50,255,0.9)" });
  // faint drifting motes
  ctx.fillStyle = "rgba(70,50,255,0.5)";
  for (let i = 0; i < 18; i++) {
    const x = W * hash(i * 31) + Math.sin(t * 0.5 + i) * 10 * U;
    const yy = ((hash(i * 37) - lt * 0.015) % 1 + 1) % 1 * H;
    ctx.globalAlpha = 0.2 + 0.4 * hash(i);
    ctx.fillRect(x, yy, 1.5 * U, 1.5 * U);
  }
  ctx.globalAlpha = 1;
}

function shotShore(ctx, st, t) {
  const { W, H, U } = st;
  const L = layers(st);
  if (t < T.wide) {
    fill(ctx, W, H, WHITE);
    const lt = t - T.shore;
    const drift = lt * W * 0.04;
    ctx.drawImage(L.foam, -drift - W * 0.02, 0, W * 1.06, H);
    text(ctx, "just a lie", W * 0.25, H * 0.52, H * 0.045, { font: BOOK, weight: 600, color: "#0a0818" });
    // whip pan into the wide shot
    const whip = smooth(t, T.wide - 0.16, T.wide);
    if (whip > 0) {
      ctx.fillStyle = BLUE;
      for (let i = 0; i < 40; i++) {
        const y = H * hash(i * 7);
        ctx.globalAlpha = whip * (0.3 + 0.7 * hash(i * 3));
        ctx.fillRect(0, y, W, (2 + hash(i * 5) * 14) * U * whip);
      }
      ctx.globalAlpha = 1;
    }
  } else {
    const lt = t - T.wide;
    const zoom = 1.02 + lt * 0.03;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(L.beach, 0, 0, W, H);
    // rock with a dithered shadow
    ctx.fillStyle = "rgba(20,10,120,0.45)";
    ctx.beginPath();
    ctx.ellipse(W * 0.47, H * 0.74, W * 0.2, H * 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = BLUE;
    ctx.beginPath();
    ctx.moveTo(W * 0.34, H * 0.68);
    ctx.lineTo(W * 0.37, H * 0.43);
    ctx.lineTo(W * 0.5, H * 0.38);
    ctx.lineTo(W * 0.6, H * 0.47);
    ctx.lineTo(W * 0.57, H * 0.72);
    ctx.lineTo(W * 0.42, H * 0.76);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.fillRect(W * 0.38, H * 0.6, W * 0.008, H * 0.08);
    tok(ctx, st.tok.duo, W * 0.66, H * 0.64, H * 0.28);
    star4(ctx, W * 0.5, H * 0.12, H * 0.012, 0, "#0a0818");
    ctx.restore();
    text(ctx, "just a lie", W * 0.5, H * 0.5, H * 0.05, { font: BOOK, weight: 600, color: "#0a0818" });
  }
  letterbox(ctx, W, H, H * 0.055, H * 0.06);
}

function shotEmblem(ctx, st, t) {
  const { W, H, U } = st;
  const lt = t - T.emblem;
  fill(ctx, W, H, WHITE);
  const burst = t >= T.burst;
  if (burst) {
    // manga speed lines, re-dealt every frame
    const frame = Math.floor(t * 24);
    ctx.save();
    ctx.translate(W / 2, H * 0.48);
    ctx.fillStyle = BLUE;
    for (let i = 0; i < 70; i++) {
      const a = hash(i * 7 + frame * 31) * TAU;
      const r0 = H * (0.32 + hash(i * 11 + frame) * 0.25);
      const len = Math.max(W, H) * (0.5 + hash(i * 13 + frame) * 0.6);
      const w = (1 + hash(i * 17 + frame) * 5) * U;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(r0, 0);
      ctx.lineTo(r0 + len, -w);
      ctx.lineTo(r0 + len, w);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  const punchK = burst ? 1 + 0.6 * Math.exp(-(t - T.burst) / 0.07) : 0;
  const three = st.three;
  if (three) {
    const [sx, sy] = three.emblem(W, H, st.dpr3, t, burst ? 0.55 + 0.45 * punchK : lt * 0.15);
    ctx.drawImage(three.canvas, 0, 0, W, H);
    const bob = Math.sin(t * 3) * H * 0.006;
    const th = H * (burst ? 0.34 : 0.3);
    for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
      tok(ctx, st.tok.white, sx + ox * U, sy - th * 0.3 + bob + oy * U, th, -0.12);
    }
    tok(ctx, st.tok.duo, sx, sy - th * 0.3 + bob, th, -0.12);
  } else {
    const punch = burst ? 1.12 + 0.1 * Math.exp(-(t - T.burst) / 0.06) : 1 + lt * 0.03;
    ctx.save();
    ctx.translate(W / 2, H * 0.5);
    ctx.scale(punch, punch);
    ctx.rotate(-0.08 + Math.sin(t * 1.5) * 0.03);
    magicCircle(ctx, -W * 0.03, -H * 0.12, H * 0.17, t, BLUE);
    drawAnchor(ctx, W * 0.03, H * 0.1, H * 0.3, -1.25, BLUE);
    tok(ctx, st.tok.blue, -W * 0.02, -H * 0.11, H * 0.28, 0.05);
    ctx.restore();
  }
}

function shotCollide(ctx, st, t) {
  const { W, H, U } = st;
  const lt = t - T.collide;
  fill(ctx, W, H, BLUE);
  tok(ctx, st.tok.white, W * 0.72 - lt * W * 0.04, H * 0.62, H * 1.35, -0.22);
  // HUD
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = Math.max(1, U);
  ctx.strokeRect(W * 0.44, H * 0.2, W * 0.15, H * 0.22);
  ctx.strokeRect(W * 0.41, H * 0.47, W * 0.06, H * 0.1);
  star4(ctx, W * 0.47, H * 0.45, H * 0.03 * (1 + beatPulse(t)), lt * 2, WHITE, 0.08);
  const count = t < 21.95 ? "11" : "12";
  text(ctx, count, W * 0.15, H * 0.28, H * 0.06, { font: BOOK, color: WHITE });
  ctx.strokeStyle = WHITE;
  ctx.beginPath();
  ctx.moveTo(W * 0.1, H * 0.22);
  ctx.lineTo(W * 0.115, H * 0.25);
  ctx.stroke();
  text(ctx, "then I'll see it in your eyes", W * 0.35, H * 0.21, H * 0.018, { font: BOOK, color: WHITE, alpha: 0.8 });
  text(ctx, "when the world collides", W * 0.02 + lt * W * 0.03, H * 0.5, H * 0.045, { font: BOOK, color: WHITE, align: "left", spacing: 0.04 });
}

function shotStar(ctx, st, t) {
  const { W, H } = st;
  fill(ctx, W, H, WHITE);
  const lt = t - T.star;
  const r = H * 0.05 * (1 + 0.25 * beatPulse(t, 0.07)) * easeOutExpo(prog(lt, 0, 0.12));
  star4(ctx, W / 2, H * 0.48, r, lt * 0.6, BLUE, 0.13);
  star4(ctx, W / 2, H * 0.48, r * 0.55, lt * 0.6 + Math.PI / 4, BLUE, 0.2);
}

/** The long film-strip section: the token tumbles on the beat over a waveform. */
// ---- the fall: guitar, towers, speed lines, then the harpoon yanks the token up -------------

/** Scroll position of the towers (in pixels): fast up while falling, a hard stop, then fast down. */
function fallScroll(t, H) {
  const speed = (u) => {
    if (u < T.hook - 0.02) return 3 + 3.5 * smooth(u, 23.4, 30.0);
    if (u < T.hook + 0.1) return 6.5 * (1 - smooth(u, T.hook - 0.02, T.hook + 0.1));
    const yank = -7.5 * smooth(u, T.hook + 0.1, T.hook + 0.5);
    return u < T.hook + 0.5 ? yank : lerp(-7.5, -2.2, smooth(u, T.hook + 0.5, T.anchor));
  };
  let s = 0;
  const step = 1 / 30;
  const ramp = (u) => smooth(u, T.film, T.film + 0.35);
  for (let u = T.film; u < t; u += step) s += speed(u) * ramp(u) * step * H;
  return [s, speed(t) * ramp(t)];
}

function tower(ctx, st, x0, w, side, scroll, tint, alpha, seed) {
  const { W, H, U } = st;
  const Th = H * 0.9;
  const rowH = H * 0.1;
  const rows = 9;
  const phase = ((scroll % Th) + Th) % Th;
  const first = Math.floor(scroll / Th);
  const inner = side < 0 ? x0 + w : x0; // the edge facing the sky
  const win = new Path2D();
  const ledge = new Path2D();
  const balc = new Path2D();
  for (let k = -1; k <= 2; k++) {
    const id = first + k;
    const y0 = k * Th - phase;
    for (let r = 0; r < rows; r++) {
      const y = y0 + r * rowH;
      ledge.rect(x0, y, w, 1.6 * U);
      if ((id * 9 + r + seed) % 3 === 0) balc.rect(side < 0 ? inner - w * 0.04 : inner - w * 0.0, y + rowH * 0.78, w * 0.04, rowH * 0.22);
      for (let c = 0; c < 3; c++) {
        if (hash(id * 131 + r * 17 + c * 5 + seed) < 0.2) continue;
        const wx = x0 + w * (0.12 + c * 0.29);
        win.rect(wx, y + rowH * 0.2, w * 0.2, rowH * 0.55);
      }
    }
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = tint;
  ctx.fillRect(x0, 0, w, H);
  ctx.fillStyle = WHITE;
  ctx.fill(win);
  ctx.globalAlpha = alpha * 0.55;
  ctx.fill(ledge);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = tint;
  ctx.fill(balc);
  // a darker edge on the sky side gives the tower some depth
  ctx.fillStyle = "rgba(10,5,90,0.45)";
  ctx.fillRect(side < 0 ? inner - w * 0.05 : inner, 0, w * 0.05, H);
  ctx.restore();
}

function fallScene(ctx, st, t) {
  const { W, H, U } = st;
  const [scroll, v] = fallScroll(t, H);
  const lt = t - T.film;
  const hooked = t >= T.hook;

  // far towers move slower, near towers faster
  tower(ctx, st, W * 0.15, W * 0.11, -1, scroll * 0.55, "#7f86ff", 0.7, 3);
  tower(ctx, st, W * 0.74, W * 0.11, 1, scroll * 0.55, "#7f86ff", 0.7, 8);
  tower(ctx, st, 0, W * 0.17, -1, scroll, BLUE, 1, 1);
  tower(ctx, st, W * 0.83, W * 0.17, 1, scroll, BLUE, 1, 6);

  // speed lines: vertical streaks whose length follows the speed
  const sp = Math.abs(v);
  if (sp > 0.25) {
    const blue = new Path2D();
    const white = new Path2D();
    const span = H * 1.6;
    for (let i = 0; i < 90; i++) {
      const f = 0.7 + hash(i * 7) * 0.8;
      const x = W * (0.02 + hash(i * 3) * 0.96);
      const y = ((((hash(i * 5) * span - scroll * f) % span) + span) % span) - H * 0.3;
      const L = Math.min(sp, 7) * H * 0.07 * (0.5 + hash(i * 11));
      const onTower = x < W * 0.17 || x > W * 0.83;
      (onTower ? white : blue).rect(x, v > 0 ? y : y - L, (1.6 + hash(i * 13) * 2.6) * U, L);
    }
    ctx.save();
    ctx.globalAlpha = clamp(sp / 2.5) * 0.85;
    ctx.fillStyle = "#4a38ff";
    ctx.fill(blue);
    ctx.fillStyle = "#fff";
    ctx.fill(white);
    ctx.restore();
  }

  // the token: tumbles in the air while falling, then hangs from the harpoon
  const fallY = H * 0.5 + Math.sin(lt * 1.9) * H * 0.02;
  const hookW = smooth(t, T.hook, T.hook + 0.1);
  // the yank starts gently and speeds up as the line takes the weight
  const pull = Math.pow(prog(t, T.hook + 0.1, T.anchor), 1.7);
  const tokY = hooked ? lerp(fallY, H * 0.0, pull) : fallY;
  const tokX = W / 2 + Math.sin(lt * 1.3) * W * 0.02 * (1 - hookW);
  const roll = lerp(Math.sin(lt * 2.1) * 0.45 - 0.1, Math.PI + Math.sin(t * 3) * 0.04 * (1 - pull), hookW);
  const yaw = lerp(Math.sin(lt * 1.2) * 0.9, 0.2, hookW);
  const grow = lerp(1, 1.35, smooth(t, T.hook + 1.2, T.anchor));
  const size = H * 0.34 * lerp(1, 0.8, hookW) * grow;

  // the harpoon drops in from above and catches the token
  if (t >= T.fire) {
    const arrive = easeInCubic(prog(t, T.fire, T.hook));
    const ay = hooked ? tokY - H * 0.035 : lerp(-H * 0.4, fallY - H * 0.035, arrive);
    if (st.three) {
      st.three.hang(W, H, st.dpr3, { x: W / 2, y: ay, swing: Math.sin(t * 4) * 0.02 * (1 - hookW), yaw: 0.2, scale: 1.05 * grow });
      ctx.drawImage(st.three.canvas, 0, 0, W, H);
    } else {
      chain(ctx, W / 2, -H * 0.3, W / 2, ay - H * 0.2, H * 0.028, BLUE);
      drawAnchor(ctx, W / 2, ay, H * 0.2, 0, BLUE);
    }
  }
  // a white outline keeps the blue token readable against the blue towers and anchor
  for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) tok3(ctx, st.tok.white, tokX + ox * U, tokY + oy * U, size, roll, yaw);
  tok3(ctx, st.tok.duo, tokX, tokY, size, roll, yaw);

  // the guitar: held while falling, then it slips out of the token's hands
  const gt = Math.max(0, t - T.hook);
  if (st.three && gt < 1.2) {
    const gs = size * 1.3;
    st.three.guitar(W, H, st.dpr3, {
      x: tokX - gs * 0.03 + gt * W * 0.12, y: tokY + gs * 0.09 + gt * gt * H * 1.6, size: gs,
      yaw: yaw * 0.8 - 0.35 + gt * 2, roll: -roll - 0.95 + gt * 5, pitch: 0.45 + Math.sin(lt * 1.5) * 0.15,
    });
    ctx.drawImage(st.three.canvas, 0, 0, W, H);
  }
}

function shotFilm(ctx, st, t) {
  const { W, H, U } = st;
  fill(ctx, W, H, WHITE);
  const lt = t - T.film;
  const slideIn = easeOutExpo(prog(lt, 0, 0.18));
  const b = beatIndex(t);
  const strip = W * 0.12;
  const step = H * 0.115 * 0.5;
  const offset = b * step + easeOutCubic(clamp((((t - PHASE) % BEAT) + BEAT) % BEAT / 0.08)) * step;
  const pulse = beatPulse(t);
  const inAnchor = t >= T.anchor;

  ctx.save();
  // beat zoom
  const z = 1 + pulse * 0.025;
  ctx.translate(W / 2, H / 2);
  ctx.scale(z, z);
  ctx.translate(-W / 2, -H / 2);

  if (!inAnchor) {
    fallScene(ctx, st, t);
  } else {
    const at = t - T.anchor;
    const drop = easeOutCubic(prog(at, 0, 0.35));
    const settle = Math.exp(-at * 2.2) * Math.sin(at * 9) * 0.05;
    const scale = lerp(1.35, 1, easeOutCubic(prog(at, 0, 1.2)));
    const swing = Math.sin(at * 1.7) * 0.06 * (1 - Math.exp(-at)) + settle;
    if (st.three) {
      // pendulum hung from a point far above the frame
      const pivotY = -H * 0.45;
      const len = lerp(H * 0.4, H * 1.05, drop) + settle * H * 0.4;
      const ax = W / 2 + Math.sin(swing) * len;
      const ay = pivotY + Math.cos(swing) * len;
      const yaw = Math.sin(at * 0.55) * 0.75 + 0.2;
      const [tx, ty] = st.three.hang(W, H, st.dpr3, { x: ax, y: ay, swing, yaw, scale: 1.05 * scale });
      ctx.drawImage(st.three.canvas, 0, 0, W, H);
      // white outline first so the blue token reads against the blue anchor
      const th = H * 0.27 * scale;
      for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
        tok3(ctx, st.tok.white, tx + ox * st.U, ty + oy * st.U, th, Math.PI - swing, yaw * 0.6);
      }
      tok3(ctx, st.tok.duo, tx, ty, th, Math.PI - swing, yaw * 0.6);
    } else {
      const pivotX = W / 2;
      const pivotY = -H * 0.05;
      const len = lerp(-H * 0.3, H * 0.6, drop) * (scale > 1 ? 1 / scale : 1) + H * 0.05;
      const ax = pivotX + Math.sin(swing) * len;
      const ay = pivotY + Math.cos(swing) * len;
      const s = H * 0.2 * scale;
      chain(ctx, pivotX, pivotY - H * 0.2, ax, ay - s * 0.95, H * 0.028 * scale, BLUE);
      drawAnchor(ctx, ax, ay, s, -swing, BLUE);
      tok(ctx, st.tok.blue, ax + s * 0.05, ay + s * 0.18, s * 1.05, -swing + 0.15);
    }
  }
  ctx.restore();

  if (!inAnchor) return;
  // strips slide in from the sides
  ctx.save();
  ctx.translate(-(1 - slideIn) * strip * 1.4, 0);
  filmStrip(ctx, W, H, -1, strip, offset, U);
  ctx.restore();
  ctx.save();
  ctx.translate((1 - slideIn) * strip * 1.4, 0);
  filmStrip(ctx, W, H, 1, strip, offset + step, U);
  ctx.restore();
}

// Background colour pulses of the falling shot, as in the source edit.
const FALL_COLORS = [
  [38.2, BLUE], [39.0, PALE], [39.2, BLUE], [39.7, "#4c3cff"], [40.0, BLUE], [40.45, LAV], [40.7, PALE],
  [40.98, BLUE], [41.22, LAV], [41.48, PALE], [41.72, LAV], [41.98, BLUE], [42.2, "#1300b0"],
];
function fallColor(t) {
  let c = BLUE;
  for (const [t0, col] of FALL_COLORS) if (t >= t0) c = col;
  return c;
}

function shotFall(ctx, st, t) {
  const { W, H, U } = st;
  const lt = t - T.fall;
  const L = layers(st);
  fill(ctx, W, H, fallColor(t));
  const dark = smooth(t, 42.2, T.slit);
  // clouds along the top edge
  for (let i = 0; i < 4; i++) {
    const img = L.clouds[i % 3];
    const w = W * 0.5;
    const x = ((hash(i * 5) * 1.5 - lt * 0.03 * (1 + i * 0.3)) % 1.5) * W - W * 0.2;
    ctx.globalAlpha = (0.5 + 0.3 * hash(i)) * (1 - dark * 0.5);
    ctx.drawImage(img, x, -w * 0.22 - hash(i * 3) * H * 0.04, w, w / 2);
  }
  ctx.globalAlpha = 1;
  // rain streaks falling up-right to down-left
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 18; i++) {
    const p = ((hash(i * 7) + lt * (0.5 + hash(i * 3) * 0.6)) % 1.3) - 0.15;
    const x = W * (0.1 + hash(i * 11) * 1.0) - p * W * 0.5;
    const y = p * H * 1.1;
    const len = H * (0.06 + hash(i * 13) * 0.14);
    ctx.lineWidth = Math.max(1, (0.8 + hash(i * 17) * 1.4) * U);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * 0.6, y + len);
    ctx.stroke();
  }
  // sparkles on beats
  const b = beatIndex(t);
  for (let k = 0; k < 3; k++) {
    const kk = b * 3 + k;
    const a = beatPulse(t, 0.16) * (hash(kk) > 0.35 ? 1 : 0);
    if (a > 0.02) star4(ctx, W * hash(kk * 7), H * hash(kk * 11), H * (0.02 + hash(kk * 13) * 0.04) * a, 0, "rgba(255,255,255,0.95)", 0.1);
  }
  // the token, close up then falling
  const pull = easeOutCubic(prog(lt, 0, 0.75));
  const size = H * lerp(1.6, 0.42, pull);
  const x = W * lerp(0.56, 0.5, pull) - smooth(lt, 0.8, 4.5) * W * 0.03;
  const y = H * lerp(0.5, 0.46, pull) + smooth(lt, 0.8, 4.5) * H * 0.04;
  tok(ctx, st.tok.white, x, y, size, lerp(-0.7, -0.45, pull) + Math.sin(t * 0.8) * 0.06);
  // typed lyric
  const line = "“and anchor me in your sky";
  const typed = Math.floor(clamp(prog(t, 41.0, 42.1)) * line.length);
  if (typed > 0) {
    text(ctx, line.slice(0, typed), W * 0.5, H * 0.5, H * 0.05, {
      font: BOOK, color: INKTXT, spacing: 0.25, alpha: 0.85 * (1 - 0.7 * smooth(t, 42.1, 42.6)),
    });
  }
  if (dark > 0) {
    ctx.fillStyle = `rgba(4,0,40,${dark * 0.75})`;
    ctx.fillRect(0, 0, W, H);
  }
  // closing letterbox
  const close = smooth(t, 42.45, T.slit);
  if (close > 0) letterbox(ctx, W, H, H * 0.42 * close, H * 0.42 * close);
}

function shotSlit(ctx, st, t) {
  const { W, H } = st;
  fill(ctx, W, H, "#000");
  ctx.fillStyle = "#04002a";
  ctx.fillRect(0, H * 0.42, W, H * 0.16);
  tok(ctx, st.tok.white, W / 2, H * 0.5, H * 0.12, -0.4);
}

function shotFade(ctx, st, t) {
  const { W, H } = st;
  const p = smooth(t, T.fade + 0.15, T.end - 0.1);
  const v = Math.round(lerp(246, 52, p));
  fill(ctx, W, H, `rgb(${v},${v},${Math.min(255, v + 4)})`);
  const a = smooth(t, 43.6, 44.3) * (1 - smooth(t, 45.6, 46.3));
  text(ctx, (st.name || "").toUpperCase(), W / 2, H * 0.5, H * 0.04, { color: BLUE, spacing: 0.3, alpha: a });
  text(ctx, st.title, W / 2, H * 0.56, H * 0.02, { font: BOOK, color: BLUE, spacing: 0.5, alpha: a * 0.7 });
}

// ---- composite ---------------------------------------------------------------

function shake(t, U) {
  const s = pulses(t, SHAKES);
  if (s < 0.01) return [0, 0];
  const f = Math.floor(t * 60);
  return [(hash(f) - 0.5) * s * 16 * U, (hash(f + 777) - 0.5) * s * 16 * U];
}

export function render(ctx, st, t) {
  const { W, H, U } = st;
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  const [sx, sy] = shake(t, U);
  ctx.translate(sx, sy);

  if (t < T.name) {
    /* black */
  } else if (t < T.title) shotName(ctx, st, t);
  else if (t < T.globe) shotTitle(ctx, st, t);
  else if (t < T.sea) shotGlobe(ctx, st, t);
  else if (t < T.words) shotSea(ctx, st, t);
  else if (t < T.sky) shotWords(ctx, st, t);
  else if (t < T.rain) shotSky(ctx, st, t);
  else if (t < T.hush) shotRain(ctx, st, t);
  else if (t < T.forever) shotHush(ctx, st, t);
  else if (t < T.shore) shotForever(ctx, st, t);
  else if (t < T.dark) shotShore(ctx, st, t);
  else if (t < T.emblem) fill(ctx, W, H, "#000");
  else if (t < T.collide) shotEmblem(ctx, st, t);
  else if (t < T.star) shotCollide(ctx, st, t);
  else if (t < T.film) shotStar(ctx, st, t);
  else if (t < T.fall) shotFilm(ctx, st, t);
  else if (t < T.slit) shotFall(ctx, st, t);
  else if (t < T.fade) shotSlit(ctx, st, t);
  else shotFade(ctx, st, t);
  ctx.restore();

  // white cut flashes
  const flash = pulses(t, FLASHES);
  if (flash > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${clamp(flash)})`;
    ctx.fillRect(0, 0, W, H);
  }
  // paper grain over everything that is not black
  if (t > T.name && !(t >= T.dark && t < T.emblem)) {
    const L = layers(st);
    ctx.save();
    ctx.globalAlpha = 0.7;
    const f = Math.floor(t * 24);
    ctx.translate(-Math.floor(hash(f) * 256), -Math.floor(hash(f + 9) * 256));
    ctx.fillStyle = ctx.createPattern(L.grain, "repeat");
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
  }
}
