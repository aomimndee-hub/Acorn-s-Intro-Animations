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

const FACES = {
  smile(x, w) {
    x.fillStyle = "#111";
    x.beginPath();
    x.ellipse(w * 0.36, w * 0.4, w * 0.05, w * 0.09, 0, 0, TAU);
    x.ellipse(w * 0.64, w * 0.4, w * 0.05, w * 0.09, 0, 0, TAU);
    x.fill();
    x.lineWidth = w * 0.045;
    x.strokeStyle = "#111";
    x.lineCap = "round";
    x.beginPath();
    x.arc(w * 0.5, w * 0.5, w * 0.22, 0.25 * Math.PI, 0.75 * Math.PI);
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
  worried(x, w) {
    x.fillStyle = "#111";
    x.fillRect(w * 0.31, w * 0.36, w * 0.08, w * 0.14);
    x.fillRect(w * 0.61, w * 0.36, w * 0.08, w * 0.14);
    x.lineWidth = w * 0.045;
    x.strokeStyle = "#111";
    x.lineCap = "round";
    x.beginPath();
    x.moveTo(w * 0.26, w * 0.28);
    x.lineTo(w * 0.42, w * 0.24);
    x.moveTo(w * 0.74, w * 0.28);
    x.lineTo(w * 0.58, w * 0.24);
    x.stroke();
    x.beginPath();
    x.arc(w * 0.5, w * 0.78, w * 0.13, 1.15 * Math.PI, 1.85 * Math.PI);
    x.stroke();
  },
  blank(x, w) {
    x.fillStyle = "#111";
    x.fillRect(w * 0.33, w * 0.38, w * 0.07, w * 0.1);
    x.fillRect(w * 0.6, w * 0.38, w * 0.07, w * 0.1);
    x.fillRect(w * 0.42, w * 0.64, w * 0.16, w * 0.03);
  },
};
const faceTex = {};
for (const k of Object.keys(FACES)) faceTex[k] = canvasTex(256, 256, (x, w) => FACES[k](x, w));

// ---- characters ---------------------------------------------------------------------------------

function lambert(color, extra = {}) {
  return new THREE.MeshLambertMaterial({ color, ...extra });
}

/** Front-of-torso texture for Rochas: green jacket, black lapels, white shirt, a zip. */
function jacketTex() {
  return canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = "#2f8a3a";
    x.fillRect(0, 0, w, h);
    x.fillStyle = "#e9e9e4";
    x.fillRect(w * 0.36, 0, w * 0.28, h);
    x.fillStyle = "#141414";
    x.beginPath();
    x.moveTo(w * 0.36, 0);
    x.lineTo(w * 0.24, 0);
    x.lineTo(w * 0.3, h * 0.55);
    x.lineTo(w * 0.36, h);
    x.fill();
    x.beginPath();
    x.moveTo(w * 0.64, 0);
    x.lineTo(w * 0.76, 0);
    x.lineTo(w * 0.7, h * 0.55);
    x.lineTo(w * 0.64, h);
    x.fill();
    x.fillStyle = "#1d5f27";
    x.fillRect(w * 0.06, h * 0.62, w * 0.16, h * 0.1);
    x.fillRect(w * 0.78, h * 0.62, w * 0.16, h * 0.1);
    x.fillStyle = "#ddd";
    x.fillRect(w * 0.12, h * 0.7, w * 0.04, w * 0.04);
    x.fillRect(w * 0.84, h * 0.7, w * 0.04, w * 0.04);
  });
}

/** Cap front: white panel with a green ROC badge. */
function capTex() {
  return canvasTex(256, 128, (x, w, h) => {
    x.fillStyle = "#f2f2ec";
    x.fillRect(0, 0, w, h);
    x.fillStyle = "#2f8a3a";
    x.font = "900 70px Arial, sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText("ROC", w / 2, h * 0.56);
    x.strokeStyle = "#7fdc7f";
    x.lineWidth = 3;
    x.strokeText("ROC", w / 2, h * 0.56);
  });
}

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
  const t = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), torsoMats);
  t.position.y = 3;
  body.add(t);
  const limb = (color, x, y, w = 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 2, 1), lambert(color));
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
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.2, 28), skinM);
  head.position.y = 0.62;
  head.scale.set(1.0, 1, 0.98);
  neck.add(head);
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTex[face], transparent: true, depthWrite: false });
  const facePlane = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), faceMat);
  facePlane.position.set(0, 0.62, 0.625);
  neck.add(facePlane);
  if (hat) neck.add(hat);
  return {
    root, body, lArm, rArm, lLeg, rLeg, neck, faceMat,
    setFace(k) {
      if (faceTex[k] && faceMat.map !== faceTex[k]) faceMat.map = faceTex[k];
    },
  };
}

function rochasCap() {
  const g = new THREE.Group();
  const green = lambert("#2b7d35");
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 12, 0, TAU, 0, Math.PI / 2), green);
  crown.scale.set(1, 0.75, 1);
  crown.position.y = 1.05;
  g.add(crown);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.5), lambert("#fff", { map: capTex(), side: THREE.DoubleSide }));
  front.position.set(0, 1.32, 0.56);
  front.rotation.x = -0.45;
  g.add(front);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.8), green);
  brim.position.set(0, 1.08, 0.85);
  brim.rotation.x = 0.12;
  g.add(brim);
  return g;
}

function cowboyHat(color = "#efeadc") {
  const g = new THREE.Group();
  const m = lambert(color);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.66, 0.7, 20), m);
  crown.position.y = 1.55;
  g.add(crown);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.08, 28), m);
  brim.position.y = 1.22;
  brim.scale.z = 0.85;
  g.add(brim);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.67, 0.67, 0.14, 20), lambert("#3a2a1a"));
  band.position.y = 1.29;
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

/** Nosoi: a stepped trunk on a stepped mound, arms climbing out like stairs. */
function nosoiTree() {
  const g = new THREE.Group();
  const bark = lambert(BROWN);
  const dark = lambert("#563725");
  const box = (w, h, d, x, y, z, m = bark) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z);
    g.add(b);
    return b;
  };
  for (let i = 0; i < 7; i++) box(34 - i * 4, 1.4, 34 - i * 4, 0, 0.7 + i * 1.4, 0, i % 2 ? bark : dark);
  box(9, 52, 9, 0, 34, 0);
  box(12, 6, 12, 0, 12, 0, dark);
  // four arms: out and up like a staircase, then straight up at the tips
  const arms = [[1, 0, 44, 1], [-1, 0, 40, 0.8], [0, 1, 47, 0.7], [0, -1, 42, 0.75]];
  for (const [dx, dz, y0, k] of arms) {
    let x = dx * 4;
    let z = dz * 4;
    let y = y0;
    const n = Math.round(9 * k);
    for (let i = 0; i < n; i++) {
      x += dx * 2.3;
      z += dz * 2.3;
      y += 2.1;
      box(3.4, 3.4, 3.4, x, y, z, i % 2 ? bark : dark);
    }
    for (let i = 0; i < 4; i++) {
      y += 2.6;
      box(2.6, 3, 2.6, x, y, z, bark);
    }
  }
  // roots stepping out over the mound
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * TAU + 0.3;
    for (let i = 0; i < 5; i++) box(3, 2, 3, Math.cos(ang) * (8 + i * 2.5), 11 - i * 2, Math.sin(ang) * (8 + i * 2.5), dark);
  }
  return g;
}

function roundTree(x, z, s, r) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.4 * s, 6 * s, 1.4 * s), lambert(BROWN));
  trunk.position.y = 3 * s;
  g.add(trunk);
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(3.6 * s, 18, 12), lambert(r() < 0.5 ? "#3f9a2e" : "#358a28"));
  leaves.position.y = 7.6 * s;
  g.add(leaves);
  g.position.set(x, 0, z);
  return g;
}

function farm() {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), lambert("#fff", { map: studTexture("#4b974b", [450, 450]) }));
  ground.rotation.x = -Math.PI / 2;
  g.add(ground);
  const path = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 150), lambert("#fff", { map: studTexture("#5a3f2c", [4, 75]) }));
  path.position.set(0, 0.2, 80);
  g.add(path);
  g.add(nosoiTree());
  const r = rand(7);
  for (let i = 0; i < 70; i++) {
    const side = i % 2 ? 1 : -1;
    const z = -60 + r() * 220;
    const x = side * (12 + r() * 70);
    if (Math.hypot(x, z) < 26) continue;
    g.add(roundTree(x, z, 0.8 + r() * 0.6, r));
  }
  for (let i = 0; i < 40; i++) {
    const a = r() * TAU;
    const d = 90 + r() * 120;
    g.add(roundTree(Math.cos(a) * d, Math.sin(a) * d, 1 + r() * 0.8, r));
  }
  // white fence along the path near the house
  const white = lambert("#f4f4f0");
  for (const side of [-1, 1]) {
    for (let i = 0; i < 12; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3, 0.6), white);
      post.position.set(side * 6, 1.5, 60 + i * 6);
      g.add(post);
    }
    for (const y of [1.2, 2.4]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 66), white);
      rail.position.set(side * 6, y, 93);
      g.add(rail);
    }
  }
  // the brick house at the end of the path
  const house = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(22, 11, 16), lambert("#fff", { map: brickTex() }));
  walls.position.y = 5.5;
  house.add(walls);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.5, 23, 3, 1), lambert("#5b3a2a"));
  roof.rotation.z = Math.PI / 2;
  roof.rotation.x = Math.PI / 2;
  roof.rotation.y = Math.PI / 2;
  roof.position.y = 14.5;
  roof.scale.set(1, 1, 0.6);
  house.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(3, 6, 0.4), lambert("#3a2416"));
  door.position.set(0, 3, -8.1);
  house.add(door);
  house.position.set(0, 0, 166);
  g.add(house);
  return g;
}

function brickTex() {
  return canvasTex(256, 128, (x, w, h) => {
    x.fillStyle = "#8a3b2a";
    x.fillRect(0, 0, w, h);
    x.strokeStyle = "rgba(230,210,190,0.55)";
    x.lineWidth = 2;
    for (let row = 0; row < 8; row++) {
      const y = row * 16;
      x.beginPath();
      x.moveTo(0, y);
      x.lineTo(w, y);
      x.stroke();
      for (let col = 0; col < 8; col++) {
        const bx = col * 32 + (row % 2) * 16;
        x.beginPath();
        x.moveTo(bx, y);
        x.lineTo(bx, y + 16);
        x.stroke();
      }
    }
  }, [3, 3]);
}

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
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

  vec3 background(vec2 uv) {
    if (uBg == 1) {
      vec2 d = (uv - uRayC) * vec2(uRes.x / uRes.y, 1.0);
      float a = atan(d.y, d.x) + uTime * 0.15;
      float s = step(0.5, fract(a / 6.2831 * 14.0));
      return mix(vec3(0.62, 0.05, 0.03), vec3(0.95, 0.35, 0.12), s) * (1.0 - length(d) * 0.35);
    }
    if (uBg == 2) return vec3(0.97);
    if (uBg == 3) return vec3(0.0);
    if (uBg == 4) {
      float n = fbm(uv * vec2(3.0, 5.0) + vec2(uTime * 0.25, 0.0));
      vec3 c = mix(vec3(0.16, 0.12, 0.3), vec3(0.78, 0.62, 0.32), smoothstep(0.35, 0.8, n));
      return mix(c, vec3(0.35, 0.3, 0.55), uv.y * 0.4);
    }
    if (uBg == 5) {
      float n = fbm(uv * vec2(4.0, 2.0) + vec2(uTime * 0.05, 0.0));
      return mix(vec3(0.58, 0.4, 0.24), vec3(0.78, 0.6, 0.4), n);
    }
    if (uBg == 6) return mix(vec3(0.2, 0.05, 0.12), vec3(0.85, 0.35, 0.6), uv.y);
    vec3 c = mix(uSkyBot, uSkyTop, smoothstep(0.0, 1.0, uv.y));
    float n = fbm(uv * vec2(3.0, 8.0) + vec2(uTime * 0.02, 0.0));
    return mix(c, c * 1.15 + 0.05, smoothstep(0.55, 0.8, n) * 0.6);
  }

  vec4 sampleScene(vec2 uv) {
    if (uBlur < 0.5) return texture2D(tScene, uv);
    vec2 px = uBlur / uRes;
    vec4 s = vec4(0.0);
    for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) s += texture2D(tScene, uv + vec2(float(i), float(j)) * px);
    return s / 25.0;
  }

  void main() {
    vec2 uv = vUv;
    if (uGlitch > 0.0) {
      float row = floor(uv.y * 26.0);
      float k = step(0.72, h21(vec2(row, floor(uTime * 14.0))));
      uv.x += (h21(vec2(row, floor(uTime * 23.0))) - 0.5) * 0.12 * uGlitch * k;
    }
    vec4 sc = sampleScene(uv);
    vec3 c = mix(background(uv), sc.rgb, sc.a);
    // warm sunset grade
    c = mix(c, c * vec3(1.18, 0.92, 0.62) + vec3(0.06, 0.02, 0.0), uWarm);
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    // iridescent noise where the frame is bright
    if (uIrid > 0.0) {
      float n = fbm(uv * 9.0 + uTime * 0.6);
      vec3 ir = 0.6 + 0.4 * cos(6.2831 * (n * 2.0 + vec3(0.0, 0.33, 0.67)));
      float blot = smoothstep(0.42, 0.6, fbm(uv * 14.0 - uTime * 0.3));
      ir = mix(ir, vec3(0.05), blot * 0.85);
      c = mix(c, ir, uIrid * smoothstep(0.65, 0.85, l));
    }
    if (uPoster > 0.0) c = floor(c * uPoster + 0.5) / uPoster;
    l = dot(c, vec3(0.299, 0.587, 0.114));
    // red duotone: black -> blood red -> pink
    vec3 red = l < 0.5 ? mix(vec3(0.0), vec3(0.78, 0.02, 0.04), l * 2.0) : mix(vec3(0.78, 0.02, 0.04), vec3(1.0, 0.55, 0.55), (l - 0.5) * 2.0);
    if (uPoster > 0.0) red = floor(red * uPoster + 0.5) / uPoster;
    c = mix(c, red, uRed);
    // zigzag stripes through the darker half
    if (uZig > 0.0) {
      float z = sin((uv.y * 60.0 + abs(fract(uv.x * 9.0 + uTime * 0.6) - 0.5) * 14.0) * 3.1416);
      c = mix(c, c * step(0.0, z) + vec3(0.05, 0.0, 0.0), uZig * step(l, 0.45));
    }
    // rot: red/black blotches growing out from the centre
    if (uRot > 0.0) {
      float n = fbm(uv * vec2(uRes.x / uRes.y, 1.0) * 18.0 + vec2(0.0, uTime * 0.2));
      float d = length((uv - 0.5) * vec2(uRes.x / uRes.y, 1.0));
      float m = step(n + (1.0 - uRot) * 1.2 + d * 0.25, 1.05);
      c = mix(c, mix(vec3(0.02, 0.0, 0.0), vec3(0.75, 0.04, 0.06), step(0.55, fract(n * 7.0))), m);
    }
    if (uGreen > 0.0) {
      vec3 g = mix(vec3(0.0, 0.02, 0.0), vec3(0.1, 0.55, 0.12), smoothstep(0.05, 0.7, l));
      c = mix(c, g, uGreen);
    }
    if (uInvert > 0.0) {
      vec3 inv = 1.0 - c;
      inv = mix(inv, vec3(0.55, 1.0, 1.0) * step(0.35, dot(inv, vec3(0.33))) + vec3(0.6, 0.0, 0.05) * step(dot(inv, vec3(0.33)), 0.35), 0.6);
      c = mix(c, inv, uInvert);
    }
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

  const groups = { farm: farm(), core: core(), forest: deadForest(), heads: headField() };
  for (const g of Object.values(groups)) scene.add(g);

  const rochas = makeCharacter({
    skin: "#f5cd30", torso: "#2f8a3a", torsoFront: jacketTex(), arms: "#2f8a3a", legs: "#1a1a1a", face: "worried", hat: rochasCap(),
  });
  const cappy = makeCharacter({ skin: "#f5cd30", torso: "#e6dcc4", arms: "#e6dcc4", legs: "#2a2a2a", face: "blank", hat: cowboyHat() });
  const noob = makeCharacter({ skin: "#f5cd30", torso: "#2a62c8", arms: "#f5cd30", legs: "#3c9a3c", face: "smile" });
  const chars = { rochas, cappy, noob };
  for (const c of Object.values(chars)) scene.add(c.root);
  // Cappy's hat lying in the dirt for the close-up
  const lostHat = cowboyHat("#d9cfb8");
  lostHat.rotation.set(0.35, 0.6, 0.15);
  scene.add(lostHat);

  // offscreen target for the grading pass
  const rt = new THREE.WebGLRenderTarget(16, 16, { samples: 4, type: THREE.HalfFloatType });
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
  const DEF_GRADE = { bg: 0, skyTop: "#7aa7d8", skyBot: "#e9c79a", rayC: [0.5, 0.5], red: 0, invert: 0, poster: 0, rot: 0, irid: 0, blur: 0, glitch: 0, zig: 0, vig: 0.5, warm: 0, dark: 0, flash: 0, green: 0 };

  return {
    canvas: renderer.domElement,
    chars,
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
      hemi.color.set(L.sky || "#ffe9d0");
      hemi.groundColor.set(L.ground || "#3a2a1a");
      hemi.intensity = L.hemi ?? 1.4;
      sun.color.set(L.sun || "#ffd9a0");
      sun.intensity = L.sunI ?? 2.2;
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
      u.uSkyTop.value.set(G.skyTop);
      u.uSkyBot.value.set(G.skyBot);
      u.uRayC.value.set(G.rayC[0], G.rayC[1]);
      for (const k of ["red", "invert", "poster", "rot", "irid", "glitch", "zig", "vig", "warm", "dark", "flash", "green"]) u[`u${k[0].toUpperCase()}${k.slice(1)}`].value = G[k];
      u.uBlur.value = G.blur * dpr;

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
