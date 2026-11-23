# Rehearsal: export-node-tool

Gold: `rectangle-tool` pilot, generalized as `ExportScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: exporting one node as an image).
Beats: select, Export node in the app toolbar, open the file in Preview, hold, reset, loop ~16s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- `half-pixel glyph` on the download chip -> the chip had content-dependent width; it now has a fixed width and left padding (fixed)
- Rework 3: the export lives on an app toolbar apart from the node (no node bar), and the demo opens the exported file on the OS (a Preview window) so the image is visible.
Review: no fresh-eye subagent review run.
Posters: `export-node-tool-poster-light.png`, `export-node-tool-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
