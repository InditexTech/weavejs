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

A group moves and scales its nodes as one; here it is made from the context menu.

Beats:

1. The cursor drags a marquee over two rectangles: both are selected.
2. A right click on the selection opens the context menu (Copy, Group, Ungroup disabled, Delete).
3. The cursor goes to Group and clicks: the selection becomes one group box.
4. A press and drag moves the group as one.
5. Payoff (holds about 2.4 s).
6. Reset with a cause: the cursor leaves and the rectangles come back apart.

## Screen

No real strings (the keycaps "Ctrl G" are shown by the stage). The toolbar is icons.

Focal object: the group.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the group keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Ungrouping, nested groups, resizing a group, compact (phone-column) layout.
