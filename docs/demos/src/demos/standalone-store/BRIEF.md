# Brief: standalone-store

- **Page:** `main:build/stores/standalone-store.adoc` (top of the page, replacing `none`)
- **Registry key:** `standalone-store`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `StandaloneScene` (`weave-ui/scenes`) (a system flow; one local cursor in the sync demos).
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/store-standalone/ (renders room data; used by server-side rendering)`

## Story

The Standalone store renders room data you pass it, which is what lets a server export a room as an image.

Beats (about 14 s):

1. Room data (a JSON file) on the left, the Standalone store in the middle and an Image on the right, faded.
2. A message with the room data travels into the store.
3. The store's canvas fills with a rectangle and an ellipse.
4. A png message travels to the image, which lights up as room.png.
5. Payoff (holds about 2.8 s), then reset.

## Screen

Real strings: Room data, from your app, Standalone store, renders the room, Image, room.png, room data, png.

Focal object: the standalone render.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the standalone render keeps clear of the other nodes and the toolbar.

## Poster

The store with its rendered room and the image ready.

## Out of scope

Fonts and assets, video frames, cancelling a render, compact (phone-column) layout.
