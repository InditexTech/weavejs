# Brief: stage-zoom

- **Page:** `main:build/plugins/stage-zoom.adoc` (top of the page, replacing `plugins/stage-panning.gif`)
- **Registry key:** `stage-zoom`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ViewportScene` (`weave-ui/scenes`), the generalized rectangle-node pilot; this demo supplies the shape.
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/plugins/stage-zoom/ (zoom with wheel, trackpad or controls)`

## Story

The Stage zoom plugin zooms the canvas in and out, from the wheel, the trackpad or controls.

Beats:

1. The canvas at 100%.
2. The cursor goes to Zoom in (tooltip) and clicks twice: 125%, then 150%.
3. It goes to Zoom out (tooltip) and clicks three times: 125%, 100%, 75%.
4. Payoff (holds about 2.4 s).
5. Reset with a cause: the cursor leaves and the view returns to 100%.

## Screen

Real strings: the tooltip, the zoom percentage.

Focal object: the zoom.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the zoom keeps clear of the other nodes and the toolbar.

## Poster

The canvas zoomed out to 75%, no cursor.

## Out of scope

Wheel and pinch gestures, zoom limits, zoom out, compact (phone-column) layout.
