# Rehearsal: image-tool

Gold: `rectangle-tool` pilot, generalized as `PlaceToolScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: a click that places a media node while a translucent preview follows the pointer).
Beats: pick tool (tooltip), preview rides the pointer, click to place, hold, reset, loop ~11s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- `jump: wv-node__well x -587px` at the start of the move -> the preview started at a stale position and jumped to the pointer; it now starts under the pointer while invisible and fades in there (fixed)
Review: no fresh-eye subagent review run.
Posters: `image-tool-poster-light.png`, `image-tool-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
