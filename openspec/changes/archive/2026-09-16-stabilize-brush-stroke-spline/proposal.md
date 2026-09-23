## Why

`WeaveStrokeNode` (`code/packages/sdk/src/nodes/stroke/stroke.ts`) turns a brush stroke's recorded points into a rendered ribbon through two steps: a distance-based decimation (`resamplePoints`) and a Catmull-Rom spline fit (`getSplinePoints`). Both steps assume the control points they receive are evenly spaced, but nothing in the pipeline guarantees that - raw pointer sampling rate varies with drawing speed, and `resamplePoints`'s "keep if far enough" filter does not produce uniform spacing either. Uniform (index-parametrized) Catmull-Rom is well known to overshoot, pinch, or kink whenever consecutive control points are unevenly spaced, and every value the spline interpolates - x, y, and pressure - shares that same instability.

This produces two symptoms, confirmed by tracing the code and cross-checked against the reporter's own observations:

1. Mid-stroke corners occasionally render angular/kinked instead of fluid, most visible after a sudden direction change where nearby raw samples get thinned into a sparse, unevenly-spaced set.
2. A stroke can start with an oversized "ball" that stays in the final rendered shape (not a transient render artifact). This is distinct from - and not fixed by - the cross-stroke pressure-leak/contact-spike fix already shipped in commit `b074d282`: that fix corrects the *pressure value* of a stroke's first point, but the underlying spacing-driven spline instability is untouched by it (confirmed reproducible even on a stroke's very first pointer-down of a fresh session, which rules out any cross-stroke state leak) and was explicitly flagged as a deferred risk in that fix's own design notes.

Both symptoms trace to the same root cause: the spline's assumption of uniform spacing does not hold, and nothing in the pipeline enforces it.

## What Changes

- Replace `resamplePoints`'s greedy "keep if ≥ minDist from the last kept point" decimation with true equal-arc-length resampling: walk the polyline by total length and reconstruct a new point (interpolating x, y, and pressure) at every fixed step, so points feeding the spline are uniformly spaced by construction regardless of raw sampling density.
- Replace `getSplinePoints`'s uniform (index-parametrized) Catmull-Rom with centripetal Catmull-Rom (α = 0.5): derive each segment's knot interval from the chord length between consecutive control points instead of a fixed step, eliminating the overshoot/cusp instability under uneven spacing for all three interpolated channels (x, y, pressure). Same clamped-endpoint duplication technique at the first/last segment; same output shape.
- Wire `WeaveStrokeNode.config.splineResolution` and `config.resamplingSpacing` through to `drawRibbonWithDash`, which currently ignores them and hardcodes `resamplePoints(pts, 2)` / `getSplinePoints(filtered, 8)` / `getSplinePoints(side, 4)`.
- Add a regression test modeling the specific tiny-gap-then-big-gap control-point pattern (a stroke's first two points close together, immediately followed by a much larger gap to the third) and asserting the rendered ribbon does not bulge past a bounded envelope around the control polygon at the start.

## Capabilities

### New Capabilities
- `stroke-node/spline-rendering`: how `WeaveStrokeNode` turns a stroke's recorded points into a smooth rendered ribbon - specifically, that the resampling and spline-fitting steps remain numerically stable (no overshoot/bulge) regardless of how unevenly spaced the input points are, and that the node's configured `splineResolution`/`resamplingSpacing` values actually govern that rendering.

### Modified Capabilities
_None._ `brush-tool/pressure-sampling` (the cross-stroke pressure-leak/contact-spike fix) is unaffected - this change is confined to `stroke.ts`'s geometry and does not alter pressure-smoothing behavior.

## Impact

- **Code**: `code/packages/sdk/src/nodes/stroke/stroke.ts` - `resamplePoints`, `getSplinePoints`, and `drawRibbonWithDash`'s call sites for both.
- **Tests**: `code/packages/sdk/src/nodes/stroke/__tests__/stroke.test.ts` - existing `resamplePoints`/`getSplinePoints` unit tests (behavioral contracts like pass-through for <2 points and endpoint clamping should hold, but exact output values change with both new algorithms and need updated assertions); new regression test for the tiny-gap-then-big-gap bulge case; new config-wiring tests for `splineResolution`/`resamplingSpacing`.
- **Not affected**: `brush-tool.ts` (pointer handling, pressure smoothing, the finalize-time `simplify()`/Douglas-Peucker call and its tolerance) - all unchanged. No serialized document format change (points are still `{x, y, pressure}`); no public API change beyond the two config fields actually taking effect.
- **Out of scope, explicitly deferred**: a possible further refinement to the contact-spike backfill in `brush-tool.ts` (correcting a stroke's first point from a converging window of samples rather than a single sample, in case a real stylus's contact transient decays over more than one sample) - unconfirmed without a real hardware pressure trace; treated as a follow-up if the stroke-start bulge persists after this change ships.
