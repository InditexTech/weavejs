# Brief: align-nodes-tool

- **Page:** `main:build/actions/align-nodes-tool.adoc` (top of the page, replacing `actions/align-nodes-tool.gif`)
- **Registry key:** `align-nodes-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `AlignNodesToolScene` (`weave-ui/scenes`) (marquee-select three nodes, then align them).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/align-nodes-tool/align-nodes-tool.ts (`alignToLeftHorizontal` and the other alignments)`

## Story

The Align nodes tool aligns the selected nodes to one edge or center of the selection.

Beats (about 13 s):

1. A marquee over empty canvas selects the three rectangles, which sit at different horizontal positions.
2. The align bar appears above the selection; the cursor goes to Align left.
3. Click: the three rectangles slide to the left edge of the selection together.
4. Payoff (holds about 2.6 s).
5. Reset with a cause: the cursor leaves, the selection clears and the rectangles slide back.

## Screen

No real strings. The align bar is icons.

Focal object: the selection.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the selection keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Center and right alignment, vertical alignment, distribute spacing, compact (phone-column) layout.
