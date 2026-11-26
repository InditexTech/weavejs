# Design

## Context

Today a stroke is `{points, strokeWidth, opacity, look?}`. The tool holds one `look` and per-profile config; `setLook` and `setInputProfile` validate against the descriptors in `tunables/` and apply atomically. `readStrokeLook` clamps and defaults every field and ignores unknown ones, which is the compatibility lever. `halfWidthAt(look, width, pressure, fromStart, toEnd)` has no direction or stroke id, and `appendRoundPath` forces discs at both ends. Shift is not handled by the brush. `BRUSH_CONFIG_DOCUMENT_VERSION` is 1 and import rejects other versions. See proposal.md for motivation and the specs for requirements.

## Goals / Non-Goals

**Goals:**
- Instruments built only on `setLook`, `updateProps` and the profile setters.
- Exact no-op at every new default, proven by golden tests of the legacy, round and freehand looks before the shared render paths change.
- Deterministic rendering across viewers and redraws.

**Non-Goals:**
- No change to the stroke point format or `look.version`.
- No new pointer devices or stabilizer types.
- No pressure synthesis for pens that report pressure.

## Decisions

1. **Sticky instrument.** The tool keeps an `instrumentId` next to `presetIds`/`scenarioId`. `setLook`, `setInputProfile`, `importConfig` of a look, and `applyScenario` reset it (`custom` or none). Alternative: one-shot macro, rejected because the showcase UI and Brush Lab need a read side and the tool already tracks presets this way.
2. **Instrument = data.** A definition is `{id, label, look patch, props, profile patches}` produced by a factory taking the stroke width (used for distances along the stroke such as tapers), living in `tunables/presets.ts`. Applying one replaces the look and the mouse and touch profiles, and sets opacity and blend mode, so the result never depends on the previous instrument; the pen profiles are left alone. Applying validates the whole bundle first and applies all or nothing, like `applyScenario`.
3. **Per-point context for width.** `halfWidthAt` gains an optional context argument (heading, stroke seed, distance window) instead of more positional parameters. With no context the function returns today's value.
4. **Variance is a specified PRNG.** A string hash of the stroke id seeds a fixed algorithm (mulberry32), sampled by point index along arc length, so output never depends on SDK version or redraw. Alternative: Math.random at capture and storing offsets, rejected as it bloats stored points.
5. **`synth: 'velocity'` bakes pressure in the pressure stage.** Speed = screen px / ms from event time, smoothed by the existing filter, mapped to pressure through a monotonic curve. Applies only when the pointer is not a pen reporting pressure. Because it is baked into points, finalize modes (`dpPressure`, `bezierFit`) and old viewers behave correctly.
6. **Nib width** uses the angle between travel (averaged over a distance window) and `nibAngle`; width scales between 1 and `1 - nibContrast`. It needs travel direction only, so it works for both outlines.
7. **Width-profile cache.** Half-widths are computed once per (points, look, stroke id) and reused on redraw; zoom only affects spacing, so the cache key excludes scale where the look is not `zoomAware`.
8. **Shift lock = pure `lockToHeading`.** `lockToHeading(lock, point, threshold)` returns the projected point and the next state (unlocked until the pointer is 16 screen px from the anchor, then locked to one of 8 headings). It is called in `appendMovementSample` before `stabilizer.apply`, for mouse strokes only (pointer type `mouse`). The setting is the profile field `capture.shiftLock` (default `false`) rather than a separate `input.shiftLock`: that makes it a normal tunable, so the descriptors, validation, Brush Lab and instrument patches need no new plumbing. Instruments turn it on in the mouse profile. The anchor is the last recorded position before Shift was first seen down; Shift state is read from each pointer event (`shiftKey`), so a release mid-stroke simply unlocks.
9. **Config document.** `instrument` is an optional top-level field; version stays 1. An older SDK importing a document with new look keys rejects it as a whole ("Unknown look setting"), which is loud and documented.

## Risks / Trade-offs

- [Shared render paths regress existing strokes] → golden/snapshot tests for legacy, round and freehand looks land first.
- [`globalCompositeOperation` may not be honoured by the stroke node] → verify in the first slice; add to the node if missing and cover it with a test.
- [Instrument props overwrite a user's opacity/width] → factory takes the current width; opacity is part of the instrument by design and documented.
- [Variance or nib drifts between SDK versions] → algorithm pinned in the spec and covered by fixed-seed tests.
- [Perf on redraw] → cache in decision 7, checked with a benchmark test on a long stroke.
- [Older viewers draw plain round strokes] → accepted by the issue; documented in the API reference.
