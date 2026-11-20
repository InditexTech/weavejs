# Rehearsal: polygon

Gold: `rectangle-node` pilot, generalized as `NodeScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: the shape drawn).
Beats: select, move, resize from the corner, hold, reset, loop ~12s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- `drift: wv-selection__anchor ... glide out of step` while resizing -> corner anchors follow the corner and side anchors the edge midpoint, so their gap changes as the node resizes; that is the geometry, it stands
- `manual: same-box content change` -> the shape is redrawn as the drag sizes it; watched in motion, it tracks the pointer (stands)
Review: no fresh-eye subagent review run.
Posters: `polygon-poster-light.png`, `polygon-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
