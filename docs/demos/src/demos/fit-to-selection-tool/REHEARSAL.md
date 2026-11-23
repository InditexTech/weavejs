# Rehearsal: fit-to-selection-tool

Gold: `rectangle-tool` pilot, generalized as `ViewportScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: fitting the selected node to the screen with the zoom bar).
Beats: select a note, hover and click Fit to selection, camera fits it, hold, reset, loop ~15s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- `drift: wv-node__fold and text "Idea"` while the camera zooms -> the sticky note's fold and text scale about different points; that is the geometry, it stands
- `jump: wv-tooltip x` when the tooltip's target changed while hidden -> the tooltip now stays on its own button for the whole scene (fixed)
- At 210% the neighbouring star is partly off the edge; that is what zooming into one node does (stands)
Review: no fresh-eye subagent review run.
Posters: `fit-to-selection-tool-poster-light.png`, `fit-to-selection-tool-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
