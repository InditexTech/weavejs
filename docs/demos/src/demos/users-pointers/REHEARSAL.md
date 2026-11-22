# Rehearsal: users-pointers

Gold: `home-hero` (peers) and `presence` (kept: one person per color on cursor and flag, peers easing like hands; changed: three labeled remote cursors moving independently).
Beats: three labeled cursors move around, rest, reset, loop ~12s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
No local cursor; three remote cursors, Jon slightly slower.
Review: no fresh-eye subagent review run.
Posters: `users-pointers-poster-light.png`, `users-pointers-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the cursors move on their own; two share a speed and Jon is slightly slower so they never move in step
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
