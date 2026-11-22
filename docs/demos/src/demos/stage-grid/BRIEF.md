# Brief: stage-grid

- **Page:** `main:build/plugins/stage-grid.adoc` (top of the page, replacing `none`)
- **Registry key:** `stage-grid`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `StageGridScene` (`weave-ui/scenes`), the generalized rectangle-node pilot; this demo supplies the shape.
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/plugins/stage-grid/ (lines or dots grid behind the nodes)`

## Story

The Stage grid plugin draws a reference grid behind the nodes, as lines or as dots.

Beats (about 11 s):

1. A canvas with two nodes and no grid.
2. The cursor clicks Lines: the grid appears.
3. It clicks Dots: the lines become dots.
4. Payoff (holds about 2.6 s).
5. Reset with a cause: the cursor leaves and the grid goes.

## Screen

Real strings: None, Lines, Dots on a small selector.

Focal object: the grid.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the grid keeps clear of the other nodes and the toolbar.

## Poster

The canvas with the dot grid.

## Out of scope

Grid size and major lines, snapping to the grid, colors, compact (phone-column) layout.
