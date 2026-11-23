# Brief: zoom-out-tool

- **Page:** `main:build/actions/zoom-out-tool.adoc` (top of the page, replacing `actions/zoom-out-tool.gif`)
- **Registry key:** `zoom-out-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ViewportScene` (`weave-ui/scenes`) (a canvas with a camera: nodes in world coordinates, the grid following, the showcase zoom bar).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/zoom-out-tool/zoom-out-tool.ts and the showcase UI ("Zoom out" Shift ArrowUp)`

## Story

Zoom out shrinks the canvas one step at a time.

Beats (about 14 s):

1. The canvas starts at 100%.
2. The cursor goes to the Zoom out button; its tooltip shows ("Zoom out" and its shortcut).
3. Click: the camera eases out (75%). A second click eases out again (50%).
4. Payoff (holds about 2.8 s).
5. Reset with a cause: the cursor leaves and the canvas fades out and comes back at 100%.

## Screen

Real strings: the tooltip text, the zoom level and the note text ("Idea").

Focal object: the canvas.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the canvas keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Zooming at the pointer, the wheel and pinch, zoom limits, compact (phone-column) layout.
