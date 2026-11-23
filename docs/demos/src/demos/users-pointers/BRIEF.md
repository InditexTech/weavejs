# Brief: users-pointers

- **Page:** `main:build/plugins/users-pointers.adoc` (top of the page, replacing `plugins/users-pointers.gif`)
- **Registry key:** `users-pointers`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `PointersScene` (`weave-ui/scenes`) (three remote cursors; no local cursor).
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/plugins/users-pointers/ (a named pointer for every connected user)`

## Story

The Users pointers plugin shows every connected user's cursor on the canvas, labeled with their name.

Beats (about 12 s):

1. Three teammates' cursors rest at their own places: Maya (pink), Jon (teal) and Ana (orange), each with a name flag.
2. They move on their own, at slightly different speeds, to new places on the canvas.
3. They move again to a third set of places.
4. Payoff (the cursors rest, about 1.8 s).
5. Reset with a cause: the cursors return to where they began.

## Screen

Real strings: the three names on their flags.

Focal object: the pointers.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the pointers keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Pointer idle fade-out, touch pointers, many users, compact (phone-column) layout.
