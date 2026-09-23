## 1. Fix the pressure-smoothing state reset ordering

- [x] 1.1 Extract the existing 4-line reset block from `handleStartStroke` (`lastSmoothedPressure = 0.5`, `lastPointerPos = null`, `lastPointerTime = 0`, `predictedCount = 0`) into a small private method (e.g. `resetPressureSmoothingState()`) on `WeaveBrushToolAction`, and verify `handleStartStroke` still calls it at the same point as before (no behavior change yet - confirm existing test "11.1" in `brush-tool.test.ts` still passes unmodified).
- [x] 1.2 Call `resetPressureSmoothingState()` at the very top of `handlePointerDown`, before `getEventPressure(e)` is invoked for the stroke's first sample, and verify by inspection that `getEventPressure`'s first call for a new stroke now always sees `lastPointerPos === null` and `lastSmoothedPressure === 0.5`.

## 2. Regression tests for the state leak

- [x] 2.1 Add a test that starts a first stroke, drives its smoothed pressure high and its last pointer position away from the origin (via one or more `pointermove`s with high pen pressure), ends the stroke, then immediately starts a second stroke at a different location - and asserts the second stroke's first `strokeElements[0].pressure` equals what `getEventPressure` would produce from a clean baseline (`alpha` at its 0.15 floor, blended against `0.5`), independent of the first stroke's ending values. Verify: new test passes and fails against the pre-fix ordering (confirm by temporarily reverting 1.2 locally, observing the new test fail, then restoring the fix).
- [x] 2.2 Add a test covering the "rapid successive strokes" case: two or more strokes started back-to-back with minimal time between `pointerup` and the next `pointerdown`, each at a different location - and assert no stroke's first-sample pressure is pulled toward a neighboring stroke's ending pressure. Verify: test passes.
- [x] 2.3 Update/extend test "11.1" (or add an adjacent one) so it documents the full guarantee: reset happens both (a) inside `handleStartStroke` as before, and (b) before `handlePointerDown`'s own pressure read - verify both call sites are exercised and asserted.

## 3. Verify no regressions elsewhere

- [x] 3.1 Run the full `brush-tool.test.ts` suite and confirm all existing cases (coalesced/predicted events, palm rejection, dash/eraser handling, etc.) still pass unchanged, since this fix only touches reset ordering, not the EMA formula or event handling logic.
- [x] 3.2 Run the full `stroke.test.ts` suite and confirm it passes unchanged, confirming the fix has no effect on rendering (`stroke.ts` is untouched by this change).
- [x] 3.3 Manually verify on a pressure-capable input device (or via a scripted PointerEvent sequence simulating one) that starting several brush strokes of size > 1px in quick succession no longer shows an oversized circle at the start of any stroke beyond the first one in the session. _(No runnable demo/e2e harness exists in this repo to test on a physical device or via CDP; satisfied instead by tests 11.11/11.12, which script real pointerdown/pointermove/pointerup sequences with pen pressure through the actual handlers and assert each subsequent stroke's first-point pressure - confirmed to fail pre-fix with an inflated value and pass post-fix.)

## 4. Fix the contact-spike / spline-endpoint compounding (found on real Apple Pencil Pro hardware after tasks 1-3 shipped)

- [x] 4.1 In `handleMovement`, when the stroke currently has exactly one recorded point and the incoming sample is not a speculative/predicted one, backfill that first point's `pressure` with the incoming sample's pressure before appending it - and verify by inspection that later movements (stroke already has 2+ points) and predicted samples do not trigger this backfill.
- [x] 4.2 Add a unit test driving `handleMovement` directly: a mock temp-stroke with a single, deliberately inflated first-point pressure, then one real movement sample - and assert the first point's pressure now equals the movement sample's pressure. Verify: test passes, and fails if the backfill is temporarily removed (confirmed manually).
- [x] 4.3 Add a unit test asserting a *predicted* first movement sample does NOT perform the backfill (first point's pressure stays at its original, possibly-inflated value). Verify: test passes.
- [x] 4.4 Add a unit test asserting the backfill only fires on the one-point-to-two-points transition: once a stroke already has 2+ points, further movements leave the first point's pressure untouched. Verify: test passes.
- [x] 4.5 Add an end-to-end test driving the real `pointermove` handler against a temp-stroke stub seeded with a contact-spike-like first-point pressure, and assert the value passed to `nodeHandler.onUpdate` shows the first point corrected to match the first real movement sample. Verify: test passes.
- [x] 4.6 Re-run the full `brush-tool.test.ts` and `stroke.test.ts` suites, `eslint`, and `tsc --noEmit` to confirm no regressions from this addition.
