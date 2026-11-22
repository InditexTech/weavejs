# Brief: users-presence

- **Page:** `main:build/plugins/users-presence.adoc` (top of the page, replacing `plugins/users-presence.gif`)
- **Registry key:** `users-presence`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `PresenceScene` (`weave-ui/scenes`) (a remote user acts; no local cursor).
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/plugins/users-presence/ (a remote user's in-progress operation is shown live)`

## Story

The Users presence plugin shows what a connected user is doing while they do it: you see a remote drag happen, not only where it ended.

Beats (about 12 s):

1. A teammate's cursor (Jon, teal) arrives on a rectangle and grabs it.
2. Jon drags: the rectangle travels with his cursor across the canvas, frame by frame, down and to the right.
3. He lets go and the rectangle rests at its new place.
4. Payoff (holds about 2.2 s).
5. Reset with a cause: Jon's cursor goes back to where it began and the rectangle returns with it.

## Screen

Real string: the name (Jon) on his cursor. The toolbar is icons.

Focal object: the remote drag.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the remote drag keeps clear of the other nodes and the toolbar.

## Poster

Jon's drag finished: the rectangle in its new place with Jon at it.

## Out of scope

Several users acting at once, other operations (resize, draw), compact (phone-column) layout.
