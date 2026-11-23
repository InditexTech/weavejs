# Rehearsal: measure

Gold: `rectangle-node` pilot, generalized as `LineNodeScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: a two-point node whose end handle is dragged instead of a corner anchor).
Beats: select the measure, drag its end onto the element corner, hold, reset, loop ~12s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- Rework: the measure sits on an element instead of floating free. The label reads the length drawn (width of the element at the end).
Review: no fresh-eye subagent review run.
Posters: `measure-poster-light.png`, `measure-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
