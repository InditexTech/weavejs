# Rehearsal: azure-web-pubsub-store

Gold: the `rectangle-node` pilot look and the system-flow parts (`weave-ui/flow`, kit `Connector`) (kept: the sync flow of the websockets store; changed: Azure Web PubSub as the transport and an Express backend for persistence).
Beats: connect, drag in A, update to the queue, event to the backend, persist to the database, broadcast to B, hold, reset, loop ~25s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
- Rework 5: the flow is the real one (client to queue to backend, persist, broadcast back to the other clients) on a flat gray ground.
- Rework 6: A to Azure to B are bidirectional links, the package rides above them, and the broadcast goes to both clients.
Same notes as websockets-store; the backend link is dashed (persistence).
Review: no fresh-eye subagent review run.
Posters: `azure-web-pubsub-store-poster-light.png`, `azure-web-pubsub-store-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the backend link is dashed because it is the persistence side, not the live path
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
