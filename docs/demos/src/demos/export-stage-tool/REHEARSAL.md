# Rehearsal: export-stage-tool

Gold: `rectangle-tool` pilot, generalized as `ExportScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: exporting the whole stage as an image).
Beats: Export stage in the app toolbar, open the file in Preview, hold, reset, loop ~14s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- same download chip fix (fixed)
- Rework 3: same as the node export; the stage image shows both nodes in Preview.
Review: no fresh-eye subagent review run.
Posters: `export-stage-tool-poster-light.png`, `export-stage-tool-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
