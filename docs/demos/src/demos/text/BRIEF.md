# Brief: text

- **Page:** `main:build/nodes/text.adoc` (top of the page, replacing `nodes/text.png`)
- **Registry key:** `text`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `TextNodeScene` (`weave-ui/scenes`) (select, move, double-click to edit).
- **Cursor:** kit cursor, `real` style with `ripple`; the text edit caret is a pseudo-element in `#0074ff`.
- **Behavior source:** `code/packages/sdk/src/nodes/text/ (Arial 20, black) and the showcase UI`

## Story

A text node is plain text on the canvas: select it, move it, double-click to edit it.

Beats (about 13 s):

1. The cursor goes to the text and clicks: it is selected.
2. Press and drag: the text moves up and to the right.
3. A double click enters edit mode (the blue outline) and a word is typed at the end.
4. Payoff (holds about 2 s).
5. Reset with a cause: the cursor leaves, the selection and text fade out, the text comes back where it began.

## Screen

Real strings: the node text, "Weave text" and the added " nodes". Two other nodes, the toolbar as icons.

Focal object: the text node.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the text node keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Rich text (see text-v2), fonts and colors, resizing and wrapping, compact (phone-column) layout.
