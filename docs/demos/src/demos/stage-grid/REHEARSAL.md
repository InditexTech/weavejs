# Rehearsal: stage-grid

Gold: `nodes-snapping` (kept: a selector that drives the plugin type; a reset with a cause; changed: the grid selector (app UI)).
Beats: grid off, Lines, Dots, hold, reset, loop ~11s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
- Rework: the selector has padding from the top (40 px) and right (28 px).
Cursor presses on the Dots label (gate warns "covers"; the label is the target).
Review: no fresh-eye subagent review run.
Posters: `stage-grid-poster-light.png`, `stage-grid-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the selector is an app control; the grid is drawn from the canvas style instead of the plugin
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
