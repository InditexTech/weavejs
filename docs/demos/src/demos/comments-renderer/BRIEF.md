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

The Comments renderer plugin paints your app's comments as pins on a layer of its own. It does not paint by itself: when the comments change, you call render().

Beats:

1. Your app lists two comments (numbered 1 and 2); the canvas shows pins 1 and 2 on their nodes. Both read "On the canvas".
2. A third comment arrives in the app list. It reads "Not on the canvas yet", and the canvas has no pin 3.
3. commentsRenderer.render() lights up in the panel: pin 3 appears on its node and the comment reads "On the canvas".
4. Payoff (holds about 3.2 s).
5. Reset with a cause: the call dims and the list goes back to two comments.

## Screen

Real strings: the model panel (comments count, a comment text) and render().

Focal object: the comments renderer.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the comments renderer keeps clear of the other nodes and the toolbar.

## Poster

Three pins on the canvas and three comments listed, render() lit.

## Out of scope

Opening a thread, many comments, comment colors per author, compact (phone-column) layout.
