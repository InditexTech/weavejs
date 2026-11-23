# Rehearsal: arrow-tool

Gold: `rectangle-tool` pilot, generalized as `LineToolScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: a two-point node drawn by its end points).
Beats: pick tool (tooltip), press and drag, select and hold, reset, loop ~11s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- `manual: same-box content change` -> the arrow is redrawn as the drag moves its end; watched in motion, the head rides the crosshair tip (stands)
Review: no fresh-eye subagent review run.
Posters: `arrow-tool-poster-light.png`, `arrow-tool-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
