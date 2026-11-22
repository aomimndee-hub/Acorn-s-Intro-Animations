import OBR from "@owlbear-rodeo/sdk";
import { MODAL_ID, loadSettings } from "./shared.js";
import { T, buildTokenSprite, render } from "./finisher/scene.js";
import { createSound } from "./finisher/sound.js";

const params = new URLSearchParams(location.search);
const inOBR = params.has("obrref");
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const gate = document.getElementById("gate");
const skip = document.getElementById("skip");

const svg = (body) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">${body}</svg>`)}`;
const DEMO_A = svg('<path fill="#17171d" d="M92 590 130 300 80 215l70-50h100l62 58-44 84 42 283H214l-12-180-20 180z"/><path fill="#b00016" d="m135 212 70 92 62-92 24 26-82 158-96-157z"/><circle cx="202" cy="118" r="72" fill="#f0c9a8"/><path fill="#111" d="M122 118c-8-74 44-104 94-96 54 8 80 48 62 106-10-34-28-48-46-54-24 20-62 26-110 44z"/><path fill="#e60012" d="M150 112h104l-14 30-30-8-14 8-14-8-26 8z"/><path fill="#d9dde6" d="m300 250 88-220 8 4-74 228z"/>');
const DEMO_B = svg('<path fill="#3f4a5f" d="M70 590 96 300 40 190l90-40h140l90 40-56 110 26 290H230l-30-190-30 190z"/><circle cx="200" cy="105" r="78" fill="#7fbf85"/><path fill="#2a3344" d="m118 70 18-58 34 36h60l34-36 18 58z"/><circle cx="170" cy="105" r="11" fill="#fff"/><circle cx="232" cy="105" r="11" fill="#fff"/><path fill="#1c2230" d="M165 145h70v12h-70z"/>');

function safeUrl(value) {
  try {
    const url = new URL(String(value));
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
  if (!data) {
    return {
      attacker: { url: DEMO_A, name: "Acorn" },
      target: { url: DEMO_B, name: "Goblin" },
      caption: (params.get("caption") || "CURTAIN CALL").slice(0, 28),
      accent: "#e60012",
    };
  }
  const token = (t) => ({ url: safeUrl(t?.url), mime: String(t?.mime || ""), name: String(t?.name || "").slice(0, 40) });
  return {
    attacker: token(data.attacker),
    target: token(data.target),
    caption: String(data.caption || "CURTAIN CALL").slice(0, 28),
    accent: /^#[0-9a-f]{6}$/i.test(data.accent) ? data.accent : "#e60012",
  };
}

const payload = readPayload();
const state = { W: 0, H: 0, U: 1, accent: payload.accent, caption: payload.caption, name: payload.attacker.name };

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

function fallbackToken(name, color) {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d");
  x.fillStyle = color;
  x.beginPath();
  x.arc(256, 256, 226, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#fff";
  x.font = "900 230px Impact, Tahoma, sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText((name || "?").trim().charAt(0).toUpperCase(), 256, 266);
  return c;
}

let finished = false;
let sound = null;
let startPerf = 0;
let startAudio = 0;

function clock() {
  if (sound && sound.context.state === "running") return sound.context.currentTime - startAudio;
  return (performance.now() - startPerf) / 1000;
}

function finish() {
  if (finished) return;
  finished = true;
  sound?.close();
  if (inOBR) OBR.modal.close(MODAL_ID);
  else if (!params.has("seek")) location.reload();
}

function frame() {
  if (finished) return;
  const t = clock();
  render(ctx, state, Math.min(t, T.end));
  if (t >= T.end) return finish();
  requestAnimationFrame(frame);
}

async function begin() {
  gate.hidden = true;
  if (sound) {
    try {
      await sound.context.resume();
      startAudio = sound.context.currentTime + 0.08;
      sound.schedule(startAudio);
    } catch {
      sound = null;
    }
  }
  startPerf = performance.now() + 80;
  requestAnimationFrame(frame);
}

async function boot() {
  resize();
  addEventListener("resize", resize);
  skip.addEventListener("click", finish);
  addEventListener("keydown", (e) => e.key === "Escape" && finish());
  if (inOBR) await new Promise((r) => OBR.onReady(r));

  const [a, b] = await Promise.all([loadToken(payload.attacker), loadToken(payload.target)]);
  state.A = buildTokenSprite(a || fallbackToken(payload.attacker.name, payload.accent), payload.accent);
  state.B = buildTokenSprite(b || fallbackToken(payload.target.name, "#3f4a5f"), payload.accent);

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
    render(ctx, state, T.card + 1.6);
    setTimeout(finish, 3200);
    return;
  }

  try {
    sound = createSound(loadSettings().volume);
  } catch {
    sound = null;
  }
  if (!sound || sound.context.state === "running") return begin();
  await Promise.race([sound.context.resume().catch(() => {}), new Promise((r) => setTimeout(r, 250))]);
  if (sound.context.state === "running") return begin();

  // Autoplay is blocked: same click gate as the crystal cutscene.
  document.getElementById("gateText").textContent = "click to begin";
  gate.addEventListener("click", begin, { once: true });
}

boot();
