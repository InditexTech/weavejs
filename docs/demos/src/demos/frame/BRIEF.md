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

A frame holds the elements dropped into it, and it can be selected by its title or by its border (not by clicking inside it).

Beats:

1. A sticky note sits outside the frame; the cursor drags it toward the frame. While the note is over the frame, the frame outline highlights (the drop feedback).
2. The note is dropped inside and the highlight goes.
3. The cursor goes to the frame title: the frame highlights and a click selects it.
4. A click on empty canvas deselects it.
5. The cursor goes to the frame border: it highlights and a click selects the frame again.
6. A drag on the border moves the frame and the note inside moves along with it.
7. Payoff (holds about 2.4 s).
8. Reset with a cause: the cursor leaves, everything fades and the note is back outside the frame.

## Screen

Real strings: the frame title ("Frame 1") and the note text ("Idea"). The toolbar is icons.

Focal object: the frame.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the frame keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Frame title editing, resizing, background color, nested frames, compact (phone-column) layout.
