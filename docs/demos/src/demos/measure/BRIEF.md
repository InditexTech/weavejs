# Brief: measure

- **Page:** `main:build/nodes/measure.adoc` (top of the page, replacing `nodes/measure.png`)
- **Registry key:** `measure`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `LineNodeScene` (`weave-ui/scenes`) (select, move and drag an end handle).
- **Cursor:** kit cursor, `real` style with `ripple`; the end handles are drawn as the SDK draws them (white dots, 1px black stroke).
- **Behavior source:** `code/packages/sdk/src/nodes/measure/ (#FF3366 line, end ticks, monospace label)`

## Story

A measure node reads a distance; here it sits on an element and measures its width.

Beats:

1. A rectangle with a measure along its top edge, reading 120.00 px.
2. The cursor selects the measure: its end handles show.
3. It drags the right end to the rectangle's corner: the label updates to 240.00 px, the rectangle's width.
4. Payoff (holds about 2.8 s).
5. Reset with a cause: the cursor leaves and the measure goes back to its short length.

## Screen

No real strings except the measure label (its length, updating as the end moves): the toolbar is icons, the rest is shapes. Two other nodes sit whole on the canvas.

Focal object: the measure.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the measure keeps clear of the other nodes and the toolbar.

## Poster

The measure spanning the rectangle width, selected, no cursor.

## Out of scope

Rotation, stroke width and color editing, snapping, multi-selection, compact (phone-column) layout.
