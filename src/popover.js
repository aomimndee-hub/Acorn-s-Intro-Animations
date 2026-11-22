import OBR, { isImage } from "@owlbear-rodeo/sdk";
import { CHANNEL, loadSettings, payloadFor, saveSettings, tokenName } from "./shared.js";

const $ = (id) => document.getElementById(id);
let current = null; // currently selected image item
let nameEdited = false;

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

function showItem(item) {
  current = item;
  const img = $("previewImg");
  $("play").disabled = $("preview-btn").disabled = !item;
  $("previewEmpty").hidden = !!item;
  img.src = item ? item.image.url : "";
  if (!nameEdited) $("name").value = item ? tokenName(item) : "";
}

async function refreshSelection() {
  const ids = await OBR.player.getSelection();
  if (!ids || ids.length === 0) return showItem(null);
  const items = await OBR.scene.items.getItems(ids);
  const item = items.find(isImage) || null;
  if (item?.id !== current?.id) nameEdited = false;
  showItem(item);
}

async function play(destination) {
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
  $("subtitle").value = s.subtitle;
  $("reveal").checked = s.reveal;
  $("name").addEventListener("input", () => (nameEdited = true));
  $("subtitle").addEventListener("change", () => saveSettings({ subtitle: $("subtitle").value.trim() }));
  $("reveal").addEventListener("change", () => saveSettings({ reveal: $("reveal").checked }));
  $("play").addEventListener("click", () => play("ALL"));
  $("preview-btn").addEventListener("click", () => play("LOCAL"));

  OBR.player.onChange(() => refreshSelection());
  OBR.scene.onReadyChange((ready) => ready && refreshSelection());
  if (await OBR.scene.isReady()) refreshSelection();
});
