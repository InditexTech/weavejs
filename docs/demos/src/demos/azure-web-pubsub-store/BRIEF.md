# Brief: azure-web-pubsub-store

- **Page:** `main:build/stores/azure-web-pubsub-store.adoc` (top of the page, replacing `none`)
- **Registry key:** `azure-web-pubsub-store`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `StoreSyncScene` (`weave-ui/scenes`) (a system flow; one local cursor in the sync demos).
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/store-azure-web-pubsub/ (a client store over Azure Web PubSub, with an Express backend)`

## Story

The Azure Web PubSub store uses Azure Web PubSub as its transport, with your Express backend for persistence.

Beats (about 14 s):

1. Two clients, Azure Web PubSub in the middle and an Express backend below it: both clients read "connecting".
2. The connections draw (the backend one dashed) and both read "connected".
3. The cursor drags the rectangle in client A.
4. An update travels from A through Azure Web PubSub to B and the rectangle in B moves.
5. Payoff (holds about 2.6 s), then reset.

## Screen

Real strings: Client A, Client B, Azure Web PubSub, Express backend, transport, persistence, connecting, connected, update.

Focal object: the azure sync.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the azure sync keeps clear of the other nodes and the toolbar.

## Poster

Both clients connected, A moved and the update on its way to B.

## Out of scope

Reconnection, errors, presence, compact (phone-column) layout.
