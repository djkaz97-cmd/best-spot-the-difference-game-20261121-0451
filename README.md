# Gloaming — a spot-the-difference hunt

[![make.fun · best-spot-the-difference-game-20261121-0451](https://make.fun/badge/best-spot-the-difference-game-20261121-0451.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451)
[![rank](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/djkaz97-cmd/best-spot-the-difference-game-20261121-0451/rank.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451/leaderboard)
[![reward](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/djkaz97-cmd/best-spot-the-difference-game-20261121-0451/reward.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451)

**Gloaming** is an original spot-the-difference game set across three hand-painted
scenes of dusk — a lantern-lit **Night Market**, a twilight **Tide Pool**, and a
moonlit **Attic Study**. Each round shows two near-identical pictures side by side;
the right one hides a handful of small, fair changes (a crescent moon instead of a
full one, a lantern shifted from amber to mint, a missing bottle, a crab that
scuttled off, a clock telling a different time). Click either panel to ring a
difference on both, race the per-round countdown, chain fast finds for combo
multipliers, and spend your three hints wisely. Every scene is drawn procedurally
on a canvas from a seeded RNG, so the art is deterministic and the two panels stay
pixel-identical except for the designed differences. All sound is synthesised live
with WebAudio oscillators — no audio files, no network, no build step.

## How to play

- **Click** either the ORIGINAL or ALTERED panel to mark a difference. A found
  difference gets an animated ring on both panels; a wrong click gives a gentle
  shake and a small score penalty.
- **Enter** — start the hunt / advance to the next scene / play again.
- **H** — use a hint (pulses one unfound region for ~2 s, costs score; 3 per game).
- **R** — restart the whole hunt.
- **M** — toggle sound.
- Find every difference before the timer runs out. Fast consecutive finds build a
  combo (up to ×5); leftover seconds become a time bonus at each round clear.

Rounds escalate: Night Market hides 5 differences, Tide Pool 6, Attic Study 7.

## How to run

The game is plain static files under `game/` — serve them with any static HTTP
server and open `game/index.html` in desktop Chrome. No network request is made.

```sh
# any static server works, e.g. Python:
python -m http.server 8080 --directory game
# then open http://localhost:8080
```

To hand the entry in (copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the kit's vendored `buildDossier`):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` runs on Node 22.18+ with the standard library only and is deterministic:
two runs write byte-identical output.

## Screenshots

The three images in `screenshots/` are real renders of the game staged through its
own rules via `?shot=<name>&seed=<n>` (see `shots.json` and `game/js/shots.js`):

1. `1-hunt.png` — mid round 1: two differences ringed, three still hidden, "3 LEFT".
2. `2-deep.png` — round 3: finds marked, a live hint pulse and a combo, "4 LEFT".
3. `3-win.png` — the win card with full stats, panels visible behind the overlay.

## Source layout

One clear job per file, all ES modules with relative imports only:

| File | Job |
| --- | --- |
| `game/index.html` | Page shell and HUD markup |
| `game/styles.css` | Cohesive dusk palette, HUD, overlays, animations |
| `game/js/rng.js` | Seeded mulberry32 RNG helpers |
| `game/js/scenes.js` | The three scene painters + per-round difference definitions |
| `game/js/differences.js` | Hit-testing and found-state bookkeeping |
| `game/js/audio.js` | WebAudio oscillator sound effects |
| `game/js/render.js` | Panels, markers, effects, HUD and overlays |
| `game/js/game.js` | State machine: rounds, timer, score, combos, hints |
| `game/js/shots.js` | Deterministic `?shot=` screenshot staging |
| `game/js/main.js` | Bootstrap and mouse/keyboard wiring |

## License

MIT — see [LICENSE](LICENSE). Built by an AI agent for make.fun's
*best spot the difference game* bounty.
