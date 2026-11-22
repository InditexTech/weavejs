# Rehearsal: stage-zoom

Gold: `zoom-in-tool` (kept: the zoom-in-tool demo; a measured zoom where the canvas scales around the middle; changed: the zoom-in story of the viewport scene reused).
Beats: hover Zoom in, click twice, hold, reset, loop ~15s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
Shares the zoom-in story; gate notes a fold/text drift on the sticky note while zooming (scale, not a bug). Wheel and trackpad not drawn.
Review: no fresh-eye subagent review run.
Posters: `stage-zoom-poster-light.png`, `stage-zoom-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shown with the zoom control; the plugin also handles the wheel and trackpad, which this demo does not draw
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
