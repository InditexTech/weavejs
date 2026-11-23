# Brief: selection-tool

- **Page:** `main:build/actions/selection-tool.adoc` (top of the page, replacing `actions/selection-tool.gif`)
- **Registry key:** `selection-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `SelectionToolScene` (`weave-ui/scenes`) (click, shift-click, click on empty canvas, marquee).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/selection-tool/selection-tool.ts (selection of nodes on or off) and the nodes selection plugin`

## Story

With the Selection tool active, clicking a node selects it, shift-click adds another, and dragging over empty canvas selects what the marquee covers.

Beats (about 15 s):

1. The cursor clicks the first rectangle: it is selected.
2. Shift (shown as a keycap) and a click on the second: both are selected.
3. A click on empty canvas clears the selection.
4. A press and a drag over empty canvas draws a marquee around the two lower rectangles; on release both are selected.
5. Payoff (holds about 2.4 s).
6. Reset with a cause: the cursor leaves and the selection clears.

## Screen

No real strings (the keycap "Shift" is shown by the stage). The toolbar is icons.

Focal object: the selection.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the selection keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Selecting inside groups and frames, deselecting with Escape, touch behavior, compact (phone-column) layout.
