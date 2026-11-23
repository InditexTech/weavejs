# Rehearsal: stage-resize

Gold: `stage` page (kept: a container resize instead of a node interaction; whole-window margins, one ease for container and content; changed:  (the container resizes; no cursor)).
Beats: drag the window corner in, hold, drag it back out, loop ~11s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
- Rework (complete): the canvas lives in a window and the window is resized with the cursor. The window is anchored top-left; the gate flags uneven gutters while it is smaller than the stage (inherent to a resizing window).
- Rework 2: the desktop behind the window is black.
- Rework 3: the desktop behind the window is #f7f7f7 (dark theme: near black).
No local cursor; container bleeds top and bottom, even gutters left and right. Size tag moves by layout (warning only).
Review: no fresh-eye subagent review run.
Posters: `stage-resize-poster-light.png`, `stage-resize-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the container is drawn as a plain frame; the real one is the host page element
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
