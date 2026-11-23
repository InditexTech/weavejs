# Rehearsal: text-tool

Gold: `rectangle-tool` pilot, generalized as `TextToolScene` (kept: the measured drag where the shape follows the pointer, a reset with a cause; changed: a click that places editable text instead of a drag).
Beats: pick tool (tooltip), click to place, type, select, hold, reset, loop ~14s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- `appears with no entrance / vanishes with no exit: div.wv-text` -> the text node was mounted and unmounted with the scene; it now stays mounted and fades (fixed)
- `jump: wv-text__typed width +18.9px` per typed word chunk -> the typed text grows left to right with the outline following it; it is the typing itself (stands)
- Rework 3: the blue edit outline now grows with the typed text (the invisible rest of the sentence no longer takes width).
Review: no fresh-eye subagent review run.
Posters: `text-tool-poster-light.png`, `text-tool-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: shape proportions follow the SDK defaults for this node; cursor style `real` (macOS set) for its crosshair and resize cursors.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
