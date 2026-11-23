# Brief: room-page

- **Page:** `main:manual-installation/frontend/room-page.adoc` (top of the page, replacing `room.png`)
- **Registry key:** `room-page`
- **Size:** 960x540 (16:9), transparent. No compact design: the stage scales down with its container.
- **Poster alpha:** required (transparent margins around the window)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** kit browser chrome (`Window url=...`), shown whole with an even 24 px margin on every side, so the whole window and its shadow are visible.
- **Gold example:** `home-hero` (kept: the browser window with the room, one color per person, peers easing like hands, a reset that ends where the loop began; changed: the app's own Enter Room form and room page, with the bottom tool bar of the showcase).
- **Scene:** `AppScene` (`weave-ui/scenes/app-scenes.tsx`), variant `room`.
- **Cursor:** kit cursor, `real` style with `ripple`, for the person reading; Jon is a `Peer` cursor.
- **Behavior source:** the Room page of the manual installation guide (`main:manual-installation/frontend/room-page.adoc`) and the showcase frontend (room header, status card, bottom tool bar).

## Story

The Room page renders the collaborative canvas: the room name, the connection status with the people in the room, and the tool bar.

Beats:

1. The room opens: the status reads Connecting, then Connected with the first avatar.
2. The cursor picks the Rectangle tool in the bottom tool bar (tooltip) and drags a rectangle out; the tool returns to selection.
3. A click on empty canvas deselects it.
4. Jon joins: his avatar joins the status card and his cursor arrives on the rectangle.
5. Jon selects it (teal box) and drags it: the rectangle moves live.
6. Payoff (holds about 2.2 s), then reset: the room empties.

## Screen

Real strings: test, Connecting, Connected, 90%, Rectangle tool R, Jon.

Focal object: the rectangle and the people in the room.

## Crop

The whole window is visible (912 x 492 in the 960 x 540 stage, 24 px on every side). Nothing is cut.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Validation errors, the other tools and panels of the showcase, the room list, compact (phone-column) layout.
