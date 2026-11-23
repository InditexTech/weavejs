# Brief: websockets-store

- **Page:** `main:build/stores/websockets-store.adoc` (top of the page, replacing `none`)
- **Registry key:** `websockets-store`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `StoreSyncScene` (`weave-ui/scenes`) (a system flow; one local cursor in the sync demos).
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/store-websockets/ (a client store over the WebSockets API, with an Express server)`

## Story

The WebSockets store connects every client to a server over WebSockets, and a change made by one client reaches the others.

Beats (about 14 s):

1. Two clients and a WebSocket server: both clients read "connecting".
2. The connections draw and both read "connected" (the store's connection status).
3. The cursor drags the rectangle in client A.
4. An update message travels from A through the server to B and the rectangle in B moves to match.
5. Payoff (holds about 2.6 s), then reset: connections drop and the rectangles go back.

## Screen

Real strings: Client A, Client B, WebSocket server, Express, connecting, connected, update.

Focal object: the websockets sync.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the websockets sync keeps clear of the other nodes and the toolbar.

## Poster

Both clients connected, A moved and the update on its way to B.

## Out of scope

Reconnection, errors, persistence, user presence, compact (phone-column) layout.
