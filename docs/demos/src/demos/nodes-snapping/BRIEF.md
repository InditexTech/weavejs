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

The Nodes snapping plugin snaps a node to the edges of other nodes as it is dragged, with a guide and the distance between them.

Beats (about 13 s):

1. The cursor grabs the lower rectangle.
2. It drags it left and up toward the upper rectangle: as the left edges come close, a red guide appears with the distance tag and the node snaps onto the guide while the pointer keeps going a few pixels further.
3. Release: the guide goes and the rectangle rests aligned with the one above.
4. Payoff (holds about 2.4 s).
5. Reset with a cause: the cursor leaves and the rectangle returns to where it began.

## Screen

Real string: the distance on the red tag (the gap in pixels, updating while dragging).

Focal object: the snapping.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the snapping keeps clear of the other nodes and the toolbar.

## Poster

The lower rectangle aligned to the left edge of the upper one, no cursor.

## Out of scope

Snapping to guides and the grid, snapping while resizing, equal-spacing guides, compact (phone-column) layout.
