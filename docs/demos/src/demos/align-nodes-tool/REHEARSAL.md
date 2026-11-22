# Rehearsal: align-nodes-tool

Gold: `rectangle-tool` pilot, generalized as `AlignNodesToolScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: a node bar that aligns the selection to its left edge).
Beats: marquee-select three, align left, hold, reset, loop ~13s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- `jump: wv-selection__box width -160px` -> the selection box snapped to its new size while the nodes eased; it now uses an eased selection (CSS x, y, width, height) so it follows the nodes (fixed)
Review: no fresh-eye subagent review run.
Posters: `align-nodes-tool-poster-light.png`, `align-nodes-tool-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
