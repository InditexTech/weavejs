# Brief: home-hero

- **Page:** `ROOT:index.adoc` (home page, top of the page)
- **Registry key:** `home-hero`
- **Size:** 960x540 (16:9), transparent. No compact design: the stage scales down with its container.
- **Poster alpha:** required (transparent margins around the window)
- **Look:** Weave (`weaveTokens(theme)`), light and dark.
- **Chrome:** kit browser chrome (`Window url=...`), shown whole with an even 24 px margin on every side, so the whole window and its shadow are visible.
- **Gold example:** `presence` (kept: one color per person on cursor, flag, avatar and caret, peers easing like hands, a reset that ends where the loop began; changed: no document and no plate, a canvas room with the Weave toolbar and a drawn shape).
- **Cursor:** none from the kit. The two collaborators are `Peer` cursors (arrow, crosshair while a drawing tool is active); the viewer watches the others.
- **Behavior source:** the rectangle tool (`code/packages/sdk/src/actions/rectangle-tool/`: drag to size, tool returns to selection on release), shape labels (`code/packages/sdk/src/nodes/shared/shape-label*.ts`), and the showcase UI in `InditexTech/weavejs-frontend`.

## Story

Two people work in the same room at once: one draws, the other labels what she drew.

Beats (about 14 s):

1. Maya's cursor goes to the Rectangle tool; its tooltip ("Rectangle tool R") shows; she clicks and the tool lights up.
2. She drags out a rectangle on the canvas (crosshair); on release the tool returns to select and the shape is selected with its handles.
3. Jon's cursor arrives, double-clicks the shape and types "Roadmap".
4. Payoff (holds ~2.4 s): the labelled shape, both names visible.
5. Reset with a cause: both cursors return to where they started and the shape fades out; the loop closes at its start state.

## Screen

Real strings: `weave-room`, `Connected`, `50%`, `Rectangle tool R`, `Maya`, `Jon`, `Roadmap`. Everything else is icons, the faint grid, and one other node, a whole shape in the bottom-right.

Focal object: the rectangle, from drawing to labelled.

## Crop

The whole window is visible (912 x 492 in the 960 x 540 stage, 24 px on every side, which the film gate requires to be even). Nothing is cut: the toolbar is trimmed to two groups and the one other node on the canvas is a whole shape.

## Poster

Rectangle selected and labelled "Roadmap", Jon's caret on it, Maya resting at the bottom right, tool on select.

## Out of scope

Compact (phone-column) redesign, sound, real SDK rendering.
