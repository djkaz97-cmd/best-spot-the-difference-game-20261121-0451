// Bootstrap: build the game and renderer, wire mouse and keyboard, and run
// the animation loop. With ?shot=<name>&seed=<n> the staging module plays the
// real rules to a fixed frame instead, for deterministic screenshots.

import { Game } from './game.js';
import { Renderer } from './render.js';
import { stageShot } from './shots.js';
import { sfx } from './audio.js';

const params = new URLSearchParams(window.location.search);
const seed = Number.parseInt(params.get('seed') ?? '7', 10) || 7;

const game = new Game(seed);
const renderer = new Renderer(
  document.getElementById('panel-left'),
  document.getElementById('panel-right'),
  {
    roundLabel: document.getElementById('round-label'),
    score: document.getElementById('score'),
    combo: document.getElementById('combo'),
    leftCount: document.getElementById('left-count'),
    leftChip: document.getElementById('left-chip'),
    timerFill: document.getElementById('timer-fill'),
    timerText: document.getElementById('timer-text'),
    hintBtn: document.getElementById('hint-btn'),
    hintCount: document.getElementById('hint-count'),
    muteBtn: document.getElementById('mute-btn'),
    restartBtn: document.getElementById('restart-btn'),
    overlay: document.getElementById('overlay'),
    overlayCard: document.getElementById('overlay-card'),
    wrapLeft: document.getElementById('wrap-left'),
    wrapRight: document.getElementById('wrap-right'),
  },
);

game.onRound = (index) => renderer.buildRound(index, seed);
game.onShake = (panel) => renderer.shake(panel);
renderer.buildRound(0, seed);

const shot = params.get('shot');
if (shot) {
  stageShot(shot, game);
}

/* ---------- input ---------- */

function toggleMute() {
  sfx.muted = !sfx.muted;
  renderer.dom.muteBtn.innerHTML = `${sfx.muted ? 'SOUND OFF' : 'SOUND ON'} <kbd>M</kbd>`;
}

for (let panel = 0; panel < 2; panel += 1) {
  renderer.canvases[panel].addEventListener('pointerdown', (ev) => {
    sfx.ensure();
    const { x, y } = renderer.sceneCoords(panel, ev.clientX, ev.clientY);
    game.clickAt(panel, x, y);
  });
}

window.addEventListener('keydown', (ev) => {
  if (ev.repeat) return;
  sfx.ensure();
  if (ev.key === 'Enter') {
    ev.preventDefault();
    game.advance();
  } else if (ev.key === 'h' || ev.key === 'H') {
    game.useHint();
  } else if (ev.key === 'r' || ev.key === 'R') {
    game.restart();
  } else if (ev.key === 'm' || ev.key === 'M') {
    toggleMute();
  }
});

renderer.dom.hintBtn.addEventListener('click', () => {
  sfx.ensure();
  game.useHint();
  renderer.dom.hintBtn.blur();
});
renderer.dom.restartBtn.addEventListener('click', () => {
  sfx.ensure();
  game.restart();
  renderer.dom.restartBtn.blur();
});
renderer.dom.muteBtn.addEventListener('click', () => {
  sfx.ensure();
  toggleMute();
  renderer.dom.muteBtn.blur();
});
renderer.dom.overlayCard.addEventListener('click', (ev) => {
  if (ev.target && ev.target.id === 'overlay-btn') {
    sfx.ensure();
    game.advance();
  }
});

/* ---------- animation loop ---------- */

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  game.update(dt);
  renderer.draw(game.state);
  requestAnimationFrame(frame);
}
renderer.draw(game.state);
requestAnimationFrame(frame);

// Small handle for automated play-testing and screenshot staging checks.
window.__gloaming = { game, renderer };
