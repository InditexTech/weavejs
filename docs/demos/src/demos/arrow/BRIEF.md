# Brief: arrow

- **Page:** `main:build/nodes/arrow.adoc` (top of the page, replacing `nodes/arrow.png`)
- **Registry key:** `arrow`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `LineNodeScene` (`weave-ui/scenes`) (select, move and drag an end handle).
- **Cursor:** kit cursor, `real` style with `ripple`; the end handles are drawn as the SDK draws them (white dots, 1px black stroke).
- **Behavior source:** `code/packages/sdk/src/nodes/arrow/`

## Story

A Arrow node is defined by two end points: select it, drag it, drag an end handle to a new length and direction.

Beats (about 12 s):

1. The cursor goes to the arrow and clicks: it is selected, its two end handles appear.
2. Press and drag: the whole arrow moves with the pointer, up and to the right.
3. The cursor goes to the end handle and drags: the arrow stretches.
4. Payoff (holds about 2.4 s).
5. Reset with a cause: the cursor leaves, the selection and node fade out, the arrow comes back where it began.

## Screen

No real strings: the toolbar is icons, the rest is shapes. Two other nodes sit whole on the canvas.

Focal object: the arrow.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the arrow keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Rotation, stroke width and color editing, snapping, multi-selection, compact (phone-column) layout.
