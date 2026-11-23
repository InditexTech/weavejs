# Brief: stores-index

- **Page:** `main:build/stores/index.adoc` (top of the page, replacing `none`)
- **Registry key:** `stores-index`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `StoresIndexScene` (`weave-ui/scenes`) (a system flow; one local cursor in the sync demos).
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/ (the stores: websockets, azure-web-pubsub, standalone)`

## Story

The Store is installed on every client and holds that client's own model of the room. A Transport carries each change to the Store backend, which sends it back through the Transport to the other clients.

Beats:

1. Two clients, each with its canvas over the Store installed on it (a small JSON model), a Transport box between them and a Store (Backend) box behind the Transport; two-way links join client, Transport and client.
2. Step 1, "A client's Store applies the change to its own model": the cursor drags the rectangle in Client A; the Store's JSON line on that client updates and highlights.
3. Step 2, "The Transport carries it to the Store backend": a "change" package goes from Client A to the Transport and down to the Store backend, which lights up.
4. Step 3, "The backend sends it back, and every other client's Store applies it": the package goes back up through the Transport to Client B, whose Store updates its model and whose rectangle moves.
5. The same the other way: Client B drags the ellipse and the package goes B, Transport, backend, Transport, A.
6. Reset with a cause: the cursor leaves and both clients return to their start.

## Screen

Real strings: Your app, Weave.js, Store, WebSockets, Azure Web PubSub, Standalone, Express server, Node renderer, backend.

Focal object: the stores overview.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the stores overview keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Custom stores, how a store is chosen in code, compact (phone-column) layout.
