// A 3D space colony (an O'Neill cylinder) for the second scene of
// "Star that doesn't Exist": a long pastel hull covered in buildings with lit
// windows, glass domes, docking rings, mirror panels and blinking beacons.
// It turns slowly on its axis while it drifts across the frame.
import * as THREE from "three";

const R = 10; // hull radius
const L = 64; // hull length

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
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

/** Hull plating: soft panels with seams. */
function hullTexture() {
  const tex = canvasTexture(512, 512, (x, w, h) => {
    const r = rand(5);
    x.fillStyle = "#efe7f2";
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 64; i++) {
      x.fillStyle = `rgba(${r() > 0.5 ? "214,196,226" : "255,250,255"},${0.25 + r() * 0.4})`;
      x.fillRect(Math.floor(r() * 8) * 64, Math.floor(r() * 8) * 64, 64, 64);
    }
    x.strokeStyle = "rgba(120,96,140,0.55)";
    x.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      x.beginPath();
      x.moveTo(i * 64, 0);
      x.lineTo(i * 64, h);
      x.moveTo(0, i * 64);
      x.lineTo(w, i * 64);
      x.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 10);
  return tex;
}

/** Building facades: a grid of windows, some lit. Colour map and emissive map share the grid. */
function windowTextures() {
  const lit = [];
  const r = rand(9);
  for (let i = 0; i < 8 * 12; i++) lit.push(r() < 0.55);
  const draw = (emissive) => (x, w, h) => {
    x.fillStyle = emissive ? "#000" : "#f7f0f6";
    x.fillRect(0, 0, w, h);
    let k = 0;
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 8; col++) {
        const on = lit[k++];
        x.fillStyle = emissive ? (on ? "#ffd98a" : "#000") : on ? "#fff3c4" : "#8a7aa0";
        x.fillRect(col * 16 + 4, row * 21 + 5, 8, 12);
      }
    }
  };
  const map = canvasTexture(128, 256, draw(false));
  const emissive = canvasTexture(128, 256, draw(true));
  return { map, emissive };
}

export function createColony() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 500);

  scene.add(new THREE.HemisphereLight("#ffe0f4", "#3b0b2c", 1.25));
  const sun = new THREE.DirectionalLight("#fff0d0", 2.4);
  sun.position.set(30, 40, 25);
  scene.add(sun);
  const rim = new THREE.DirectionalLight("#ff9fd8", 1.3);
  rim.position.set(-30, -10, -20);
  scene.add(rim);

  const colony = new THREE.Group(); // drifts across the frame
  const spin = new THREE.Group(); // turns on the colony's own axis (Z)
  colony.add(spin);
  scene.add(colony);

  // hull
  const hullGeo = new THREE.CylinderGeometry(R, R, L, 160, 1, true);
  hullGeo.rotateX(Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ map: hullTexture(), roughness: 0.55, metalness: 0.25, side: THREE.DoubleSide }));
  spin.add(hull);

  // end caps with docking rings and spokes
  const capMat = new THREE.MeshStandardMaterial({ color: "#f4ecf6", roughness: 0.5, metalness: 0.3 });
  const ringMat = new THREE.MeshStandardMaterial({ color: "#ffd2ec", roughness: 0.35, metalness: 0.6 });
  for (const side of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(R, 96), capMat);
    cap.position.z = (side * L) / 2;
    if (side < 0) cap.rotation.y = Math.PI;
    spin.add(cap);
    for (const [rr, tube] of [[R, 0.45], [R * 1.28, 0.32], [R * 0.45, 0.3]]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, tube, 14, 128), ringMat);
      ring.position.z = (side * L) / 2 + side * 0.6;
      spin.add(ring);
    }
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.35, R * 1.28, 0.35), ringMat);
      spoke.position.z = (side * L) / 2 + side * 0.6;
      spoke.rotation.z = (i / 6) * Math.PI;
      spin.add(spoke);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 3, 32), capMat);
    hub.rotation.x = Math.PI / 2;
    hub.position.z = (side * L) / 2 + side * 1.8;
    spin.add(hub);
  }

  // a belt ring around the middle
  const belt = new THREE.Mesh(new THREE.TorusGeometry(R + 0.6, 0.5, 16, 160), ringMat);
  spin.add(belt);

  // buildings on the hull: one instanced mesh, every box standing radially
  const { map, emissive } = windowTextures();
  const bMat = new THREE.MeshStandardMaterial({ map, emissive: "#ffd98a", emissiveMap: emissive, emissiveIntensity: 1.4, roughness: 0.7, metalness: 0.05 });
  const COUNT = 2600;
  const buildings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bMat, COUNT);
  const r = rand(21);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const tints = ["#ffffff", "#ffe6f4", "#e6fff4", "#f0e6ff", "#fff4e0"].map((c) => new THREE.Color(c));
  for (let i = 0; i < COUNT; i++) {
    const a = r() * Math.PI * 2;
    const z = (r() - 0.5) * (L - 5);
    // three avenues around the hull stay clear
    if (Math.abs(Math.sin(a * 1.5)) < 0.12) continue;
    const tall = r() < 0.06;
    const h = tall ? 2.2 + r() * 2.4 : 0.35 + Math.pow(r(), 1.8) * 1.4;
    const w = 0.45 + r() * 0.7;
    const d = 0.45 + r() * 0.9;
    const n = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
    q.setFromUnitVectors(up, n);
    m.compose(n.clone().multiplyScalar(R + h / 2 - 0.05).setZ(z), q, new THREE.Vector3(w, h, d));
    buildings.setMatrixAt(i, m);
    buildings.setColorAt(i, tints[Math.floor(r() * tints.length)]);
  }
  buildings.instanceMatrix.needsUpdate = true;
  spin.add(buildings);

  // glass domes
  const domeMat = new THREE.MeshStandardMaterial({ color: "#ffb8e6", roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.55, emissive: "#ff7cc8", emissiveIntensity: 0.25 });
  for (let i = 0; i < 18; i++) {
    const a = r() * Math.PI * 2;
    const z = (r() - 0.5) * (L - 10);
    const s = 1.4 + r() * 1.8;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(s, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    const n = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
    dome.quaternion.setFromUnitVectors(up, n);
    dome.position.copy(n.multiplyScalar(R - 0.1)).setZ(z);
    spin.add(dome);
  }

  // long mirror panels hinged at the far end, as on an O'Neill cylinder
  const mirrorMat = new THREE.MeshStandardMaterial({ color: "#ffd6f0", roughness: 0.15, metalness: 0.85, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * (R + 0.8), Math.sin(a) * (R + 0.8), L / 2);
    pivot.rotation.z = a - Math.PI / 2;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.9, L * 0.92), mirrorMat);
    panel.rotation.x = Math.PI / 2 + 0.22;
    panel.position.set(0, -Math.sin(0.22) * L * 0.46 * 0 + 0.0, -L * 0.46);
    pivot.add(panel);
    spin.add(pivot);
  }

  // blinking beacons at the docking ring
  const beaconMat = new THREE.MeshBasicMaterial({ color: "#fff3a0" });
  const beacons = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), beaconMat);
    b.position.set(Math.cos(a) * R * 1.28, Math.sin(a) * R * 1.28, L / 2 + 0.6);
    spin.add(b);
    beacons.push(b);
  }

  let size = "";
  function setSize(W, H, dpr) {
    const key = `${W}x${H}@${dpr}`;
    if (key === size) return;
    size = key;
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }

  return {
    canvas: renderer.domElement,
    /** p: 0..1 through the scene. The colony slides in from the left and drifts to the right. */
    render(W, H, dpr, t, p) {
      setSize(W, H, dpr);
      const ease = 1 - Math.pow(1 - Math.min(1, p * 1.25), 3);
      colony.position.set(-105 + ease * 92 + p * 14, -9 + p * 2, 0);
      colony.rotation.set(0.42, -0.62, 0.1);
      spin.rotation.z = t * 0.06;
      beacons.forEach((b, i) => b.scale.setScalar(0.6 + 0.8 * Math.max(0, Math.sin(t * 3 + i))));
      camera.position.set(6 + p * 3, 16, 74 - p * 6);
      camera.lookAt(0, -4, 0);
      renderer.render(scene, camera);
      return renderer.domElement;
    },
  };
}
