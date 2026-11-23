# Rehearsal: text-v2

Gold: `rectangle-node` pilot, generalized as `RichTextScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: rich text formatting instead of a shape move).
Beats: select, double-click a word, bold, select the two rows, list, hold, reset, loop ~17s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- Rework: removed the indent step; rows stay flush with the paragraph (the bullet sits at the paragraph left edge, in line with the first line, and the row text follows it); select the node first, then double click to edit.
- Rework 2: the two rows are selected (a drag across them) before List is applied.
Review: no fresh-eye subagent review run.
Posters: `text-v2-poster-light.png`, `text-v2-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
