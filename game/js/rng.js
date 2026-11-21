// Seeded randomness: every scene is painted from a mulberry32 stream so the
// original and altered panels share identical decoration, and a given seed
// always produces the same picture.

/** A small, fast, well-distributed 32-bit PRNG (mulberry32). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform float in [min, max). */
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

/** Uniform integer in [min, max] inclusive. */
export function int(rng, min, max) {
  return Math.floor(range(rng, min, max + 1));
}

/** Pick one element of a non-empty array. */
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

/** Build an array of n items from a generator that consumes the stream. */
export function times(rng, n, make) {
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(make(i));
  return out;
}
