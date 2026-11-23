# Brief: measure-tool

- **Page:** `main:build/actions/measure-tool.adoc` (top of the page, replacing `actions/measure-tool.gif`)
- **Registry key:** `measure-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `LineToolScene` (`weave-ui/scenes`) (two clicks: set the start, move, set the end).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/measure-tool/measure-tool.ts (set from, set to, finished) and the showcase UI`

## Story

The Measure tool measures a distance with two clicks; here it measures the width and the height of a rectangle that is already on the canvas.

Beats:

1. A rectangle is on the canvas. The cursor picks the Measure tool (tooltip).
2. It clicks point A (the top-left corner), moves along the top edge and clicks point B (the top-right corner): the measure reads the width (260.00 px) and is selected.
3. The cursor drags the measure away from the rectangle (up) so it sits apart.
4. It picks the tool again and adds a second measure the same way from the top-right to the bottom-right corner: 150.00 px, then drags it away to the right.
5. Payoff (holds about 2.6 s).
6. Reset with a cause: the cursor leaves and the measures go.

## Screen

Real string: the tooltip text and the measure label. Everything else is icons, the faint grid and two other nodes, whole shapes.

Focal object: the measure.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the measure keeps clear of the other nodes and the toolbar.

## Poster

The rectangle with its width measure above and its height measure to the right, both separated from it, no cursor.

## Out of scope

Shift (snap angle) modifiers, touch behavior, compact (phone-column) layout.
