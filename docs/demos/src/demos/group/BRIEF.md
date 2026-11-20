# Brief: group

- **Page:** `main:build/nodes/group.adoc` (top of the page, replacing `nodes/group.png`)
- **Registry key:** `group`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `GroupNodeScene` (`weave-ui/scenes`) (marquee select, group, move as one).
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/nodes/group/`

## Story

A group node holds several nodes and moves and transforms them as one.

Beats (about 14 s):

1. The cursor drags a marquee over empty canvas around two rectangles: both are selected.
2. Ctrl+G (shown as keycaps): the two selections become one group with a single selection box.
3. Press and drag the group: both rectangles move together, up and to the right.
4. Payoff (holds about 2.4 s).
5. Reset with a cause: the cursor leaves, the group fades out and the two rectangles come back where they began.

## Screen

No real strings (the keycaps "Ctrl G" are shown by the stage). The toolbar is icons.

Focal object: the group.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the group keeps clear of the other nodes and the toolbar.

## Poster

The two rectangles grouped, moved together and selected as one, no cursor.

## Out of scope

Ungrouping, nested groups, resizing a group, compact (phone-column) layout.
