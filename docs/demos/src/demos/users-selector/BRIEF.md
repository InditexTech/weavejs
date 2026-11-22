# Brief: users-selector

- **Page:** `main:build/plugins/users-selector.adoc` (top of the page, replacing `plugins/users-selector.gif`)
- **Registry key:** `users-selector`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `SelectorScene` (`weave-ui/scenes`) (two remote users select; no local cursor).
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/plugins/users-selection/ (a remote user's selection in their color)`

## Story

The Users selector plugin shows what each connected user has selected, painted with that user's color.

Beats (about 13 s):

1. Jon (teal) selects the top-right rectangle: it gets a teal selection box with his name flag.
2. Maya (pink) selects the bottom-right rectangle: a pink box with her name.
3. Jon selects the top-left rectangle instead: his box moves there.
4. Payoff (holds about 2.6 s).
5. Reset with a cause: both selections clear and the cursors return to where they began.

## Screen

Real strings: the names (Jon, Maya) on the selection flags.

Focal object: the user selections.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the user selections keeps clear of the other nodes and the toolbar.

## Poster

Jon on the top-left rectangle and Maya on the bottom-right, both selected.

## Out of scope

Multi-selection by a remote user, many users on one node, compact (phone-column) layout.
