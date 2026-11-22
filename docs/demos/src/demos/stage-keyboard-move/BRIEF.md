# Brief: stage-keyboard-move

- **Page:** `main:build/plugins/stage-keyboard-move.adoc` (top of the page, replacing `none`)
- **Registry key:** `stage-keyboard-move`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `KeyboardMoveScene` (`weave-ui/scenes`), the generalized rectangle-node pilot; this demo supplies the shape.
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/plugins/stage-keyboard-move/ (Shift + arrow keys nudge the selection)`

## Story

The Stage keyboard move plugin moves the selected nodes with Shift and the arrow keys.

Beats (about 13 s):

1. The cursor clicks a rectangle: it is selected.
2. Shift and right arrow six times (keycaps show): the rectangle moves right in small steps.
3. Shift and down arrow three times: it moves down.
4. Payoff (holds about 2.2 s).
5. Reset with a cause: the cursor leaves and the rectangle returns.

## Screen

No real strings (keycaps are shown by the stage).

Focal object: the keyboard move.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the keyboard move keeps clear of the other nodes and the toolbar.

## Poster

The rectangle moved right and down from where it began, selected.

## Out of scope

Arrow keys without Shift (1 px), moving several nodes, compact (phone-column) layout.
