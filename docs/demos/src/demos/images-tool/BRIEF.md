# Brief: images-tool

- **Page:** `main:build/actions/images-tool.adoc` (top of the page, replacing `actions/images-tool.gif`)
- **Registry key:** `images-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `PlaceToolScene` (`weave-ui/scenes`) (pick the tool, a preview rides the pointer, click to place).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/images-tool/images-tool.ts and the showcase UI (tooltip "Images tool O")`

## Story

The Images tool asks the OS for several files, shows them as a stack of cards while you choose where to put them, and places them as a row.

Beats:

1. The cursor goes to the Images tool; its tooltip shows; it clicks and the tool lights up.
2. The OS file picker opens: the cursor selects sunset.jpg and then adds city.jpg and desert.jpg with the Cmd key (keycap shown), and clicks Open.
3. A stack of three cards follows the pointer onto the canvas.
4. A click places them: the three images appear at once as a one-row grid, selected as a group.
5. Payoff (holds about 2.8 s).
6. Reset with a cause: the cursor leaves and the images fade out.

## Screen

Real string: the tooltip text. Everything else is icons, placeholders (never a made-up photo) and two other nodes.

Focal object: the set of images.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the set of images keeps clear of the other nodes and the toolbar.

## Poster

The three images in one row, selected, no cursor.

## Out of scope

Choosing the file (a file dialog belongs to the app, not the SDK), upload progress, drag and drop (see stage-drop-area), compact (phone-column) layout.
