# Brief: stage-minimap

- **Page:** `main:build/plugins/stage-minimap.adoc` (top of the page, replacing `none`)
- **Registry key:** `stage-minimap`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `StageMinimapScene` (`weave-ui/scenes`), the generalized rectangle-node pilot; this demo supplies the shape.
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/plugins/stage-minimap/ (a scaled-down view with the visible region outlined)`

## Story

The Stage minimap plugin shows the whole room in miniature, with the visible region outlined.

Beats (about 14 s):

1. A small map in the bottom right corner outlines the visible part of a larger room.
2. The cursor presses on the canvas and drags: the room moves under the cursor and the outline moves on the map.
3. Release: the new view rests.
4. Payoff (holds about 2.6 s).
5. Reset with a cause: the cursor leaves and the view returns.

## Screen

No real strings.

Focal object: the minimap.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the minimap keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Clicking the map to move, resize with the container, compact (phone-column) layout.
