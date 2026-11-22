# Rehearsal: stage-resize

Gold: `stage` page (kept: a container resize instead of a node interaction; whole-window margins, one ease for container and content; changed:  (the container resizes; no cursor)).
Beats: container shrinks, stage follows, grows back, loop ~10s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
No local cursor; container bleeds top and bottom, even gutters left and right. Size tag moves by layout (warning only).
Review: no fresh-eye subagent review run.
Posters: `stage-resize-poster-light.png`, `stage-resize-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the container is drawn as a plain frame; the real one is the host page element
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
