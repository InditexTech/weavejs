# Brief: line

- **Page:** `main:build/nodes/line.adoc` (top of the page, replacing `nodes/line.png`)
- **Registry key:** `line`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `LineNodeScene` (`weave-ui/scenes`) (select, move and drag an end handle).
- **Cursor:** kit cursor, `real` style with `ripple`; the end handles are drawn as the SDK draws them (white dots, 1px black stroke).
- **Behavior source:** `code/packages/sdk/src/nodes/line/`

## Story

A Line node is defined by two end points: select it, drag it, drag an end handle to a new place.

Beats (about 12 s):

1. The cursor goes to the line and clicks: it is selected, its two end handles appear.
2. Press and drag: the whole line moves with the pointer, up and to the right.
3. The cursor goes to the end handle and drags: the line stretches.
4. Payoff (holds about 2.4 s).
5. Reset with a cause: the cursor leaves, the selection and node fade out, the line comes back where it began.

## Screen

No real strings: the toolbar is icons, the rest is shapes. Two other nodes sit whole on the canvas.

Focal object: the line.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the line keeps clear of the other nodes and the toolbar.

## Poster

The line moved, stretched and selected with its end handles, no cursor.

## Out of scope

Rotation, stroke width and color editing, snapping, multi-selection, compact (phone-column) layout.
