# Brief: image-tool

- **Page:** `main:build/actions/image-tool.adoc` (top of the page, replacing `actions/image-tool.gif`)
- **Registry key:** `image-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `PlaceToolScene` (`weave-ui/scenes`) (pick the tool, a preview rides the pointer, click to place).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/image-tool/image-tool.ts (defining position, selected position, finished) and the showcase UI (tooltip "Image tool I")`

## Story

Activating the Image tool and clicking the canvas places the chosen image where the preview was.

Beats (about 11 s):

1. The cursor goes to the Image button; its tooltip shows ("Image tool I").
2. Click: the button lights up and a translucent preview of the image appears.
3. The cursor moves onto the canvas and the preview rides it (one image).
4. Click: the image is placed, the tool returns to select and the node is selected with its handles.
5. Payoff (holds about 2.6 s).
6. Reset with a cause: the selection and node fade out, the cursor returns to where it began.

## Screen

Real string: the tooltip text. Everything else is icons, placeholders (never a made-up photo) and two other nodes.

Focal object: the image.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the image keeps clear of the other nodes and the toolbar.

## Poster

The image placed and selected, tool back on select, no cursor.

## Out of scope

Choosing the file (a file dialog belongs to the app, not the SDK), upload progress, drag and drop (see stage-drop-area), compact (phone-column) layout.
