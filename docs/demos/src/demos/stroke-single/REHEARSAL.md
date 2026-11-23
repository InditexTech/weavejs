# Rehearsal: stroke-single

Gold: `rectangle-node` pilot, generalized as `NodeScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: the shape drawn).
Beats: select, start dot, end arrow, move the line, hold, reset, loop ~16s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- Rework: a simple line, then the start and the end changed (dot, arrow). The picker is the demo's own control: the SDK exposes none, circle, square and arrow tips and the app provides the UI.
- Rework 2: after the tips are set, the line is dragged to a new place (the picker follows). The picker is the demo's own control; the SDK exposes none, circle, square and arrow tips.
Review: no fresh-eye subagent review run.
Posters: `stroke-single-poster-light.png`, `stroke-single-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
