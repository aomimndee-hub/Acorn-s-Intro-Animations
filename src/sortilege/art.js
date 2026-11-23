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

/** Acanthus-style leaf curl. */
function leaf(x, cx, cy, s, dir) {
  x.beginPath();
  x.moveTo(cx, cy + s);
  x.bezierCurveTo(cx + dir * s * 0.9, cy + s * 0.4, cx + dir * s * 0.9, cy - s * 0.6, cx + dir * s * 0.2, cy - s);
  x.bezierCurveTo(cx + dir * s * 0.55, cy - s * 0.4, cx + dir * s * 0.25, cy + s * 0.2, cx, cy + s);
  x.stroke();
  x.beginPath();
  x.arc(cx + dir * s * 0.35, cy - s * 0.75, s * 0.22, 0, TAU);
  x.stroke();
}

export function column() {
  const W = 300;
  const H = 1500;
  const c = makeCanvas(W, H);
  const x = c.getContext("2d");
  x.scale(1, 1);
  pen(x, 7);
  // abacus and capital
  x.strokeRect(40, 40, W - 80, 40);
  x.beginPath();
  x.moveTo(60, 80);
  x.bezierCurveTo(40, 150, 90, 220, 100, 250);
  x.lineTo(W - 100, 250);
  x.bezierCurveTo(W - 90, 220, W - 40, 150, W - 60, 80);
  x.stroke();
  pen(x, 5);
  for (let i = 0; i < 5; i++) leaf(x, 85 + i * 32, 160, 34, i % 2 ? 1 : -1);
  x.beginPath();
  x.moveTo(95, 255);
  x.lineTo(W - 95, 255);
  x.moveTo(95, 272);
  x.lineTo(W - 95, 272);
  x.stroke();
  // fluted shaft
  pen(x, 7);
  for (const off of [0, 18, 34]) {
    x.beginPath();
    x.moveTo(100 + off, 275);
    x.lineTo(100 + off - 6, H);
    x.moveTo(W - 100 - off, 275);
    x.lineTo(W - 100 - off + 6, H);
    x.stroke();
  }
  // vaulting ribs springing from the top
  pen(x, 4);
  x.beginPath();
  x.moveTo(50, 40);
  x.quadraticCurveTo(10, -60, -40, -140);
  x.moveTo(W - 50, 40);
  x.quadraticCurveTo(W - 10, -60, W + 40, -140);
  x.stroke();
  return c;
}

export function gothicWindow() {
  const W = 1100;
  const H = 1400;
  const c = makeCanvas(W, H);
  const x = c.getContext("2d");
  const r = rng(17);
  const arch = (l, rr, top, base, w) => {
    const span = rr - l;
    x.beginPath();
    x.moveTo(l, base);
    x.lineTo(l, top + span * 0.55);
    x.quadraticCurveTo(l, top, l + span / 2, top - span * 0.05);
    x.quadraticCurveTo(rr, top, rr, top + span * 0.55);
    x.lineTo(rr, base);
    x.lineWidth = w;
    x.stroke();
  };
  pen(x, 10);
  arch(210, 1000, 130, 1350, 11);
  arch(250, 960, 175, 1340, 6);
  // lancets with a mullion between them
  pen(x, 8);
  arch(290, 600, 470, 1290, 8);
  arch(640, 930, 470, 1290, 8);
  arch(310, 580, 500, 1290, 4);
  arch(660, 910, 500, 1290, 4);
  // tracery: a quatrefoil in a roundel
  x.beginPath();
  x.arc(615, 330, 120, 0, TAU);
  x.lineWidth = 5;
  x.stroke();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    x.beginPath();
    x.arc(615 + Math.cos(a) * 55, 330 + Math.sin(a) * 55, 52, 0, TAU);
    x.lineWidth = 3;
    x.stroke();
  }
  // vines curling over the tracery
  pen(x, 5);
  for (let i = 0; i < 9; i++) {
    const sx = 300 + r() * 600;
    const sy = 200 + r() * 260;
    x.beginPath();
    x.moveTo(sx, sy);
    x.bezierCurveTo(sx + (r() - 0.5) * 160, sy + (r() - 0.5) * 120, sx + (r() - 0.5) * 160, sy + (r() - 0.5) * 120, sx + (r() - 0.5) * 140, sy + (r() - 0.5) * 140);
    x.stroke();
  }
  // glass glints
  pen(x, 2);
  for (let i = 0; i < 14; i++) {
    const lx = 320 + (i % 2) * 340 + r() * 220;
    const ly = 650 + r() * 560;
    x.beginPath();
    x.moveTo(lx, ly);
    x.lineTo(lx + 40 + r() * 50, ly - 70 - r() * 60);
    x.stroke();
  }
  // brick quoins down the left side with stippled shading
  pen(x, 6);
  for (let i = 0; i < 12; i++) {
    const by = 300 + i * 88;
    const bw = i % 2 ? 120 : 90;
    x.strokeRect(210 - bw, by, bw, 80);
    stipple(x, r, 210 - bw + 6, by + 6, bw * 0.45, 68, 26);
  }
  // sill
  x.strokeRect(150, 1340, 900, 40);
  stipple(x, r, 160, 1345, 880, 30, 120, 1.4);
  return c;
}

export function lantern() {
  const W = 520;
  const H = 1000;
  const c = makeCanvas(W, H);
  const x = c.getContext("2d");
  pen(x, 8);
  // scroll bracket
  x.beginPath();
  x.moveTo(20, 60);
  x.bezierCurveTo(160, 20, 260, 60, 260, 150);
  x.stroke();
  x.beginPath();
  for (let a = 0; a < TAU * 1.6; a += 0.1) {
    const rr = 38 - a * 5;
    const px = 95 + Math.cos(a) * rr;
    const py = 95 + Math.sin(a) * rr;
    if (a === 0) x.moveTo(px, py);
    else x.lineTo(px, py);
  }
  x.stroke();
  // chain rod
  x.beginPath();
  x.moveTo(260, 150);
  x.lineTo(260, 420);
  x.stroke();
  for (let y = 170; y < 410; y += 34) {
    x.beginPath();
    x.ellipse(260, y, 10, 15, 0, 0, TAU);
    x.stroke();
  }
  // crown
  x.beginPath();
  x.moveTo(180, 470);
  for (let i = 0; i <= 6; i++) x.lineTo(180 + i * 26.6, i % 2 ? 430 : 470);
  x.stroke();
  x.strokeRect(180, 470, 160, 40);
  x.strokeRect(195, 510, 130, 60);
  for (let i = 0; i < 6; i++) {
    x.beginPath();
    x.moveTo(205 + i * 22, 515);
    x.lineTo(205 + i * 22, 565);
    x.stroke();
  }
  // shade
  x.beginPath();
  x.moveTo(205, 575);
  x.quadraticCurveTo(160, 640, 60, 690);
  x.quadraticCurveTo(260, 740, 460, 690);
  x.quadraticCurveTo(360, 640, 315, 575);
  x.closePath();
  x.stroke();
  x.beginPath();
  x.ellipse(260, 690, 200, 22, 0, 0, TAU);
  x.stroke();
  // bulb
  x.beginPath();
  x.moveTo(240, 712);
  x.lineTo(240, 760);
  x.bezierCurveTo(200, 800, 220, 880, 260, 890);
  x.bezierCurveTo(300, 880, 320, 800, 280, 760);
  x.lineTo(280, 712);
  x.stroke();
  pen(x, 2);
  for (let i = 0; i < 3; i++) {
    x.beginPath();
    x.moveTo(250 + i * 10, 790);
    x.lineTo(250 + i * 10, 860);
    x.stroke();
  }
  return c;
}

export function books() {
  const W = 1000;
  const H = 900;
  const c = makeCanvas(W, H);
  const x = c.getContext("2d");
  const r = rng(31);
  const tome = (ox, oy, w, h, depth, ornate) => {
    pen(x, 8);
    // front cover (slanted), spine curve on the left, page block below
    x.beginPath();
    x.moveTo(ox, oy);
    x.lineTo(ox + w, oy - w * 0.22);
    x.lineTo(ox + w + h * 0.35, oy - w * 0.22 + h);
    x.lineTo(ox + h * 0.35, oy + h);
    x.closePath();
    x.stroke();
    x.beginPath();
    x.moveTo(ox, oy);
    x.bezierCurveTo(ox - depth * 0.7, oy + h * 0.1, ox - depth * 0.6 + h * 0.3, oy + h + depth * 0.2, ox + h * 0.35, oy + h + depth * 0.45);
    x.stroke();
    x.beginPath();
    x.moveTo(ox + h * 0.35, oy + h);
    x.lineTo(ox + h * 0.35, oy + h + depth * 0.45);
    x.lineTo(ox + w + h * 0.35, oy - w * 0.22 + h + depth * 0.45);
    x.lineTo(ox + w + h * 0.35, oy - w * 0.22 + h);
    x.stroke();
    pen(x, 3);
    for (let i = 1; i < 6; i++) {
      x.beginPath();
      x.moveTo(ox + h * 0.35, oy + h + (depth * 0.45 * i) / 6);
      x.lineTo(ox + w + h * 0.35, oy - w * 0.22 + h + (depth * 0.45 * i) / 6);
      x.stroke();
    }
    // raised bands across the spine
    pen(x, 5);
    for (let i = 1; i < 4; i++) {
      const k = i / 4;
      x.beginPath();
      x.moveTo(ox + h * 0.35 * k, oy + h * k);
      x.quadraticCurveTo(ox + h * 0.35 * k - depth * 0.5, oy + h * k + depth * 0.15, ox + h * 0.35 * k - depth * 0.15, oy + h * k + depth * 0.3);
      x.stroke();
    }
    if (!ornate) return;
    // corner pieces, a cross with flourishes, and two clasps
    pen(x, 5);
    const corner = (px, py, sx, sy) => {
      x.beginPath();
      x.moveTo(px, py + sy * 60);
      x.quadraticCurveTo(px, py, px + sx * 60, py - sy * 12);
      x.stroke();
      x.beginPath();
      x.arc(px + sx * 25, py + sy * 18, 12, 0, TAU);
      x.stroke();
    };
    corner(ox + 30, oy + 20, 1, 1);
    corner(ox + w - 20, oy - w * 0.22 + 25, -1, 1);
    corner(ox + h * 0.35 + 40, oy + h - 30, 1, -1);
    corner(ox + w + h * 0.35 - 30, oy - w * 0.22 + h - 25, -1, -1);
    const cx = ox + w * 0.5 + h * 0.18;
    const cy = oy - w * 0.11 + h * 0.5;
    pen(x, 9);
    x.beginPath();
    x.moveTo(cx - 90, cy + 20);
    x.lineTo(cx + 90, cy - 20);
    x.moveTo(cx - 25, cy - 110);
    x.lineTo(cx + 25, cy + 110);
    x.stroke();
    pen(x, 4);
    for (const [ex, ey] of [[cx - 90, cy + 20], [cx + 90, cy - 20], [cx - 25, cy - 110], [cx + 25, cy + 110]]) {
      x.beginPath();
      x.arc(ex, ey, 16, 0, TAU);
      x.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const a = r() * TAU;
      const rr = 70 + r() * 70;
      x.beginPath();
      x.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.6, 12 + r() * 14, a, a + 3.2);
      x.stroke();
    }
    pen(x, 7);
    for (const k of [0.3, 0.7]) {
      const px = ox + w + h * 0.35 * k;
      const py = oy - w * 0.22 + h * k;
      x.strokeRect(px - 10, py - 18, 46, 36);
    }
  };
  tome(250, 230, 520, 150, 90, false);
  tome(140, 470, 640, 260, 140, true);
  return c;
}

export function starMap() {
  const W = 1100;
  const H = 700;
  const c = makeCanvas(W, H);
  const x = c.getContext("2d");
  const r = rng(41);
  // torn parchment
  x.beginPath();
  x.moveTo(40, 160);
  const edge = [];
  for (let i = 0; i <= 40; i++) edge.push([40 + (i / 40) * 1020, 140 + Math.sin(i * 0.7) * 30 + r() * 40 - (i > 20 ? (i - 20) * 4 : 0)]);
  edge.forEach(([px, py]) => x.lineTo(px, py));
  x.lineTo(1080, 700);
  x.lineTo(20, 700);
  x.closePath();
  const g = x.createLinearGradient(0, 140, 0, 700);
  g.addColorStop(0, "#efe6d2");
  g.addColorStop(1, "#d9ccb2");
  x.fillStyle = g;
  x.fill();
  x.save();
  x.clip();
  pen(x, 2.5);
  x.strokeStyle = "#2c2a3a";
  x.fillStyle = "#2c2a3a";
  for (let k = 0; k < 6; k++) {
    x.beginPath();
    x.arc(700, 980, 380 + k * 90, Math.PI * 1.05, Math.PI * 1.95);
    x.stroke();
  }
  for (let k = 0; k < 7; k++) {
    x.beginPath();
    x.moveTo(700, 980);
    const a = Math.PI * (1.1 + k * 0.12);
    x.lineTo(700 + Math.cos(a) * 1200, 980 + Math.sin(a) * 1200);
    x.stroke();
  }
  x.setLineDash([8, 8]);
  x.beginPath();
  x.ellipse(620, 700, 520, 260, -0.2, Math.PI, TAU);
  x.stroke();
  x.setLineDash([]);
  // constellations
  for (let k = 0; k < 7; k++) {
    const ox = 120 + r() * 860;
    const oy = 260 + r() * 360;
    let px = ox;
    let py = oy;
    x.beginPath();
    x.moveTo(px, py);
    for (let i = 0; i < 4; i++) {
      px += (r() - 0.5) * 140;
      py += (r() - 0.5) * 110;
      x.lineTo(px, py);
    }
    x.stroke();
    for (let i = 0; i < 6; i++) {
      x.beginPath();
      x.arc(ox + (r() - 0.5) * 200, oy + (r() - 0.5) * 160, 3 + r() * 4, 0, TAU);
      x.fill();
    }
  }
  x.font = "italic 600 30px Georgia, serif";
  [["URSA MINOR", 760, 280], ["DRACO", 860, 520], ["BOOTES", 330, 560], ["XV", 180, 650]].forEach(([s, px, py]) => x.fillText(s, px, py));
  x.restore();
  return c;
}

export function clock() {
  const S = 1000;
  const c = makeCanvas(S, S);
  const x = c.getContext("2d");
  const R = S / 2;
  x.translate(R, R);
  pen(x, 7);
  for (const k of [0.96, 0.88, 0.62, 0.56]) {
    x.beginPath();
    x.arc(0, 0, R * k, 0, TAU);
    x.stroke();
  }
  pen(x, 3);
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * TAU;
    x.beginPath();
    x.moveTo(Math.cos(a) * R * 0.88, Math.sin(a) * R * 0.88);
    x.lineTo(Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92);
    x.stroke();
  }
  const numerals = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
  x.font = "bold 74px Georgia, serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  numerals.forEach((n, i) => {
    const a = (i / 12) * TAU - Math.PI / 2;
    x.save();
    x.translate(Math.cos(a) * R * 0.75, Math.sin(a) * R * 0.75);
    x.rotate(a + Math.PI / 2);
    x.fillText(n, 0, 0);
    x.restore();
  });
  // spear hands
  pen(x, 6);
  const hand = (a, len) => {
    x.save();
    x.rotate(a);
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(0, -len);
    x.stroke();
    x.beginPath();
    x.moveTo(0, -len - 40);
    x.lineTo(16, -len + 10);
    x.lineTo(-16, -len + 10);
    x.closePath();
    x.fill();
    x.restore();
  };
  hand(-0.5, R * 0.42);
  hand(2.1, R * 0.3);
  return c;
}

export function sun() {
  const S = 1000;
  const c = makeCanvas(S, S);
  const x = c.getContext("2d");
  const R = S / 2;
  x.translate(R, R);
  pen(x, 6);
  for (const k of [0.3, 0.26]) {
    x.beginPath();
    x.arc(0, 0, R * k, 0, TAU);
    x.stroke();
  }
  // flame tongues
  pen(x, 4);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU;
    x.save();
    x.rotate(a);
    x.beginPath();
    x.moveTo(R * 0.32, -10);
    x.bezierCurveTo(R * 0.4, -30, R * 0.38, 20, R * 0.46, 8);
    x.bezierCurveTo(R * 0.4, 14, R * 0.42, -6, R * 0.32, 10);
    x.stroke();
    x.restore();
  }
  // long rays
  pen(x, 5);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    x.save();
    x.rotate(a);
    x.beginPath();
    x.moveTo(R * 0.45, -34);
    x.lineTo(R * 0.98, 0);
    x.lineTo(R * 0.45, 34);
    x.stroke();
    // sparkle tick at the tip
    x.beginPath();
    x.moveTo(R * 0.9, -40);
    x.lineTo(R * 0.94, -60);
    x.moveTo(R * 0.94, 40);
    x.lineTo(R * 0.98, 60);
    x.stroke();
    x.restore();
  }
  return c;
}

/** A strand of beads and ornaments along a curve. */
export function chain() {
  const W = 400;
  const H = 1600;
  const c = makeCanvas(W, H);
  const x = c.getContext("2d");
  pen(x, 4);
  const path = (s) => [200 + Math.sin(s * 3.2) * 120, 40 + s * (H - 80)];
  let prev = path(0);
  for (let i = 1; i <= 90; i++) {
    const s = i / 90;
    const p = path(s);
    if (i % 9 === 0) {
      // ornament: a scroll knot
      x.beginPath();
      x.ellipse(p[0], p[1], 22, 30, 0, 0, TAU);
      x.stroke();
      x.beginPath();
      x.moveTo(p[0] - 22, p[1]);
      x.quadraticCurveTo(p[0], p[1] - 50, p[0] + 22, p[1]);
      x.stroke();
    } else {
      x.beginPath();
      x.arc(p[0], p[1], 6, 0, TAU);
      x.stroke();
    }
    x.beginPath();
    x.moveTo(prev[0], prev[1]);
    x.lineTo(p[0], p[1]);
    x.lineWidth = 2;
    x.stroke();
    x.lineWidth = 4;
    prev = p;
  }
  return c;
}

export function star5() {
  const S = 300;
  const c = makeCanvas(S, S);
  const x = c.getContext("2d");
  pen(x, 8);
  x.translate(S / 2, S / 2);
  x.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU - Math.PI / 2;
    const rr = i % 2 ? 50 : 120;
    x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  x.closePath();
  x.stroke();
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
