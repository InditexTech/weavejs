# Brief: export-stage-tool

- **Page:** `main:build/actions/export-stage-tool.adoc` (top of the page, replacing `actions/export-stage-tool.gif`)
- **Registry key:** `export-stage-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ExportScene` (`weave-ui/scenes`) (export the whole stage from the export button).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/export-stage-tool/export-stage-tool.ts and the showcase UI ("Export page as image")`

## Story

The Export stage tool captures the whole canvas as an image file and downloads it.

Beats:

1. Two nodes sit on the canvas (a rectangle and an ellipse).
2. The cursor goes to the app's own toolbar and clicks Export stage: a flash and a download chip ("weave-room.png") appear.
3. The cursor clicks the downloaded file: the OS opens it in Preview and the exported image, with both nodes, is visible.
4. Payoff (holds about 3.4 s).
5. Reset with a cause: the cursor leaves, the Preview window closes and the chip goes.

## Screen

Real strings: the tooltip text and the file name "weave-room.png".

Focal object: the stage.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the stage keeps clear of the other nodes and the toolbar.

## Poster

The Preview window open on weave-room.png with both nodes, no cursor.

## Out of scope

Choosing the format (jpeg, png, gif), the scale, exporting a PDF, compact (phone-column) layout.
