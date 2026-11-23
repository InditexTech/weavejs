# Rehearsal: stage-panning

Gold: `move-tool` (kept: the move-tool pan demo; a measured drag where the canvas follows the pointer; changed: the pan story of the viewport scene reused).
Beats: pick hand, drag the canvas, hold, reset, loop ~15s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
- Rework: the zoom controls are removed from this demo.
Shares the move-tool pan story (ViewportScene pan).
Review: no fresh-eye subagent review run.
Posters: `stage-panning-poster-light.png`, `stage-panning-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shared with the move tool demo: the same drag story; the plugin is what makes it work
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
