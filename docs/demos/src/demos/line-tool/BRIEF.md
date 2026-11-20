# Brief: line-tool

- **Page:** `main:build/actions/line-tool.adoc` (top of the page, replacing `actions/line-tool.gif`)
- **Registry key:** `line-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `LineToolScene` (`weave-ui/scenes`) (press, drag, release).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/line-tool/line-tool.ts and the showcase UI (tooltip "Line tool L")`

## Story

Activating the Line tool and dragging from one point to another on the canvas creates a line node.

Beats (about 11 s):

1. The cursor goes to the Line button; its tooltip shows ("Line tool L").
2. Click: the button lights up, the cursor over the canvas becomes a crosshair.
3. A press and a drag from the start to the end: the line's end rides the tip of the crosshair the whole way.
4. The tool returns to select and the new line is selected with its end handles.
5. Payoff (holds about 2.6 s).
6. Reset with a cause: the selection and node fade out, the cursor returns to where it began.

## Screen

Real string: the tooltip text. Everything else is icons, the faint grid and two other nodes, whole shapes.

Focal object: the line.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the line keeps clear of the other nodes and the toolbar.

## Poster

The line drawn and selected with its end handles, tool back on select, no cursor.

## Out of scope

Shift (snap angle) modifiers, touch behavior, compact (phone-column) layout.
