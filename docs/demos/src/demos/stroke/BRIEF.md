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

A stroke node is a freehand line: select it, drag it, scale it from a corner.

Beats (about 12 s):

1. The cursor goes to the stroke and clicks: it is selected with its bounding box.
2. Press and drag: the stroke moves with the pointer, up and to the right.
3. The cursor goes to the bottom-right corner anchor (the cursor becomes a resize cursor) and drags: the stroke scales with its box.
4. Payoff (holds about 2.4 s).
5. Reset with a cause: the cursor leaves, the selection and node fade out, the stroke comes back at its starting place and size.

## Screen

No real strings: the toolbar is icons, the rest is shapes. Two other nodes sit whole on the canvas.

Focal object: the stroke.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the stroke keeps clear of the other nodes and the toolbar.

## Poster

The stroke moved, scaled and selected with its handles, no cursor.

## Out of scope

Stroke width and color, per-point editing, pressure, compact (phone-column) layout.
