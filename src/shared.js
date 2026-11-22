export const ID = "com.acorn.intro-animations";
export const CHANNEL = `${ID}/play`;
export const MODAL_ID = `${ID}/cutscene`;
export const BASE = import.meta.env.BASE_URL;

const SETTINGS_KEY = `${ID}/settings`;
const DEFAULTS = { subtitle: "", reveal: true, volume: 0.8 };

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
