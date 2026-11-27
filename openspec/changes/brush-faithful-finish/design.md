# Design

## Context

See proposal.md for why. What the code does, and what was measured through the real brush tool and stroke renderer:

- While drawing, a stroke is drawn through every point recorded (a point every 1–2 px). On release the finishing step (`dp`, `dpPressure`, `bezierFit`) reduces the points and the stroke is drawn again through them. The renderer resamples points at a minimum spacing (2 px) and joins them with a spline, so a reduced set is not the same line.
- Point-by-point tolerances do not measure that. The finishing step's tolerance held on the points, yet the drawn line strayed by 1–2 px at its worst point in nearly every stroke, and by tens of px where the path turned sharply.
- The resampler never kept the last point, so a dense line ended up to the minimum spacing short of its last point and a sparse one did not. That gave a floor of 1–2 px at the end that no choice of points could remove.
- Stabilizers (`streamline`, `oneEuro`) lag the line 5–20 px behind the pointer at a quick pace. `stabilizer.catchUpOnEnd` completes the stroke at the pointer with one point when the pointer lifts.
- Looks round out the picture: tapers are measured from the end of the line, variance is seeded from the id and the arc length, and widths follow pressure, so a change in the line shows up in the width as well.

## Goals / Non-Goals

**Goals:**
- A bound on how far the saved stroke is from the drawn one, measured the way strokes are drawn, that holds for every stroke or else keeps every point.
- A default that fixes it for the brush as it is used, with a way back to the earlier points.
- No jump at the end of a stabilized stroke.
- No change to the format of strokes, and none to strokes already saved.

**Non-Goals:**
- Changing how a stroke is captured, stabilized or how its pressure is derived: the line the user draws is the reference.
- Removing the lag of a stabilizer while drawing. Its smoothing is its purpose.
- Compressing the noise of raw mouse input: whole-pixel positions make a wobble that is part of the drawn line.

## Decisions

**D1. Measure in rendered space.** The stroke node gives the line it would draw for a set of points (`getRenderedGeometry(shape, { points })`: centerline and half-widths). The difference is the largest distance from a point of one line to the other, or between their widths, in both directions, taking the nearest segment around the one matched last, since both lines run the same way. At most 1500 points of a line are compared.
- Alternative: compare points. Rejected: that is what the finishing step already does, and it is what fails.

**D2. Rebuild by error-driven insertion.** When the result of the finishing step is too far, start from a pressure-aware simplification at four times the bound, and in each pass add the drawn point at each stretch where the lines are farthest apart (one per stretch, up to 64 stretches), mapped from the arc length of the drawn centerline to a drawn point. Where nothing can be inserted (neighbours already adjacent) keep six drawn points on each side. Up to 24 passes, then every drawn point.
- Alternative: halve a global tolerance until it matches. Rejected after measuring: it keeps nearly every point (590 of 652 at 0.35 px) because the error is local.
- Alternative: keep only the profile's result. Rejected: the result can bend away from the line or overshoot.
- Trade-off: the result is a subset of the drawn points, so it never adds a position the user did not draw.

**D3. A time budget, and what to do when it runs out.** Each stroke may take 80 ms, and a caller can pin the time it stops at, as the tests do so that the speed of the machine cannot change a result. The fallback is every drawn point: the stroke looks exactly as drawn, at the cost of size.

**D4. A bound for hairlines, relaxed with width.** The bound is what a thin line needs: a shift of 0.25 px is a quarter of a hairline. For a broad line the same shift is invisible, so the bound grows to 5% of the median drawn width, at most four times itself. This is what makes thick, unstabilized pens (marker, highlighter) affordable, since their input noise is what costs points.
- Trade-off: the setting is a minimum bound, not an exact one, for strokes wider than 5 px.

**D5. Tool-level default, profile override.** `finalizeMaxDeviationPx` on the tool (0.25) is the default for every profile; `finalize.maxDeviationPx` overrides it, `0` turns it off. This mirrors `simplifyTolerance` and `finalize.tolerance`.
- Alternative: opt-in per profile or instrument. Rejected: the brush with no instrument, the way most applications use it, would still change on release, and the instruments would each need the setting.
- Alternative: set it in the legacy profile. Rejected: the legacy preset is defined as the behaviour of the tool with no configuration, and an explicit value would make a preset that changes with the default.
- This reverses a documented judgement (`simplifyTolerance`: below 0.5 "buys little and costs point count"). That was measured against the points joined by a plain spline; drawn the way strokes are now, the finishing step's result is farther than that, and the cost is points only where the line needs them. The legacy golden gestures are run with the bound at 0, the behaviour they pin.

**D6. The line reaches its last point.** `resamplePoints` appends the last point when it is not the last one kept. This is the cause of the floor at the end, and it also lets the rebuild converge.
- Alternative: leave the renderer and exclude the end from the measure. Rejected: the end and its taper would still move on release.
- Trade-off: strokes already saved whose last two points are closer than 2 px are drawn up to 2 px longer at the end. The spec for strokes without a look is amended for that.

**D7. A glide, not a filter, for the end, along the way the pen went.** The stroke is completed at the pointer as before, but not with one straight segment: a segment has a direction the pen never went in, and a nib or a taper, which follow the direction and the end of the line, draw it as a different stroke (a thick hook at the end of a fountain pen). The tool keeps the last 64 positions the pen reported, before stabilizing, and `completionTail` goes on along them from the sample nearest to the end of the line, moved by how far that end is off the path (it is off by what the stabilizer cut off a turn) and less and less, so the last position is exact. If no sample is within 32 screen pixels of the end of the line, it falls back to the segment. For `catchUpMs` the live stroke shows the points the pen made plus as much of that way as the glide has reached, easing out, on animation frames (timed by the timestamp the browser gives each frame); then the points are saved with the exact completion. State is a small record on the tool; it is flushed by the next pointer down, by `trigger` and by `cleanup`, so a new stroke or a tool switch never loses it.
- Alternative: complete with a straight segment, as before. Rejected after seeing it in a browser: with a lag of 15 px or more it changed the stroke at the end, and for a nib or a taper drastically.
- Alternative: draw a tip at the pointer all the time. Rejected: it changes how the stabilizers feel while drawing, which nobody asked for.
- Alternative: run the stabilizer on after release. Rejected: a first-order filter fed a fixed target moves along a straight line towards it, as the glide does, and it depends on the filter and its clock.
- Trade-off: the stroke reaches the document up to 90 ms after the pointer lifts.

## Risks / Trade-offs

- [Strokes saved by default have more points where the line needs them: a smooth stroke about the same as before, raw mouse input up to about five times (542 of 631 at 0.25 px)] → documented; thicker strokes relax the bound; `finalizeMaxDeviationPx` raises or turns it off; every instrument inherits it.
- [Work on release: median 10 ms, 90th percentile about 20–50 ms, never over 80 ms per stroke] → the deadline and its fallback.
- [The stroke is saved up to 90 ms later when it glides] → `catchUpMs: 0`; flushed by anything that could see the difference.
- [The line of existing strokes ends up to 2 px later in a rare case] → amended spec; no data changes.
- [A fixed bound of a quarter pixel still shows on a 1 px hairline, as a few percent of its ink] → measured at 1–4% of ink for every instrument and width, against 5–54% before.

## Migration Plan

None: the format of strokes, looks and profiles is unchanged, and `finalize.maxDeviationPx` is optional. To keep the earlier points, set `finalizeMaxDeviationPx` to 0 on the tool (and `catchUpMs` to 0 for the earlier release of the pointer). Rolling back is removing the change.
