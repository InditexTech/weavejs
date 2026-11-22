# Brief: context-menu

- **Page:** `main:build/plugins/context-menu.adoc` (top of the page, replacing `plugins/context-menu.gif`)
- **Registry key:** `context-menu`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ContextMenuScene` (`weave-ui/scenes`), the generalized rectangle-node pilot; this demo supplies the shape.
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/plugins/context-menu/ (right-click menu with actions)`

## Story

The Context menu plugin opens a menu at the pointer on right-click, with actions for what is under it.

Beats (about 13 s):

1. The cursor right-clicks a rectangle: it is selected and a menu opens beside the pointer (Copy, Paste disabled, Delete).
2. The cursor moves down to Delete and the row highlights.
3. Click: the menu closes and the rectangle is removed.
4. Payoff (holds about 2.2 s).
5. Reset with a cause: the cursor leaves and the rectangle returns.

## Screen

Real strings: Copy, Paste, Delete and their shortcuts.

Focal object: the context menu.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the context menu keeps clear of the other nodes and the toolbar.

## Poster

The menu open over the selected rectangle with Delete highlighted.

## Out of scope

Submenus, menus on empty canvas, keyboard navigation, compact (phone-column) layout.
