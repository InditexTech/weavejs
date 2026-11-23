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

The Users presence plugin shows what each connected user is doing while they do it, in their own color: you see a remote drag or resize happen, not only where it ended.

Beats:

1. Two teammates' cursors arrive: Jon (teal) on a rectangle, Maya (pink) on the corner of an ellipse.
2. Both select what they work on: a teal selection box around the rectangle, a pink one around the ellipse.
3. At the same time Jon drags the rectangle (box and rectangle travel with his cursor) and Maya resizes the ellipse from its corner (box and ellipse grow with her cursor).
4. Payoff (holds about 2.4 s).
5. Reset with a cause: the selections clear and both cursors go back to where they began.

## Screen

Real string: the name (Jon) on his cursor. The toolbar is icons.

Focal object: the remote drag.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the remote drag keeps clear of the other nodes and the toolbar.

## Poster

Both selections in place: the moved rectangle in teal and the larger ellipse in pink, both cursors visible.

## Out of scope

Several users acting at once, other operations (resize, draw), compact (phone-column) layout.
