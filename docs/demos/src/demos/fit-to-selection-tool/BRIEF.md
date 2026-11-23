# Brief: fit-to-selection-tool

- **Page:** `main:build/actions/fit-to-selection-tool.adoc` (top of the page, replacing `actions/fit-to-selection-tool.gif`)
- **Registry key:** `fit-to-selection-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ViewportScene` (`weave-ui/scenes`) (a canvas with a camera: nodes in world coordinates, the grid following, the showcase zoom bar).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/fit-to-selection-tool/fit-to-selection-tool.ts and the showcase UI ("Fit to selection" Shift 2)`

## Story

Fit to selection zooms and centers the view on the selected nodes.

Beats (about 15 s):

1. The canvas is zoomed out (60%). The cursor clicks the sticky note: it is selected.
2. The cursor goes to the Fit to selection button; its tooltip shows.
3. Click: the camera eases in until the sticky note fills the view (210%).
4. Payoff (holds about 2.8 s).
5. Reset with a cause: the cursor leaves and the canvas fades out and comes back zoomed out.

## Screen

Real strings: the tooltip text, the zoom level and the note text ("Idea").

Focal object: the canvas.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the canvas keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Padding settings, fitting several nodes, compact (phone-column) layout.
