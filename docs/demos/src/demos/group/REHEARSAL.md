# Rehearsal: group

Gold: `rectangle-node` pilot, generalized as `GroupNodeScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: a marquee selection, a keyboard shortcut and a group transform).
Beats: marquee, right-click, Group from the menu, move, hold, reset, loop ~15s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- Rework: grouping through the context menu instead of Ctrl G.
Review: no fresh-eye subagent review run.
Posters: `group-poster-light.png`, `group-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
