# Brief: comments-renderer

- **Page:** `main:build/plugins/comments-renderer.adoc` (top of the page, replacing `plugins/comments-renderer.gif`)
- **Registry key:** `comments-renderer`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `CommentsRendererScene` (`weave-ui/scenes`) (no local cursor).
- **Cursor:** kit cursor, `real` style with `ripple`no local cursor.
- **Behavior source:** `code/packages/sdk/src/plugins/comments-renderer/ (renders a comments model on its own layer; render() is explicit)`

## Story

The Comments renderer plugin paints the comments of a room as pins on a layer of its own. The thread window where users read, type and reply is your app's UI; the plugin does nothing more than render, and repainting the pins after a change is your code's job: you call render().

Beats:

1. Two pins stand on the canvas (painted by the plugin): pin 1 shows 2 comments, pin 2 shows 1.
2. The cursor clicks pin 1: the thread window opens (your UI) with Maya's and Jon's messages.
3. The cursor clicks the reply field, types "Done, thanks!" and presses Enter: the reply joins the thread. Pin 1 still reads 2.
4. After a moment the pin repaints: pin 1 now reads 3.
5. Payoff (holds about 3 s).
6. Reset with a cause: the cursor leaves, the thread closes and the pin goes back to 2.

## Screen

Real strings: the model panel (comments count, a comment text) and render().

Focal object: the comments renderer.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the comments renderer keeps clear of the other nodes and the toolbar.

## Poster

The thread open with the reply, render() lit and pin 1 reading 3, no cursor.

## Out of scope

Opening a thread, many comments, comment colors per author, compact (phone-column) layout.
