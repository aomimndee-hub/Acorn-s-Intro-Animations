import OBR, { isImage } from "@owlbear-rodeo/sdk";
import { BASE, CHANNEL, ID, MODAL_ID, anchorPayload, animationById, assaultPayload, compassPayload, payloadFor, spicaPayload, starPayload } from "./shared.js";

async function openCutscene(data) {
  const page = animationById(data?.animation).page;
  const url = `${BASE}${page}#${encodeURIComponent(JSON.stringify(data))}`;
  try {
    await OBR.modal.close(MODAL_ID);
  } catch {
    /* nothing open */
  }
  await OBR.modal.open({ id: MODAL_ID, url, fullScreen: true, hidePaper: true });
}

OBR.onReady(() => {
  // Every client (GM and players) listens for the play signal.
  OBR.broadcast.onMessage(CHANNEL, ({ data }) => openCutscene(data));

  // GM-only right-click entry on a single image token.
  OBR.contextMenu.create({
    id: `${ID}/context-menu`,
    icons: [
      {
        icon: `${BASE}icon.svg`,
        label: "Break Through",
        filter: { roles: ["GM"], max: 1, every: [{ key: "type", value: "IMAGE" }] },
      },
    ],
    async onClick(context) {
      const item = context.items[0];
      if (!item || !isImage(item)) return;
      const payload = payloadFor(item, { revealBy: OBR.player.id });
      await OBR.broadcast.sendMessage(CHANNEL, payload, { destination: "ALL" });
    },
  });

  // GM-only right-click entry for the Anchor cutscene on a single image token.
  OBR.contextMenu.create({
    id: `${ID}/context-menu-anchor`,
    icons: [
      {
        icon: `${BASE}icon.svg`,
        label: "Anchor",
        filter: { roles: ["GM"], max: 1, every: [{ key: "type", value: "IMAGE" }] },
      },
    ],
    async onClick(context) {
      const item = context.items[0];
      if (!item || !isImage(item)) return;
      const payload = anchorPayload(item, { revealBy: OBR.player.id });
      await OBR.broadcast.sendMessage(CHANNEL, payload, { destination: "ALL" });
    },
  });

  // GM-only right-click entry for the Compass cutscene on a single image token.
  OBR.contextMenu.create({
    id: `${ID}/context-menu-compass`,
    icons: [
      {
        icon: `${BASE}icon.svg`,
        label: "Compass",
        filter: { roles: ["GM"], max: 1, every: [{ key: "type", value: "IMAGE" }] },
      },
    ],
    async onClick(context) {
      const item = context.items[0];
      if (!item || !isImage(item)) return;
      const payload = compassPayload(item, { revealBy: OBR.player.id });
      await OBR.broadcast.sendMessage(CHANNEL, payload, { destination: "ALL" });
    },
  });

  // GM-only right-click entry for the Spica cutscene on a single image token.
  OBR.contextMenu.create({
    id: `${ID}/context-menu-spica`,
    icons: [
      {
        icon: `${BASE}icon.svg`,
        label: "Spica",
        filter: { roles: ["GM"], max: 1, every: [{ key: "type", value: "IMAGE" }] },
      },
    ],
    async onClick(context) {
      const item = context.items[0];
      if (!item || !isImage(item)) return;
      const payload = spicaPayload(item, { revealBy: OBR.player.id });
      await OBR.broadcast.sendMessage(CHANNEL, payload, { destination: "ALL" });
    },
  });

  // GM-only right-click entry for Star that doesn't Exist on a single image token.
  OBR.contextMenu.create({
    id: `${ID}/context-menu-star`,
    icons: [
      {
        icon: `${BASE}icon.svg`,
        label: "Star that doesn't Exist",
        filter: { roles: ["GM"], max: 1, every: [{ key: "type", value: "IMAGE" }] },
      },
    ],
    async onClick(context) {
      const item = context.items[0];
      if (!item || !isImage(item)) return;
      const payload = starPayload(item, { revealBy: OBR.player.id });
      await OBR.broadcast.sendMessage(CHANNEL, payload, { destination: "ALL" });
    },
  });

  // GM-only right-click entry for 2 to 5 selected image tokens.
  OBR.contextMenu.create({
    id: `${ID}/context-menu-assault`,
    icons: [
      {
        icon: `${BASE}icon.svg`,
        label: "All Out Attack",
        filter: { roles: ["GM"], min: 2, max: 5, every: [{ key: "type", value: "IMAGE" }] },
      },
    ],
    async onClick(context) {
      if (!context.items.every(isImage)) return;
      // Selection order: first token is the lead, last token is the target.
      const selection = (await OBR.player.getSelection()) || [];
      const rank = (item) => {
        const i = selection.indexOf(item.id);
        return i < 0 ? selection.length : i;
      };
      const ordered = [...context.items].sort((a, b) => rank(a) - rank(b));
      const target = ordered.pop();
      await OBR.broadcast.sendMessage(CHANNEL, assaultPayload(ordered, 0, target), { destination: "ALL" });
    },
  });
});
