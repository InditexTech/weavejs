# Rehearsal: comment-tool

Gold: `rectangle-tool` pilot, generalized as `CommentToolScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: a pin and a comment box instead of a dragged shape).
Beats: pick tool (tooltip), click to drop a pin, type and post, hold, reset, loop ~14s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- same pin, placeholder and layer fixes as `comment` (fixed); the comment box now keeps its layout while the placeholder fades and the words are typed
- `jump: wv-thread__typed width +7.8px` per typed character -> the typing itself (stands)
Review: no fresh-eye subagent review run.
Posters: `comment-tool-poster-light.png`, `comment-tool-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
