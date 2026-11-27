# Proposal

## Why

`eraserTool` can only delete a whole node. Erasing a stroke for a small mistake is destructive, and area erase is what drawing tools are expected to offer. Tracks InditexTech/weavejs#1313.

## What Changes

- Add a new action, `strokeEraserTool`, separate from `eraserTool`. While the pointer is dragged it erases an area of `stroke` nodes and splits each touched stroke into its surviving pieces. Other node types, including `stroke-single`, are never touched.
- The eraser size is in screen pixels and is converted per sample with the stage zoom, so it feels the same at any zoom. The eraser path is a chain of capsules (segment plus radius), so fast drags do not skip strokes.
- Cutting uses the centerline and half-widths the renderer draws, not the stored control points. The effective radius is the eraser radius plus the local half-width, so a round piece end does not protrude into the erased area. For a look with flat ends the cut does not use end discs.
- Survivors go through the existing finalize stage (`finalizePoints`), by default `dpPressure` with a screen-unit tolerance, overridable through the action props, and are kept within a quarter of a screen pixel of the line they were cut from (the bound of `brush-tool/finish-fidelity`), within a time budget for the whole erase. Pieces too short to read are dropped.
- The preview while dragging is local and non-serialized: a mask of eraser capsules on the stroke node, added to the serialize deny-list. Nothing reaches the store or other users. The mask is applied by the stroke renderer using the same pure geometry module as the commit, so preview and commit agree. Commit happens on pointer-up and Esc cancels. The cost of the preview does not grow with the length of the drag.
- Works with a finger or a pen: the page is not scrolled or zoomed by the drag, only the pointer that began the erase counts, and a pinch drops it.
- A failed write takes the previews off, leaves nothing locked, and the tool carries on. A stroke whose last erase the host has not yet taken is not erased again until it has.
- The commit is ONE `stateTransactional`: the first piece keeps the original id (update), extra pieces are inserted at the original z-index and parent, and a stroke with no survivors is removed. One undo step per gesture.
- Nodes that are `locked`, or mutex-locked by another user, are skipped. A mutex is taken around the commit.
- Pieces keep look, stroke, width, opacity, blend mode, `inputMeta` and the node transform. Cut ends get taper 0 and an end that is still the original keeps its taper. Each piece gets its own bounding box.
- Expose the stroke node's rendered geometry (`centerline` and `halfWidths`) through a public accessor, so the eraser and the renderer share one source.
- Known limitations, documented: pieces of a stroke with `variance` may show a different width wobble, because the variation is seeded from the stroke id and arc length; a dashed stroke restarts its dash pattern in each piece; two users erasing the same stroke within the mutex propagation latency can produce overlapping pieces, with the lock as mitigation.
- Non-breaking: `eraserTool` is unchanged and the new action is registered separately by hosts. No new required fields in stroke data; pieces are ordinary stroke nodes, so any existing viewer renders them. Documents without erased strokes are unaffected.

## Capabilities

### New Capabilities
- `stroke-eraser/tool`: the `strokeEraserTool` action: pointer input, screen-pixel size, capsule path, cut geometry, preview, commit, skipping locked nodes, cancel, scope of node types.
- `stroke-eraser/pieces`: how a stroke is split: which centerline and radius are used, what each piece keeps and changes, ids, z-order, bounding boxes, transforms, short-piece dropping, zero-survivor removal.

### Modified Capabilities
- `stroke-node/rendering`: a public accessor for the rendered centerline and half-widths (also for other points or another look), and a non-serialized erase mask that the renderer skips, in every draw path, at a cost that depends on the capsules added and not on all of them.

## Impact

- `code/packages/sdk/src/actions/stroke-eraser-tool/` (new: action, constants, types, pieces, node-space conversion, tests).
- `code/packages/sdk/src/nodes/stroke/` (`stroke.ts` public geometry accessor and erase mask with its memo, erase-mask draw support in the three draw paths, serialize deny-list; `render/erase.ts` the pure cut).
- `code/packages/sdk/src/actions/brush-tool/stages/finalize.ts` and `stages/refine.ts` consumed, not changed (see the change `brush-faithful-finish`).
- SDK exports for the new action.
- Docs: SDK API reference and build pages for the new tool and the stroke node, ledger rows in `AGENTS.md`.
- Downstream: weavejs-frontend#237, weavejs-backend#193.
