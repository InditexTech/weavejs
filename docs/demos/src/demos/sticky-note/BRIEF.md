# Brief: sticky-note

- **Page:** `main:build/nodes/sticky-note.adoc` (top of the page, replacing `none`)
- **Registry key:** `sticky-note`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `NodeScene` (`weave-ui/scenes`), the generalized rectangle-node pilot; this demo supplies the shape.
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/nodes/sticky-note/`

## Story

A sticky note moves and resizes like any node, and its text is edited in place.

Beats:

1. The cursor selects the note ("Idea").
2. A drag moves it up and to the right.
3. The corner anchor makes it bigger.
4. A double click edits it: Ctrl A (a keycap shows), then the text becomes "Ship the docs".
5. Payoff (holds about 2.2 s).
6. Reset with a cause: the cursor leaves and the note returns with its first text.

## Screen

Real string: the note text.

Focal object: the sticky note.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the sticky note keeps clear of the other nodes and the toolbar.

## Poster

The big note moved and showing the new text, selected, no cursor.

## Out of scope

Rotation, color picker, label editing, multi-selection, compact (phone-column) layout.
