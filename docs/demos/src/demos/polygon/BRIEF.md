# Brief: polygon

- **Page:** `main:build/nodes/polygon.adoc` (top of the page, replacing `none`)
- **Registry key:** `polygon`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `NodeScene` (`weave-ui/scenes`), the generalized `rectangle-node` pilot; this demo supplies the shape.
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/nodes/polygon/ (the pentagon preset)`

## Story

A Polygon node is an ordinary node: select it, drag it, resize it from a corner.

Beats (about 12 s):

1. The cursor goes to the pentagon and clicks: it is selected, handles appear.
2. Press and drag: the pentagon moves with the pointer, up and to the right.
3. The cursor goes to its bottom-right corner anchor (the cursor becomes a resize cursor) and drags: the pentagon grows.
4. Payoff (holds about 2.4 s).
5. Reset with a cause: the cursor leaves, the selection and shape fade out, the pentagon comes back at its starting place and size.

## Screen

No real strings: the toolbar is icons, the rest is shapes. Two other nodes sit whole on the canvas so the room reads as lived in.

Focal object: the pentagon.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the pentagon keeps clear of the other nodes and the toolbar.

## Poster

The pentagon moved, enlarged and selected with its handles, no cursor.

## Out of scope

Rotation, fill and stroke editing, shape label, multi-selection, compact (phone-column) layout.
