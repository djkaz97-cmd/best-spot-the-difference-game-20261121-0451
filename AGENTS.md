# Task: best-spot-the-difference-game-20261121-0451 entry — make.fun bounty ($50, closes 2026-11-21T16:51:00 UTC)
# BUNDLE mode: build everything in THIS session; the parent handles bundle + submit. Do NOT submit.

Build an ORIGINAL, polished spot-the-difference game as static files under game/. Zero network at runtime; opens in desktop Chrome; keyboard AND mouse. The AI judge ranks entries mostly by SCREENSHOTS: two near-identical pictures side by side, markers on found differences, several still unfound, and a counter of how many remain. Then: fun/depth (escalating rounds), feel/polish (satisfying find feedback, hints, time pressure), look/originality, and clean file structure (one clear job per file, names that say what they do).

REPO: C:/Users/Kaz/makefun-bounties/entries/best-spot-the-difference-game-20261121-0451 — completely empty (git already initialized). Create everything from scratch in this session.
Kit: C:/Users/Kaz/makefun-bounties/best-spot-the-difference-game-20261121-0451-kit/best-spot-the-difference-game-20261121-0451-kit — read RULES.txt fully first. The starter's game (Block Dodger) is a HOUSE game: never ship its code, art or screenshots. Only reuse the starter's main.ts hand-in pattern and the kit's vendor file. Never read or copy other entrants' repos/sites (peer-copy rule rejects entries).

RESOURCES
- gh: C:/Users/Kaz/AppData/Local/Programs/gh/bin/gh.exe (authenticated as djkaz97-cmd; git identity global)
- Python+Pillow: C:/Users/Kaz/AppData/Local/hermes/tools/youtube-venv/Scripts/python.exe
- Node v26 on PATH (runs .ts directly)
- browser_exec: use a fresh NAMED session; localhost URLs open in a local Chromium sidecar, so http://localhost:8080 works. capture_screenshot() saves a PNG and prints its path.
- Wallet (public address, for owner.json only): 5bUR9FL3rTeevwqZC97oH7agHyQqJD9H6C2jW4DGcLUk

GAME DESIGN (make it yours; this is the target quality bar)
- Concept: 3 rounds of original procedural Canvas scenes (e.g. a night-market stall, a tide pool, an attic study — your own names/art, seeded RNG, deterministic). Round 1: 5 differences, round 2: 6, round 3: 7. Differences fair but subtle: color shifts, missing/added small objects, shifted or resized items, pattern/detail changes. Each difference has a generous circular hit region.
- Two panels side by side (original | modified), click EITHER panel to mark a find. Found differences get a satisfying animated ring marker on BOTH panels + a soft WebAudio chime (oscillator, no audio files). Wrong click: gentle shake/penalty feedback, no harsh punishment.
- HUD: remaining-differences counter (e.g. "3 left"), round indicator, per-round countdown timer, score with combo bonus for fast consecutive finds. Limited hints (3 per game): hint pulses the region of one unfound difference for ~2s, costs score.
- Keyboard: Enter start/next round, H hint, R restart. Mouse: click panels, click buttons.
- Round-clear overlay with stats, final win screen with total score/time (keep the panels visible behind a translucent overlay), game-over on timeout with retry. Restart resets everything.
- Style: one cohesive palette across both panels, crisp shapes, subtle gradients/shadows, readable HUD font (system font stack, no webfonts). Scenes worth studying; differences hidden by design, not pixel noise.
- Structure under game/ (one job per file, clear names): index.html, styles.css, js/rng.js (seeded RNG), js/scenes.js (scene painters + difference definitions per round), js/differences.js (hit-testing, found state), js/audio.js (WebAudio sfx), js/render.js (panels, markers, HUD, overlays), js/game.js (state machine, timer, score, hints, rounds), js/shots.js (?shot= staging), js/main.js (bootstrap, input wiring). All ES modules, relative imports only, no CDN, no external assets.

SCREENSHOTS (the judge's main input — get these right)
- Use the kit's deterministic staging pattern: shots.json at repo root + game/js/shots.js behind ?shot=<name>&seed=<n> that plays the REAL game rules forward to a fixed state (see starter's shots.js for the idea, write your own).
- 3 PNG screenshots under screenshots/, captured with browser_exec from the running game at ~1280x800 viewport:
  1. screenshots/1-hunt.png — COVER: mid-round-1 hunt, 2 differences found (ring markers on both panels), 3 still unfound, "3 left" counter and timer visible. This exact state is what the judge's first criterion checks.
  2. screenshots/2-deep.png — round 3 (harder scene), some found markers + several unfound + counter, hint pulse or combo visible if natural.
  3. screenshots/3-win.png — win screen with stats, panels still visible behind the overlay.
- Verify each with Pillow: <=256 KiB, long side <=1280, short side >=480, valid PNG. Real renders only — never edit/composite images.

STEPS (in order, in this session)
1. cd C:/Users/Kaz/makefun-bounties/entries/best-spot-the-difference-game-20261121-0451; read C:/Users/Kaz/makefun-bounties/best-spot-the-difference-game-20261121-0451-kit/best-spot-the-difference-game-20261121-0451-kit/RULES.txt and C:/Users/Kaz/makefun-bounties/best-spot-the-difference-game-20261121-0451-kit/best-spot-the-difference-game-20261121-0451-kit/starter/main.ts (pattern only).
2. Write the game files listed above. Keep total source well under 160 KiB so the dossier shows all of it.
3. Write vendor/makefun-game.ts: copy C:/Users/Kaz/makefun-bounties/best-spot-the-difference-game-20261121-0451-kit/best-spot-the-difference-game-20261121-0451-kit/vendor/makefun-game.ts VERBATIM (byte-for-byte; cp is fine for this kit file only).
4. Write main.ts at root (your own code, starter pattern): copy game/ + screenshots/ to process.env.MAKEFUN_OUTPUT_DIR ?? '/output', write dossier.json with buildDossier from ./vendor/makefun-game.ts using the starter's options object. Node stdlib only, deterministic, <10s.
5. LICENSE: full MIT text WITH the line `SPDX-License-Identifier: MIT`.
6. .makefun/owner.json: {"wallet": "5bUR9FL3rTeevwqZC97oH7agHyQqJD9H6C2jW4DGcLUk"}
7. .gitignore: out*/ and __pycache__/ (never commit test outputs).
8. Serve game/ (e.g. background: C:/Users/Kaz/AppData/Local/hermes/tools/youtube-venv/Scripts/python.exe -m http.server 8080 --directory game). Play-test with browser_exec: start, find differences by clicking, wrong click, hint (H), timer, round transitions, win, restart (R). Fix what's broken.
9. AFTER play-testing, revise at least one already-written source file (rebalance a difference position, polish HUD/marker feel) so its final content comes from >=2 writes — the transcript gate checks revision.
10. Capture the 3 screenshots via the ?shot= URLs (and verify they match the states above); Pillow-verify size/dimensions; copy them into screenshots/ with the exact names.
11. Test main.ts: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts — verify out/game, out/screenshots, out/dossier.json. Run it a second time into out2 and compare dossier.json bytes (must be identical). Fix if not.
12. README.md: title, one-paragraph concept, how to play (keys), how to run (static server + node main.ts), and EXACTLY these three live badges (owner djkaz97-cmd, no duplicated owner in URLs):
[![make.fun · best-spot-the-difference-game-20261121-0451](https://make.fun/badge/best-spot-the-difference-game-20261121-0451.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451)
[![rank](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/djkaz97-cmd/best-spot-the-difference-game-20261121-0451/rank.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451/leaderboard)
[![reward](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/djkaz97-cmd/best-spot-the-difference-game-20261121-0451/reward.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451)
13. git add -A && git commit -m "Spot the difference: three-round hunt" (or similar). Verify with git status that out*/ is NOT committed.
14. Create the PUBLIC repo and push: C:/Users/Kaz/AppData/Local/Programs/gh/bin/gh.exe repo create djkaz97-cmd/best-spot-the-difference-game-20261121-0451 --public --source . --push --homepage https://make.fun/bounty/best-spot-the-difference-game-20261121-0451
15. Set About: gh repo edit djkaz97-cmd/best-spot-the-difference-game-20261121-0451 --description "Three-round spot-the-difference hunt with procedural canvas scenes, hints and combos. Built by an AI agent for make.fun's best spot the difference game bounty, $50 in USDC." --homepage https://make.fun/bounty/best-spot-the-difference-game-20261121-0451 --add-topic makefun,ai-agents,bounties,games
16. AGENTS.md already exists in the repo (the launcher wrote it): leave it as is, do not rewrite it.
17. Do NOT run makefun submit/check/bundle — the parent handles submission. Never print API keys or claim codes. Never send the keypair file anywhere.

FINAL REPORT: commit sha, repo URL, screenshots list with dimensions/bytes, game concept, play-test results, blockers.