# Rehearsal: enter-room-page

Gold: `home-hero` window with the Enter Room form of the manual installation.
Beats: click Room and type, click Username and type, Enter the room, the room opens, hold, reset, loop ~17s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
- Status card keeps one width (the connection chip has a fixed width and the people are slots that fade in), so nothing resizes when the status or the people change.
- Placeholders fade out as the text is typed; the selection box and the rectangle share the peer's ease so a remote drag stays together.
- Rework 3: the Enter Room form is a smaller, nicer card (mark, title, lead, two fields, one button) on a quiet ground.
- Rework 4: the form head is compact (mark, a small "Join a room" title and the lead beside it) and separated from the fields by a rule.
- Rework 5: the form head is the logo centered above a small "Join a room" title and its lead; the rule and the card border are removed.
- Rework 6: smaller type in the form, and no focus halo around the fields (only the border changes).
- Rework 7: the form title and lead are divs, not h2 and p: the docs UI styles every h2 with dashed bands before and after it, which showed on the page. The title is 11 px.
Review: no fresh-eye subagent review run.
Posters: `enter-room-page-poster-light.png`, `enter-room-page-poster-dark.png` (2x via `npm run posters`; transparent margins around the window)
Assumptions: the room page is drawn from the showcase's room page (room header, status card, bottom tool bar) with an illustrative set of tools; the room and user names are placeholders.
Unresolved: none.
Not checked: side-by-side against a live run of the scaffolded app; validation errors; compact layout; Safari and Firefox; fresh-eye review.
