# Brief: brush-tool

- **Page:** `main:build/actions/brush-tool.adoc` (top of the page, replacing `actions/brush-tool.gif`)
- **Registry key:** `brush-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `PenToolScene` (`weave-ui/scenes`) (press, draw a freehand path, release).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/brush-tool/ (input profiles, `profiles.ts`) and the showcase UI (tooltip "Brush tool B")`

## Story

Activating the Brush tool and dragging draws a freehand stroke with a soft, thick brush.

Beats (about 11 s):

1. The cursor goes to the Brush button; its tooltip shows ("Brush tool B").
2. Click: the button lights up, the cursor over the canvas becomes a crosshair.
3. A press and a drag along a gentle wave: the stroke grows behind the crosshair tip, one sampled point at a time.
4. Release: the tool returns to select and the stroke is selected with its bounding box.
5. Payoff (holds about 2.6 s).
6. Reset with a cause: the selection and stroke fade out, the cursor returns to where it began.

## Screen

Real string: the tooltip text. Everything else is icons, the faint grid and one other node.

Focal object: the stroke.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the stroke keeps clear of the other nodes and the toolbar.

## Poster

The stroke drawn and selected, tool back on select, no cursor.

## Out of scope

Pressure and input profiles, smoothing settings, color and width pickers, touch behavior, compact (phone-column) layout.
