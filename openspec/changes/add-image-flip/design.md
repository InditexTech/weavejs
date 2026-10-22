# Design

## Context

`WeaveImageNode` (`code/packages/sdk/src/nodes/image/image.ts`) is a `Konva.Group` holding a placeholder `Rect`, an `internalImage` (`Konva.Image`, at 0,0) and a `cropGroup`. `scaleReset` bakes group scale into width/height with `Math.max(5, ...)`, so negative scale cannot be used. `onUpdate` and `updateImageCrop` force `scaleX/Y: 1` and `rotation: 0` on `internalImage`. `serialize()` copies all group attrs (used by cloning), export clones nodes, and the transformer has `flipEnabled: false`. `addNodeState`/`updateNodeState` are public static helpers with no production callers, only tests. Fallback images also render through `internalImage`.

## Goals / Non-Goals

**Goals:**
- Persisted, independent `flipX`/`flipY` with identical browser and server rendering.
- One undo step per flip; old canvases unchanged.
- Delivery in three slices, each implemented and tested before the next.

**Non-Goals:**
- Context-menu UI, external annotations/measurements, generating mirrored assets.

## Decisions

1. **State as group booleans.** `flipX`/`flipY` live on the group attrs, omitted from `defaultState` until set. Zod schema: optional boolean, default `false`. Rejected: negative scale on the group (fights `scaleReset`).
2. **Render on `internalImage`.** `applyFlip(group)` sets `scaleX = flipX ? -1 : 1`, `offsetX = flipX ? width : 0` (same for Y). It always sets both scale and offset, so turning a flip off resets them. It must run after the size is set, because the offset depends on it. It is called at the end of `updateImageCrop`, which `onRender`, `loadImage` success, `onUpdate` and `scaleReset` all reach, and `flipImage` calls it directly before `cacheNode`.
3. **Crop data in source space (ii).** `cropInfo` is never mutated by a flip. Flip is applied after crop sizing in `updateImageCrop`, so the crop window mirrors in place.
4. **API.** `WeaveImageNode.flipImage(node, { axis })` toggles the attr, calls `applyFlip` and `cacheNode`, then `updateNode(serialize(node))` inside `stateTransactional`. `weave.flipImage(node, { axis })` delegates to the registered image handler. Node-level `flipHorizontal()`/`flipVertical()` are added as no-op stubs on the Konva prototype (like `triggerCrop`, `nodes/node.ts`) and implemented on image instances.
5. **No-op while `cropping: true`** (confirmed by manual testing). Crop mode draws its own `cropImage` which ignores the flip.
6. **Slice 2** mirrors crop mode in `crop.ts` (`setupCropImage`, `show`, `handleClipEnd`, `handleClipExternal`), mapping visual to source with `x_src = W - x_vis - w` in the crop-scale units. **Slice 3** is docs.

## Risks / Trade-offs

- Crop units (`cropInfo.scaleX`, `realScale`) are subtle; slice 2 is the highest risk and needs jsdom crop-math tests.
- Missing an `applyFlip` call site yields a stale flip or offset; mitigated by tests per call site (resize, fallback, cached node).
- Crop mode mirrors the temporary crop image and window offset (`size - offset - length`), and un-mirrors on confirm (slice 2, done).
- Stroke/shadow props spread onto `internalImage` are mirrored too; harmless at default stroke width 0.
- Flip attrs are copied onto `internalImage` by `onUpdate` spreads; Konva ignores them.
