# Brief: text-v2

- **Page:** `main:build/nodes/text-v2.adoc` (top of the page, replacing `none`)
- **Registry key:** `text-v2`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `RichTextScene` (`weave-ui/scenes`) (a document with a floating format toolbar).
- **Cursor:** kit cursor, `real` style with `ripple`; no canvas cursor kinds are needed.
- **Behavior source:** `code/packages/sdk/src/nodes/text-v2/ (marks, lists, paragraph indent) and the showcase floating text toolbar`

## Story

A rich text node is selected first, then edited in place: select a word, make it bold, turn rows into a list.

Beats:

1. The cursor clicks the text node: it is selected with its box.
2. A double click on a word enters edit mode and selects it; the floating toolbar appears.
3. The cursor clicks Bold.
4. The cursor drags across the two rows: both are selected.
5. It clicks List: both rows get bullets (at the left edge of the paragraph above, in line with its first line, no indent).
6. Payoff (holds about 2.2 s).
7. Reset with a cause: the cursor leaves and the text goes back to plain.

## Screen

Real strings: the document words ("Plan the launch with the whole team.", "Draft the roadmap", "Review with design"). The format toolbar is icons.

Focal object: the rich text node.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the rich text node keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Font family and size, colors, links, alignment, line height, compact (phone-column) layout.
