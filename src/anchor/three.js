// Real 3D props for the Anchor cutscene: a ship's anchor with chain, a tilted
// magic circle and a flying-V electric guitar, rendered with two-tone shading
// (electric blue with white highlights) to match the source video.
//
// The token itself is never uploaded to WebGL: a cross-origin token image
// would be refused as a texture. The 2D layer draws it, placed with project().
import * as THREE from "three";

const BLUE = new THREE.Color("#2410ff");
const SHADE = new THREE.Color("#1607b8");
const WHITE = new THREE.Color("#fbfbfe");

function toon(base, shade, hi, { hiAt = 0.9, rimAt = 0.8 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      base: { value: base },
      shade: { value: shade },
      hi: { value: hi },
      hiAt: { value: hiAt },
      rimAt: { value: rimAt },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 base;
      uniform vec3 shade;
      uniform vec3 hi;
      uniform float hiAt;
      uniform float rimAt;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec3 N = normalize(vN);
        vec3 V = normalize(vV);
        vec3 L = normalize(vec3(-0.45, 0.65, 0.6));
        float d = dot(N, L);
        vec3 H = normalize(L + V);
        float s = pow(max(dot(N, H), 0.0), 40.0);
        float rim = 1.0 - max(dot(N, V), 0.0);
        vec3 c = d < 0.0 ? shade : base;
        if (s > hiAt) c = hi;
        if (rim > rimAt) c = hi;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

function linkGeometry(r) {
  const g = new THREE.TorusGeometry(r, r * 0.3, 8, 18);
  g.scale(1, 1.75, 1);
  g.rotateX(Math.PI / 2); // long axis along +Z, so lookAt() aligns it to the chain
  return g;
}

/** A chain of links following a list of points. */
function chainAlong(points, geo, mat) {
  const group = new THREE.Group();
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(a).lerp(b, 0.5);
    m.lookAt(b);
    if (i % 2) m.rotateZ(Math.PI / 2);
    group.add(m);
  }
  return group;
}

function makeAnchor(mat) {
  const g = new THREE.Group();
  const add = (geo, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    g.add(m);
    return m;
  };
  add(new THREE.TorusGeometry(0.2, 0.055, 14, 36), 0, 1.04, 0);
  add(new THREE.CylinderGeometry(0.055, 0.055, 1.12, 14), 0, 0.74, 0, 0, 0, Math.PI / 2);
  add(new THREE.SphereGeometry(0.09, 16, 12), -0.58, 0.74, 0);
  add(new THREE.SphereGeometry(0.09, 16, 12), 0.58, 0.74, 0);
  add(new THREE.CylinderGeometry(0.075, 0.09, 1.6, 16), 0, 0.06, 0);
  const arc = Math.PI * 0.78;
  add(new THREE.TorusGeometry(0.62, 0.085, 14, 56, arc), 0, -0.08, 0, 0, 0, Math.PI + (Math.PI - arc) / 2);
  const fluke = new THREE.ConeGeometry(0.19, 0.4, 4);
  fluke.scale(1, 1, 0.35);
  add(fluke, -0.6, -0.14, 0, 0, 0, 0.55);
  add(fluke, 0.6, -0.14, 0, 0, 0, -0.55);
  add(new THREE.SphereGeometry(0.12, 16, 12), 0, -0.72, 0);
  g.children.forEach((c) => (c.position.y -= 0.16));
  return g;
}

function makeGuitar(bodyMat, neckMat) {
  const g = new THREE.Group();
  // flying-V body, neck along +Y
  const s = new THREE.Shape();
  s.moveTo(0, 0.28);
  s.lineTo(0.6, -0.82);
  s.lineTo(0.4, -0.94);
  s.lineTo(0, -0.3);
  s.lineTo(-0.4, -0.94);
  s.lineTo(-0.6, -0.82);
  s.closePath();
  const body = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 });
  body.translate(0, 0, -0.04);
  g.add(new THREE.Mesh(body, bodyMat));
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.15, 0.05), neckMat);
  neck.position.set(0, 0.84, 0.03);
  g.add(neck);
  const h = new THREE.Shape();
  h.moveTo(-0.06, 0);
  h.lineTo(0.06, 0);
  h.lineTo(0.13, 0.22);
  h.lineTo(0, 0.42);
  h.lineTo(-0.1, 0.2);
  h.closePath();
  const head = new THREE.Mesh(new THREE.ExtrudeGeometry(h, { depth: 0.05, bevelEnabled: false }), neckMat);
  head.position.set(0, 1.4, 0);
  g.add(head);
  for (const y of [-0.12, -0.36]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.04), neckMat);
    p.position.set(0, y, 0.07);
    g.add(p);
  }
  g.children.forEach((c) => (c.position.y -= 0.25));
  return g;
}

/** Towers seen from the street, looking up: the "SKY" shot. */
function makeCity(mat, windowMat) {
  const g = new THREE.Group();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // one big tower in front, a few behind it at the edges of the frame
  const towers = [[0.5, 4.6, 8, 4], [8.5, 4, 2.6, 2.6], [10.5, 11, 3, 3], [-7.5, 9, 3.2, 3.2], [-12, 3, 2.4, 2.4]];
  for (const [x, z, w, d] of towers) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, 60, d), mat);
    box.position.set(x, 28, z);
    g.add(box);
    // ledges
    for (let y = 1; y < 40; y += 2.2 + rnd() * 1.5) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, 0.18, d + 0.35), mat);
      l.position.set(x, y, z);
      g.add(l);
    }
    // a column of window slits on the face toward the street
    const toward = new THREE.Vector3(-x, 0, -z).normalize();
    const fx = x + toward.x * (w / 2 + 0.03);
    const fz = z + toward.z * (d / 2 + 0.03);
    for (let y = 0.5; y < 40; y += 1.1) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.22), windowMat);
      win.position.set(fx, y, fz);
      g.add(win);
    }
  }
  return g;
}

function circleTexture(drawCircle) {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  drawCircle(c.getContext("2d"), 512, 512, 480);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}


// Underwater backdrop as one full-screen shader: a sea floor in perspective
// lit by animated caustics, light shafts from the surface, and depth fog.
const SEA_FRAG = /* glsl */ `
  precision highp float;
  uniform vec2 res;
  uniform float time;
  uniform float bloom;
  varying vec2 vUv;
  #define TAU 6.28318530718

  // Tileable water caustics (iterated trig warp).
  float caustic(vec2 uv, float t) {
    vec2 p = mod(uv * TAU, TAU) - 250.0;
    vec2 i = p;
    float c = 1.0;
    float inten = 0.005;
    for (int n = 0; n < 5; n++) {
      float tt = t * (1.0 - (3.5 / float(n + 1)));
      i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
      c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
    }
    c /= 5.0;
    c = 1.17 - pow(c, 1.4);
    return pow(abs(c), 8.0);
  }

  float hash(float n) { return fract(sin(n) * 43758.5453); }
  float noise(float x) { float i = floor(x); float f = fract(x); return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f)); }

  void main() {
    vec2 uv = vUv;
    float aspect = res.x / res.y;
    vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);

    // camera slightly above the floor, looking a little down
    vec3 ro = vec3(0.0, 1.0, time * 0.18);
    vec3 rd = normalize(vec3(p.x, p.y - 0.12, 1.1));

    vec3 deep = vec3(0.07, 0.17, 0.55);
    vec3 mid = vec3(0.13, 0.33, 0.80);
    vec3 shallow = vec3(0.42, 0.62, 0.98);
    // water column: lighter toward the surface and the sun above centre
    float up = clamp(rd.y * 1.6 + 0.55, 0.0, 1.0);
    vec3 water = mix(deep, mid, up);
    float sun = exp(-pow(length(vec2(p.x * 0.75, p.y - 0.75)), 2.0) * 2.4);
    water = mix(water, shallow, sun * 0.75);

    vec3 col = water;
    if (rd.y < 0.0) {
      float dist = -ro.y / rd.y;
      vec3 hit = ro + rd * dist;
      vec2 fp = hit.xz * 0.32;
      float c1 = caustic(fp, time * 0.55);
      float c2 = caustic(fp * 1.3 + 0.37, time * 0.47 + 1.7);
      float caus = (c1 * 0.65 + c2 * 0.45);
      // soften with distance so far caustics blur into the haze
      float far = clamp(dist / 14.0, 0.0, 1.0);
      caus = mix(caus, 0.25, far);
      vec3 floorCol = mix(vec3(0.10, 0.25, 0.70), vec3(0.20, 0.38, 0.85), clamp(-p.y * 1.5, 0.0, 1.0));
      floorCol += vec3(0.55, 0.72, 1.0) * caus * (1.0 - far * 0.7);
      float fog = 1.0 - exp(-dist * 0.16);
      col = mix(floorCol, water, fog);
    }

    // light shafts fanning down from the surface
    vec2 src = vec2(0.0, 1.25);
    vec2 d = p - src;
    float ang = atan(d.x, -d.y);
    float rays = noise(ang * 14.0 + time * 0.25) * 0.6 + noise(ang * 31.0 - time * 0.4) * 0.4;
    rays = pow(rays, 3.0);
    float fall = smoothstep(1.9, 0.2, length(d)) * smoothstep(-0.55, 0.25, p.y);
    col += vec3(0.45, 0.62, 1.0) * rays * fall * 0.42;

    // suspended haze and vignette
    float vig = smoothstep(1.25, 0.35, length(p * vec2(0.85, 1.0)));
    col *= mix(0.62, 1.0, vig);

    // dissolve into the white light that ends the shot
    // a burst of light from the centre; the blue edges hold until the very end
    float r = length(vec2(p.x * 0.8, p.y + 0.02));
    float glow = exp(-r * r / max(0.001, bloom * bloom * 0.35));
    float wash = smoothstep(0.75, 1.0, bloom);
    col = mix(col, vec3(0.93, 0.96, 1.0), clamp(glow * min(1.0, bloom * 1.6) + wash, 0.0, 1.0));

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function create3D(drawCircle) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true });
  } catch {
    return null;
  }
  if (!renderer.getContext()) return null;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100);
  const CAM_Z = 10;
  camera.position.set(0, 0, CAM_Z);

  const anchorMat = toon(BLUE, SHADE, WHITE, { hiAt: 0.55, rimAt: 0.86 });
  const guitarBody = toon(WHITE, new THREE.Color("#b3a9ff"), BLUE, { hiAt: 2, rimAt: 0.62 });
  const guitarNeck = toon(BLUE, SHADE, WHITE, { hiAt: 0.6, rimAt: 0.9 });

  const anchor = makeAnchor(anchorMat);
  scene.add(anchor);

  // chain wound around the shank (emblem shot)
  const link = linkGeometry(0.075);
  const wrapPts = [];
  for (let i = 0; i < 26; i++) {
    const a = i * 0.62;
    wrapPts.push(new THREE.Vector3(Math.cos(a) * 0.17, -0.62 + i * 0.058, Math.sin(a) * 0.17));
  }
  // loose end trailing off one fluke
  for (let i = 1; i < 8; i++) wrapPts.unshift(new THREE.Vector3(0.12 + i * 0.07, -0.62 - i * 0.02, 0.17 + Math.sin(i) * 0.05));
  const wrap = chainAlong(wrapPts, link, anchorMat);
  anchor.add(wrap);

  // vertical chain for the hanging shot (built along +Y from the ring)
  const hangPts = [];
  for (let i = 0; i < 60; i++) hangPts.push(new THREE.Vector3(0, 0.88 + i * 0.12, 0));
  const hang = chainAlong(hangPts, linkGeometry(0.06), anchorMat);
  anchor.add(hang);

  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.MeshBasicMaterial({ map: circleTexture(drawCircle), transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  );
  scene.add(disc);

  const seaScene = new THREE.Scene();
  const seaCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const seaMat = new THREE.ShaderMaterial({
    uniforms: { res: { value: new THREE.Vector2(1, 1) }, time: { value: 0 }, bloom: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: SEA_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  seaScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), seaMat));

  const guitar = makeGuitar(guitarBody, guitarNeck);
  scene.add(guitar);

  const flat = toon(BLUE, new THREE.Color("#1d0ce6"), WHITE, { hiAt: 2, rimAt: 0.97 });
  const windows = new THREE.MeshBasicMaterial({ color: WHITE });
  const city = makeCity(flat, windows);
  scene.add(city);
  const cityCam = new THREE.PerspectiveCamera(68, 16 / 9, 0.1, 200);

  let size = "";
  const world = new THREE.Vector3();

  function setSize(W, H, dpr) {
    const key = `${W}x${H}@${dpr}`;
    if (key === size) return;
    size = key;
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    cityCam.aspect = W / H;
    cityCam.updateProjectionMatrix();
  }

  /** Screen-space units: the height of the view at z = 0 in world units. */
  const viewH = () => 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

  function toWorld(px, py, W, H) {
    const k = viewH() / H;
    return [(px - W / 2) * k, -(py - H / 2) * k];
  }

  function project(obj, x, y, z, W, H) {
    world.set(x, y, z);
    if (obj) obj.localToWorld(world);
    world.project(camera);
    return [(world.x * 0.5 + 0.5) * W, (-world.y * 0.5 + 0.5) * H, world.z];
  }

  function show(which) {
    anchor.visible = !!which.anchor;
    wrap.visible = !!which.wrap;
    hang.visible = !!which.hang;
    disc.visible = !!which.disc;
    guitar.visible = !!which.guitar;
    city.visible = !!which.city;
  }

  return {
    canvas: renderer.domElement,
    viewH,

    /** Emblem: the anchor lying diagonally in perspective, chain wound round it. */
    emblem(W, H, dpr, t, punch) {
      setSize(W, H, dpr);
      show({ anchor: true, wrap: true, disc: true });
      camera.position.set(0, 0, CAM_Z - punch * 1.6);
      camera.lookAt(0, 0, 0);
      // arms sweep across the lower frame, shank rising toward the circle
      anchor.position.set(0.55, -0.62, 0);
      anchor.rotation.order = "XYZ";
      anchor.rotation.set(-0.95, 0.35 + Math.sin(t * 0.6) * 0.1, 0.62);
      anchor.scale.setScalar(1.9);
      disc.position.set(-0.5, 0.3, -1.2);
      disc.rotation.set(-0.2, 0.5, t * 0.35);
      disc.scale.setScalar(1.25);
      renderer.render(scene, camera);
      return project(anchor, 0, 0.78, 0.15, W, H);
    },

    /** Hanging: the anchor dangles from its chain and turns slowly. */
    hang(W, H, dpr, { x, y, swing, yaw, scale }) {
      setSize(W, H, dpr);
      show({ anchor: true, hang: true });
      camera.position.set(0, 0, CAM_Z);
      camera.lookAt(0, 0, 0);
      const [wx, wy] = toWorld(x, y, W, H);
      anchor.position.set(wx, wy, 0);
      anchor.rotation.order = "ZYX"; // turn about its own axis, then swing
      anchor.rotation.set(0, yaw, swing);
      anchor.scale.setScalar(scale);
      renderer.render(scene, camera);
      return project(anchor, 0, -0.12, 0, W, H);
    },

    /** Looking up between towers; the view slowly rolls and rises. */
    city(W, H, dpr, t) {
      setSize(W, H, dpr);
      show({ city: true });
      cityCam.position.set(0.8, 0.5 + t * 0.9, -2.5);
      const roll = -0.42 + t * 0.05;
      cityCam.up.set(-Math.sin(roll), -Math.cos(roll) * 0.2, -Math.cos(roll));
      cityCam.lookAt(-1.5, 24, 9);
      renderer.render(scene, cityCam);
    },

    /** Underwater backdrop: caustic floor, light shafts, fog. */
    sea(W, H, dpr, t, bloom) {
      setSize(W, H, dpr);
      seaMat.uniforms.res.value.set(W, H);
      seaMat.uniforms.time.value = t;
      seaMat.uniforms.bloom.value = bloom;
      renderer.render(seaScene, seaCam);
    },

    /** Guitar held in front of the floating token. */
    guitar(W, H, dpr, { x, y, size: px, yaw, roll, pitch }) {
      setSize(W, H, dpr);
      show({ guitar: true });
      camera.position.set(0, 0, CAM_Z);
      camera.lookAt(0, 0, 0);
      const [wx, wy] = toWorld(x, y, W, H);
      guitar.position.set(wx, wy, 0.4);
      guitar.rotation.set(pitch, yaw, roll);
      guitar.scale.setScalar((px / H) * viewH() / 2.3);
      renderer.render(scene, camera);
    },
  };
}
