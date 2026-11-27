# Tasks

## 1. Safety net and public geometry

- [x] 1.1 Add golden tests of the current draw output of a stroke with no look, with a legacy-outline look and with a round-outline look (points and look in, drawn path out) and verify they pass on unchanged code
- [x] 1.2 Expose the rendered centerline and half-widths from `WeaveStrokeNode` for strokes with and without a look, reusing `lookGeometry` and the legacy spline path, and verify unit tests that the result equals what is drawn for each case at two zoom levels, plus that 1.1 still passes
- [x] 1.3 Document the accessor in the SDK API reference for the stroke node (`nodes/stroke.adoc`), add its ledger row in `AGENTS.md`, and verify the docs build (`docouture build`)

## 2. The pure erasure module

- [x] 2.1 Create `nodes/stroke/render/erasure.ts` with the types of an erasure (a circle with its radius, a square with its axes, and the path of the centre), `readErasures` that leaves out what is not well formed, the holes of an erasure (a capsule for each step of a circle, the hull of two squares for each step of a square) and whether a hole holds a point, and verify unit tests for every shape, for malformed entries, and that the holes are kept until the erasure grows
- [x] 2.2 Add `clipOutHoles`, one even-odd clip for each hole that reaches an area, and verify tests that each hole is one clip, that holes out of the area are left out and that no call is made when none reaches it
- [x] 2.3 Add `visibleExtent` and `touchesInk`, which look along the centerline at steps of a screen pixel, also within a long straight stretch, and verify tests for the middle erased, an end erased, a stroke covered, a broad stroke covered only by several passes, a sliver that shows, a stroke of two points, and a hole that only crosses the box of a diagonal line
- [x] 2.4 Add `simplifyPoints`, `compactErasure` and `scaleErasure`, and verify tests that no sample is farther than the tolerance from the reduced path, that a straight path is two points and a click one, and that a square follows a scale exactly while a circle takes the mean scale

## 3. Erasures in the stroke renderer

- [x] 3.1 Draw the stroke inside the clips of its saved erasures and of the local mask, in the round-outline path, the legacy ribbon with a look and the no-look path, drawing exactly as before when none reaches the ink, and verify pixel tests with a real canvas for each path: the hole of a circle and of a square has the edge of the eraser, a bite leaves the ink around it, nothing outside the eraser changes by a pixel (opaque and translucent), and that 1.1 still passes
- [x] 3.2 Add the non-serialized erase mask attribute to the stroke node, keep it out of `serialize` and keep the saved erasures in it, and verify a serialize test
- [x] 3.3 Make the box of a stroke with saved erasures that of what is left, and the area it can be picked in that box with the width of the stroke round it, kept until the erasures, the geometry or the zoom change, and verify tests with real Konva that the frame follows an erased end, does not change for an erased middle, ignores the local mask and keeps the box of a stroke with nothing left
- [x] 3.4 Scale the erasures in `scaleReset` with the points, and verify tests for a uniform and an uneven resize and for a stroke without erasures
- [x] 3.5 Document the saved field, the local mask, the box and the pick area in the stroke node API reference, and verify the docs build

## 4. The action

- [x] 4.1 Create `WeaveStrokeEraserToolAction` with state, constants and types, registered separately from `eraserTool`, and verify the action triggers, activates and cleans up, and that `eraserTool` tests are unchanged
- [x] 4.2 Add the `shape` and `size` props, convert a circle and a square into the space of a node (the square exactly, the circle by the mean scale), show a ring of the shape, rebuild it when `updateProps` changes either, and verify tests for the ring of each shape, a change in use, values that are not valid, a square at several zooms and on a turned node
- [x] 4.3 Implement pointer handling: size converted per sample with the zoom, one path for each stretch of a drag over a stroke, in the space of the stroke, that goes on while the eraser is the same and starts again when it changes, and Esc cancel; verify tests for zoom changes, fast drags, a stroke reached late in a drag and that Esc leaves no mask and writes nothing
- [x] 4.4 Implement the preview: filter to `nodeType === 'stroke'`, skip locked and mutex-locked nodes, prefilter by bounding box, set and clear masks; verify tests that other node types, `stroke-single`, locked nodes and nodes locked by another user show no preview
- [x] 4.5 Implement the commit in one `stateTransactional` under a mutex lock: reduce the paths to a tenth of a screen pixel, leave out a stroke whose ink the eraser did not touch, update each other stroke with its erasures extended and nothing else changed, remove a stroke with nothing left to see, and keep the preview until the node takes the erase; verify tests that nothing but `erasures` changes, for a rotated and scaled stroke and a stroke in a transformed group, for a stroke with two points, for the box of a diagonal line, for several strokes in one transaction and one undo, for a stroke covered by several drags, and for every brush instrument at three zooms
- [x] 4.6 Export the action and the erasure types from the SDK and verify the public index test and a type check (`tsc`)

## 5. Docs, specs and integration

- [x] 5.1 Write the API reference page `sdk:api-reference/actions/stroke-eraser-tool.adoc`, the build page `main:build/actions/stroke-eraser-tool.adoc` and the nav entries, with the shape prop and the documented limits, and verify the docs build
- [x] 5.2 Add the ledger rows for the new pages in `AGENTS.md` and verify `docouture doctor` passes
- [x] 5.3 Run the SDK test suite, lint and type check, and verify `openspec validate add-stroke-eraser-tool` passes
- [x] 5.4 Check in a browser, with real pointer events and a Weave stage (a harness page, not the showcase), that strokes of the brush instruments are cut with the edge of the eraser for a click, a straight drag and a diagonal drag, with a circle and with a square, that the shape changes in use, that one undo and redo restore a gesture, that the frame and the pick area follow an erased end, that a rotated stroke is erased with a screen-aligned square, that a resize through the transformer moves the erasures with the points, that Esc cancels, that a stroke covered is removed and that the eraser keeps its screen size at other zooms

## 6. Review follow-ups

- [x] 6.1 Set `touch-action: none` while the tool is active and restore it, count only the pointer that began the erase, drop an erase when a pinch begins, and verify tests for each, and for a browser cancelling the pointer
- [x] 6.2 Catch failures of the write inside the lock callback, take the previews off and log, and verify tests that no lock is held after a failed write and that the next erase works
- [x] 6.3 Skip a stroke as a target while its last erase is landing, and verify tests for a quick second erase and for a host that never answers
- [x] 6.4 Look along the centerline, not only at its points, to decide whether the eraser reaches the ink and what is left, which a straight stroke of two points showed in a browser, and verify tests at the unit level and through the action
