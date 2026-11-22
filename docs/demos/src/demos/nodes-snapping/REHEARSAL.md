# Rehearsal: nodes-snapping

Gold: `rectangle-node` (kept: the measured drag where the node follows the pointer; changed: a snap with a guide and a distance tag instead of a free drag).
Beats: grab, drag, snap with a guide and distance, drop, hold, reset, loop ~13s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
The ~14px jump is the snap itself.
Review: no fresh-eye subagent review run.
Posters: `nodes-snapping-poster-light.png`, `nodes-snapping-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the snap threshold (14 px) is illustrative; the SDK's is configurable
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
