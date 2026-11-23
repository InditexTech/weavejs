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

A polygon node is a closed shape of straight sides; here a regular octagon in a square box.

Beats:

1. The cursor selects the octagon.
2. A drag moves it.
3. The corner anchor grows it, keeping the square box.
4. Payoff (holds about 2.4 s).
5. Reset with a cause: the cursor leaves and the octagon returns.

## Screen

No real strings: the toolbar is icons, the rest is shapes. Two other nodes sit whole on the canvas so the room reads as lived in.

Focal object: the pentagon.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the pentagon keeps clear of the other nodes and the toolbar.

## Poster

The larger octagon, selected, no cursor.

## Out of scope

Rotation, fill and stroke editing, shape label, multi-selection, compact (phone-column) layout.
