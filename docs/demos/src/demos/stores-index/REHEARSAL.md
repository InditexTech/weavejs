# Rehearsal: stores-index

Gold: the `rectangle-node` pilot look and the system-flow parts (`weave-ui/flow`, kit `Connector`) (kept: a reset with a cause; changed: a swap between three stores).
Beats: app plus store plus backend, store changes twice, reset, loop ~11s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
No local cursor. Store and backend labels swap together.
Review: no fresh-eye subagent review run.
Posters: `stores-index-poster-light.png`, `stores-index-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the Standalone store has no live client link in practice; it is drawn with the same shape for comparison
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
