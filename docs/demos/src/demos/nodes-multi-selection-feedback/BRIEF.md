# Brief: nodes-multi-selection-feedback

- **Page:** `main:build/plugins/nodes-multi-selection-feedback.adoc` (top of the page, replacing `plugins/nodes-multi-selection-feedback.gif`)
- **Registry key:** `nodes-multi-selection-feedback`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `MultiSelectionFeedbackScene` (`weave-ui/scenes`) (click, then shift-click twice).
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/plugins/nodes-multi-selection-feedback/ (a 2px #ff2c2c outline on each node of a multi-selection)`

## Story

The Nodes multi-selection feedback plugin outlines each node of a multi-selection, so you can see exactly what is selected.

Beats (about 12 s):

1. The cursor clicks the first rectangle: it is selected with the usual blue box, and no extra outline.
2. Shift-click on the second: each of the two gets a red outline inside the shared blue box.
3. Shift-click on the third: all three are outlined in red.
4. Payoff (holds about 2.4 s).
5. Reset with a cause: the cursor leaves and the selection clears.

## Screen

No real strings (the keycap "Shift" is shown by the stage). The toolbar is icons.

Focal object: the multi-selection feedback.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the multi-selection feedback keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Changing the outline color, marquee multi-selection, compact (phone-column) layout.
