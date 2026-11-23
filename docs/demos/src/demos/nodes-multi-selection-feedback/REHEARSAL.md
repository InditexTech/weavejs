# Rehearsal: nodes-multi-selection-feedback

Gold: `selection-tool` (kept: a reset with a cause; changed: per-node outlines for a multi-selection).
Beats: click, shift-click twice, hold, reset, loop ~12s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
- Rework: the selection box and the red outlines appear instantly, with no animation.
Drift gate note: the shared box eases while outlines are instant; geometry note, not a bug.
Review: no fresh-eye subagent review run.
Posters: `nodes-multi-selection-feedback-poster-light.png`, `nodes-multi-selection-feedback-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the red is the plugin's default style (`#ff2c2c`, 2 px)
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
