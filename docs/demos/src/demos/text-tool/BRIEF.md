# Brief: text-tool

- **Page:** `main:build/actions/text-tool.adoc` (top of the page, replacing `actions/text-tool.gif`)
- **Registry key:** `text-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `TextToolScene` (`weave-ui/scenes`) (a click places a node and enters edit mode).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas shows an I-beam while the text tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/text-tool/text-tool.ts (a click places a node and enters edit mode; Escape finishes) and the showcase UI (tooltip "Text tool T")`

## Story

Activating the Text tool and clicking the canvas places a text node and starts editing it.

Beats (about 14 s):

1. The cursor goes to the Text button; its tooltip shows ("Text tool T").
2. Click: the button lights up and the cursor over the canvas becomes an I-beam.
3. A click on the canvas places the node in edit mode (blue outline and caret).
4. The words are typed.
5. Finishing the edit returns the tool to select and the text node is selected.
6. Payoff (holds about 2.4 s).
7. Reset with a cause: the selection and text fade out, the cursor returns to where it began.

## Screen

Real strings: the tooltip text and the typed words, "Weave the web together". Everything else is icons and two other nodes.

Focal object: the text node.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the text node keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Fonts and colors, rich text, touch behavior, compact (phone-column) layout.
