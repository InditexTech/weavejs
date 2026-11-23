# Rehearsal: text

Gold: `rectangle-node` pilot, generalized as `TextNodeScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: an HTML text node (canvas text is plain words) with the SDK edit outline instead of a drawn shape).
Beats: select, move, double-click to edit and type, hold, reset, loop ~13s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- `jump: wv-text__typed width +5.5px` per typed character -> the text grows as the word is typed in edit mode (the full width is not reserved because the node is left-aligned and its outline grows with it); it is the typing itself (stands)
Review: no fresh-eye subagent review run.
Posters: `text-poster-light.png`, `text-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
