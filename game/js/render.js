// Everything the player sees: the two panels (pre-rendered scene bases plus
// live markers and effects), the HUD, and the translucent overlays that keep
// the panels visible behind them.

import { ROUNDS, SCENE_W, SCENE_H, paintScene, allDiffIds } from './scenes.js';
import { COMBO_WINDOW, COMBO_CAP, HINTS_PER_GAME } from './game.js';

const MINT = '#7ef0c0';
const AMBER = '#ffb454';
const DANGER = '#ff6b6b';

function formatTime(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export class Renderer {
  constructor(leftCanvas, rightCanvas, dom) {
    this.canvases = [leftCanvas, rightCanvas];
    this.dom = dom;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.contexts = this.canvases.map((c) => {
      c.width = SCENE_W * this.dpr;
      c.height = SCENE_H * this.dpr;
      const ctx = c.getContext('2d');
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      return ctx;
    });
    this.bases = [null, null];
    this.hudKey = '';
    this.overlayKey = '';
  }

  /** Pre-render both panels of a round once; markers draw over them per frame. */
  buildRound(roundIndex, seed) {
    this.bases = [new Set(), allDiffIds(roundIndex)].map((applied) => {
      const base = document.createElement('canvas');
      base.width = SCENE_W * this.dpr;
      base.height = SCENE_H * this.dpr;
      const ctx = base.getContext('2d');
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      paintScene(ctx, roundIndex, seed, applied);
      return base;
    });
  }

  /** Map a pointer event on a panel to scene coordinates. */
  sceneCoords(panel, clientX, clientY) {
    const rect = this.canvases[panel].getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * SCENE_W,
      y: ((clientY - rect.top) / rect.height) * SCENE_H,
    };
  }

  shake(panel) {
    const wrap = panel === 0 ? this.dom.wrapLeft : this.dom.wrapRight;
    wrap.classList.remove('shake');
    void wrap.offsetWidth;
    wrap.classList.add('shake');
    setTimeout(() => wrap.classList.remove('shake'), 340);
  }

  /** Draw one frame: bases, found markers, hint pulse, click effects, HUD. */
  draw(state) {
    const round = ROUNDS[state.round];
    for (let panel = 0; panel < 2; panel += 1) {
      const ctx = this.contexts[panel];
      ctx.clearRect(0, 0, SCENE_W, SCENE_H);
      const base = this.bases[panel];
      if (base) ctx.drawImage(base, 0, 0, base.width, base.height, 0, 0, SCENE_W, SCENE_H);
      for (const diff of round.diffs) {
        if (state.found.ids.has(diff.id)) {
          this.drawFoundMarker(ctx, diff, state.now - state.found.times[diff.id], state.now);
        }
      }
      if (state.hint) {
        const diff = round.diffs.find((d) => d.id === state.hint.id);
        if (diff && !state.found.ids.has(diff.id)) this.drawHintPulse(ctx, diff, state.hint.age);
      }
      for (const e of state.effects) {
        if (e.panel !== 'both' && e.panel !== panel) continue;
        if (e.kind === 'burst') this.drawFindBurst(ctx, e);
        else if (e.kind === 'score') this.drawScoreFloat(ctx, e);
        else this.drawMissMark(ctx, e);
      }
      if (state.screen === 'playing' && state.timeLeft < 10) {
        const alpha = 0.1 + 0.08 * Math.sin(state.now * 6);
        ctx.strokeStyle = `rgba(255,107,107,${Math.max(0, alpha).toFixed(3)})`;
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, SCENE_W - 10, SCENE_H - 10);
      }
    }
    this.syncHud(state);
    this.syncOverlay(state);
  }

  /** The satisfying ring a found difference wears on both panels. */
  drawFoundMarker(ctx, diff, age, now) {
    const t = Math.min(1, age / 0.35);
    const entry = 1 + 0.9 * (1 - t) * (1 - t);
    const pulse = 1 + 0.025 * Math.sin(now * 2.4 + diff.x * 0.05);
    const r = diff.r * 0.92 * entry * pulse;
    ctx.save();
    ctx.fillStyle = 'rgba(126,240,192,0.07)';
    ctx.beginPath();
    ctx.arc(diff.x, diff.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = MINT;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = MINT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(diff.x, diff.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(diff.x, diff.y, r + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const bx = diff.x + Math.cos(-Math.PI / 4) * r;
    const by = diff.y + Math.sin(-Math.PI / 4) * r;
    ctx.fillStyle = MINT;
    ctx.beginPath();
    ctx.arc(bx, by, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0e1120';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx - 3, by);
    ctx.lineTo(bx - 1, by + 2.6);
    ctx.lineTo(bx + 3.4, by - 2.6);
    ctx.stroke();
    ctx.restore();
  }

  /** A hint: a dashed amber circle breathing around one unfound region. */
  drawHintPulse(ctx, diff, age) {
    const alpha = 0.55 + 0.35 * Math.sin(age * 7);
    const r = diff.r + 9 + 3 * Math.sin(age * 5);
    ctx.save();
    const g = ctx.createRadialGradient(diff.x, diff.y, 0, diff.x, diff.y, r + 14);
    g.addColorStop(0, 'rgba(255,180,84,0.16)');
    g.addColorStop(1, 'rgba(255,180,84,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(diff.x, diff.y, r + 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = Math.max(0.15, alpha);
    ctx.strokeStyle = AMBER;
    ctx.lineWidth = 2.6;
    ctx.setLineDash([7, 6]);
    ctx.lineDashOffset = -age * 30;
    ctx.beginPath();
    ctx.arc(diff.x, diff.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** Sparkles radiating from a fresh find. */
  drawFindBurst(ctx, e) {
    const p = e.age / 0.7;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2 + e.x * 0.1;
      const dist = 10 + p * 36;
      ctx.fillStyle = i % 2 === 0 ? MINT : '#ffd98a';
      ctx.beginPath();
      ctx.arc(e.x + Math.cos(a) * dist, e.y + Math.sin(a) * dist, 2.6 * (1 - p), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = (1 - p) * 0.5;
    ctx.strokeStyle = MINT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 12 + p * 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** The "+200 ×2" that floats up from a find. */
  drawScoreFloat(ctx, e) {
    const p = e.age / 1.0;
    ctx.save();
    ctx.globalAlpha = 1 - p * p;
    ctx.font = '800 16px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(8,10,20,0.9)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffd98a';
    ctx.fillText(e.text, e.x, e.y - p * 30);
    ctx.restore();
  }

  /** A wrong click: a gentle red cross that fades, never a harsh flash. */
  drawMissMark(ctx, e) {
    const p = e.age / 0.55;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = DANGER;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const s = 8;
    ctx.beginPath();
    ctx.moveTo(e.x - s, e.y - s);
    ctx.lineTo(e.x + s, e.y + s);
    ctx.moveTo(e.x + s, e.y - s);
    ctx.lineTo(e.x - s, e.y + s);
    ctx.stroke();
    ctx.globalAlpha = (1 - p) * 0.4;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 12 + p * 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** HUD text and bars, touched only when a value actually changes. */
  syncHud(state) {
    const round = ROUNDS[state.round];
    const left = round.diffs.length - state.found.ids.size;
    const comboActive = state.screen === 'playing' && state.combo >= 2 && state.now - state.lastFindAt <= COMBO_WINDOW;
    const secs = Math.ceil(state.timeLeft);
    const key = [
      state.screen, state.round, state.score, left, secs,
      comboActive ? Math.min(state.combo, COMBO_CAP) : 0,
      state.hintsLeft, state.timeLeft < 20 ? (state.timeLeft < 10 ? 2 : 1) : 0,
    ].join('|');
    if (key === this.hudKey) return;
    this.hudKey = key;
    const d = this.dom;
    d.roundLabel.textContent = `Round ${state.round + 1} · ${round.name}`;
    d.score.textContent = String(state.score);
    d.combo.classList.toggle('hidden', !comboActive);
    if (comboActive) d.combo.textContent = `×${Math.min(state.combo, COMBO_CAP)}`;
    d.leftCount.textContent = String(state.screen === 'title' ? round.diffs.length : left);
    d.leftChip.classList.toggle('urgent', state.screen === 'playing' && left <= 2 && left > 0);
    const frac = Math.max(0, state.timeLeft / round.time);
    d.timerFill.style.width = `${(frac * 100).toFixed(1)}%`;
    d.timerFill.className = state.timeLeft < 10 ? 'danger' : state.timeLeft < 20 ? 'warn' : '';
    d.timerText.textContent = state.screen === 'won' ? 'DONE' : `${secs}s`;
    d.timerText.className = state.timeLeft < 10 && state.screen === 'playing' ? 'danger' : '';
    d.hintCount.textContent = String(state.hintsLeft);
    d.hintBtn.disabled = state.hintsLeft <= 0 || state.screen !== 'playing';
  }

  /** Title / round-clear / win / lose cards over the still-visible panels. */
  syncOverlay(state) {
    const key = [state.screen, state.round, state.score, state.finds, state.clicks, state.hintsLeft, state.totalElapsed.toFixed(0)].join('|');
    if (key === this.overlayKey) return;
    this.overlayKey = key;
    const d = this.dom;
    d.overlay.classList.toggle('win', state.screen === 'won');
    if (state.screen === 'playing') {
      d.overlay.classList.add('hidden');
      return;
    }
    d.overlay.classList.remove('hidden');
    const round = ROUNDS[state.round];
    const btn = (label) => `<button class="overlay-btn" id="overlay-btn" type="button">${label}</button>`;
    const stat = (value, label) => `<div class="stat"><b>${value}</b><span>${label}</span></div>`;
    let html = '';
    if (state.screen === 'title') {
      html = `
        <div class="overlay-kicker">A SPOT-THE-DIFFERENCE HUNT</div>
        <div class="overlay-title amber">GLOAMING</div>
        <div class="overlay-sub">Three scenes of dusk. Eighteen small changes.<br>Find them all before the light fades.</div>
        <div class="overlay-scenes">
          <span class="scene-chip">Night Market <b>5</b></span>
          <span class="scene-chip">Tide Pool <b>6</b></span>
          <span class="scene-chip">Attic Study <b>7</b></span>
        </div>
        ${btn('BEGIN THE HUNT · ENTER')}
        <div class="overlay-keys">Click either panel to mark a find · <kbd>H</kbd> hint · <kbd>R</kbd> restart · <kbd>M</kbd> sound</div>`;
    } else if (state.screen === 'clear') {
      const st = state.roundStats;
      html = `
        <div class="overlay-kicker">SCENE CLEARED</div>
        <div class="overlay-title mint">${round.name.toUpperCase()}</div>
        <div class="overlay-sub">Every difference found. The next scene is darker, and hides more.</div>
        <div class="stat-grid">
          ${stat(`${st.timeUsed.toFixed(1)}s`, 'TIME USED')}
          ${stat(`+${st.bonus}`, 'TIME BONUS')}
          ${stat(`×${Math.min(st.bestCombo, COMBO_CAP)}`, 'BEST COMBO')}
          ${stat(state.score, 'SCORE')}
        </div>
        ${btn(`NEXT SCENE · ENTER`)}`;
    } else if (state.screen === 'won') {
      const accuracy = state.clicks > 0 ? Math.round((state.finds / state.clicks) * 100) : 100;
      html = `
        <div class="overlay-kicker">THE HUNT IS WON</div>
        <div class="overlay-title mint">EVERY DIFFERENCE FOUND</div>
        <div class="overlay-sub">All three scenes cleared before the light faded.</div>
        <div class="stat-grid">
          ${stat(state.score, 'TOTAL SCORE')}
          ${stat(formatTime(state.totalElapsed), 'TOTAL TIME')}
          ${stat(`${HINTS_PER_GAME - state.hintsLeft}/${HINTS_PER_GAME}`, 'HINTS USED')}
          ${stat(`${accuracy}%`, 'ACCURACY')}
          ${stat(`×${Math.min(state.bestCombo, COMBO_CAP)}`, 'BEST COMBO')}
        </div>
        ${btn('PLAY AGAIN · ENTER')}`;
    } else if (state.screen === 'lost') {
      html = `
        <div class="overlay-kicker">THE LIGHT FADED</div>
        <div class="overlay-title danger">TIME RAN OUT</div>
        <div class="overlay-sub">${state.found.ids.size} of ${round.diffs.length} found in the ${round.name}.<br>The differences stay hidden — for now.</div>
        <div class="stat-grid">
          ${stat(state.score, 'SCORE')}
          ${stat(`${state.found.ids.size}/${round.diffs.length}`, 'FOUND')}
        </div>
        ${btn('TRY AGAIN · ENTER')}`;
    }
    d.overlayCard.innerHTML = html;
  }
}
