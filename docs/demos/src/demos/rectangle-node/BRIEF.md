# Brief: rectangle-node

- **Page:** `main:build/nodes/rectangle.adoc` (top of the page, replacing `nodes/rectangle.png`)
- **Registry key:** `rectangle-node`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Gold example:** `freeform-drag` for the measured drag (the shape follows the pointer exactly) and `cursor-resize` for the corner resize cursor.
- **Cursor:** kit cursor, `real` style with `ripple`. The corner anchors carry `data-cursor="resize-nwse"` / `"resize-nesw"`, so the cursor changes as it reaches one.
- **Behavior source:** `code/packages/sdk/src/nodes/rectangle/` and the page text: a rectangle node responds to dragging, resizing and selection.

## Story

A rectangle node is an ordinary node: select it, drag it, resize it from a corner.

Beats (about 12 s):

1. The cursor goes to the rectangle and clicks: it is selected, handles appear.
2. Press and drag: the rectangle moves with the pointer, up and to the right.
3. The cursor goes to its bottom-right corner anchor (the cursor becomes a resize cursor) and drags: the rectangle grows.
4. Payoff (holds about 2.4 s).
5. Reset with a cause: the cursor leaves, the selection and shape fade out, the shape comes back at its starting place and size.

## Screen

No real strings: the toolbar is icons, the rest is shapes. Two other nodes sit whole on the canvas so the room reads as lived in.

Focal object: the rectangle.

## Crop

Toolbar one gutter from the left, canvas full-bleed. Moving and resizing keep the rectangle clear of the other nodes and the toolbar.

## Poster

Rectangle moved, enlarged and selected with its handles, no cursor.

## Out of scope

Rotation, corner radius, fill and stroke editing, shape label, multi-selection, compact (phone-column) layout.
