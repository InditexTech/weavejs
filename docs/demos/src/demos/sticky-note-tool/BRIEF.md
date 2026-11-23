# Brief: sticky-note-tool

- **Page:** `main:build/actions/sticky-note-tool.adoc` (top of the page, replacing `none`)
- **Registry key:** `sticky-note-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ToolScene` (`weave-ui/scenes`), the generalized rectangle-tool pilot; this demo supplies the shape.
- **Cursor:** kit cursor, `real` style with `ripple`; the canvas carries `data-cursor="crosshair"` while the tool is active.
- **Behavior source:** `code/packages/sdk/src/actions/sticky-note-tool/sticky-note-tool.ts (drag to size) and the showcase UI (tooltip "Sticky note tool N")`

## Story

Activating the Sticky note tool and dragging on the canvas creates a sticky note node.

Beats:

1. The cursor goes to the Sticky note tool; its tooltip shows; it clicks and the tool lights up.
2. It drags a note out on the canvas (crosshair): the empty note appears and enters text editing (blue outline).
3. The text "Ship it" is typed into it.
4. The note is selected with its handles.
5. Payoff (holds about 2.4 s).
6. Reset with a cause: the cursor leaves and the note fades out.

## Screen

Real string: the tooltip text. Everything else is icons, the faint grid and two other nodes, whole shapes.

Focal object: the sticky note.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the sticky note keeps clear of the other nodes and the toolbar.

## Poster

The note with its text, selected, no cursor.

## Out of scope

Shift and Alt modifiers, touch behavior, compact (phone-column) layout.
