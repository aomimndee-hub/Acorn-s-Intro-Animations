import OBR from "@owlbear-rodeo/sdk";
import { BASE, MODAL_ID, loadSettings } from "./shared.js";
import { buildSprites, buildTokenSprites } from "./cutscene/sprites.js";
import { AUDIO_OFFSET, END, START, grayscaleAt, render } from "./cutscene/timeline.js";
import { makeCanvas } from "./cutscene/util.js";

const params = new URLSearchParams(location.search);
const inOBR = params.has("obrref");
const payload = readPayload();

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const gate = document.getElementById("gate");
const gateText = document.getElementById("gateText");
const state = { W: 0, H: 0, U: 1, payload };

function readPayload() {
  try {
    const raw = decodeURIComponent(location.hash.slice(1));
    if (raw) return JSON.parse(raw);
  } catch {
    /* fall through to demo */
  }
  return { name: "Acorn", subtitle: "the last fragment", imageUrl: "", demo: true };
}

function resize() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  const maxPixels = 3.4e6;
  if (W * H * dpr * dpr > maxPixels) dpr = Math.sqrt(maxPixels / (W * H));
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.W = W;
  state.H = H;
  state.U = Math.hypot(W, H) / Math.hypot(1280, 720);
}

function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
    setTimeout(() => resolve(img.complete && img.naturalWidth ? img : null), 8000);
  });
}

/** Fallback emblem when the token has no reachable image. */
function placeholderToken(name) {
  const S = 512;
  const c = makeCanvas(S, S);
  const x = c.getContext("2d");
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "#efeaff");
  g.addColorStop(0.55, "#8d7dff");
  g.addColorStop(1, "#2a2160");
  x.fillStyle = g;
  x.beginPath();
  x.arc(S / 2, S / 2, S * 0.46, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = "rgba(255,255,255,0.8)";
  x.lineWidth = 6;
  x.stroke();
  x.fillStyle = "#1b1640";
  x.font = `600 ${S * 0.42}px Cinzel, Georgia, serif`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText((name || "?").trim().charAt(0).toUpperCase(), S / 2, S / 2 + S * 0.02);
  return c;
}

function waitForAudio(audio) {
  return new Promise((resolve) => {
    if (audio.readyState >= 3) return resolve();
    audio.addEventListener("canplaythrough", resolve, { once: true });
    audio.addEventListener("error", resolve, { once: true });
    setTimeout(resolve, 7000);
  });
}

async function loadFonts() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('600 40px "Cinzel"'),
        document.fonts.load('500 40px "Cormorant Garamond"'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* system serif fallback */
  }
}

// ---- clock ---------------------------------------------------------------
// The audio is the master clock. A performance.now() clock is kept locked to
// it for smooth frames, and takes over if the audio cannot play at all.
const audio = new Audio(`${BASE}audio/intro.mp3`);
audio.preload = "auto";
audio.volume = loadSettings().volume;
let audioOk = false;
let anchor = 0; // performance.now() at t = START
let finished = false;

function now() {
  const perf = START + (performance.now() - anchor) / 1000;
  if (audioOk && !audio.paused && !audio.ended) {
    const at = audio.currentTime + AUDIO_OFFSET;
    if (Math.abs(at - perf) > 0.06) {
      anchor = performance.now() - (at - START) * 1000;
      return at;
    }
  }
  return perf;
}

function frame() {
  if (finished) return;
  const t = now();
  const g = grayscaleAt(t);
  canvas.style.filter = g > 0.01 ? `grayscale(${g}) contrast(${1 + 0.15 * g})` : "";
  render(ctx, sprites, tokenSprites, state, t);
  if (t >= END) return finish();
  requestAnimationFrame(frame);
}

async function start() {
  gate.hidden = true;
  audio.currentTime = 0;
  try {
    await audio.play();
    audioOk = true;
  } catch {
    audioOk = false;
  }
  anchor = performance.now();
  requestAnimationFrame(frame);
}

async function revealOnMap() {
  if (!inOBR || !payload.reveal || !payload.itemId) return;
  try {
    if (OBR.player.id !== payload.revealBy) return;
    await OBR.scene.items.updateItems([payload.itemId], (items) => {
      for (const item of items) item.visible = true;
    });
  } catch {
    /* item deleted or no permission */
  }
}

async function finish() {
  if (finished) return;
  finished = true;
  audio.pause();
  await revealOnMap();
  if (inOBR) OBR.modal.close(MODAL_ID);
}

// ---- boot ----------------------------------------------------------------
resize();
window.addEventListener("resize", resize);
const sprites = buildSprites();
let tokenSprites = null;

document.getElementById("skip").addEventListener("click", finish);
window.addEventListener("keydown", (e) => e.key === "Escape" && finish());

const obrReady = inOBR ? new Promise((r) => OBR.onReady(r)) : Promise.resolve();

(async () => {
  const [img] = await Promise.all([loadImage(payload.imageUrl), loadFonts(), waitForAudio(audio), obrReady]);
  tokenSprites = buildTokenSprites(img || placeholderToken(payload.name));

  // Debug: ?seek=<seconds> renders a single still frame of the timeline.
  if (params.has("seek")) {
    gate.hidden = true;
    document.getElementById("skip").hidden = true;
    const t = Number(params.get("seek"));
    const g = grayscaleAt(t);
    canvas.style.filter = g > 0.01 ? `grayscale(${g}) contrast(${1 + 0.15 * g})` : "";
    render(ctx, sprites, tokenSprites, state, t);
    document.body.dataset.ready = "1";
    return;
  }

  // Try to start straight away; browsers that block autoplay get a click gate.
  try {
    await audio.play();
    audio.pause();
    start();
  } catch {
    gateText.className = "";
    gateText.textContent = "click to begin";
    gate.addEventListener("click", start, { once: true });
  }
})();
