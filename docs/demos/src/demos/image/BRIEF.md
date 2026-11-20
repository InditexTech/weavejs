# Brief: image

- **Page:** `main:build/nodes/image.adoc` (top of the page, replacing `nodes/image.png`)
- **Registry key:** `image`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ImageNodeScene` (`weave-ui/scenes`) (select, crop from an edge, flip).
- **Cursor:** kit cursor, `real` style with `ripple`; the crop handle shows a horizontal resize cursor.
- **Behavior source:** `code/packages/sdk/src/nodes/image/ (crop mode, `flipX`/`flipY`)`

## Story

An image node can be cropped and flipped in place, without generating a new asset.

Beats (about 13 s):

1. The cursor goes to the image and clicks: it is selected.
2. A double click enters crop mode: the black crop handles appear and the full image shows dashed under the crop window.
3. The cursor drags the right handle in: the visible part shrinks while the picture stays put.
4. Crop mode ends and the node bar appears; the cursor clicks Flip horizontal and the image mirrors.
5. Payoff (holds about 2.4 s).
6. Reset with a cause: the cursor leaves, the selection and image fade out, the image comes back whole and unflipped.

## Screen

No real strings: the toolbar and node bar are icons; the image is a placeholder with a sun and mountains (asymmetric so the flip reads).

Focal object: the image.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the image keeps clear of the other nodes and the toolbar.

## Poster

The image cropped, flipped and selected, no cursor.

## Out of scope

Vertical flip, crop from other edges, aspect-ratio lock, replacing the asset, compact (phone-column) layout.
