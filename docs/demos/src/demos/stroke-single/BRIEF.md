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

A single stroke is a straight line; its start and its end can each be a dot or an arrow.

Beats:

1. A plain straight line on the canvas.
2. The cursor selects it: end handles and a Start / End picker appear.
3. The cursor picks the dot for the start: a dot tip appears.
4. It picks the arrow for the end: an arrow tip appears.
5. A drag on the line moves it, with its tips and the picker.
6. Payoff (holds about 2.4 s).
7. Reset with a cause: the cursor leaves and the line returns with no tips.

## Screen

No real strings: the toolbar is icons, the rest is shapes. Two other nodes sit whole on the canvas.

Focal object: the single stroke.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the single stroke keeps clear of the other nodes and the toolbar.

## Poster

The moved line with a dot at the start and an arrow at the end, selected, no cursor.

## Out of scope

Stroke width and color, per-point editing, pressure, compact (phone-column) layout.
