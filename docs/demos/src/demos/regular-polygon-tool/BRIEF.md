# Brief: regular-polygon-tool

- **Page:** `main:build/actions/regular-polygon-tool.adoc` (top of the page, replacing `actions/regular-polygon-tool.gif`)
- **Registry key:** `regular-polygon-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ToolScene` (`weave-ui/scenes`), the generalized `rectangle-tool` pilot; this demo supplies the shape.
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/regular-polygon-tool/regular-polygon-tool.ts (five sides by default)`

## Story

Activating the Regular polygon tool and dragging on the canvas creates a regular polygon node.

Beats (about 11 s):

1. The cursor goes to the Regular polygon button; its tooltip shows.
2. Click: the button lights up, the cursor over the canvas becomes a crosshair.
3. A press and a drag from corner to corner: the regular polygon's box rides the tip of the crosshair the whole way.
4. Release: the tool returns to select and the new regular polygon is selected with its handles.
5. Payoff (holds about 2.6 s).
6. Reset with a cause: the selection and shape fade out, the cursor returns to where it began.

## Screen

Real string: the tooltip text. Everything else is icons, the faint grid and two other nodes, whole shapes, so the canvas reads as lived in.

Focal object: the regular polygon.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the regular polygon keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Shift (constrain) and Alt (draw from the center) modifiers, touch behavior, compact (phone-column) layout.
