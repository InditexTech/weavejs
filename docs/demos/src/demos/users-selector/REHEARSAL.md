# Rehearsal: users-selector

Gold: `home-hero` (peers) and `presence` (kept: one person per color on cursor, flag and selection, peers easing like hands; changed: remote selections in per-user colors with a name flag).
Beats: Jon selects, Maya selects, Jon changes, hold, reset, loop ~13s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
- Rework: remote cursor arrows were invisible; fixed in peer.css.
- Rework 2: each selection shows only after that user's cursor has arrived (the selection used to appear as the cursor started moving).
No local cursor; two remote users.
Review: no fresh-eye subagent review run.
Posters: `users-selector-poster-light.png`, `users-selector-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the selection box reuses the SDK's selection look recolored per user; the flag is simplified to the name
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
