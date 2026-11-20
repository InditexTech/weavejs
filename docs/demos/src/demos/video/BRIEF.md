# Brief: video

- **Page:** `main:build/nodes/video.adoc` (top of the page, replacing `nodes/video.png`)
- **Registry key:** `video`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `VideoNodeScene` (`weave-ui/scenes`) (select, press play, the progress runs).
- **Cursor:** kit cursor, `real` style with `ripple`; the corner anchors carry the resize cursors.
- **Behavior source:** `code/packages/sdk/src/nodes/video/ (the video node and its playback)`

## Story

A video node plays right on the canvas: select it and press play.

Beats (about 11 s):

1. The cursor goes to the video and clicks: it is selected.
2. A click on the play button: the glyph becomes pause and the progress line starts to fill.
3. The progress advances while the pointer rests.
4. Payoff (holds about 2.2 s).
5. Reset with a cause: the cursor leaves, the selection and video fade out, the video comes back stopped at the start.

## Screen

No real strings. The video is a placeholder (never a made-up clip); the toolbar is icons.

Focal object: the video.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the video keeps clear of the other nodes and the toolbar.

## Poster

The video playing, its progress partway, selected, no cursor.

## Out of scope

Sound and volume, scrubbing, resizing the video, fullscreen, compact (phone-column) layout.
