# Brief: stage-panning

- **Page:** `main:build/plugins/stage-panning.adoc` (top of the page, replacing `plugins/stage-panning.gif`)
- **Registry key:** `stage-panning`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ViewportScene` (`weave-ui/scenes`), the generalized rectangle-node pilot; this demo supplies the shape.
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/plugins/stage-panning/ (drag to move the stage)`

## Story

The Stage panning plugin lets you move around the canvas by dragging.

Beats (about 15 s):

1. The cursor picks the hand tool (tooltip).
2. It presses on the canvas and drags: the whole canvas, grid and nodes, follows.
3. Release: the new view rests.
4. Payoff (holds about 2.4 s).
5. Reset with a cause: the cursor leaves and the view returns.

## Screen

Real strings: the tool tooltip and the zoom level.

Focal object: the panning.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the panning keeps clear of the other nodes and the toolbar.

## Poster

The canvas panned down and to the left of where it began.

## Out of scope

Space-drag panning, wheel panning, inertia, compact (phone-column) layout.
