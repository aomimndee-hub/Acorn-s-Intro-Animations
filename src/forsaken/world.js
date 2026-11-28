// 3D half of "Forsaken": an old-style Roblox world built from blocks.
// R6 characters (Rochas313, the smiling NPC, the player's avatar), the farm
// map (stud baseplate, brown path, round trees, white fence, brick house),
// the giant stepped tree Nosoi, the red seed it grows from, a row of dead
// trees and a field of heads. One grading pass on top gives each shot its look:
// sunset, red duotone, posterize, inverted cyan flash, spreading rot, blur.
//
// The token is never uploaded to WebGL (a cross-origin image would be refused
// as a texture); the 2D layer draws it where project() says.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const TAU = Math.PI * 2;

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Classic baseplate studs: one stud per tile, lit from the top left. */
function studTexture(base, repeat) {
  return canvasTex(64, 64, (x, w, h) => {
    x.fillStyle = base;
    x.fillRect(0, 0, w, h);
    x.fillStyle = "rgba(0,0,0,0.18)";
    x.beginPath();
    x.arc(34, 34, 17, 0, TAU);
    x.fill();
    x.fillStyle = "rgba(255,255,255,0.16)";
    x.beginPath();
    x.arc(30, 30, 16, 0, TAU);
    x.fill();
    x.fillStyle = base;
    x.beginPath();
    x.arc(32, 32, 14, 0, TAU);
    x.fill();
    x.strokeStyle = "rgba(0,0,0,0.12)";
    x.strokeRect(0.5, 0.5, w - 1, h - 1);
  }, repeat);
}

// ---- faces ------------------------------------------------------------------------------------

const BASE = import.meta.env.BASE_URL;
const loader = new THREE.TextureLoader();
const pending = [];
function imageTex(file) {
  const t = loader.load(`${BASE}forsaken/${file}`);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  pending.push(new Promise((r) => {
    const img = new Image();
    img.onload = img.onerror = r;
    img.src = `${BASE}forsaken/${file}`;
  }));
  return t;
}

const FACES = {
  smile(x, w) {
    x.fillStyle = "#111";
    x.beginPath();
    x.ellipse(w * 0.37, w * 0.4, w * 0.045, w * 0.085, 0, 0, TAU);
    x.ellipse(w * 0.63, w * 0.4, w * 0.045, w * 0.085, 0, 0, TAU);
    x.fill();
    x.lineWidth = w * 0.04;
    x.strokeStyle = "#111";
    x.lineCap = "round";
    x.beginPath();
    x.arc(w * 0.5, w * 0.5, w * 0.2, 0.22 * Math.PI, 0.78 * Math.PI);
    x.stroke();
  },
  grin(x, w) {
    // the same smile, stretched too wide, with a dark mouth
    x.fillStyle = "#111";
    x.beginPath();
    x.ellipse(w * 0.34, w * 0.38, w * 0.06, w * 0.1, 0, 0, TAU);
    x.ellipse(w * 0.66, w * 0.38, w * 0.06, w * 0.1, 0, 0, TAU);
    x.fill();
    x.beginPath();
    x.moveTo(w * 0.14, w * 0.55);
    x.quadraticCurveTo(w * 0.5, w * 0.98, w * 0.86, w * 0.55);
    x.quadraticCurveTo(w * 0.5, w * 0.78, w * 0.14, w * 0.55);
    x.fill();
  },
};
const faceTex = {};
for (const k of Object.keys(FACES)) faceTex[k] = canvasTex(256, 256, (x, w) => FACES[k](x, w));
faceTex.rochas = imageTex("face-rochas.png"); // Rochas313's face
faceTex.epic = imageTex("face-epic.png"); // Cappy0's face
faceTex.worried = faceTex.rochas;
faceTex.blank = faceTex.epic;

// ---- characters ---------------------------------------------------------------------------------

const matCache = new Map();
/** Plain colours share one material each, so static meshes merge by colour. */
function lambert(color, extra) {
  if (extra) return new THREE.MeshLambertMaterial({ color, ...extra });
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color }));
  return matCache.get(color);
}

/** Cappy's shirt: white, a placket of buttons and a pocket. */
function shirtTex() {
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = "#f2f2ee";
    x.fillRect(0, 0, w, h);
    x.strokeStyle = "#c9c9c2";
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(w * 0.4, 0);
    x.lineTo(w * 0.5, h * 0.12);
    x.lineTo(w * 0.6, 0);
    x.moveTo(w * 0.5, h * 0.12);
    x.lineTo(w * 0.5, h);
    x.stroke();
    x.fillStyle = "#8a8a84";
    for (let i = 0; i < 6; i++) {
      x.beginPath();
      x.arc(w * 0.47, h * (0.2 + i * 0.14), 4, 0, TAU);
      x.fill();
    }
    x.strokeRect(w * 0.62, h * 0.2, w * 0.2, h * 0.2);
  });
}

/** Rounded block: the newer Roblox look, softer than a plain box. */
const rbox = (w, h, d, r = 0.14) => new RoundedBoxGeometry(w, h, d, 2, r);

/** Classic Roblox head: a cylinder with rounded rims. */
function headGeometry() {
  const pts = [];
  const R = 0.62;
  const H = 0.6;
  const rr = 0.2;
  pts.push(new THREE.Vector2(0, -H));
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(R - rr + Math.cos(a) * rr, -H + rr + Math.sin(a) * rr));
  }
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(R - rr + Math.cos(a) * rr, H - rr + Math.sin(a) * rr));
  }
  pts.push(new THREE.Vector2(0, H));
  return new THREE.LatheGeometry(pts, 32);
}
const HEAD = headGeometry();
// the face wraps around the front of the head
const FACE = new THREE.CylinderGeometry(0.628, 0.628, 0.95, 24, 1, true, -Math.PI * 0.42, Math.PI * 0.84);

/**
 * An R6 character: head, torso, two arms, two legs, each part on a pivot so it
 * can be posed. The group's origin is between the feet; it stands 5 studs tall.
 */
function makeCharacter({ skin, torso, torsoFront, arms, legs, face = "smile", hat = null }) {
  const root = new THREE.Group();
  const body = new THREE.Group(); // tilts and leans as a whole
  root.add(body);
  const skinM = lambert(skin);
  const torsoMats = Array.from({ length: 6 }, (_, i) => (i === 4 && torsoFront ? lambert("#fff", { map: torsoFront }) : lambert(torso)));
  const t = new THREE.Mesh(rbox(2, 2, 1, 0.12), torsoMats);
  t.position.y = 3;
  body.add(t);
  const limbGeo = rbox(0.98, 2, 0.98, 0.16);
  const limb = (color, x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = new THREE.Mesh(limbGeo, lambert(color));
    m.position.y = -1;
    pivot.add(m);
    body.add(pivot);
    return pivot;
  };
  const lArm = limb(arms, -1.5, 4);
  const rArm = limb(arms, 1.5, 4);
  const lLeg = limb(legs, -0.5, 2);
  const rLeg = limb(legs, 0.5, 2);
  const neck = new THREE.Group();
  neck.position.y = 4;
  body.add(neck);
  const head = new THREE.Mesh(HEAD, skinM);
  head.position.y = 0.64;
  neck.add(head);
  const faceMat = new THREE.MeshLambertMaterial({ map: faceTex[face], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const facePlane = new THREE.Mesh(FACE, faceMat);
  facePlane.position.y = 0.64;
  neck.add(facePlane);
  if (hat) neck.add(hat);
  return {
    root, body, lArm, rArm, lLeg, rLeg, neck, faceMat,
    setFace(k) {
      if (faceTex[k] && faceMat.map !== faceTex[k]) faceMat.map = faceTex[k];
    },
  };
}

/** Rochas's cap: green and white panels with ROCHAS across the front, a black brim. */
function rochasCap() {
  const g = new THREE.Group();
  const crownTex = canvasTex(512, 256, (x, w, h) => {
    // u = 0.25 faces the front (+z) on a three.js sphere
    x.fillStyle = "#2c8a3c";
    x.fillRect(0, 0, w, h);
    x.fillStyle = "#f4f4f0";
    x.fillRect(w * 0.08, 0, w * 0.34, h);
    x.fillStyle = "#2c8a3c";
    x.font = "900 italic 70px Arial Black, Arial, sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.save();
    x.translate(w * 0.3, h * 0.62);
    x.scale(0.72, 1.3);
    x.fillText("ROCHAS", 0, 0);
    x.restore();
    x.strokeStyle = "rgba(0,0,0,0.25)";
    x.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      x.beginPath();
      x.moveTo((i / 6) * w, 0);
      x.lineTo((i / 6) * w, h);
      x.stroke();
    }
  });
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 14, 0, TAU, 0, Math.PI / 2), lambert("#fff", { map: crownTex }));
  crown.scale.set(1, 0.85, 1);
  crown.position.y = 1.02;
  g.add(crown);
  const button = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 10), lambert("#1f6b2c"));
  button.position.y = 1.64;
  g.add(button);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.07, 28, 1, false, -Math.PI * 0.5, Math.PI), lambert("#151515"));
  brim.scale.set(1, 1, 1.2);
  brim.position.set(0, 1.04, 0.12);
  brim.rotation.x = 0.1;
  g.add(brim);
  return g;
}

/** Cappy's white cowboy hat, the brim curling up at the sides. */
function cowboyHat(color = "#f4f2ea") {
  const g = new THREE.Group();
  const m = lambert(color);
  const crownPts = [];
  for (let i = 0; i <= 8; i++) {
    const k = i / 8;
    crownPts.push(new THREE.Vector2(0.66 - k * 0.1 - (k > 0.8 ? (k - 0.8) * 1.6 : 0), k * 0.72));
  }
  crownPts.push(new THREE.Vector2(0, 0.72));
  const crown = new THREE.Mesh(new THREE.LatheGeometry(crownPts, 24), m);
  crown.position.y = 1.2;
  crown.scale.z = 0.85;
  g.add(crown);
  const brimPts = [];
  for (let i = 0; i <= 10; i++) {
    const k = i / 10;
    brimPts.push(new THREE.Vector2(0.6 + k * 0.85, Math.pow(k, 3) * 0.32));
  }
  const brim = new THREE.Mesh(new THREE.LatheGeometry(brimPts, 32), lambert(color, { side: THREE.DoubleSide }));
  brim.position.y = 1.2;
  brim.scale.z = 0.8;
  g.add(brim);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.67, 0.67, 0.12, 24), lambert("#d8d4c6"));
  band.position.y = 1.28;
  band.scale.z = 0.85;
  g.add(band);
  return g;
}

const POSES = {
  stand: () => ({}),
  idle: (t) => ({ lArm: Math.sin(t * 1.6) * 0.06, rArm: -Math.sin(t * 1.6) * 0.06, head: Math.sin(t * 0.7) * 0.08 }),
  talk: (t) => ({ rArm: -0.6 - Math.sin(t * 5) * 0.15, rArmZ: 0.2, head: Math.sin(t * 2) * 0.1 }),
  walk: (t) => ({ lArm: Math.sin(t * 7) * 0.7, rArm: -Math.sin(t * 7) * 0.7, lLeg: -Math.sin(t * 7) * 0.7, rLeg: Math.sin(t * 7) * 0.7 }),
  fall: (t) => ({ lArm: -2.6 + Math.sin(t * 9) * 0.4, rArm: -2.4 - Math.sin(t * 8) * 0.4, lLeg: 0.5 + Math.sin(t * 7) * 0.3, rLeg: -0.3 - Math.sin(t * 6) * 0.3, lArmZ: -0.5, rArmZ: 0.5 }),
  sit: (t) => ({ lLeg: -1.45, rLeg: -1.45, lArm: -0.9, rArm: -0.9, lArmZ: 0.25, rArmZ: -0.25, head: -0.35 + Math.sin(t) * 0.05, seat: 1 }),
  hug: (t) => ({ lLeg: -1.45, rLeg: -1.45, lArm: -1.4, rArm: -1.4, lArmZ: 0.5, rArmZ: -0.5, head: -0.7 + Math.sin(t * 6) * 0.03, seat: 1 }),
  lie: (t) => ({ lArm: -0.2, rArm: -2.9, lLeg: 0.15, rLeg: -0.1, head: 0.3, lieDown: 1, breath: Math.sin(t * 2) * 0.03 }),
  reach: (t) => ({ lArm: -1.55, rArm: -1.55, head: -0.2 + Math.sin(t * 3) * 0.05 }),
  limp: (t) => ({ lArm: 0.15, rArm: -0.1, lArmZ: 0.15, rArmZ: -0.15, head: 0.45, lean: 0.25 + Math.sin(t * 1.3) * 0.05 }),
};

function applyPose(ch, name, t, extra = {}) {
  const p = { ...(POSES[name] || POSES.stand)(t), ...extra };
  ch.lArm.rotation.set(p.lArm || 0, 0, p.lArmZ || 0);
  ch.rArm.rotation.set(p.rArm || 0, 0, p.rArmZ || 0);
  ch.lLeg.rotation.set(p.lLeg || 0, 0, 0);
  ch.rLeg.rotation.set(p.rLeg || 0, 0, 0);
  ch.neck.rotation.set(p.head || 0, p.headY || 0, p.headZ || 0);
  ch.body.position.set(0, p.seat ? -1.0 : 0, 0);
  ch.body.rotation.set(p.lean || 0, 0, 0);
  if (p.lieDown) {
    ch.body.rotation.set(-Math.PI / 2 + (p.breath || 0), 0, 0);
    ch.body.position.set(0, 0.5, 0);
  }
}

// ---- the map ------------------------------------------------------------------------------------

const BROWN = "#6b4630";

/** Bark: brown with the horizontal ledges of a stepped build. */
function barkTex(base, line) {
  return canvasTex(64, 64, (x, w, h) => {
    x.fillStyle = base;
    x.fillRect(0, 0, w, h);
    x.fillStyle = line;
    for (let i = 0; i < 4; i++) x.fillRect(0, i * 16 + 12, w, 3);
    x.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 4; i++) x.fillRect(0, i * 16, w, 2);
  });
}

/**
 * Nosoi as in the map: a tall trunk on a stepped, buttressed base, four long
 * stepped roots running out across the grass, and a crown that splits into
 * arms climbing like staircases, two of them turning straight up.
 */
function nosoiTree() {
  const g = new THREE.Group();
  const bark = lambert("#fff", { map: barkTex("#6f4a36", "#56382a") });
  const pale = lambert("#fff", { map: barkTex("#8a5f47", "#6b4836") });
  const box = (w, h, d, x, y, z, m = bark, ry = 0) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    b.rotation.y = ry;
    g.add(b);
    return b;
  };
  // trunk
  box(10, 46, 10, 0, 23 + 12, 0);
  // stepped buttresses around the base
  for (let i = 0; i < 9; i++) {
    const s = 22 - i * 1.4;
    box(s, 2.2, s * 0.55, 0, 1.1 + i * 2.2, 0, i % 2 ? pale : bark, (i * 0.31) % 1.2);
    box(s * 0.55, 2.2, s, 0, 1.1 + i * 2.2, 0, i % 2 ? bark : pale, -(i * 0.27) % 1.1);
  }
  // four roots: staircases stepping down and out, each step a slab
  const roots = [0.15, Math.PI / 2 + 0.25, Math.PI - 0.1, Math.PI * 1.5 + 0.2];
  for (const a of roots) {
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    for (let i = 0; i < 14; i++) {
      const d = 8 + i * 2.6;
      const y = Math.max(0.6, 12 - i * 0.95);
      const w = Math.max(2.4, 7 - i * 0.35);
      box(w, 1.6, 3.2, dx * d, y, dz * d, i % 2 ? pale : bark, -a);
      if (i % 3 === 0) box(w * 0.7, 1.2, 2.4, dx * d - dz * 1.6, y - 1, dz * d + dx * 1.6, bark, -a + 0.4);
    }
  }
  // crown: arms climb out like stairs, then the outer ones turn upward
  const arm = (dirX, dirZ, steps, rise, run, up, w) => {
    let x = 0;
    let z = 0;
    let y = 56;
    for (let i = 0; i < steps; i++) {
      x += dirX * run;
      z += dirZ * run;
      y += rise;
      box(w + 2, 3, w, x, y, z, i % 2 ? pale : bark, Math.atan2(dirX, dirZ) + Math.PI / 2);
    }
    for (let i = 0; i < up; i++) {
      y += 2.8;
      box(w, 3, w, x, y, z, i % 2 ? bark : pale);
    }
  };
  box(14, 6, 12, 0, 57, 0, pale);
  arm(-1, 0.15, 6, 2.4, 2.2, 6, 5.5); // left, turns up
  arm(1, -0.1, 5, 2.6, 2.0, 7, 5.5); // right, turns up
  arm(0.1, -1, 5, 2.4, 1.8, 4, 5); // back
  arm(0.95, 0.35, 12, 1.4, 2.6, 0, 3.6); // the long branch reaching out
  return g;
}

function roundTree(x, z, s, r) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.4 * s, 6 * s, 1.4 * s), lambert("#5a3a26"));
  trunk.position.y = 3 * s;
  g.add(trunk);
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(3.4 * s, 14, 9), lambert(r() < 0.5 ? "#2f7d24" : "#287020"));
  leaves.position.y = 7.6 * s;
  g.add(leaves);
  g.position.set(x, 0, z);
  return g;
}

/** Mottled grass, like an old Roblox grass material. */
function grassTex(repeat) {
  return canvasTex(256, 256, (x, w, h) => {
    const r = rand(17);
    x.fillStyle = "#4f8f3a";
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      x.fillStyle = r() < 0.5 ? "rgba(30,70,20,0.25)" : "rgba(150,200,110,0.18)";
      x.fillRect(r() * w, r() * h, 2 + r() * 5, 2 + r() * 5);
    }
  }, repeat);
}

function plankTex(repeat) {
  return canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = "#7a5638";
    x.fillRect(0, 0, w, h);
    x.fillStyle = "#5c3f28";
    for (let i = 0; i < 8; i++) x.fillRect(i * 16, 0, 2, h);
  }, repeat);
}

// island bounds: Nosoi stands near one corner, as in the map
const ISLAND = { x0: -120, x1: 70, z0: -70, z1: 190 };

function farm() {
  const g = new THREE.Group();
  const { x0, x1, z0, z1 } = ISLAND;
  const W = x1 - x0;
  const D = z1 - z0;
  const top = new THREE.Mesh(new THREE.PlaneGeometry(W, D), lambert("#fff", { map: grassTex([W / 24, D / 24]) }));
  top.rotation.x = -Math.PI / 2;
  top.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
  g.add(top);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 24, D), lambert("#3f7a2e"));
  slab.position.set((x0 + x1) / 2, -12.05, (z0 + z1) / 2);
  g.add(slab);
  g.add(nosoiTree());
  const planks = lambert("#fff", { map: plankTex([1, 30]) });
  const plankX = lambert("#fff", { map: plankTex([1, 20]) });
  const wood = lambert("#6a4a30");
  // the path from the tree to a stone plaza, and on to the house
  const path = (x, z, w, d, m) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), m);
    p.position.set(x, 0.15, z);
    g.add(p);
  };
  path(0, 56, 6, 70, planks); // tree -> plaza
  path(0, 135, 6, 50, planks); // plaza -> house
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(20, 0.4, 20), lambert("#6e6e6e"));
  plaza.position.set(0, 0.2, 100);
  g.add(plaza);
  const side = new THREE.Mesh(new THREE.BoxGeometry(46, 0.3, 6), plankX);
  side.position.set(-33, 0.15, 100);
  g.add(side);
  const side2 = new THREE.Mesh(new THREE.BoxGeometry(46, 0.3, 6), plankX);
  side2.position.set(33, 0.15, 100);
  g.add(side2);
  // brown fences along the paths
  const fence = (x, z, len, alongX) => {
    for (let i = 0; i <= len / 6; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.6, 0.5), wood);
      post.position.set(alongX ? x + i * 6 : x, 1.3, alongX ? z : z + i * 6);
      g.add(post);
    }
    for (const y of [1.0, 2.1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 0.3, 0.35, alongX ? 0.3 : len), wood);
      rail.position.set(alongX ? x + len / 2 : x, y, alongX ? z : z + len / 2);
      g.add(rail);
    }
  };
  fence(-4, 112, 46, false);
  fence(4, 112, 46, false);
  fence(-56, 96, 46, true);
  fence(-56, 104, 46, true);
  fence(10, 96, 46, true);
  // wooden house at the end of the path
  const house = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(24, 10, 16), lambert("#fff", { map: plankTex([3, 1]) }));
  walls.position.y = 5;
  house.add(walls);
  for (const s of [-1, 1]) {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(26, 0.8, 10.5), lambert("#4a2f1e"));
    roof.position.set(0, 13, s * 4.2);
    roof.rotation.x = s * 0.72;
    house.add(roof);
  }
  const gable = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 9.2, 23.6, 3, 1), lambert("#6a4a30"));
  gable.rotation.z = Math.PI / 2;
  gable.rotation.y = Math.PI / 2;
  gable.rotation.x = Math.PI / 2;
  gable.scale.set(0.55, 1, 0.86);
  gable.position.y = 12.6;
  house.add(gable);
  const door = new THREE.Mesh(new THREE.BoxGeometry(3, 6, 0.4), lambert("#3a2416"));
  door.position.set(0, 3, -8.1);
  house.add(door);
  for (const s of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3, 0.4), lambert("#cfe2f0"));
    win.position.set(s * 7, 5.5, -8.1);
    house.add(win);
  }
  house.position.set(0, 0, 170);
  g.add(house);
  // garden plots
  for (const [px, pz] of [[38, 84], [52, 84]]) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(12, 0.6, 9), lambert("#e8e8e0"));
    bed.position.set(px, 0.3, pz);
    g.add(bed);
    for (let i = 0; i < 4; i++) {
      const row = new THREE.Mesh(new THREE.BoxGeometry(11, 0.9, 1.4), lambert("#29502a"));
      row.position.set(px, 0.6, pz - 3.2 + i * 2.1);
      g.add(row);
    }
  }
  // campfire with log seats, and a blue tent beside it
  const fire = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.BoxGeometry(9, 1.2, 1.6), wood);
    log.rotation.y = (i * Math.PI) / 2;
    log.position.set(Math.sin((i * Math.PI) / 2) * 6, 0.6, Math.cos((i * Math.PI) / 2) * 6);
    fire.add(log);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(1, 2.4, 8), new THREE.MeshBasicMaterial({ color: "#ffb347" }));
  flame.position.y = 1.2;
  fire.add(flame);
  fire.position.set(-40, 0, 52);
  g.add(fire);
  const tent = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 14, 3, 1), lambert("#14306e"));
  tent.rotation.z = Math.PI / 2;
  tent.rotation.y = 0.5;
  tent.scale.set(1, 1, 1.2);
  tent.position.set(-26, 3, 64);
  g.add(tent);
  // a stone channel with water and a bridge, off the island's edge
  const stone = lambert("#4a4a4c");
  for (const s of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(70, 10, 6), stone);
    wall.position.set(x0 - 35, -3, 150 + s * 10);
    g.add(wall);
  }
  const floor = new THREE.Mesh(new THREE.BoxGeometry(70, 4, 26), stone);
  floor.position.set(x0 - 35, -8, 150);
  g.add(floor);
  const water = new THREE.Mesh(new THREE.BoxGeometry(70, 0.4, 14), lambert("#3d7fd0"));
  water.position.set(x0 - 35, -4.5, 150);
  g.add(water);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(80, 0.6, 5), plankX);
  bridge.position.set(x0 - 30, 1.2, 150);
  g.add(bridge);
  // round trees across the island, kept off the paths and away from the tree
  const r = rand(7);
  for (let i = 0; i < 260 && g.children.length < 400; i++) {
    const x = lerpN(x0 + 6, x1 - 6, r());
    const z = lerpN(z0 + 6, z1 - 6, r());
    if (Math.hypot(x, z) < 44) continue;
    if (Math.abs(x) < 10 && z > 15) continue;
    if (Math.abs(z - 100) < 10) continue;
    if (Math.abs(x) < 16 && z > 150) continue;
    if (Math.hypot(x + 40, z - 52) < 13 || Math.hypot(x + 26, z - 64) < 12 || (x > 28 && x < 62 && Math.abs(z - 84) < 9)) continue;
    if (r() < 0.55) continue;
    g.add(roundTree(x, z, 0.85 + r() * 0.4, r));
  }
  return g;
}
const lerpN = (a, b, k) => a + (b - a) * k;

/** The seed of Nosoi: a voxel ball of dark red cubes held in a cage of branches. */
function core() {
  const g = new THREE.Group();
  const r = rand(3);
  const cubes = [];
  const R = 5;
  for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) for (let z = -R; z <= R; z++) {
    const d = Math.hypot(x, y * 1.15, z);
    if (d <= R && d > R - 1.6) cubes.push([x, y, z]);
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.96, 0.96, 0.96), lambert("#fff"), cubes.length);
  const m = new THREE.Matrix4();
  const reds = ["#7a1016", "#5e0b10", "#8c1a1f", "#4a080c"].map((c) => new THREE.Color(c));
  cubes.forEach(([x, y, z], i) => {
    m.makeTranslation(x, y, z);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, reds[Math.floor(r() * reds.length)]);
  });
  g.add(mesh);
  const bark = lambert("#5a3522");
  for (let i = 0; i < 46; i++) {
    const len = 6 + r() * 14;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.9 + r() * 0.8, len, 0.9 + r() * 0.8), bark);
    const a = r() * TAU;
    const e = (r() - 0.5) * 2.4;
    const d = 6 + r() * 5;
    b.position.set(Math.cos(a) * Math.cos(e) * d, Math.sin(e) * d, Math.sin(a) * Math.cos(e) * d);
    b.rotation.set(r() * TAU, r() * TAU, r() * TAU);
    g.add(b);
  }
  // a few loose shingles, like the pale strips in the storyboard
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 0.7), lambert("#c9b8a8"));
    const a = r() * TAU;
    s.position.set(Math.cos(a) * 7.5, (r() - 0.5) * 9, Math.sin(a) * 7.5);
    s.rotation.set(r(), r() * TAU, r());
    g.add(s);
  }
  g.userData.ball = mesh;
  return g;
}

/** Dead trees on a dune, for the sepia shot. */
function deadForest() {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), lambert("#b4793e"));
  ground.rotation.x = -Math.PI / 2;
  g.add(ground);
  const r = rand(41);
  const bark = lambert("#1a0e08");
  const branch = (parent, len, w, depth) => {
    const seg = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, w), bark);
    m.position.y = len / 2;
    seg.add(m);
    parent.add(seg);
    if (depth > 0) {
      for (let k = 0; k < 2; k++) {
        const child = new THREE.Group();
        child.position.y = len * (0.7 + r() * 0.3);
        child.rotation.z = (k ? 1 : -1) * (0.5 + r() * 0.5);
        child.rotation.y = r() * TAU;
        seg.add(child);
        branch(child, len * 0.65, w * 0.6, depth - 1);
      }
    }
    return seg;
  };
  for (let i = 0; i < 14; i++) {
    const tree = new THREE.Group();
    tree.position.set(-70 + i * 11 + (r() - 0.5) * 6, 0, -10 - r() * 40);
    tree.rotation.z = (r() - 0.5) * 0.25;
    branch(tree, 7 + r() * 6, 1.5, 3);
    g.add(tree);
  }
  // soft dunes
  for (let i = 0; i < 8; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(30, 20, 10), lambert("#c08a4c"));
    d.scale.set(1.6, 0.18, 1);
    d.position.set(-120 + i * 34, -2, -70 - r() * 20);
    g.add(d);
  }
  return g;
}

/** A crowd of heads planted in the ground, with red planks scattered between them. */
function headField() {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), lambert("#2b3a23"));
  ground.rotation.x = -Math.PI / 2;
  g.add(ground);
  const r = rand(77);
  const N = 140;
  const heads = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.62, 0.62, 1.2, 20), lambert("#fff"), N);
  const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 0.25, 1.3), lambert("#fff"), N);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const skins = ["#f5cd30", "#e8b87c", "#c98d5a", "#f5cd30"].map((c) => new THREE.Color(c));
  const hats = ["#2b7d35", "#c62828", "#1d1d1d", "#efeadc", "#2a4fa0"].map((c) => new THREE.Color(c));
  for (let i = 0; i < N; i++) {
    const x = (i % 14) * 3.4 - 22 + (r() - 0.5) * 1.6;
    const z = -Math.floor(i / 14) * 3.6 + (r() - 0.5) * 1.6;
    q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.4, r() * TAU, (r() - 0.5) * 0.4));
    m.compose(new THREE.Vector3(x, 0.7, z), q, new THREE.Vector3(1.6, 1.6, 1.6));
    heads.setMatrixAt(i, m);
    heads.setColorAt(i, skins[Math.floor(r() * skins.length)]);
    m.compose(new THREE.Vector3(x, 1.75, z), q, new THREE.Vector3(1.6, 1.6, 1.6));
    caps.setMatrixAt(i, m);
    caps.setColorAt(i, hats[Math.floor(r() * hats.length)]);
  }
  g.add(heads, caps);
  const red = lambert("#c0262a");
  for (let i = 0; i < 40; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(5 + r() * 6, 0.3, 1.2), red);
    p.position.set((r() - 0.5) * 70, 0.15 + r() * 0.3, -r() * 40 + 4);
    p.rotation.y = r() * TAU;
    g.add(p);
  }
  return g;
}

/**
 * Bakes every plain mesh of a static group into one mesh per material, so the
 * farm draws in a handful of calls instead of hundreds.
 */
function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  const keep = [];
  group.traverse((o) => {
    if (!o.isMesh) return;
    if (o.isInstancedMesh || Array.isArray(o.material)) return keep.push(o);
    const key = o.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, geos: [] });
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
    g.applyMatrix4(o.matrixWorld);
    buckets.get(key).geos.push(g);
  });
  const out = new THREE.Group();
  for (const { mat, geos } of buckets.values()) {
    const merged = mergeGeometries(geos, false);
    if (merged) out.add(new THREE.Mesh(merged, mat));
  }
  for (const o of keep) {
    o.updateMatrixWorld(true);
    o.matrix.copy(o.matrixWorld);
    o.matrixAutoUpdate = false;
    out.add(o);
  }
  return out;
}

// ---- grading -----------------------------------------------------------------------------------

const POST_FRAG = /* glsl */ `
  uniform sampler2D tScene;
  uniform vec2 uRes;
  uniform float uTime;
  uniform int uBg;        // 0 sky, 1 red rays, 2 white, 3 black, 4 storm, 5 sepia, 6 magenta dusk, 7 sunset
  uniform vec3 uSkyTop;
  uniform vec3 uSkyBot;
  uniform vec2 uRayC;     // rays centre (0..1)
  uniform float uRed;     // red duotone amount
  uniform float uInvert;  // inverted cyan flash
  uniform float uPoster;  // posterize levels (0 = off)
  uniform float uRot;     // rot spreading over the frame: 0..1
  uniform float uIrid;    // iridescent "sprouts" noise in the bright areas
  uniform float uBlur;    // in pixels
  uniform float uGlitch;  // slice tearing
  uniform float uZig;     // zigzag stripes through the dark areas
  uniform float uVig;
  uniform float uWarm;    // sunset tint
  uniform float uDark;    // crush
  uniform float uFlash;   // add white
  uniform float uGreen;   // green-black night vision
  varying vec2 vUv;

  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

  vec3 background(vec2 uv) {
  #if BG == 1
    {
      vec2 d = (uv - uRayC) * vec2(uRes.x / uRes.y, 1.0);
      float a = atan(d.y, d.x) + uTime * 0.15;
      float s = step(0.5, fract(a / 6.2831 * 14.0));
      return mix(vec3(0.62, 0.05, 0.03), vec3(0.95, 0.35, 0.12), s) * (1.0 - length(d) * 0.35);
    }
  #elif BG == 2
    return vec3(0.97);
  #elif BG == 3
    return vec3(0.0);
  #elif BG == 4
    {
      float n = fbm(uv * vec2(3.0, 5.0) + vec2(uTime * 0.25, 0.0));
      vec3 c = mix(vec3(0.16, 0.12, 0.3), vec3(0.78, 0.62, 0.32), smoothstep(0.35, 0.8, n));
      return mix(c, vec3(0.35, 0.3, 0.55), uv.y * 0.4);
    }
  #elif BG == 5
    {
      float n = fbm(uv * vec2(4.0, 2.0) + vec2(uTime * 0.05, 0.0));
      return mix(vec3(0.58, 0.4, 0.24), vec3(0.78, 0.6, 0.4), n);
    }
  #elif BG == 6
    return mix(vec3(0.2, 0.05, 0.12), vec3(0.85, 0.35, 0.6), uv.y);
  #else
    vec3 c = mix(uSkyBot, uSkyTop, smoothstep(0.0, 1.0, uv.y));
    float n = fbm(uv * vec2(2.5, 6.0) + vec2(uTime * 0.015, 0.0));
    return mix(c, mix(c, vec3(1.0), 0.75), smoothstep(0.45, 0.75, n));
  #endif
  }

  vec4 sampleScene(vec2 uv) {
  #ifndef BLUR
    return texture2D(tScene, uv);
  #else
    vec2 px = uBlur / uRes;
    vec4 s = vec4(0.0);
    for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) s += texture2D(tScene, uv + vec2(float(i), float(j)) * px * 1.6);
    return s / 9.0;
  #endif
  }

  void main() {
    vec2 uv = vUv;
  #ifdef GLITCH
    {
      float row = floor(uv.y * 26.0);
      float k = step(0.72, h21(vec2(row, floor(uTime * 14.0))));
      uv.x += (h21(vec2(row, floor(uTime * 23.0))) - 0.5) * 0.12 * uGlitch * k;
    }
  #endif
    vec4 sc = sampleScene(uv);
    // the target stores sRGB, which the sampler hands back as linear: re-encode
    sc.rgb = pow(max(sc.rgb, 0.0), vec3(1.0 / 2.2));
    vec3 c = sc.a > 0.99 ? sc.rgb : mix(background(uv), sc.rgb, sc.a);
    // warm sunset grade
    c = mix(c, c * vec3(1.18, 0.92, 0.62) + vec3(0.06, 0.02, 0.0), uWarm);
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    // iridescent noise where the frame is bright
  #ifdef IRID
    {
      float n = fbm(uv * 9.0 + uTime * 0.6);
      vec3 ir = 0.6 + 0.4 * cos(6.2831 * (n * 2.0 + vec3(0.0, 0.33, 0.67)));
      float blot = smoothstep(0.42, 0.6, fbm(uv * 14.0 - uTime * 0.3));
      ir = mix(ir, vec3(0.05), blot * 0.85);
      c = mix(c, ir, uIrid * smoothstep(0.65, 0.85, l));
    }
  #endif
  #ifdef POSTER
    c = floor(c * uPoster + 0.5) / uPoster;
  #endif
    l = dot(c, vec3(0.299, 0.587, 0.114));
    // red duotone: black -> blood red -> pink
    vec3 red = l < 0.5 ? mix(vec3(0.0), vec3(0.78, 0.02, 0.04), l * 2.0) : mix(vec3(0.78, 0.02, 0.04), vec3(1.0, 0.55, 0.55), (l - 0.5) * 2.0);
  #ifdef POSTER
    red = floor(red * uPoster + 0.5) / uPoster;
  #endif
    c = mix(c, red, uRed);
    // zigzag stripes through the darker half
  #ifdef ZIG
    {
      float z = sin((uv.y * 60.0 + abs(fract(uv.x * 9.0 + uTime * 0.6) - 0.5) * 14.0) * 3.1416);
      c = mix(c, c * step(0.0, z) + vec3(0.05, 0.0, 0.0), uZig * step(l, 0.45));
    }
  #endif
  #ifdef ROT
    {
      float n = fbm(uv * vec2(uRes.x / uRes.y, 1.0) * 18.0 + vec2(0.0, uTime * 0.2));
      float d = length((uv - 0.5) * vec2(uRes.x / uRes.y, 1.0));
      float m = step(n + (1.0 - uRot) * 1.2 + d * 0.25, 1.05);
      c = mix(c, mix(vec3(0.02, 0.0, 0.0), vec3(0.75, 0.04, 0.06), step(0.55, fract(n * 7.0))), m);
    }
  #endif
  #ifdef GREEN
    {
      vec3 g = mix(vec3(0.0, 0.02, 0.0), vec3(0.1, 0.55, 0.12), smoothstep(0.05, 0.7, l));
      c = mix(c, g, uGreen);
    }
  #endif
  #ifdef INVERT
    {
      vec3 inv = 1.0 - c;
      inv = mix(inv, vec3(0.55, 1.0, 1.0) * step(0.35, dot(inv, vec3(0.33))) + vec3(0.6, 0.0, 0.05) * step(dot(inv, vec3(0.33)), 0.35), 0.6);
      c = mix(c, inv, uInvert);
    }
  #endif
    c = c * (1.0 - uDark) ;
    float v = length((vUv - 0.5) * vec2(1.0, 0.8));
    c *= 1.0 - uVig * smoothstep(0.25, 0.75, v);
    c += uFlash;
    gl_FragColor = vec4(c, 1.0);
  }
`;

// ---- world -------------------------------------------------------------------------------------

export function createWorld() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1200);
  const hemi = new THREE.HemisphereLight("#ffe9d0", "#3a2a1a", 1.4);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight("#ffd9a0", 2.2);
  sun.position.set(-60, 80, 120);
  scene.add(sun);
  const back = new THREE.DirectionalLight("#ff6a4a", 0.0);
  back.position.set(40, 20, -100);
  scene.add(back);
  scene.fog = new THREE.Fog("#c98b5a", 120, 520);

  const groups = { farm: mergeStatic(farm()), core: core(), forest: mergeStatic(deadForest()), heads: mergeStatic(headField()) };
  for (const g of Object.values(groups)) scene.add(g);

  const rochas = makeCharacter({
    skin: "#f5cd30", torso: "#2f8a3a", torsoFront: imageTex("jacket.png"), arms: "#2f8a3a", legs: "#1a1a1a", face: "rochas", hat: rochasCap(),
  });
  const cappy = makeCharacter({ skin: "#f5cd30", torso: "#f2f2ee", torsoFront: shirtTex(), arms: "#f2f2ee", legs: "#1e1e1e", face: "epic", hat: cowboyHat() });
  const noob = makeCharacter({ skin: "#f5cd30", torso: "#2a62c8", arms: "#f5cd30", legs: "#3c9a3c", face: "smile" });
  const chars = { rochas, cappy, noob };
  for (const c of Object.values(chars)) scene.add(c.root);
  // Cappy's hat lying in the dirt for the close-up
  const lostHat = cowboyHat("#efece2");
  lostHat.rotation.set(0.35, 0.6, 0.15);
  scene.add(lostHat);

  // offscreen target for the grading pass
  const rt = new THREE.WebGLRenderTarget(16, 16);
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const post = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: rt.texture }, uRes: { value: new THREE.Vector2(16, 16) }, uTime: { value: 0 },
      uBg: { value: 0 }, uSkyTop: { value: new THREE.Color() }, uSkyBot: { value: new THREE.Color() }, uRayC: { value: new THREE.Vector2(0.5, 0.5) },
      uRed: { value: 0 }, uInvert: { value: 0 }, uPoster: { value: 0 }, uRot: { value: 0 }, uIrid: { value: 0 }, uBlur: { value: 0 },
      uGlitch: { value: 0 }, uZig: { value: 0 }, uVig: { value: 0.5 }, uWarm: { value: 0 }, uDark: { value: 0 }, uFlash: { value: 0 }, uGreen: { value: 0 },
    },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: POST_FRAG,
    defines: { BG: 0 },
    depthTest: false,
    depthWrite: false,
  });
  const postScene = new THREE.Scene();
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let size = "";
  function setSize(W, H, dpr) {
    const key = `${W}x${H}@${dpr}`;
    if (key === size) return;
    size = key;
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    rt.setSize(Math.round(W * dpr), Math.round(H * dpr));
    post.uniforms.uRes.value.set(W * dpr, H * dpr);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }

  const v = new THREE.Vector3();
  const DEF_GRADE = { bg: 0, skyTop: "#3d6fc4", skyBot: "#a9c7ea", rayC: [0.5, 0.5], red: 0, invert: 0, poster: 0, rot: 0, irid: 0, blur: 0, glitch: 0, zig: 0, vig: 0.5, warm: 0, dark: 0, flash: 0, green: 0 };

  return {
    canvas: renderer.domElement,
    chars,
    ready: Promise.all(pending),
    /**
     * Draws one frame. `s` is the shot: camera, which groups show, character
     * placements and poses, lights, fog, and the grade.
     */
    render(W, H, dpr, t, s) {
      setSize(W, H, dpr);
      for (const [k, g] of Object.entries(groups)) g.visible = !!s.show?.[k];
      if (groups.core.visible) {
        groups.core.rotation.y = t * 0.25;
        groups.core.userData.ball.scale.setScalar(1 + (s.coreBeat || 0) * 0.08);
      }
      for (const [k, c] of Object.entries(chars)) {
        const p = s.chars?.[k];
        c.root.visible = !!p && !p.hidden;
        if (!p) continue;
        c.root.position.set(...p.pos);
        c.root.rotation.set(p.rotX || 0, p.rotY || 0, p.rotZ || 0);
        applyPose(c, p.pose || "idle", t, p.extra);
        c.setFace(p.face || (k === "rochas" ? "worried" : k === "cappy" ? "blank" : "smile"));
      }
      lostHat.visible = !!s.hat;
      if (s.hat) lostHat.position.set(...s.hat);
      const L = s.light || {};
      hemi.color.set(L.sky || "#ffffff");
      hemi.groundColor.set(L.ground || "#5a5048");
      hemi.intensity = L.hemi ?? 1.4;
      sun.color.set(L.sun || "#fff6e8");
      sun.intensity = L.sunI ?? 2.0;
      back.intensity = L.backI ?? 0;
      scene.fog.color.set(s.fog?.[0] || "#c98b5a");
      scene.fog.near = s.fog?.[1] ?? 120;
      scene.fog.far = s.fog?.[2] ?? 520;
      camera.fov = s.fov || 50;
      camera.position.set(...s.cam);
      camera.up.set(Math.sin(s.roll || 0), Math.cos(s.roll || 0), 0);
      camera.lookAt(...s.look);
      camera.updateProjectionMatrix();

      const G = { ...DEF_GRADE, ...s.grade };
      const u = post.uniforms;
      u.uTime.value = t;
      u.uBg.value = G.bg;
      u.uSkyTop.value.set(G.skyTop).convertLinearToSRGB();
      u.uSkyBot.value.set(G.skyBot).convertLinearToSRGB();
      u.uRayC.value.set(G.rayC[0], G.rayC[1]);
      for (const k of ["red", "invert", "poster", "rot", "irid", "glitch", "zig", "vig", "warm", "dark", "flash", "green"]) u[`u${k[0].toUpperCase()}${k.slice(1)}`].value = G[k];
      u.uBlur.value = G.blur * dpr;
      // compile only the effects this shot uses (one cached program per combination)
      const defs = { BG: G.bg };
      for (const [k, name] of [["blur", "BLUR"], ["glitch", "GLITCH"], ["irid", "IRID"], ["zig", "ZIG"], ["rot", "ROT"], ["green", "GREEN"], ["invert", "INVERT"], ["poster", "POSTER"]]) {
        if (G[k] > 0.001) defs[name] = 1;
      }
      const dk = JSON.stringify(defs);
      if (dk !== post.userData.dk) {
        post.userData.dk = dk;
        post.defines = defs;
        post.needsUpdate = true;
      }

      renderer.setRenderTarget(rt);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCam);
      return renderer.domElement;
    },
    /** Screen position (CSS px) of a world point, after the last render. */
    project(p, W, H) {
      v.set(p[0], p[1], p[2]).project(camera);
      return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, behind: v.z > 1 };
    },
  };
}
