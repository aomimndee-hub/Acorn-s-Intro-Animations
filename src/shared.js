export const ID = "com.acorn.intro-animations";
export const CHANNEL = `${ID}/play`;
export const MODAL_ID = `${ID}/cutscene`;
export const BASE = import.meta.env.BASE_URL;

const SETTINGS_KEY = `${ID}/settings`;
const DEFAULTS = {
  subtitle: "",
  reveal: true,
  volume: 0.8,
  animation: "crystal",
  caption: "CURTAIN CALL",
  accent: "#e60012",
};

/** Animations the GM can choose from. Add new ones here. */
export const ANIMATIONS = [
  {
    id: "crystal",
    label: "Crystal Intro",
    description: "Cinematic reveal of one token, synced to music (about 30 s).",
    page: "intro.html",
  },
  {
    id: "assault",
    label: "Team Assault",
    description: "Up to 4 tokens appear in glass, rush 1 target in black silhouette, and the lead lands (about 16 s).",
    page: "finisher.html",
  },
];

// "slash" was the previous name of the two-token finisher.
export const animationById = (id) =>
  ANIMATIONS.find((a) => a.id === (id === "slash" ? "assault" : id)) || ANIMATIONS[0];

export function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: settings just won't persist */
  }
  return next;
}

/** Name shown on the token label, falling back to the item name. */
export function tokenName(item) {
  const label = item?.text?.plainText?.trim();
  return label || item?.name || "Unknown";
}

/** Build the payload every client needs to play the cutscene. */
export function payloadFor(item, overrides = {}) {
  const settings = loadSettings();
  return {
    itemId: item.id,
    imageUrl: item.image?.url || "",
    name: overrides.name ?? tokenName(item),
    subtitle: overrides.subtitle ?? settings.subtitle,
    reveal: overrides.reveal ?? settings.reveal,
    revealBy: overrides.revealBy || "",
    nonce: Math.random().toString(36).slice(2),
  };
}

const tokenInfo = (item) => ({
  url: item.image?.url || "",
  mime: item.image?.mime || "",
  name: tokenName(item),
});

/** Payload for Team Assault: 1-4 team tokens, one of them the lead, and 1 target. */
export function assaultPayload(team, leadIndex, target, overrides = {}) {
  const settings = loadSettings();
  return {
    animation: "assault",
    team: team.slice(0, 4).map(tokenInfo),
    leadIndex,
    target: tokenInfo(target),
    caption: overrides.caption ?? settings.caption,
    accent: overrides.accent ?? settings.accent,
    nonce: Math.random().toString(36).slice(2),
  };
}
