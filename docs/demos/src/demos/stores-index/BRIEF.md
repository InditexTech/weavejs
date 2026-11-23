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

A Weave.js app talks to a store, and you pick the store by the transport and backend you need.

Beats (about 11 s):

1. A Weave.js app on the left, a store in the middle labeled WebSockets, a backend on the right (Express server).
2. The store changes to Azure Web PubSub and the backend with it.
3. It changes to Standalone, with a Node renderer.
4. Payoff (holds about 2.6 s).
5. Reset: back to WebSockets.

## Screen

Real strings: Your app, Weave.js, Store, WebSockets, Azure Web PubSub, Standalone, Express server, Node renderer, backend.

Focal object: the stores overview.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the stores overview keeps clear of the other nodes and the toolbar.

## Poster

The app with the Azure Web PubSub store and its backend.

## Out of scope

Custom stores, how a store is chosen in code, compact (phone-column) layout.
