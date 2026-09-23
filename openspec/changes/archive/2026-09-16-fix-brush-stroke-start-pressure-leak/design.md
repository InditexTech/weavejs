## Context

See proposal.md - Why for motivation. Relevant current implementation (`code/packages/sdk/src/actions/brush-tool/brush-tool.ts`):

- `handlePointerDown` (:161-188) computes the new stroke's first pressure sample via `getEventPressure(e)` (:184) and only afterwards calls `handleStartStroke(pointPressure)` (:185).
- `handleStartStroke` (:292-332) resets the smoothing state (`lastSmoothedPressure = 0.5`, `lastPointerPos = null`, `lastPointerTime = 0`, `predictedCount = 0`) at its top (:293-296) — i.e. *after* `getEventPressure` already ran for point 0.
- `getEventPressure` (:84-110) blends a raw pressure reading into `lastSmoothedPressure` via a velocity-adaptive EMA, using `lastPointerPos`/`lastPointerTime` to derive velocity. On the very first call of a stroke, that state is whatever the *previous* stroke left behind (or the constructor defaults, only for the session's first-ever stroke).
- `WeaveStrokeNode.drawRibbonWithDash` (`stroke.ts:145-153`) renders a stroke's first point as a standalone filled dot sized directly from that point's `pressure`, so an inflated point-0 pressure is visibly rendered as an oversized circle - this rendering path itself is not being touched by this change.
- `WeaveStrokeNode.getSplinePoints` (`stroke.ts:57-88`) additionally duplicates point 0 as both `p0` and `p1` of the first Catmull-Rom segment (`i=-1` → `p0 = pts[max(-1,0)]`, `p1 = pts[0]`), giving point 0's pressure double weight over the start of the *rendered ribbon itself* - not just the standalone dot, and not just for one frame: point 0's value stays embedded in `strokeElements` for the stroke's whole life.
- This exact reset was already proposed and implemented in response to issue #1040 ("Change 7"), but landed positioned one call too late relative to `handlePointerDown`'s own pressure read - the intent shipped, the wiring has an ordering gap.
- **Confirmed on real hardware during this change's implementation**: after the reset-ordering fix (below) shipped, a user reproduced the same oversized-circle symptom on an Apple Pencil Pro with a 20px brush. This is the second, independent cause this design also addresses: a stylus's very first (`pointerdown`) pressure sample is a well-known unreliable "contact spike" - the instantaneous force of initial contact is commonly higher than the sustained force used while actually drawing - and nothing corrected that sample once better data (the first real movement) arrived.

## Goals / Non-Goals

**Goals:**
- Guarantee a stroke's first pressure sample is computed from the same neutral baseline every time, regardless of how the previous stroke ended or where it was drawn.
- Guarantee a stroke's first (pointerdown) point does not permanently keep an unrepresentative "contact spike" pressure once a real second sample is available to correct it.
- Keep both fixes confined to state lifecycle/data correction in the brush tool action - no change to the smoothing math, floors, clamps, or `stroke.ts` rendering.

**Non-Goals:**
- Not changing the EMA formula, `alpha` velocity mapping, or the `0.15` pressure floor.
- Not changing `stroke.ts` rendering (dot radius formula, ribbon width interpolation, spline smoothing) directly - both fixes act on the stroke's own point data (`strokeElements`) before it reaches the renderer, rather than changing how the renderer interprets that data.
- Not attempting to detect or distinguish a "genuine" hard press at stroke start (an intentional, expressive user action) from a hardware contact-spike artifact - the backfill in Decision 2 treats the first real movement sample as the more trustworthy value in both cases. If a product need for an intentionally fat calligraphic stroke start emerges, that's a separate, deliberate feature decision, not this bug fix.
- Not changing the existing (and unchanged by this fix) behavior where the *second* point of a stroke also starts its own smoothing from the neutral baseline rather than continuing from point 0's value - that behavior predates this change and isn't part of the reported bug.

## Decisions

**Decision 1: Add a second reset call site, at the top of `handlePointerDown`, before `getEventPressure` is invoked - rather than restructuring `handleStartStroke`.**

`handleStartStroke`'s existing reset stays exactly where it is (it still serves its current purpose of giving the stroke's *second* point a fresh baseline). A new reset of the same state - `lastSmoothedPressure`, `lastPointerPos`, `lastPointerTime`, `predictedCount` - is added at the very start of `handlePointerDown`, before `getEventPressure(e)` runs for point 0. To avoid duplicating the four-line reset in two places, extract it into a small private method (e.g. `resetPressureSmoothingState()`) and call it from both sites.

Alternatives considered:
- *Move the existing reset out of `handleStartStroke` entirely and into `handlePointerDown` only.* Rejected: `handleStartStroke` is unit-tested directly (calling it via reflection) and asserted to reset state itself; removing that would change its contract and break/require rewriting an existing, currently-correct test for a property that should stay true. It would also silently change point 1's smoothing-continuity behavior if any other caller ever invokes `handleStartStroke` without going through `handlePointerDown` first.
- *Give point 0 special-cased pressure handling in `stroke.ts` (e.g. clamp/average the first dot's radius).* Rejected: treats the symptom in the renderer rather than the cause in the action; would also touch code this proposal explicitly keeps out of scope, and wouldn't fix the underlying state leak (which also skews the computed `alpha` via stale `lastPointerPos`/`lastPointerTime`, not just the pressure value).
- *Reset state on `pointerup`/`handleEndStroke` instead of on the next `pointerdown`.* Rejected: functionally equivalent for the very next stroke, but leaves the state stale for as long as the tool is idle between strokes and doesn't protect against any other code path that might read the smoothing fields between strokes; resetting at the start of the next stroke (defense at the point of use) is more direct and self-contained.

**Decision 2: In `handleMovement`, backfill the stroke's point 0 pressure with the first real (non-predicted) movement sample's pressure, once that sample exists.**

Concretely: when `newStrokeElements.length === 1` (i.e. only the pointerdown point exists so far) and the incoming sample is not a speculative "predicted" one, overwrite `newStrokeElements[0].pressure` with the new sample's pressure before pushing it. This directly fixes both remaining risks from Decision 1's original design: the standalone dot (`stroke.ts:145-153`) is redrawn with the corrected value on the very next frame instead of persisting, and the spline's phantom-endpoint duplication (`stroke.ts:59-60`) stops mattering because point 0 and point 1 now hold the same pressure - there's no longer a divergent value to double-weight.

Alternatives considered:
- *Ignore/ lower the alpha floor specifically for the very first `getEventPressure` sample of a stroke, to lean harder on the neutral baseline.* Rejected: this is an arbitrary tuning knob with no principled value, only reduces (doesn't eliminate) the effect, and doesn't address the spline's phantom-endpoint doubling at all - the backfill approach addresses both mechanisms structurally instead of numerically damping one of them.
- *Fix the spline's phantom-endpoint duplication directly in `stroke.ts` (e.g. don't duplicate point 0's pressure into a synthetic tangent point).* Rejected for this change: touches rendering code this proposal has kept explicitly out of scope throughout, has broader implications for how every stroke's start and end taper (not just the pressure-anomaly case), and the backfill in `brush-tool.ts` already neutralizes its effect for this specific symptom by removing the divergent value at the source.
- *Average point 0 and the first real point's pressures instead of fully overwriting point 0.* Rejected: still leaves a partially-inflated value if the contact spike is extreme, is harder to reason about/test, and there's no evidence a partial correction is actually desired UX (see Non-Goals - if a deliberately fat calligraphic start is wanted later, that should be a distinct, explicit feature).
- *Delay creating/rendering the stroke until the first real movement sample arrives, rather than rendering a standalone dot at pointerdown at all.* Rejected: removes the app's existing "instant tap = dot" behavior (single-click strokes / taps) documented and tested elsewhere (`handleEndStroke`'s tap/short-stroke handling), which is out of scope and would be a much larger behavioral change.

## Risks / Trade-offs

- **[Risk] The backfill assumes the first real movement sample is more trustworthy than the pointerdown sample.** For genuinely correct pointerdown pressure (no hardware anomaly), this slightly reduces expressiveness at the very start of a stroke (a deliberate hard initial press could be smoothed away by the immediately following, possibly softer, first drag sample) → Mitigation: accepted trade-off (see Non-Goals) - the reported bug is the dominant, reproducible case; a future opt-in "preserve initial pressure" mode is possible but out of scope here.
- **[Risk] Extracting a shared private reset method changes the brush tool action's internal shape slightly**, and existing tests reach into private fields/methods via reflection → Mitigation: keep the reset fields' names and `handleStartStroke`'s externally-observable reset behavior identical; only add the new call site and the extracted helper, don't rename or remove existing state.
- **[Risk] The spline's phantom-endpoint duplication (`stroke.ts:59-60`) is still architecturally present** - this change only neutralizes its *effect* on the specific contact-spike symptom by equalizing point 0 and point 1's pressure; a different rendering-side fix could still be worth pursuing later for other tapering edge cases (not reported here) → Mitigation: out of scope; tracked as a possible smaller follow-up under #1174 if further tapering issues surface.

## Migration Plan

None required - this is an internal behavior fix with no data model, serialization, or public API change. Ships as a normal fix; verified via updated/added unit tests in `brush-tool.test.ts`, including a rollback check (temporarily reverting each fix and confirming its corresponding new test fails) for both the reset-ordering fix and the backfill fix. No rollback concerns beyond reverting the change.
