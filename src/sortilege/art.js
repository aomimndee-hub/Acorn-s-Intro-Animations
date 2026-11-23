// Engraved line art for the Sortilege opening, drawn procedurally once at
// start-up: a Gothic column and window, a hanging lantern, books, a star map,
// a clock face, a sun, bead chains and stars, plus torn paper labels and the
// soft light layers behind them. Everything is drawn in black ink and tinted
// when used, so one drawing serves the sepia, violet and lilac scenes.
import { TAU, makeCanvas, rng, supportsFilter } from "../cutscene/util.js";

function pen(x, w) {
  x.lineWidth = w;
  x.lineCap = "round";
  x.lineJoin = "round";
  x.strokeStyle = "#000";
  x.fillStyle = "#000";
}

function stipple(x, r, x0, y0, w, h, n, size = 1.6) {
  for (let i = 0; i < n; i++) {
    x.beginPath();
    x.arc(x0 + r() * w, y0 + r() * h, size * (0.5 + r()), 0, TAU);
    x.fill();
  }
}

// ---- shared engraving strokes ---------------------------------------------------

function line(x, pts, w) {
  x.lineWidth = w;
  x.beginPath();
  pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
  x.stroke();
}

/** Parallel hatch strokes inside a band, for engraved shading. */
function hatch(x, x0, y0, x1, y1, n, len, ang, w = 1.6) {
  x.lineWidth = w;
  x.beginPath();
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0.5 : i / (n - 1);
    const px = x0 + (x1 - x0) * k;
    const py = y0 + (y1 - y0) * k;
    x.moveTo(px, py);
    x.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len);
  }
  x.stroke();
}

/** Acanthus leaf with a central vein and serrated lobes. */
function acanthus(x, cx, by, h, w, lean = 0) {
  const tip = [cx + lean * h * 0.3, by - h];
  x.beginPath();
  x.moveTo(cx - w / 2, by);
  for (let i = 1; i <= 4; i++) {
    const k = i / 4;
    const lx = cx - (w / 2) * (1 - k * 0.85) + lean * h * 0.3 * k;
    const ly = by - h * k;
    x.quadraticCurveTo(lx - w * 0.22, ly + h * 0.08, lx, ly);
  }
  x.lineTo(tip[0], tip[1]);
  for (let i = 4; i >= 1; i--) {
    const k = i / 4;
    const lx = cx + (w / 2) * (1 - k * 0.85) + lean * h * 0.3 * k;
    const ly = by - h * k;
    x.lineTo(lx, ly);
    x.quadraticCurveTo(lx + w * 0.22, ly + h * 0.08, cx + (w / 2) * (1 - (k - 0.25) * 0.85) + lean * h * 0.3 * (k - 0.25), by - h * (k - 0.25));
  }
  x.closePath();
  x.stroke();
  // vein and side veins
  x.beginPath();
  x.moveTo(cx, by);
  x.quadraticCurveTo(cx + lean * h * 0.1, by - h * 0.5, tip[0], tip[1] + h * 0.08);
  x.stroke();
  for (let i = 1; i < 4; i++) {
    const k = i / 4;
    const vx = cx + lean * h * 0.3 * k;
    const vy = by - h * k;
    x.beginPath();
    x.moveTo(vx, vy + h * 0.06);
    x.lineTo(vx - w * 0.25 * (1 - k * 0.6), vy - h * 0.02);
    x.moveTo(vx, vy + h * 0.06);
    x.lineTo(vx + w * 0.25 * (1 - k * 0.6), vy - h * 0.02);
    x.stroke();
  }
}

/** Spiral volute (scroll) ending a curve. */
function volute(x, cx, cy, r, turns, dir = 1, w = 3) {
  x.lineWidth = w;
  x.beginPath();
  for (let a = 0; a <= turns * TAU; a += 0.12) {
    const rr = r * (1 - a / (turns * TAU) * 0.85);
    const px = cx + Math.cos(a * dir) * rr;
    const py = cy + Math.sin(a * dir) * rr;
    if (a === 0) x.moveTo(px, py);
    else x.lineTo(px, py);
  }
  x.stroke();
}

// ---- chapter I: sepia architecture ---------------------------------------------------

export function column() {
  const W = 420;
  const H = 1700;
  const c = makeCanvas(W, H);
  const x = c.getContext("2d");
  const r = rng(5);
  pen(x, 4);
  const cx = W / 2;
  // pointed vault ribs springing from the abacus (double lines)
  for (const side of [-1, 1]) {
    for (const off of [0, 22, 40]) {
      x.lineWidth = off === 22 ? 2.5 : 5;
      x.beginPath();
      x.moveTo(cx + side * (120 - off), 300);
      x.bezierCurveTo(cx + side * (140 - off), 200, cx + side * (150 - off * 0.6), 90, cx + side * (210 - off * 0.4), -20);
      x.stroke();
    }
  }
  // abacus: two slabs
  pen(x, 5);
  x.strokeRect(cx - 150, 290, 300, 26);
  x.strokeRect(cx - 138, 316, 276, 22);
  // bell of the capital with corner volutes
  x.beginPath();
  x.moveTo(cx - 120, 338);
  x.bezierCurveTo(cx - 135, 420, cx - 95, 470, cx - 78, 500);
  x.lineTo(cx + 78, 500);
  x.bezierCurveTo(cx + 95, 470, cx + 135, 420, cx + 120, 338);
  x.stroke();
  volute(x, cx - 112, 372, 30, 1.6, 1, 4);
  volute(x, cx + 112, 372, 30, 1.6, -1, 4);
  // central acanthus with two side leaves, and berry clusters below
  pen(x, 3.2);
  acanthus(x, cx, 492, 150, 82, 0);
  acanthus(x, cx - 58, 496, 118, 60, -0.6);
  acanthus(x, cx + 58, 496, 118, 60, 0.6);
  x.lineWidth = 2.5;
  for (const bx of [cx - 70, cx + 70]) {
    for (let i = 0; i < 6; i++) {
      x.beginPath();
      x.arc(bx + (r() - 0.5) * 30, 470 + (r() - 0.5) * 22, 7, 0, TAU);
      x.stroke();
    }
  }
  // necking rings
  pen(x, 5);
  x.strokeRect(cx - 82, 500, 164, 18);
  x.strokeRect(cx - 76, 518, 152, 12);
  // shaft: double outer lines and a fillet line, tapering slightly
  const shaft = [[-70, -4], [-56, -2.5], [-40, -1.5], [40, -1.5], [56, -2.5], [70, -4]];
  for (const [o, lean] of shaft) {
    x.lineWidth = Math.abs(o) === 70 ? 5.5 : Math.abs(o) === 56 ? 2.5 : 3.5;
    x.beginPath();
    x.moveTo(cx + o, 532);
    x.lineTo(cx + o * 0.92 + lean, H);
    x.stroke();
  }
  return c;
}

export function gothicWindow() {
  const W = 1300;
  const H = 1500;
  const c = makeCanvas(W, H);
  const x = c.getContext("2d");
  const r = rng(17);
  pen(x, 6);
  const pointed = (l, rr, top, base, w) => {
    const span = rr - l;
    x.lineWidth = w;
    x.beginPath();
    x.moveTo(l, base);
    x.lineTo(l, top + span * 0.65);
    x.bezierCurveTo(l, top + span * 0.15, l + span * 0.3, top, l + span / 2, top - span * 0.08);
    x.bezierCurveTo(rr - span * 0.3, top, rr, top + span * 0.15, rr, top + span * 0.65);
    x.lineTo(rr, base);
    x.stroke();
  };
  // outer frame: a big pointed arch, triple moulding, with a scroll at the left springer
  pointed(250, 1150, 120, 1420, 9);
  pointed(285, 1115, 160, 1410, 4);
  pointed(320, 1080, 200, 1400, 7);
  volute(x, 228, 470, 30, 1.7, 1, 5);
  // three lancets
  const lancets = [[345, 565], [590, 810], [835, 1055]];
  for (const [l, rr] of lancets) {
    pointed(l, rr, 560, 1330, 8);
    pointed(l + 22, rr - 22, 595, 1320, 3);
  }
  // branching tracery above the lancets: Y-shaped mullions with cusped (thorny) foils
  pen(x, 7);
  for (const mx of [577, 822]) {
    x.beginPath();
    x.moveTo(mx, 600);
    x.bezierCurveTo(mx, 470, mx - 60, 400, mx - 140, 300);
    x.moveTo(mx, 600);
    x.bezierCurveTo(mx, 470, mx + 60, 400, mx + 140, 300);
    x.stroke();
  }
  pen(x, 4);
  for (let i = 0; i < 5; i++) {
    const fx = 420 + i * 140;
    const fy = 330 + (i % 2) * 60;
    // cusps: small inward thorns along a lobed outline
    x.beginPath();
    for (let a = 0; a <= TAU + 0.01; a += TAU / 36) {
      const lobes = 3;
      const rr = 48 + 14 * Math.cos(a * lobes) - (Math.round(a / (TAU / lobes)) === a / (TAU / lobes) ? 10 : 0);
      const px = fx + Math.cos(a - Math.PI / 2) * rr;
      const py = fy + Math.sin(a - Math.PI / 2) * rr * 1.25;
      if (a === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    x.stroke();
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU + Math.PI / 3 - Math.PI / 2;
      line(x, [[fx + Math.cos(a) * 32, fy + Math.sin(a) * 40], [fx + Math.cos(a) * 52, fy + Math.sin(a) * 65]], 3);
    }
  }
  // glass: groups of short diagonal hatch strokes
  for (let i = 0; i < 16; i++) {
    const [l, rr] = lancets[i % 3];
    const gx = l + 40 + r() * (rr - l - 120);
    const gy = 700 + r() * 560;
    const n = 3 + Math.floor(r() * 3);
    hatch(x, gx, gy, gx + 18, gy + 14, n, 60 + r() * 40, -0.55, 1.6);
  }
  // brick quoins on both sides, stippled toward the window
  pen(x, 5);
  for (let i = 0; i < 13; i++) {
    const by = 420 + i * 78;
    for (const side of [-1, 1]) {
      const bw = i % 2 ? 110 : 80;
      const bx = side < 0 ? 250 - bw : 1150;
      x.strokeRect(bx, by, bw, 70);
      const sx = side < 0 ? bx + bw - 34 : bx + 4;
      for (let k = 0; k < 30; k++) {
        x.beginPath();
        x.arc(sx + r() * 30, by + 4 + r() * 62, 1.6 + r() * 1.4, 0, TAU);
        x.fill();
      }
    }
  }
  // sill with dotted shade
  x.strokeRect(220, 1400, 960, 34);
  x.strokeRect(200, 1434, 1000, 26);
  for (let k = 0; k < 160; k++) {
    x.beginPath();
    x.arc(205 + r() * 990, 1438 + r() * 18, 1.5 + r() * 1.2, 0, TAU);
    x.fill();
  }
  return c;
}

/** Heavy black ironwork lantern: scroll bracket, knobbed rod, crown, flat shade, bulb. */
export function lantern() {
  const W = 700;
  const H = 1150;
  const c = makeCanvas(W, H);
  const x = c.getContext("2d");
  pen(x, 10);
  const cx = 250;
  // scroll bracket arriving from the upper right, with a filled rope-twist band
  x.beginPath();
  x.moveTo(W - 20, 60);
  x.bezierCurveTo(W - 200, 40, 420, 150, cx + 40, 130);
  x.stroke();
  x.lineWidth = 22;
  x.beginPath();
  x.moveTo(W - 30, 70);
  x.bezierCurveTo(W - 180, 70, 470, 160, 360, 150);
  x.stroke();
  x.globalCompositeOperation = "destination-out";
  x.lineWidth = 3;
  for (let i = 0; i < 14; i++) {
    const k = i / 14;
    const px = (W - 30) * (1 - k) + 360 * k;
    const py = 70 * (1 - k) + 150 * k + Math.sin(k * Math.PI) * 30;
    x.beginPath();
    x.moveTo(px - 6, py - 9);
    x.lineTo(px + 6, py + 9);
    x.stroke();
  }
  x.globalCompositeOperation = "source-over";
  volute(x, W - 70, 150, 50, 1.6, -1, 10);
  volute(x, cx + 70, 210, 34, 1.5, 1, 8);
  // cross bar with end curls
  x.lineWidth = 12;
  line(x, [[cx - 130, 130], [cx + 120, 130]], 12);
  volute(x, cx - 140, 170, 32, 1.4, 1, 8);
  // rod with knobs and balusters (filled)
  x.fillStyle = "#000";
  x.fillRect(cx - 9, 130, 18, 470);
  for (const [y, rw, rh] of [[200, 28, 22], [270, 22, 40], [340, 34, 30], [420, 22, 50], [500, 30, 24]]) {
    x.beginPath();
    x.ellipse(cx, y, rw, rh, 0, 0, TAU);
    x.fill();
  }
  // crown: castellated, dark with window cut-outs
  x.beginPath();
  x.moveTo(cx - 120, 680);
  for (let i = 0; i <= 8; i++) x.lineTo(cx - 120 + i * 30, i % 2 ? 610 : 640);
  x.lineTo(cx + 120, 680);
  x.closePath();
  x.fill();
  x.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 4; i++) x.fillRect(cx - 95 + i * 52, 648, 24, 22);
  x.globalCompositeOperation = "source-over";
  for (const [y, w2, h2] of [[690, 110, 18], [718, 92, 16], [744, 120, 18]]) x.fillRect(cx - w2, y, w2 * 2, h2);
  // flat dome shade with hatched shading and a thin rim
  x.beginPath();
  x.moveTo(cx - 90, 770);
  x.quadraticCurveTo(cx - 200, 800, cx - 300, 860);
  x.lineTo(cx + 300, 860);
  x.quadraticCurveTo(cx + 200, 800, cx + 90, 770);
  x.closePath();
  x.lineWidth = 7;
  x.stroke();
  hatch(x, cx - 220, 845, cx - 60, 800, 9, 46, -0.15, 3);
  hatch(x, cx + 60, 800, cx + 220, 845, 9, 46, 0.15 + Math.PI, 3);
  x.fillRect(cx - 320, 858, 640, 12);
  // socket and bulb
  x.fillRect(cx - 34, 870, 68, 40);
  x.beginPath();
  x.moveTo(cx - 26, 910);
  x.bezierCurveTo(cx - 60, 960, cx - 50, 1060, cx, 1080);
  x.bezierCurveTo(cx + 50, 1060, cx + 60, 960, cx + 26, 910);
  x.lineWidth = 7;
  x.stroke();
  line(x, [[cx - 8, 930], [cx - 10, 1040]], 3);
  line(x, [[cx + 8, 930], [cx + 10, 1040]], 3);
  return c;
}

// ---- chapter II: the violet library ---------------------------------------------------

export function books() {
  const W = 1100;
  const H = 1000;
  const c = makeCanvas(W, H);
  const x = c.getContext("2d");
  const r = rng(31);
  pen(x, 6);
  // the big tome in perspective: cover parallelogram + page block + spine
  const A = [180, 520];
  const B = [620, 300];
  const C = [960, 520];
  const D = [500, 770];
  const drop = 150;
  line(x, [A, B, C, D, A], 7);
  line(x, [A, [A[0], A[1] + drop], [D[0], D[1] + drop], D], 7);
  line(x, [D, [D[0], D[1] + drop], [C[0], C[1] + drop], C], 7);
  // page edges on both visible sides
  pen(x, 2.5);
  for (let i = 1; i < 9; i++) {
    const k = i / 9;
    line(x, [[A[0] + 14, A[1] + drop * k], [D[0] - 6, D[1] + drop * k]], 2.5);
    line(x, [[D[0] + 8, D[1] + drop * k], [C[0] - 14, C[1] + drop * k]], 2);
  }
  // rounded spine bulge on the left with raised bands
  pen(x, 6);
  x.beginPath();
  x.moveTo(A[0], A[1]);
  x.bezierCurveTo(A[0] - 50, A[1] + 30, A[0] - 50, A[1] + drop - 20, A[0], A[1] + drop);
  x.stroke();
  // border band around the cover with zig-zag tooling
  const inset = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  const center = [(A[0] + C[0]) / 2, (B[1] + D[1]) / 2];
  const ring = [A, B, C, D].map((p) => inset(p, center, 0.12));
  line(x, [...ring, ring[0]], 3.5);
  x.lineWidth = 2.5;
  x.beginPath();
  for (let s = 0; s < 4; s++) {
    const p = ring[s];
    const q = ring[(s + 1) % 4];
    for (let i = 0; i < 14; i++) {
      const a = inset(p, q, i / 14);
      const b = inset(p, q, (i + 0.5) / 14);
      const m = inset([b[0], b[1]], center, 0.04);
      x.moveTo(a[0], a[1]);
      x.lineTo(m[0], m[1]);
    }
  }
  x.stroke();
  // ornate cross with trefoil ends, and foliage scrolls around it
  pen(x, 9);
  const cx = center[0];
  const cy = center[1];
  line(x, [[cx - 140, cy + 60], [cx + 140, cy - 60]], 9);
  line(x, [[cx - 40, cy - 120], [cx + 40, cy + 120]], 9);
  pen(x, 4);
  for (const [ex, ey] of [[cx - 140, cy + 60], [cx + 140, cy - 60], [cx - 40, cy - 120], [cx + 40, cy + 120]]) {
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU;
      x.beginPath();
      x.arc(ex + Math.cos(a) * 14, ey + Math.sin(a) * 14, 12, 0, TAU);
      x.stroke();
    }
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + r() * 0.3;
    const rr = 150 + r() * 70;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr * 0.55;
    volute(x, px, py, 14 + r() * 12, 1.2, i % 2 ? 1 : -1, 3.5);
    line(x, [[px, py], [px + (r() - 0.5) * 50, py + (r() - 0.5) * 30]], 3);
  }
  // metal corner pieces and clasps on the fore-edge
  pen(x, 5);
  for (const p of [A, B, C, D]) {
    const q = inset(p, center, 0.09);
    x.beginPath();
    x.arc(q[0], q[1], 22, 0, TAU);
    x.stroke();
  }
  for (const k of [0.3, 0.7]) {
    const p = inset(D, C, k);
    x.beginPath();
    x.moveTo(p[0], p[1] - 8);
    x.bezierCurveTo(p[0] + 26, p[1] + 10, p[0] + 26, p[1] + drop - 20, p[0] + 4, p[1] + drop + 8);
    x.lineWidth = 10;
    x.stroke();
  }
  // two books standing behind, with banded spines
  pen(x, 6);
  for (const [bx, by, bw, bh] of [[560, 40, 150, 250], [700, 80, 120, 210]]) {
    x.strokeRect(bx, by, bw, bh);
    x.beginPath();
    x.moveTo(bx, by);
    x.lineTo(bx + 40, by - 30);
    x.lineTo(bx + bw + 40, by - 30);
    x.lineTo(bx + bw, by);
    x.moveTo(bx + bw + 40, by - 30);
    x.lineTo(bx + bw + 40, by + bh - 30);
    x.lineTo(bx + bw, by + bh);
    x.stroke();
    for (const k of [0.2, 0.5, 0.8]) line(x, [[bx, by + bh * k], [bx + bw, by + bh * k]], 4);
  }
  return c;
}

export function starMap() {
  const W = 1200;
  const H = 720;
  const c = makeCanvas(W, H);
  const x = c.getContext("2d");
  const r = rng(41);
  // torn parchment, ragged at the top
  x.beginPath();
  x.moveTo(30, 230);
  for (let i = 0; i <= 50; i++) {
    const k = i / 50;
    x.lineTo(30 + k * 1160, 220 - Math.sin(k * Math.PI) * 120 + (r() - 0.5) * 28 + (k > 0.62 ? -40 : 0));
  }
  x.lineTo(1190, 720);
  x.lineTo(0, 720);
  x.closePath();
  const g = x.createLinearGradient(0, 100, 0, 720);
  g.addColorStop(0, "#f1ead8");
  g.addColorStop(1, "#ddd2b8");
  x.fillStyle = g;
  x.fill();
  x.save();
  x.clip();
  const ink = "#33313d";
  x.strokeStyle = ink;
  x.fillStyle = ink;
  x.lineCap = "round";
  // teal edge lines near the left
  x.strokeStyle = "#2b7d82";
  x.lineWidth = 4;
  for (const o of [0, 18]) {
    x.beginPath();
    x.arc(1300 + o, 1500, 1260 + o, Math.PI * 1.12, Math.PI * 1.3);
    x.stroke();
  }
  x.strokeStyle = ink;
  // concentric declination circles around the pole
  const pole = [930, 330];
  for (let k = 1; k <= 5; k++) {
    x.lineWidth = k === 3 ? 3.5 : 2.4;
    x.beginPath();
    x.arc(pole[0], pole[1], k * 150, 0, TAU);
    x.stroke();
  }
  // hour lines radiating from the pole
  x.lineWidth = 2.4;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    line(x, [[pole[0] + Math.cos(a) * 40, pole[1] + Math.sin(a) * 40], [pole[0] + Math.cos(a) * 1400, pole[1] + Math.sin(a) * 1400]], 2.4);
  }
  // dashed ecliptic and constellation boundaries
  x.setLineDash([16, 12]);
  x.lineWidth = 3;
  x.beginPath();
  x.ellipse(560, 430, 560, 300, -0.25, 0, TAU);
  x.stroke();
  x.beginPath();
  x.ellipse(860, 280, 170, 110, 0.3, 0, TAU);
  x.stroke();
  x.setLineDash([]);
  // stars with Greek letters, joined into figures
  const greek = "αβγδεζηθικλμ";
  const pts = [];
  for (let i = 0; i < 26; i++) pts.push([100 + r() * 1050, 230 + r() * 470, 3 + r() * 6]);
  x.lineWidth = 2.2;
  x.beginPath();
  for (let i = 0; i < pts.length - 1; i += 2) {
    x.moveTo(pts[i][0], pts[i][1]);
    x.lineTo(pts[i + 1][0], pts[i + 1][1]);
  }
  x.stroke();
  x.font = "italic 26px Georgia, serif";
  pts.forEach(([px, py, s], i) => {
    if (i % 3 === 0) {
      // a small star cross for the brighter ones
      line(x, [[px - s * 2, py], [px + s * 2, py]], 2);
      line(x, [[px, py - s * 2], [px, py + s * 2]], 2);
    }
    x.beginPath();
    x.arc(px, py, s * 0.8, 0, TAU);
    x.fill();
    x.fillText(greek[i % greek.length], px + 10, py - 8);
  });
  // labels set along the grid
  const label = (s, px, py, rot, size) => {
    x.save();
    x.translate(px, py);
    x.rotate(rot);
    x.font = `bold ${size}px Georgia, serif`;
    x.fillText(s, 0, 0);
    x.restore();
  };
  label("URSA", 830, 300, 1.25, 34);
  label("MINOR", 770, 280, 1.25, 34);
  label("BOOTES", 430, 420, 1.45, 36);
  label("DRACO", 760, 600, 0.55, 36);
  label("Former", 690, 520, 0.9, 26);
  label("Pole Star", 660, 545, 0.9, 26);
  label("XV", 280, 640, -1.4, 34);
  label("70°", 900, 640, 0.3, 26);
  x.restore();
  return c;
}

// ---- chapter III: the lilac sky ---------------------------------------------------------

export function clock() {
  const S = 1100;
  const c = makeCanvas(S, S);
  const x = c.getContext("2d");
  const R = S / 2 - 20;
  x.translate(S / 2, S / 2);
  pen(x, 8);
  // outer rings with a band of dashes between them
  for (const k of [1, 0.9, 0.62]) {
    x.beginPath();
    x.arc(0, 0, R * k, 0, TAU);
    x.lineWidth = k === 1 ? 9 : 7;
    x.stroke();
  }
  x.lineWidth = 12;
  x.setLineDash([26, 14]);
  x.beginPath();
  x.arc(0, 0, R * 0.95, 0, TAU);
  x.stroke();
  x.setLineDash([]);
  // column-like roman numerals: bars with serif caps
  const numeral = (s, a) => {
    x.save();
    x.rotate(a);
    x.translate(0, -R * 0.77);
    const n = s.length;
    const bw = 18;
    const gap = 16;
    const total = n * bw + (n - 1) * gap;
    let px = -total / 2;
    for (const ch of s) {
      if (ch === "I") {
        x.fillRect(px, -55, bw, 110);
        x.fillRect(px - 8, -62, bw + 16, 10);
        x.fillRect(px - 8, 52, bw + 16, 10);
      } else if (ch === "V") {
        x.beginPath();
        x.moveTo(px - 10, -60);
        x.lineTo(px + bw / 2, 60);
        x.lineTo(px + bw + 10, -60);
        x.lineWidth = 12;
        x.stroke();
      } else {
        x.beginPath();
        x.moveTo(px - 10, -60);
        x.lineTo(px + bw + 10, 60);
        x.moveTo(px + bw + 10, -60);
        x.lineTo(px - 10, 60);
        x.lineWidth = 12;
        x.stroke();
      }
      px += bw + gap;
    }
    x.restore();
  };
  ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"].forEach((s, i) => numeral(s, (i / 12) * TAU));
  // small arabic minutes outside the ring
  x.font = "bold 46px Georgia, serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU - Math.PI / 2 + 0.26;
    x.save();
    x.translate(Math.cos(a) * R * 1.07, Math.sin(a) * R * 1.07);
    x.rotate(a + Math.PI / 2);
    x.fillText(String(((i * 5 + 5) % 60) || 60), 0, 0);
    x.restore();
  }
  // long spear hands with a lozenge
  const hand = (a, len, w) => {
    x.save();
    x.rotate(a);
    x.lineWidth = w;
    line(x, [[0, 40], [0, -len]], w);
    x.beginPath();
    x.moveTo(0, -len - 60);
    x.lineTo(16, -len + 4);
    x.lineTo(0, -len + 20);
    x.lineTo(-16, -len + 4);
    x.closePath();
    x.fill();
    x.beginPath();
    x.ellipse(0, -len * 0.45, 14, 30, 0, 0, TAU);
    x.stroke();
    x.restore();
  };
  hand(-0.45, R * 0.5, 6);
  hand(0.55, R * 0.36, 8);
  x.beginPath();
  x.arc(0, 0, 18, 0, TAU);
  x.fill();
  return c;
}

export function sun() {
  const S = 1100;
  const c = makeCanvas(S, S);
  const x = c.getContext("2d");
  const R = S / 2 - 10;
  x.translate(S / 2, S / 2);
  const r = rng(61);
  pen(x, 6);
  x.beginPath();
  x.arc(0, 0, R * 0.3, 0, TAU);
  x.stroke();
  x.beginPath();
  x.arc(0, 0, R * 0.36, 0, TAU);
  x.stroke();
  // short radial hatching inside the rim
  x.lineWidth = 2.5;
  x.beginPath();
  for (let i = 0; i < 160; i++) {
    const a = (i / 160) * TAU;
    x.moveTo(Math.cos(a) * R * 0.24, Math.sin(a) * R * 0.24);
    x.lineTo(Math.cos(a) * R * 0.29, Math.sin(a) * R * 0.29);
  }
  x.stroke();
  // wavy flame hair between the rays
  x.lineWidth = 3.5;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * TAU + (r() - 0.5) * 0.05;
    const r0 = R * 0.38;
    const r1 = R * (0.5 + r() * 0.08);
    x.beginPath();
    for (let k = 0; k <= 10; k++) {
      const rr = r0 + (r1 - r0) * (k / 10);
      const wob = Math.sin(k * 1.4 + i) * 0.035;
      const px = Math.cos(a + wob) * rr;
      const py = Math.sin(a + wob) * rr;
      if (k === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    x.stroke();
  }
  // eight long rays with an inner line, sparkle ticks at the tips
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.18;
    x.save();
    x.rotate(a);
    const len = i % 2 ? R * 0.85 : R * 0.98;
    line(x, [[R * 0.4, -46], [len, 0], [R * 0.4, 46]], 6);
    line(x, [[R * 0.45, -12], [len * 0.88, 0]], 3);
    for (let k = -1; k <= 1; k++) line(x, [[len + 8, k * 14], [len + 34, k * 30]], 3);
    x.restore();
  }
  return c;
}

/** Two strands of beads joined by scroll ornaments, along a gentle S-curve. */
export function chain() {
  const W = 420;
  const H = 1700;
  const c = makeCanvas(W, H);
  const x = c.getContext("2d");
  pen(x, 4);
  const path = (s, off) => [210 + Math.sin(s * 2.6) * 110 + off, 40 + s * (H - 80)];
  for (const off of [-16, 16]) {
    for (let i = 0; i <= 120; i++) {
      const s = i / 120;
      const [px, py] = path(s, off);
      x.beginPath();
      x.arc(px, py, i % 4 === 0 ? 7 : 4.5, 0, TAU);
      x.stroke();
    }
  }
  // scroll ornaments where the strands meet
  for (let i = 1; i < 8; i++) {
    const [px, py] = path(i / 8, 0);
    x.lineWidth = 4;
    x.beginPath();
    x.ellipse(px, py, 26, 34, 0, 0, TAU);
    x.stroke();
    volute(x, px - 30, py - 30, 18, 1.4, 1, 3.5);
    volute(x, px + 30, py + 30, 18, 1.4, -1, 3.5);
    x.beginPath();
    x.moveTo(px, py - 34);
    x.lineTo(px, py - 60);
    x.moveTo(px - 12, py - 50);
    x.lineTo(px + 12, py - 50);
    x.stroke();
  }
  return c;
}

export function star5() {
  const S = 320;
  const c = makeCanvas(S, S);
  const x = c.getContext("2d");
  x.translate(S / 2, S / 2);
  for (const [k, w] of [[1, 9], [0.78, 4]]) {
    pen(x, w);
    x.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU - Math.PI / 2;
      const rr = (i % 2 ? 52 : 130) * k;
      x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    x.closePath();
    x.stroke();
  }
  return c;
}

/** Tint a black-ink drawing to a colour. */
export function inked(src, color) {
  const c = makeCanvas(src.width, src.height);
  const x = c.getContext("2d");
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = "source-in";
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

/** A soft glow version of a drawing (for the lilac scene's luminous lines). */
export function glowing(src, color) {
  const pad = 40;
  const c = makeCanvas(src.width + pad * 2, src.height + pad * 2);
  const x = c.getContext("2d");
  const tinted = inked(src, color);
  if (supportsFilter) {
    x.filter = "blur(10px)";
    x.drawImage(tinted, pad, pad);
    x.filter = "none";
  }
  x.drawImage(tinted, pad, pad);
  return c;
}

/** Aged paper strip with torn edges, sized to a line of text. */
export function paperStrip(w, h, seed, tone = "#e7d2a6") {
  const c = makeCanvas(w, h);
  const x = c.getContext("2d");
  const r = rng(seed);
  x.beginPath();
  x.moveTo(r() * 10, h * 0.12);
  for (let i = 1; i <= 30; i++) x.lineTo((i / 30) * w, h * 0.06 + r() * h * 0.14);
  x.lineTo(w - r() * 12, h * 0.9);
  for (let i = 30; i >= 0; i--) x.lineTo((i / 30) * w, h * 0.84 + r() * h * 0.14);
  x.closePath();
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, tone);
  g.addColorStop(0.5, "#f1e2c0");
  g.addColorStop(1, "#d8bc88");
  x.fillStyle = g;
  x.fill();
  x.save();
  x.clip();
  // stains and fibres
  for (let i = 0; i < 40; i++) {
    const px = r() * w;
    const py = r() * h;
    const rr = 6 + r() * 40;
    const sg = x.createRadialGradient(px, py, 0, px, py, rr);
    sg.addColorStop(0, `rgba(120,80,30,${0.05 + r() * 0.12})`);
    sg.addColorStop(1, "rgba(120,80,30,0)");
    x.fillStyle = sg;
    x.fillRect(px - rr, py - rr, rr * 2, rr * 2);
  }
  x.restore();
  x.strokeStyle = "rgba(90,60,20,0.35)";
  x.lineWidth = 1.5;
  x.stroke();
  return c;
}

/** Tiny flower ornament for the second label. */
export function flower(size = 64) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  x.translate(size / 2, size / 2);
  x.strokeStyle = "#3b2e20";
  x.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    x.save();
    x.rotate((i / 5) * TAU);
    x.beginPath();
    x.ellipse(0, -size * 0.2, size * 0.1, size * 0.18, 0, 0, TAU);
    x.stroke();
    x.restore();
  }
  x.beginPath();
  x.moveTo(0, size * 0.1);
  x.quadraticCurveTo(size * 0.1, size * 0.3, -size * 0.05, size * 0.48);
  x.stroke();
  return c;
}

export function bokeh(size = 256) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d");
  const R = size / 2;
  const g = x.createRadialGradient(R, R, 0, R, R, R);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.55, "rgba(255,255,255,0.55)");
  g.addColorStop(0.8, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  return c;
}

export function buildArt() {
  const col = column();
  const win = gothicWindow();
  const lamp = lantern();
  return {
    column: inked(col, "#2b1d10"),
    columnFaint: inked(col, "#5a4630"),
    window: inked(win, "#2b1d10"),
    lantern: inked(lamp, "#24170c"),
    lanternLight: inked(lamp, "#e9e2f5"),
    books: inked(books(), "#e9e2f5"),
    starMap: starMap(),
    clock: glowing(clock(), "#f1d9ff"),
    sun: glowing(sun(), "#f1d9ff"),
    chain: glowing(chain(), "#f6e6ff"),
    star5: glowing(star5(), "#f6e6ff"),
    paper1: paperStrip(900, 150, 3),
    paper2: paperStrip(1300, 150, 7, "#efe4cf"),
    flower: flower(),
    bokeh: bokeh(),
  };
}
