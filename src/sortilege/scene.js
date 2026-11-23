// Sortilege: an 18.9 s opening title in three chapters (sepia, violet, lilac)
// ending on "~SORTILEGE~ the spellkeeper". No token. Every frame is a pure
// function of the song's current time; cue points are measured from the
// source edit, whose audio lines up with public/audio/sortilege.mp3 exactly.
import { TAU, clamp, easeInCubic, easeOutCubic, easeOutExpo, hash, lerp, makeCanvas, prog, rng, smooth, supportsFilter } from "../cutscene/util.js";

export const T = {
  era: 3.1,
  eraOut: 5.08,
  sepia: 5.1,
  art: 6.3,
  dict: 6.9,
  label1: 7.6,
  label1Out: 9.7,
  curl: 10.1,
  violet: 10.67,
  label2: 10.95,
  label2Out: 12.55,
  flash: 13.23,
  lilac: 13.25,
  sight: 13.35,
  sightOut: 15.1,
  title: 15.5,
  grey: 15.88,
  dark: 16.2,
  end: 18.85,
};

const SERIF = '"EB Garamond", "Cormorant Garamond", Georgia, serif';

// ---- helpers ---------------------------------------------------------------------

function fill(ctx, W, H, c) {
  ctx.fillStyle = c;
  ctx.fillRect(0, 0, W, H);
}

function draw(ctx, img, x, y, w, rot = 0, alpha = 1, mode) {
  if (alpha <= 0.01) return;
  const h = (img.height / img.width) * w;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (mode) ctx.globalCompositeOperation = mode;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function text(ctx, str, x, y, size, { color = "#fff", alpha = 1, italic = true, weight = 500, spacing = 0, glow = null, align = "center", blur = 0 } = {}) {
  if (alpha <= 0.01 || !str) return 0;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${italic ? "italic" : ""} ${weight} ${size}px ${SERIF}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing * size}px`;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = size * 0.4;
  }
  if (blur && supportsFilter) ctx.filter = `blur(${blur}px)`;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

/** Film grain: cached pattern, re-seated every frame. */
function grain(ctx, st, t, alpha) {
  const { W, H } = st;
  if (!st._grain) {
    const S = 256;
    const c = makeCanvas(S, S);
    const x = c.getContext("2d");
    const img = x.createImageData(S, S);
    const r = rng(11);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 22;
    }
    x.putImageData(img, 0, 0);
    st._grain = c;
  }
  if (!st._grainPat || st._grainCtx !== ctx) {
    st._grainPat = ctx.createPattern(st._grain, "repeat");
    st._grainCtx = ctx;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  const f = Math.floor(t * 24);
  ctx.translate(-Math.floor(hash(f) * 256), -Math.floor(hash(f + 3) * 256));
  ctx.fillStyle = st._grainPat;
  ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();
}

function vignette(ctx, st, strength, color = "0,0,0") {
  const { W, H } = st;
  const g = ctx.createRadialGradient(W * 0.55, H * 0.42, H * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.62);
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(1, `rgba(${color},${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ---- chapter 0: a new era of sorcery --------------------------------------------------

function shotEra(ctx, st, t) {
  const { W, H, U } = st;
  fill(ctx, W, H, "#000");
  const lt = t - T.era;
  const line = "a new era of sorcery";
  const size = H * 0.125;
  const x0 = W * 0.52;
  const y0 = H * 0.5;
  // glitching in: letters flicker on, slices tear sideways, colour fringes
  const settle = smooth(lt, 0.05, 0.6);
  const f = Math.floor(t * 30);
  const shown = [...line].map((ch, i) => (hash(i * 7 + f) < 0.25 + settle * 0.9 ? ch : " ")).join("");
  const str = settle > 0.98 ? line : shown;
  const out = 1 - smooth(t, T.eraOut - 0.08, T.eraOut);
  const jitterAmt = (1 - settle) + (lt > 0.95 && lt < 1.1 ? 0.6 : 0);
  if (jitterAmt > 0.02) {
    const slices = 6;
    for (let s = 0; s < slices; s++) {
      const y = y0 - size * 0.7 + (s / slices) * size * 1.4;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, y, W, (size * 1.4) / slices + 1);
      ctx.clip();
      const dx = (hash(s * 13 + f) - 0.5) * size * 1.6 * jitterAmt;
      text(ctx, str, x0 + dx - 2 * U, y0, size, { color: "rgba(255,60,90,0.6)", alpha: out });
      text(ctx, str, x0 + dx + 2 * U, y0, size, { color: "rgba(60,200,255,0.6)", alpha: out });
      text(ctx, str, x0 + dx, y0, size, { color: "#f4f1ea", alpha: out });
      ctx.restore();
    }
  } else {
    text(ctx, str, x0, y0, size, { color: "#f4f1ea", alpha: out, glow: "rgba(255,255,255,0.35)" });
  }
}

// ---- chapter I: sepia architecture -------------------------------------------------------

function sepiaLight(ctx, st, t) {
  const { W, H } = st;
  const g = ctx.createRadialGradient(W * 0.62, H * 0.2, 0, W * 0.55, H * 0.35, Math.hypot(W, H) * 0.75);
  g.addColorStop(0, "#fffaf0");
  g.addColorStop(0.35, "#efe2c6");
  g.addColorStop(0.7, "#a8916f");
  g.addColorStop(1, "#3b2c1d");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // broad diagonal shafts of light, drifting
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(W * 0.5, H * 0.3);
  ctx.rotate(-0.62);
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * W * 0.16 + Math.sin(t * 0.35 + i) * W * 0.03;
    const w = W * (0.04 + hash(i * 5) * 0.08);
    const sg = ctx.createLinearGradient(x - w, 0, x + w, 0);
    sg.addColorStop(0, "rgba(255,246,225,0)");
    sg.addColorStop(0.5, `rgba(255,246,225,${0.14 + 0.08 * hash(i)})`);
    sg.addColorStop(1, "rgba(255,246,225,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(x - w, -H * 1.5, w * 2, H * 3);
  }
  ctx.restore();
  // blurred dark folds in the lower left, like a curtain caught in the light
  if (!st._folds || st._foldsKey !== `${W}x${H}`) {
    const c = makeCanvas(W * 0.6, H * 0.9);
    const x = c.getContext("2d");
    if (supportsFilter) x.filter = `blur(${Math.round(H * 0.012)}px)`;
    // soft diagonal bands of shade and light, like light through folded cloth
    x.translate(0, H * 0.9);
    x.rotate(-0.85);
    for (let i = 0; i < 9; i++) {
      const lightBand = i % 2 === 1;
      x.fillStyle = lightBand ? "rgba(255,248,232,0.35)" : `rgba(60,44,28,${0.16 + 0.06 * (i % 3)})`;
      x.beginPath();
      x.ellipse(i * H * 0.075, 0, H * (0.03 + (i % 3) * 0.012), H * 0.55, 0, 0, TAU);
      x.fill();
    }
    st._folds = c;
    st._foldsKey = `${W}x${H}`;
  }
  ctx.drawImage(st._folds, -W * 0.02 + Math.sin(t * 0.3) * W * 0.01, H * 0.1);
}

const DICT = [
  ["sor·ti·lege, /ˈsôrdəlij/", 0.73, 0.2, 0.055, 6.9],
  ["noun. HISTORICAL", 0.7, 0.28, 0.04, 7.1],
  ["the practice of foretelling the future from", 0.32, 0.37, 0.055, 7.5],
  ["a card or other item drawn at random", 0.38, 0.46, 0.05, 7.9],
  ["the windows and the pillars", 0.3, 0.64, 0.085, 8.0],
];

function shotSepia(ctx, st, t) {
  const { W, H, U, A } = st;
  sepiaLight(ctx, st, t);
  // the drawings drift in as the camera pans right and settles
  const a = smooth(t, T.art, T.art + 1.0);
  if (a > 0) {
    const pan = easeOutCubic(prog(t, T.art, 9.4));
    const camX = lerp(W * 0.3, 0, pan) - (t - 9.4 > 0 ? (t - 9.4) * W * 0.015 : 0);
    const zoom = lerp(1.25, 1.02, pan);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.rotate(lerp(-0.1, -0.05, pan));
    ctx.translate(-W / 2 + camX, -H / 2);
    // dictionary text, large and faint behind the drawings
    for (const [s, x, y, k, t0] of DICT) {
      text(ctx, s, W * x, H * y, H * k, { color: "#4b3a28", alpha: 0.32 * smooth(t, t0, t0 + 0.6), weight: 600, blur: 1.2 * U });
    }
    // a second, faint column further back
    draw(ctx, A.columnFaint, W * 0.36, H * 0.6, H * 0.26, 0.04, 0.3 * a);
    draw(ctx, A.window, W * 0.6, H * 0.66, H * 1.15, -0.06, 0.92 * a);
    draw(ctx, A.column, W * 0.13, H * 0.66, H * 0.3, 0.05, 0.95 * a);
    const la = smooth(t, 8.0, 8.6) * a;
    draw(ctx, A.lantern, W * 0.88 + Math.sin(t * 1.2) * 3 * U, H * 0.2, H * 0.36, Math.sin(t * 1.1) * 0.03, la);
    ctx.restore();
    // the light washes back over the ink
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const wash = ctx.createRadialGradient(W * 0.6, H * 0.2, 0, W * 0.6, H * 0.25, H * 0.9);
    wash.addColorStop(0, "rgba(255,245,220,0.45)");
    wash.addColorStop(1, "rgba(255,245,220,0)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  vignette(ctx, st, 0.55, "40,26,12");
  // label I, typed onto torn paper
  label(ctx, st, t, A.paper1, "I. The magic of time", W * 0.64, H * 0.13, H * 0.115, T.label1, T.label1Out, -0.01, false);
  // first light: the cut lands on a flash of warm white
  const f = Math.exp(-(t - T.sepia) / 0.35);
  if (f > 0.01) fill(ctx, W, H, `rgba(255,250,238,${f})`);
}

/** Torn paper label; the strip unrolls and the words type on. */
function label(ctx, st, t, paper, str, cx, cy, size, t0, t1, rot, flowers) {
  const { A } = st;
  const lt = t - t0;
  if (lt < 0) return;
  const a = smooth(t, t0, t0 + 0.15) * (1 - smooth(t, t1, t1 + 0.35));
  if (a <= 0.01) return;
  ctx.save();
  ctx.font = `italic 500 ${size}px ${SERIF}`;
  const tw = ctx.measureText(str).width;
  const w = tw + size * 1.3;
  const h = size * 1.55;
  const unroll = easeOutCubic(prog(lt, 0, 0.55));
  ctx.globalAlpha = a;
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.save();
  ctx.beginPath();
  ctx.rect(-w / 2, -h, w * unroll, h * 2);
  ctx.clip();
  ctx.shadowColor = "rgba(30,15,0,0.45)";
  ctx.shadowBlur = size * 0.35;
  ctx.shadowOffsetY = size * 0.08;
  ctx.drawImage(paper, -w / 2, -h / 2, w, h);
  ctx.restore();
  if (flowers) {
    for (let i = 0; i < 8; i++) {
      const fx = -w / 2 + (i + 0.5) * (w / 8);
      if (fx > -w / 2 + w * unroll) break;
      ctx.drawImage(A.flower, fx - size * 0.22, -h / 2 - size * 0.18, size * 0.44, size * 0.44);
      ctx.drawImage(A.flower, fx - size * 0.1, h / 2 - size * 0.3, size * 0.4, size * 0.4);
    }
  }
  // type on, one letter at a time
  const n = Math.floor(clamp(prog(lt, 0.05, 0.7)) * str.length);
  ctx.fillStyle = "#24170c";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(str.slice(0, n), -tw / 2, size * 0.04);
  ctx.restore();
}

// ---- chapter II: the violet library ---------------------------------------------------------

function violetLight(ctx, st, t) {
  const { W, H, A } = st;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#3a2a6a");
  g.addColorStop(0.45, "#5b2f8f");
  g.addColorStop(1, "#21123b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // tall blurred window light
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 6; i++) {
    const x = W * (0.12 + i * 0.16) + Math.sin(t * 0.4 + i) * W * 0.01;
    const w = W * (0.05 + hash(i * 3) * 0.05);
    const lg = ctx.createLinearGradient(x - w, 0, x + w, 0);
    const a = 0.16 + 0.12 * hash(i * 7);
    lg.addColorStop(0, "rgba(150,170,255,0)");
    lg.addColorStop(0.5, `rgba(170,185,255,${a})`);
    lg.addColorStop(1, "rgba(150,170,255,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(x - w, 0, w * 2, H * 0.75);
  }
  // bokeh with a faint colour fringe
  for (let i = 0; i < 14; i++) {
    const x = W * hash(i * 11) + Math.sin(t * 0.5 + i) * W * 0.01;
    const y = H * (0.15 + hash(i * 13) * 0.6);
    const s = H * (0.03 + hash(i * 17) * 0.06);
    const tw = 0.5 + 0.5 * Math.sin(t * 1.5 + i * 2);
    ctx.globalAlpha = 0.35 * tw;
    ctx.drawImage(A.bokeh, x - s / 2 - 2, y - s / 2, s, s);
    ctx.globalAlpha = 0.25 * tw;
    ctx.filter = "none";
    ctx.drawImage(A.bokeh, x - s / 2 + 2, y - s / 2, s, s);
  }
  ctx.restore();
  vignette(ctx, st, 0.6, "10,4,24");
}

function shotViolet(ctx, st, t) {
  const { W, H, U, A } = st;
  violetLight(ctx, st, t);
  const lt = t - T.violet;
  const push = 1 + lt * 0.02;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(push, push);
  ctx.translate(-W / 2 - lt * W * 0.01, -H / 2);
  const a = smooth(t, T.violet, T.violet + 0.5);
  // books upper right, the lamp hanging at the left, the star map lower right
  draw(ctx, A.books, W * 0.78, H * 0.26, H * 0.62, 0.05, 0.85 * a);
  draw(ctx, A.lanternLight, W * 0.1, H * 0.22, H * 0.5, Math.sin(t * 1.1) * 0.03 - 0.05, 0.8 * a);
  draw(ctx, A.starMap, W * 0.72, H * 0.92, H * 0.95, -0.12, 0.95 * a);
  ctx.restore();
  // a soft flare drifts across the frame
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const fx = W * (0.35 + lt * 0.04);
  ctx.globalAlpha = 0.5;
  ctx.drawImage(A.bokeh, fx - H * 0.06, H * 0.15 - H * 0.06, H * 0.12, H * 0.12);
  ctx.restore();
  label(ctx, st, t, A.paper2, "II. The fount of knowledge", W * 0.44, H * 0.5, H * 0.115, T.label2, T.label2Out, -0.015, true);
  // the light swells before the cut
  const swell = smooth(t, 12.9, T.flash);
  if (swell > 0) fill(ctx, W, H, `rgba(220,225,255,${swell * 0.6})`);
}

/** The page curl from chapter I into chapter II. */
function shotCurl(ctx, st, t) {
  const { W, H } = st;
  const p = easeInCubic(prog(t, T.curl, T.violet));
  // fold line runs perpendicular to the diagonal, sweeping from the bottom-right corner
  const D = Math.hypot(W, H);
  const dx = -W / D;
  const dy = -H / D;
  const d = p * D * 1.15; // how far the fold has travelled from the corner
  const fx = W + dx * d;
  const fy = H + dy * d;
  // 1) the next page underneath
  shotViolet(ctx, st, T.violet);
  // 2) the current page, clipped to the part not yet turned
  const half = (sx, sy) => {
    ctx.beginPath();
    const nx = -dy;
    const ny = dx;
    ctx.moveTo(fx + nx * D * 2, fy + ny * D * 2);
    ctx.lineTo(fx - nx * D * 2, fy - ny * D * 2);
    ctx.lineTo(fx - nx * D * 2 + sx * D * 3, fy - ny * D * 2 + sy * D * 3);
    ctx.lineTo(fx + nx * D * 2 + sx * D * 3, fy + ny * D * 2 + sy * D * 3);
    ctx.closePath();
  };
  ctx.save();
  half(dx, dy);
  ctx.clip();
  shotSepia(ctx, st, t);
  ctx.restore();
  // 3) the turned flap: the page's white back, reflected over the fold
  const flap = Math.min(d, D * 0.45);
  ctx.save();
  half(dx, dy);
  ctx.clip();
  ctx.beginPath();
  const nx = -dy;
  const ny = dx;
  ctx.moveTo(fx + nx * D * 2, fy + ny * D * 2);
  ctx.lineTo(fx - nx * D * 2, fy - ny * D * 2);
  ctx.lineTo(fx - nx * D * 2 + dx * flap, fy - ny * D * 2 + dy * flap);
  ctx.lineTo(fx + nx * D * 2 + dx * flap, fy + ny * D * 2 + dy * flap);
  ctx.closePath();
  const g = ctx.createLinearGradient(fx, fy, fx + dx * flap, fy + dy * flap);
  g.addColorStop(0, "#9a9aa0");
  g.addColorStop(0.25, "#f2f2f4");
  g.addColorStop(0.8, "#dcdce2");
  g.addColorStop(1, "#b9b9c2");
  ctx.fillStyle = g;
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 30;
  ctx.fill();
  ctx.restore();
}

// ---- chapter III: the lilac sky and the title ----------------------------------------------

function lilacLight(ctx, st, t, dark) {
  const { W, H } = st;
  const g = ctx.createLinearGradient(0, 0, W, H);
  const pale = ["#e2c3ee", "#cfa5e2", "#b98ad6"];
  const deep = ["#8e1fa8", "#5a1478", "#a32ab8"];
  const mix = (a, b) => {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const c = [16, 8, 0].map((s) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, dark)));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  };
  g.addColorStop(0, mix(pale[0], deep[0]));
  g.addColorStop(0.5, mix(pale[1], deep[1]));
  g.addColorStop(1, mix(pale[2], deep[2]));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // a dark pool behind the title and light rays fanning from the upper centre
  const p = ctx.createRadialGradient(W * 0.45, H * 0.2, 0, W * 0.45, H * 0.2, H * 0.8);
  p.addColorStop(0, `rgba(20,0,40,${0.45 * dark})`);
  p.addColorStop(1, "rgba(20,0,40,0)");
  ctx.fillStyle = p;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.22 + Math.sin(t * 0.3 + i) * 0.03;
    const len = H * 1.4;
    ctx.fillStyle = `rgba(255,220,255,${0.05 + 0.04 * hash(i)})`;
    ctx.beginPath();
    ctx.moveTo(W * 0.45, H * 0.55);
    ctx.lineTo(W * 0.45 + Math.cos(a - 0.04) * len, H * 0.55 + Math.sin(a - 0.04) * len);
    ctx.lineTo(W * 0.45 + Math.cos(a + 0.04) * len, H * 0.55 + Math.sin(a + 0.04) * len);
    ctx.fill();
  }
  ctx.restore();
}

function sparkle(ctx, x, y, s, a) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = a;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s * 0.25, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s * 0.25, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - s * 0.6, y);
  ctx.quadraticCurveTo(x, y, x, y + s * 0.15);
  ctx.quadraticCurveTo(x, y, x + s * 0.6, y);
  ctx.quadraticCurveTo(x, y, x, y - s * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function shotLilac(ctx, st, t) {
  const { W, H, U, A } = st;
  const lt = t - T.lilac;
  const dark = smooth(t, 13.5, 14.3);
  lilacLight(ctx, st, t, dark);
  // luminous drawings, turning slowly
  const a = smooth(t, T.lilac, T.lilac + 0.4);
  draw(ctx, A.sun, W * 0.83, H * 0.05, H * 0.95, lt * 0.05, 0.75 * a, "lighter");
  draw(ctx, A.clock, W * 0.14, H * 0.93, H * 1.05, -lt * 0.06, 0.6 * a * smooth(t, 13.6, 14.1), "lighter");
  draw(ctx, A.chain, W * 0.24, H * 0.25, H * 0.7, 0.55, 0.7 * a * smooth(t, 13.8, 14.2), "lighter");
  draw(ctx, A.chain, W * 0.88, H * 0.82, H * 0.7, -0.45, 0.7 * a * smooth(t, 13.9, 14.3), "lighter");
  draw(ctx, A.star5, W * 0.33, H * 0.14, H * 0.1, lt * 0.2, 0.7 * a * smooth(t, 14.0, 14.3), "lighter");
  draw(ctx, A.star5, W * 0.58, H * 0.78, H * 0.08, -lt * 0.2, 0.6 * a * smooth(t, 14.1, 14.4), "lighter");
  for (let i = 0; i < 7; i++) {
    const x = W * (0.1 + hash(i * 5) * 0.8);
    const y = H * (0.1 + hash(i * 7) * 0.8);
    sparkle(ctx, x, y, H * (0.02 + hash(i) * 0.03), (0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))) * a);
  }

  // III: wide-spaced letters that pull together
  const sightA = smooth(t, T.sight, T.sight + 0.2) * (1 - smooth(t, T.sightOut, T.sightOut + 0.35));
  if (sightA > 0) {
    const sp = lerp(0.65, 0.02, easeOutCubic(prog(t, T.sight, 14.0)));
    const size = H * 0.125;
    const glow = "rgba(230,120,255,0.9)";
    text(ctx, "III. The sight of everything", W * 0.5, H * 0.4, size, { weight: 600, spacing: sp, glow, alpha: sightA });
    text(ctx, "imaginable", W * 0.5, H * 0.55, size, { weight: 600, spacing: sp, glow, alpha: sightA });
    // a streak of light through the line
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const sg = ctx.createLinearGradient(0, 0, W, 0);
    sg.addColorStop(0, "rgba(255,230,255,0)");
    sg.addColorStop(0.5, `rgba(255,240,255,${0.5 * sightA})`);
    sg.addColorStop(1, "rgba(255,230,255,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(0, H * 0.43 - 2 * U, W, 4 * U);
    ctx.restore();
  }

  // ~SORTILEGE~ the spellkeeper
  const tA = smooth(t, T.title - 0.02, T.title + 0.04);
  if (tA > 0) {
    const pop = 1 + Math.exp(-(t - T.title) / 0.12) * 0.12;
    titleCard(ctx, st, pop, tA, "rgba(220,110,255,1)", "#fbf4ff");
  }

  // the cut from the violet library lands on a white flash
  const f = Math.exp(-(t - T.flash) / 0.25);
  if (f > 0.01) fill(ctx, W, H, `rgba(255,255,255,${f})`);
}

/** "~SORTILEGE~" with "the spellkeeper" beneath, sized to fit the width. */
function titleCard(ctx, st, pop, alpha, glow, color) {
  const { W, H } = st;
  const str = `~${st.title.toUpperCase()}~`;
  let size = H * 0.22 * pop;
  ctx.save();
  ctx.font = `600 ${size}px ${SERIF}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${0.03 * size}px`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  if (w > W * 0.9) size *= (W * 0.9) / w;
  // drawn twice: a soft halo pass, then the crisp letters
  text(ctx, str, W * 0.5, H * 0.47, size, { color, weight: 600, spacing: 0.03, glow, alpha: alpha * 0.8, italic: false });
  text(ctx, str, W * 0.5, H * 0.47, size, { color, weight: 600, spacing: 0.03, glow, alpha, italic: false });
  text(ctx, "the spellkeeper", W * 0.5, H * 0.47 + size * 0.6, size * 0.34, { color, weight: 600, glow, alpha });
}

function shotGrey(ctx, st, t) {
  const { W, H } = st;
  const lt = t - T.grey;
  const fade = smooth(t, T.dark, 17.9);
  const v = Math.round(lerp(150, 6, fade));
  fill(ctx, W, H, `rgb(${v},${v},${v})`);
  const a = 1 - smooth(t, 16.25, 16.95);
  titleCard(ctx, st, 1, a, "rgba(255,255,255,0.95)", "#f6f6f6");
  // horizontal light streak through the title
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const sg = ctx.createLinearGradient(0, 0, W, 0);
  sg.addColorStop(0, "rgba(255,255,255,0)");
  sg.addColorStop(0.5, `rgba(255,255,255,${0.35 * a})`);
  sg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sg;
  ctx.fillRect(0, H * 0.48, W, H * 0.04);
  ctx.restore();
  const f = Math.exp(-lt / 0.12);
  if (f > 0.01) fill(ctx, W, H, `rgba(235,235,235,${f})`);
}

// ---- composite ------------------------------------------------------------------------------

export function render(ctx, st, t) {
  const { W, H } = st;
  ctx.save();
  if (t < T.era) fill(ctx, W, H, "#000");
  else if (t < T.sepia) shotEra(ctx, st, t);
  else if (t < T.curl) shotSepia(ctx, st, t);
  else if (t < T.violet) shotCurl(ctx, st, t);
  else if (t < T.flash) shotViolet(ctx, st, t);
  else if (t < T.grey) shotLilac(ctx, st, t);
  else shotGrey(ctx, st, t);
  ctx.restore();
  if (t > T.era && t < 17.6) grain(ctx, st, t, t < T.sepia ? 0.6 : 0.9);
}
