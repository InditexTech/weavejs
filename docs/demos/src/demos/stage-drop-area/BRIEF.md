# Brief: stage-drop-area

- **Page:** `main:build/plugins/stage-drop-area.adoc` (top of the page, replacing `plugins/stage-drop-area.gif`)
- **Registry key:** `stage-drop-area`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `DropAreaScene` (`weave-ui/scenes`), the generalized rectangle-node pilot; this demo supplies the shape.
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/plugins/stage-drop-area/ (drop events and positions)`

## Story

The Stage drop area plugin lets users drop files and elements on the canvas and tells your app where.

Beats (about 13 s):

1. A file chip (photo.png) is dragged from the top right toward the canvas; the canvas shows a drop target.
2. It reaches the middle of the canvas.
3. Drop: the target goes and an image node appears there.
4. Payoff (holds about 2.8 s).
5. Reset with a cause: the cursor leaves and the image goes.

## Screen

Real strings: photo.png and Drop to add.

Focal object: the drop area.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the drop area keeps clear of the other nodes and the toolbar.

## Poster

The image node placed in the middle of the canvas.

## Out of scope

Dropping several files, dropping shapes, drop errors, compact (phone-column) layout.
