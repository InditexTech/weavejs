# Rehearsal: room-page

Gold: `home-hero` window with the Room page: header, status card and the bottom tool bar.
Beats: connecting then connected, pick the rectangle tool, draw, deselect, a second user joins and moves it, hold, reset, loop ~24s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster state via `--reduced`), built page (mounted, no console errors, SVGs fill their parents)
Gate: `film.mjs --gate` ends `rehearsal passed` at 960 and 390 widths in light and dark
Film:
- Status card keeps one width (the connection chip has a fixed width and the people are slots that fade in), so nothing resizes when the status or the people change.
- Placeholders fade out as the text is typed; the selection box and the rectangle share the peer's ease so a remote drag stays together.
- Rework 3: the selection of the drawn rectangle is instant, and a remote drag moves the selection and the rectangle together.
- Rework 4: the remote drag now moves rectangle and selection together (the rectangle had no transition because the follow CSS was not loaded).
Review: no fresh-eye subagent review run.
Posters: `room-page-poster-light.png`, `room-page-poster-dark.png` (2x via `npm run posters`; transparent margins around the window)
Assumptions: the room page is drawn from the showcase's room page (room header, status card, bottom tool bar) with an illustrative set of tools; the room and user names are placeholders.
Unresolved: none.
Not checked: side-by-side against a live run of the scaffolded app; validation errors; compact layout; Safari and Firefox; fresh-eye review.
