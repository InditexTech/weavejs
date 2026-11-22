# Brief: stroke-single

- **Page:** `main:build/nodes/stroke-single.adoc` (top of the page, replacing `nodes/stroke-single.png`)
- **Registry key:** `stroke-single`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `NodeScene` (`weave-ui/scenes`), the generalized rectangle-node pilot; this demo supplies the shape.
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/nodes/stroke-single/ (tip styles at both ends)`

## Story

A stroke single node is one line with optional tips: select it, drag it, scale it from a corner.

Beats (about 12 s):

1. The cursor goes to the single stroke and clicks: it is selected with its bounding box.
2. Press and drag: the single stroke moves with the pointer, up and to the right.
3. The cursor goes to the bottom-right corner anchor (the cursor becomes a resize cursor) and drags: the single stroke scales with its box.
4. Payoff (holds about 2.4 s).
5. Reset with a cause: the cursor leaves, the selection and node fade out, the single stroke comes back at its starting place and size.

## Screen

No real strings: the toolbar is icons, the rest is shapes. Two other nodes sit whole on the canvas.

Focal object: the single stroke.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the single stroke keeps clear of the other nodes and the toolbar.

## Poster

The single stroke moved, scaled and selected with its handles, no cursor.

## Out of scope

Stroke width and color, per-point editing, pressure, compact (phone-column) layout.
