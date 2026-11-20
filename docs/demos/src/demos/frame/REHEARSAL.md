# Rehearsal: frame

Gold: `rectangle-node` pilot, generalized as `FrameNodeScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: edge selection and a frame carrying its contents).
Beats: click inside (nothing), click the edge, drag the frame, hold, reset, loop ~13s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- Moving the node/group overlapped the decorative node in the top-right -> that node was removed from this scene so nothing collides (fixed)
Review: no fresh-eye subagent review run.
Posters: `frame-poster-light.png`, `frame-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
