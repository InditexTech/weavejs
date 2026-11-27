# Proposal

## Why

`eraserTool` can only delete a whole node. Erasing a stroke for a small mistake is destructive, and area erase is what drawing tools are expected to offer. Tracks InditexTech/weavejs#1313.

## What Changes

- Add a new action, `strokeEraserTool`, separate from `eraserTool`. While the pointer is dragged it erases an area of `stroke` nodes. Other node types, including `stroke-single`, are never touched.
- The eraser is a circle or a square. The `shape` prop sets it (default `circle`), also while the tool is in use, and the ring cursor shows it. The size is in screen pixels (the diameter of a circle, the side of a square) and is converted per sample with the stage zoom, so it feels the same at any zoom. A square stays aligned with the screen, whatever the rotation of the stroke it erases. The eraser path is the area it sweeps between consecutive pointer samples, so fast drags do not skip strokes.
- A stroke is not cut. What an eraser took off is saved on the stroke as `erasures`: for each stretch of a drag over it, the eraser (the radius of a circle, or the axes of a square) and the path of its centre, in the space of the stroke, reduced to a tenth of a screen pixel. The renderer draws the stroke as ever with those areas clipped out, so what is left is the stroke as it was drawn, to the edge of the eraser: no round or square end is added at a cut, no point of the stroke or of its look changes, and its id, box and place in the stack stay. An eraser that crosses a line cuts it; one that does not cover the whole width of a broad stroke leaves what it did not cover.
- The preview while dragging is local and not serialized: the same erasures, still being made, in an `eraseMask` attribute that the renderer applies together with the saved ones, so the preview and the result are drawn by the same code. Nothing reaches the store or other users. The commit happens on pointer-up and Esc cancels.
- The commit is ONE `stateTransactional`: each stroke the drag touched gets its `erasures` extended (an update of the stroke), and a stroke with nothing left to see is removed. One undo step per gesture. A drag that never touches the ink of a stroke writes nothing.
- Nodes that are `locked`, or mutex-locked by another user, are skipped. A mutex is taken around the commit.
- Once parts of a stroke are erased its box is the box of what is left: the frame of a selection, snapping, aligning, the area the stroke can be picked in and what an export crops to follow what shows. Erasing the middle of a stroke does not change them.
- Resizing a stroke rescales its erasures with its points: a circle by the mean of the two scales, a square exactly.
- Expose the stroke node's rendered geometry (`centerline` and `halfWidths`) through a public accessor, so the eraser and the renderer share one source for what is left to see.
- Works with a finger or a pen: the page is not scrolled or zoomed by the drag, only the pointer that began the erase counts, and a pinch drops it.
- A failed write takes the previews off, leaves nothing locked, and the tool carries on. A stroke whose last erase the host has not yet taken is not erased again until it has.
- Known limitations, documented: a viewer of a release before this one draws a stroke without its erasures, so the erased parts show again there, a server-side renderer included; what was erased stays in the saved data of the stroke; two users erasing the same stroke within the mutex propagation latency can lose one of the two erases, the last write winning, with the lock as mitigation; an eraser that does not cover the whole width of a stroke leaves a sliver of what it did not cover.
- Non-breaking: `eraserTool` is unchanged and the new action is registered separately by hosts. One optional field, `erasures`, is added to stroke data. Documents without erased strokes are unaffected, and a stroke without erasures is drawn exactly as before.

## Capabilities

### New Capabilities
- `stroke-eraser/tool`: the `strokeEraserTool` action: pointer input, size and shape in screen pixels, the swept path, preview, commit, skipping locked nodes, cancel, scope of node types.
- `stroke-eraser/erasure`: what an erase saves: the erasures of a stroke, the exact edge, the compact path, what follows a resize, removal of a stroke with nothing left, no write for a drag that touches no ink.

### Modified Capabilities
- `stroke-node/rendering`: a public accessor for the rendered centerline and half-widths (also for other points or another look), saved erasures and the local erase mask clipped out of the stroke in every draw path, the box and pick area of a stroke follow what is left, and a resize rescales the erasures.

## Impact

- `code/packages/sdk/src/actions/stroke-eraser-tool/` (new: action, constants, types, node-space conversion, tests).
- `code/packages/sdk/src/nodes/stroke/` (`stroke.ts`: public geometry accessor, the clip of erasures in the draw paths, the visible extent, the box and pick area, `scaleReset`, serialize deny-list of the local mask; `render/erasure.ts`: the pure module).
- `code/packages/sdk/src/actions/brush-tool/stages/refine.ts` is consumed by the brush tool only (see the change `brush-faithful-finish`).
- SDK exports for the new action and the erasure types.
- Docs: SDK API reference and build pages for the new tool and the stroke node, ledger rows in `AGENTS.md`.
- Downstream: weavejs-frontend#237, weavejs-backend#193.
