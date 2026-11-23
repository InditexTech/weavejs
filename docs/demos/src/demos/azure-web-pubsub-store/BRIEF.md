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

With the Azure Web PubSub store, an update does not go straight to the other clients: it goes to Azure Web PubSub (the queue), then to your backend, which persists it, and is then broadcast back through Azure to the other clients.

Beats:

1. Two clients, Azure Web PubSub (the queue), your Express backend and a database: both clients read "connecting", then "connected".
2. The cursor drags the rectangle in client A.
3. An "update" goes from A to Azure Web PubSub, and an "event" goes down to the Express backend.
4. The backend sends "persist" to the database, which lights up as "persisted".
5. A "broadcast" goes back up through Azure Web PubSub and an "update" goes out to both clients; client B's rectangle moves.
6. Payoff (holds about 2.6 s), then reset.

## Screen

Real strings: Client A, Client B, Azure Web PubSub, Express backend, transport, persistence, connecting, connected, update.

Focal object: the azure sync.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the azure sync keeps clear of the other nodes and the toolbar.

## Poster

Both clients connected, the database persisted and the broadcast on its way back, no cursor.

## Out of scope

Reconnection, errors, presence, compact (phone-column) layout.
