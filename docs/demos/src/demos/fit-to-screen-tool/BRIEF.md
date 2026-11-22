# Brief: fit-to-screen-tool

- **Page:** `main:build/actions/fit-to-screen-tool.adoc` (top of the page, replacing `actions/fit-to-screen-tool.gif`)
- **Registry key:** `fit-to-screen-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ViewportScene` (`weave-ui/scenes`) (a canvas with a camera: nodes in world coordinates, the grid following, the showcase zoom bar).
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/fit-to-screen-tool/fit-to-screen-tool.ts and the showcase UI ("Fit to screen" Shift 1)`

## Story

Fit to screen adjusts the zoom and position so all the nodes are visible.

Beats (about 13 s):

1. The canvas starts zoomed in on one corner (160%).
2. The cursor goes to the Fit to screen button; its tooltip shows ("Fit to screen" and its shortcut).
3. Click: the camera eases out and over so every node is visible and the zoom reads 125%.
4. Payoff (holds about 2.8 s).
5. Reset with a cause: the cursor leaves and the canvas fades out and comes back at its zoomed-in view.

## Screen

Real strings: the tooltip text, the zoom level and the note text ("Idea").

Focal object: the canvas.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the canvas keeps clear of the other nodes and the toolbar.

## Poster

All the nodes fitted on screen at 125%, no cursor.

## Out of scope

Padding settings, animating the camera speed, compact (phone-column) layout.
