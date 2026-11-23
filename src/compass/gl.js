// 3D half of the Compass cutscene: chrome serif lettering, a valley of rocks
// around a glowing vortex, a tunnel dive, a pocket compass and the FREE sky,
// all through one renderer with a bloom pass.
//
// The token is never uploaded to WebGL (a cross-origin image would be refused
// as a texture); the 2D layer draws it where project()/dialFrame() say.
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import fontData from "three/examples/fonts/gentilis_bold.typeface.json";

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const smooth = (t, a, b) => {
  const x = prog(t, a, b);
  return x * x * (3 - 2 * x);
};
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeOutBack = (x) => 1 + 2.4 * Math.pow(x - 1, 3) + 1.4 * Math.pow(x - 1, 2);

// ---- chrome lettering ---------------------------------------------------------

/**
 * Chrome as in the source edit: bands across the letter height (white-lilac
 * bottom, an indigo horizon band, white, then a yellow top), with bright bevels.
 */
function chromeMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { opacity: { value: 1 }, glow: { value: 0 }, h0: { value: 0 }, h1: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying float vY;
      uniform float h0;
      uniform float h1;
      void main() {
        vN = normalize(normalMatrix * normal);
        vY = (position.y - h0) / (h1 - h0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float opacity;
      uniform float glow;
      varying vec3 vN;
      varying float vY;
      vec3 band(float y) {
        vec3 c0 = vec3(0.80, 0.87, 1.0);
        vec3 c1 = vec3(0.10, 0.24, 0.80);
        vec3 c2 = vec3(1.0, 1.0, 1.0);
        vec3 c3 = vec3(0.98, 0.98, 0.78);
        vec3 c4 = vec3(0.92, 0.90, 0.32);
        if (y < 0.28) return mix(c0, c1, smoothstep(0.0, 0.28, y));
        if (y < 0.48) return mix(c1, c2, smoothstep(0.28, 0.48, y));
        if (y < 0.72) return mix(c2, c3, smoothstep(0.48, 0.72, y));
        return mix(c3, c4, smoothstep(0.72, 1.0, y));
      }
      void main() {
        vec3 N = normalize(vN);
        float y = clamp(vY + N.y * 0.25, 0.0, 1.0);
        vec3 c = band(y);
        float side = 1.0 - abs(N.z);
        // bevels and sides catch a hard white highlight, the underside goes indigo
        c = mix(c, vec3(1.0), smoothstep(0.35, 0.8, side) * step(0.0, N.y + 0.2));
        c = mix(c, vec3(0.08, 0.16, 0.5), smoothstep(0.4, 0.9, side) * step(N.y, -0.2));
        c *= 1.0 + glow;
        gl_FragColor = vec4(pow(c, vec3(2.2)), opacity);
      }`,
  });
}

const font = new FontLoader().parse(fontData);
const geoCache = new Map();

function glyphGeometry(str, size) {
  const key = `${str}|${size}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const g = new TextGeometry(str, {
    font, size, depth: size * 0.22, curveSegments: 6,
    bevelEnabled: true, bevelThickness: size * 0.05, bevelSize: size * 0.035, bevelSegments: 2,
  });
  g.computeBoundingBox();
  const b = g.boundingBox;
  g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -(b.min.z + b.max.z) / 2);
  g.computeBoundingBox();
  geoCache.set(key, g);
  return g;
}

/** A word as one mesh, centred on its origin. */
function word(str, size) {
  const g = glyphGeometry(str, size);
  const m = new THREE.Mesh(g, chromeMaterial());
  m.material.uniforms.h0.value = g.boundingBox.min.y;
  m.material.uniforms.h1.value = g.boundingBox.max.y;
  return m;
}

/** A word as separate letters (for letter-by-letter entrances). */
function letters(str, size, track = 0.08) {
  const group = new THREE.Group();
  const items = [];
  let x = 0;
  const widths = [...str].map((ch) => {
    if (ch === " ") return size * 0.4;
    const g = glyphGeometry(ch, size);
    return g.boundingBox.max.x - g.boundingBox.min.x;
  });
  const total = widths.reduce((a, b) => a + b, 0) + track * size * (str.length - 1);
  x = -total / 2;
  [...str].forEach((ch, i) => {
    if (ch !== " ") {
      const m = word(ch, size);
      m.position.x = x + widths[i] / 2;
      m.userData.home = m.position.clone();
      group.add(m);
      items.push(m);
    }
    x += widths[i] + track * size;
  });
  return { group, items };
}

function fadeWord(m, opacity, glow = 0) {
  m.visible = opacity > 0.01;
  m.material.uniforms.opacity.value = opacity;
  m.material.uniforms.glow.value = glow;
}

// ---- valley -------------------------------------------------------------------

const VORTEX_FRAG = /* glsl */ `
  uniform float time;
  uniform float core;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float a = atan(p.y, p.x);
    float sw = a * 3.0 + log(r + 0.05) * 6.0 - time * 1.4;
    float arms = pow(0.5 + 0.5 * sin(sw), 2.5);
    float fine = pow(0.5 + 0.5 * sin(a * 11.0 + r * 30.0 - time * 3.0), 6.0);
    float rings = pow(0.5 + 0.5 * sin(r * 38.0 - time * 3.2), 14.0) * smoothstep(0.1, 0.4, r);
    vec2 cell = floor(vec2(a * 40.0, r * 70.0 - time * 3.0));
    float glit = step(0.93, hash(cell)) * pow(0.5 + 0.5 * sin(time * 9.0 + hash(cell + 3.1) * 40.0), 4.0);
    vec3 deep = vec3(0.03, 0.07, 0.26);
    vec3 violet = vec3(0.12, 0.30, 0.90);
    vec3 pink = vec3(0.50, 0.68, 1.0);
    vec3 gold = vec3(1.0, 0.70, 0.28);
    vec3 c = deep * 0.7 + violet * arms * 0.75 + pink * fine * 0.25 + mix(pink, gold, 0.5) * rings * 0.55;
    c += vec3(1.0, 0.82, 0.45) * glit * 1.6;
    float hot = exp(-r * r * 26.0);
    c += gold * hot * (2.2 + core * 3.0) + gold * exp(-r * r * 6.0) * 0.55 * arms;
    float edge = smoothstep(1.0, 0.62, r);
    gl_FragColor = vec4(pow(max(c * edge, 0.0), vec3(2.2)), 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform float time;
  uniform float white;
  uniform float pale;
  varying vec3 vDir;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  float noise(float x) { float i = floor(x); float f = fract(x); return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f)); }
  void main() {
    vec3 d = normalize(vDir);
    float up = clamp(d.y, -0.2, 1.0);
    vec3 low = vec3(0.07, 0.15, 0.58);
    vec3 high = vec3(0.01, 0.02, 0.13);
    vec3 c = mix(low, high, smoothstep(0.0, 0.7, up));
    // light rays bursting up from behind the rocks
    float ang = atan(d.x, d.y + 0.25);
    float rays = pow(noise(ang * 18.0 + time * 0.3) * 0.6 + noise(ang * 41.0 - time * 0.5) * 0.4, 2.5);
    c += vec3(0.35, 0.5, 1.0) * rays * smoothstep(0.75, 0.0, up) * 0.5;
    c = mix(c, vec3(0.55, 0.65, 0.95), pale);
    c = mix(c, vec3(1.0), white);
    gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0);
  }
`;

function rockGeometry(seed, r, h) {
  const g = new THREE.ConeGeometry(r, h, 7, 5, false);
  const pos = g.attributes.position;
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const offs = Array.from({ length: pos.count }, () => rnd());
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const k = 0.35 + 0.65 * (1 - (y / h + 0.5));
    pos.setX(i, pos.getX(i) * (0.75 + offs[i] * 0.6) + (offs[(i * 7) % pos.count] - 0.5) * r * 0.5 * k);
    pos.setZ(i, pos.getZ(i) * (0.75 + offs[(i * 3) % pos.count] * 0.6));
    pos.setY(i, y + (offs[(i * 5) % pos.count] - 0.5) * h * 0.12);
  }
  g.translate(0, h / 2, 0);
  g.computeVertexNormals();
  return g;
}

function buildValley(env) {
  const scene = new THREE.Scene();
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { time: { value: 0 }, white: { value: 1 }, pale: { value: 0 } },
    vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: SKY_FRAG,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), skyMat));

  const vortexMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, core: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: VORTEX_FRAG,
  });
  vortexMat.transparent = true;
  vortexMat.blending = THREE.AdditiveBlending;
  vortexMat.depthWrite = false;
  const vortex = new THREE.Mesh(new THREE.CircleGeometry(5.2, 96), vortexMat);
  vortex.rotation.x = -Math.PI / 2;
  vortex.position.y = 0.01;
  // dark basin floor the pool and rocks stand on
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(40, 64),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#050a20") }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  scene.add(vortex);

  const rockMat = new THREE.MeshStandardMaterial({ color: "#1a2350", roughness: 0.85, metalness: 0.1, flatShading: true, envMap: env, envMapIntensity: 0.25 });
  const rocks = new THREE.Group();
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * TAU + Math.sin(i * 7.3) * 0.12;
    // the camera sits at +z: keep rocks behind and to the sides, none in front
    if (Math.cos(a) < -0.35) continue;
    const rad = 5.3 + ((i * 37) % 10) / 10 * 2.6;
    const h = 1.6 + ((i * 53) % 10) / 10 * 2.6;
    const m = new THREE.Mesh(rockGeometry(i * 97 + 11, 0.7 + ((i * 13) % 7) / 10, h), rockMat);
    m.position.set(Math.sin(a) * rad, -0.1, -Math.cos(a) * rad);
    m.rotation.y = i;
    rocks.add(m);
  }
  scene.add(rocks);

  scene.add(new THREE.HemisphereLight("#5b78e8", "#081030", 1.0));
  const glowLight = new THREE.PointLight("#ffbf6a", 22, 14, 1.6);
  glowLight.position.set(0, 0.6, 0);
  scene.add(glowLight);
  const rim = new THREE.DirectionalLight("#9fb4ff", 1.6);
  rim.position.set(0, 4, -10);
  scene.add(rim);

  // three floating lights over the pool
  const orbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.2, 0.9) });
  const orbs = [0, 1, 2].map(() => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 10), orbMat);
    scene.add(o);
    return o;
  });

  const tight = word("TIGHT", 1.0);
  const my = word("MY", 0.42);
  const compass = word("COMPASS", 0.55);
  const is = word("is", 0.4);
  const cur = letters("CURIOSITY", 0.6, 0.06);
  for (const m of [tight, my, compass, is]) scene.add(m);
  scene.add(cur.group);

  return { scene, skyMat, vortexMat, rocks, orbs, tight, my, compass, is, cur };
}

// ---- compass ------------------------------------------------------------------

function dialTexture() {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "#5d5f6e");
  g.addColorStop(0.8, "#34353f");
  g.addColorStop(1, "#1c1c24");
  x.fillStyle = g;
  x.fillRect(0, 0, S, S);
  x.translate(S / 2, S / 2);
  x.strokeStyle = "rgba(230,230,240,0.85)";
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU;
    const long = i % 9 === 0;
    x.lineWidth = long ? 3 : 1.2;
    x.beginPath();
    x.moveTo(Math.cos(a) * S * 0.45, Math.sin(a) * S * 0.45);
    x.lineTo(Math.cos(a) * S * (long ? 0.39 : 0.42), Math.sin(a) * S * (long ? 0.39 : 0.42));
    x.stroke();
  }
  // compass rose
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU - Math.PI / 2;
    const L = i % 2 ? S * 0.22 : S * 0.34;
    x.save();
    x.rotate(a);
    x.fillStyle = i % 2 ? "#9a9cad" : "#d9dae6";
    x.beginPath();
    x.moveTo(L, 0);
    x.lineTo(0, -S * 0.035);
    x.lineTo(0, S * 0.035);
    x.closePath();
    x.fill();
    x.fillStyle = "rgba(0,0,0,0.35)";
    x.beginPath();
    x.moveTo(L, 0);
    x.lineTo(0, 0);
    x.lineTo(0, S * 0.035);
    x.closePath();
    x.fill();
    x.restore();
  }
  x.fillStyle = "#e9e9f2";
  x.font = `bold ${S * 0.07}px Georgia, serif`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  ["N", "E", "S", "W"].forEach((ch, i) => {
    const a = (i / 4) * TAU - Math.PI / 2;
    x.fillText(ch, Math.cos(a) * S * 0.36, Math.sin(a) * S * 0.36);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function buildCompass(env) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: "#2b2c36", metalness: 0.95, roughness: 0.32, envMap: env, envMapIntensity: 1.2 });
  const brass = new THREE.MeshStandardMaterial({ color: "#c9a14e", metalness: 1, roughness: 0.25, envMap: env, envMapIntensity: 1.4 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.02, 0.36, 64), metal);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const back = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 16, 0, TAU, 0, Math.PI / 2), metal);
  back.rotation.x = -Math.PI / 2;
  back.scale.set(1, 1, 0.28);
  back.position.z = -0.18;
  g.add(back);
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.07, 16, 72), brass);
  rimRing.position.z = 0.18;
  g.add(rimRing);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.9, 64), new THREE.MeshStandardMaterial({ map: dialTexture(), roughness: 0.6, metalness: 0.2 }));
  face.position.z = 0.17;
  g.add(face);
  // needle
  const ns = new THREE.Shape();
  ns.moveTo(0, 0.7);
  ns.lineTo(0.07, 0);
  ns.lineTo(0, -0.7);
  ns.lineTo(-0.07, 0);
  ns.closePath();
  const needleGeo = new THREE.ExtrudeGeometry(ns, { depth: 0.02, bevelEnabled: false });
  const needle = new THREE.Group();
  const red = new THREE.Mesh(needleGeo, new THREE.MeshStandardMaterial({ color: "#d22a2a", roughness: 0.4 }));
  needle.add(red);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16), brass);
  pin.rotation.x = Math.PI / 2;
  needle.add(pin);
  needle.position.z = 0.22;
  g.add(needle);
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(0.92, 48, 12, 0, TAU, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0, roughness: 0.05, transparent: true, opacity: 0.16, envMap: env, envMapIntensity: 2, depthWrite: false }),
  );
  glass.rotation.x = Math.PI / 2;
  glass.scale.set(1, 1, 0.22);
  glass.position.z = 0.18;
  g.add(glass);
  // bow and crown at 12 o'clock
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 20), brass);
  crown.position.y = 1.08;
  g.add(crown);
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 12, 32), brass);
  bow.position.y = 1.35;
  g.add(bow);
  return { group: g, needle };
}

// ---- environment ----------------------------------------------------------------

function buildEnv(renderer) {
  const s = new THREE.Scene();
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: /* glsl */ `
      varying vec3 vP;
      void main() {
        vec3 d = normalize(vP);
        vec3 c = mix(vec3(0.05, 0.04, 0.25), vec3(0.35, 0.4, 1.0), smoothstep(-0.4, 0.1, d.y));
        c = mix(c, vec3(1.0, 0.95, 0.8), smoothstep(0.35, 0.9, d.y));
        c += vec3(1.2) * smoothstep(0.985, 1.0, dot(d, normalize(vec3(0.6, 0.5, 0.6))));
        c += vec3(0.6, 0.5, 1.4) * smoothstep(0.97, 1.0, dot(d, normalize(vec3(-0.7, 0.1, 0.4))));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  s.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), m));
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.02).texture;
  pm.dispose();
  return tex;
}

// ---- public ------------------------------------------------------------------------

export function createGL() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const env = buildEnv(renderer);
  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.05, 200);
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(new THREE.Scene(), camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.4, 0.35, 0.9);
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // title cards (HOLD / ON)
  const title = new THREE.Scene();
  title.background = new THREE.Color("#0a1238");
  const hold = word("HOLD", 1.25);
  const on = word("ON", 1.5);
  title.add(hold, on);

  const valley = buildValley(env);
  valley.scene.environment = env;

  // tunnel dive
  const tunnel = new THREE.Scene();
  tunnel.background = new THREE.Color("#0b0520");
  const tunnelMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { time: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: /* glsl */ `
      uniform float time;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float a = vUv.x * 6.2831;
        float z = vUv.y * 40.0 + time * 9.0;
        float sw = pow(0.5 + 0.5 * sin(a * 4.0 + z * 0.35), 3.0);
        float rings = pow(0.5 + 0.5 * sin(z * 2.2), 18.0);
        vec2 cell = floor(vec2(vUv.x * 120.0, z * 4.0));
        float glit = step(0.94, hash(cell));
        vec3 c = vec3(0.04, 0.09, 0.32) * 0.8 + vec3(0.15, 0.35, 0.95) * sw * 0.7 + vec3(0.95, 0.75, 0.4) * rings * 0.5 + vec3(1.0, 0.85, 0.5) * glit * 0.9;
        float depth = smoothstep(0.0, 1.0, 1.0 - vUv.y);
        c = mix(c, vec3(1.0, 0.6, 0.25) * 1.3, pow(depth, 5.0));
        gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0);
      }`,
  });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 60, 48, 1, true), tunnelMat);
  tube.rotation.x = Math.PI / 2;
  tube.position.z = -30;
  tunnel.add(tube);
  tunnel.environment = env;
  tunnel.add(new THREE.HemisphereLight("#9db4ff", "#0a1440", 1.3));
  const tunnelLight = new THREE.PointLight("#ffb070", 40, 30, 1.4);
  tunnelLight.position.set(0, 0, -6);
  tunnel.add(tunnelLight);
  const tunnelCompass = buildCompass(env);
  tunnel.add(tunnelCompass.group);
  const tMy = word("MY", 0.55);
  const tCompass = word("COMPASS", 0.6);
  const tIs = word("is", 0.42);
  tunnel.add(tMy, tCompass, tIs);
  const debris = new THREE.Group();
  const debrisMat = new THREE.MeshStandardMaterial({ color: "#1e1535", roughness: 0.9, flatShading: true });
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(rockGeometry(i * 31 + 5, 0.45, 0.9), debrisMat);
    debris.add(m);
  }
  tunnel.add(debris);

  // dark void + beam (small compass and the CURIOSITY arc)
  const beam = new THREE.Scene();
  beam.background = new THREE.Color("#060a34");
  beam.environment = env;
  beam.add(new THREE.HemisphereLight("#8ea0ff", "#10124a", 1.6));
  const beamLight = new THREE.DirectionalLight("#cfd6ff", 2.2);
  beamLight.position.set(0, 6, 2);
  beam.add(beamLight);
  const beamCompass = buildCompass(env);
  beam.add(beamCompass.group);
  const arc = letters("CURIOSITY", 0.62, 0.12);
  beam.add(arc.group);
  const im = word("I'M", 0.6);
  beam.add(im);

  // close-up compass with PIERCING THROUGH THE ROPE
  const close = new THREE.Scene();
  close.background = new THREE.Color("#0f1d6e");
  close.environment = env;
  close.add(new THREE.HemisphereLight("#c8d0ff", "#101860", 1.8));
  const keyLight = new THREE.DirectionalLight("#ffffff", 2.4);
  keyLight.position.set(2, 3, 4);
  close.add(keyLight);
  const bigCompass = buildCompass(env);
  close.add(bigCompass.group);
  const piercing = word("PIERCING", 0.5);
  const through = word("THROUGH", 0.5);
  const the = word("THE", 0.3);
  const rope = word("ROPE", 0.9);
  close.add(piercing, through, the, rope);

  // FREE sky
  const free = new THREE.Scene();
  free.background = new THREE.Color("#f4f2ff");
  const freeWord = letters("FREE", 1.35, 0.22);
  free.add(freeWord.group);

  let size = "";
  const v = new THREE.Vector3();

  function setSize(W, H, dpr) {
    const key = `${W}x${H}@${dpr}`;
    if (key === size) return;
    size = key;
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    composer.setPixelRatio(dpr);
    composer.setSize(W, H);
    bloom.resolution.set(W * dpr * 0.5, H * dpr * 0.5);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }

  function project(x, y, z, W, H, obj) {
    v.set(x, y, z);
    if (obj) obj.localToWorld(v);
    v.project(camera);
    return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H, v.z];
  }

  /** Screen-space frame of a compass dial: centre plus two radius vectors. */
  function dialFrame(c, W, H) {
    c.group.updateMatrixWorld(true);
    const o = project(0, 0, 0.2, W, H, c.group);
    const ux = project(0.78, 0, 0.2, W, H, c.group);
    const uy = project(0, 0.78, 0.2, W, H, c.group);
    return { cx: o[0], cy: o[1], ax: ux[0] - o[0], ay: ux[1] - o[1], bx: uy[0] - o[0], by: uy[1] - o[1], depth: o[2] };
  }

  function draw(scene, strength = 0.85) {
    renderPass.scene = scene;
    bloom.strength = strength * 0.36;
    composer.render();
  }

  return {
    canvas: renderer.domElement,

    title(W, H, dpr, t, T) {
      setSize(W, H, dpr);
      camera.position.set(0, 0, 6.2 - (t - T.hold) * 0.12);
      camera.lookAt(0, 0, 0);
      const onT = t - T.on;
      const isOn = onT >= 0;
      // bg: navy for HOLD, a lilac flash that falls back to navy for ON
      const flash = isOn ? Math.exp(-onT / 0.12) : 0;
      title.background.setRGB(lerp(0.04, 0.17, flash), lerp(0.07, 0.29, flash), lerp(0.22, 0.85, flash), THREE.SRGBColorSpace);
      const holdA = smooth(t, T.hold, T.hold + 0.08) * (1 - smooth(t, T.holdOut - 0.2, T.holdOut));
      fadeWord(hold, isOn ? 0 : holdA, 0.1);
      hold.rotation.y = -0.12 + (t - T.hold) * 0.18;
      hold.scale.setScalar(1 + (t - T.hold) * 0.05);
      const pop = isOn ? easeOutBack(prog(onT, 0, 0.25)) : 0;
      fadeWord(on, isOn ? 1 : 0, flash * 0.6);
      on.scale.setScalar(lerp(1.35, 1, pop) * (1 + onT * 0.04));
      on.rotation.y = 0.18 - onT * 0.2;
      on.position.y = -0.1;
      draw(title, 0.9);
    },

    valley(W, H, dpr, t, T, beat) {
      setSize(W, H, dpr);
      const lt = t - T.valley;
      const V = valley;
      V.skyMat.uniforms.time.value = t;
      // white fog clears, then the burst turns the sky blue; pale flicker after 8.5 s
      V.skyMat.uniforms.white.value = 1 - smooth(t, T.valley + 0.2, T.burst);
      V.skyMat.uniforms.pale.value = smooth(t, T.pale, T.pale + 0.1) * (1 - smooth(t, T.paleOut - 0.2, T.paleOut)) * (0.3 + 0.1 * beat);
      V.vortexMat.uniforms.time.value = t;
      V.vortexMat.uniforms.core.value = beat * 0.6 + smooth(t, T.push, T.dive);
      V.scene.background = null;
      // rocks rise out of the white
      V.rocks.position.y = lerp(-2.2, 0, easeOut(prog(t, T.valley, T.valley + 1.1)));
      V.orbs.forEach((o, i) => {
        const a = (i / 3) * TAU + t * 0.4;
        o.position.set(Math.cos(a) * 1.3, 0.55 + Math.sin(t * 1.7 + i) * 0.12, Math.sin(a) * 0.8 - 0.4);
      });
      // camera: low, slow push in; then a rush down into the vortex
      const dive = easeOut(prog(t, T.push, T.dive));
      const cz = lerp(10.5, 8.2, smooth(t, T.valley, T.push)) - dive * 6.5;
      const cy = lerp(1.25, 1.6, smooth(t, T.valley, T.push)) + dive * 2.2;
      camera.position.set(Math.sin(lt * 0.12) * 0.6, cy, cz);
      camera.lookAt(0, lerp(0.7, -0.4, dive), lerp(0, -0.5, dive));

      fadeWord(V.tight, smooth(t, T.tight, T.tight + 0.5) * (1 - smooth(t, T.burst, T.burst + 0.35)), 0.15);
      V.tight.position.set(0, 1.75, 3.4);
      V.tight.rotation.y = 0.08 - lt * 0.03;
      const wordsOut = 1 - smooth(t, T.dive - 0.15, T.dive);
      const drop = (m, t0, x, y, z, ry) => {
        const p = easeOutBack(prog(t, t0, t0 + 0.35));
        fadeWord(m, smooth(t, t0, t0 + 0.08) * wordsOut, 0.1);
        m.position.set(x, y + (1 - p) * 1.4, z);
        m.rotation.set(-0.1, ry, 0);
      };
      drop(V.my, T.my, -2.25, 2.7, 2.2, 0.25);
      drop(V.compass, T.compassWord, 0.7, 2.4, 2.6, -0.12);
      drop(V.is, T.is, -1.9, 2.05, 2.7, 0.2);
      V.cur.group.position.set(0, 0.35, 4.6);
      V.cur.group.rotation.y = -0.05;
      V.cur.items.forEach((m, i) => {
        const t0 = T.cur[i];
        const p = easeOutBack(prog(t, t0, t0 + 0.32));
        fadeWord(m, smooth(t, t0, t0 + 0.06) * wordsOut, 0.12);
        m.position.y = (1 - p) * 1.8;
        m.rotation.x = (1 - p) * -0.9;
      });
      draw(V.scene, 0.95);
      return project(0, 0.02, 0, W, H);
    },

    tunnel(W, H, dpr, t, T) {
      setSize(W, H, dpr);
      const lt = t - T.dive;
      tunnelMat.uniforms.time.value = t;
      camera.position.set(Math.sin(lt * 2) * 0.15, Math.cos(lt * 1.7) * 0.1, 0);
      camera.up.set(Math.sin(lt * 0.9), Math.cos(lt * 0.9), 0);
      camera.lookAt(0, 0, -10);
      const c = tunnelCompass.group;
      const come = easeOut(prog(t, T.dive + 0.15, T.dark - 0.2));
      c.position.set(0, 0, lerp(-28, -3.6, come));
      c.rotation.set(0.25 + Math.sin(lt * 2) * 0.2, lt * 3.2 * (1 - come * 0.85) + 0.4, lt * 0.6);
      tunnelCompass.needle.rotation.z = Math.sin(lt * 7) * 0.5;
      const orbit = lt * 1.1;
      const place = (m, a, r, z, t0) => {
        fadeWord(m, smooth(t, t0, t0 + 0.12), 0.15);
        m.position.set(Math.cos(orbit + a) * r, Math.sin(orbit + a) * r, z + come * 1.2);
        m.lookAt(0, 0, 6);
        m.rotateZ(Math.sin(orbit + a) * 0.3);
      };
      place(tMy, 2.2, 1.6, -5, T.dive + 0.25);
      place(tCompass, -0.4, 1.7, -4.6, T.dive + 0.35);
      place(tIs, 3.6, 1.3, -4.2, T.dive + 0.45);
      debris.children.forEach((m, i) => {
        const a = i * 2.39;
        const z = -((i * 4.3 + lt * 14) % 30);
        m.position.set(Math.cos(a) * 2.1, Math.sin(a) * 2.1, z);
        m.rotation.set(lt * (1 + i * 0.1), i, lt);
      });
      tunnel.background = null;
      draw(tunnel, 1.0);
      return dialFrame(tunnelCompass, W, H);
    },

    beam(W, H, dpr, t, T) {
      setSize(W, H, dpr);
      const lt = t - T.dark;
      const inBeam = t >= T.beam;
      camera.up.set(0, 1, 0);
      if (!inBeam) {
        camera.position.set(0, 0, 6);
        camera.lookAt(0, 0.3, -10);
      } else {
        const bt = t - T.beam;
        camera.position.set(Math.sin(bt * 0.2) * 0.4, 0.4 + bt * 0.05, 6.2 - bt * 0.25);
        camera.lookAt(0, 0.6, -4);
      }
      const c = beamCompass.group;
      if (!inBeam) {
        c.position.set(0, 0.45, lerp(-16, -11, prog(lt, 0, 1.2)));
        c.rotation.set(0.4, lt * 1.4, 0.2);
      } else {
        c.position.set(0, 2.15, -6);
        c.rotation.set(0.6, (t - T.beam) * 0.8, 0.15);
        c.scale.setScalar(0.32);
      }
      beamCompass.needle.rotation.z = Math.sin(t * 3) * 0.4;
      arc.group.visible = inBeam;
      im.visible = inBeam;
      arc.group.position.set(0, -0.55, 1.2);
      arc.items.forEach((m, i) => {
        const k = i - 4;
        const t0 = T.beam + i * 0.085;
        const p = easeOutBack(prog(t, t0, t0 + 0.4));
        fadeWord(m, smooth(t, t0, t0 + 0.1), 0.15);
        m.position.set(m.userData.home.x, Math.sin(i * 1.3 + t * 1.2) * 0.12 + (1 - p) * -1.5 + Math.abs(k) * 0.04, -k * k * 0.06);
        m.rotation.set(-0.35, -k * 0.1, Math.sin(i * 1.7) * 0.18);
      });
      const ip = easeOutBack(prog(t, T.im, T.im + 0.3));
      fadeWord(im, smooth(t, T.im, T.im + 0.08), 0.2);
      im.position.set(0, 0.55, 1.4);
      im.scale.setScalar(Math.max(0.01, ip));
      draw(beam, 1.0);
      return project(0, 0, 0, W, H, c);
    },

    close(W, H, dpr, t, T) {
      setSize(W, H, dpr);
      const lt = t - T.piercing;
      const pull = smooth(t, T.rope, T.flash);
      camera.up.set(0, 1, 0);
      camera.position.set(Math.sin(lt * 0.4) * 0.3, 0.1, 6 + pull * 3.5);
      camera.lookAt(0, 0.4, 0);
      const c = bigCompass.group;
      const rise = easeOut(prog(t, T.piercing, T.piercing + 0.6));
      c.position.set(0.1, lerp(-4.2, -1.45, rise), 0.4);
      c.rotation.set(-0.55 + Math.sin(lt) * 0.05, 0.25 - lt * 0.12, -0.1);
      c.scale.setScalar(1.55);
      bigCompass.needle.rotation.z = Math.sin(lt * 2.4) * 0.6 + 0.3;
      const fly = (m, t0, x, y, z, ry) => {
        const p = easeOut(prog(t, t0, t0 + 0.4));
        fadeWord(m, smooth(t, t0, t0 + 0.08), 0.2);
        m.position.set(x + (1 - p) * x * 1.5, y, z + (1 - p) * 3);
        m.rotation.set(0, ry, 0);
      };
      fly(piercing, T.piercing, -2.2, 1.35, 0.6, 0.4);
      fly(through, T.through, 2.25, 1.35, 0.4, -0.4);
      fly(the, T.the, 0, 2.3, 0, 0);
      const rp = easeOutBack(prog(t, T.rope, T.rope + 0.3));
      fadeWord(rope, smooth(t, T.rope, T.rope + 0.06), 0.25);
      rope.position.set(0, 1.1, lerp(5, 2.6, rp));
      draw(close, 1.05);
      return { dial: dialFrame(bigCompass, W, H), glint: project(0, 0.95, 0.2, W, H, c) };
    },

    free(W, H, dpr, t, T) {
      setSize(W, H, dpr);
      const lt = t - T.free;
      const k = smooth(t, T.free + 1.6, T.tide);
      const col = new THREE.Color("#f2f5ff").lerp(new THREE.Color("#5b78d8"), smooth(t, 26.2, 27.8));
      col.lerp(new THREE.Color("#1a2c80"), smooth(t, 27.8, 28.7));
      col.lerp(new THREE.Color("#060c26"), smooth(t, 28.6, T.tide));
      free.background = col;
      camera.up.set(0, 1, 0);
      camera.position.set(Math.sin(lt * 0.3) * 0.3, 0.1, 7 - lt * 0.25);
      camera.lookAt(0, 0.2, 0);
      freeWord.group.position.set(0, 0.35, 0);
      freeWord.items.forEach((m, i) => {
        const a = lerp(0.22, 1, smooth(t, T.free + 1.2, T.free + 2.2)) * (1 - smooth(t, 28.5, T.tide));
        fadeWord(m, a, 0.05 + k * 0.2);
        m.position.y = Math.sin(t * 1.6 + i) * 0.05;
        m.rotation.y = Math.sin(t * 0.8 + i * 0.6) * 0.15;
      });
      draw(free, 0.7);
      return project(0, 1.75, 0, W, H);
    },
  };
}
