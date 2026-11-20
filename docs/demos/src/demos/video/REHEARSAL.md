# Rehearsal: video

Gold: `rectangle-node` pilot, generalized as `VideoNodeScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: playback instead of a geometry change).
Beats: select, play, progress advances, hold, reset, loop ~11s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- `jump: wv-node__bar width +17.8px` per step -> the progress advanced in 11 steps; the bar now transitions its width linearly between steps (fixed)
Review: no fresh-eye subagent review run.
Posters: `video-poster-light.png`, `video-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
