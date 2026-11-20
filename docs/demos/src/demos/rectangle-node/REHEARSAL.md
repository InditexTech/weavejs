# Rehearsal: rectangle-node

Gold: `freeform-drag` (kept: the shape follows the pointer exactly, caused reset; changed: a canvas node moved and resized instead of a calendar card) and `cursor-resize` (corner resize cursor).
Beats: select 1.5s, move 2.1s, resize 3s, hold 2.4s, reset 1.4s, loop ~12s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- `drift: wv-selection__anchor and wv-selection__anchor glide out of step` while resizing -> corner anchors move with the corner and side anchors with the edge midpoint, so their gap changes as the shape resizes; that is the geometry, it stands
- `manual: same-box content change: rn-shape` -> the shape is redrawn as the drag sizes it; watched in motion, it tracks the pointer (stands)
- Selection taller than the rectangle on the built page until it was resized -> same docs UI rule collapsing `height: 100%` SVGs; selection and shape SVGs now carry `wv-fill` and the dev harness reproduces that CSS (fixed)
Review: no fresh-eye subagent review run.
Posters: `rectangle-node-poster-light.png`, `rectangle-node-poster-dark.png` (2x via `scripts/poster.mjs --reduced`; opaque, the canvas fills the stage)
Assumptions: the resize cursor over a corner anchor is the macOS `resize-nwse`; the SDK default rectangle (white fill, 1px black stroke) in both themes.
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; rotation and the rectangle's other properties; compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
