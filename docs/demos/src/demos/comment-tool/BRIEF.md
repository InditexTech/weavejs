# Brief: comment-tool

- **Page:** `main:build/actions/comment-tool.adoc` (top of the page, replacing `actions/comment-tool.png`)
- **Registry key:** `comment-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `CommentToolScene` (`weave-ui/scenes`) (a click drops a pin and opens the comment box).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/comment-tool/comment-tool.ts (adding, creating a comment) and the showcase UI`

## Story

Activating the Comment tool and clicking the canvas drops a pin and opens a box to write the comment.

Beats (about 14 s):

1. The cursor goes to the Comment button; its tooltip shows.
2. Click: the button lights up.
3. A click on the canvas drops a pin and opens the comment box with its caret.
4. The comment "Looks good to me" is typed and Enter posts it; the tool returns to select.
5. Payoff (holds about 2.6 s).
6. Reset with a cause: the box and pin fade out, the cursor returns to where it began.

## Screen

Real strings: the tooltip text, the name (Maya) and the comment ("Looks good to me").

Focal object: the comment.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the comment keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Replies, mentions, resolving, touch behavior, compact (phone-column) layout.
