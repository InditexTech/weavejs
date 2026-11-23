# Brief: regular-polygon

- **Page:** `main:build/nodes/regular-polygon.adoc` (top of the page, replacing `nodes/regular-polygon.png`)
- **Registry key:** `regular-polygon`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `NodeScene` (`weave-ui/scenes`), the generalized `rectangle-node` pilot; this demo supplies the shape.
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/nodes/regular-polygon/`

## Story

A regular polygon has equal sides; here a pentagon in a square box.

Beats:

1. The cursor selects the pentagon.
2. A drag moves it.
3. The corner anchor grows it, keeping the square box.
4. Payoff (holds about 2.4 s).
5. Reset with a cause: the cursor leaves and the pentagon returns.

## Screen

No real strings: the toolbar is icons, the rest is shapes. Two other nodes sit whole on the canvas so the room reads as lived in.

Focal object: the regular polygon.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the regular polygon keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Rotation, fill and stroke editing, shape label, multi-selection, compact (phone-column) layout.
