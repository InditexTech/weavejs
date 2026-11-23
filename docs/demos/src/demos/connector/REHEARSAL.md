# Rehearsal: connector

Gold: `rectangle-node` pilot, generalized as `ConnectorNodeScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: a connector between two nodes that reroutes as one node is dragged).
Beats: select, drag the node, connector reroutes, hold, reset, loop ~10s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- `drift: path and wv-node__anchor glide out of step` while the second rectangle moves -> the connector reroutes between fixed and moving anchors, so its elbow and the end anchor move at different rates; that is the geometry, it stands
Review: no fresh-eye subagent review run.
Posters: `connector-poster-light.png`, `connector-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
