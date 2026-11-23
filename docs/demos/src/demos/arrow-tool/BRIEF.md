# Brief: arrow-tool

- **Page:** `main:build/actions/arrow-tool.adoc` (top of the page, replacing `actions/arrow-tool.gif`)
- **Registry key:** `arrow-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `LineToolScene` (`weave-ui/scenes`) (press, drag, release).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/arrow-tool/arrow-tool.ts and the showcase UI`

## Story

Activating the Arrow tool and dragging from one point to another on the canvas creates a arrow node.

Beats (about 11 s):

1. The cursor goes to the Arrow button; its tooltip shows.
2. Click: the button lights up, the cursor over the canvas becomes a crosshair.
3. A press and a drag from the start to the end: the arrow's end rides the tip of the crosshair the whole way.
4. The tool returns to select and the new arrow is selected with its end handles.
5. Payoff (holds about 2.6 s).
6. Reset with a cause: the selection and node fade out, the cursor returns to where it began.

## Screen

Real string: the tooltip text. Everything else is icons, the faint grid and two other nodes, whole shapes.

Focal object: the arrow.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the arrow keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Shift (snap angle) modifiers, touch behavior, compact (phone-column) layout.
