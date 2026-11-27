# Proposal

## Why

When the pointer is released the brush replaces the points of the stroke with a reduced set, and the stroke is drawn again through them, so the line a user just drew visibly changes. Measured through the real tool and renderer, on strokes drawn with a mouse: the saved line strays from the drawn one by 1–2 px at its worst point in almost every stroke, and by tens of px where the path turns sharply (up to 234 px in 80 varied strokes); 5–54% of a stroke's ink visibly changes, depending on its width. The tail moves as well: a stabilized pen lags 5–20 px behind the pointer and, on release, the stroke is completed at the pointer in one step, so its end jumps by the lag.

The finishing step promises the saved stroke stays within its tolerance of the drawn path. It is measured point by point on the reduced points, not as the stroke is drawn, so the promise does not hold. A defect of the renderer adds to it: a stroke drawn from dense points stops up to 2 px short of its last point, while a sparser one with the same shape does not, so the end of a stroke moves, with its taper, when its points are reduced.

## What Changes

- The finishing step keeps the saved stroke within a bound of the drawn one, measured as strokes are drawn (the line and its width). Where the result of the finishing step is farther, the stroke is rebuilt from the drawn points, adding the drawn point nearest to each place where the saved line departs most, until it does not. If no set of points matches, or it takes longer than 80 ms, every drawn point is kept.
- The bound is `finalize.maxDeviationPx` on a profile and `finalizeMaxDeviationPx` on the tool, **default 0.25 screen pixels**. A profile that leaves it empty uses the tool's; `0` saves what the finishing step leaves. For a broad stroke the bound grows with its width (5% of it, at most four times the bound), since a shift that is a visible part of a hairline is not on a broad stroke.
- **BREAKING (default behaviour):** with no configuration the brush used to save what the finishing step left, and now saves a stroke within the bound. Strokes of a document are not changed, and the data format is the same; new strokes keep more points where the line needs them. `finalizeMaxDeviationPx: 0` restores the earlier behaviour point for point.
- The line of a stroke always reaches its last point, whatever the spacing of its points. This also changes the drawing of existing strokes whose last two points are closer than the spacing of the stroke (2 px) by up to that much at the end.
- A stabilized stroke is completed along the way the pointer went, not with a straight segment, and glides from where its line ends to the pointer over 90 ms (`catchUpMs`, `0` is at once) when the pointer is released, and is saved when it arrives. It is saved at once if the next stroke starts, the tool is left, or there are no animation frames.

## Capabilities

### New Capabilities
- `brush-tool/finish-fidelity`: the bound on how far a saved stroke is from the drawn one, how the stroke is rebuilt to meet it, the time it may take, the width-aware relaxation, and the glide of a stabilized stroke to the pointer.

### Modified Capabilities
- `brush-tool/input-profiles`: the legacy preset records the points of the previous release when the tool's bound is 0, and with the bound at its default the points that keep the saved stroke within it.
- `stroke-node/rendering`: the line of a stroke reaches its last point; strokes without a look are otherwise drawn as before.

## Impact

- `code/packages/sdk/src/actions/brush-tool/`: `stages/refine.ts` (new), `brush-tool.ts` (finish and glide), `types.ts`, `constants.ts`, `tunables/descriptors.ts`.
- `code/packages/sdk/src/nodes/stroke/stroke.ts`: the line reaches its last point; the geometry of a stroke for other points or another look; the geometry of a stroke without a look is kept while its points are the same.
- Docs: SDK API reference for the brush tool and its tuning, ledger rows in `AGENTS.md`.
- Tests: the legacy golden gestures are run with the bound at 0, which is the behaviour they pin.
