# Rehearsal: stage-minimap

Gold: `stage-panning` (kept: the map outline following a pan; a measured drag where the canvas follows the pointer; changed:  (pan the canvas, watch the map)).
Beats: drag the canvas, the map outline follows, hold, reset, loop ~14s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
Drift/jump notes are the map outline following the pan, and the reset snap hidden by the cursor leaving.
Review: no fresh-eye subagent review run.
Posters: `stage-minimap-poster-light.png`, `stage-minimap-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the map is drawn from the nodes list instead of the stage render
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
