// The three scenes of the hunt, painted procedurally on a 560x600 canvas.
// Each painter takes the seeded RNG stream and the set of applied difference
// ids: the ORIGINAL panel passes an empty set, the ALTERED panel passes every
// id. Random decoration is generated up front, unconditionally, so both panels
// share pixel-identical scenery and only the designed differences change.

import { mulberry32, range, int, pick, times } from './rng.js';

export const SCENE_W = 560;
export const SCENE_H = 600;

/** Round metadata: name, countdown seconds, and the differences it hides. */
export const ROUNDS = [
  {
    name: 'Night Market',
    time: 90,
    diffs: [
      { id: 'moon', x: 470, y: 80, r: 36, label: 'the moon' },
      { id: 'lantern', x: 300, y: 318, r: 34, label: 'a lantern' },
      { id: 'stripe', x: 198, y: 258, r: 40, label: 'an awning stripe' },
      { id: 'bottle', x: 402, y: 362, r: 32, label: 'a bottle' },
      { id: 'bell', x: 492, y: 508, r: 34, label: 'the cat’s bell' },
    ],
  },
  {
    name: 'Tide Pool',
    time: 100,
    diffs: [
      { id: 'starfish', x: 118, y: 378, r: 34, label: 'a starfish' },
      { id: 'crab', x: 452, y: 362, r: 34, label: 'a crab' },
      { id: 'weed', x: 92, y: 462, r: 32, label: 'seaweed' },
      { id: 'shell', x: 342, y: 556, r: 30, label: 'a shell' },
      { id: 'fish', x: 300, y: 442, r: 32, label: 'a fish' },
      { id: 'bird', x: 372, y: 140, r: 30, label: 'a bird' },
    ],
  },
  {
    name: 'Attic Study',
    time: 110,
    diffs: [
      { id: 'clock', x: 300, y: 118, r: 32, label: 'the clock' },
      { id: 'book', x: 431, y: 152, r: 28, label: 'a book' },
      { id: 'globe', x: 432, y: 334, r: 30, label: 'a globe' },
      { id: 'candle', x: 486, y: 322, r: 28, label: 'a candle' },
      { id: 'picture', x: 97, y: 324, r: 36, label: 'a picture' },
      { id: 'plant', x: 62, y: 478, r: 34, label: 'a plant' },
      { id: 'telescope', x: 252, y: 340, r: 42, label: 'a telescope' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* shared drawing helpers                                              */
/* ------------------------------------------------------------------ */

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ell(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

function dot(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ell(ctx, x, y, r, r);
  ctx.fill();
}

/** Soft radial glow using an 8-digit hex colour (last two digits = alpha). */
function glow(ctx, x, y, r, hex8) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hex8);
  g.addColorStop(1, hex8.slice(0, 7) + '00');
  ctx.fillStyle = g;
  ell(ctx, x, y, r, r);
  ctx.fill();
}

function vgrad(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  for (const [t, c] of stops) g.addColorStop(t, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/** Organic five-arm starfish path with rounded tips. */
function starPath(ctx, x, y, r, arms, inner) {
  ctx.beginPath();
  const n = arms * 2;
  for (let i = 0; i <= n; i += 1) {
    const rad = i % 2 === 0 ? r : r * inner;
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else {
      const prevA = ((i - 1) / n) * Math.PI * 2 - Math.PI / 2;
      const prevR = (i - 1) % 2 === 0 ? r : r * inner;
      const cx = x + Math.cos((prevA + a) / 2) * ((prevR + rad) / 2) * 1.12;
      const cy = y + Math.sin((prevA + a) / 2) * ((prevR + rad) / 2) * 1.12;
      ctx.quadraticCurveTo(cx, cy, px, py);
    }
  }
  ctx.closePath();
}

/** A soft vignette so every scene settles into the panel frame. */
function vignette(ctx) {
  const g = ctx.createRadialGradient(SCENE_W / 2, SCENE_H / 2, SCENE_H * 0.35, SCENE_W / 2, SCENE_H / 2, SCENE_H * 0.78);
  g.addColorStop(0, 'rgba(8,10,20,0)');
  g.addColorStop(1, 'rgba(8,10,20,0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SCENE_W, SCENE_H);
}

/* ------------------------------------------------------------------ */
/* Round 1 — Night Market                                              */
/* ------------------------------------------------------------------ */

function paintNightMarket(ctx, rng, applied) {
  // Sky, stars, moon.
  vgrad(ctx, 0, 0, SCENE_W, 280, [[0, '#181d3a'], [0.7, '#252150'], [1, '#332a56']]);
  const stars = times(rng, 44, () => ({ x: range(rng, 8, 552), y: range(rng, 8, 195), r: range(rng, 0.5, 1.5), a: range(rng, 0.3, 0.9) }));
  for (const s of stars) {
    ctx.globalAlpha = s.a;
    dot(ctx, s.x, s.y, s.r, '#dfe6ff');
  }
  ctx.globalAlpha = 1;

  glow(ctx, 470, 80, 62, '#f4ead82e');
  ctx.fillStyle = '#f4ead8';
  if (applied.has('moon')) {
    // A bite of shadow turns the full moon into a crescent.
    ctx.beginPath();
    ctx.arc(470, 80, 26, 0, Math.PI * 2);
    ctx.arc(482, 74, 23, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
  } else {
    ell(ctx, 470, 80, 26, 26);
    ctx.fill();
    ctx.globalAlpha = 0.12;
    dot(ctx, 462, 74, 5, '#b8a888');
    dot(ctx, 478, 88, 4, '#b8a888');
    dot(ctx, 468, 92, 2.6, '#b8a888');
    ctx.globalAlpha = 1;
  }

  // Distant rooftops with a few lit windows.
  const roofs = [
    { x: 0, w: 90, h: 64 }, { x: 84, w: 70, h: 88 }, { x: 150, w: 96, h: 56 },
    { x: 330, w: 80, h: 74 }, { x: 404, w: 76, h: 96 }, { x: 474, w: 90, h: 60 },
  ];
  ctx.fillStyle = '#151830';
  for (const b of roofs) ctx.fillRect(b.x, 268 - b.h, b.w, b.h);
  const windows = times(rng, 16, () => ({ x: range(rng, 10, 545), y: range(rng, 196, 258) }));
  ctx.fillStyle = '#ffb45488';
  for (const w of windows) ctx.fillRect(w.x, w.y, 3, 4);

  // String lights sagging across the lane.
  const wire = { x0: 16, y0: 148, cx: 280, cy: 210, x1: 544, y1: 142 };
  ctx.strokeStyle = '#3a3f66';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(wire.x0, wire.y0);
  ctx.quadraticCurveTo(wire.cx, wire.cy, wire.x1, wire.y1);
  ctx.stroke();
  for (let i = 1; i < 14; i += 1) {
    const t = i / 14;
    const bx = (1 - t) * (1 - t) * wire.x0 + 2 * (1 - t) * t * wire.cx + t * t * wire.x1;
    const by = (1 - t) * (1 - t) * wire.y0 + 2 * (1 - t) * t * wire.cy + t * t * wire.y1;
    const warm = i % 2 === 0;
    glow(ctx, bx, by + 5, 13, warm ? '#ffb4543a' : '#5fd4c03a');
    dot(ctx, bx, by + 5, 3, warm ? '#ffcf7e' : '#8fe8d8');
  }

  // Ground: cobblestones.
  vgrad(ctx, 0, 470, SCENE_W, 130, [[0, '#262b48'], [1, '#1c2138']]);
  const stones = times(rng, 64, () => ({ x: range(rng, 0, 560), y: range(rng, 478, 596), rx: range(rng, 9, 20), ry: range(rng, 4, 8) }));
  ctx.fillStyle = '#31375a';
  ctx.globalAlpha = 0.5;
  for (const s of stones) {
    ell(ctx, s.x, s.y, s.rx, s.ry);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Stall back wall, so objects on the counter read against a solid interior.
  vgrad(ctx, 60, 284, 440, 98, [[0, '#232849'], [1, '#1b2038']]);
  ctx.fillStyle = '#ffffff08';
  ctx.fillRect(60, 330, 440, 2);

  // Stall poles and counter.
  ctx.fillStyle = '#4a3524';
  ctx.fillRect(64, 286, 9, 186);
  ctx.fillRect(488, 286, 9, 186);
  ctx.fillStyle = '#6b4a32';
  ctx.fillRect(60, 396, 440, 76);
  ctx.fillStyle = '#8a6242';
  ctx.fillRect(56, 380, 448, 18);
  ctx.strokeStyle = '#57392a';
  ctx.lineWidth = 1.5;
  for (let x = 96; x < 500; x += 62) {
    ctx.beginPath();
    ctx.moveTo(x, 400);
    ctx.lineTo(x, 468);
    ctx.stroke();
  }
  ctx.fillStyle = '#00000030';
  ctx.fillRect(60, 468, 440, 6);

  // Awning: eight scalloped stripes; one stripe changes colour in the altered panel.
  const awnX = 60, awnW = 440, stripes = 8, sw = awnW / stripes;
  for (let i = 0; i < stripes; i += 1) {
    let color = i % 2 === 0 ? '#e2694f' : '#f2e3c6';
    if (applied.has('stripe') && i === 2) color = '#f2e3c6';
    ctx.fillStyle = color;
    ctx.fillRect(awnX + i * sw, 232, sw + 0.6, 52);
    ctx.beginPath();
    ctx.arc(awnX + i * sw + sw / 2, 284, sw / 2, 0, Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = '#00000022';
  ctx.fillRect(awnX, 232, awnW, 8);
  ctx.fillStyle = '#54432e';
  ctx.fillRect(awnX - 4, 226, awnW + 8, 8);

  // Hanging lanterns; the middle one shifts from amber to mint.
  const lanternXs = [120, 300, 460];
  for (let i = 0; i < lanternXs.length; i += 1) {
    const lx = lanternXs[i];
    const lit = applied.has('lantern') && i === 1 ? '#6fe0c8' : '#ffb454';
    const halo = applied.has('lantern') && i === 1 ? '#6fe0c83d' : '#ffb4543d';
    ctx.strokeStyle = '#3a3f66';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(lx, 290);
    ctx.lineTo(lx, 302);
    ctx.stroke();
    glow(ctx, lx, 318, 42, halo);
    ctx.fillStyle = lit;
    ell(ctx, lx, 318, 14, 18);
    ctx.fill();
    ctx.strokeStyle = '#00000030';
    ctx.lineWidth = 1;
    for (const dy of [-8, 0, 8]) {
      ctx.beginPath();
      ctx.ellipse(lx, 318 + dy * 0.4, 14 * Math.sqrt(Math.max(0.05, 1 - (dy / 18) ** 2)), 3.4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(lx - 6, 298, 12, 5);
    ctx.fillRect(lx - 5, 334, 10, 4);
    ctx.strokeStyle = '#c9a06a';
    ctx.beginPath();
    ctx.moveTo(lx, 338);
    ctx.lineTo(lx, 346);
    ctx.stroke();
  }

  // Steaming pot on the counter.
  const steam = times(rng, 3, () => range(rng, -8, 8));
  ctx.fillStyle = '#2e3350';
  rr(ctx, 128, 352, 44, 28, 5);
  ctx.fill();
  ctx.fillStyle = '#3c4266';
  ell(ctx, 150, 352, 22, 5);
  ctx.fill();
  ctx.strokeStyle = '#c8d0f0';
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 2.4;
  for (const dx of steam) {
    ctx.beginPath();
    ctx.moveTo(150 + dx, 346);
    ctx.bezierCurveTo(144 + dx, 330, 158 + dx, 322, 150 + dx, 304);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Crate of oranges.
  ctx.fillStyle = '#7a5236';
  rr(ctx, 214, 352, 72, 28, 3);
  ctx.fill();
  ctx.strokeStyle = '#5f3f28';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(218, 358, 64, 16);
  const oranges = [[228, 348], [247, 348], [266, 348], [237, 334], [256, 334]];
  for (const [ox, oy] of oranges) {
    dot(ctx, ox, oy, 9.4, '#ff9d3b');
    dot(ctx, ox - 3, oy - 3, 2.4, '#ffc98a');
  }

  // Three teal bottles; the middle one is missing in the altered panel.
  const bottleXs = [372, 402, 432];
  for (let i = 0; i < bottleXs.length; i += 1) {
    if (applied.has('bottle') && i === 1) continue;
    const bx = bottleXs[i];
    ctx.fillStyle = '#4fc3b0';
    rr(ctx, bx - 7, 346, 14, 34, 4);
    ctx.fill();
    ctx.fillRect(bx - 3, 338, 6, 10);
    ctx.fillStyle = '#c9a06a';
    ctx.fillRect(bx - 3, 335, 6, 4);
    ctx.fillStyle = '#ffffff44';
    ctx.fillRect(bx - 4, 350, 2.4, 24);
  }

  // A paper lantern resting on the cobbles.
  glow(ctx, 82, 545, 40, '#ff9d5c30');
  ctx.fillStyle = '#ff9d5c';
  rr(ctx, 70, 530, 24, 30, 8);
  ctx.fill();
  ctx.strokeStyle = '#00000028';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(70, 540);
  ctx.lineTo(94, 540);
  ctx.moveTo(70, 550);
  ctx.lineTo(94, 550);
  ctx.stroke();

  // The stall cat, with a collar bell that may be missing.
  ctx.fillStyle = '#14162c';
  ell(ctx, 492, 522, 16, 20);
  ctx.fill();
  ell(ctx, 492, 496, 10.5, 9.5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(484, 490);
  ctx.lineTo(481, 479);
  ctx.lineTo(489, 485);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(500, 490);
  ctx.lineTo(503, 479);
  ctx.lineTo(495, 485);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#14162c';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(506, 532);
  ctx.quadraticCurveTo(522, 528, 519, 508);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#3a3f66';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(492, 522, 16, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  dot(ctx, 488, 495, 1.5, '#ffb454');
  dot(ctx, 496, 495, 1.5, '#ffb454');
  ctx.strokeStyle = '#e2694f';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(492, 502, 8.4, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  if (!applied.has('bell')) {
    dot(ctx, 492, 509, 3.2, '#ffd98a');
    dot(ctx, 492, 509, 1.2, '#a8783c');
  }

  vignette(ctx);
}

/* ------------------------------------------------------------------ */
/* Round 2 — Tide Pool                                                 */
/* ------------------------------------------------------------------ */

function paintTidePool(ctx, rng, applied) {
  // Dusk sky and low sun.
  vgrad(ctx, 0, 0, SCENE_W, 214, [[0, '#3b3560'], [0.55, '#8f6a8e'], [1, '#f2a65a']]);
  glow(ctx, 150, 206, 74, '#ffd98a4d');
  dot(ctx, 150, 206, 28, '#ffd98a');
  const clouds = times(rng, 3, () => ({ x: range(rng, 60, 500), y: range(rng, 40, 120), rx: range(rng, 34, 60) }));
  ctx.fillStyle = '#ffd9a0';
  ctx.globalAlpha = 0.14;
  for (const c of clouds) {
    ell(ctx, c.x, c.y, c.rx, 8);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Two gulls; the second is absent in the altered panel.
  const gulls = [[320, 118], [372, 140]];
  ctx.strokeStyle = '#2a2440';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  for (let i = 0; i < gulls.length; i += 1) {
    if (applied.has('bird') && i === 1) continue;
    const [gx, gy] = gulls[i];
    ctx.beginPath();
    ctx.moveTo(gx - 10, gy);
    ctx.quadraticCurveTo(gx - 4, gy - 7, gx, gy);
    ctx.quadraticCurveTo(gx + 4, gy - 7, gx + 10, gy);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // Sea with wave crests and the sun's reflection.
  vgrad(ctx, 0, 212, SCENE_W, 126, [[0, '#5a6d9e'], [1, '#3a4a74']]);
  const waves = times(rng, 7, (i) => ({ y: 226 + i * 15, phase: range(rng, 0, 6) }));
  ctx.strokeStyle = '#9fb0d8';
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1.6;
  for (const w of waves) {
    ctx.beginPath();
    for (let x = 0; x <= SCENE_W; x += 8) {
      const y = w.y + Math.sin(x / 34 + w.phase) * 2.4;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#ffd98a';
  for (let y = 218; y < 330; y += 12) ctx.fillRect(144 + Math.sin(y) * 5, y, 12, 3);
  ctx.globalAlpha = 1;

  // Wet sand and pebbles.
  vgrad(ctx, 0, 336, SCENE_W, 264, [[0, '#6a5f82'], [1, '#4e4668']]);
  const pebbles = times(rng, 46, () => ({ x: range(rng, 0, 560), y: range(rng, 348, 596), rx: range(rng, 3, 8), ry: range(rng, 2, 4), c: pick(rng, ['#7d7494', '#5d5578', '#8a80a2']) }));
  for (const p of pebbles) {
    ctx.fillStyle = p.c;
    ell(ctx, p.x, p.y, p.rx, p.ry);
    ctx.fill();
  }

  // Rocks ringing the pool.
  const rimRocks = times(rng, 9, (i) => {
    const a = (i / 9) * Math.PI * 2;
    return {
      x: 280 + Math.cos(a) * 196,
      y: 438 + Math.sin(a) * 108,
      rx: range(rng, 26, 40),
      ry: range(rng, 16, 26),
    };
  });
  for (const r of rimRocks) {
    ctx.fillStyle = '#464c6e';
    ell(ctx, r.x, r.y, r.rx, r.ry);
    ctx.fill();
    ctx.fillStyle = '#5d6488';
    ell(ctx, r.x - r.rx * 0.2, r.y - r.ry * 0.35, r.rx * 0.6, r.ry * 0.45);
    ctx.fill();
  }
  const barnacles = times(rng, 14, () => ({ x: range(rng, 60, 500), y: range(rng, 350, 540), r: range(rng, 1.6, 3.4) }));
  ctx.fillStyle = '#9aa0c0';
  ctx.globalAlpha = 0.55;
  for (const b of barnacles) {
    ell(ctx, b.x, b.y, b.r, b.r * 0.8);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // The pool itself.
  const pool = ctx.createRadialGradient(280, 420, 20, 280, 438, 200);
  pool.addColorStop(0, '#3a7d84');
  pool.addColorStop(1, '#1d4550');
  ctx.fillStyle = pool;
  ell(ctx, 280, 438, 182, 96);
  ctx.fill();
  ctx.strokeStyle = '#2c3050';
  ctx.lineWidth = 7;
  ell(ctx, 280, 438, 185, 99);
  ctx.stroke();
  ctx.strokeStyle = '#bfe8e0';
  ctx.globalAlpha = 0.14;
  ctx.lineWidth = 1.6;
  for (const [rx, ry] of [[120, 58], [78, 36], [40, 18]]) {
    ell(ctx, 280, 438, rx, ry);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#ffd98a';
  ell(ctx, 210, 414, 26, 7);
  ctx.fill();
  ctx.globalAlpha = 1;

  // A fish that faces the other way in the altered panel.
  const facing = applied.has('fish') ? 1 : -1;
  ctx.save();
  ctx.translate(300, 442);
  ctx.scale(facing, 1);
  ctx.fillStyle = '#ffd166';
  ell(ctx, 0, 0, 16, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(24, -7);
  ctx.lineTo(24, 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8a83e';
  ctx.beginPath();
  ctx.moveTo(-2, -7);
  ctx.quadraticCurveTo(4, -13, 8, -7);
  ctx.closePath();
  ctx.fill();
  dot(ctx, -9, -2, 1.8, '#2a2440');
  ctx.strokeStyle = '#e8a83e';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(2, 0, 6, -0.7, 0.7);
  ctx.stroke();
  ctx.restore();

  // Starfish on the left rock; its colour shifts in the altered panel.
  const starColor = applied.has('starfish') ? '#b07fe0' : '#ff8c5a';
  ctx.fillStyle = '#00000030';
  ell(ctx, 120, 384, 22, 9);
  ctx.fill();
  ctx.fillStyle = starColor;
  starPath(ctx, 118, 378, 23, 5, 0.46);
  ctx.fill();
  ctx.fillStyle = '#00000022';
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    dot(ctx, 118 + Math.cos(a) * 11, 378 + Math.sin(a) * 11, 1.7, '#00000022');
  }
  dot(ctx, 118, 378, 2.6, '#ffffff33');

  // A crab on the right rock; absent in the altered panel.
  if (!applied.has('crab')) {
    ctx.strokeStyle = '#c04a3e';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(452 + side * 10, 362 + i * 3 - 3);
        ctx.lineTo(452 + side * 22, 366 + i * 4);
        ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#e05a4e';
    ell(ctx, 452, 362, 14, 10);
    ctx.fill();
    dot(ctx, 432, 354, 6, '#e05a4e');
    dot(ctx, 472, 354, 6, '#e05a4e');
    ctx.fillStyle = '#c04a3e';
    ctx.beginPath();
    ctx.arc(432, 354, 6, Math.PI * 0.2, Math.PI * 0.9);
    ctx.fill();
    ctx.strokeStyle = '#e05a4e';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(447, 354);
    ctx.lineTo(445, 348);
    ctx.moveTo(457, 354);
    ctx.lineTo(459, 348);
    ctx.stroke();
    dot(ctx, 445, 347, 2.2, '#2a2440');
    dot(ctx, 459, 347, 2.2, '#2a2440');
  }

  // Seaweed by the pool edge; one frond is missing in the altered panel.
  const fronds = applied.has('weed') ? 2 : 3;
  ctx.strokeStyle = '#3f9d6e';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const offsets = [-11, 0, 12];
  for (let i = 0; i < fronds; i += 1) {
    const bx = 92 + offsets[i];
    ctx.beginPath();
    ctx.moveTo(bx, 486);
    ctx.bezierCurveTo(bx - 10, 462, bx + 12, 448, bx - 2, 424);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  dot(ctx, 92, 488, 7, '#2e7a52');

  // Anemone.
  ctx.strokeStyle = '#d977a0';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 12; i += 1) {
    const a = Math.PI + (i / 11) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(424, 490);
    ctx.quadraticCurveTo(424 + Math.cos(a) * 12, 490 + Math.sin(a) * 16 - 6, 424 + Math.cos(a) * 20, 490 + Math.sin(a) * 24);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#b05a80';
  ell(ctx, 424, 492, 12, 6);
  ctx.fill();

  // A fan shell and a spiral shell; the spiral is missing in the altered panel.
  ctx.fillStyle = '#e8c9a0';
  ctx.beginPath();
  ctx.moveTo(205, 546);
  ctx.arc(205, 546, 16, Math.PI * 1.15, Math.PI * 1.85);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c9a678';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 5; i += 1) {
    const a = Math.PI * 1.2 + (i / 4) * Math.PI * 0.6;
    ctx.beginPath();
    ctx.moveTo(205, 546);
    ctx.lineTo(205 + Math.cos(a) * 15, 546 + Math.sin(a) * 15);
    ctx.stroke();
  }
  if (!applied.has('shell')) {
    ctx.fillStyle = '#d9b38c';
    ell(ctx, 342, 556, 12, 9);
    ctx.fill();
    ctx.strokeStyle = '#a8825c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 4; a += 0.2) {
      const r = 1.2 + a * 1.35;
      const px = 342 + Math.cos(a) * r * 0.8;
      const py = 556 + Math.sin(a) * r * 0.6;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  vignette(ctx);
}

/* ------------------------------------------------------------------ */
/* Round 3 — Attic Study                                               */
/* ------------------------------------------------------------------ */

function paintAtticStudy(ctx, rng, applied) {
  // Wall, roof beams, floor.
  vgrad(ctx, 0, 0, SCENE_W, 462, [[0, '#4a3d63'], [1, '#362e4c']]);
  ctx.fillStyle = '#2e2742';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(SCENE_W, 0);
  ctx.lineTo(SCENE_W, 38);
  ctx.lineTo(280, 84);
  ctx.lineTo(0, 38);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#54432e';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(46, 0);
  ctx.lineTo(214, 72);
  ctx.moveTo(514, 0);
  ctx.lineTo(346, 72);
  ctx.stroke();
  vgrad(ctx, 0, 462, SCENE_W, 138, [[0, '#5f4832'], [1, '#463524']]);
  ctx.strokeStyle = '#3a2c1c';
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1.6;
  for (const y of [486, 514, 546, 578]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SCENE_W, y);
    ctx.stroke();
  }
  const seams = times(rng, 12, () => ({ x: range(rng, 20, 540), y: pick(rng, [462, 486, 514, 546, 578]) }));
  for (let i = 0; i < seams.length; i += 2) {
    const s = seams[i];
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x, s.y + 26);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Round window with a night sky, and the moonbeam it casts.
  ctx.fillStyle = 'rgba(244,234,216,0.055)';
  ctx.beginPath();
  ctx.moveTo(96, 190);
  ctx.lineTo(184, 190);
  ctx.lineTo(330, 600);
  ctx.lineTo(30, 600);
  ctx.closePath();
  ctx.fill();
  dot(ctx, 140, 152, 62, '#6e5638');
  const glass = ctx.createLinearGradient(140, 96, 140, 208);
  glass.addColorStop(0, '#2a3158');
  glass.addColorStop(1, '#1c2240');
  ctx.fillStyle = glass;
  dot(ctx, 140, 152, 52, '#1c2240');
  ctx.fillStyle = glass;
  ell(ctx, 140, 152, 52, 52);
  ctx.fill();
  ctx.save();
  ell(ctx, 140, 152, 52, 52);
  ctx.clip();
  const winStars = times(rng, 9, () => ({ x: range(rng, 96, 184), y: range(rng, 108, 196), r: range(rng, 0.6, 1.4) }));
  ctx.fillStyle = '#dfe6ff';
  for (const s of winStars) dot(ctx, s.x, s.y, s.r, '#dfe6ff');
  ctx.fillStyle = '#f4ead8';
  ctx.beginPath();
  ctx.arc(162, 132, 11, 0, Math.PI * 2);
  ctx.arc(167, 129, 9, 0, Math.PI * 2, true);
  ctx.fill('evenodd');
  ctx.restore();
  ctx.strokeStyle = '#6e5638';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(88, 152);
  ctx.lineTo(192, 152);
  ctx.moveTo(140, 100);
  ctx.lineTo(140, 204);
  ctx.stroke();
  const motes = times(rng, 18, () => ({ x: range(rng, 70, 290), y: range(rng, 220, 580), r: range(rng, 0.6, 1.6) }));
  ctx.fillStyle = '#f4ead8';
  ctx.globalAlpha = 0.2;
  for (let i = 0; i < motes.length; i += 3) dot(ctx, motes[i].x, motes[i].y, motes[i].r, '#f4ead8');
  ctx.globalAlpha = 1;

  // Bookshelf with two rows of books; one spine changes colour.
  ctx.fillStyle = '#54432e';
  rr(ctx, 350, 116, 190, 152, 5);
  ctx.fill();
  ctx.fillStyle = '#3a2f22';
  ctx.fillRect(358, 124, 174, 136);
  const bookPalette = ['#c46a4a', '#5fa89a', '#d9a44e', '#7a6fae', '#5f8fc9', '#b06a8a', '#8fae6a', '#c9a06a'];
  const widths = [16, 14, 18, 15, 16, 14, 17, 15, 16, 14];
  for (const shelfY of [180, 252]) {
    let bx = 362;
    for (let i = 0; i < widths.length; i += 1) {
      const h = 40 + ((i * 7 + shelfY) % 12);
      let color = bookPalette[(i + (shelfY === 252 ? 3 : 0)) % bookPalette.length];
      if (applied.has('book') && shelfY === 180 && i === 4) color = '#c04a5a';
      ctx.fillStyle = color;
      ctx.fillRect(bx, shelfY - h, widths[i] - 2, h);
      ctx.fillStyle = '#ffffff2e';
      ctx.fillRect(bx + 2, shelfY - h + 5, widths[i] - 6, 2);
      bx += widths[i];
    }
    ctx.fillStyle = '#6e5638';
    ctx.fillRect(356, shelfY, 178, 7);
  }

  // Wall clock; its hands tell a different time in the altered panel.
  dot(ctx, 300, 118, 28, '#8a6d4a');
  dot(ctx, 300, 118, 23, '#f2e8d8');
  ctx.strokeStyle = '#6e5638';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(300 + Math.cos(a) * 19, 118 + Math.sin(a) * 19);
    ctx.lineTo(300 + Math.cos(a) * 22, 118 + Math.sin(a) * 22);
    ctx.stroke();
  }
  const alteredTime = applied.has('clock');
  const hourA = ((alteredTime ? 3 : 10 + 10 / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  const minA = ((alteredTime ? 0 : 10) / 60) * Math.PI * 2 - Math.PI / 2;
  ctx.strokeStyle = '#3a3050';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(300, 118);
  ctx.lineTo(300 + Math.cos(hourA) * 11, 118 + Math.sin(hourA) * 11);
  ctx.stroke();
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(300, 118);
  ctx.lineTo(300 + Math.cos(minA) * 17, 118 + Math.sin(minA) * 17);
  ctx.stroke();
  ctx.lineCap = 'butt';
  dot(ctx, 300, 118, 2.4, '#3a3050');

  // Framed picture: mountains, or a sailboat in the altered panel.
  ctx.fillStyle = '#8a6d4a';
  rr(ctx, 58, 294, 78, 60, 3);
  ctx.fill();
  ctx.fillStyle = '#2e3a5e';
  ctx.fillRect(64, 300, 66, 48);
  if (applied.has('picture')) {
    ctx.strokeStyle = '#5f8fc9';
    ctx.lineWidth = 1.6;
    for (const wy of [336, 342]) {
      ctx.beginPath();
      ctx.moveTo(66, wy);
      ctx.quadraticCurveTo(80, wy - 3, 97, wy);
      ctx.quadraticCurveTo(114, wy + 3, 128, wy);
      ctx.stroke();
    }
    ctx.fillStyle = '#c9a06a';
    ctx.beginPath();
    ctx.moveTo(82, 334);
    ctx.lineTo(112, 334);
    ctx.lineTo(104, 341);
    ctx.lineTo(88, 341);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2e3c6';
    ctx.beginPath();
    ctx.moveTo(97, 310);
    ctx.lineTo(97, 333);
    ctx.lineTo(83, 333);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(99, 314);
    ctx.lineTo(99, 333);
    ctx.lineTo(110, 333);
    ctx.closePath();
    ctx.fill();
  } else {
    dot(ctx, 112, 312, 7, '#ffd98a');
    ctx.fillStyle = '#5f7fae';
    ctx.beginPath();
    ctx.moveTo(64, 348);
    ctx.lineTo(88, 314);
    ctx.lineTo(108, 348);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#48628c';
    ctx.beginPath();
    ctx.moveTo(92, 348);
    ctx.lineTo(114, 320);
    ctx.lineTo(130, 348);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2e3c6';
    ctx.beginPath();
    ctx.moveTo(84, 320);
    ctx.lineTo(88, 314);
    ctx.lineTo(92, 320);
    ctx.closePath();
    ctx.fill();
  }

  // Desk with lamp, papers, globe and candle.
  ctx.fillStyle = '#5f4630';
  ctx.fillRect(340, 380, 12, 82);
  ctx.fillRect(514, 380, 12, 82);
  ctx.fillStyle = '#7a5a3c';
  rr(ctx, 330, 366, 206, 15, 3);
  ctx.fill();
  ctx.fillStyle = '#ffffff18';
  ctx.fillRect(334, 368, 198, 3);
  const papers = times(rng, 3, () => ({ x: range(rng, 386, 470), y: range(rng, 358, 362), a: range(rng, -0.2, 0.2) }));
  for (const p of papers) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.a);
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(-12, -4, 24, 8);
    ctx.strokeStyle = '#9a9080';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-8, -1);
    ctx.lineTo(8, -1);
    ctx.moveTo(-8, 2);
    ctx.lineTo(5, 2);
    ctx.stroke();
    ctx.restore();
  }

  // Desk lamp with a warm pool of light.
  glow(ctx, 372, 360, 46, '#ffcf6e26');
  ctx.fillStyle = '#3a3050';
  ell(ctx, 362, 364, 14, 5);
  ctx.fill();
  ctx.strokeStyle = '#3a3050';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(362, 362);
  ctx.quadraticCurveTo(360, 340, 372, 330);
  ctx.stroke();
  ctx.fillStyle = '#e0a44e';
  ctx.beginPath();
  ctx.moveTo(356, 330);
  ctx.lineTo(390, 330);
  ctx.lineTo(381, 312);
  ctx.lineTo(365, 312);
  ctx.closePath();
  ctx.fill();
  glow(ctx, 373, 332, 16, '#fff3c059');

  // Globe; absent in the altered panel.
  if (!applied.has('globe')) {
    ctx.strokeStyle = '#8a6d4a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(432, 336, 23, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.fillStyle = '#8a6d4a';
    ctx.fillRect(428, 356, 8, 6);
    ell(ctx, 432, 363, 12, 3.4);
    ctx.fill();
    dot(ctx, 432, 334, 19, '#4f8f8b');
    ctx.fillStyle = '#7fbf9a';
    ell(ctx, 426, 328, 7, 5);
    ctx.fill();
    ell(ctx, 439, 340, 6, 4);
    ctx.fill();
    ell(ctx, 430, 344, 3.4, 2.6);
    ctx.fill();
    ctx.strokeStyle = '#ffffff30';
    ctx.lineWidth = 1;
    ell(ctx, 432, 334, 8, 19);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(413, 334);
    ctx.lineTo(451, 334);
    ctx.stroke();
    dot(ctx, 426, 327, 2.2, '#ffffff59');
  }

  // Candle; its flame is gone in the altered panel.
  ctx.fillStyle = '#8a6d4a';
  ell(ctx, 486, 364, 11, 4);
  ctx.fill();
  ctx.fillStyle = '#e8dcc0';
  rr(ctx, 481, 326, 10, 38, 2);
  ctx.fill();
  ctx.fillStyle = '#d8ccb0';
  ctx.fillRect(481, 326, 3, 38);
  ctx.strokeStyle = '#3a3050';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(486, 326);
  ctx.lineTo(486, 321);
  ctx.stroke();
  if (!applied.has('candle')) {
    glow(ctx, 486, 314, 30, '#ffcf6e4d');
    ctx.fillStyle = '#ffcf6e';
    ctx.beginPath();
    ctx.moveTo(486, 304);
    ctx.quadraticCurveTo(492, 314, 486, 321);
    ctx.quadraticCurveTo(480, 314, 486, 304);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3c0';
    ctx.beginPath();
    ctx.moveTo(486, 310);
    ctx.quadraticCurveTo(489, 315, 486, 319);
    ctx.quadraticCurveTo(483, 315, 486, 310);
    ctx.closePath();
    ctx.fill();
  }

  // Telescope by the window; absent in the altered panel.
  if (!applied.has('telescope')) {
    ctx.strokeStyle = '#54432e';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(252, 356);
    ctx.lineTo(230, 458);
    ctx.moveTo(252, 356);
    ctx.lineTo(274, 458);
    ctx.moveTo(252, 356);
    ctx.lineTo(252, 452);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.save();
    ctx.translate(252, 340);
    ctx.rotate(-0.62);
    ctx.fillStyle = '#8a6d4a';
    rr(ctx, -38, -8, 76, 16, 7);
    ctx.fill();
    ctx.fillStyle = '#d9a44e';
    ctx.fillRect(-20, -8, 5, 16);
    ctx.fillRect(14, -8, 5, 16);
    ctx.fillStyle = '#54432e';
    rr(ctx, 34, -6, 10, 12, 3);
    ctx.fill();
    ctx.fillStyle = '#2e3350';
    ell(ctx, -38, 0, 4, 8);
    ctx.fill();
    ctx.restore();
    dot(ctx, 252, 352, 5, '#3a3050');
  }

  // Potted plant; one leaf is missing in the altered panel.
  const leafCount = applied.has('plant') ? 4 : 5;
  ctx.strokeStyle = '#4f9d6e';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  const leaves = [
    [62, 500, 40, 452, 52, 448],
    [62, 500, 62, 444, 66, 440],
    [62, 500, 84, 452, 76, 446],
    [62, 500, 34, 468, 40, 462],
    [62, 500, 90, 470, 86, 464],
  ];
  for (let i = 0; i < leafCount; i += 1) {
    const [x0, y0, cx, cy, x1, y1] = leaves[i];
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(cx, cy, x1, y1);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#b06a4a';
  ctx.beginPath();
  ctx.moveTo(46, 498);
  ctx.lineTo(78, 498);
  ctx.lineTo(72, 532);
  ctx.lineTo(52, 532);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c97e5a';
  rr(ctx, 44, 494, 36, 8, 3);
  ctx.fill();

  // Rug with a sleeping cat.
  ctx.fillStyle = '#7e4f63';
  ell(ctx, 285, 534, 150, 40);
  ctx.fill();
  ctx.strokeStyle = '#a06a80';
  ctx.lineWidth = 4;
  ell(ctx, 285, 534, 138, 33);
  ctx.stroke();
  ctx.fillStyle = '#d9a44e';
  ctx.globalAlpha = 0.5;
  for (const dx of [-90, -45, 45, 90]) {
    ctx.save();
    ctx.translate(285 + dx, 534);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#2a2440';
  ell(ctx, 305, 528, 17, 12);
  ctx.fill();
  ctx.strokeStyle = '#2a2440';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(305, 528, 15, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(294, 520);
  ctx.lineTo(291, 512);
  ctx.lineTo(299, 517);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#9aa3c4';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(299, 525, 2.4, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.fillStyle = '#9aa3c4';
  ctx.globalAlpha = 0.5;
  ctx.font = '10px sans-serif';
  ctx.fillText('z', 322, 512);
  ctx.font = '8px sans-serif';
  ctx.fillText('z', 329, 504);
  ctx.globalAlpha = 1;

  // Storage chest.
  ctx.fillStyle = '#6e5638';
  rr(ctx, 478, 506, 66, 42, 5);
  ctx.fill();
  ctx.fillStyle = '#4a3826';
  ctx.fillRect(478, 522, 66, 5);
  ctx.fillRect(494, 506, 6, 42);
  ctx.fillRect(522, 506, 6, 42);
  dot(ctx, 511, 525, 3.4, '#d9a44e');

  // Settle the scene into the panel frame.
  vignette(ctx);
}

/* ------------------------------------------------------------------ */
/* entry point                                                         */
/* ------------------------------------------------------------------ */

const PAINTERS = [paintNightMarket, paintTidePool, paintAtticStudy];

/**
 * Paint round `roundIndex` into `ctx` at scene size. `applied` is the set of
 * difference ids to mutate (empty for the original panel). The seed fixes all
 * random decoration; both panels of a round are painted with the same seed.
 */
export function paintScene(ctx, roundIndex, seed, applied) {
  const rng = mulberry32((seed * 1000 + roundIndex * 97 + 13) >>> 0);
  ctx.save();
  ctx.clearRect(0, 0, SCENE_W, SCENE_H);
  PAINTERS[roundIndex](ctx, rng, applied);
  ctx.restore();
}

/** The set of every difference id of a round (what the altered panel applies). */
export function allDiffIds(roundIndex) {
  return new Set(ROUNDS[roundIndex].diffs.map((d) => d.id));
}
