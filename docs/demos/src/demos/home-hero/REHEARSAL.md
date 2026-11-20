# Rehearsal: home-hero

Gold: `presence` (kept: per-person color on cursor, flag, avatar and caret; peers easing like hands; loop ends at its start state. Changed: Weave canvas room instead of a doc, drawn shape with SDK selection anchors, shape label typing).
Beats: pick tool (tooltip) 1.9s, draw 2.2s, select 0.5s, Jon labels 4.6s, hold 2.4s, reset 2.2s, loop ~14s
Captured: widths 960 and 390, themes light and dark, reduced motion (poster, `--reduced`), alpha checked on both posters
Gate: `rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)` at 960 light, 390 and dark
Film:
- `tight mark: wv-anchor outside the selection` -> frame 4.9s on -> corner anchors were DOM dots straddling the box; they are canvas-drawn in the SDK, so they are now SVG circles (fixed)
- `jump: svg x/y -7.5px` and `settle snap` on the peer -> arrow and crosshair were swapped elements with different anchors; both stay mounted and cross-fade (fixed)
- `jump: hh-label x -6.3` per keystroke -> centered label shifted as it typed; the words still to come now hold their place invisibly (fixed)
- `caret appears/vanishes with no entrance` and `jump: hh-caret` -> caret was a remounted element; it is now a `::after` with an opacity transition (fixed)
- `jump: hh-label__typed width +14.1px` x7 at 7.9 s -> one typed character per keystroke; it stands, that is the typing itself
- `framing: div.ss-window is whole but off center` -> after showing the whole window (it used to run off the right and bottom) the margins were 40/40/24/28 -> window now 912 x 492 at 24 px on every side (fixed)
- The ghost SVG now carries `wv-fill` like the other demos' full-size SVGs (the hero is not in an image block, so it was never affected)
Review: no fresh-eye subagent review run.
Posters: `home-hero-poster-light.png`, `home-hero-poster-dark.png` (transparent, 2x, via `scripts/poster.mjs --reduced --check-alpha`)
Assumptions: the real room toolbar at wide breakpoints is the vertical square one (`weavejs-frontend` main, Nov 2026); the rectangle keeps the SDK's default white fill and 1px black stroke in both themes (the real default).
Unresolved: none.
Not checked: side-by-side against a live screenshot of the running frontend; compact (phone-column) layout, deliberately not designed, the 16:9 stage scales down and its small text is illustrative at 390 px; Safari and Firefox; fresh-eye review.
