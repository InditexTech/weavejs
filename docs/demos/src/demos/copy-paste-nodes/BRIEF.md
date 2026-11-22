# Brief: copy-paste-nodes

- **Page:** `main:build/plugins/copy-paste-nodes.adoc` (top of the page, replacing `plugins/copy-paste.gif`)
- **Registry key:** `copy-paste-nodes`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `CopyPasteScene` (`weave-ui/scenes`), the generalized rectangle-node pilot; this demo supplies the shape.
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/plugins/copy-paste-nodes/ (Ctrl/Cmd C and V; pastes at the center of the view)`

## Story

The Copy and paste plugin copies the selected nodes with Ctrl/Cmd C and pastes them with Ctrl/Cmd V.

Beats (about 12 s):

1. The cursor clicks a rectangle: it is selected.
2. Ctrl C (a keycap shows).
3. Ctrl V: a copy of the rectangle appears in the middle of the view and is selected.
4. Payoff (holds about 2.6 s).
5. Reset with a cause: the cursor leaves and the copy disappears.

## Screen

No real strings (keycaps are shown by the stage).

Focal object: the copy and paste.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the copy and paste keeps clear of the other nodes and the toolbar.

## Poster

The original rectangle and its pasted copy, the copy selected.

## Out of scope

Pasting several nodes, pasting at the pointer, cut, compact (phone-column) layout.
