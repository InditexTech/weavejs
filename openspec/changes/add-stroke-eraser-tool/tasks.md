# Tasks

## 1. Safety net and public geometry

- [x] 1.1 Add golden tests of the current draw output of a stroke with no look, with a legacy-outline look and with a round-outline look (points and look in, drawn path out) and verify they pass on unchanged code
- [x] 1.2 Expose the rendered centerline and half-widths from `WeaveStrokeNode` for strokes with and without a look, reusing `lookGeometry` and the legacy spline path, and verify unit tests that the result equals what is drawn for each case at two zoom levels, plus that 1.1 still passes
- [x] 1.3 Document the accessor in the SDK API reference for the stroke node (`nodes/stroke.adoc`), add its ledger row in `AGENTS.md`, and verify the docs build (`docouture build`)

## 2. Pure geometry module

- [x] 2.1 Create the pure cut (`nodes/stroke/render/erase.ts`, owned by the renderer, used by the action) with capsule-versus-segment interval maths over `{centerline, halfWidths, ends}`, returning surviving runs with interpolated cut points and pressure, and verify unit tests for crossing, tangent, fully inside, endpoint inside, and a fast long capsule over a thin stroke
- [x] 2.2 Add the effective radius (eraser radius plus interpolated half-width) and the flat-ends rule (no end discs), and verify tests that a round piece end does not overlap the erased area and that a flat-ended stroke is not erased past its ends
- [x] 2.3 Add capsule conversion from screen-pixel samples and zoom into node-local space, including rotation and scale, and verify tests at several zooms and with a rotated, scaled node

## 3. Erase mask in the renderer

- [x] 3.1 Add the non-serialized erase mask attribute to the stroke node, add it to the `serialize` deny-list, and verify a serialize test that a masked node has no mask in its output
- [x] 3.2 Apply the mask in the round-outline path by filling each surviving run once, and verify render tests for a masked stroke, a cleared mask and a translucent colour, plus that 1.1 still passes
- [x] 3.3 Apply the mask in the legacy-ribbon path with a look and in the no-look path, and verify the same render tests for both, plus that 1.1 still passes
- [x] 3.4 Verify the mask does not invalidate `lookGeometryCache` and that preview and the geometry module's runs agree, with a test that compares them
- [x] 3.5 Document the local erase mask in the stroke node API reference and verify the docs build

## 4. The action

- [x] 4.1 Create `WeaveStrokeEraserToolAction` with state, constants and types, registered separately from `eraserTool`, and verify the action triggers, activates and cleans up, and that `eraserTool` tests are unchanged
- [x] 4.2 Implement pointer handling: screen-pixel size converted per sample with the zoom, capsule chain, a ring cursor on the utility layer, and Esc cancel; verify tests for zoom changes, fast drags, and that Esc leaves no mask and writes nothing
- [x] 4.3 Implement the preview: filter to `nodeType === 'stroke'`, skip locked and mutex-locked nodes, prefilter by bounding box, set and clear masks; verify tests that other node types, `stroke-single`, locked nodes and nodes locked by another user show no preview
- [x] 4.4 Implement piece building: sample the cut runs, offset into a new box with the original transform, copy look, attributes and `inputMeta`, set cut-end tapers to 0 and keep original ends' tapers, run `finalizePoints` with the default config overridable by props, drop short pieces; verify tests for ids, boxes, transforms, taper cases, pressure at cuts and the finalize override
- [x] 4.5 Implement the commit in one `stateTransactional` under a mutex lock: update the first piece under the original id, insert the rest at the original parent and index, remove the stroke with no survivors; verify tests for id kept, z-index, frame parent, zero survivors, locked nodes untouched and one undo step for a multi-stroke gesture
- [x] 4.6 Export the action from the SDK and verify the public index test and a type check (`tsc`)

## 5. Docs, specs and integration

- [x] 5.1 Write the API reference page `sdk:api-reference/actions/stroke-eraser-tool.adoc`, the build page `main:build/actions/stroke-eraser-tool.adoc` and the nav entries, with the three known limitations (variance, dash phase, concurrent erase), and verify the docs build
- [x] 5.2 Add the ledger rows for the new pages in `AGENTS.md` and verify `docouture doctor` passes
- [x] 5.3 Run the SDK test suite, lint and type check, and verify `openspec validate add-stroke-eraser-tool` passes
- [x] 5.4 Check in a browser, with real pointer events and a Weave stage (a harness page, not the showcase), that strokes from every brush instrument can be cut at three zoom levels, that Esc cancels, and that one undo restores a multi-stroke gesture

## 6. Review follow-ups

- [x] 6.1 Memoize the cut of a stroke with a mask that grows (`cutStroke` memo, `cutStrokeWithMask`, a cache for the geometry of strokes without a look), and verify tests that the result equals a fresh cut as capsules are added, that only new capsules are worked out, that it starts again when the stroke or capsules change, and that 800 capsules added one at a time stay quick
- [x] 6.2 Set `touch-action: none` while the tool is active and restore it, count only the pointer that began the erase, drop an erase when a pinch begins, and verify tests for each, and for a browser cancelling the pointer
- [x] 6.3 Catch failures of the write inside the lock callback, take the previews off and log, and verify tests that no lock is held after a failed write and that the next erase works
- [x] 6.4 Skip a stroke as a target while its last erase is landing, and verify tests for a quick second erase and for a host that never answers
- [x] 6.5 Keep the pieces of an erase within a bound of the line they were cut from, with a time budget for the whole erase, and verify tests on pieces and through the action (within the bound, drifting without it, a broad stroke allowed more, a deadline falling back to the finishing step, the look a piece is measured with)
- [x] 6.6 Update the API reference and the build page for the points above, and verify the docs build

