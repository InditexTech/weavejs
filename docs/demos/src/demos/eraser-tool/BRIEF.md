# Brief: eraser-tool

- **Page:** `main:build/actions/eraser-tool.adoc` (top of the page, replacing `actions/eraser-tool.gif`)
- **Registry key:** `eraser-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `EraserToolScene` (`weave-ui/scenes`) (drag across nodes, each one touched is removed).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/eraser-tool/eraser-tool.ts (nodes under the pointer are removed while erasing)`

## Story

Activating the Eraser tool and dragging across the canvas removes every node the pointer touches.

Beats (about 10 s):

1. The cursor goes to the Eraser button; its tooltip shows.
2. Click: the button lights up, the cursor over the canvas becomes a crosshair.
3. A press and a drag along a zig-zag: the rectangle and then the ellipse fade out as the pointer touches them; the squiggle below is left alone.
4. The tool returns to select and the two removed nodes stay gone.
5. Payoff (holds about 2.4 s).
6. Reset with a cause: the cursor leaves and the nodes come back where they were.

## Screen

Real string: the tooltip text. Everything else is icons, three nodes and one other whole shape.

Focal object: the node.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the node keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Eraser size, erasing parts of a stroke, undo, touch behavior, compact (phone-column) layout.
