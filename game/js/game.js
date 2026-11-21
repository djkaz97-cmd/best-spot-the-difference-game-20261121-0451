// The state machine of the hunt: rounds, countdown, score with combos,
// limited hints, and the title / playing / clear / won / lost screens.
// All timing runs through update(dt) so screenshot staging can play the real
// rules forward to an exact, deterministic frame.

import { ROUNDS } from './scenes.js';
import { diffAt, unfoundDiffs, createFoundState, markFound } from './differences.js';
import { sfx } from './audio.js';

export const FIND_SCORE = 100;
export const MISS_COST = 10;
export const HINT_COST = 75;
export const HINTS_PER_GAME = 3;
export const COMBO_WINDOW = 4;
export const COMBO_CAP = 5;
export const HINT_DURATION = 2;
export const TIME_BONUS_PER_SECOND = 5;

const EFFECT_LIFE = { burst: 0.7, score: 1.0, miss: 0.55 };

export class Game {
  constructor(seed) {
    this.seed = seed;
    this.onRound = null;
    this.onShake = null;
    this.reset();
  }

  /** Everything back to the title screen: score, hints, rounds, effects. */
  reset() {
    this.state = {
      screen: 'title',
      round: 0,
      now: 0,
      score: 0,
      combo: 0,
      bestCombo: 0,
      lastFindAt: -99,
      hintsLeft: HINTS_PER_GAME,
      timeLeft: ROUNDS[0].time,
      totalElapsed: 0,
      clicks: 0,
      finds: 0,
      found: createFoundState(),
      hint: null,
      effects: [],
      roundStats: null,
      lastTickSecond: -1,
      frozen: false,
    };
  }

  /** Enter key / overlay button: begin, advance a round, or play again. */
  advance() {
    const s = this.state;
    if (s.screen === 'title') {
      s.screen = 'playing';
      this.startRound(0);
      sfx.start();
    } else if (s.screen === 'clear') {
      s.screen = 'playing';
      this.startRound(s.round + 1);
      sfx.start();
    } else if (s.screen === 'won' || s.screen === 'lost') {
      this.restart();
    }
  }

  /** R key: a full restart straight into round one. */
  restart() {
    this.reset();
    this.state.screen = 'playing';
    this.startRound(0);
    sfx.start();
  }

  startRound(index) {
    const s = this.state;
    s.round = index;
    s.found = createFoundState();
    s.timeLeft = ROUNDS[index].time;
    s.hint = null;
    s.effects = [];
    s.combo = 0;
    s.lastFindAt = -99;
    s.lastTickSecond = -1;
    if (this.onRound) this.onRound(index);
  }

  /** A click at scene coordinates on one of the panels. */
  clickAt(panel, x, y) {
    const s = this.state;
    if (s.screen !== 'playing') return;
    s.clicks += 1;
    const round = ROUNDS[s.round];
    const hit = diffAt(round, s.found.ids, x, y);
    if (hit) this.onFind(hit);
    else this.onMiss(panel, x, y);
  }

  onFind(diff) {
    const s = this.state;
    markFound(s.found, diff.id, s.now);
    s.finds += 1;
    s.combo = s.now - s.lastFindAt <= COMBO_WINDOW ? s.combo + 1 : 1;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    const mult = Math.min(s.combo, COMBO_CAP);
    const points = FIND_SCORE * mult;
    s.score += points;
    s.lastFindAt = s.now;
    s.effects.push({ kind: 'burst', panel: 'both', x: diff.x, y: diff.y, age: 0 });
    s.effects.push({
      kind: 'score', panel: 'both', x: diff.x, y: diff.y - diff.r - 4, age: 0,
      text: `+${points}${mult > 1 ? ` ×${mult}` : ''}`,
    });
    sfx.find(mult);
    if (s.found.ids.size === ROUNDS[s.round].diffs.length) this.roundCleared();
  }

  onMiss(panel, x, y) {
    const s = this.state;
    s.score = Math.max(0, s.score - MISS_COST);
    s.combo = 0;
    s.effects.push({ kind: 'miss', panel, x, y, age: 0 });
    sfx.miss();
    if (this.onShake) this.onShake(panel);
  }

  /** H key / hint button: pulse one unfound region, at a score cost. */
  useHint() {
    const s = this.state;
    if (s.screen !== 'playing' || s.hintsLeft <= 0) return;
    const remaining = unfoundDiffs(ROUNDS[s.round], s.found.ids);
    if (remaining.length === 0) return;
    s.hintsLeft -= 1;
    s.score = Math.max(0, s.score - HINT_COST);
    const target = remaining[s.finds % remaining.length];
    s.hint = { id: target.id, age: 0 };
    sfx.hint();
  }

  /** Advance the world by dt seconds (called every animation frame). */
  update(dt) {
    const s = this.state;
    if (s.frozen) return;
    s.now += dt;
    for (const e of s.effects) e.age += dt;
    s.effects = s.effects.filter((e) => e.age < EFFECT_LIFE[e.kind]);
    if (s.hint) {
      s.hint.age += dt;
      if (s.hint.age >= HINT_DURATION) s.hint = null;
    }
    if (s.screen !== 'playing') return;
    s.totalElapsed += dt;
    s.timeLeft -= dt;
    const sec = Math.ceil(s.timeLeft);
    if (sec <= 5 && sec >= 1 && sec !== s.lastTickSecond) {
      s.lastTickSecond = sec;
      sfx.tick();
    }
    if (s.timeLeft <= 0) {
      s.timeLeft = 0;
      s.screen = 'lost';
      sfx.lose();
    }
  }

  roundCleared() {
    const s = this.state;
    const bonus = Math.ceil(s.timeLeft) * TIME_BONUS_PER_SECOND;
    s.score += bonus;
    s.roundStats = {
      timeUsed: ROUNDS[s.round].time - s.timeLeft,
      bonus,
      bestCombo: s.bestCombo,
    };
    if (s.round === ROUNDS.length - 1) {
      s.screen = 'won';
      sfx.win();
    } else {
      s.screen = 'clear';
      sfx.clear();
    }
  }
}
