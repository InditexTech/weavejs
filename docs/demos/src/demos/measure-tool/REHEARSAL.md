# Rehearsal: measure-tool

Gold: `rectangle-tool` pilot, generalized as `LineToolScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: a two-point node drawn by its end points).
Beats: pick, click A and B, drag the measure away, add the height measure and drag it away, hold, reset, loop ~28s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- First run of the demo never showed the tooltip -> the Measure button was not in the toolbar group, so the cursor had no target; added `measure` to the group (fixed)
- `jump: wv-node__measure "0.00 px" width +8.4px` at the start of each draw -> the label grows from `0.00 px` to the live length as the first digits appear (stands)
- Rework 3: the measure tool measures an existing rectangle (width then height), with its corners as the click points. The SDK does not snap to corners; the clicks are placed there.
- Rework 4: each measure is created with two clicks (A, B), selected and then separated from the rectangle; then the second measure is added.
- Rework 5: when a measure is separated from the rectangle, dashed witness lines join the measured points to the measure, so the red line touches the points.
- Rework 6: the witness lines are continuous (not dashed).
Review: no fresh-eye subagent review run.
Posters: `measure-tool-poster-light.png`, `measure-tool-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
