# Rehearsal: comment

Gold: `rectangle-node` pilot, generalized as `CommentNodeScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: a thread card and a typed reply instead of a geometry change).
Beats: open the thread, reply, post, hold, reset, loop ~13s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- `half-pixel glyph` / `lopsided` on the pin -> the pin held an icon and a count of unequal width; it is now a 28 px square-cornered bubble showing only the count, centered (fixed)
- `jump: wv-thread__typed x/width`, `vanishes: placeholder "Reply"`, `lands on a transform` -> the placeholder swapped with typed text and the thread had no layer; the placeholder now overlays and fades, the full reply width is reserved, and the thread has `will-change` (fixed)
- `jump: wv-thread__typed width +8.9px` per typed character -> that is the typing itself (stands)
Review: no fresh-eye subagent review run.
Posters: `comment-poster-light.png`, `comment-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
