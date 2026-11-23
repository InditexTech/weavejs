# Rehearsal: context-menu

Gold: `rectangle-node` (kept: a context-menu card from the overlay kit; the SDK menu look (square white card, shortcut column); changed: the menu content (illustrative actions)).
Beats: right-click, pick Delete, rectangle removed, hold, reset, loop ~13s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
Gate warnings on the menu transform/layout were addressed with will-change; menu items are illustrative.
Review: no fresh-eye subagent review run.
Posters: `context-menu-poster-light.png`, `context-menu-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the menu items are examples; the plugin renders whatever the app provides
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
