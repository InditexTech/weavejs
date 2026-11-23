# Rehearsal: users-presence

Gold: `home-hero` (peers) and `presence` (kept: one person per color on cursor and flag, peers easing like hands, a reset with a cause; changed: a remote user's live drag instead of the viewer's own actions).
Beats: a remote user arrives, grabs, drags live, drops, hold, reset, loop ~12s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
- Rework: the remote cursors were invisible (the docs UI caps SVGs at their parent width, which collapsed the cursor arrow to 0 px); the arrow now has a stated size. Name flags and arrows both show.
No local cursor; the remote cursor and node share one ease, so no drift.
Review: no fresh-eye subagent review run.
Posters: `users-presence-poster-light.png`, `users-presence-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the viewer is only watching, so there is no local cursor; the remote cursor and the node share one ease so they stay together
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
