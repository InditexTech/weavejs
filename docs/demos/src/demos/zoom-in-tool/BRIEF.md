# Brief: zoom-in-tool

- **Page:** `main:build/actions/zoom-in-tool.adoc` (top of the page, replacing `actions/zoom-in-tool.gif`)
- **Registry key:** `zoom-in-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ViewportScene` (`weave-ui/scenes`) (a canvas with a camera: nodes in world coordinates, the grid following, the showcase zoom bar).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/zoom-in-tool/zoom-in-tool.ts and the showcase UI ("Zoom in" Shift ArrowDown)`

## Story

Zoom in magnifies the canvas one step at a time.

Beats (about 14 s):

1. The canvas starts zoomed out (50%).
2. The cursor goes to the Zoom in button; its tooltip shows ("Zoom in" and its shortcut).
3. Click: the camera eases in (75%). A second click eases in again (100%); the zoom level rolls with it.
4. Payoff (holds about 2.8 s).
5. Reset with a cause: the cursor leaves and the canvas fades out and comes back at 50%.

## Screen

Real strings: the tooltip text, the zoom level and the note text ("Idea").

Focal object: the canvas.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the canvas keeps clear of the other nodes and the toolbar.

## Poster

The canvas zoomed in to 100%, no cursor.

## Out of scope

Zooming at the pointer, the wheel and pinch, zoom limits, compact (phone-column) layout.
