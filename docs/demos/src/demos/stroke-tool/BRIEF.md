# Brief: stroke-tool

- **Page:** `main:build/actions/stroke-tool.adoc` (top of the page, replacing `actions/stroke-tool.gif`)
- **Registry key:** `stroke-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `LineToolScene` (`weave-ui/scenes`) (press, drag, release a single stroke with tips).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/stroke-tool/stroke-tool.ts (a stroke single node with tip styles)`

## Story

Activating the Stroke tool and dragging creates a single stroke with a tip at each end.

Beats (about 11 s):

1. The cursor goes to the Stroke button; its tooltip shows.
2. Click: the button lights up, the cursor over the canvas becomes a crosshair.
3. A press and a drag from the start to the end: the stroke grows with a round start tip and an arrow end tip riding the crosshair.
4. The tool returns to select and the stroke is selected with its end handles.
5. Payoff (holds about 2.6 s).
6. Reset with a cause: the selection and stroke fade out, the cursor returns to where it began.

## Screen

Real string: the tooltip text. Everything else is icons, the faint grid and two other nodes.

Focal object: the single stroke.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the single stroke keeps clear of the other nodes and the toolbar.

## Poster

The stroke drawn and selected with its end handles, tool back on select, no cursor.

## Out of scope

Choosing the tip styles, stroke width and color, snapping, compact (phone-column) layout.
