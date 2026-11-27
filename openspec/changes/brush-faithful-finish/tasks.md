# Tasks

## 1. The end of a line

- [x] 1.1 Make `resamplePoints` end the line at the last point, and verify tests that dense and sparse versions of one stroke end in the same place with and without a look, and that the goldens of strokes with and without a look still pass
- [x] 1.2 Cache the geometry of a stroke without a look while its points and width are the same, so the geometry keeps its identity between redraws, and verify it is built once and again when the width or points change
- [x] 1.3 Let `getRenderedGeometry` give the geometry for other points or another look, and verify tests for each, including `null` for the legacy ribbon

## 2. The bound

- [x] 2.1 Add `renderedDeviation` and `finalizeWithinDeviation` in `stages/refine.ts` (measure in rendered space, rebuild by insertion, keep the drawn points around a place that cannot be fixed, 80 ms budget, deadline and fallback options), and verify unit tests on varied hand-like strokes: within the bound, small for a smooth stroke, converges at sharp reversals, replaces an overshooting fit, honours the deadline and the fallback
- [x] 2.2 Relax the bound with the width of the stroke (5% of it, at most four times the bound), and verify tests that a broad stroke may move more and keeps fewer points, never above four times the bound and never below the one asked for
- [x] 2.3 Add the tool-level `finalizeMaxDeviationPx` (0.25) and the profile setting `finalize.maxDeviationPx`, with its descriptor, and verify the descriptor tests, that a profile overrides the tool and that 0 saves what the finishing step leaves
- [x] 2.4 Use it when a stroke ends, and verify an end-to-end test through the brush tool and the real renderer: the saved stroke is within the bound for the brush with no instrument and for every instrument, and larger without it
- [x] 2.5 Run the legacy golden gestures with the bound at 0 and verify they pass unchanged
- [x] 2.6 Document the setting in the SDK API reference of the brush tool and of its tuning, and verify the docs build

## 3. The glide

- [x] 3.1 Add `catchUpMs` and the glide of the end of a stabilized stroke (ease out, on animation frames, saved at the end), flushed by the next pointer down, `trigger` and `cleanup`, and verify tests for the glide, for saving exactly what saving at once saves, and for each way it is skipped or flushed
- [x] 3.1b Complete the stroke along the way the pen went (`completionTail`, the last 64 positions kept, the offset faded, a straight segment when the path does not reach back), glide along it, and use it for the Brush Lab ghosts too; verify unit tests of `completionTail`, a brush test that the corner the pen turned at is kept, that gliding and saving at once give the same points, and the ghost test
- [x] 3.2 Document it, and verify the docs build

## 4. Integration

- [x] 4.1 Run the SDK tests, lint and type check and the docs build, and verify `openspec validate brush-faithful-finish --strict` passes
