# Brief: move-tool

- **Page:** `main:build/actions/move-tool.adoc` (top of the page, replacing `actions/move-tool.gif`)
- **Registry key:** `move-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ViewportScene` (`weave-ui/scenes`) (a canvas with a camera: nodes in world coordinates, the grid following, the showcase zoom bar).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/move-tool/move-tool.ts (panning the stage) and the showcase UI (the Move tool button, "Move tool M")`

## Story

Activating the Move tool lets you pan the canvas by dragging it.

Beats (about 13 s):

1. The cursor goes to the Move tool button (the hand); its tooltip shows ("Move tool M").
2. Click: the button lights up and the cursor over the canvas becomes an open hand.
3. A press and a drag: the hand closes and the whole canvas, nodes and grid, follows the pointer down and to the left.
4. Release: the tool returns to select.
5. Payoff (holds about 2.4 s).
6. Reset with a cause: the cursor leaves and the canvas fades out and comes back at its starting view.

## Screen

Real strings: the tooltip text, the zoom level ("100%") and the note text ("Idea").

Focal object: the canvas.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the canvas keeps clear of the other nodes and the toolbar.

## Poster

The canvas panned, no cursor.

## Out of scope

Momentum, panning with the wheel or touch, panning limits, compact (phone-column) layout.
