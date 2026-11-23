# Rehearsal: selection-tool

Gold: `rectangle-tool` pilot, generalized as `SelectionToolScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: selecting nodes by click and by marquee).
Beats: click, shift-click, clear, marquee, hold, reset, loop ~15s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- (no gate findings beyond manual notes)
- Rework 3: the marquee was drawn opaque because its CSS was not loaded in this scene; it is now a translucent selection area.
- Rework 4: a selection of several nodes shows one box that joins them (the selected rectangles together), not a box per node.
Review: no fresh-eye subagent review run.
Posters: `selection-tool-poster-light.png`, `selection-tool-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
