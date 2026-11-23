# Brief: connected-users

- **Page:** `main:build/plugins/connected-users.adoc` (top of the page, replacing `plugins/connected-users.gif`)
- **Registry key:** `connected-users`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ConnectedUsersScene` (`weave-ui/scenes`) (people join the session; the app renders the plugin's user list).
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/plugins/connected-users/ (the list of users in the session: name and email)`

## Story

The Connected users plugin returns who is in the session, with their name and email, so your app can show them.

Beats (about 11 s):

1. Maya is in the room: one avatar at the top right, the count reads 1 and the roster lists her name and email.
2. Jon joins: his avatar pops in beside hers, the count goes to 2 and his row appears.
3. Ana joins: her avatar and row appear and the count reads 3.
4. Payoff (holds about 3 s).
5. Reset with a cause: the room empties back to Maya alone.

## Screen

Real strings: the names (Maya Chen, Jon Park, Ana Ruiz) and their emails (example.com addresses) and the count.

Focal object: the connected users.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the connected users keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Users leaving, avatars with photos, presence status, compact (phone-column) layout.
