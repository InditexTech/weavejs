# Brief: video-tool

- **Page:** `main:build/actions/video-tool.adoc` (top of the page, replacing `actions/video-tool.gif`)
- **Registry key:** `video-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `PlaceToolScene` (`weave-ui/scenes`) (pick the tool, a preview rides the pointer, click to place).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/video-tool/video-tool.ts and the showcase UI (the video tool button)`

## Story

The Video tool first asks the OS for the video file, then a click on the canvas places it.

Beats:

1. The cursor goes to the Video tool; its tooltip shows; it clicks and the tool lights up.
2. The OS file picker opens: the cursor selects demo.mov and clicks Open.
3. A dashed preview follows the pointer onto the canvas.
4. A click places the video there, selected, and the tool returns to selection.
5. Payoff (holds about 2.8 s).
6. Reset with a cause: the cursor leaves and the video fades out.

## Screen

Real string: the tooltip text. Everything else is icons, placeholders (never a made-up photo) and two other nodes.

Focal object: the video.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the video keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Choosing the file (a file dialog belongs to the app, not the SDK), upload progress, drag and drop (see stage-drop-area), compact (phone-column) layout.
