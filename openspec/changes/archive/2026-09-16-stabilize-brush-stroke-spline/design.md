## Context

See proposal.md - Why for motivation. Relevant current implementation (`code/packages/sdk/src/nodes/stroke/stroke.ts`):

- `resamplePoints(pts, minDist = 2)` (:39-55) is a greedy filter: keep a point only if it is at least `minDist` from the last *kept* point. This does not produce uniform spacing - it only enforces a minimum, so gaps anywhere from `minDist` up to the largest raw gap in the input can (and do) coexist in its output.
- `getSplinePoints(pts, resolution = 8)` (:57-88) is a uniform Catmull-Rom: for each 4-point window `(p0, p1, p2, p3)` it steps `t` from 0 to 1 in fixed `1/resolution` increments, using a fixed basis-matrix formula (coefficients `q1..q4`). It interpolates x, y, and pressure with the same coefficients. The window at the start/end is clamped by duplicating the first/last point (`p0 = pts[Math.max(i, 0)]`, `p3 = pts[Math.min(i + 3, pts.length - 1)]`).
- `drawRibbonWithDash` (:136-225) calls `resamplePoints(pts, 2)` then `getSplinePoints(filtered, 8)` to build the centerline (:155-156), then for each dash-on polygon calls `getSplinePoints(leftSide, 4)` / `getSplinePoints(rightSide.reverse(), 4)` again to smooth the offset outline (:121-122, inside `drawDashPolygon`).
- `WeaveStrokeNode.config` already carries `splineResolution` and `resamplingSpacing` (`constants.ts`, `WEAVE_STROKE_NODE_DEFAULT_CONFIG`), but `drawRibbonWithDash`/`drawDashPolygon` never read `this.config` - the `2`, `8`, and `4` above are hardcoded literals, so the config fields currently have no effect.
- Both the live-draw path (`onRender`'s `sceneFunc`, called every redraw while drawing) and the finalize path (`brush-tool.ts`'s `finalizeStroke`, which runs Douglas-Peucker `simplify()` before handing points back to the same renderer) funnel through these same two functions - there is one shared fix point, not two.
- Uniform/index-parametrized Catmull-Rom is documented to overshoot or produce cusp-like kinks when consecutive control points are unevenly spaced. Centripetal Catmull-Rom (Barry & Goldman, 1988; parametrization exponent α = 0.5) is the standard fix, and is guaranteed cusp/self-intersection-free for any point configuration.

## Goals / Non-Goals

**Goals:**
- Make the resample + spline-fit pipeline stable regardless of how unevenly the input points are spaced, for all three interpolated channels (x, y, pressure).
- Make `splineResolution`/`resamplingSpacing` actually govern rendering, replacing the hardcoded literals.
- Keep the fix confined to `stroke.ts`'s two functions and their call sites - no change to `brush-tool.ts`, no change to the finalize-time `simplify()`/Douglas-Peucker step.

**Non-Goals:**
- Not consolidating the two spline passes (centerline, then each dash-outline side) into a single pass. Both passes get the same underlying fix (they call the same function), but the two-pass architecture itself is unchanged.
- Not addressing the deferred "contact-spike may decay over more than one sample" question from `brush-tool.ts` - unconfirmed without a real hardware pressure trace, tracked separately.
- Not changing the Douglas-Peucker tolerance or `highestQuality` flag used at finalize.
- Not adding a new dedicated config field for the dash-outline re-smoothing resolution (see Decision 3) - derived from `splineResolution` instead, to avoid growing the public config surface for a value with no independent product meaning yet.

## Decisions

**Decision 1: Re-parametrize `getSplinePoints` as centripetal Catmull-Rom (α = 0.5), computed per-window from chord lengths.**

Concretely: for each 4-point window `(p0, p1, p2, p3)`, compute knot values `t0 = 0`, `t1 = t0 + d(p0,p1)^0.5`, `t2 = t1 + d(p1,p2)^0.5`, `t3 = t2 + d(p2,p3)^0.5` (Euclidean distance `d`), then interpolate x, y, and pressure using the standard centripetal Catmull-Rom recursive-linear-interpolation formula (successive `lerp`s parametrized by the `t` values) instead of the current fixed `q1..q4` basis matrix, stepping the output parameter across `[t1, t2]` in `resolution` increments. The same clamped-endpoint duplication (`p0 = p1` at the very start, `p3 = p2` at the very end) is preserved - it's an orthogonal concern to the parametrization.

Degenerate case: when `d(p_i, p_{i+1})` is 0 (two coincident points), guard with the same pattern already used elsewhere in this file (`Math.hypot(dx, dy) || 1` at :170) to avoid a zero-width knot interval / division by zero.

Alternatives considered:
- *Keep uniform parametrization, just increase `resolution` to paper over the instability.* Rejected: doesn't address the root cause, only makes overshoots smaller/less visible at higher CPU cost; the tiny-gap-then-large-gap case (proposal's stroke-start scenario) can still overshoot at any fixed resolution because the *knot spacing*, not the sampling density, is what's wrong.
- *Chordal parametrization (α = 1) instead of centripetal (α = 0.5).* Rejected: chordal is more resistant to uniform-parametrization's issues than uniform itself, but centripetal is the documented sweet spot - chordal can still produce loops for sharp corners with widely-varying segment lengths, which is exactly the stroke-start case this change targets.

**Decision 2: Replace `resamplePoints`'s greedy min-distance filter with true equal-arc-length resampling.**

Concretely: walk the raw input points accumulating cumulative arc length; for each target distance `0, step, 2*step, ...` (where `step = resamplingSpacing` from config), locate the raw segment straddling that distance and linearly interpolate x, y, and pressure at that point; always include the final raw point exactly, even if the last step falls short of it, so the stroke's tail is never truncated. Output is uniformly spaced by construction, regardless of raw sampling density or how the input was thinned upstream (by RDP, by drawing speed, or both).

Alternatives considered:
- *Keep the min-distance filter but make it curvature-aware (skip fewer points at direction changes).* Rejected: this only reduces the input's spacing irregularity, it does not eliminate it, so centripetal parametrization would still be doing more work than necessary and edge cases could still slip through; true equal-spacing is simpler to reason about and directly satisfies what Decision 1's spline assumes.
- *Skip resampling entirely and rely solely on centripetal parametrization to absorb whatever spacing the raw/RDP-simplified points have.* Rejected: centripetal parametrization alone fixes the interpolation *within* a 4-point window, but doesn't change how many points end up in a window or their absolute spacing; equal-arc-length resampling plus centripetal parametrization is belt-and-suspenders and is what the proposal already committed to (Option A + B).

**Decision 3: Wire `splineResolution` into the centerline pass directly; derive the dash-outline re-smoothing resolution from it rather than adding a new config field.**

`drawRibbonWithDash`'s centerline call becomes `getSplinePoints(filtered, this.config.splineResolution)` and `resamplePoints(pts, this.config.resamplingSpacing)`. `drawDashPolygon`'s two calls (currently hardcoded `4`) become `getSplinePoints(side, Math.max(2, Math.round(this.config.splineResolution / 2)))` - preserving today's default behavior exactly (`8/2 = 4`) while making it track a future `splineResolution` override instead of silently ignoring it.

Alternatives considered:
- *Add a separate `dashOutlineResolution` config field.* Rejected for now: no product requirement has surfaced for controlling the dash-outline smoothing independently of the centerline resolution; deriving it keeps the config surface minimal. Can be split out later if a real need appears.

## Risks / Trade-offs

- **[Risk] Equal-arc-length resampling spends the same point density on straight runs as on curves**, unlike the old min-distance filter loosely tracking whatever density Douglas-Peucker's RDP left behind (sparse on straight lines, dense at corners) → Mitigation: RDP still runs first at finalize time, so resampling operates on an already-thinned point set, not raw dense samples; likely negligible at brush-stroke scale (strokes are short-lived, bounded in length) but worth a quick perf sanity check on unusually long strokes during implementation.
- **[Risk] Changing both functions simultaneously changes visual output on every stroke at once** (live-draw and finalize both run through the same two functions) - no way to stage the fix incrementally within `stroke.ts` → Mitigation: rely on the new geometric regression tests (bounded-envelope assertions) plus the existing test suite updated to the new math, rather than incremental rollout; no visual snapshot harness exists for brush/stroke to lean on instead.
- **[Risk] Existing `resamplePoints`/`getSplinePoints` unit tests assert exact output values tied to the old algorithms** → Mitigation: their *behavioral* contracts (pass-through for <2 points, endpoint clamping) should still hold and can be kept; assertions on exact numeric output need rewriting against the new math as part of this change, not left stale.

## Migration Plan

None required - this is an internal rendering fix confined to `stroke.ts`, with no serialized document format change (points remain `{x, y, pressure}`) and no public API change beyond the two existing config fields (`splineResolution`, `resamplingSpacing`) actually taking effect where they previously didn't. Ships as a normal fix; verified via updated/new unit tests. No rollback concerns beyond reverting the change.
