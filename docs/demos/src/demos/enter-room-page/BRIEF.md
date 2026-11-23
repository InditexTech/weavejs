# Brief: enter-room-page

- **Page:** `main:manual-installation/frontend/enter-room-page.adoc` (top of the page, replacing `enter-room-manual.png`)
- **Registry key:** `enter-room-page`
- **Size:** 960x540 (16:9), transparent. No compact design: the stage scales down with its container.
- **Poster alpha:** required (transparent margins around the window)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** kit browser chrome (`Window url=...`), shown whole with an even 24 px margin on every side, so the whole window and its shadow are visible.
- **Gold example:** `home-hero` (kept: the browser window with the room, one color per person, peers easing like hands, a reset that ends where the loop began; changed: the app's own Enter Room form and room page, with the bottom tool bar of the showcase).
- **Scene:** `AppScene` (`weave-ui/scenes/app-scenes.tsx`), variant `enter`.
- **Cursor:** kit cursor, `real` style with `ripple`, for the person reading; Jon is a `Peer` cursor.
- **Behavior source:** the Enter Room page of the manual installation guide (`main:manual-installation/frontend/enter-room-page.adoc`) and the showcase frontend.

## Story

The Enter Room page: a user names the room to join and a username, and enters.

Beats:

1. The Join a room form: the cursor clicks the Room field and types weave-room.
2. It clicks the Username field and types Maya.
3. It presses Enter the room: the button dims ("Entering...").
4. The address changes to /rooms/weave-room and the room page appears, connected, with Maya's avatar.
5. Payoff (holds about 2.8 s), then reset: the cursor leaves and the form comes back empty.

## Screen

Real strings: Join a room, Room, Username, the placeholders, Enter the room, weave-room, Maya, Connected.

Focal object: the form.

## Crop

The whole window is visible (912 x 492 in the 960 x 540 stage, 24 px on every side). Nothing is cut.

## Poster

The filled Enter Room form (weave-room, Maya), no cursor.

## Out of scope

Validation errors, the other tools and panels of the showcase, the room list, compact (phone-column) layout.
