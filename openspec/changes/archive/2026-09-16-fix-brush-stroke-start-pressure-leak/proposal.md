## Why

Drawing with a pressure-sensitive stylus (e.g. Apple Pencil) on the brush tool shows an oversized filled circle at the start of most strokes once brush size is above ~1px. Two distinct causes were found and confirmed:

1. **Cross-stroke state leak** (fixed first): `WeaveBrushToolAction.handlePointerDown` computed the new stroke's first pressure sample *before* resetting the pressure-smoothing state, so that first sample could inherit the previous stroke's leftover smoothed pressure and stale pointer position/time. This defeated the intent already recorded in issue #1040 ("Change 7: reset smoothing state on stroke start").
2. **Contact-spike + spline endpoint doubling** (confirmed on real Apple Pencil Pro hardware after cause 1 was fixed - the reported symptom persisted): a stroke's very first (pointerdown) pressure sample is frequently an unreliable hardware "contact spike" that doesn't represent sustained drawing pressure, but is rendered standalone as a filled dot sized by `strokeWidth * pressure / 2` and, via `WeaveStrokeNode`'s Catmull-Rom spline duplicating point 0 as both `p0` and `p1` of the first segment, doubly influences the start of the rendered ribbon for the whole life of the stroke - not just a single frame. This was explicitly flagged as an out-of-scope, unaddressed risk when cause 1 was fixed, and is a likely contributor to the still-open issue #1174 (uneven Apple Pencil strokes / blobs).

Fixing both removes reproducible, code-confirmed defects before they're misdiagnosed as unavoidable hardware behavior.

## What Changes

- Reorder `handlePointerDown` so the pressure-smoothing state (`lastSmoothedPressure`, `lastPointerPos`, `lastPointerTime`, `predictedCount`) is reset to its neutral baseline **before** the new stroke's first pressure sample is computed, not after — closing the window where state leaks from the end of the previous stroke into the start of the next one.
- In `handleMovement`, retroactively backfill the stroke's first (pointerdown) point's pressure with its first real (non-predicted) movement sample's pressure, once that sample exists — replacing the unreliable initial contact reading in the stroke's own data before it's ever rendered as a standalone dot or double-weighted by the spline, rather than only smoothing around it.
- Add regression coverage for both: a stroke's first-point pressure is independent of the previous stroke's ending smoothed pressure/position (including a fast-successive-strokes scenario), and a stroke's first point is corrected to match its first real movement sample rather than keeping an inflated/anomalous contact-spike value.
- No change to the EMA formula, its `alpha` clamps, the pressure floor, or the spline/ribbon rendering math in `stroke.ts` itself — both fixes are confined to the pointer-event handling in `brush-tool.ts` and act on the stroke's own point data before it reaches the renderer.

## Capabilities

### New Capabilities
- `brush-tool/pressure-sampling`: the pressure-sampling and smoothing state lifecycle for freehand brush strokes — specifically, that per-stroke pressure smoothing always starts from a clean, neutral baseline uncontaminated by any prior stroke's ending state, and that a stroke's first recorded sample is corrected to match its first real movement sample rather than keeping an unreliable, hardware-reported contact-spike value.

### Modified Capabilities
_None — no existing specs cover this behavior yet._

## Impact

- **Code**: `code/packages/sdk/src/actions/brush-tool/brush-tool.ts` — `handlePointerDown`/`handleStartStroke` reset ordering, and `handleMovement`'s point-0 backfill on the first real movement sample.
- **Tests**: `code/packages/sdk/src/actions/brush-tool/__tests__/brush-tool.test.ts` — test "11.1" updated to also cover the new shared reset helper; new tests cover cross-stroke pressure isolation, rapid successive strokes, and first-point contact-spike backfill (including a rollback check proving each regression test fails without its corresponding fix).
- **Not affected**: `WeaveStrokeNode` / `stroke.ts` rendering code itself (dot radius formula, ribbon width, spline smoothing) is unchanged — the fix corrects the stroke's own point data before it reaches the renderer, rather than changing how the renderer interprets that data. No serialized document format change; no public API change.
- **Related issues**: contributes to diagnosing/resolving GitHub issue #1174 ("Handwriting with Apple Pencil... uneven strokes"); completes the intent of issue #1040's "Change 7"; confirmed against real Apple Pencil Pro hardware behavior reported during this change's implementation.
