# Brief: frame-tool

- **Page:** `main:build/actions/frame-tool.adoc` (top of the page, replacing `actions/frame-tool.gif`)
- **Registry key:** `frame-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ToolScene` (`weave-ui/scenes`), the generalized rectangle-tool pilot; this demo supplies the shape.
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/frame-tool/frame-tool.ts and the showcase UI (the Frame tool button)`

## Story

The Frame tool creates a frame of a predefined size where you click: no dragging.

Beats:

1. The cursor goes to the Frame tool; its tooltip shows; it clicks and the tool lights up.
2. The cursor moves onto the canvas (crosshair) and clicks once.
3. A frame ("Frame 1") of a predefined size appears with its top-left corner at the click, selected, and the tool returns to selection.
4. Payoff (holds about 2.8 s).
5. Reset with a cause: the cursor leaves and the frame fades out.

## Screen

Real string: the tooltip text. Everything else is icons, the faint grid and two other nodes, whole shapes.

Focal object: the frame.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the frame keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Shift and Alt modifiers, touch behavior, compact (phone-column) layout.
