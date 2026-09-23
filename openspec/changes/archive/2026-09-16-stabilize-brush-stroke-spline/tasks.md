## 1. Equal-arc-length resampling

- [ ] 1.1 Rewrite `resamplePoints` in `code/packages/sdk/src/nodes/stroke/stroke.ts` to walk the input by cumulative arc length and reconstruct a point (interpolated x, y, pressure) at every fixed `minDist` step, always including the exact final point, instead of the current greedy min-distance keep/discard filter
- [ ] 1.2 Update the existing `resamplePoints` unit tests in `code/packages/sdk/src/nodes/stroke/__tests__/stroke.test.ts` to assert against the new algorithm's behavior (uniform spacing in the output; verify pass-through for <2 points and correct handling of a single trailing short segment still hold) and confirm they pass

## 2. Centripetal Catmull-Rom spline

- [ ] 2.1 Rewrite `getSplinePoints` in `stroke.ts` to compute per-window knot values from chord length (`distance^0.5`, α = 0.5) instead of fixed index steps, interpolating x, y, and pressure via the centripetal formula; preserve the existing clamped-endpoint duplication at the first/last segment; guard the zero-distance-between-consecutive-points case (mirroring the existing `Math.hypot(...) || 1` pattern at line ~170) to avoid division by zero
- [ ] 2.2 Add a regression test modeling a stroke's first two points close together immediately followed by a much larger gap to the third point, asserting the resulting curve does not exceed a bounded envelope around the control-point path near the start (targets the specific stroke-start bulge reported)
- [ ] 2.3 Add a regression test modeling a mid-stroke run of closely-spaced points immediately followed by widely-spaced points, asserting the curve through that transition stays within a bounded envelope and does not kink
- [ ] 2.4 Update the existing `getSplinePoints` unit tests (resolution-count and boundary-clamp assertions) to the new algorithm's output and confirm they pass

## 3. Config wiring

- [ ] 3.1 Update `drawRibbonWithDash` in `stroke.ts` to call `resamplePoints(pts, this.config.resamplingSpacing)` and `getSplinePoints(filtered, this.config.splineResolution)` for the centerline pass, replacing the hardcoded `2` and `8`
- [ ] 3.2 Update `drawDashPolygon`'s two `getSplinePoints` calls to derive their resolution from `this.config.splineResolution` (e.g. `Math.max(2, Math.round(this.config.splineResolution / 2))`), replacing the hardcoded `4`, and verify the default config (`splineResolution: 8`) reproduces today's default behavior (resolution 4) unchanged
- [ ] 3.3 Add tests asserting that a `WeaveStrokeNode` configured with non-default `splineResolution`/`resamplingSpacing` actually renders with those values (e.g. differing point/subdivision counts between two differently-configured nodes for the same input)

## 4. Full verification

- [ ] 4.1 Run the full `stroke.test.ts` and `brush-tool.test.ts` suites and confirm all pass, including the pre-existing zero-length-segment fallback test and the cross-stroke pressure-isolation regression tests (unrelated to this change, confirming no unintended interaction)
- [ ] 4.2 Run the project's lint/typecheck for the `sdk` package and confirm no new errors
- [ ] 4.3 Manually verify visually (e.g. via a local dev build using the brush tool) that a fast, unevenly-paced stroke no longer shows a bulge/kink at its start or at sharp mid-stroke direction changes
