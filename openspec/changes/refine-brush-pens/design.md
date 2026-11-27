# Design

## Context

See proposal.md for why. The pens were drawn with a mouse in a real browser (real pointer events at about 125 Hz, a stage with the stroke node) and with a node renderer, and the saved stroke was compared with the last frame drawn before the release. What was measured:

- The One Euro filter in `stages/stabilizer.ts` measures the speed with a low-pass filter of a fixed 1 Hz, the value of the paper. At 1 Hz it takes about 160 ms to see a speed. A stroke that starts fast, or whose direction changes (each axis has its own filter), is smoothed with the cutoff of a slow stroke, and lags. With `minCutoff` 4 and `beta` 0.04 the end of a quick stroke was 14 to 16 px behind the pen, and the line strayed 2 to 5 px (rms; up to 12 px) from the path the pen followed, because a lagging filter cuts the turns.
- With a speed filter of 12 to 15 Hz the same settings gave 4 px of lag and 1 to 2 px of error, and a slow stroke was smoothed as before (the turning noise of a slow stroke with a hand's shake was 3.3 degrees at 1 Hz and 3.4 at 15 Hz, against 6.7 with no stabilizer).
- The streamline stabilizer of the brush lags by its time constant times the speed: 14 to 28 px at the pace of a quick stroke.
- The pulled string lags by exactly its leash at any pace, and had the smoothest line on a stroke with the shake of a hand without cutting turns (error 0.4 to 1.4 px with a leash of 6).
- The pen ended in a needle because its end taper was 12 px whatever its width. The taper uses the ease-out curve, whose slope at the tip is 2: the shorter the taper, the blunter the tip, a taper of half a stroke width being close to a round end.

## Goals / Non-Goals

**Goals:**
- A stabilized line that stays close to the pen at any pace, so that releasing the pen changes the stroke by a few px, not by a hook.
- Pen, brush, marker and highlighter that do not end in needles, are not hair-thin, and are smooth.
- No change where the new setting is not used.

**Non-Goals:**
- Changing the stabilizers for devices that report pressure, or the pencil (not reported).
- Changing how a taper or a minimum width is drawn: strokes saved with a look keep drawing as they did.
- Making the speed-based width less sensitive for every instrument.

## Decisions

**D1. A new optional setting, `stabilizer.dCutoff`, rather than a new default.** The One Euro filter is already used by presets of the Brush Lab (`stabilized`, `smooth`) that were tuned with 1 Hz, so changing the constant would change them. The setting is optional, stored only when set, with a default of 1, as `capture.shiftLock` and `pressure.synth` are, so the document version stays 1.
- Alternative: raise `beta` until the lag goes. Rejected: it is the lag at the start of a stroke that remains, and a high `beta` removes the smoothing of everything above a walking pace.
- Alternative: another stabilizer. Rejected: the One Euro filter smooths a slow stroke as well as any and only needed its speed to be read faster.

**D2. 12 Hz.** Between 8 and 15 Hz the lag was within a px of its floor and the smoothing did not change; 12 is in the middle of that range.

**D3. The brush moves to the One Euro filter** (`minCutoff` 3, `beta` 0.04, `dCutoff` 12) from streamline 0.25, whose lag cannot be reduced without removing its smoothing, since it is a fixed time constant. `minCutoff` 3 rather than 4 keeps a little more of the weight of a brush at slow speed.

**D4. A pulled string for the marker and the highlighter** (6 and 8 screen pixels). Compared on a stroke with the shake of a hand: the One Euro filter (4, 0.04) was smooth but cut the turns and lagged 15 px; streamline 0.1 left a visible wobble; the pulled string removed the wobble and followed the path, and its lag is its leash at any pace. A larger leash for the highlighter because the wobble of a wide line shows as a lack of straightness. A stroke shorter than the leash is still drawn, since the stroke is completed at the pointer when it ends.

**D5. Rounded ends by a shorter taper, not a new look field.** A floor for a taper (the width of the end) would be a new look field with its own descriptor, type and documentation, and would change nothing for strokes already saved. A taper half a stroke width long with the ease-out curve is close to a round end, and a new field is not needed for it.
- The pen's taper follows the stroke width as the brush's and the fountain pen's do (`widths(strokeWidth, 0.5)`), at least 2 px, because a fixed 12 px was a needle at a width of 16 and nothing at a width of 2.

**D6. The brush's minimum width is 0.4**, up from 0.15, and its tapers are 0.75 and 1.5 stroke widths. Seen at widths of 3, 8 and 16 on a quick and a slow stroke: 0.35 was still thin at speed and 0.5 looked like the marker; 0.4 keeps the brush's thin tip and its swell. The brush used the `easeInOut` taper, whose width is under 12% for the first quarter of the taper and under 50% for the first half: a needle at the tip. With the default `easeOut` the end is blunt, and it is the shape the pen uses.

**D7. Tapers of a short stroke shrink together.** `halfWidthAt` multiplies the width by the start taper and by the end taper. In a stroke shorter than the two, a point is inside both and is narrowed by both: a 14 px stroke with a brush at a width of 12 never reached more than a fraction of it, and a letter or a tick drawn with the brush was a hairline. Where the tapers do not fit, both are now shortened in proportion to the length of the stroke (`length / (start + end)`), so the stroke reaches its full width at the point where they meet. It is computed from the distances `halfWidthAt` already receives, so nothing is passed that was not, a stroke at least as long as its tapers is drawn exactly as before, and a stroke with no tapers is not touched.
- Alternative: cap each taper at half the length. Rejected: it changes the proportion between the tapers of a brush (0.75 and 1.5).
- Trade-off: a short stroke already saved with tapers longer than itself is drawn fuller. That was the one drawing in which both tapers cut the width, and the taper distances are still those of the look for every stroke that is long enough for them.

**D8. The box of a stroke includes its ink, in the node and not in the frames.** The frames of the selection plugin ignore the stroke of a node (`ignoreStroke`) so that the border of a rectangle is not part of its box. The stroke of a stroke node is its ink, so a thick line, and a round end of a highlighter, stuck out of both frames by half its width. Konva's own `getClientRect` already adds the stroke when asked to, which is why the frames of a multiple selection, the hit area and the area selection already surrounded the ink; only the callers that skip the stroke did not. The node now never skips its stroke, so every caller gets the same box and the hover and selection frames, which were set up with the same option, cannot differ. The margin is half of the stroke width, the most the ink is ever drawn from the line, and a pen drawn thinner at speed has a little room.
- Alternative: set `ignoreStroke` to false for strokes in `getTransformerProperties`. Rejected: it applies to a single selected node only, the frame of a hover is made with its own fixed option, and a selection of several strokes and other nodes would still cut the ink.
- Alternative: widen `getSelfRect` by the ink. Rejected: callers that do not skip the stroke would add the margin twice.
- Trade-off: the callers that skipped the stroke of a node on purpose, snapping, aligning, fitting to the screen, the minimap, the remote selection frame, the culling of what is on screen and the export bounds, now see the ink as well, which is what they meant for a line that is drawn with width; the node's own width and height, and so the saved stroke, do not change.

## Risks / Trade-offs

- [The instruments change look after being merged] → they have not been released; the specs of `brush-instruments-and-shift-lock` that said flat ends are amended in place.
- [A higher speed filter lets more of a jitter through at the start of a fast stroke] → measured: the same or lower turning noise than the default at every pace tried; the setting can be set to 1 to restore the old behaviour.
- [A pulled string delays the start of a line by its leash] → the line starts at the first point and follows from the first movement beyond the leash; a short stroke is completed at the pointer.
- [The highlighter's line trails the cursor by 8 px] → it is the price of the smoothing; the leash is in screen pixels so it is the same at every zoom, and the stroke catches up when the pointer is released.

## Migration Plan

None for stored strokes: nothing about them changes. To get the earlier feel of an instrument, set its look and profile with `setLook` and `setInputProfile` after selecting it (for example `stabilizer.dCutoff` 1).
