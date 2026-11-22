import OBR, { isImage } from "@owlbear-rodeo/sdk";
import {
  ANIMATIONS, CHANNEL, animationById, finisherPayload, loadSettings, payloadFor, saveSettings, tokenName,
} from "./shared.js";

const $ = (id) => document.getElementById(id);
let current = null; // first selected image item
let attacker = null;
let target = null;
let nameEdited = false;

const mode = () => $("animation").value;

function initVolume() {
  const vol = $("volume");
  const out = $("volOut");
  vol.value = loadSettings().volume;
  const show = () => (out.textContent = `${Math.round(vol.value * 100)}%`);
  show();
  vol.addEventListener("input", () => {
    saveSettings({ volume: Number(vol.value) });
    show();
  });
}

function updateControls() {
  const slash = mode() === "slash";
  $("crystalFields").hidden = slash;
  $("slashFields").hidden = !slash;
  $("animDesc").textContent = animationById(mode()).description;
  $("hint").innerHTML = slash
    ? "Tip: select two tokens, attacker first, or right-click them → <b>Slash Finisher</b>."
    : "Tip: you can also right-click a token → <b>Play Intro Cutscene</b>.";
  const ready = slash ? !!attacker && !!target && attacker.id !== target.id : !!current;
  $("play").disabled = $("preview-btn").disabled = !ready;
}

function showItem(item) {
  current = item;
  const img = $("previewImg");
  $("previewEmpty").hidden = !!item;
  img.src = item ? item.image.url : "";
  if (!nameEdited) $("name").value = item ? tokenName(item) : "";
}

function showSlot(prefix, item) {
  const img = $(`${prefix}Img`);
  img.src = item ? item.image.url : "";
  img.hidden = !item;
  $(`${prefix}Name`).textContent = item ? tokenName(item) : "Select a token, then click";
}

function showSlots() {
  showSlot("attacker", attacker);
  showSlot("target", target);
  updateControls();
}

async function refreshSelection() {
  const ids = (await OBR.player.getSelection()) || [];
  const found = ids.length ? await OBR.scene.items.getItems(ids) : [];
  // Keep the order in which the GM selected the tokens.
  const images = ids.map((id) => found.find((i) => i.id === id)).filter((i) => i && isImage(i));
  const item = images[0] || null;
  if (item?.id !== current?.id) nameEdited = false;
  showItem(item);
  if (images.length >= 2) [attacker, target] = images;
  showSlots();
}

async function play(destination) {
  if (mode() === "slash") {
    if (!attacker || !target) return;
    const settings = saveSettings({
      caption: $("caption").value.trim() || "CURTAIN CALL",
      accent: $("accent").value,
    });
    const payload = finisherPayload(attacker, target, { caption: settings.caption, accent: settings.accent });
    await OBR.broadcast.sendMessage(CHANNEL, payload, { destination });
    return;
  }
  if (!current) return;
  const settings = saveSettings({
    subtitle: $("subtitle").value.trim(),
    reveal: $("reveal").checked,
  });
  const payload = payloadFor(current, {
    name: $("name").value.trim() || tokenName(current),
    subtitle: settings.subtitle,
    reveal: destination === "ALL" && settings.reveal,
    revealBy: OBR.player.id,
  });
  await OBR.broadcast.sendMessage(CHANNEL, payload, { destination });
}

OBR.onReady(async () => {
  initVolume();
  const theme = await OBR.theme.getTheme();
  document.documentElement.dataset.mode = theme.mode;
  OBR.theme.onChange((t) => (document.documentElement.dataset.mode = t.mode));

  const role = await OBR.player.getRole();
  if (role !== "GM") {
    $("player").hidden = false;
    return;
  }
  $("gm").hidden = false;

  const s = loadSettings();
  for (const a of ANIMATIONS) $("animation").add(new Option(a.label, a.id));
  $("animation").value = animationById(s.animation).id;
  $("subtitle").value = s.subtitle;
  $("reveal").checked = s.reveal;
  $("caption").value = s.caption;
  $("accent").value = s.accent;
  $("animation").addEventListener("change", () => {
    saveSettings({ animation: mode() });
    updateControls();
  });
  $("name").addEventListener("input", () => (nameEdited = true));
  $("subtitle").addEventListener("change", () => saveSettings({ subtitle: $("subtitle").value.trim() }));
  $("reveal").addEventListener("change", () => saveSettings({ reveal: $("reveal").checked }));
  $("caption").addEventListener("change", () => saveSettings({ caption: $("caption").value.trim() || "CURTAIN CALL" }));
  $("accent").addEventListener("input", () => saveSettings({ accent: $("accent").value }));
  $("attackerSlot").addEventListener("click", () => {
    if (current) attacker = current;
    showSlots();
  });
  $("targetSlot").addEventListener("click", () => {
    if (current) target = current;
    showSlots();
  });
  $("swap").addEventListener("click", () => {
    [attacker, target] = [target, attacker];
    showSlots();
  });
  $("play").addEventListener("click", () => play("ALL"));
  $("preview-btn").addEventListener("click", () => play("LOCAL"));
  showSlots();

  OBR.player.onChange(() => refreshSelection());
  OBR.scene.onReadyChange((ready) => ready && refreshSelection());
  if (await OBR.scene.isReady()) refreshSelection();
});
