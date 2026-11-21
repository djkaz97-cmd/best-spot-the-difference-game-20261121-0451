// Screenshot staging behind ?shot=hunt|deep|win. Each scene plays the REAL
// rules forward — the same click hit-testing, combo timing, hints and round
// transitions the player uses — stepped at a fixed 60 Hz to an exact game
// time, then frozen. The same seed and shot name always give the same frame.

import { ROUNDS } from './scenes.js';
import { unfoundDiffs } from './differences.js';

const STEP = 1 / 60;

/** Run the real update loop until the game clock reaches `target` seconds. */
function stepTo(game, target) {
  while (game.state.now < target) game.update(STEP);
}

/** Click the centre of the next unfound difference through the real hit-test. */
function findNext(game) {
  const remaining = unfoundDiffs(ROUNDS[game.state.round], game.state.found.ids);
  const diff = remaining[0];
  game.clickAt(0, diff.x, diff.y);
}

/** Find `count` differences at the given game times (combos happen naturally). */
function findAtTimes(game, times) {
  for (const t of times) {
    stepTo(game, t);
    findNext(game);
  }
}

/**
 * Stage the named shot on a fresh game and leave it frozen at a fixed frame:
 *  hunt — mid round 1, two ringed finds, three still hidden, "3 LEFT".
 *  deep — round 3, three finds, a live hint pulse and a fresh combo.
 *  win  — the win card with full stats, all markers visible behind it.
 */
export function stageShot(name, game) {
  game.advance(); // title -> round 1, exactly as pressing Enter does
  if (name === 'deep') {
    findAtTimes(game, [8, 14, 20, 26, 32]); // round 1 cleared
    game.advance(); // -> round 2
    findAtTimes(game, [40, 46, 52, 58, 64, 70]); // round 2 cleared
    game.advance(); // -> round 3
    findAtTimes(game, [80, 106, 110]);
    stepTo(game, 112);
    game.useHint();
    stepTo(game, 112.8);
  } else if (name === 'win') {
    findAtTimes(game, [6, 10, 14, 18, 22]);
    game.advance();
    findAtTimes(game, [30, 34, 38, 42, 46, 50]);
    game.advance();
    findAtTimes(game, [60, 64, 68, 72, 76, 80, 84]); // round 3 cleared -> won
    stepTo(game, 85);
  } else {
    // hunt (default): two quick finds build a combo, then the clock runs on.
    findAtTimes(game, [26, 29]);
    stepTo(game, 31);
  }
  game.state.frozen = true;
}
