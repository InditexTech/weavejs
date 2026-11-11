# Tasks

## 1. Config and hit region

- [x] 1.1 Add `edgeHitWidth` (6) to `nodes/frame/constants.ts` and `types.ts`; verify `tsc` passes and defaults appear in a frame config test
- [x] 1.2 Add `buildHitFunc` helper (title strip + four bands, band = `max(borderWidth, edgeHitWidth / zoom)`, ~2/3 outside) ; use it in `onRender`, `onZoomChange` and `onUpdate`; verify unit tests for geometry at zoom 1, 0.1 and 5, band never below `borderWidth`, interior not hit, title strip unchanged
- [x] 1.3 Make sure `frame.clip` does not cut the outward band; verify with a test that a point just outside the border is hit

## 2. Cursor and highlight

- [x] 2.1 Set the `move` cursor while dragging and restore it on drag end; verify tests for dragstart, dragmove, dragend and no change on hover/click
- [x] 2.2 Keep hover/selected feedback on the nodes-selection plugin and the drop-target border unchanged; verify existing frame tests still pass
- [x] 2.3 Verify adjacent-frame band overlap at very low zoom resolves by z-order (test)

- [x] 2.4 Draw the drop-target outline with `transform.borderStrokeWidth` and `strokeScaleEnabled: false`, restoring `borderWidth` and scaling on leave; verify tests for enter, leave and a custom `borderStrokeWidth`

## 3. Docs, changelog, release notes

- [x] 3.1 Add the `[Unreleased]` → Added entry to `code/CHANGELOG.md`: `- [#1263](https://github.com/InditexTech/weavejs/issues/1263) Artboard selection: allow selecting an artboard by clicking any of its edges, not only the top bar`; verify format against neighboring entries
- [x] 3.2 Update `main:build/nodes/frame` and `sdk:api-reference/nodes/frame` docs (`edgeHitWidth`, drag cursor) and add ledger rows to the AGENTS.md Documentation state table; verify `docouture build` passes

## 4. Integration

- [ ] 4.1 Try `edgeHitWidth` 4/6/8 in the playground at 10%, 50% and 100% zoom with many artboards, and record the chosen default; verify selection, drag, cursor and highlight manually
- [x] 4.2 Run the sdk test suite and lint; verify all green
