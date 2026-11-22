// Pre-rendered textures. Everything is generated procedurally once at start-up
// so per-frame drawing is mostly cheap drawImage calls.
import { TAU, makeCanvas, rng, supportsFilter } from "./util.js";

function glow(r, g, b, size = 256, falloff = [1, 0.55, 0.16, 0]) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const grd = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, `rgba(${r},${g},${b},${falloff[0]})`);
  grd.addColorStop(0.18, `rgba(${r},${g},${b},${falloff[1]})`);
  grd.addColorStop(0.45, `rgba(${r},${g},${b},${falloff[2]})`);
  grd.addColorStop(1, `rgba(${r},${g},${b},${falloff[3]})`);
  x.fillStyle = grd;
  x.fillRect(0, 0, size, size);
  return c;
}

/** Many-spiked starburst like light hitting a cut gem. */
function starburst(seed, size = 1024, spikes = 64) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const R = size / 2;
  const rand = rng(seed);
  x.translate(R, R);
  x.globalCompositeOperation = "lighter";
  for (let i = 0; i < spikes; i++) {
    const major = i % 8 === 0;
    const a = (i / spikes) * TAU + (rand() - 0.5) * 0.12;
    const len = R * (major ? 0.92 + rand() * 0.08 : 0.2 + Math.pow(rand(), 1.6) * 0.75);
    const w = (major ? 5 : 1.2 + rand() * 2.6) * (size / 1024);
    x.save();
    x.rotate(a);
    const g = x.createLinearGradient(0, 0, len, 0);
    const alpha = major ? 0.95 : 0.35 + rand() * 0.45;
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(0.25, `rgba(225,220,255,${alpha * 0.55})`);
    g.addColorStop(1, "rgba(200,190,255,0)");
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(0, -w);
    x.lineTo(len, 0);
    x.lineTo(0, w);
    x.closePath();
    x.fill();
    x.restore();
  }
  return c;
}

/** Horizontal anamorphic lens streak. */
function anamorphic(size = 1024) {
  const h = 64;
  const c = makeCanvas(size, h);
  const x = c.getContext("2d");
  x.save();
  x.translate(size / 2, h / 2);
  x.scale(size / h, 1);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, h / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.08, "rgba(230,228,255,0.8)");
  g.addColorStop(0.35, "rgba(170,160,255,0.25)");
  g.addColorStop(1, "rgba(150,140,255,0)");
  x.fillStyle = g;
  x.fillRect(-h / 2, -h / 2, h, h);
  x.restore();
  return c;
}

/** Thin rainbow band — chromatic dispersion leaking out of crystal edges. */
function rainbow(w = 512, h = 48) {
  const c = makeCanvas(w, h);
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, h);
  const hues = [0, 30, 60, 120, 190, 240, 280];
  hues.forEach((hue, i) => g.addColorStop(i / (hues.length - 1), `hsla(${hue},100%,65%,1)`));
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  // fade the ends and the edges of the band
  x.globalCompositeOperation = "destination-in";
  const fx = x.createLinearGradient(0, 0, w, 0);
  fx.addColorStop(0, "rgba(0,0,0,0)");
  fx.addColorStop(0.3, "rgba(0,0,0,1)");
  fx.addColorStop(0.7, "rgba(0,0,0,1)");
  fx.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = fx;
  x.fillRect(0, 0, w, h);
  const fy = x.createLinearGradient(0, 0, 0, h);
  fy.addColorStop(0, "rgba(0,0,0,0)");
  fy.addColorStop(0.5, "rgba(0,0,0,1)");
  fy.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = fy;
  x.fillRect(0, 0, w, h);
  return c;
}

/** Soft cloud of smoke. */
function smoke(seed, size = 512, rgb = [160, 150, 220]) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const rand = rng(seed);
  for (let i = 0; i < 70; i++) {
    const a = rand() * TAU;
    const d = Math.pow(rand(), 0.7) * size * 0.3;
    const px = size / 2 + Math.cos(a) * d;
    const py = size / 2 + Math.sin(a) * d * 0.7;
    const r = size * (0.05 + rand() * 0.16);
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    const al = 0.05 + rand() * 0.08;
    g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${al})`);
    g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    x.fillStyle = g;
    x.beginPath();
    x.arc(px, py, r, 0, TAU);
    x.fill();
  }
  // wispy streaks
  x.globalCompositeOperation = "lighter";
  for (let i = 0; i < 26; i++) {
    x.strokeStyle = `rgba(${rgb[0] + 40},${rgb[1] + 40},${rgb[2] + 30},${0.02 + rand() * 0.04})`;
    x.lineWidth = 2 + rand() * 10;
    x.beginPath();
    const sx = size * (0.2 + rand() * 0.6);
    const sy = size * (0.25 + rand() * 0.5);
    x.moveTo(sx, sy);
    x.bezierCurveTo(
      sx + (rand() - 0.5) * size * 0.5, sy + (rand() - 0.5) * size * 0.4,
      sx + (rand() - 0.5) * size * 0.5, sy + (rand() - 0.5) * size * 0.4,
      sx + (rand() - 0.5) * size * 0.6, sy + (rand() - 0.5) * size * 0.3,
    );
    x.stroke();
  }
  if (!supportsFilter) return c;
  const out = makeCanvas(size, size);
  const o = out.getContext("2d");
  o.filter = `blur(${size / 60}px)`;
  o.drawImage(c, 0, 0);
  return out;
}

/** Black ink explosion used for the inverted "nothing left" beat. */
function inkSplat(seed, size = 768) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const rand = rng(seed);
  const R = size / 2;
  x.translate(R, R);
  x.fillStyle = "#000";
  // irregular core
  for (let i = 0; i < 40; i++) {
    const a = rand() * TAU;
    const d = rand() * R * 0.12;
    x.beginPath();
    x.arc(Math.cos(a) * d, Math.sin(a) * d, R * (0.08 + rand() * 0.1), 0, TAU);
    x.fill();
  }
  // spikes
  for (let i = 0; i < 46; i++) {
    const a = rand() * TAU;
    const len = R * (0.25 + Math.pow(rand(), 1.4) * 0.7);
    const w = R * (0.012 + rand() * 0.035);
    x.save();
    x.rotate(a);
    x.beginPath();
    x.moveTo(R * 0.1, -w);
    x.quadraticCurveTo(len * 0.6, -w * 0.4, len, (rand() - 0.5) * w);
    x.quadraticCurveTo(len * 0.6, w * 0.4, R * 0.1, w);
    x.fill();
    // droplets along the spike
    const drops = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < drops; k++) {
      x.beginPath();
      x.arc(len * (1.05 + rand() * 0.25), (rand() - 0.5) * w * 3, w * (0.3 + rand() * 0.7), 0, TAU);
      x.fill();
    }
    x.restore();
  }
  return c;
}

function grain(size = 256) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const img = x.createImageData(size, size);
  const rand = rng(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rand() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 22;
  }
  x.putImageData(img, 0, 0);
  return c;
}

export function buildSprites() {
  return {
    glowWhite: glow(255, 255, 255),
    glowLav: glow(190, 180, 255),
    glowDeep: glow(120, 100, 230),
    star: starburst(11),
    star2: starburst(29, 1024, 90),
    flare: anamorphic(),
    rainbow: rainbow(),
    smokes: [smoke(3), smoke(5), smoke(9), smoke(13, 512, [200, 195, 240])],
    ink: inkSplat(21),
    grain: grain(),
  };
}

/**
 * Silhouettes of the token: a solid white copy (for over-exposure flashes),
 * a blurred halo, and a black copy (for the inverted ink beat).
 * Drawing a cross-origin image onto a canvas is allowed; only reading pixels
 * back is not, and we never do that.
 */
export function buildTokenSprites(img) {
  const S = 512;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const k = Math.min(S / iw, S / ih);
  const w = iw * k;
  const h = ih * k;
  const base = makeCanvas(S, S);
  base.getContext("2d").drawImage(img, (S - w) / 2, (S - h) / 2, w, h);

  const tint = (color) => {
    const c = makeCanvas(S, S);
    const x = c.getContext("2d");
    x.drawImage(base, 0, 0);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = color;
    x.fillRect(0, 0, S, S);
    return c;
  };
  const white = tint("#fff");
  const black = tint("#000");
  const cyan = tint("rgb(60,220,255)");
  const red = tint("rgb(255,60,120)");

  const P = 1.5;
  const halo = makeCanvas(S * P, S * P);
  const hx = halo.getContext("2d");
  const off = (S * P - S) / 2;
  if (supportsFilter) {
    hx.filter = `blur(${S / 22}px)`;
    hx.drawImage(tint("rgb(215,208,255)"), off, off);
    hx.filter = `blur(${S / 60}px)`;
    hx.drawImage(white, off, off);
  } else {
    hx.globalAlpha = 0.18;
    for (let i = 0; i < 8; i++) {
      const g = 1 + i * 0.03;
      hx.drawImage(white, (S * P - S * g) / 2, (S * P - S * g) / 2, S * g, S * g);
    }
  }
  return { size: S, base, white, black, cyan, red, halo, haloScale: P };
}
