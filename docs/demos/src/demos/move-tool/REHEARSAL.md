# Rehearsal: move-tool

Gold: `rectangle-tool` pilot, generalized as `ViewportScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: dragging the canvas with the Move tool to pan it).
Beats: pick tool (tooltip), drag the canvas, hold, reset, loop ~13s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- `tight control: toolbar button sits 4px under another` -> Move tool (the hand) was directly under the Selection tool with the hover fill showing; the hand now follows a toolbar divider like the other tool buttons (fixed)
Review: no fresh-eye subagent review run.
Posters: `move-tool-poster-light.png`, `move-tool-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
