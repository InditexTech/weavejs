# Brief: polygon-tool

- **Page:** `main:build/actions/polygon-tool.adoc` (top of the page, replacing `none`)
- **Registry key:** `polygon-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ToolScene` (`weave-ui/scenes`), the generalized `rectangle-tool` pilot; this demo supplies the shape.
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/polygon-tool/polygon-tool.ts (drag to size a preset polygon, pentagon by default) and the showcase UI (tooltip "Polygon tool P")`

## Story

Activating the Polygon tool and dragging on the canvas creates a pentagon node.

Beats (about 11 s):

1. The cursor goes to the Polygon button; its tooltip shows ("Polygon tool P").
2. Click: the button lights up, the cursor over the canvas becomes a crosshair.
3. A press and a drag from corner to corner: the pentagon's box rides the tip of the crosshair the whole way.
4. Release: the tool returns to select and the new pentagon is selected with its handles.
5. Payoff (holds about 2.6 s).
6. Reset with a cause: the selection and shape fade out, the cursor returns to where it began.

## Screen

Real string: the tooltip text. Everything else is icons, the faint grid and two other nodes, whole shapes, so the canvas reads as lived in.

Focal object: the pentagon.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the pentagon keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Shift (constrain) and Alt (draw from the center) modifiers, touch behavior, compact (phone-column) layout.
