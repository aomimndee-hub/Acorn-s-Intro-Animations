import OBR from "@owlbear-rodeo/sdk";
import { BASE, MODAL_ID, loadSettings } from "./shared.js";
import { buildSprites } from "./cutscene/sprites.js";
import { T, buildTokenSprite, render } from "./finisher/scene.js";

const params = new URLSearchParams(location.search);
const inOBR = params.has("obrref");
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const gate = document.getElementById("gate");
const gateText = document.getElementById("gateText");
const skip = document.getElementById("skip");

const svg = (body, fill) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><g fill="${fill}">${body}</g></svg>`)}`;
const DEMO_TEAM = [
  svg('<path d="M92 590 130 300 80 215l70-50h100l62 58-44 84 42 283H214l-12-180-20 180z"/><circle cx="202" cy="108" r="72"/><path d="m300 250 88-220 8 4-74 228z"/><path d="M122 110 90 40l62 24 46-46 44 46 66-20-34 72z"/>', "#d4212f"),
  svg('<path d="M110 590 130 310 60 250l80-90h120l76 80-70 70 24 280H220l-20-170-22 170z"/><circle cx="200" cy="100" r="66"/><path d="M196 40 216 0l14 44zM60 250 8 120l18-6 62 118z"/>', "#2f7be0"),
  svg('<path d="M70 590 120 320 30 330l100-160h140l100 160-90-10 50 270z"/><circle cx="200" cy="104" r="62"/><path d="M140 80c10-70 110-70 120 0l34 60-54-26h-80l-54 26z"/>', "#27a866"),
  svg('<path d="M120 590 150 340 100 220l50-54h100l50 54-50 120 30 250h-60l-20-160-20 160z"/><circle cx="200" cy="112" r="58"/><path d="m250 100 120-70-60 110zM150 100 30 30l60 110z"/>', "#e0a020"),
];
const DEMO_TARGET = svg('<path d="M40 590 86 330 8 210l92-64h200l92 64-78 120 46 260H250l-50-170-50 170z"/><circle cx="200" cy="96" r="80"/><path d="m122 66-24-62 62 30h80l62-30-24 62z"/>', "#7a3fc4");

function safeUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

const cleanToken = (t) => ({ url: safeUrl(t?.url), mime: String(t?.mime || ""), name: String(t?.name || "").slice(0, 40) });

function readPayload() {
  let data = null;
  try {
    const raw = decodeURIComponent(location.hash.slice(1));
    if (raw) data = JSON.parse(raw);
  } catch {
    /* fall through to demo */
  }
  if (!data) {
    const n = Math.min(4, Math.max(1, Number(params.get("team")) || 4));
    return {
      team: DEMO_TEAM.slice(0, n).map((url, i) => ({ url, name: i ? `Ally ${i}` : "Acorn" })),
      leadIndex: 0,
      target: { url: DEMO_TARGET, name: "Boss" },
      caption: (params.get("caption") || "CURTAIN CALL").slice(0, 28),
      accent: "#e60012",
    };
  }
  // A GM on an older version may still send the previous two-token format.
  const rawTeam = Array.isArray(data.team) ? data.team : [data.attacker];
  const team = rawTeam.slice(0, 4).map(cleanToken);
  const lead = Number.isInteger(data.leadIndex) && data.leadIndex >= 0 && data.leadIndex < team.length ? data.leadIndex : 0;
  return {
    team,
    leadIndex: lead,
    target: cleanToken(data.target),
    caption: String(data.caption || "CURTAIN CALL").slice(0, 28),
    accent: /^#[0-9a-f]{6}$/i.test(data.accent) ? data.accent : "#e60012",
  };
}

const payload = readPayload();
const state = {
  W: 0, H: 0, U: 1,
  accent: payload.accent,
  caption: payload.caption,
  name: payload.team[payload.leadIndex]?.name || "",
  leadIndex: payload.leadIndex,
};

function resize() {
  const W = innerWidth;
  const H = innerHeight;
  let dpr = Math.min(devicePixelRatio || 1, 1.75);
  const maxPixels = 3.4e6;
  if (W * H * dpr * dpr > maxPixels) dpr = Math.sqrt(maxPixels / (W * H));
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.W = W;
  state.H = H;
  state.U = Math.min(W, H) / 720;
}

function loadToken({ url, mime }) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const timer = setTimeout(() => resolve(null), 6000);
    const done = (value) => { clearTimeout(timer); resolve(value); };
    if (/^video\//i.test(mime || "")) {
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

/** Shown when a token's image cannot be loaded. */
function fallbackToken() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d");
  x.beginPath();
  x.arc(256, 120, 92, 0, Math.PI * 2);
  x.moveTo(120, 500);
  x.lineTo(160, 230);
  x.lineTo(352, 230);
  x.lineTo(392, 500);
  x.closePath();
  x.fill();
  return c;
}

// ---- clock: the song is the master, as in the crystal cutscene --------------
const audio = new Audio(`${BASE}audio/finisher.mp3`);
audio.preload = "auto";
audio.volume = loadSettings().volume;
let audioOk = false;
let anchor = 0;
let finished = false;

function now() {
  const perf = (performance.now() - anchor) / 1000;
  if (audioOk && !audio.paused && !audio.ended) {
    const at = audio.currentTime;
    if (Math.abs(at - perf) > 0.06) {
      anchor = performance.now() - at * 1000;
      return at;
    }
  }
  return perf;
}

function finish() {
  if (finished) return;
  finished = true;
  audio.pause();
  if (inOBR) OBR.modal.close(MODAL_ID);
  else if (!params.has("seek")) location.reload();
}

let lastFrame = 0;
let frameMs = 16;

function frame() {
  if (finished) return;
  const stamp = performance.now();
  if (lastFrame) {
    frameMs = frameMs * 0.9 + Math.min(stamp - lastFrame, 100) * 0.1;
    if (frameMs > 25) state.quality = 0.5;
    else if (frameMs < 18) state.quality = 1;
  }
  lastFrame = stamp;
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
  anchor = performance.now();
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

  const [teamImages, targetImage] = await Promise.all([
    Promise.all(payload.team.map(loadToken)),
    loadToken(payload.target),
    waitForAudio(),
  ]);
  state.team = teamImages.map((img) => buildTokenSprite(img || fallbackToken()));
  state.target = buildTokenSprite(targetImage || fallbackToken());
  state.S = buildSprites();

  // Build every cached layer now, so the rush never hitches on its first frames.
  for (const t of [T.shatter + 0.1, ...Array.from({ length: 6 }, (_, i) => T.assault + 0.1 + i / 30), T.card + 0.5]) {
    render(ctx, state, t);
  }
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, state.W, state.H);

  if (params.has("seek")) {
    gate.hidden = true;
    skip.hidden = true;
    render(ctx, state, Number(params.get("seek")) || 0);
    document.body.dataset.ready = "1";
    return;
  }

  // Motion-sensitive viewers get the final card only.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gate.hidden = true;
    render(ctx, state, T.card + 1);
    setTimeout(finish, 3200);
    return;
  }

  // Try to start straight away; browsers that block autoplay get a click gate.
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
