# Rehearsal: rectangle-tool

Gold: `freeform-drag` (kept: measured drag, the shape follows the pointer exactly, caused reset; changed: canvas instead of a calendar grid, shape sized by the drag) plus `cursor-morph` for the crosshair.
Beats: pick tool (tooltip) 2.3s, press and drag 1.7s, select + hold 2.6s, reset 1.3s, loop ~11s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`)
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- `selection drift: a text selection drag never read a.caret()` -> `a.drag` over a crosshair canvas is treated as a text selection -> replaced with `click()` (the press ripple) plus a straight `move()` whose `onMove` sizes the shape (fixed)
- `no element with data-target="rest"` and `loop seam: cursor does not end where it starts` -> the rest point is a coordinate, not a target -> `move(REST)` to the same point as `cursor.at` (fixed)
- `uneven gutters: div.rt-node / span.wv-selection` -> the drawn rectangle and its selection are canvas drawings in the SDK, so they are now SVG, and the shape is centered with equal left and right gutters (fixed)
- `manual: same-box content change: rt-shape` at 4.9 s -> the shape is redrawn as the drag sizes it; watched in motion, it tracks the crosshair tip (stands)
- Other nodes on the canvas bled off the right and bottom edges and read as cut-off rectangles -> redrawn as whole SVG shapes inside the canvas (fixed)
- Rectangle clipped while being drawn on the built page -> the docs UI's `.doc .imageblock svg { height: auto }` collapsed the shape's `height: 100%` SVG; the SVGs now carry `wv-fill` and the dev harness reproduces that CSS (fixed)
Review: no fresh-eye subagent review run.
Posters: `rectangle-tool-poster-light.png`, `rectangle-tool-poster-dark.png` (2x via `scripts/poster.mjs --reduced`; opaque, because the canvas fills the stage)
Assumptions: cursor style `real` (macOS set) is used because the `arrow` style has no crosshair; the SDK default rectangle (white fill, 1px black stroke) in both themes.
Unresolved: the real showcase draws a size or snap hint while dragging? Not observed in the SDK source; none shown.
Not checked: side-by-side against a live screenshot of the running frontend; Shift and Alt modifiers; compact layout (the 16:9 stage scales down, text in the tooltip is small at 390 px); Safari and Firefox; fresh-eye review.
