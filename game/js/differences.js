// Difference bookkeeping: which differences a round hides, whether a click
// lands on one, and which are still unfound. Hit regions are generous circles
// in scene coordinates so a fair click near a difference still counts.

/** All differences of a round that have not been found yet. */
export function unfoundDiffs(round, foundIds) {
  return round.diffs.filter((d) => !foundIds.has(d.id));
}

/**
 * The unfound difference a click at (x, y) hits, or null. When two generous
 * regions overlap, the nearest centre wins so the player's intent is honoured.
 */
export function diffAt(round, foundIds, x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const d of round.diffs) {
    if (foundIds.has(d.id)) continue;
    const dist = Math.hypot(x - d.x, y - d.y);
    if (dist <= d.r && dist < bestDist) {
      best = d;
      bestDist = dist;
    }
  }
  return best;
}

/** Fresh per-round found state: the set of ids plus the game-time each was found. */
export function createFoundState() {
  return { ids: new Set(), times: {} };
}

/** Record a find at the current game time (drives the marker's entry animation). */
export function markFound(found, id, now) {
  found.ids.add(id);
  found.times[id] = now;
}
