import OBR, { isImage } from "@owlbear-rodeo/sdk";
import { BASE, CHANNEL, ID, MODAL_ID, animationById, finisherPayload, payloadFor } from "./shared.js";

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

  // GM-only right-click entry when exactly two image tokens are selected.
  OBR.contextMenu.create({
    id: `${ID}/context-menu-slash`,
    icons: [
      {
        icon: `${BASE}icon.svg`,
        label: "Slash Finisher",
        filter: { roles: ["GM"], min: 2, max: 2, every: [{ key: "type", value: "IMAGE" }] },
      },
    ],
    async onClick(context) {
      const [first, second] = context.items;
      if (!isImage(first) || !isImage(second)) return;
      // Follow the GM's click order; the popover can swap the two roles.
      const selection = (await OBR.player.getSelection()) || [];
      const [attacker, target] = selection.indexOf(first.id) <= selection.indexOf(second.id)
        ? [first, second]
        : [second, first];
      await OBR.broadcast.sendMessage(CHANNEL, finisherPayload(attacker, target), { destination: "ALL" });
    },
  });
});
