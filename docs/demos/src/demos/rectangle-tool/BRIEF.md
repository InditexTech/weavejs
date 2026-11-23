# Brief: rectangle-tool

- **Page:** `main:build/actions/rectangle-tool.adoc` (top of the page, replacing `actions/rectangle-tool.gif`)
- **Registry key:** `rectangle-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters have no transparent margin; there is still no plate or window around it.
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the vertical toolbar and a corner of the canvas.
- **Gold example:** `freeform-drag` (kept: a measured drag where the shape follows the cursor exactly, one object, a reset with a cause; changed: a canvas, not a calendar grid, and the shape is sized by the drag itself) with the crosshair behavior of `cursor-morph`.
- **Cursor:** kit cursor, `real` style with `ripple` (the macOS set has the crosshair a drawing tool shows over the canvas). The canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/rectangle-tool/rectangle-tool.ts` (crosshair cursor while the tool is active, the rectangle is sized by dragging, the tool returns to select on release) and the showcase UI in `InditexTech/weavejs-frontend` (tooltip "Rectangle tool R").

## Story

Activating the Rectangle tool and dragging on the canvas creates a rectangle node.

Beats (about 11 s):

1. The cursor goes to the Rectangle button; its tooltip "Rectangle tool R" shows.
2. Click: the button lights up, the cursor over the canvas becomes a crosshair.
3. A press and a drag from corner to corner: the rectangle's corner rides the tip of the crosshair the whole way.
4. Release: the tool returns to select and the new rectangle is selected with its handles.
5. Payoff (holds about 2.6 s).
6. Reset with a cause: the selection and shape fade out, the cursor returns to where it began.

## Screen

Real string: `Rectangle tool R`. Everything else is icons, the faint grid and two other nodes, whole shapes (none cut by an edge), so the canvas reads as lived in.

Focal object: the rectangle.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the drawn rectangle is centered with equal left and right gutters.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Shift (constrain to a square) and Alt (draw from the center) modifiers, which the SDK supports; touch (two-finger) behavior; compact (phone-column) layout.
