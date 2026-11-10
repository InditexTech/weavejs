# Proposal

## Why

Selecting an artboard (`frame` node) is only possible by clicking its title bar. With many artboards and a zoomed-out view that strip becomes tiny and selecting the right artboard is hard (GitHub issue #1263).

## What Changes

- The frame hit region now covers the title strip plus four edge bands, so clicking any edge of the artboard selects it (and allows dragging it, as the title bar already does).
- Edge band width is `max(borderWidth, edgeHitWidth / zoom)`; `edgeHitWidth` is a new frame config value in screen pixels (default 6), so the band stays clickable at low zoom. The band is biased outward (about 2/3 outside, 1/3 inside the border).
- The frame interior stays non-selecting (unchanged), so marquee selection, drawing and children interactions keep working.
- The `move` (four-arrow) cursor is shown while a frame is being dragged.
- Hover and selection feedback keeps coming from the nodes-selection plugin (no new frame colors).
- The three duplicated hit functions (`onRender`, `onZoomChange`, `onUpdate`) are consolidated into one helper. Title geometry is unchanged.
- Out of scope: title bar appearance or naming.

## Capabilities

### New Capabilities
- `frame-node/edge-selection`: edge-based hit region, zoom-compensated band width, and move cursor while dragging for frame nodes.

### Modified Capabilities

## Impact

- Code: `code/packages/sdk/src/nodes/frame/{frame.ts,constants.ts,types.ts}`, tests in `nodes/frame/__tests__/frame.test.ts`.
- Config API: new optional frame config `edgeHitWidth` (non-breaking, defaulted).
- Docs: `main:build/nodes/frame` and `sdk:api-reference/nodes/frame` pages (if present) plus the AGENTS.md Documentation state ledger.
- Changelog: `code/CHANGELOG.md` `[Unreleased]` → Added, entry `- [#1263](https://github.com/InditexTech/weavejs/issues/1263) Artboard selection: allow selecting an artboard by clicking any of its edges, not only the top bar`.
