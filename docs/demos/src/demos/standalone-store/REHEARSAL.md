# Rehearsal: standalone-store

Gold: the `rectangle-node` pilot look and the system-flow parts (`weave-ui/flow`, kit `Connector`) (kept: a reset with a cause; changed: a data flow with no user interaction).
Beats: data in, render, png out, hold, reset, loop ~14s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
- Rework 5: the flat gray #f7f7f7 ground replaces the grid, and the message chips ride in front of the arrows.
- Rework 6: the package rides above the connectors.
No local cursor. Chip fades in before it travels; image box fades up when ready.
Review: no fresh-eye subagent review run.
Posters: `standalone-store-poster-light.png`, `standalone-store-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the render is drawn as a mini canvas; the real store renders with the same engine used for server-side export
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
