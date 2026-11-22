# Rehearsal: stage-keyboard-move

Gold: `nodes-selection` (kept: nudges by keyboard instead of a drag; keycaps and a selection that follows the node; changed:  (select, nudge with the keyboard)).
Beats: select, Shift+right x6, Shift+down x3, hold, reset, loop ~13s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
Jumps are the 10px key steps, by design. The page says the default is 5; the code default for Shift is 10 (page text to check).
Review: no fresh-eye subagent review run.
Posters: `stage-keyboard-move-poster-light.png`, `stage-keyboard-move-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the step is 10 px, the plugin default for Shift; the page text says 5, which differs from the code
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
