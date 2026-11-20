# Brief: frame

- **Page:** `main:build/nodes/frame.adoc` (top of the page, replacing `nodes/frame.png`)
- **Registry key:** `frame`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `FrameNodeScene` (`weave-ui/scenes`) (the edge selects the frame and its contents move with it).
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/nodes/frame/ (edge hit region, `edgeHitWidth`)`

## Story

A frame is selected by its edge, so the nodes inside it stay easy to click: click inside to leave it alone, click the edge to select and move it with its contents.

Beats (about 13 s):

1. The cursor clicks inside the frame on empty canvas: nothing is selected.
2. The cursor goes to the frame's top edge: the edge highlights; a click selects the frame.
3. Press and drag: the frame moves and carries its sticky note and rectangle with it.
4. Payoff (holds about 2.4 s).
5. Reset with a cause: the cursor leaves, the selection and frame fade out, the frame comes back where it began.

## Screen

Real strings: the frame title ("Frame 1") and the note text ("Idea"). The toolbar is icons.

Focal object: the frame.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the frame keeps clear of the other nodes and the toolbar.

## Poster

The frame moved and selected with its contents, no cursor.

## Out of scope

Frame title editing, resizing, background color, nested frames, compact (phone-column) layout.
