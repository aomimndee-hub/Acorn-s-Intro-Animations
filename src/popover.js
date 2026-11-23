import OBR, { isImage } from "@owlbear-rodeo/sdk";
import {
  ANIMATIONS, CHANNEL, anchorPayload, animationById, assaultPayload, compassPayload, loadSettings, payloadFor, saveSettings, spicaPayload,
  tokenName,
} from "./shared.js";

const $ = (id) => document.getElementById(id);
const TEAM_SIZE = 4;
let current = null; // first selected image item
let team = Array(TEAM_SIZE).fill(null);
let leadIndex = 0;
let target = null;
let lastSelection = "";
let nameEdited = false;
const cards = [];

const mode = () => animationById($("animation").value).id;

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
  const assault = mode() === "assault";
  const anchor = mode() === "anchor";
  $("crystalFields").hidden = assault;
  $("assaultFields").hidden = !assault;
  const spica = mode() === "spica";
  $("subtitleField").hidden = anchor || spica || mode() === "compass";
  $("titleField").hidden = !(anchor || spica);
  // Anchor and Spica keep separate title texts in the same field
  const key = spica ? "spicaTitle" : "title";
  if ($("title").dataset.key !== key) {
    $("title").dataset.key = key;
    $("title").value = loadSettings()[key];
    $("title").placeholder = spica ? "Spica" : "ANCHOR";
  }
  $("animDesc").textContent = animationById(mode()).description;
  $("hint").innerHTML = assault
    ? "Tip: select 2–5 tokens. <b>First = lead, last = target.</b> Click any card to replace it with the selected token."
    : `Tip: you can also right-click a token → <b>${animationById(mode()).label}</b>.`;
  const ready = assault ? team.some(Boolean) && !!target : !!current;
  $("play").disabled = $("preview-btn").disabled = !ready;
}

function showItem(item) {
  current = item;
  const img = $("previewImg");
  $("previewEmpty").hidden = !!item;
  img.src = item ? item.image.url : "";
  if (!nameEdited) $("name").value = item ? tokenName(item) : "";
}

function fixLead() {
  if (!team[leadIndex]) {
    const first = team.findIndex(Boolean);
    leadIndex = first < 0 ? 0 : first;
  }
}

function paintCard(card, item) {
  card.img.src = item ? item.image.url : "";
  card.img.hidden = !item;
  card.name.textContent = item ? tokenName(item) : "Empty";
  card.root.classList.toggle("filled", !!item);
  card.clear.hidden = !item;
}

function showSlots() {
  fixLead();
  cards.forEach((card, i) => {
    paintCard(card, team[i]);
    const isLead = !!team[i] && i === leadIndex;
    card.lead.hidden = !team[i];
    card.lead.setAttribute("aria-pressed", String(isLead));
    card.lead.textContent = isLead ? "★ Lead" : "☆ Lead";
    card.root.classList.toggle("is-lead", isLead);
  });
  paintCard(targetCard, target);
  updateControls();
}

function assignTeam(index) {
  if (!current) return;
  if (target?.id === current.id) target = null;
  team = team.map((item, i) => (i !== index && item?.id === current.id ? null : item));
  team[index] = current;
  showSlots();
}

function assignTarget() {
  if (!current) return;
  team = team.map((item) => (item?.id === current.id ? null : item));
  target = current;
  showSlots();
}

function makeCard(label, onAssign, onClear) {
  const root = document.createElement("div");
  root.className = "token-card";
  const main = document.createElement("button");
  main.type = "button";
  main.className = "token-main";
  main.title = "Use the selected token here";
  const small = document.createElement("small");
  small.textContent = label;
  const img = document.createElement("img");
  img.alt = "";
  img.hidden = true;
  const name = document.createElement("span");
  main.append(small, img, name);
  main.addEventListener("click", onAssign);
  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "token-clear";
  clear.textContent = "×";
  clear.setAttribute("aria-label", `Remove ${label}`);
  clear.hidden = true;
  clear.addEventListener("click", onClear);
  root.append(main, clear);
  return { root, img, name, clear };
}

let targetCard = null;
function buildCards() {
  for (let i = 0; i < TEAM_SIZE; i++) {
    const card = makeCard(`Player ${i + 1}`, () => assignTeam(i), () => {
      team[i] = null;
      showSlots();
    });
    const lead = document.createElement("button");
    lead.type = "button";
    lead.className = "token-lead";
    lead.hidden = true;
    lead.addEventListener("click", () => {
      leadIndex = i;
      showSlots();
    });
    card.root.append(lead);
    card.lead = lead;
    $("teamGrid").append(card.root);
    cards.push(card);
  }
  targetCard = makeCard("Target", assignTarget, () => {
    target = null;
    showSlots();
  });
  targetCard.root.classList.add("is-target");
  $("targetSlot").append(targetCard.root);
}

async function refreshSelection() {
  const ids = (await OBR.player.getSelection()) || [];
  const found = ids.length ? await OBR.scene.items.getItems(ids) : [];
  // Keep the order in which the GM selected the tokens.
  const images = ids.map((id) => found.find((i) => i.id === id)).filter((i) => i && isImage(i));
  const item = images[0] || null;
  if (item?.id !== current?.id) nameEdited = false;
  showItem(item);

  // Fill the cards only when the selection really changes, so manual edits stay.
  const key = images.map((i) => i.id).join(",");
  if (key !== lastSelection) {
    lastSelection = key;
    if (images.length >= 2) {
      const members = images.slice(0, -1).slice(0, TEAM_SIZE);
      team = Array.from({ length: TEAM_SIZE }, (_, i) => members[i] || null);
      target = images[images.length - 1];
      leadIndex = 0;
    }
  }
  showSlots();
}

async function play(destination) {
  if (mode() === "assault") {
    if (!target || !team.some(Boolean)) return;
    const settings = saveSettings({
      caption: $("caption").value.trim() || "CURTAIN CALL",
      accent: $("accent").value,
    });
    const members = team.filter(Boolean);
    const lead = members.indexOf(team[leadIndex]);
    const payload = assaultPayload(members, Math.max(0, lead), target, {
      caption: settings.caption,
      accent: settings.accent,
    });
    await OBR.broadcast.sendMessage(CHANNEL, payload, { destination });
    return;
  }
  if (!current) return;
  if (mode() === "spica") {
    const settings = saveSettings({ spicaTitle: $("title").value.trim() || "Spica", reveal: $("reveal").checked });
    const payload = spicaPayload(current, {
      name: $("name").value.trim() || tokenName(current),
      title: settings.spicaTitle,
      reveal: destination === "ALL" && settings.reveal,
      revealBy: OBR.player.id,
    });
    await OBR.broadcast.sendMessage(CHANNEL, payload, { destination });
    return;
  }
  if (mode() === "compass") {
    const settings = saveSettings({ reveal: $("reveal").checked });
    const payload = compassPayload(current, {
      name: $("name").value.trim() || tokenName(current),
      reveal: destination === "ALL" && settings.reveal,
      revealBy: OBR.player.id,
    });
    await OBR.broadcast.sendMessage(CHANNEL, payload, { destination });
    return;
  }
  if (mode() === "anchor") {
    const settings = saveSettings({
      title: $("title").value.trim() || "ANCHOR",
      reveal: $("reveal").checked,
    });
    const payload = anchorPayload(current, {
      name: $("name").value.trim() || tokenName(current),
      title: settings.title,
      reveal: destination === "ALL" && settings.reveal,
      revealBy: OBR.player.id,
    });
    await OBR.broadcast.sendMessage(CHANNEL, payload, { destination });
    return;
  }
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
  buildCards();
  for (const a of ANIMATIONS) $("animation").add(new Option(a.label, a.id));
  $("animation").value = animationById(s.animation).id;
  $("subtitle").value = s.subtitle;
  $("title").value = s.title;
  $("reveal").checked = s.reveal;
  $("caption").value = s.caption;
  $("accent").value = s.accent;
  $("animation").addEventListener("change", () => {
    saveSettings({ animation: mode() });
    updateControls();
  });
  $("name").addEventListener("input", () => (nameEdited = true));
  $("subtitle").addEventListener("change", () => saveSettings({ subtitle: $("subtitle").value.trim() }));
  $("title").addEventListener("change", () => {
    const key = $("title").dataset.key || "title";
    saveSettings({ [key]: $("title").value.trim() || (key === "spicaTitle" ? "Spica" : "ANCHOR") });
  });
  $("reveal").addEventListener("change", () => saveSettings({ reveal: $("reveal").checked }));
  $("caption").addEventListener("change", () => saveSettings({ caption: $("caption").value.trim() || "CURTAIN CALL" }));
  $("accent").addEventListener("input", () => saveSettings({ accent: $("accent").value }));
  $("play").addEventListener("click", () => play("ALL"));
  $("preview-btn").addEventListener("click", () => play("LOCAL"));
  showSlots();

  OBR.player.onChange(() => refreshSelection());
  OBR.scene.onReadyChange((ready) => ready && refreshSelection());
  if (await OBR.scene.isReady()) refreshSelection();
});
