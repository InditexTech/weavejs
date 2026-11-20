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

Activating the Measure tool and clicking the start and then the end on the canvas creates a measure node.

Beats (about 11 s):

1. The cursor goes to the Measure button; its tooltip shows.
2. Click: the button lights up, the cursor over the canvas becomes a crosshair.
3. A click sets the start, the cursor moves and the live measure follows it, a second click sets the end.
4. The tool returns to select and the new measure is selected with its end handles.
5. Payoff (holds about 2.6 s).
6. Reset with a cause: the selection and node fade out, the cursor returns to where it began.

## Screen

Real string: the tooltip text and the measure label. Everything else is icons, the faint grid and two other nodes, whole shapes.

Focal object: the measure.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the measure keeps clear of the other nodes and the toolbar.

## Poster

The measure drawn and selected with its end handles, tool back on select, no cursor.

## Out of scope

Shift (snap angle) modifiers, touch behavior, compact (phone-column) layout.
