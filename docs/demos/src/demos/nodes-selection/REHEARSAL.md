# Rehearsal: nodes-selection

Gold: `selection-tool` (the same plugin's click and marquee story is there) (kept: a measured marquee and a straight drag with the node following the pointer; changed: a selection that is acted on (moved and deleted)).
Beats: marquee-select two, move, right-click and Delete from the menu, hold, reset, loop ~18s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
- Rework 2: the delete at the end uses the context menu (no keycap).
Reset jump is hidden behind the fade of the cursor leaving; selection easing shared.
Review: no fresh-eye subagent review run.
Posters: `nodes-selection-poster-light.png`, `nodes-selection-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: Delete is shown as a keycap through the kit's key display
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
