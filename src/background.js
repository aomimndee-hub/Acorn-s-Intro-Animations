import OBR, { isImage } from "@owlbear-rodeo/sdk";
import { BASE, CHANNEL, ID, MODAL_ID, animationById, assaultPayload, payloadFor } from "./shared.js";

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
        label: "Play Intro Cutscene",
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

  // GM-only right-click entry for 2 to 5 selected image tokens.
  OBR.contextMenu.create({
    id: `${ID}/context-menu-assault`,
    icons: [
      {
        icon: `${BASE}icon.svg`,
        label: "Team Assault",
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
