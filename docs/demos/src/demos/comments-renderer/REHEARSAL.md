# Rehearsal: comments-renderer

Gold: `comment` node pages (kept: a model-to-canvas story: change, then render; the model panel as app UI; changed:  (an app model changes; no local cursor)).
Beats: model gets a comment, render(), pin appears, hold, reset, loop ~11s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
No local cursor; the model panel is an illustration of the app side.
Review: no fresh-eye subagent review run.
Posters: `comments-renderer-poster-light.png`, `comments-renderer-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the panel is an illustration of the app side; the pins reuse the comment pin look
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
