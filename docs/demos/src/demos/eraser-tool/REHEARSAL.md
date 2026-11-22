# Rehearsal: eraser-tool

Gold: `rectangle-tool` pilot, generalized as `EraserToolScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: removing nodes under the pointer instead of creating one).
Beats: pick tool (tooltip), drag across two nodes, hold, reset, loop ~10s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- (no gate findings beyond manual notes); nodes fade as the pointer enters their box (a coarse hit test with a 6 px margin), not by exact geometry
Review: no fresh-eye subagent review run.
Posters: `eraser-tool-poster-light.png`, `eraser-tool-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
