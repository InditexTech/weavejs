# Brief: stage-resize

- **Page:** `main:build/plugins/stage-resize.adoc` (top of the page, replacing `none`)
- **Registry key:** `stage-resize`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `StageResizeScene` (`weave-ui/scenes`) (no local cursor).
- **Cursor:** kit cursor, `real` style with `ripple`no local cursor.
- **Behavior source:** `code/packages/sdk/src/plugins/stage-resize/ (the stage follows its container)`

## Story

The Stage resize plugin keeps the stage the size of its container, so resizing the window resizes the canvas.

Beats:

1. An app window holds the canvas, with a rectangle and an ellipse in its middle and a size tag.
2. The cursor drags the window's bottom-right corner in: the window shrinks and the stage and its content follow, staying centered; the size tag updates.
3. Payoff (holds about 2 s).
4. The cursor drags the corner back out: the window and the stage grow again.
5. The cursor leaves.

## Screen

Real strings: the size tag.

Focal object: the resize.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the resize keeps clear of the other nodes and the toolbar.

## Poster

The smaller window with the stage and its content centered, no cursor.

## Out of scope

Dragging the container edge, window resize events, compact (phone-column) layout.
