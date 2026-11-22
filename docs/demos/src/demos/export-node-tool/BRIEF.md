# Brief: export-node-tool

- **Page:** `main:build/actions/export-node-tool.adoc` (top of the page, replacing `actions/export-node-tool.gif`)
- **Registry key:** `export-node-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ExportScene` (`weave-ui/scenes`) (select a node, export it from its bar, a download appears).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/export-nodes-tool/export-nodes-tool.ts (the node is rendered to an image and downloaded)`

## Story

The Export node tool captures the selected node as an image file and downloads it.

Beats (about 12 s):

1. The cursor clicks the rectangle: it is selected and its node bar appears.
2. The cursor goes to Export and clicks: the canvas flashes for an instant.
3. A download chip, "rectangle.png", rises in at the bottom right.
4. Payoff (holds about 3 s).
5. Reset with a cause: the cursor leaves, the chip and selection go.

## Screen

Real string: the file name "rectangle.png". The toolbar and node bar are icons.

Focal object: the node.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the node keeps clear of the other nodes and the toolbar.

## Poster

The rectangle selected and its download chip showing, no cursor.

## Out of scope

Choosing the format (jpeg, png, gif), the scale, exporting several nodes, compact (phone-column) layout.
