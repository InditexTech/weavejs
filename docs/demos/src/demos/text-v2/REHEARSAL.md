# Rehearsal: text-v2

Gold: `rectangle-node` pilot, generalized as `RichTextScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: rich text formatting instead of a shape move).
Beats: select a word, bold, list, indent, hold, reset, loop ~16s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- `uneven padding / uneven gutters: div.wv-rich` -> the rich text node was drawn as a card; in the SDK it is plain words on the canvas, so the surface was removed (fixed)
- `jump: wv-format y +75px` -> the floating text toolbar was repositioned between beats while still visible; it now keeps one position above the node (fixed)
- `appears / vanishes: b "launch"` -> bold was an element swap; it is now a weight toggle on the same span (fixed)
- `jump: wv-rich__word width +3.5px` when the word becomes bold -> the bold face is wider than the regular face, so the line reflows by one glyph step (stands)
Review: no fresh-eye subagent review run.
Posters: `text-v2-poster-light.png`, `text-v2-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
