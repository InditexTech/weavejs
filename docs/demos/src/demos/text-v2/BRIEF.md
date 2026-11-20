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

Text v2 is rich text: select a word to make it bold, turn rows into a list and indent one.

Beats (about 16 s):

1. The cursor double-clicks the word "launch": it is selected and the floating text toolbar appears.
2. Click Bold: the word becomes bold.
3. The cursor clicks the next rows and Bullet list is clicked: the rows become a list.
4. Click Indent: the second row moves in by one step.
5. Payoff (holds about 2 s).
6. Reset with a cause: the toolbar goes, the formatting is undone while the cursor leaves.

## Screen

Real strings: the document words ("Plan the launch with the whole team.", "Draft the roadmap", "Review with design"). The format toolbar is icons.

Focal object: the rich text node.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the rich text node keeps clear of the other nodes and the toolbar.

## Poster

The word in bold and the two rows as a list with the second one indented, no cursor.

## Out of scope

Font family and size, colors, links, alignment, line height, compact (phone-column) layout.
