# Brief: quickstart-app

- **Page:** `main:quickstart.adoc` (top of the page, replacing `sample-app.gif`)
- **Registry key:** `quickstart-app`
- **Size:** 960x540 (16:9), transparent. No compact design: the stage scales down with its container.
- **Poster alpha:** required (transparent margins around the window)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** kit browser chrome (`Window url=...`), shown whole with an even 24 px margin on every side, so the whole window and its shadow are visible.
- **Gold example:** `home-hero` (kept: the browser window with the room, one color per person, peers easing like hands, a reset that ends where the loop began; changed: the app's own Enter Room form and room page, with the bottom tool bar of the showcase).
- **Scene:** `AppScene` (`weave-ui/scenes/app-scenes.tsx`), variant `quickstart`.
- **Cursor:** kit cursor, `real` style with `ripple`, for the person reading; Jon is a `Peer` cursor.
- **Behavior source:** the showcase app scaffolded by `create-weave-frontend-app` (`InditexTech/weavejs-frontend`): enter-room and room pages.

## Story

The quickstart app, from the first screen to a shared canvas: enter a room name and a username, land in the room, draw a rectangle, and watch a second person join and move it.

Beats:

1. The Enter Room form: the cursor types the room name (weave-room) and a username (Maya) and presses Enter the room.
2. The room page opens at /rooms/weave-room: the status reads Connecting, then Connected, with Maya's avatar.
3. The cursor picks the Rectangle tool in the bottom tool bar (tooltip) and drags a rectangle out.
4. Jon joins: his avatar appears next to Maya's and his cursor arrives on the rectangle.
5. Jon selects it (teal box) and drags it: the rectangle moves live.
6. Payoff (holds about 2.2 s), then reset: the cursors leave and the loop returns to the empty form.

## Screen

Real strings: Join a room, Room, Username, Enter the room, weave-room, Maya, Jon, Connecting, Connected, 90%, Rectangle tool R.

Focal object: the rectangle and the people in the room.

## Crop

The whole window is visible (912 x 492 in the 960 x 540 stage, 24 px on every side). Nothing is cut.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Validation errors, the other tools and panels of the showcase, the room list, compact (phone-column) layout.
