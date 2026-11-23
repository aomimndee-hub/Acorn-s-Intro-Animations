// Compass: the 2D half of the cutscene and the master timeline. 3D shots come
// from gl.js; this file lays the token, light, rope, lightning, tide and type
// over them. Every frame is a pure function of the song's current time.
import { TAU, clamp, easeInCubic, easeOutCubic, easeOutExpo, hash, lerp, makeCanvas, prog, rng, smooth } from "../cutscene/util.js";

// Cue points measured from public/audio/compass.mp3.
export const T = {
  hold: 1.45,
  holdOut: 2.15,
  on: 2.37,
  beams: 2.6,
  white: 2.95,
  valley: 3.05,
  tight: 3.5,
  burst: 4.85,
  rise: 5.05,
  my: 5.5,
  compassWord: 5.86,
  is: 6.75,
  cur: [7.29, 7.29, 7.29, 7.6, 7.8, 8.25, 8.25, 8.75, 9.0],
  pale: 8.54,
  paleOut: 10.0,
  push: 10.1,
  dive: 10.95,
  dark: 12.54,
  beam: 13.75,
  im: 16.34,
  piercing: 16.75,
  through: 17.25,
  the: 17.73,
  rope: 18.03,
  flash: 18.37,
  that: 18.5,
  stran: 18.75,
  led: 19.5,
  zoom: 20.1,
  loops: 20.7,
  you: 20.98,
  and: 21.83,
  me: 22.14,
  let: 23.08,
  us: 23.42,
  bolt: 23.42,
  be: 24.14,
  free: 24.81,
  tide: 29.0,
  grow: 45.6,
  off: 46.64,
  end: 47.15,
};

const BEAT = 0.34;
const PHASE = 0.14;
const beatPulse = (t, decay = 0.1) => Math.exp(-((((t - PHASE) % BEAT) + BEAT) % BEAT) / decay);
const beatIndex = (t) => Math.floor((t - PHASE) / BEAT);

const SERIF = '"Cinzel", "Cormorant Garamond", Georgia, "Times New Roman", serif';
const BOOK = '"Cormorant Garamond", Georgia, serif';

const LYRICS_FREE = [[25.5, "high"], [27.0, "high tide"], [28.3, "low"]];
const LYRICS_TIDE = [
  [29.0, "low"], [29.5, "low tide"], [31.0, "high"], [32.25, "high tide"], [33.75, "low"], [35.1, "low tide"],
  [36.5, "high"], [37.9, "high tide"], [39.25, "low"], [40.6, "low tide"], [41.75, "high"], [43.2, "high tide"],
  [44.5, "low"], [45.9, "low tide"],
];
const lyricAt = (list, t) => {
  let s = null;
  for (const [t0, w] of list) if (t >= t0) s = [t0, w];
  return s;
};

// ---- sprites ---------------------------------------------------------------------

function glowSprite(r, g, b, size = 256) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const grd = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grd.addColorStop(0.2, `rgba(${r},${g},${b},0.5)`);
  grd.addColorStop(0.5, `rgba(${r},${g},${b},0.14)`);
  grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = grd;
  x.fillRect(0, 0, size, size);
  return c;
}

/** Four-point star with curved, tapering arms and a soft bloom. */
function star4Sprite(core, glow, size = 512) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const R = size / 2;
  x.translate(R, R);
  const halo = x.createRadialGradient(0, 0, 0, 0, 0, R * 0.5);
  halo.addColorStop(0, glow.replace("A", "0.55"));
  halo.addColorStop(1, glow.replace("A", "0"));
  x.fillStyle = halo;
  x.fillRect(-R, -R, size, size);
  const arm = R * 0.96;
  const w = R * 0.1;
  x.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const nx = Math.cos(a + Math.PI / 4);
    const ny = Math.sin(a + Math.PI / 4);
    if (i === 0) x.moveTo(ca * arm, sa * arm);
    x.quadraticCurveTo(nx * w, ny * w, Math.cos(a + TAU / 4) * arm, Math.sin(a + TAU / 4) * arm);
  }
  x.closePath();
  const g = x.createRadialGradient(0, 0, 0, 0, 0, arm);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.25, core);
  g.addColorStop(1, glow.replace("A", "0.2"));
  x.fillStyle = g;
  x.fill();
  return c;
}

function smearSprite(seed) {
  const W = 160;
  const H = 260;
  const c = makeCanvas(W, H);
  const x = c.getContext("2d");
  const r = rng(seed);
  x.globalCompositeOperation = "lighter";
  for (let i = 0; i < 26; i++) {
    const px = W * (0.15 + r() * 0.7);
    const py = H * (0.2 + r() * 0.6);
    const h = H * (0.15 + r() * 0.45);
    const w = 3 + r() * 10;
    const g = x.createLinearGradient(0, py - h / 2, 0, py + h / 2);
    const a = 0.12 + r() * 0.3;
    g.addColorStop(0, "rgba(110,90,255,0)");
    g.addColorStop(0.5, `rgba(${r() > 0.75 ? "235,230,255" : "120,100,255"},${a})`);
    g.addColorStop(1, "rgba(110,90,255,0)");
    x.fillStyle = g;
    x.beginPath();
    x.ellipse(px, py, w, h / 2, 0, 0, TAU);
    x.fill();
  }
  return c;
}

function smokeSprite(seed, rgb) {
  const S = 384;
  const c = makeCanvas(S, S);
  const x = c.getContext("2d");
  const r = rng(seed);
  for (let i = 0; i < 50; i++) {
    const a = r() * TAU;
    const d = Math.pow(r(), 0.7) * S * 0.3;
    const px = S / 2 + Math.cos(a) * d;
    const py = S / 2 + Math.sin(a) * d * 0.7;
    const rr = S * (0.05 + r() * 0.15);
    const g = x.createRadialGradient(px, py, 0, px, py, rr);
    g.addColorStop(0, `rgba(${rgb},${0.05 + r() * 0.08})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g;
    x.beginPath();
    x.arc(px, py, rr, 0, TAU);
    x.fill();
  }
  return c;
}

function grainSprite() {
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

export function buildSprites2D() {
  return {
    glowW: glowSprite(255, 255, 255),
    glowB: glowSprite(150, 160, 255),
    glowV: glowSprite(170, 120, 255),
    glowG: glowSprite(255, 200, 90),
    star: star4Sprite("#eef0ff", "rgba(170,160,255,A)"),
    starGold: star4Sprite("#fff4d0", "rgba(255,190,90,A)"),
    smears: [smearSprite(3), smearSprite(7), smearSprite(11), smearSprite(19)],
    smokeB: [smokeSprite(5, "120,140,255"), smokeSprite(8, "160,170,255")],
    grain: grainSprite(),
  };
}

// ---- helpers -----------------------------------------------------------------------

function sprite(ctx, img, x, y, w, h = w, alpha = 1, rot = 0) {
  if (alpha <= 0.01 || w <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function tok(ctx, img, x, y, h, rot = 0, alpha = 1) {
  if (!img || alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.drawImage(img, -h / 2, -h / 2, h, h);
  ctx.restore();
}

/** Token with a soft light halo and an overexposure white pass. */
function heroToken(ctx, st, x, y, h, { alpha = 1, white = 0, halo = 1, rot = 0 } = {}) {
  const K = st.tokS;
  if (!K || alpha <= 0.01) return;
  const hs = h * K.haloScale;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.85 * halo * alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.drawImage(K.halo, -hs / 2, -hs / 2, hs, hs);
  ctx.restore();
  tok(ctx, K.base, x, y, h, rot, alpha);
  if (white > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    tok(ctx, K.white, x, y, h, rot, clamp(white) * alpha);
    ctx.restore();
  }
}

/** The token laid onto a projected plane (a compass dial), clipped to a circle. */
function tokenOnDial(ctx, st, f, alpha) {
  if (!st.tokS || alpha <= 0.01 || f.depth > 1) return;
  ctx.save();
  ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([f.ax, f.ay, -f.bx, -f.by, f.cx, f.cy])));
  ctx.beginPath();
  ctx.arc(0, 0, 0.98, 0, TAU);
  ctx.clip();
  ctx.globalAlpha = alpha * 0.55;
  ctx.fillStyle = "#0c0a24";
  ctx.fillRect(-1, -1, 2, 2);
  ctx.globalAlpha = alpha;
  ctx.drawImage(st.tokS.base, -0.95, -0.95, 1.9, 1.9);
  // glass sheen across the face
  const g = ctx.createLinearGradient(-1, -1, 1, 1);
  g.addColorStop(0, "rgba(255,255,255,0.35)");
  g.addColorStop(0.35, "rgba(255,255,255,0)");
  g.addColorStop(0.7, "rgba(160,170,255,0)");
  g.addColorStop(1, "rgba(160,170,255,0.25)");
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

/** Chrome lettering in 2D: banded gradient, indigo edge, white bloom. */
function chrome(ctx, str, x, y, size, { alpha = 1, rot = 0, spacing = 0.02, glow = 1, scale = 1 } = {}) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.font = `700 ${size}px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing * size}px`;
  const g = ctx.createLinearGradient(0, -size * 0.45, 0, size * 0.45);
  g.addColorStop(0, "#ecea72");
  g.addColorStop(0.3, "#fbfbe6");
  g.addColorStop(0.5, "#ffffff");
  g.addColorStop(0.68, "#4a46cf");
  g.addColorStop(1, "#dcdcff");
  ctx.shadowColor = `rgba(200,200,255,${0.9 * glow})`;
  ctx.shadowBlur = size * 0.35 * glow;
  ctx.fillStyle = g;
  ctx.fillText(str, 0, 0);
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1, size * 0.018);
  ctx.strokeStyle = "rgba(40,30,120,0.55)";
  ctx.strokeText(str, 0, 0);
  ctx.restore();
}

function serifText(ctx, str, x, y, size, alpha, color = "#f4f2ff") {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `600 ${size}px ${BOOK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(190,180,255,0.9)";
  ctx.shadowBlur = size * 0.5;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

function fill(ctx, W, H, c) {
  ctx.fillStyle = c;
  ctx.fillRect(0, 0, W, H);
}

// ---- title cards -------------------------------------------------------------------

function overlayTitle(ctx, st, t) {
  const { W, H, U, S } = st;
  if (t >= T.on) {
    // twinkling stars across the frame
    for (let i = 0; i < 34; i++) {
      const x = W * hash(i * 7);
      const y = H * hash(i * 11);
      const tw = 0.5 + 0.5 * Math.sin(t * (6 + hash(i) * 6) + i);
      const s = H * (0.03 + hash(i * 13) * 0.05) * (0.6 + tw * 0.5) * smooth(t, T.on + 0.05 + hash(i * 3) * 0.15, T.on + 0.25);
      sprite(ctx, S.star, x, y, s * 1.8, s * 1.8, 0.85);
    }
    // vertical light beams sweeping through
    const bp = prog(t, T.beams, T.white);
    if (bp > 0 && bp < 1) {
      for (let k = 0; k < 4; k++) {
        const x = W * (0.42 + k * 0.05 + Math.sin(bp * 6 + k) * 0.02);
        const a = Math.sin(bp * Math.PI) * (0.5 + 0.5 * hash(k + Math.floor(t * 30)));
        const g = ctx.createLinearGradient(x - 10 * U, 0, x + 10 * U, 0);
        g.addColorStop(0, "rgba(200,200,255,0)");
        g.addColorStop(0.5, `rgba(255,255,255,${a})`);
        g.addColorStop(1, "rgba(200,200,255,0)");
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = g;
        ctx.fillRect(x - 10 * U, 0, 20 * U, H);
        ctx.restore();
      }
    }
  }
  // the white-out into the valley
  const w = smooth(t, T.white - 0.12, T.white);
  if (w > 0) fill(ctx, W, H, `rgba(255,255,255,${w})`);
}

// ---- valley --------------------------------------------------------------------------

function overlayValley(ctx, st, t, p) {
  const { W, H, U, S } = st;
  // light burst behind the rocks
  const burst = Math.exp(-Math.max(0, t - T.burst) / 0.25) * (t >= T.burst ? 1 : 0);
  if (burst > 0.01) {
    sprite(ctx, S.glowB, W / 2, H * 0.4, W * 1.6, H * 1.4, burst * 0.9);
  }
  // the token rises from the vortex on a pillar of light
  const rise = easeOutCubic(prog(t, T.rise, T.rise + 1.6));
  if (rise > 0 && p) {
    const [x, y] = p;
    const h = H * 0.24 * (0.5 + 0.5 * rise);
    const yy = y - h * 0.4 + (1 - rise) * H * 0.12;
    const pillar = ctx.createLinearGradient(0, yy - H * 0.4, 0, y + H * 0.15);
    pillar.addColorStop(0, "rgba(200,170,255,0)");
    pillar.addColorStop(0.7, `rgba(230,210,255,${0.35 * rise})`);
    pillar.addColorStop(1, "rgba(255,200,120,0)");
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = pillar;
    ctx.fillRect(x - h * 0.35, yy - H * 0.4, h * 0.7, H * 0.55 + h);
    ctx.restore();
    const dive = smooth(t, T.push, T.dive);
    heroToken(ctx, st, x, yy, h * (1 + dive * 0.6), { alpha: rise * (1 - smooth(t, T.push, T.push + 0.5)), white: (1 - rise) * 1.2 + beatPulse(t) * 0.25, rot: Math.sin(t * 0.8) * 0.05 });
    // motes spiralling up around the token
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU + t * (0.8 + hash(i) * 0.6);
      const r = h * (0.4 + hash(i * 3) * 0.5);
      const up = ((t * 0.25 + hash(i * 7)) % 1);
      sprite(ctx, S.glowV, x + Math.cos(a) * r, yy + h * 0.5 - up * h * 1.6, 10 * U, 10 * U, rise * (1 - up) * (1 - dive));
    }
  }
  // the dive ends in a gold flash
  const f = smooth(t, T.dive - 0.15, T.dive);
  if (f > 0) sprite(ctx, S.glowG, W / 2, H / 2, W * 1.4 * f, W * 1.4 * f, f * 0.8);
}

// ---- tunnel / dark / beam / close ---------------------------------------------------

function overlayTunnel(ctx, st, t, frame) {
  const { W, H, S } = st;
  const lt = t - T.dive;
  // the hot core at the far end of the tunnel
  const core = 0.6 + 0.4 * beatPulse(t);
  sprite(ctx, S.glowG, W / 2, H / 2, H * 0.5 * core, H * 0.5 * core, 0.55);
  sprite(ctx, S.starGold, W / 2, H / 2, H * (0.3 + core * 0.12), H * (0.3 + core * 0.12), 0.85, t * 0.3);
  // orange flash fading out from the dive
  const f = Math.exp(-lt / 0.25);
  if (f > 0.01) sprite(ctx, S.glowG, W / 2, H / 2, W * 2, W * 2, f);
  tokenOnDial(ctx, st, frame, smooth(t, T.dive + 0.6, T.dive + 1.0));
  // fade to the dark void
  const out = smooth(t, T.dark - 0.12, T.dark);
  if (out > 0) fill(ctx, W, H, `rgba(6,10,52,${out})`);
}

function overlayBeam(ctx, st, t, p) {
  const { W, H, U, S } = st;
  const [sx, sy] = p;
  if (t < T.beam) {
    // a lone compass glinting in the void
    for (let i = 0; i < 40; i++) {
      const a = hash(i * 5) * TAU + t * 0.3;
      const r = H * (0.02 + hash(i * 7) * 0.08);
      const tw = 0.5 + 0.5 * Math.sin(t * 8 + i * 3);
      sprite(ctx, S.glowB, sx + Math.cos(a) * r, sy + Math.sin(a) * r * 0.8, 5 * U, 5 * U, tw);
    }
    const intro = smooth(t, T.beam - 0.3, T.beam);
    if (intro > 0) sprite(ctx, S.glowW, sx, sy, H * intro, H * intro, intro);
    return;
  }
  const bt = t - T.beam;
  // drifting blue smoke
  for (let i = 0; i < 7; i++) {
    const img = S.smokeB[i % 2];
    const s = W * (0.6 + hash(i) * 0.6);
    const x = W * (hash(i * 3) * 1.2 - 0.1) + Math.sin(t * 0.2 + i) * W * 0.04;
    const y = H * (0.05 + hash(i * 5) * 0.5);
    sprite(ctx, img, x, y, s, s * 0.7, 0.55, t * 0.03 * (i % 2 ? 1 : -1));
  }
  // light cone from the star down onto the letters
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const cone = ctx.createLinearGradient(0, sy, 0, H);
  cone.addColorStop(0, "rgba(220,225,255,0.55)");
  cone.addColorStop(1, "rgba(150,170,255,0.08)");
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(sx - 4 * U, sy);
  ctx.lineTo(sx + 4 * U, sy);
  ctx.lineTo(sx + W * 0.16, H);
  ctx.lineTo(sx - W * 0.16, H);
  ctx.fill();
  // rays fanning out of the star
  for (let i = 0; i < 16; i++) {
    const a = Math.PI / 2 + (hash(i * 3) - 0.5) * 2.6;
    const len = H * (0.5 + hash(i * 7) * 0.8);
    const g = ctx.createLinearGradient(sx, sy, sx + Math.cos(a) * len, sy + Math.sin(a) * len);
    g.addColorStop(0, `rgba(190,200,255,${0.12 + 0.1 * Math.sin(t * 2 + i)})`);
    g.addColorStop(1, "rgba(190,200,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a - 0.03) * len, sy + Math.sin(a - 0.03) * len);
    ctx.lineTo(sx + Math.cos(a + 0.03) * len, sy + Math.sin(a + 0.03) * len);
    ctx.fill();
  }
  ctx.restore();
  const pulse = 1 + 0.2 * beatPulse(t);
  sprite(ctx, S.glowW, sx, sy, H * 0.35 * pulse, H * 0.35 * pulse, 0.9);
  sprite(ctx, S.star, sx, sy, H * 0.3 * pulse, H * 0.3 * pulse, 1, bt * 0.15);
  // the token descends in the light
  const d = smooth(t, 14.6, 15.6);
  if (d > 0) heroToken(ctx, st, sx, lerp(sy + H * 0.06, sy + H * 0.2, d), H * 0.16, { alpha: d, white: (1 - d) * 1.5 + 0.25 * beatPulse(t), halo: 1.2 });
  const flash = smooth(t, T.piercing - 0.1, T.piercing);
  if (flash > 0) fill(ctx, W, H, `rgba(255,255,255,${flash})`);
}

function overlayClose(ctx, st, t, res) {
  const { W, H, U, S } = st;
  const { dial, glint } = res;
  const lt = t - T.piercing;
  // flash in from the beam shot
  const f = Math.exp(-lt / 0.18);
  tokenOnDial(ctx, st, dial, smooth(lt, 0.15, 0.5));
  // lens flare riding the compass rim
  const [gx, gy] = glint;
  const pulse = 1 + 0.25 * beatPulse(t);
  sprite(ctx, S.glowW, gx, gy, H * 0.55 * pulse, H * 0.55 * pulse, 0.6);
  sprite(ctx, S.star, gx, gy, H * 0.3 * pulse, H * 0.3 * pulse, 0.9);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const streak = ctx.createLinearGradient(0, 0, W, 0);
  streak.addColorStop(0, "rgba(120,140,255,0)");
  streak.addColorStop(0.5, "rgba(235,240,255,0.95)");
  streak.addColorStop(1, "rgba(120,140,255,0)");
  ctx.fillStyle = streak;
  ctx.fillRect(0, gy - 2 * U, W, 4 * U);
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, gy - 10 * U, W, 20 * U);
  ctx.restore();
  for (let k = 1; k <= 3; k++) {
    const gxk = lerp(gx, W - gx, k * 0.3);
    const gyk = lerp(gy, H - gy, k * 0.3);
    sprite(ctx, S.glowB, gxk, gyk, H * 0.08 * k, H * 0.08 * k, 0.35);
  }
  if (f > 0.01) fill(ctx, W, H, `rgba(255,255,255,${f})`);
  // lilac flash with a twisting white cord before the rope shot
  const out = smooth(t, T.flash - 0.08, T.flash);
  if (out > 0) fill(ctx, W, H, `rgba(110,100,240,${out})`);
  // a white cord twists up out of the flash
  if (t >= T.flash) {
    const k = easeOutExpo(prog(t, T.flash, T.that));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 80; i++) {
      const p = i / 80;
      if (p > k) break;
      const y = H * (1.05 - p * 1.0);
      const r = H * 0.09 * (1 - p * 0.8);
      const x = W / 2 + Math.sin(p * 18 - t * 10) * r * 0.35;
      sprite(ctx, S.glowW, x, y, r * 2.6, r * 2.2, 0.9);
    }
    ctx.restore();
  }
}

// ---- rope ------------------------------------------------------------------------------

function strokeRope(ctx, pts, width, U, alpha = 1) {
  if (pts.length < 2 || alpha <= 0.01) return;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "rgba(255,190,60,0.18)";
  ctx.lineWidth = width * 5;
  path();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,200,70,0.5)";
  ctx.lineWidth = width * 2;
  path();
  ctx.stroke();
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = "#f6c83a";
  ctx.lineWidth = width;
  path();
  ctx.stroke();
  // braid: short bright twists along the strand
  ctx.strokeStyle = "rgba(255,250,210,0.95)";
  ctx.lineWidth = Math.max(1, width * 0.45);
  ctx.setLineDash([width * 0.9, width * 1.1]);
  path();
  ctx.stroke();
  ctx.restore();
}

function ropeLine(t, W, H) {
  // keyframed angle of a straight rope through the frame
  const keys = [[18.5, 1.57], [18.95, 1.35], [19.2, 0.75], [19.45, 0.2], [19.7, 1.57], [20.1, -0.55], [20.35, 0.55], [20.6, 0.35]];
  let a = keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, a0] = keys[i];
    const [t1, a1] = keys[i + 1];
    if (t >= t0 && t < t1) a = lerp(a0, a1, easeOutCubic(prog(t, t0, t0 + Math.min(0.18, t1 - t0))));
    else if (t >= t1) a = a1;
  }
  const L = Math.hypot(W, H);
  const cx = W * 0.5;
  const cy = H * 0.5;
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const s = (i / 60 - 0.5) * L * 1.2;
    const wob = Math.sin(i * 0.5 + t * 6) * 3;
    pts.push([cx + Math.cos(a) * s - Math.sin(a) * wob, cy - Math.sin(a) * s + Math.cos(a) * wob]);
  }
  return pts;
}

function ropeLoops(t, W, H, cx, cy, Rb) {
  const turns = lerp(0, 4.2, easeOutCubic(prog(t, T.loops, 22.4)));
  const n = Math.max(2, Math.floor(turns * 90));
  const pts = [];
  const rot = t * 0.35;
  for (let i = 0; i <= n; i++) {
    const s = (i / 90) * TAU;
    const r = Rb * (1 + 0.22 * Math.sin(s * 1.5 + 1) + 0.1 * Math.sin(s * 3.7) + 0.06 * Math.sin(t * 2 + s));
    const ox = Math.sin(s * 0.27) * Rb * 0.18;
    const oy = Math.cos(s * 0.31) * Rb * 0.12;
    pts.push([cx + ox + Math.cos(s + rot) * r, cy + oy + Math.sin(s + rot) * r * 0.92]);
  }
  // tail running off toward the lower right
  if (n > 2) {
    const [ex, ey] = pts[pts.length - 1];
    for (let k = 1; k <= 20; k++) pts.push([lerp(ex, W * 0.72, k / 20), lerp(ey, H * 1.1, k / 20) + Math.sin(k) * 4]);
  }
  return pts;
}

function bolt(ctx, x0, y0, x1, y1, depth, seed, width) {
  const r = rng(seed);
  const pts = [[x0, y0], [x1, y1]];
  for (let d = 0; d < depth; d++) {
    for (let i = pts.length - 1; i > 0; i--) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const len = Math.hypot(bx - ax, by - ay);
      const nx = -(by - ay) / len;
      const ny = (bx - ax) / len;
      const off = (r() - 0.5) * len * 0.45;
      pts.splice(i, 0, [(ax + bx) / 2 + nx * off, (ay + by) / 2 + ny * off]);
    }
  }
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineWidth = width;
  ctx.stroke();
  return pts;
}

function lightning(ctx, cx, cy, R, t, intensity, U) {
  const frame = Math.floor(t * 18);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + hash(i * 13 + frame) * 0.6;
    const len = R * (0.6 + hash(i * 7 + frame) * 0.5);
    const ex = cx + Math.cos(a) * len;
    const ey = cy + Math.sin(a) * len;
    for (const [w, col] of [[10, "rgba(90,90,255,0.18)"], [4, "rgba(150,160,255,0.55)"], [1.5, "rgba(240,240,255,1)"]]) {
      ctx.strokeStyle = col;
      ctx.globalAlpha = intensity;
      const pts = bolt(ctx, cx, cy, ex, ey, 5, i * 101 + frame * 7, w * U);
      // a branch off the middle
      const m = pts[Math.floor(pts.length * (0.35 + hash(i + frame) * 0.3))];
      const ba = a + (hash(i * 3 + frame) - 0.5) * 1.6;
      bolt(ctx, m[0], m[1], m[0] + Math.cos(ba) * len * 0.45, m[1] + Math.sin(ba) * len * 0.45, 4, i * 57 + frame * 3, w * 0.7 * U);
    }
  }
  // a ring of electric cells around the core
  ctx.strokeStyle = "rgba(200,205,255,0.8)";
  ctx.lineWidth = 1.5 * U;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU + frame * 0.3;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * R * 0.18, cy + Math.sin(a) * R * 0.18, R * 0.08, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function shotRope(ctx, st, t) {
  const { W, H, U, S } = st;
  fill(ctx, W, H, "#030431");
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.1, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  vg.addColorStop(0, "rgba(30,30,110,0.6)");
  vg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  // dust
  for (let i = 0; i < 30; i++) {
    sprite(ctx, S.glowB, W * hash(i * 3), ((hash(i * 5) - t * 0.01) % 1 + 1) % 1 * H, 4 * U, 4 * U, 0.5);
  }
  const zoom = t >= T.zoom && t < T.loops ? 1 + easeOutCubic(prog(t, T.zoom, T.zoom + 0.35)) * 0.7 : 1;
  if (t < T.loops) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H / 2);
    strokeRope(ctx, ropeLine(t, W, H), 4.5 * U * zoom, U);
    const size = H * 0.085;
    const out = 1 - smooth(t, T.zoom + 0.25, T.loops);
    chrome(ctx, "THAT", W * 0.36, H * 0.34, size, { alpha: smooth(t, T.that, T.that + 0.05) * out });
    const strangled = t >= T.led ? "STRANGLED" : "STRAN";
    chrome(ctx, strangled, W * 0.66, H * 0.68, size, { alpha: smooth(t, T.stran, T.stran + 0.05) * out });
    ctx.restore();
    return;
  }
  // the rope winds round and round the token
  const cx = W * 0.5;
  const cy = H * 0.5;
  const tight = smooth(t, 22.4, T.bolt);
  const Rb = H * lerp(0.36, 0.3, tight);
  const breaking = t >= T.be;
  const bound = smooth(t, T.you, T.you + 0.5);
  const free = breaking ? easeOutExpo(prog(t, T.be, T.be + 0.25)) : 0;
  // token inside the loops: dim and blue while bound, burning white as it breaks free
  const tokH = H * 0.3 * (1 + free * 0.15);
  if (bound > 0) {
    ctx.save();
    ctx.globalAlpha = bound;
    heroToken(ctx, st, cx, cy, tokH, { alpha: bound, white: free * 1.2 + (t >= T.bolt ? 0.3 * beatPulse(t, 0.06) : 0), halo: 0.4 + free });
    if (!breaking) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = `rgba(20,20,90,${0.45 * tight})`;
      ctx.fillRect(cx - tokH, cy - tokH, tokH * 2, tokH * 2);
    }
    ctx.restore();
  }
  if (t >= T.bolt) lightning(ctx, cx, cy, H * (0.42 + free * 0.4), t, breaking ? 1 - smooth(t, T.be + 0.3, T.free) : 0.9, U);
  if (!breaking) {
    strokeRope(ctx, ropeLoops(t, W, H, cx, cy, Rb), 3.6 * U, U);
  } else {
    // the rope bursts into pieces that fly outward
    const pts = ropeLoops(Math.min(t, T.be), W, H, cx, cy, Rb);
    const k = easeOutCubic(prog(t, T.be, T.be + 0.6));
    for (let s = 0; s < pts.length - 12; s += 12) {
      const seg = pts.slice(s, s + 13);
      const mx = seg[6][0] - cx;
      const my = seg[6][1] - cy;
      const push = k * H * 0.6;
      const d = Math.hypot(mx, my) || 1;
      strokeRope(ctx, seg.map(([x, y]) => [x + (mx / d) * push, y + (my / d) * push]), 3.6 * U, U, 1 - k);
    }
  }
  // words caught in the loops
  const wsize = H * 0.065;
  const youP = easeOutExpo(prog(t, T.you, T.you + 0.4));
  chrome(ctx, "YOU", lerp(W * 0.3, cx - W * 0.02, youP), lerp(H * 0.62, cy - H * 0.22, youP), wsize, { alpha: smooth(t, T.you, T.you + 0.05) * (1 - smooth(t, T.let - 0.2, T.let)), rot: lerp(-1.2, -0.35, youP), scale: lerp(1.9, 1, youP) });
  chrome(ctx, "AND", cx - W * 0.09, cy + H * 0.12, wsize * 0.9, { alpha: smooth(t, T.and, T.and + 0.05) * (1 - smooth(t, T.let - 0.2, T.let)), rot: 0.3 });
  const meP = easeOutExpo(prog(t, T.me, T.me + 0.35));
  chrome(ctx, "ME", lerp(W * 0.8, cx + W * 0.11, meP), lerp(H * 0.75, cy + H * 0.16, meP), wsize, { alpha: smooth(t, T.me, T.me + 0.05) * (1 - smooth(t, T.let - 0.2, T.let)), rot: -0.5, scale: lerp(2.4, 1, meP) });
  chrome(ctx, "LET", cx - W * 0.1, cy - H * 0.2, wsize * 1.1, { alpha: smooth(t, T.let, T.let + 0.05), rot: -0.5 });
  chrome(ctx, "US", cx + W * 0.08, cy - H * 0.24, wsize * 1.1, { alpha: smooth(t, T.us, T.us + 0.05), rot: 0.5 });
  chrome(ctx, "BE", cx, cy + H * 0.25, wsize * 1.3, { alpha: smooth(t, T.be, T.be + 0.05), scale: 1 + Math.exp(-(t - T.be) / 0.1) * 0.6 });
  // strike flashes
  if (t >= T.bolt) {
    const strike = Math.exp(-(((t - T.bolt) % 0.34) / 0.05)) * 0.25 + (breaking ? Math.exp(-(t - T.be) / 0.12) : 0);
    if (strike > 0.01) fill(ctx, W, H, `rgba(160,170,255,${clamp(strike)})`);
  }
  const white = smooth(t, T.free - 0.2, T.free);
  if (white > 0) fill(ctx, W, H, `rgba(255,255,255,${white})`);
}

// ---- free and tide ------------------------------------------------------------------------

function smearField(ctx, st, t, amount, alpha) {
  const { W, H, S } = st;
  const b = beatIndex(t);
  for (let i = 0; i < amount; i++) {
    // clusters re-seat every two beats, as in the edit's shimmering cuts
    const k = i + Math.floor(b / 2) * 7;
    const x = W * (0.02 + hash(k * 3 + i) * 0.96);
    const y = H * (0.05 + hash(k * 5 + i * 2) * 0.9);
    const s = H * (0.18 + hash(i * 7) * 0.26);
    const a = alpha * (0.45 + 0.55 * hash(k * 11)) * (0.75 + 0.35 * beatPulse(t, 0.18));
    sprite(ctx, S.smears[i % 4], x, y + Math.sin(t * 0.6 + i) * H * 0.01, s * 0.62, s, a);
  }
}

function overlayFree(ctx, st, t, p) {
  const { W, H, S } = st;
  const lt = t - T.free;
  // first beat lands on white
  const f = Math.exp(-lt / 0.2);
  smearField(ctx, st, t, 24, smooth(t, 26.4, 28.2) * 0.85);
  // the token floats up above the word
  const up = smooth(t, 25.2, 26.6);
  heroToken(ctx, st, W * 0.5, lerp(H * 0.36, H * 0.22, up) + Math.sin(t * 1.2) * H * 0.008, H * 0.22, { alpha: up * (1 - smooth(t, 28.6, T.tide)), white: (1 - up) + 0.2 * beatPulse(t), halo: 1.2 });
  // star sparkle on the word
  const pulse = 1 + 0.25 * beatPulse(t);
  sprite(ctx, S.star, W * 0.49, H * 0.53, H * 0.32 * pulse, H * 0.32 * pulse, 0.9, Math.sin(t * 0.7) * 0.4);
  const ly = lyricAt(LYRICS_FREE, t);
  if (ly) serifText(ctx, ly[1], W / 2, H * 0.7, H * 0.04, smooth(t, ly[0], ly[0] + 0.12), t < 27 ? "#7a74d8" : "#f4f2ff");
  if (f > 0.01) fill(ctx, W, H, `rgba(255,255,255,${f})`);
}

function shotTide(ctx, st, t) {
  const { W, H, U, S } = st;
  const lt = t - T.tide;
  fill(ctx, W, H, "#0c0a2a");
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.hypot(W, H) * 0.55);
  vg.addColorStop(0, "rgba(40,30,120,0.55)");
  vg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  smearField(ctx, st, t, 24, 0.9);

  // the tide line: rises on "high", falls on "low"
  const ly = lyricAt(LYRICS_TIDE, t);
  const high = ly && ly[1].startsWith("high");
  const target = high ? 0.74 : 0.86;
  const prevLy = lyricAt(LYRICS_TIDE, ly ? ly[0] - 0.01 : t);
  const from = prevLy && prevLy[1].startsWith("high") ? 0.74 : 0.86;
  const level = H * lerp(from, target, easeOutCubic(prog(t, ly ? ly[0] : t, (ly ? ly[0] : t) + 1.0)));
  const water = ctx.createLinearGradient(0, level, 0, H);
  water.addColorStop(0, "rgba(120,110,255,0.32)");
  water.addColorStop(0.08, "rgba(40,30,140,0.55)");
  water.addColorStop(1, "rgba(8,6,40,0.9)");
  ctx.fillStyle = water;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, level + Math.sin(x * 0.012 + t * 1.6) * 4 * U + Math.sin(x * 0.031 - t * 2.3) * 2 * U);
  ctx.lineTo(W, H);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "rgba(210,205,255,0.7)";
  ctx.lineWidth = 1.5 * U;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 16) {
    const y = level + Math.sin(x * 0.012 + t * 1.6) * 4 * U + Math.sin(x * 0.031 - t * 2.3) * 2 * U;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  // the star with the token at its heart
  const grow = easeInCubic(prog(t, T.grow, T.off));
  const pulse = 1 + 0.18 * beatPulse(t);
  const cx = W / 2;
  const cy = H * 0.45;
  const sr = H * (0.4 + grow * 1.8) * pulse;
  const srot = Math.sin(lt * 0.35) * 0.35 + grow * 1.2;
  sprite(ctx, S.glowV, cx, cy, sr * 1.6, sr * 1.6, 0.55);
  sprite(ctx, S.star, cx, cy, sr, sr, 0.95, srot);
  // a shimmer on the water under the star
  sprite(ctx, S.glowB, cx, level + 2 * U, W * 0.5, 14 * U, 0.6);
  const tokA = smooth(t, T.tide + 0.2, T.tide + 1.2);
  heroToken(ctx, st, cx, cy + Math.sin(t * 0.9) * H * 0.01, H * 0.26, { alpha: tokA, white: grow * 1.5 + beatPulse(t) * 0.18, halo: 1 });

  if (ly) serifText(ctx, ly[1], W / 2, H * 0.68, H * 0.045, smooth(t, ly[0], ly[0] + 0.12) * (1 - grow));
  // the token's name surfaces near the end
  const nameA = smooth(t, 44.2, 44.9) * (1 - smooth(t, T.off - 0.1, T.off));
  if (st.name) chrome(ctx, st.name.toUpperCase(), W / 2, H * 0.16, H * 0.07, { alpha: nameA, spacing: 0.12 });
}

/** Old-TV switch-off: the picture squashes to a line, then a dot. */
function switchOff(ctx, st, t, draw) {
  const { W, H } = st;
  const p = prog(t, T.off, T.off + 0.16);
  const q = prog(t, T.off + 0.16, T.off + 0.36);
  fill(ctx, W, H, "#000");
  if (q < 1) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(lerp(1, 0.02, easeInCubic(q)), lerp(1, 0.006, easeInCubic(p)));
    ctx.translate(-W / 2, -H / 2);
    draw();
    ctx.fillStyle = `rgba(255,255,255,${p})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  const dot = 1 - prog(t, T.off + 0.36, T.off + 0.5);
  if (q >= 1 && dot > 0) sprite(ctx, st.S.glowW, W / 2, H / 2, 30 * st.U * dot, 8 * st.U * dot, dot);
}

// ---- fallback when WebGL is unavailable --------------------------------------------------

function fallbackGL(ctx, st, t) {
  const { W, H } = st;
  let bg = "#141045";
  let words = [];
  if (t < T.on) words = [["HOLD", 0.5, 0.5, 0.18]];
  else if (t < T.valley) words = [["ON", 0.5, 0.5, 0.2]];
  else if (t < T.dive) {
    bg = "#2a2a9a";
    words = [["MY COMPASS", 0.5, 0.35, 0.09], ["is", 0.35, 0.48, 0.06], ["CURIOSITY", 0.5, 0.62, 0.11]].filter((_, i) => t > [T.my, T.is, T.cur[0]][i]);
  } else if (t < T.piercing) {
    bg = "#060a34";
    if (t > T.beam) words = [["CURIOSITY", 0.5, 0.75, 0.09]];
  } else if (t < T.flash) {
    bg = "#1a2cc4";
    words = [["PIERCING THROUGH", 0.5, 0.3, 0.08], ["THE ROPE", 0.5, 0.45, 0.1]];
  } else {
    bg = "#e8e6ff";
    words = [["FREE", 0.5, 0.5, 0.2]];
  }
  fill(ctx, W, H, bg);
  for (const [s, x, y, k] of words) chrome(ctx, s, W * x, H * y, H * k);
  return [W / 2, H * 0.45];
}

// ---- composite ------------------------------------------------------------------------------

export function render(ctx, st, t) {
  const { W, H, U } = st;
  const gl = st.gl;
  const blit = () => ctx.drawImage(gl.canvas, 0, 0, W, H);
  ctx.save();
  if (t < T.hold || (t >= T.holdOut && t < T.on)) {
    fill(ctx, W, H, "#000");
  } else if (t < T.valley) {
    if (gl) {
      gl.title(W, H, st.dpr3, t, T);
      blit();
    } else fallbackGL(ctx, st, t);
    overlayTitle(ctx, st, t);
  } else if (t < T.dive) {
    let p;
    if (gl) {
      p = gl.valley(W, H, st.dpr3, t, T, beatPulse(t));
      blit();
    } else p = fallbackGL(ctx, st, t);
    overlayValley(ctx, st, t, p);
  } else if (t < T.dark) {
    if (gl) {
      const f = gl.tunnel(W, H, st.dpr3, t, T);
      blit();
      overlayTunnel(ctx, st, t, f);
    } else {
      fallbackGL(ctx, st, t);
      heroToken(ctx, st, W / 2, H / 2, H * 0.3);
    }
  } else if (t < T.piercing) {
    let p;
    if (gl) {
      p = gl.beam(W, H, st.dpr3, t, T);
      blit();
    } else p = [W / 2, H * 0.25];
    if (!gl) fallbackGL(ctx, st, t);
    overlayBeam(ctx, st, t, p);
  } else if (t < T.that) {
    if (gl) {
      const r = gl.close(W, H, st.dpr3, t, T);
      blit();
      overlayClose(ctx, st, t, r);
    } else {
      fallbackGL(ctx, st, t);
      heroToken(ctx, st, W / 2, H * 0.7, H * 0.3);
    }
  } else if (t < T.free) {
    shotRope(ctx, st, t);
  } else if (t < T.tide) {
    let p;
    if (gl) {
      p = gl.free(W, H, st.dpr3, t, T);
      blit();
    } else p = fallbackGL(ctx, st, t);
    overlayFree(ctx, st, t, p);
  } else if (t < T.off) {
    shotTide(ctx, st, t);
  } else {
    switchOff(ctx, st, t, () => shotTide(ctx, st, Math.min(t, T.off + 0.3)));
  }
  ctx.restore();

  // fine grain over everything but black
  if (t > T.hold && t < T.off) {
    ctx.save();
    ctx.globalAlpha = 0.8;
    const f = Math.floor(t * 24);
    ctx.translate(-Math.floor(hash(f) * 256), -Math.floor(hash(f + 9) * 256));
    ctx.fillStyle = ctx.createPattern(st.S.grain, "repeat");
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
  }
}
