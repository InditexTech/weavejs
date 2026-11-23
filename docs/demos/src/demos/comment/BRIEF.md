# Brief: comment

- **Page:** `main:build/nodes/comment.adoc` (top of the page, replacing `nodes/comment.png`)
- **Registry key:** `comment`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `CommentNodeScene` (`weave-ui/scenes`) (open a thread from its pin and reply).
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/nodes/comment/ (the comment pin node)`

## Story

A comment node is a pin on the canvas: click it to open its thread and reply.

Beats (about 13 s):

1. The cursor clicks the comment pin (a count of 2): its thread opens with two messages.
2. The cursor clicks the Reply field and types "Thanks!".
3. Enter posts it: the thread gains a third message and the pin count goes to 3.
4. Payoff (holds about 2.4 s).
5. Reset with a cause: the cursor leaves, the thread closes and the reply is withdrawn.

## Screen

Real strings: the names (Maya, Jon) and the messages ("Can we shorten the title?", "Done, take a look.", "Thanks!").

Focal object: the comment.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the comment keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Resolving a thread, mentions, editing a comment, compact (phone-column) layout.
