# Brief: nodes-selection

- **Page:** `main:build/plugins/nodes-selection.adoc` (top of the page, replacing `plugins/nodes-selection.gif`)
- **Registry key:** `nodes-selection`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `NodesSelectionScene` (`weave-ui/scenes`) (marquee select, move, delete).
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/plugins/nodes-selection/ (click, shift-click and marquee selection)`

## Story

The Nodes selection plugin is the foundation for moving, grouping and deleting: select nodes with a marquee, then act on them together.

Beats (about 14 s):

1. The cursor presses on empty canvas and drags a marquee over two rectangles; on release both are selected with one box.
2. A press and a drag on the selection: both rectangles move together, up and to the right.
3. Delete (shown as a keycap): both selected rectangles are removed; the third one stays.
4. Payoff (holds about 2 s).
5. Reset with a cause: the cursor leaves and the two rectangles come back where they began.

## Screen

No real strings (the keycap "Delete" is shown by the stage). The toolbar is icons.

Focal object: the selection.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the selection keeps clear of the other nodes and the toolbar.

## Poster

The two rectangles moved together and selected, the third left alone, no cursor.

## Out of scope

Shift-click and touch selection (see selection-tool), selecting inside groups, compact (phone-column) layout.
