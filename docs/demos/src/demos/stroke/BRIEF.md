# Brief: stroke

- **Page:** `main:build/nodes/stroke.adoc` (top of the page, replacing `nodes/stroke.png`)
- **Registry key:** `stroke`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `NodeScene` (`weave-ui/scenes`), the generalized rectangle-node pilot; this demo supplies the shape.
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/nodes/stroke/ (render, variable-width strokes)`

## Story

A stroke node is a freehand path, so its shape is irregular.

Beats:

1. The cursor selects the stroke.
2. A drag moves it.
3. The corner anchor resizes it, scaling the path.
4. Payoff (holds about 2.4 s).
5. Reset with a cause: the cursor leaves and the stroke returns.

## Screen

No real strings: the toolbar is icons, the rest is shapes. Two other nodes sit whole on the canvas.

Focal object: the stroke.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the stroke keeps clear of the other nodes and the toolbar.

## Poster

The larger stroke, selected, no cursor.

## Out of scope

Stroke width and color, per-point editing, pressure, compact (phone-column) layout.
