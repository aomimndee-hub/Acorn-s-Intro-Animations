import OBR from "@owlbear-rodeo/sdk";
import { BASE, MODAL_ID, loadSettings } from "./shared.js";
import { T, render } from "./star/scene.js";
import { buildArt } from "./star/art.js";
import { buildTokenSprites } from "./cutscene/sprites.js";

const params = new URLSearchParams(location.search);
const inOBR = params.has("obrref");
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const gate = document.getElementById("gate");
const gateText = document.getElementById("gateText");
const skip = document.getElementById("skip");

function safeUrl(value) {
  try {
    const url = new URL(String(value), location.href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function readPayload() {
  let data = null;
  try {
    const raw = decodeURIComponent(location.hash.slice(1));
    if (raw) data = JSON.parse(raw);
  } catch {
    /* fall through to demo */
  }
  data = data || { name: "Acorn", demo: true };
  return {
    itemId: String(data.itemId || ""),
    imageUrl: safeUrl(data.imageUrl),
    mime: String(data.mime || ""),
    name: String(data.name || "").slice(0, 40),
    title: String(data.title || "Spica").slice(0, 24),
    reveal: !!data.reveal,
    revealBy: String(data.revealBy || ""),
  };
}

const payload = readPayload();
const state = { W: 0, H: 0, U: 1, name: payload.name, title: payload.title };

// Render scale drops automatically if frames run slow (see frame()).
let quality = 1;

function resize() {
  const W = innerWidth;
  const H = innerHeight;
  let dpr = Math.min(devicePixelRatio || 1, 1.5) * quality;
  const maxPixels = 2.3e6 * quality * quality;
  if (W * H * dpr * dpr > maxPixels) dpr = Math.sqrt(maxPixels / (W * H));
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.W = W;
  state.H = H;
  state.U = Math.min(W, H) / 720;
  state.dpr3 = Math.min(dpr, 1);
}

function loadToken(url, mime) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const timer = setTimeout(() => resolve(null), 7000);
    const done = (value) => { clearTimeout(timer); resolve(value); };
    if (/^video\//i.test(mime)) {
      const v = document.createElement("video");
      Object.assign(v, { muted: true, playsInline: true, preload: "auto", src: url });
      v.onloadeddata = () => done(v);
      v.onerror = () => done(null);
      return;
    }
    const img = new Image();
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = url;
  });
}

/** A simple standing figure when the token image cannot be loaded. */
function fallbackToken() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d");
  x.fillStyle = "#e8e6ff";
  x.fillRect(196, 40, 120, 110);
  x.fillRect(160, 160, 192, 180);
  x.fillRect(100, 170, 56, 160);
  x.fillRect(356, 170, 56, 160);
  x.fillRect(166, 344, 84, 150);
  x.fillRect(262, 344, 84, 150);
  x.fillStyle = "#2a2060";
  x.fillRect(220, 80, 22, 22);
  x.fillRect(272, 80, 22, 22);
  return c;
}

async function loadFonts() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('600 40px "Cinzel"'),
        document.fonts.load('italic 500 40px "Cormorant Garamond"'),
      ]),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  } catch {
    /* fall back to system serif */
  }
}

// ---- clock: the song is the master ------------------------------------------
const audio = new Audio(`${BASE}audio/star.mp3`);
audio.preload = "auto";
audio.volume = loadSettings().volume;
let audioOk = false;
let anchorTime = 0;
let finished = false;

function now() {
  const perf = (performance.now() - anchorTime) / 1000;
  if (audioOk && !audio.paused && !audio.ended) {
    const at = audio.currentTime;
    if (Math.abs(at - perf) > 0.06) {
      anchorTime = performance.now() - at * 1000;
      return at;
    }
  }
  return perf;
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

let lastStamp = 0;
let lastDrop = 0;
let frameMs = 16;

function frame() {
  if (finished) return;
  const stamp = performance.now();
  if (lastStamp) {
    frameMs = frameMs * 0.92 + Math.min(stamp - lastStamp, 100) * 0.08;
    // steadily slow: render fewer pixels (down to 60%), never back up mid-play
    if (frameMs > 24 && quality > 0.6 && stamp - lastDrop > 1500) {
      quality = Math.max(0.6, quality * 0.85);
      lastDrop = stamp;
      resize();
    }
  }
  lastStamp = stamp;
  const t = now();
  render(ctx, state, Math.min(t, T.end));
  if (t >= T.end) return finish();
  requestAnimationFrame(frame);
}

async function begin() {
  gate.hidden = true;
  audio.currentTime = 0;
  try {
    await audio.play();
    audioOk = true;
  } catch {
    audioOk = false;
  }
  anchorTime = performance.now();
  requestAnimationFrame(frame);
}

function waitForAudio() {
  return new Promise((resolve) => {
    if (audio.readyState >= 3) return resolve();
    audio.addEventListener("canplaythrough", resolve, { once: true });
    audio.addEventListener("error", resolve, { once: true });
    setTimeout(resolve, 7000);
  });
}

async function boot() {
  resize();
  addEventListener("resize", resize);
  skip.addEventListener("click", finish);
  addEventListener("keydown", (e) => e.key === "Escape" && finish());
  if (inOBR) await new Promise((r) => OBR.onReady(r));

  const [img] = await Promise.all([loadToken(payload.imageUrl, payload.mime), loadFonts(), waitForAudio()]);
  state.tokS = buildTokenSprites(img || fallbackToken());
  state.A = buildArt();
  for (const t of [3, 10, 18, 24, 26, 32, 40]) render(ctx, state, t);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, state.W, state.H);

  if (params.has("seek")) {
    gate.hidden = true;
    skip.hidden = true;
    render(ctx, state, Number(params.get("seek")) || 0);
    document.body.dataset.ready = "1";
    return;
  }

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gate.hidden = true;
    render(ctx, state, T.name + 0.5);
    setTimeout(finish, 3500);
    return;
  }

  try {
    await audio.play();
    audio.pause();
    begin();
  } catch {
    gateText.textContent = "click to begin";
    gate.addEventListener("click", begin, { once: true });
  }
}

boot();
