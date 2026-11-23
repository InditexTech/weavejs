# Brief: connector-tool

- **Page:** `main:build/actions/connector-tool.adoc` (top of the page, replacing `actions/connector-tool.gif`)
- **Registry key:** `connector-tool`
- **Size:** 960x540 (16:9). The canvas fills the stage, so the PNG posters are opaque; there is no plate or window.
- **Poster alpha:** not required (it fills its stage)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** none. Crop to the toolbar and a corner of the canvas. Every node is shown whole, none cut by an edge.
- **Scene:** `ConnectorToolScene` (`weave-ui/scenes`) (hover a node for its anchors, click one on each node).
- **Cursor:** kit cursor, `real` style with `ripple`; the connector tool shows anchors on hovered nodes.
- **Behavior source:** `code/packages/sdk/src/actions/connector-tool/connector-tool.ts (select an initial anchor, then a final one) and the showcase UI`

## Story

Activating the Connector tool and clicking an anchor on one node and then an anchor on another creates a connector node between them.

Beats (about 13 s):

1. The cursor goes to the Connector button; its tooltip shows.
2. Click: the button lights up.
3. The cursor goes to the first rectangle: its anchors appear; it clicks the right one, which fills.
4. The cursor goes to the second rectangle: its anchors appear; it clicks the left one.
5. The connector is created, the tool returns to select and the connector is shown joining both.
6. Payoff (holds about 2.6 s).
7. Reset with a cause: the connector fades out and the cursor returns to where it began.

## Screen

Real string: the tooltip text. Everything else is icons, two rectangles and one other node.

Focal object: the connector.

## Crop

Toolbar one gutter from the left, canvas full-bleed, every node whole; the connector keeps clear of the other nodes and the toolbar.

## Poster

The first frame of the loop (the start state, cursor at rest), exported with `?frame=initial`. The page shows it until the live demo paints the same frame, so nothing jumps at load.

## Out of scope

Line types, decorators, connecting to a node anchor that is already used, compact (phone-column) layout.
