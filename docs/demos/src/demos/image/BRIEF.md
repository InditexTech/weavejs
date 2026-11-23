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

An image node resizes without breaking its aspect ratio, crops in place and flips, without generating a new asset.

Beats:

1. The cursor selects a small image.
2. It drags the corner anchor: the image grows and keeps its proportions.
3. A double click enters crop mode; a "Cropping" label says so, and the cursor drags the right crop handle in.
4. Crop mode ends; the cursor clicks Flip horizontal and the image mirrors.
5. Payoff (holds about 2.4 s).
6. Reset with a cause: the cursor leaves and the image goes back to its small, uncropped state.

## Screen

No real strings: the toolbar and node bar are icons; the image is a placeholder with a sun and mountains (asymmetric so the flip reads).

Focal object: the image.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the image keeps clear of the other nodes and the toolbar.

## Poster

The image resized, cropped and flipped, selected, no cursor.

## Out of scope

Vertical flip, crop from other edges, aspect-ratio lock, replacing the asset, compact (phone-column) layout.
