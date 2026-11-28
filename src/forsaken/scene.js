// Forsaken: a Rochas313-style cutscene in a blocky 3D world, 88 s, cut from the
// FORSAKEN cover (0:51-2:19). Every frame is a pure function of the song time.
//
// Storyboard (times in public/audio/forsaken.mp3, 95 BPM, music hits at 26.8 s):
//  0-6.6     layer 1: the red seed of Nosoi in its cage of branches (dialogue)
//  6.6-10.6  daylight on the farm; the hero looks up at the tree, then tumbles
//  10.6-26.7 questions for the smiling NPC under the tree; SPREAD flash
//  26.7-36.9 verse: the tree in red and white posterize, iridescent sky, pixel lyrics
//  36.9-38.6 green close-up ("away")
//  38.6-47.4 rot spreading over the tree seen from above; the frame spins
//  47.4-67.6 chorus: the hero sits before red rays, lies on the mound, close-ups,
//            inverted cyan flashes; tall red serif lyrics build word by word
//  67.6-77.5 dead trees in sepia with boxed lyrics, then Nosoi against a red sky
//  77.5-88   grow farther: the tree from below, a storm, a field of heads, the
//            farm at dusk, and the last question: WHY HAVE YOU FORSAKEN ME?
//
// role "infected": the player is the hero (in Rochas's place) all the way through.
// role "called":   Rochas is the hero; the player is the one Nosoi calls at the end.
// display "character": the player is a Roblox avatar with a name tag.
// display "token":     the token image stands in the world in the avatar's place.
import { clamp, easeInCubic, easeOutCubic, hash, lerp, prog, smooth } from "../cutscene/util.js";

const BEAT = 60 / 95;
const B0 = 26.808; // first beat once the music comes in
const CHORUS = 47.4;

export const T = { end: 88.0 };

const beatPulse = (t, d = 0.1) => (t < B0 - 0.05 ? 0 : Math.exp(-((((t - B0) % BEAT) + BEAT) % BEAT) / d));
const beatNo = (t) => Math.floor((t - B0) / BEAT);

const SERIF = '"Cinzel", "Cormorant Garamond", Georgia, serif';
const PIXEL = '"VT323", "Courier New", monospace';
const SANS = '"Inter", system-ui, sans-serif';

// ---- lyrics (as sung in the cut) --------------------------------------------------------------
// [start, text, style]; each line holds until the next line of the same group starts.
const DIALOGUE = [
  [0.2, 1.9, "What is your name?"],
  [3.6, 6.3, "Where do you come from?"],
  [6.6, 10.3, "And... Where exactly are those"],
  [10.3, 12.4, "Buildings we made?"],
  [12.6, 16.4, "How did you even end up here?"],
  [16.6, 17.6, "What does that mean?"],
  [17.6, 19.5, "Yeah- What even are you?"],
  [19.6, 20.6, "Guess it doesn't wanna"],
  [20.6, 22.4, "Respond to that..?"],
  [22.6, 23.5, "Why"],
  [23.5, 26.0, "Why are you inside our"],
];
const FLASH_WORDS = [
  [1.6, 2.6, "NOSOI"],
  [5.5, 6.5, "ROOTS"],
  [25.95, 26.75, "SPREAD"],
];
const VERSE = [
  [26.7, "I feel like the wind keeps on"],
  [28.6, "pullin' me back."],
  [29.6, "The fruits of my labour keep"],
  [30.6, "molding to black."],
  [31.6, "Wanna keep growing"],
  [33.5, "and growing my name"],
  [34.6, "But you're showing me lies"],
  [35.6, "and just hiding the truth"],
  [36.6, "A-"],
  [37.4, "away."],
  [38.6, "And now that I stray from"],
  [39.6, "the roots that I come from"],
  [40.6, "It's nothing I've played before"],
  [42.6, "I'm sore"],
  [43.6, "It's hurtin' my core"],
  [44.6, "You're just peeling away"],
  [45.6, "at my legs"],
  [46.7, "So"],
  [47.4, null],
];
const CHORUS_LINES = [
  [47.4, ["SPREAD", "SPREAD", "SPREAD", "SPREAD"]],
  [49.6, ["MARCH FOR OUR", "FATHER", "UNTIL YOU ARE", "DEAD"]],
  [52.6, ["SPEND ALL OUR", "ASHES", "ACROSS THE SIX", "SUNS"]],
  [54.6, ["AND DO NOT", "COME BACK", "UNTIL YOU ARE", "DONE"]],
  [57.4, ["WIPE", "YOUR TEARS", "AND GIVE THEM", "TO ME"]],
  [59.6, ["COME FACE", "YOUR FEARS", "AND LET THEM", "ALL SEE"]],
  [62.6, ["HOW USEFUL", "YOU ARE", "HOW USEFUL", "YOU'LL BE"]],
  [64.6, ["HOW USEFUL", "YOU'LL TURN OUT", "TO OUR", "COLONY!"]],
  [67.6, null],
];
const BOX_LINES = [
  [67.6, ["SPREAD", "SPREAD", "SPREAD"]],
  [69.6, ["THE WAY THAT", "WE DO IT", "IS WHAT IS", "CORRECT"]],
  [72.6, ["SO WAGER", "YOUR MORALS", "FEED YOUR", "REGRET"]],
  [74.6, ["JUST LET", "ME CONSUME", "AND NEVER", "REPENT"]],
  [77.5, null],
];
const FINAL_LINES = [
  [77.5, "GROW FARTHER"],
  [78.6, "THAN YOU'VE EVER GROWN"],
  [80.6, "PAST THE EVERGREEN"],
  [82.6, "AND ASK"],
  [83.6, "AND ASK YOU SO:"],
  [84.6, "WHY"],
  [85.6, "WHY HAVE YOU FOR-"],
  [86.4, "WHY HAVE YOU FORSAKEN ME?"],
  [88.0, null],
];

function current(list, t) {
  for (let i = list.length - 2; i >= 0; i--) if (t >= list[i][0]) return t < list[i + 1][0] ? { i, t0: list[i][0], t1: list[i + 1][0], v: list[i][1] } : null;
  return null;
}

// ---- shots --------------------------------------------------------------------------------------

const TZ = -22; // Nosoi's trunk (see TREE_Z in world.js)
const HERO = [0, 0, 30];
const NPC = [0, 0, 21];
const SUNSET = { bg: 0, skyTop: "#4f5d9a", skyBot: "#f2a866", warm: 0.18, vig: 0.6 };
const SUNSET_LIGHT = { sky: "#ffe6c8", ground: "#4a3524", hemi: 1.35, sun: "#ffd0a0", sunI: 1.9 };
const RED = { red: 1, poster: 4, vig: 0.8 };

const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
/** Smooth organic noise in -1..1. */
const sn = (t, k = 0) => Math.sin(t * 1.13 + k * 1.7) * 0.5 + Math.sin(t * 2.31 + k * 3.1) * 0.3 + Math.sin(t * 3.97 + k * 0.7) * 0.2;
/** A hand-held camera: small, slow drift on two axes. */
const handheld = (t, amp) => [sn(t * 0.9, 11) * amp, sn(t * 0.8, 23) * amp];

// The run: Rochas starts at z = 58, pushes off at RUN0, and sprints up the root
// steps to the platform in front of the trunk (ground heights from the model).
const RUN0 = 7.9;
const ROOT_STEPS = [[22, 0], [19, 1], [15, 2], [9, 3], [7, 4], [5, 5.2]];
function groundY(z) {
  for (const [z0, y] of ROOT_STEPS.slice().reverse()) if (z <= z0) return y;
  return 0;
}
/** The same, eased over each step, for a walking camera. */
function groundYSoft(z) {
  let y = 0;
  for (let i = 0; i < ROOT_STEPS.length; i++) {
    const [z0, h] = ROOT_STEPS[i];
    const prev = i ? ROOT_STEPS[i - 1][1] : 0;
    y += (h - prev) * smooth(-z, -z0 - 0.6, -z0 + 0.6);
  }
  return y;
}
function heroZ(t) {
  if (t < RUN0) return 58;
  if (t < 11.5) {
    const d = t < RUN0 + 0.4 ? (13 * (t - RUN0) ** 2) / 0.8 : 2.6 + 13 * (t - RUN0 - 0.4);
    return 58 - d;
  }
  const k = prog(t, 11.5, 13.0);
  return lerp(13.8, -3.2, 1 - (1 - k) * (1 - k));
}
const runBob = (t) => Math.abs(Math.cos((t - RUN0) * Math.PI * 2 * 1.45)) - 0.5;

// Glitch sounds in the cut (bursts above 5.5 kHz): [start, length]
const GLITCHES = [
  [2.34, 0.04], [2.66, 0.06], [3.58, 0.08], [3.91, 0.07], [4.87, 0.07], [5.19, 0.05], [5.84, 0.05], [7.89, 0.05], [10.42, 0.16],
  [11.27, 0.07], [12.09, 0.09], [14.21, 0.12], [15.1, 0.08], [15.93, 0.09], [18.01, 0.11], [20.74, 0.11], [21.18, 0.1], [21.62, 0.37],
  [22.08, 0.1], [22.58, 0.18], [23.47, 0.11], [24.76, 0.14], [25.15, 0.15], [25.43, 0.04], [26.63, 0.17], [27.08, 0.44], [27.34, 0.18],
  [30.15, 0.11], [30.46, 0.13], [32.27, 0.19], [34.19, 0.1], [35.92, 0.1], [36.59, 0.1], [36.92, 0.05], [37.84, 0.09], [38.42, 0.09],
  [39.23, 0.19], [40.1, 0.13], [40.64, 0.08], [40.91, 0.19], [41.87, 0.09], [43.07, 0.08], [44.87, 0.05],
];
/** 0..1 while a glitch sound plays (with a short tail), flickering frame to frame. */
function glitchAt(t) {
  for (const [a, d] of GLITCHES) {
    const end = a + Math.max(d, 0.1) + 0.08;
    if (t >= a - 0.02 && t < end) return 0.55 + 0.45 * hash(Math.floor(t * 40));
  }
  return 0;
}

/** Every shot returns what the 3D world needs; `hero` and `player` say who stands where. */
const SHOTS = [
  // ---- dialogue --------------------------------------------------------------------------------
  [0, 6.6, (t, lt) => ({
    show: { core: 1 },
    cam: [Math.sin(lt * 0.18) * 17, 3 + Math.sin(lt * 0.3) * 2, Math.cos(lt * 0.18) * 17 - lt * 0.5],
    look: [0, 0, 0], fov: 46, coreBeat: Math.exp(-((lt % 1.6) / 0.25)),
    light: { sky: "#ffb09a", ground: "#301010", hemi: 1.5, sun: "#ffc0a0", sunI: 1.8 },
    fog: ["#000", 22, 70],
    grade: { bg: 3, vig: 1.0, dark: 0.5 * (1 - smooth(lt, 0, 1.2)) + 0.3 * smooth(lt, 5.6, 6.6), blur: lt < 1 ? 2 : 0 },
  })],
  // ---- the run to the tree (third person), then first person at its roots -------------------
  [6.6, 8.2, (t, lt) => {
    const z = heroZ(t);
    const crouch = prog(t, 7.45, 7.9);
    const go = prog(t, 7.9, 8.15);
    const [hx, hy] = handheld(t, 0.12);
    return {
      show: { farm: 1 },
      hero: go > 0 ? { pos: [0, groundY(z), z], rotY: Math.PI, pose: "crouch", to: "run", blend: go, pt: t - RUN0 } : { pos: [0, 0, z], rotY: Math.PI, pose: "idle", to: "crouch", blend: crouch, face: "worried" },
      cam: [1.7 + hx, 5.5 + hy, z + 4.6 - easeInOut(prog(t, 6.6, 8.2)) * 0.8], look: [-0.4, 6.5, TZ], fov: 52,
      light: { hemi: 1.5, sunI: 2.2 }, fog: ["#bcd3ea", 150, 600],
      grade: { bg: 0, skyTop: "#5f95dd", skyBot: "#dfeefa", vig: 0.5 },
    };
  }],
  [8.2, 9.2, (t, lt) => {
    const z = heroZ(t);
    const [hx, hy] = handheld(t, 0.25);
    return {
      show: { farm: 1 }, hero: { pos: [0, groundY(z), z], rotY: Math.PI, pose: "run", pt: t - RUN0 },
      cam: [0.9 + hx, 1.7 + hy + runBob(t) * 0.3, z + 7.5 - lt * 0.6], look: [0, 9, TZ], fov: 60,
      light: { hemi: 1.5, sunI: 2.2 }, fog: ["#bcd3ea", 150, 600],
      grade: { bg: 0, skyTop: "#5f95dd", skyBot: "#dfeefa", vig: 0.6, blur: 0.6 },
    };
  }],
  [9.2, 10.8, (t, lt) => {
    // the camera whips once around him while he keeps running
    const z = heroZ(t);
    const y = groundY(z);
    const a = Math.PI * 0.5 + easeInOut(prog(t, 9.2, 10.8)) * Math.PI * 2;
    return {
      show: { farm: 1 }, hero: { pos: [0, y, z], rotY: Math.PI, pose: "run", pt: t - RUN0 },
      cam: [Math.cos(a) * 6.5, y + 3.4 + Math.sin(a * 2) * 0.6, z + Math.sin(a) * 6.5], look: [0, y + 3.2, z], fov: 58, roll: Math.sin(a) * 0.25,
      light: { hemi: 1.5, sunI: 2.2 }, fog: ["#bcd3ea", 150, 600],
      grade: { bg: 0, skyTop: "#5f95dd", skyBot: "#dfeefa", vig: 0.7, blur: 0.8 + Math.abs(Math.cos(a)) * 1.2 },
    };
  }],
  [10.8, 11.5, (t, lt) => {
    const z = heroZ(t);
    const y = groundY(z);
    return {
      show: { farm: 1 }, hero: { pos: [0, y, z], rotY: Math.PI, pose: "run", pt: t - RUN0 },
      cam: [2.3, y + 0.9, z - 1.2 + lt * 2], look: [0, y + 1.5, z], fov: 56, roll: -0.12,
      light: { hemi: 1.2, sunI: 1.6, backI: 1 }, fog: ["#3a0806", 40, 200],
      grade: { bg: 0, skyTop: "#3a0000", skyBot: "#c02010", red: 0.55, vig: 1.0, blur: 1 },
    };
  }],
  [11.5, 13.0, (t, lt) => {
    // first person: the last strides up the roots, stopping hard at the bark
    const z = heroZ(t);
    const y = groundY(z);
    const moving = 1 - prog(t, 13.0 - 0.4, 13.0);
    const [hx, hy] = handheld(t, 0.08);
    return {
      show: { farm: 1 }, fp: true,
      cam: [hx, y + 4.7 + runBob(t) * moving * 0.5 + hy, z - 0.2], look: [hx * 2, y + 5.2 - prog(t, 12.4, 13) * 0.8, z - 10], fov: 66 - prog(t, 12.2, 13) * 6,
      roll: Math.sin(t * Math.PI * 2 * 1.45) * 0.035 * moving,
      light: SUNSET_LIGHT, fog: ["#c98b5a", 120, 520],
      grade: { ...SUNSET, warm: 0.3, blur: smooth(t, 12.3, 12.9) * 6, vig: 0.8 },
    };
  }],
  [13.0, 16.5, (t, lt) => {
    // first person: looking up the trunk; breath and a slow sway
    const [hx, hy] = handheld(t, 0.06);
    const up = easeInOut(prog(t, 13.0, 15.2));
    return {
      show: { farm: 1 }, fp: true,
      cam: [hx, 5.2 + 4.75 + hy + Math.sin(t * 1.7) * 0.04, -2.8 + up * 0.6], look: [sn(t * 0.4) * 2, 9 + up * 56, TZ], fov: 64, roll: sn(t * 0.3, 2) * 0.05,
      light: SUNSET_LIGHT, fog: ["#c98b5a", 120, 520],
      grade: { ...SUNSET, skyTop: "#d6dbe8", skyBot: "#fff1de", warm: 0.2, vig: 0.8 }, flashRed: 1,
    };
  }],
  [16.5, 23.5, (t, lt) => {
    // first person, face to the bark; his own sleeve reaches into frame to touch it
    const [hx, hy] = handheld(t, 0.05);
    return {
      show: { farm: 1 }, fp: true,
      hero: { pos: [0, 5.2, -3.4], rotY: Math.PI, pose: "touch", noHead: true },
      cam: [-0.2 + hx, 9.95 + hy + Math.sin(t * 1.7) * 0.03, -2.95], look: [-0.6 + sn(t * 0.3) * 0.5, 8.6 + sn(t * 0.25, 1) * 0.6, -7], fov: 62, roll: sn(t * 0.3, 3) * 0.06,
      light: SUNSET_LIGHT, fog: ["#c98b5a", 120, 520],
      grade: { ...SUNSET, warm: 0.35, blur: 2.2 + sn(t * 0.5) * 1.2, vig: 1.0 }, flashRed: 1,
    };
  }],
  [23.5, 25.95, (t, lt) => {
    // first person: stepping back down the roots, eyes going up the tree
    const z = lerp(-3.2, 7, easeInOut(prog(t, 23.5, 25.9)));
    const [hx, hy] = handheld(t, 0.08);
    return {
      show: { farm: 1 }, fp: true,
      cam: [hx, groundYSoft(z) + 4.7 + hy + Math.abs(Math.sin(t * 5)) * 0.08, z], look: [0, lerp(14, 52, easeInOut(prog(t, 23.5, 25.9))), TZ], fov: 62,
      light: SUNSET_LIGHT, fog: ["#c98b5a", 120, 520],
      grade: { ...SUNSET, warm: 0.4, dark: smooth(t, 25.2, 25.95) * 0.4, vig: 0.9 }, flashRed: 1,
    };
  }],
  [25.95, 26.75, (t, lt) => ({
    show: { farm: 1 }, chars: { noob: { pos: [0.5, 5.2, -4.6], rotY: 0, pose: "stand", face: "grin" } },
    cam: [0.6, 9.8, -1.4 - lt * 0.9], look: [0.5, 9.75, -4.6], fov: 44, roll: (hash(Math.floor(t * 30)) - 0.5) * 0.06,
    light: SUNSET_LIGHT, grade: { ...SUNSET, red: 0.7, invert: lt < 0.12 ? 1 : 0, glitch: 0.8, poster: 5 },
  })],
  // ---- verse: red and white, posterized -------------------------------------------------------
  [26.75, 36.9, (t, lt) => {
    const a = Math.floor(lt / (BEAT * 4)); // a new angle every bar
    const k = (lt % (BEAT * 4)) / (BEAT * 4);
    const angles = [
      { cam: [34 - k * 3, 3, TZ + 40], look: [0, 22, TZ] },
      { cam: [7, 22 + k * 10, TZ + 14], look: [0, 40 + k * 8, TZ] },
      { cam: [-40 + k * 4, 6, TZ + 66], look: [0, 40, TZ] },
      { cam: [0, 16 - k * 4, TZ + 30], look: [0, 70, TZ - 4] },
    ];
    const c = angles[a % angles.length];
    return {
      show: { farm: 1 }, ...c, fov: 58, roll: a % 2 ? 0.12 : -0.08,
      light: { sky: "#ffffff", ground: "#550000", hemi: 1.6, sunI: 2.6 }, fog: ["#fff", 160, 700],
      grade: { bg: 2, ...RED, irid: 0.9, glitch: beatPulse(t, 0.08) * 0.7, vig: 0.3 },
    };
  }],
  [36.9, 38.6, (t, lt) => ({
    show: { farm: 1 }, hero: { pos: HERO, rotY: Math.PI * 0.85, pose: "stand", face: "worried", extra: { head: -0.15 } },
    cam: [1.0, 4.3, HERO[2] - 2.8 + lt * 0.2], look: [0, 4.9, HERO[2]], fov: 46,
    light: { hemi: 1.8, sunI: 2.4 }, grade: { green: 1, blur: 2, vig: 0.7, glitch: lt > 1.2 ? 0.6 : 0 },
  })],
  [38.6, 47.4, (t, lt) => {
    const spin = lt > 6.4 ? easeInCubic(prog(lt, 6.4, 8.8)) * 9 : 0;
    return {
      show: { farm: 1 },
      cam: [0.01, 120 - lt * 7, TZ + 0.01], look: [0, 0, TZ], roll: lt * 0.12 + spin, fov: 55,
      light: { hemi: 1.4, sunI: 2.2 }, fog: ["#000", 300, 900],
      grade: { bg: 3, red: 1, poster: 3, rot: 0.2 + 0.5 * smooth(lt, 0, 8), vig: 0.9, glitch: spin > 0.5 ? 0.7 : 0 },
    };
  }],
  // ---- chorus ------------------------------------------------------------------------------------
  [CHORUS, 54.0, (t, lt) => ({
    show: { farm: 1 }, hero: { pos: [0, 0, 62], rotY: 0, pose: "hug", face: "worried" },
    cam: [Math.sin(lt * 0.3) * 2, 0.7, 71 - lt * 0.4], look: [0, 6.5, 62], fov: 50, roll: Math.sin(lt * 0.7) * 0.04,
    light: { hemi: 0.35, sunI: 0.3, backI: 1.5 }, fog: ["#300", 20, 160],
    grade: { bg: 1, rayC: [0.5, 0.42], ...RED, poster: 3, zig: smooth(lt, 2.2, 3) * 0.8, vig: 0.7 },
  })],
  [54.0, 57.4, (t, lt) => ({
    show: { farm: 1 }, hero: { pos: [-3, 0.2, 26], rotY: 0.5, pose: "lie" },
    cam: [5 - lt * 0.5, 7, 33], look: [-3, 0.6, 25], fov: 48,
    light: { hemi: 1.2, sunI: 1.6 }, fog: ["#200", 30, 200],
    grade: { bg: 3, ...RED, poster: 4, invert: lt > 1.8 && lt < 2.25 ? 1 : 0, vig: 0.9 },
  })],
  [57.4, 59.6, (t, lt) => ({
    show: { farm: 1 }, hero: { pos: HERO, rotY: 0.15, pose: "stand", face: "worried", extra: { head: 0.1 } },
    cam: [0.9, 4.7, HERO[2] + 2.8 - lt * 0.2], look: [0, 4.6, HERO[2]], fov: 40,
    light: { hemi: 2, sunI: 2.4 }, grade: { bg: 3, ...RED, poster: 5, vig: 1.0 },
  })],
  [59.6, 62.6, (t, lt) => ({
    show: { farm: 1 }, hat: [1.6, 0.2, 27.2], hero: { pos: [-1.2, 0, 26], rotY: 0.3, pose: "lie" },
    cam: [3.6 - lt * 0.3, 1.8, 31], look: [1.4, 0.4, 27.4], fov: 44,
    light: { hemi: 2, sunI: 2.4 }, grade: { bg: 3, ...RED, poster: 5, vig: 1.0 },
  })],
  [62.6, 64.6, (t, lt) => ({
    show: { farm: 1 }, hat: [1.6, 0.2, 27.2], hero: { pos: [-1.2, 0, 26], rotY: 0.3, pose: "lie" },
    cam: [-3, 2.6, 31.5], look: [0.5, 0.6, 26.5], fov: 50,
    light: { hemi: 2, sunI: 2.4 }, grade: { bg: 3, ...RED, poster: 5, vig: 1.0, invert: beatPulse(t, 0.05) > 0.6 ? 1 : 0 },
  })],
  [64.6, 67.6, (t, lt) => ({
    show: { farm: 1 }, hero: { pos: HERO, rotY: Math.PI + lt * 0.8, pose: "reach", face: "grin" },
    cam: [Math.sin(lt * 1.4) * 8, 4.5, HERO[2] + Math.cos(lt * 1.4) * 8], look: [0, 3.6, HERO[2]], fov: 56, roll: lt * 0.4,
    light: { hemi: 1.2, sunI: 2 }, grade: { bg: 1, ...RED, poster: 3, invert: hash(beatNo(t) * 7) > 0.45 && beatPulse(t, 0.12) > 0.4 ? 1 : 0, glitch: 0.8 },
  })],
  // ---- sepia, then red sky -----------------------------------------------------------------------
  [67.6, 74.6, (t, lt) => ({
    show: { forest: 1 },
    cam: [-24 + lt * 4, 5, 28], look: [-24 + lt * 4, 9, -20], fov: 48,
    light: { sky: "#ffdcae", ground: "#3a2010", hemi: 1.3, sunI: 1.2 }, fog: ["#b88a58", 25, 140],
    grade: { bg: 5, blur: 1.5, vig: 0.8, warm: 0.2 },
  })],
  [74.6, 77.5, (t, lt) => ({
    show: { farm: 1 },
    cam: [-8 + lt * 2, 6, 150 - lt * 6], look: [0, 36, TZ], fov: 46,
    light: { hemi: 0.05, sunI: 0, backI: 0.3 }, fog: ["#4a0000", 120, 400],
    grade: { bg: 0, skyTop: "#2a0000", skyBot: "#ff2a10", vig: 0.9, glitch: lt < 0.25 ? 0.8 : 0 },
  })],
  // ---- grow farther ------------------------------------------------------------------------------
  [77.5, 78.6, (t, lt) => ({
    show: { farm: 1 },
    cam: [10, 1.5, 30], look: [0, 60, TZ], fov: 62,
    light: { hemi: 1.6, sunI: 2.4 }, fog: ["#bcd3ea", 150, 600],
    grade: { bg: 0, skyTop: "#5f95dd", skyBot: "#eaf3fb", vig: 0.4 },
  })],
  [78.6, 80.6, (t, lt) => ({
    show: { farm: 1 },
    cam: [0, 2, 52 - lt * 2], look: [0, 48, TZ], fov: 58,
    light: { hemi: 0.08, sunI: 0.05 }, fog: ["#1a1020", 300, 900],
    grade: { bg: 4, vig: 0.8 },
  })],
  [80.6, 82.6, (t, lt) => ({
    show: { heads: 1 },
    cam: [-3 + lt * 2, 7 - lt, 16], look: [0, 0, -14], fov: 52,
    light: { sky: "#ff9ad6", ground: "#200814", hemi: 1.2, sunI: 1.4 }, fog: ["#7a2a55", 25, 90],
    grade: { bg: 6, vig: 0.8, poster: 6 },
  })],
  [82.6, 84.6, (t, lt) => ({
    show: { farm: 1 }, hero: { pos: [0, 0, 40], rotY: Math.PI, pose: "idle", face: "worried" },
    cam: [0.5, 5.4, 49 - lt * 1.2], look: [0, 24, TZ], fov: 52,
    light: SUNSET_LIGHT, grade: { ...SUNSET, warm: 0.9, vig: 1.4, dark: 0.15 },
  })],
  [84.6, 88.1, (t, lt) => {
    const fall = easeInCubic(prog(lt, 2.2, 3.3));
    return {
      show: { farm: 1 }, finale: true,
      cam: [0, 4.4, 30 - lt * 0.6], look: [0, 4 - fall * 2, 21], fov: 46,
      light: { ...SUNSET_LIGHT, hemi: 1.8, sunI: 2.6 }, grade: { ...SUNSET, warm: 0.2, red: smooth(lt, 0.8, 1.8) * 0.5, vig: 0.8, dark: smooth(lt, 3.1, 3.4) },
      npc: { pos: NPC, rotY: 0, rotX: fall * 1.2, pose: "reach", face: lt > 1.8 ? "grin" : "smile" },
    };
  }],
];

function shotAt(t) {
  for (const [a, b, f] of SHOTS) if (t >= a && t < b) return f(t, t - a);
  const [a, , f] = SHOTS[SHOTS.length - 1];
  return f(t, t - a);
}

// ---- 2D drawing helpers -----------------------------------------------------------------------

const textCache = new Map();

/**
 * Tall red serif text with a soft glow. The glow (shadowBlur) is slow, so each
 * phrase is drawn once into its own canvas and reused every frame.
 */
function condensed(ctx, str, x, y, size, { color = "#e0141c", alpha = 1, glow = 0.8, squeeze = 0.62, align = "center" } = {}) {
  const px = Math.max(8, Math.round(size / 4) * 4);
  const key = `${str}|${px}|${color}|${glow}|${squeeze}`;
  let c = textCache.get(key);
  if (!c) {
    const m = document.createElement("canvas").getContext("2d");
    m.font = `700 ${px}px ${SERIF}`;
    const pad = px * 0.4;
    const w = Math.ceil(m.measureText(str).width * squeeze + pad * 2);
    const h = Math.ceil(px * 1.5 + pad * 2);
    c = document.createElement("canvas");
    c.width = Math.max(1, w);
    c.height = h;
    const x2 = c.getContext("2d");
    x2.translate(pad, h / 2);
    x2.scale(squeeze, 1);
    x2.font = `700 ${px}px ${SERIF}`;
    x2.textBaseline = "middle";
    x2.shadowColor = `rgba(255,20,30,${glow})`;
    x2.shadowBlur = px * 0.25;
    x2.fillStyle = color;
    x2.fillText(str, 0, 0);
    x2.shadowBlur = 0;
    x2.globalAlpha = 0.35;
    x2.fillText(str, px * 0.03, px * 0.02);
    if (textCache.size > 120) textCache.clear();
    textCache.set(key, c);
  }
  const k = size / px;
  const dw = c.width * k;
  const dh = c.height * k;
  const dx = align === "center" ? x - dw / 2 : align === "right" ? x - dw : x;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(c, dx, y - dh / 2, dw, dh);
  ctx.restore();
}

function widthOf(ctx, str, size, font, squeeze = 1) {
  ctx.font = font.replace("{s}", size);
  return ctx.measureText(str).width * squeeze;
}

/** Roblox-style name tag over a character's head. */
function nameTag(ctx, st, name, x, y, scale = 1) {
  if (!name) return;
  ctx.save();
  const s = Math.max(11, st.H * 0.026 * scale);
  ctx.font = `700 ${s}px ${SANS}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.lineWidth = s * 0.22;
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.strokeText(name, x, y);
  ctx.fillStyle = "#fff";
  ctx.fillText(name, x, y);
  ctx.restore();
}

function hudTag(ctx, st, label, alpha = 1) {
  const { H, U } = st;
  ctx.save();
  ctx.globalAlpha = alpha * 0.9;
  const s = Math.max(10, H * 0.026);
  ctx.font = `500 ${s}px ${SANS}`;
  const w = ctx.measureText(label).width + s * 1.2;
  ctx.fillStyle = "#f4f4f4";
  ctx.beginPath();
  ctx.roundRect(14 * U, 14 * U, w, s * 1.6, s * 0.3);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 14 * U + s * 0.6, 14 * U + s * 0.82);
  ctx.restore();
}

function subtitle(ctx, st, str, alpha) {
  const { W, H } = st;
  const s = Math.max(13, H * 0.036);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `500 ${s}px ${SANS}`;
  const w = Math.min(W * 0.9, ctx.measureText(str).width + s * 2.2);
  ctx.fillStyle = "rgba(20,20,22,0.62)";
  ctx.beginPath();
  ctx.roundRect(W / 2 - w / 2, H * 0.86 - s, w, s * 2, s * 0.25);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(str, W / 2, H * 0.86);
  ctx.restore();
}

/** Words of a phrase appear one at a time. */
const revealCount = (t, t0, t1, n) => Math.min(n, 1 + Math.floor((t - t0) / Math.max(0.12, Math.min(0.32, ((t1 - t0) * 0.7) / n))));

// ---- the overlay ---------------------------------------------------------------------------------

function words(ctx, st, t, shot) {
  const { W, H } = st;
  // dialogue
  for (const [a, b, s] of DIALOGUE) if (t >= a && t < b) subtitle(ctx, st, s, smooth(t, a, a + 0.12) * (1 - smooth(t, b - 0.12, b)));
  // giant red flash words
  for (const [a, b, s] of FLASH_WORDS) {
    if (t < a || t >= b) continue;
    const on = hash(Math.floor(t * 24)) > 0.2 ? 1 : 0.35;
    condensed(ctx, s, W / 2 + (hash(Math.floor(t * 30)) - 0.5) * W * 0.02, H * 0.5, H * 0.95, { alpha: on * 0.85, squeeze: 0.45 });
  }
  // verse: pixel lyrics in the corners, the last word bigger and red
  const v = current(VERSE, t);
  if (v && v.v) {
    const s = v.v;
    const corner = v.i % 4;
    const typed = s.slice(0, Math.max(1, Math.floor((t - v.t0) / 0.045)));
    const size = Math.max(16, H * (s.length < 10 ? 0.16 : 0.085));
    ctx.save();
    ctx.font = `${size}px ${PIXEL}`;
    ctx.textBaseline = "middle";
    const left = corner === 0 || corner === 2;
    const top = corner < 2;
    ctx.textAlign = left ? "left" : "right";
    const x = left ? W * 0.05 : W * 0.95;
    const y = top ? H * 0.17 : H * 0.8;
    const parts = typed.split(" ");
    const last = parts.pop();
    const head = parts.length ? parts.join(" ") + " " : "";
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillText(typed, x + size * 0.06, y + size * 0.06);
    ctx.fillStyle = "#fff";
    const lw = ctx.measureText(last).width;
    if (left) {
      ctx.fillText(head, x, y);
      ctx.fillStyle = v.i % 3 === 1 ? "#4ab8ff" : "#ff2a2a";
      ctx.fillText(last, x + ctx.measureText(head).width, y);
    } else {
      ctx.fillText(head, x - lw, y);
      ctx.fillStyle = v.i % 3 === 1 ? "#4ab8ff" : "#ff2a2a";
      ctx.fillText(last, x, y);
    }
    // a ghost of the line, huge and blurred, behind the frame edge
    ctx.globalAlpha = 0.18;
    ctx.font = `${size * 2.6}px ${PIXEL}`;
    ctx.fillStyle = "#fff";
    ctx.fillText(last, left ? W * 0.02 : W * 0.98, top ? H * 0.36 : H * 0.6);
    ctx.restore();
  }
  // chorus: stacked tall red serif, words building row by row
  const c = current(CHORUS_LINES, t);
  if (c && c.v) {
    const rows = c.v;
    const n = revealCount(t, c.t0, c.t1, rows.length);
    const size = H * 0.13;
    const right = c.i % 2 === 0;
    const x = right ? W * 0.72 : W * 0.28;
    const y0 = H * 0.5 - ((rows.length - 1) * size * 0.95) / 2;
    const jitter = beatPulse(t, 0.08) * size * 0.05;
    for (let i = 0; i < n; i++) condensed(ctx, rows[i], x + (hash(i + c.i * 9 + Math.floor(t * 12)) - 0.5) * jitter, y0 + i * size * 0.95, size, { alpha: 0.95 });
  }
  // dead trees: boxed lyrics
  const b = current(BOX_LINES, t);
  if (b && b.v) {
    const rows = b.v;
    const n = revealCount(t, b.t0, b.t1, rows.length);
    const size = H * 0.085;
    const w = W * 0.3;
    const h = rows.length * size * 0.95 + size * 0.5;
    ctx.fillStyle = "rgba(60,40,30,0.55)";
    ctx.fillRect(W / 2 - w / 2, H * 0.12, w, h);
    for (let i = 0; i < n; i++) condensed(ctx, rows[i], W / 2, H * 0.12 + size * 0.7 + i * size * 0.95, size, { color: "#c4141a", glow: 0.4 });
  }
  // the last lines: one centred phrase, big
  const f = current(FINAL_LINES, t);
  if (f && f.v) {
    const s = f.v;
    const size = H * (s.length < 8 ? 0.2 : 0.13);
    const maxW = W * 0.9;
    const k = Math.min(1, maxW / Math.max(1, widthOf(ctx, s, size, `700 {s}px ${SERIF}`, 0.62)));
    const y = f.i === 2 || f.i >= 5 ? H * 0.8 : H * 0.2;
    condensed(ctx, s, W / 2, y, size * k, { alpha: smooth(t, f.t0, f.t0 + 0.15) });
  }
}

/** Fake spectrum bars along the bottom during the chorus, like a chase theme upload. */
function spectrum(ctx, st, t) {
  const { W, H } = st;
  const a = smooth(t, CHORUS, CHORUS + 0.5) * (1 - smooth(t, 67.2, 67.6));
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a * 0.55;
  ctx.fillStyle = "#ff5a2a";
  const n = 64;
  const bw = (W * 0.42) / n;
  for (let i = 0; i < n; i++) {
    const k = Math.exp(-i / 14) * (0.5 + 0.5 * hash(i * 3 + Math.floor(t * 20))) * (0.4 + beatPulse(t, 0.15));
    const h = H * 0.12 * k + 2;
    ctx.fillRect(W * 0.03 + i * bw, H - h - H * 0.02, bw * 0.7, h);
  }
  ctx.restore();
}

// ---- token and avatar placement ---------------------------------------------------------------

/** Tints for the token so it follows the shot's grade (no pixels are read back). */
export function buildTokenLooks(base) {
  const S = base.width;
  const make = (fill, op = "multiply") => {
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const x = c.getContext("2d");
    x.drawImage(base, 0, 0);
    x.globalCompositeOperation = op;
    x.fillStyle = fill;
    x.fillRect(0, 0, S, S);
    x.globalCompositeOperation = "destination-in";
    x.drawImage(base, 0, 0);
    return c;
  };
  return { normal: base, red: make("#ff1a1a"), green: make("#2ecc40"), dark: make("#5a1a10"), sepia: make("#d79a5a"), warm: make("#ffc08a") };
}

function drawToken(ctx, st, world, feet, height, grade, alpha = 1) {
  const K = st.tokS;
  if (!K) return;
  const a = world.project(feet, st.W, st.H);
  const b = world.project([feet[0], feet[1] + height, feet[2]], st.W, st.H);
  if (a.behind || b.behind) return;
  const h = Math.hypot(a.x - b.x, a.y - b.y) * 1.25;
  if (h < 2) return;
  const L = st.looks;
  let img = L.normal;
  if (grade.invert > 0.5) img = K.cyan;
  else if (grade.red > 0.5) img = L.red;
  else if (grade.green > 0.5) img = L.green;
  else if (grade.bg === 4 || (grade.dark ?? 0) > 0.6) img = K.black;
  else if (grade.warm > 0.3) img = L.warm;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, a.x - h / 2, a.y - h * 0.92, h, h);
  ctx.restore();
  return { x: a.x, y: a.y - h * 0.92 };
}

// ---- glitch echoes --------------------------------------------------------------------------------

/** Keeps a short history of finished 3D frames (half size) for the ghosting. */
function remember(st, cv) {
  if (st.still) return;
  const w = Math.max(1, Math.round(st.W / 2));
  const h = Math.max(1, Math.round(st.H / 2));
  if (!st.hist || st.hist[0].width !== w || st.hist[0].height !== h) {
    st.hist = Array.from({ length: 8 }, () => Object.assign(document.createElement("canvas"), { width: w, height: h }));
    st.hi = 0;
    st.hn = 0;
  }
  st.hist[st.hi].getContext("2d").drawImage(cv, 0, 0, w, h);
  st.hi = (st.hi + 1) % st.hist.length;
  st.hn = Math.min(st.hist.length, st.hn + 1);
}

/**
 * The stutter on a glitch sound: copies of the last few frames and of this one
 * stacked over each other, shifted and scaled, changing every frame.
 */
function echoes(ctx, st, cv, t, g) {
  const { W, H } = st;
  const f = Math.floor(t * 30);
  ctx.save();
  const layers = [];
  if (st.hn) for (const back of [2, 5]) if (back < st.hn) layers.push(st.hist[(st.hi - 1 - back + st.hist.length * 2) % st.hist.length]);
  layers.push(cv, cv);
  layers.forEach((img, i) => {
    const k = 1 + (i + 1) * 0.045 * (0.5 + hash(f * 7 + i));
    const dx = (hash(f * 13 + i * 3) - 0.5) * W * 0.07;
    const dy = (hash(f * 17 + i * 5) - 0.5) * H * 0.04;
    ctx.globalAlpha = (0.32 + 0.2 * hash(f + i)) * g;
    ctx.globalCompositeOperation = hash(f * 3 + i) > 0.8 ? "difference" : i % 2 ? "screen" : "source-over";
    ctx.drawImage(img, (W - W * k) / 2 + dx, (H - H * k) / 2 + dy, W * k, H * k);
  });
  // a few torn horizontal strips
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 0.9 * g;
  for (let i = 0; i < 4; i++) {
    const y = hash(f * 19 + i) * H;
    const h = H * (0.015 + hash(f * 23 + i) * 0.05);
    const dx = (hash(f * 29 + i) - 0.5) * W * 0.15;
    ctx.drawImage(cv, 0, (y / H) * cv.height, cv.width, (h / H) * cv.height, dx, y, W, h);
  }
  ctx.restore();
}

// ---- render ---------------------------------------------------------------------------------------

export function render(ctx, st, t) {
  const { W, H, world } = st;
  const tokenMode = st.display === "token";
  const called = st.role === "called";
  const shot = shotAt(t);
  // who is where: the hero slot is the player (infected) or Rochas (called)
  const chars = { ...(shot.chars || {}) };
  let heroTag = null;
  let playerSpot = null;
  if (shot.hero) {
    chars.rochas = { ...shot.hero };
    if (shot.fp && tokenMode && !called) chars.rochas.hidden = true; // no sleeve when the player is a token
    else if (!called) {
      heroTag = st.name;
      if (tokenMode) {
        chars.rochas.hidden = true;
        playerSpot = shot.hero;
      }
    } else heroTag = "Rochas313";
  }
  if (shot.finale) {
    chars.noob = { ...shot.npc };
    if (called && tokenMode) {
      chars.noob.hidden = true;
      playerSpot = shot.npc;
    }
  }
  // in the field of heads, the called player stands among them
  if (called && t >= 80.6 && t < 82.6) {
    chars.noob = { pos: [0, 0, -3], rotY: 0, pose: "stand" };
    if (tokenMode) {
      chars.noob.hidden = true;
      playerSpot = chars.noob;
    }
  }
  const s3 = { ...shot, chars };
  // glitch sounds: the frame tears, and in first person it flashes red
  const g = glitchAt(t);
  s3.grade = { ...(shot.grade || {}) };
  if (g > 0) {
    s3.grade.glitch = Math.max(s3.grade.glitch || 0, 0.9);
    if (shot.flashRed) {
      s3.grade.red = 0.9;
      s3.grade.poster = s3.grade.poster || 4;
    }
  }
  // beat: small push and shake once the music is in
  const bp = beatPulse(t, 0.1);
  const shake = (t >= CHORUS && t < 67.6 ? 1 : t >= B0 ? 0.4 : 0) * bp;
  const grade = s3.grade;

  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  if (world) {
    s3.fov = (s3.fov || 50) * (1 - bp * (t >= B0 ? 0.03 : 0));
    const cv = world.render(W, H, st.dpr3, t, s3);
    ctx.save();
    ctx.translate((hash(Math.floor(t * 60)) - 0.5) * shake * 14 * st.U, (hash(Math.floor(t * 60) + 7) - 0.5) * shake * 14 * st.U);
    ctx.drawImage(cv, -4, -4, W + 8, H + 8);
    ctx.restore();
    if (g > 0) echoes(ctx, st, cv, t, g);
    remember(st, cv);
    // the token stands where the hidden avatar would be
    if (playerSpot) {
      const p = playerSpot.pos;
      const lying = playerSpot.pose === "lie";
      const seated = playerSpot.pose === "sit" || playerSpot.pose === "hug";
      const top = drawToken(ctx, st, world, [p[0], p[1] + (lying ? 0.4 : 0), p[2]], lying ? 2 : seated ? 4 : 5, grade);
      if (top && !lying) nameTag(ctx, st, st.name, top.x, top.y - 4);
    } else if (shot.fp) {
      // first person: nobody to label
    } else if (!tokenMode || called) {
      // a name tag over the avatar the player is playing
      const tagged = !called ? (shot.hero ? chars.rochas : null) : shot.finale ? chars.noob : t >= 80.6 && t < 82.6 ? chars.noob : null;
      const name = called ? (tagged ? st.name : null) : heroTag;
      if (tagged && name && tagged.pose !== "lie") {
        const head = world.project([tagged.pos[0], tagged.pos[1] + (tagged.pose === "hug" ? 5.2 : 6.6), tagged.pos[2]], W, H);
        if (!head.behind && head.x > -50 && head.x < W + 50) nameTag(ctx, st, name, head.x, head.y);
      }
    }
  }
  // HUD
  const layer = t < 26.75 ? "layer 1" : t < CHORUS ? "layer 2" : t < 77.5 ? "layer 3" : "layer ε";
  hudTag(ctx, st, layer, t < 26.75 ? smooth(t, 0.2, 0.8) : 1);
  spectrum(ctx, st, t);
  words(ctx, st, t, shot);
  // grain
  if (st.grain) {
    if (!st._gp || st._gc !== ctx) {
      st._gp = ctx.createPattern(st.grain, "repeat");
      st._gc = ctx;
    }
    ctx.save();
    ctx.globalAlpha = 0.5;
    const gf = Math.floor(t * 24);
    ctx.translate(-Math.floor(hash(gf) * 256), -Math.floor(hash(gf + 3) * 256));
    ctx.fillStyle = st._gp;
    ctx.fillRect(0, 0, W + 256, H + 256);
    ctx.restore();
  }
  // fade in, cut to black at the end
  const black = (1 - smooth(t, 0, 0.6)) + smooth(t, 87.55, 87.7);
  if (black > 0.01) {
    ctx.fillStyle = `rgba(0,0,0,${clamp(black)})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

/** Shot list exposed for the warm-up pass. */
export const WARM = [1, 7, 8.6, 9.6, 11.1, 12, 14, 14.25, 18, 21.7, 24.5, 26.2, 27.1, 28, 37.5, 40, 50, 55, 58, 61, 66, 70, 76, 78, 79.5, 81, 83, 86];
