// Pre-rendered art for "Star that doesn't Exist": feathers, a pair of wings,
// a pastel moon, crystal shards, sparkles, nebula and star dust. Everything is
// generated once at start-up so each frame is mostly cheap drawImage calls.
import { TAU, makeCanvas, rng, supportsFilter } from "../cutscene/util.js";

function blurred(c, px) {
  if (!supportsFilter) return c;
  const o = makeCanvas(c.width, c.height);
  const x = o.getContext("2d");
  x.filter = `blur(${px}px)`;
  x.drawImage(c, 0, 0);
  return o;
}

export function glow(rgb, size = 256) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, `rgba(${rgb},1)`);
  g.addColorStop(0.2, `rgba(${rgb},0.5)`);
  g.addColorStop(0.5, `rgba(${rgb},0.14)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  return c;
}

/** Four-point sparkle with long hair-thin arms and a short diagonal cross. */
export function sparkle(rgb = "255,220,245", size = 512) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const R = size / 2;
  x.translate(R, R);
  x.globalCompositeOperation = "lighter";
  const halo = x.createRadialGradient(0, 0, 0, 0, 0, R * 0.25);
  halo.addColorStop(0, `rgba(${rgb},0.9)`);
  halo.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = halo;
  x.fillRect(-R, -R, size, size);
  const arm = (len, w, a) => {
    x.save();
    x.rotate(a);
    const g = x.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, `rgba(${rgb},0.7)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(0, -w);
    x.lineTo(len, 0);
    x.lineTo(0, w);
    x.closePath();
    x.fill();
    x.restore();
  };
  for (let i = 0; i < 4; i++) arm(R * 0.98, R * 0.03, (i / 4) * TAU);
  for (let i = 0; i < 4; i++) arm(R * 0.32, R * 0.02, (i / 4) * TAU + Math.PI / 4);
  return c;
}

/**
 * One feather pointing up: a curved shaft with fine barbs on both sides, white
 * at the base and tinted toward the tip, with a few splits in the vane.
 */
export function feather(seed, tip = "176,212,196", w = 190, h = 560) {
  const c = makeCanvas(w, h);
  const x = c.getContext("2d");
  const r = rng(seed);
  const cx = w / 2;
  const bend = (r() - 0.5) * w * 0.25;
  const shaft = (k) => [cx + bend * Math.sin(k * Math.PI * 0.9), h - 20 - k * (h - 40)];
  // vane as a filled shape, then barbs on top
  const vane = (side) => {
    x.beginPath();
    const [x0, y0] = shaft(0.08);
    x.moveTo(x0, y0);
    for (let i = 0; i <= 30; i++) {
      const k = 0.08 + (i / 30) * 0.92;
      const [sx, sy] = shaft(k);
      const width = w * 0.46 * Math.sin(Math.min(1, k * 1.2) * Math.PI * 0.6) * (side > 0 ? 0.85 : 1);
      x.lineTo(sx + side * width, sy - width * 0.4);
    }
    const [tx, ty] = shaft(1);
    x.lineTo(tx, ty);
    x.closePath();
  };
  for (const side of [-1, 1]) {
    vane(side);
    const g = x.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, "rgba(255,252,250,0.95)");
    g.addColorStop(0.55, "rgba(246,244,240,0.95)");
    g.addColorStop(1, `rgba(${tip},0.95)`);
    x.fillStyle = g;
    x.fill();
  }
  // barbs: thin strokes sweeping out and up
  x.lineCap = "round";
  for (const side of [-1, 1]) {
    for (let i = 0; i < 46; i++) {
      const k = 0.1 + (i / 46) * 0.88;
      const [sx, sy] = shaft(k);
      const width = w * 0.42 * Math.sin(Math.min(1, k * 1.25) * Math.PI * 0.62) * (side > 0 ? 0.85 : 1);
      x.strokeStyle = i % 3 ? "rgba(150,150,160,0.35)" : "rgba(120,120,135,0.5)";
      x.lineWidth = 1.2;
      x.beginPath();
      x.moveTo(sx, sy);
      x.quadraticCurveTo(sx + side * width * 0.5, sy - width * 0.1, sx + side * width, sy - width * 0.45);
      x.stroke();
    }
    // a couple of splits in the vane
    x.globalCompositeOperation = "destination-out";
    for (let s = 0; s < 2; s++) {
      const k = 0.35 + r() * 0.5;
      const [sx, sy] = shaft(k);
      const width = w * 0.45;
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(sx + side * width * 0.4, sy - width * 0.15);
      x.lineTo(sx + side * width * 1.1, sy - width * 0.55);
      x.stroke();
    }
    x.globalCompositeOperation = "source-over";
  }
  // outline and shaft
  for (const side of [-1, 1]) {
    vane(side);
    x.strokeStyle = "rgba(90,90,110,0.55)";
    x.lineWidth = 1.6;
    x.stroke();
  }
  x.strokeStyle = "rgba(240,236,230,1)";
  x.lineWidth = 4;
  x.beginPath();
  for (let i = 0; i <= 30; i++) {
    const [sx, sy] = shaft(i / 30);
    if (i === 0) x.moveTo(sx, sy + 18);
    else x.lineTo(sx, sy);
  }
  x.stroke();
  return c;
}

/**
 * A left wing seen from behind: feathers hang from the arm (shoulder, elbow,
 * wrist, tip), growing longer and sweeping further out toward the tip, with
 * shorter covert rows laid over the top.
 */
export function wing(feathers) {
  const W = 1400;
  const H = 1200;
  const c = makeCanvas(W, H);
  const x = c.getContext("2d");
  const r = rng(77);
  const arm = [[W - 90, H * 0.55], [W - 420, H * 0.32], [W - 780, H * 0.2], [140, H * 0.06]];
  const along = (k) => {
    const seg = Math.min(2, Math.floor(k * 3));
    const u = k * 3 - seg;
    const [a, b] = [arm[seg], arm[seg + 1]];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
  };
  const put = (img, px, py, len, ang, alpha = 1) => {
    x.save();
    x.globalAlpha = alpha;
    x.translate(px, py);
    x.rotate(ang);
    const w = (img.width / img.height) * len * 1.7;
    x.drawImage(img, -w / 2, -len, w, len);
    x.restore();
  };
  // flight feathers: from the shoulder (hanging straight down) to the tip (swept out left)
  const N = 20;
  for (let i = N - 1; i >= 0; i--) {
    const k = i / (N - 1);
    const [px, py] = along(0.04 + k * 0.94);
    const ang = Math.PI + 0.1 + Math.pow(k, 1.3) * 1.6 + (r() - 0.5) * 0.14;
    const len = (380 + Math.pow(k, 0.8) * 620) * (0.82 + r() * 0.3);
    put(feathers[i % feathers.length], px, py, len, ang, 0.97);
  }
  // coverts: two shorter rows over the arm
  for (const [row, scale] of [[0, 0.5], [1, 0.28]]) {
    const M = 18;
    for (let i = M - 1; i >= 0; i--) {
      const k = i / (M - 1);
      const [px, py] = along(0.02 + k * 0.8);
      const ang = Math.PI + 0.2 + k * 1.1 + (r() - 0.5) * 0.12;
      const len = (300 + k * 260) * scale * (0.9 + r() * 0.2) + 60;
      put(feathers[(i + row * 2) % feathers.length], px, py - row * 18, len, ang, 1);
    }
  }
  // the leading edge: a soft bright line along the arm
  x.strokeStyle = "rgba(255,250,252,0.9)";
  x.lineWidth = 14;
  x.lineCap = "round";
  x.lineJoin = "round";
  x.beginPath();
  arm.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
  x.stroke();
  return c;
}

/** Pale pastel moon with drifting pink clouds and a soft rim. */
export function moon(size = 900) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const R = size / 2;
  const r = rng(13);
  x.save();
  x.beginPath();
  x.arc(R, R, R * 0.96, 0, TAU);
  x.clip();
  const g = x.createRadialGradient(R * 0.85, R * 0.8, 0, R, R, R);
  g.addColorStop(0, "#fbffd6");
  g.addColorStop(0.3, "#dcfbc8");
  g.addColorStop(0.58, "#c4f0e2");
  g.addColorStop(0.82, "#bfe2ff");
  g.addColorStop(1, "#e9c4f2");
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  const clouds = makeCanvas(size, size);
  const cx = clouds.getContext("2d");
  // pastel weather: lemon and mint bands, sky-blue haze, a few pink clouds
  const cols = ["255,236,140", "170,240,170", "140,205,255", "120,225,215", "246,140,200"];
  for (let i = 0; i < 52; i++) {
    const px = r() * size;
    const py = size * (0.15 + r() * 0.75);
    const rr = size * (0.04 + r() * 0.1);
    const c = cols[i % 5 === 4 && r() < 0.6 ? 4 : Math.floor(r() * 4)];
    cx.fillStyle = `rgba(${c},${0.18 + r() * 0.25})`;
    cx.beginPath();
    cx.ellipse(px, py, rr * 1.8, rr, 0, 0, TAU);
    cx.fill();
  }
  x.drawImage(blurred(clouds, size * 0.02), 0, 0);
  x.restore();
  // rim light
  const rim = x.createRadialGradient(R, R, R * 0.8, R, R, R);
  rim.addColorStop(0, "rgba(255,240,255,0)");
  rim.addColorStop(0.9, "rgba(225,245,255,0.55)");
  rim.addColorStop(1, "rgba(200,235,255,0)");
  x.fillStyle = rim;
  x.fillRect(0, 0, size, size);
  return c;
}

/** White crystal shard with faceted shading and a thin grey edge. */
export function shard(seed, size = 220) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const r = rng(seed);
  const n = 4 + Math.floor(r() * 3);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (r() - 0.5) * 0.7;
    const rr = size * (0.22 + r() * 0.26) * (i === 0 ? 1.5 : 1);
    pts.push([size / 2 + Math.cos(a) * rr, size / 2 + Math.sin(a) * rr]);
  }
  const ctr = [size / 2 + (r() - 0.5) * size * 0.1, size / 2 + (r() - 0.5) * size * 0.1];
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const tone = 0.78 + r() * 0.22;
    x.fillStyle = `rgba(${Math.round(255 * tone)},${Math.round(250 * tone)},${Math.round(252 * tone)},0.95)`;
    x.beginPath();
    x.moveTo(ctr[0], ctr[1]);
    x.lineTo(a[0], a[1]);
    x.lineTo(b[0], b[1]);
    x.closePath();
    x.fill();
  }
  // pastel sheen
  x.globalCompositeOperation = "source-atop";
  const g = x.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, "rgba(200,255,230,0.25)");
  g.addColorStop(0.5, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(255,170,220,0.3)");
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  x.globalCompositeOperation = "source-over";
  x.strokeStyle = "rgba(110,100,120,0.6)";
  x.lineWidth = 2;
  x.beginPath();
  pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
  x.closePath();
  x.stroke();
  x.strokeStyle = "rgba(255,255,255,0.8)";
  x.lineWidth = 1;
  for (const p of pts) {
    x.beginPath();
    x.moveTo(ctr[0], ctr[1]);
    x.lineTo(p[0], p[1]);
    x.stroke();
  }
  return c;
}

/** Deep maroon space with magenta and violet nebula clouds. */
export function nebula(w = 1280, h = 720) {
  const c = makeCanvas(w, h);
  const x = c.getContext("2d");
  const r = rng(29);
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#2a0616");
  g.addColorStop(0.5, "#16030d");
  g.addColorStop(1, "#24051f");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  const blobs = makeCanvas(w, h);
  const b = blobs.getContext("2d");
  const cols = ["150,20,70", "120,24,110", "200,40,110", "70,20,90", "40,90,80"];
  for (let i = 0; i < 70; i++) {
    const px = r() * w;
    const py = r() * h;
    const rr = 40 + r() * 220;
    const rg = b.createRadialGradient(px, py, 0, px, py, rr);
    rg.addColorStop(0, `rgba(${cols[i % cols.length]},${0.12 + r() * 0.22})`);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    b.fillStyle = rg;
    b.fillRect(px - rr, py - rr, rr * 2, rr * 2);
  }
  x.drawImage(blurred(blobs, 18), 0, 0);
  return c;
}

/** Tileable star dust: fine pink, gold and white points. */
export function dust(size = 1024, seed = 3, count = 1400) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const r = rng(seed);
  const cols = ["255,255,255", "255,170,210", "255,210,150", "230,160,255"];
  for (let i = 0; i < count; i++) {
    const s = r() < 0.96 ? 0.6 + r() * 1.2 : 1.8 + r() * 1.8;
    x.fillStyle = `rgba(${cols[Math.floor(r() * cols.length)]},${0.25 + r() * 0.75})`;
    x.beginPath();
    x.arc(r() * size, r() * size, s, 0, TAU);
    x.fill();
  }
  return c;
}

export function grain() {
  const S = 256;
  const c = makeCanvas(S, S);
  const x = c.getContext("2d");
  const img = x.createImageData(S, S);
  const r = rng(9);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 14;
  }
  x.putImageData(img, 0, 0);
  return c;
}

/**
 * A lens aperture ghost: a soft hexagon with a brighter rim, as the blades of a
 * camera iris print on bright light.
 */
export function hexGhost(rgb, size = 256) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const R = size * 0.46;
  const hex = (r) => {
    x.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.PI / 6;
      x.lineTo(size / 2 + Math.cos(a) * r, size / 2 + Math.sin(a) * r);
    }
    x.closePath();
  };
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, R);
  g.addColorStop(0, `rgba(${rgb},0.12)`);
  g.addColorStop(0.75, `rgba(${rgb},0.28)`);
  g.addColorStop(1, `rgba(${rgb},0.5)`);
  hex(R);
  x.fillStyle = g;
  x.fill();
  x.strokeStyle = `rgba(${rgb},0.7)`;
  x.lineWidth = size * 0.02;
  hex(R * 0.98);
  x.stroke();
  return blurred(c, size * 0.012);
}

export function buildArt() {
  const tips = ["176,212,196", "200,226,214", "230,200,220", "160,200,190"];
  const feathers = Array.from({ length: 6 }, (_, i) => feather(11 + i * 7, tips[i % tips.length]));
  const wingL = wing(feathers);
  const wingR = makeCanvas(wingL.width, wingL.height);
  const wr = wingR.getContext("2d");
  wr.translate(wingL.width, 0);
  wr.scale(-1, 1);
  wr.drawImage(wingL, 0, 0);
  return {
    feathers,
    feathersBlur: feathers.slice(0, 3).map((f) => blurred(f, 7)),
    wingL,
    wingR,
    wingGlow: blurred(wingL, 26),
    moon: moon(),
    shards: Array.from({ length: 6 }, (_, i) => shard(5 + i * 11)),
    sparkle: sparkle(),
    sparkleGold: sparkle("255,215,140"),
    glowW: glow("255,255,255"),
    glowP: glow("255,120,200"),
    glowG: glow("255,215,120"),
    glowM: glow("190,255,220"),
    nebula: nebula(),
    dustA: dust(1024, 3, 1400),
    dustB: dust(1024, 7, 500),
    grain: grain(),
    hex: ["255,150,220", "160,255,210", "255,220,130", "150,200,255", "220,170,255"].map((c) => hexGhost(c)),
  };
}
