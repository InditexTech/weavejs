## Why

Consumers cannot mirror an image node without generating a new asset. Using negative `scaleX`/`scaleY` is unsafe because `WeaveImageNode.scaleReset` bakes scale into dimensions with `Math.max(5, ...)` and resets it, collapsing or losing the reflection (GitHub issue #1205).

## What Changes

- Add independent, persisted `flipX` / `flipY` boolean props to image nodes (never negative dimensions or scale).
- Render the flip on the internal Konva image via an `applyFlip` helper, reapplied after every place that sets image, size or crop (`onRender`, `loadImage` success, `onUpdate`, `updateImageCrop`/`scaleReset`).
- Expose `weave.flipImage(node, { axis })` and node-level `flipHorizontal()` / `flipVertical()`; each flip is one undo step.
- Extend `addNodeState`/`updateNodeState` and the zod schema (`default false`); old canvases are unchanged.
- Delivered in three slices, implemented and tested one at a time: (1) core flip, (2) crop-mode mirroring in `crop.ts`, (3) documentation.
- `cropInfo` stays in source space; flip is a render-time concern.
- Flip is a no-op while `cropping: true` (proposed default).

## Capabilities

### New Capabilities
- `image-node/flip`: native horizontal and vertical flipping of image nodes, its API, persistence and rendering rules.

### Modified Capabilities
None.

## Impact

- `code/packages/sdk/src/nodes/image/` (`image.ts`, `types.ts`, `crop.ts` in slice 2), `nodes/node.ts` prototype stubs, `weave.ts` facade.
- Server-side rendering via `renderer-konva-base` follows from the shared node render path.
- Docs under `docs/` (slice 3). No breaking changes.
