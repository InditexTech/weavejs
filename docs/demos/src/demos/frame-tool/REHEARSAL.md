# Rehearsal: frame-tool

Gold: `rectangle-tool` pilot, generalized as `ToolScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: the shape drawn).
Beats: pick the tool, one click creates the frame, hold, reset, loop ~11s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- (no gate findings beyond manual notes)
- Rework 3: the frame is created by a single click (predefined size), not by dragging.
Review: no fresh-eye subagent review run.
Posters: `frame-tool-poster-light.png`, `frame-tool-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
