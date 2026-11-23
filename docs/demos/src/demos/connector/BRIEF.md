# Brief: connector

- **Page:** `main:build/nodes/connector.adoc` (top of the page, replacing `nodes/connector.png`)
- **Registry key:** `connector`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ConnectorNodeScene` (`weave-ui/scenes`) (two nodes joined by a connector that follows when one moves).
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/nodes/connector/ (elbow line type, round anchors)`

## Story

A connector node joins two nodes and keeps following them: move one node and the connector reroutes.

Beats (about 10 s):

1. The cursor goes to the second rectangle and clicks: it is selected.
2. Press and drag: the rectangle moves down and to the left and the connector reroutes between its two anchors the whole way.
3. Payoff (holds about 2.6 s).
4. Reset with a cause: the cursor leaves, the selection and the rectangle with its connector fade out and come back where they began.

## Screen

No real strings. Two rectangles, the connector between them, one other node, the toolbar as icons.

Focal object: the connector.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the connector keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Line type and decorator editing, anchors on other edges, connecting to groups, compact (phone-column) layout.
