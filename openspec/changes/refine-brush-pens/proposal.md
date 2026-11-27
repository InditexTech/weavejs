# Proposal

## Why

Drawing with the pens in a browser, with a mouse, showed five things that were wrong, each seen by the person using them:

- **The fountain pen changed drastically when the pointer was released.** While drawing, the line stopped 15 px or more short of the pointer, with a hairline end; on release it was completed with a straight segment, and the nib drew that segment as a thick hook. The same happened, less visibly, with the pen and the brush. The cause is the One Euro stabilizer: it measures the speed through a filter with a fixed cutoff of 1 Hz, so a stroke that starts fast, or turns, is smoothed as a slow one for 100 to 200 ms and lags 15 px or more behind the pen, and the stroke is completed with the part that was missing.
- **The pen ended in a needle.** Its end taper was a fixed 12 px, which is a hairline over 12 px for a thick pen.
- **The brush was too fine all along and at the end.** It could get as thin as 15% of its width at speed, its end taper was 3 stroke widths long with a soft shape that ends in a needle, and a stroke shorter than its tapers, such as a letter, was a hairline, because both tapers narrowed it at once.
- **The frame of a hover and of a selection cut a thick line.** Seen with the highlighter: both frames passed through the ink at the ends of the stroke, by half its width.
- **The marker and the highlighter were not smooth,** because they had no stabilizer and a mouse reports whole pixels with the shake of a hand, **and their ends were cut square.**

## What Changes

- A One Euro stabilizer gets a new optional setting, `stabilizer.dCutoff` (Hz, default 1, so nothing changes where it is not set), the cutoff of the filter that measures the speed. A higher one keeps the line within a few px of the pen at any pace and still smooths a slow stroke. Measured with a mouse, `minCutoff` 4 and `beta` 0.04: 15 px of lag at the end of a quick stroke with 1 Hz, 4 px with 12 Hz, and the line strays 1 px from the path the pen followed instead of 4.
- **BREAKING (look of the instruments, which have not been released):** the `pen`, `fountainPen` and `brush` use a One Euro filter with `dCutoff` 12 for mouse and touch (the brush used a streamline stabilizer of 0.25, which lags 14 to 28 px at pace).
- The `pen` ends in a taper half a stroke width long (at least 2 px), which is a rounded end, instead of 12 px.
- The `brush` is never thinner than 40% of its width (it was 15%), its tapers are 0.75 and 1.5 stroke widths long (they were 1.5 and 3), and they use the default shape instead of the soft one, which left a needle at the tip.
- The box of a stroke includes its ink: its points widened by half of its stroke width on every side. The frames of a selection and of a hover left the stroke of a node out, as they do for a border, and cut a thick line at its ends (a highlighter with round ends sticks out by half its width); the stroke of this node is its ink, so it is now part of its box for every caller, and the frame of a hover and the frame of a selection are the same. Snapping, aligning, fitting to the screen, the minimap and what is on screen use the same box. The width and height of the node are not changed.
- A stroke shorter than its start and end tapers together shortens both in proportion, so it reaches its full width where they meet. Before, both narrowed it at once and a short stroke, such as a letter or a tick, was a hairline whatever the width. Strokes at least as long as their tapers, which is every stroke saved before this change that is not shorter than its tapers, are drawn as before.
- The `marker` and the `highlighter` have round ends instead of flat ends, and are smoothed with a pulled string of 6 and 8 screen pixels. The line is then never more than the leash behind the pen, so they still end where the pen was lifted.

## Capabilities

### New Capabilities
- `brush-tool/pen-feel`: the speed filter of the One Euro stabilizer, what smooths each instrument, and the ends of the pens.

### Modified Capabilities
- `stroke-node/rendering`: tapers that do not both fit in a short stroke are shortened in proportion.

The instruments are specified by the change `brush-instruments-and-shift-lock`, whose statements about flat ends are amended in place.

## Impact

- `code/packages/sdk/src/actions/brush-tool/`: `types.ts`, `constants.ts` (the optional default), `stages/stabilizer.ts`, `tunables/descriptors.ts`, `tunables/presets.ts`.
- `code/packages/sdk/src/nodes/stroke/render/look.ts`: the tapers of a short stroke.
- `code/packages/sdk/src/nodes/stroke/stroke.ts`: the box of a stroke.
- Docs: SDK API reference of the brush tool and of its tuning, ledger rows in `AGENTS.md`.
- Tests: stabilizer, instruments and descriptor tests; the Brush Lab docs test requires the new setting to be documented.
- The completion of a stabilized stroke along the way the pen went is in `brush-faithful-finish`.
