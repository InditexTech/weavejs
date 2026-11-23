# Rehearsal: connected-users

Gold: `home-hero` (peers) and `presence` (kept: one color per person on avatar and roster; changed: an app view driven by the plugin's user list instead of a canvas interaction).
Beats: Maya is in, Jon joins, Ana joins, hold, reset, loop ~11s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
- Rework: the panel has padding from the top (40 px) and right (28 px). The gate flags the roster as an uneven-gutters panel; this is the requested corner placement.
- Rework 2: each user's cursor (Maya, Jon, Ana) is shown on the canvas while they are in the room (the arrows were invisible before).
- Rework 3: the roster and the people bar share the card look (the extra drop shadow on the roster is removed).
No local cursor; panel docked to the top right edge for even gutters.
Review: no fresh-eye subagent review run.
Posters: `connected-users-poster-light.png`, `connected-users-poster-dark.png` (2x via `npm run posters`; opaque, the canvas fills the stage)
Assumptions: the roster and avatar stack are the app's UI built from the plugin's data; the email addresses are placeholders
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; modifiers (Shift to constrain, Alt to draw from the center); compact layout (the 16:9 stage scales down); Safari and Firefox; fresh-eye review.
