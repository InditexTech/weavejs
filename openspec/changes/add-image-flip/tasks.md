## 1. Slice 1: Core flip

- [x] 1.1 Add `flipX`/`flipY` to types and zod schema (optional, default false) in `image/types.ts` and `getSchema`
- [x] 1.2 Extend `addNodeState`/`updateNodeState` to carry flip props only when defined; leave `defaultState` unchanged
- [x] 1.3 Implement `applyFlip` on `internalImage` (always set scale and offset)
- [x] 1.4 Call `applyFlip` in `onRender`, `loadImage` success, `onUpdate` branches, `updateImageCrop`, and before `cacheNode`
- [x] 1.5 Implement `flipImage(node, { axis })` on `WeaveImageNode` using `stateTransactional`; no-op when `cropping: true`
- [x] 1.6 Add `flipHorizontal`/`flipVertical` prototype stubs in `nodes/node.ts` and image-instance implementations
- [x] 1.7 Add `weave.flipImage(node, { axis })` facade in `weave.ts`
- [x] 1.8 Tests: both axes, combined, double flip, resize via `scaleReset`, rotation, serialize/clone, state helpers, legacy state (automated); fallback image, cached node, undo/redo as one step (validated manually)
- [x] 1.9 Checkpoint: user tests slice 1; revise plan if needed

## 2. Slice 2: Crop-mode mirroring

- [x] 2.1 Mirror `cropImage` position and scale in `setupCropImage`/`show` in `crop.ts`
- [x] 2.2 Un-mirror the clip rect to source space in `handleClipEnd` and `handleClipExternal`
- [x] 2.3 Verify rotation workaround in `handleClipEnd` composes with flip
- [x] 2.4 Tests for crop math on flipped images (both axes, rotated, repeated)
- [x] 2.5 Checkpoint: user tests slice 2; remove known limitation from spec

## 3. Slice 3: Documentation

- [x] 3.1 Document the flip API and serialized properties in image node and API reference pages under `docs/`
- [x] 3.2 Update the AGENTS.md documentation-state ledger and run `docouture doctor`
