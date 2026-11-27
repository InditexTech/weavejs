# Tasks

## 1. The speed filter

- [x] 1.1 Add the optional `stabilizer.dCutoff` (type, optional default 1, descriptor with its range, validation) and use it in the One Euro filter, and verify that an unset value gives the points of 1 Hz, that a higher one keeps the line closer to a stroke that starts fast, and that a slow stroke is still smoothed
- [x] 1.2 Document it in the API reference of the brush tool and of its tuning, and verify the docs test that every tunable is documented and the docs build

## 2. The instruments

- [x] 2.1 Make the pen, the fountain pen and the brush follow a fast stroke closely (One Euro, `dCutoff` 12; the brush from streamline), and verify that the line is within 6 px of the pointer before a quick stroke is released, and further without the setting
- [x] 2.2 Shorten the end taper of the pen to half a stroke width (at least 2 px) and lift the brush to a floor of 40% with tapers of 0.75 and 1.5 stroke widths, and verify the values at several stroke widths
- [x] 2.3 Give the marker and the highlighter round ends and a pulled string of 6 and 8 screen pixels, and verify the looks, the profiles and that the pen profiles stay legacy
- [x] 2.4 Update the instrument table of the API reference and amend the statements about flat ends in `brush-instruments-and-shift-lock`, and verify the docs build and `openspec validate`
- [x] 2.5 Shorten the tapers of a stroke that is shorter than both together, in proportion, and take the soft shape off the brush's tapers, and verify tests that a short stroke reaches its full width where the tapers meet, that a long enough stroke is drawn as before, and the brush's look

- [x] 2.6 Make the box of a stroke include its ink for every caller, and verify tests on a real Konva node that the box is the points widened by half the stroke width whatever the caller skips, that it follows position and scale, and that the frames of a hover and of a selection are the same box and surround the line

## 3. Integration

- [x] 3.1 Look at the five pens in a browser with real pointer events, at several widths, with a quick, a slow and a wavy stroke, and compare the line drawn with the one saved, and the frames of a hover and of a selection around a thick line
- [x] 3.2 Run the SDK tests, types and lint, add ledger rows in `AGENTS.md`, and verify `openspec validate refine-brush-pens --strict`
