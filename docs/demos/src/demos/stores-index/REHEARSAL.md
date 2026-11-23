# Rehearsal: stores-index

Gold: the `rectangle-node` pilot look and the system-flow parts (`weave-ui/flow`, kit `Connector`) (kept: a reset with a cause; changed: a swap between three stores).
Beats: client A changes its Store model, the package goes A, Transport, Store backend, Transport, B; then the other way with the ellipse, loop ~32s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
- Rework 5 (iterating with the user): an interactive selector and one flow per store, with a caption, on the flat gray ground.
- Rework 6: an abstract example of the Store concept (no store kinds): clients, a store with the shared state, and three numbered steps.
- Rework 7: the room has two different elements; client A changes the rectangle and client B changes the ellipse.
- Rework 8: the store holds the room as a simplified JSON model (one line per element, the changed line highlighted) instead of a canvas.
- Rework 9: each client shows its own JSON model under its canvas, and the Store in the middle is the transport that carries the change (it no longer holds a model).
- Rework 10: the Store is drawn on both clients (each with its JSON model); the middle piece is the Transport, with a Store (Backend) box behind it; the package follows client, Transport, backend, Transport, other client.
No local cursor. Store and backend labels swap together.
Review: no fresh-eye subagent review run.
Posters: `stores-index-poster-light.png`, `stores-index-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the Standalone store has no live client link in practice; it is drawn with the same shape for comparison
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
