# Design

## Context

See proposal.md for motivation. Facts from the code that shape the approach:

- A `stroke` node stores `strokeElements` (`{x, y, pressure}`) relative to its own `x, y`, with `width`/`height` equal to the points' bounding box (at least the stroke width). Hit testing uses that rectangle.
- Rendering goes through three paths that each already split the centerline into dash runs: the legacy ribbon with no look, the legacy ribbon with a look, and the round outline (`splitRoundRuns`).
- `lookGeometry()` returns `{centerline, halfWidths}` for a look, cached per `strokeElements` array identity plus a key of look, width, zoom, id seed and point count. Strokes without a look use `getSplinePoints` on resampled points. `zoomAware` looks (all brush instruments) make the centerline zoom-dependent.
- Tapers are per stroke (`look.width.taperStart/End`), `variance` is seeded from the node id and arc length, and `ends: 'flat'` means no discs at the ends (marker, highlighter).
- `finalizePoints(points, cfg, tolerance, zoom)` needs a `WeaveBrushFinalizeConfig`; a stored stroke does not record the profile that drew it.
- `eraserTool` is click-only and removes whole nodes.

## Goals / Non-Goals

**Goals:**
- Preview and commit come from one geometry function, so they cannot disagree.
- No change to stored stroke data, so any viewer renders pieces.
- One undo step and one transaction per gesture.

**Non-Goals:**
- Erasing other node types, `stroke-single`, or part of a node of any kind other than `stroke`.
- Carrying width variance or dash phase across a split.
- Conflict resolution beyond the mutex (overlapping pieces from concurrent erases are a documented limitation).
- Changing `eraserTool`, the brush tool or the finalize stage.

## Decisions

**D1. One pure geometry module, owned by the stroke renderer.** `nodes/stroke/render/erase.ts` takes `{centerline, halfWidths, ends}` plus a list of capsules in node-local coordinates and returns the surviving runs (cut points interpolated, with pressure and half-width). The renderer (preview) and the action (commit) both call it, so the action depends on the node and not the reverse.
- Alternative: compute arc-length ranges in the tool and let the renderer only skip them. Rejected: the zoom-dependent centerline makes arc ranges drift, and the preview could differ from the commit.
- Alternative: keep the module in the action's folder. Rejected: the renderer needs it, and the node would then import from an action.

**D2. Preview is a mask of capsules on the node.** A non-serialized attribute holds capsules in node-local coordinates; `drawShape` asks the module for the surviving runs of its cached geometry and fills each run once. The attribute is added to the `serialize` deny-list. Because the mask is applied after `lookGeometry`, the cache is unaffected.
- Alternative: replace `strokeElements` with the surviving points for the preview. Rejected: it churns the cache, risks leaking into serialization, and the issue asks for a non-serialized preview attribute on the node.

**D3. Two reach rules, by the ends of the look.** For round ends (`legacy` outline always, and `round`/`freehand` outlines unless `ends: 'flat'`) a point is erased when its distance to the capsule is below the eraser radius plus the half-width there, because the piece it leaves is closed by a round cap of that radius. For flat ends the piece is closed square, so a point is erased when the capsule comes within the eraser radius of the drawn cross-section (a segment of the half-width on each side of the centerline, across the direction of travel). Both are convex along a straight segment, so the erased part of a segment is one interval, found by a convex search and bisection.
- Alternative: use radius plus half-width for every look. Rejected: with flat ends (marker, highlighter) it over-erases by a half-width along the stroke and across its ends, which the user sees as a gap wider than the eraser.
- Trade-off: the flat rule reads the cross-section at the segment normal, so at a sharp vertex of a flat-ended stroke it differs from the round joins the renderer draws there. Vertices are a few pixels apart, so the difference stays under a pixel.

**D4. Pieces store dense samples, reduced and kept within a bound.** The cut run is sampled from the rendered centerline, offset to the new box, reduced with a default config of pressure-aware simplification with a screen-unit tolerance, and then kept within a quarter of a screen pixel of the run (`finalizeWithinDeviation`, see the change `brush-faithful-finish`). Without that, the surviving part of a stroke was drawn again through fewer points when the pointer was released and visibly moved. The run is measured under the look the piece will have (no taper at a cut end) and the id of the stroke, in the space of the node, with the node's own scale for the pixels. The whole erase shares one time budget (200 ms); past it the remaining pieces are saved as the finishing step leaves them. The action's props can override the config, and `maxDeviationPx: 0` turns the bound off.
- Alternative: keep the original control points and add cut points. Rejected: the cut lies on the spline, not on the polyline, and the end tangent changes, so shapes shift near cuts.
- Trade-off: pieces of a heavily simplified stroke get different (but visually equal) control points, and zoom-dependent sampling is baked in.
- Limit: the curve through the points of a piece ends where the piece ends, while the original goes on, so within about 20 px of a cut the line bends differently by a fraction of a pixel. The bound cannot see it, since a piece is measured against its own dense points under the same end conditions.

**D5. Per-piece look copy.** A piece's look is a copy with `width.taperStart` set to 0 when its start is a cut and `taperEnd` set to 0 when its end is a cut. Strokes without a look are copied unchanged.

**D6. Commit.** In one `stateTransactional`: update the first piece under the original id, `addNode` the rest with the original parent and index, or remove the node when nothing survives. Each piece gets its own box, and the original `x, y` plus rotation and scale transform its local box corner so its world position is unchanged. A mutex lock on the changed node ids surrounds the commit. Locked and mutex-locked nodes are filtered out before the preview, not only at commit.

**D7. Scope filter is `nodeType === 'stroke'`.** `stroke-single` stores flat number arrays with no pressure or look, and is a different model. `isEraser` has no render semantics, so those strokes are cut like any other.

**D8. Known, documented effects:** variance wobble differs on pieces with new ids; dash phase restarts per piece; the line bends differently by a fraction of a pixel near a cut; concurrent erases within the mutex latency can overlap.

**D9. The cut is memoized per stroke and only grows.** A drag adds a capsule per pointer sample, and cutting all of them again at every step took 8 ms at 200 capsules and 31–49 ms at 800 (measured), so a long scrub stuttered. `cutStroke` takes a memo that keeps, per segment of the centerline, the erased intervals merged so far, and the capsules it has seen; when the same stroke is given the same capsules and more, only the new ones are worked out. The memo belongs to the stroke node (`cutStrokeWithMask`), is valid while the centerline and half-width arrays are the same objects (which the look geometry cache and the new cache for strokes without a look guarantee while points, width and look are the same), and is started again otherwise. The commit uses the same memo, so it costs nothing more.
- Alternative: merge or drop capsules while dragging. Rejected: it changes what the preview shows.

**D10. A stroke is not a target while its last erase is landing.** The host renders the written state asynchronously, and the preview is kept until the node takes it. A new erase over that stroke would put a mask for the points it had before onto a node that is about to have a new box. The node is skipped as a target until it has taken the write, or the wait (30 frames) is over.

**D11. Finger and pen.** `touch-action: none` is set on the stage container while the tool is active and put back, as the brush does, because otherwise the browser takes the drag and cancels the pointer. The pointer that began the erase is the only one that counts; a pinch (the zoom plugin says so) drops it.

**D12. Failure.** The write runs inside a callback that catches its own errors, so the mutex lock is always released; the previews and the waits are then taken off, the failure is logged, and the action is ready for the next erase.

## Risks / Trade-offs

- [Preview cost on dense strokes: running the cut on every pointer move] → bounding-box prefilter per stroke, only strokes under the capsule bounds are processed, and the cut is memoized so a step costs the new capsule (D9).
- [Mask draw path must work in all three renderers] → one run-based helper reused by the three, covered by tests per path and a golden test with no mask for an unchanged output.
- [Zoom at commit differs from zoom at preview] → the commit recomputes from the same capsules at the commit zoom; a zoom change mid-drag is rare, and each sample uses its own zoom for the radius.
- [Variance wobble change on marker-like brush strokes] → at most ±12.5% in width, on one instrument; documented.
- [Round caps overlap the erased area] → effective radius includes the half-width, and a test checks the end does not overlap.
- [Highlighter overlap darkens under `multiply`] → pieces never overlap; a test checks that cut points are shared and not duplicated.
- [Transformed nodes] → capsules are converted into node-local space before cutting; tests cover rotation and scale.

## Migration Plan

Additive. No migration: no stored field changes, the action is opt-in per host, and removing it leaves documents valid.
