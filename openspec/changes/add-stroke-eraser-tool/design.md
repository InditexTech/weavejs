# Design

## Context

See proposal.md for motivation. Facts from the code that shape the approach:

- A `stroke` node stores `strokeElements` (`{x, y, pressure}`) relative to its own `x, y`, with `width`/`height` equal to the points' bounding box (at least the stroke width). The area it can be picked in is that rectangle.
- Rendering goes through three paths: the legacy ribbon with no look, the legacy ribbon with a look, and the round outline. A stroke with no look is what the brush draws by default, and what every document made before looks has.
- `lookGeometry()` returns `{centerline, halfWidths}` for a look, cached per `strokeElements` array identity plus a key of look, width, zoom, id seed and point count. Strokes without a look use `getSplinePoints` on resampled points. A stroke that the brush saved often has very few points: a straight line is two.
- Tapers, `variance` (seeded from the node id and distance) and the dash pattern depend on the stroke as a whole, so a stroke that is split is drawn a little differently from the one it came from.
- `scaleReset` is the only place besides the brush that writes the points of a stroke: it bakes a resize into them.
- `eraserTool` is click-only and removes whole nodes.

## Goals / Non-Goals

**Goals:**
- What is left of an erased stroke is the stroke as it was drawn, to the edge of the eraser.
- Preview and result come from the same drawing code, so they cannot disagree.
- One undo step and one transaction per gesture.
- A circle or a square, switched at any time.

**Non-Goals:**
- Erasing other node types, `stroke-single`, or part of a node of any kind other than `stroke`.
- Splitting a stroke into several nodes. The format leaves room for it later.
- Conflict resolution beyond the mutex.
- Changing `eraserTool` or the brush tool.

## Decisions

**D1. A stroke is not cut: what was erased is saved on it.** The stroke keeps its points, look, id, box and place in the stack, and gets an optional `erasures` list. Each entry is one stretch of a drag over it, in the space of the stroke: `{shape: 'circle', radius, points}` or `{shape: 'square', axes, points}`, with `points` the path of the centre as x, y, x, y, ...; `axes` are the vectors from the centre to the middle of two neighbouring sides, which keeps a square exact when the node is rotated or scaled into a parallelogram.
- Alternative: split the stroke into pieces, as the first version of this change did. Rejected: a piece's end can only be a round cap or a square cut, and either one changes what is left (a cap removes the corners of the ink, a square cut leaves a different edge from the eraser's, and a diagonal drag cuts at an angle no end can follow). Pieces also bring effects that no erase should have: the width variation (seeded from the id and distance) and the dash pattern change, the curve through the points ends differently near a cut, and the points had to be reduced again and kept within a bound of the line.
- Alternative: keep pieces and add a clip at each cut end. Rejected: a thin eraser along the edge of a broad stroke bites without cutting the centerline, so pieces would need clips in the middle too; that is the same format plus the splitting.
- Trade-off: viewers of a release before this one do not know `erasures` and draw the stroke in full; what was erased stays in the saved data; and a stroke cut in two is still one node, so its halves cannot be moved apart.

**D2. The saved path is small.** At commit the path of each stretch is reduced (Douglas-Peucker) so that no sample is farther than a tenth of a screen pixel from it (the size of the node's unit at the zoom of the commit), and its numbers are rounded to a thousandth of a unit. A straight drag is two points and a click is one. What follows the eraser's edge by less than that is not visible, since an anti-aliased edge is blurrier.

**D3. Erasures are clipped out with nested even-odd clips.** `drawShape` draws the stroke as it always did, inside one clip for each step of each erasure: a path of the ink area and the hole (a capsule for a circle, the hull of two squares for a square), clipped even-odd, so what is left is outside the hole. Clips nest, so overlapping holes need no union. Holes that do not reach the area of the ink are left out, and a stroke that no hole reaches is drawn exactly as before, with the same calls. `holesOf` keeps the holes of an erasure until it changes, and `readErasures` checks what was saved once, so a malformed entry from another client or release never stops a stroke from drawing.
- Measured, in Chrome with the real round-outline code at a pixel ratio of 2: a mask that touches nothing draws exactly as without it, and a hole gives the same pixels as the alternative; 12 strokes with 20 holes each draw in 1.1 ms (0.85 without), 60 in 3.8 ms (3.9 without), one stroke with 800 holes in 2.1 ms and with 2000 in 5.7 ms.
- Alternative: draw the stroke to a scratch canvas, fill the holes with `destination-out` and draw that back. Same pixels (within 1/255 of a direct draw), but 60 strokes took 9.2 ms, and it needs the transform of the context, a scratch canvas for each backend and a different handling of blend modes. Rejected for the cost and the complexity.
- Alternative: one even-odd path for a whole drag. Rejected: the sweeps of a drag overlap, and even-odd would show the overlaps again.

**D4. The preview is the same drawing.** While the pointer is down, the erasures being made are set, in the space of each stroke, in a non-serialized `eraseMask` attribute that `drawShape` reads together with `erasures`. The path of a stretch grows by one point for each sample, and the stretch goes on while the eraser is the same and the step starts where the last one ended; a change of zoom or shape starts a new one. When the host has rendered the saved erase (the node fires `erasuresChange`) the preview is cleared, so there is no frame in which the stroke is whole.

**D5. The commit writes one update for each stroke.** In one `stateTransactional` under a mutex lock on the changed node ids: each stroke gets `{...serialized.props, erasures: [...saved, ...added]}`, or is removed when nothing is left to see. A stroke whose ink the eraser never touched is left out: `touchesInk` looks along the centerline, at steps no longer than a screen pixel and also within a long straight stretch, for a hole within the half-width of it, and a margin of a pixel. Looking only at the points of the centerline missed the middle of a straight stroke, which has two.

**D6. What is left to see.** `visibleExtent` looks along the centerline at steps of one screen pixel, takes samples across the width at the same distance and gives up a place only when every sample is inside a hole. That is conservative: a sliver that the samples cannot see stays, and the box that comes out is never smaller than what shows. It decides whether a stroke is removed and gives the box of what is left, computed once for the saved erasures and kept until they, the geometry or the zoom change.

**D7. The box and the pick area follow it.** The node's own rectangle stays in the saved width and height, as does the whole stroke, but `getSelfRect` is that of what is left once there are saved erasures, so the frame of a selection or a hover, snapping, aligning, fitting and an export's crop follow what shows; the area the stroke can be picked in is that rectangle with the width of the stroke round it. The local mask does not change either.

**D8. A resize moves the erasures with the points.** `scaleReset` scales the path and the axes of each erasure by the scale it bakes into the points, and the radius of a circle by the mean of the two scales (the same convention that converts the eraser into the node's space). Rotation and position need nothing: erasures are in the space of the node.

**D9. Size, shape and ring.** The settings are read at each sample from the props of the action, with values that are not valid replaced by the defaults. `updateProps` rebuilds the ring when the tool is in use, so a change of size or shape shows at once. The extent of a swept square along each axis is its half side, so the same bounds test serves for both shapes. For a node that is rotated or scaled, a circle is converted with the mean scale and a square exactly.

**D10. Scope filter is `nodeType === 'stroke'`.** `stroke-single` stores flat number arrays with no pressure or look, and is a different model. `isEraser` has no render semantics, so those strokes are erased like any other.

**D11. A stroke is not a target while its last erase is landing.** The host renders the written state asynchronously. A new erase over that stroke would put a mask on a node that is about to have new erasures. The node is skipped as a target until it has taken the write, or the wait (30 frames) is over.

**D12. Finger and pen.** `touch-action: none` is set on the stage container while the tool is active and put back, as the brush does. The pointer that began the erase is the only one that counts; a pinch drops it.

**D13. Failure.** The write runs inside a callback that catches its own errors, so the mutex lock is always released; the previews and the waits are then taken off, the failure is logged, and the action is ready for the next erase.

**D14. Known, documented effects:** viewers of earlier releases draw the stroke in full; erased ink stays in the data; concurrent erases within the mutex latency can lose one; an eraser that does not cover the whole width of a stroke leaves a sliver of the rest, which is what such an eraser takes off and no more.

## Risks / Trade-offs

- [Drawing cost of a stroke with many holes: one clip for each] → holes that do not reach the stroke are left out, the path of a drag is reduced at commit, and the measure in D3 shows a few milliseconds at hundreds of holes.
- [A host that renders with an older SDK shows the erased parts] → documented; the erase needs this release or a later one wherever a stroke is drawn, including a server-side render.
- [Clip edges differ between backends] → the three draw paths are covered by pixel tests with a real canvas, and a hole gives the same edge as a direct fill in the browser measure.
- [The box of a stroke with erasures is computed] → once, and kept; it never gives less than what shows.
- [Resizing a stroke stretched unevenly bends a circular hole] → the radius follows the mean scale, as the eraser's conversion does; a square follows exactly.
- [A stroke saved by another client with malformed erasures] → `readErasures` leaves out what is not valid, and the stroke is drawn with the rest.

## Migration Plan

Additive. No migration: one optional field is added to stroke data, the action is opt-in per host, and removing the action leaves documents valid.
