# Rehearsal: websockets-store

Gold: the `rectangle-node` pilot look and the system-flow parts (`weave-ui/flow`, kit `Connector`) (kept: a drag where the shape follows the pointer, a reset with a cause; changed: a store flow instead of a canvas interaction).
Beats: connect, drag in A, update A to server to B, B moves, hold, reset, loop ~14s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
Gate warnings left: 1px svg clip in the mini canvas and a title width change as "connecting" becomes "connected" (text, by design). The cursor drags in client A; the rest is a flow.
Review: no fresh-eye subagent review run.
Posters: `websockets-store-poster-light.png`, `websockets-store-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the connection lifecycle is shown by the two states the page documents, connecting and connected; failure and reconnect are in the mermaid diagram below
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
