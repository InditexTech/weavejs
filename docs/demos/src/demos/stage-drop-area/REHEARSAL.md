# Rehearsal: stage-drop-area

Gold: `image-tool` (kept: a file drop from outside the canvas; the drag-in and the drop target overlay; changed:  (drag a file in from the desktop)).
Beats: select a file in the Finder, drag it to the canvas, drop, image appears, hold, reset, loop ~14s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
- Rework (complete): the file now comes from a Finder window and is dragged onto the canvas. The Finder is a faux window over the app; the gate flags it as an uneven-gutters panel (placed 40 px from the right and bottom).
The 8px jumps are the chip offset from the cursor; the chip lands over the drop label at drop time.
Review: no fresh-eye subagent review run.
Posters: `stage-drop-area-poster-light.png`, `stage-drop-area-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: what is created on drop is up to the app; an image is the common case
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
