import OBR, { isImage } from "@owlbear-rodeo/sdk";
import { BASE, CHANNEL, ID, MODAL_ID, payloadFor } from "./shared.js";

async function openCutscene(data) {
  const url = `${BASE}intro.html#${encodeURIComponent(JSON.stringify(data))}`;
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
});
