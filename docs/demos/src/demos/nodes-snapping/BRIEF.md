# Brief: nodes-snapping

- **Page:** `main:build/plugins/nodes-snapping.adoc` (top of the page, replacing `plugins/nodes-snapping.gif`)
- **Registry key:** `nodes-snapping`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `SnappingScene` (`weave-ui/scenes`) (drag a node and snap it to another node's edge).
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/plugins/nodes-snapping/ (red alignment guides `#FF3B30`, a distance tag, snapping within a threshold)`

## Story

The Nodes snapping plugin snaps a node to others as it is dragged, in two ways: alignment guides that run across the whole stage, and equal spacing between nodes.

Beats:

1. The cursor grabs the lower rectangle and drags it left toward the upper one. As the left edges align, the node snaps and a red guide runs across the whole stage.
2. Release: the guide goes and the two rectangles stay aligned.
3. The scene changes to three rectangles in a row: A and B with a 60 px gap, C far to the right.
4. The cursor drags C toward B. When the gap matches the one between A and B, C snaps and both gaps show the same distance tag (60).
5. Payoff (holds about 2.8 s).
6. Reset with a cause: the cursor leaves and the scene returns to the first pair.

## Screen

Real string: the distance on the red tag (the gap in pixels, updating while dragging).

Focal object: the snapping.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the snapping keeps clear of the other nodes and the toolbar.

## Poster

Three rectangles with equal gaps and the 60 px distance tags in both gaps, no cursor.

## Out of scope

Snapping to guides and the grid, snapping while resizing, equal-spacing guides, compact (phone-column) layout.
