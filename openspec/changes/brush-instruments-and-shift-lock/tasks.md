# Tasks

## 1. Safety net and look fields

- [x] 1.1 Add golden tests of existing legacy, round and freehand looks (points + look in, outline/path out) and verify they pass on unchanged code
- [x] 1.2 Add optional `ends`, `variance`, `width.easing`, `width.nibAngle`, `width.nibContrast` to `WeaveStrokeLook` and defaults; extend `readStrokeLook` clamping; verify unit tests for clamping, defaults and unknown/old looks, and that 1.1 still passes
- [x] 1.3 Add Brush Lab descriptors and validation for the new look fields and verify descriptor completeness and out-of-range tests pass

## 2. Instruments plumbing with flat ends

- [x] 2.1 Implement `ends: 'flat'` in `appendRoundPath` with single-point disc fallback and verify render tests plus 1.1 golden tests
- [x] 2.2 Check `globalCompositeOperation` is honoured by the stroke node (add it if not) and verify with a render test
- [x] 2.3 Add instrument definitions and width-scaling factory for fineliner, marker, highlighter in `tunables/presets.ts`; add `setInstrument`/`getInstrument`, sticky and `custom` marking, atomic validation; verify tests for each scenario in `brush-tool/instruments`
- [x] 2.4 Add optional `instrument` to config export/import (version stays 1) and verify round-trip and old-document import tests
- [x] 2.5 Write the `brush-tool/instruments` and `stroke-node/rendering` (ends) docs: SDK API reference and build page for instruments and brush tool; verify the docs build (`docouture build`)

## 3. Velocity pressure and pencil/pen

- [x] 3.1 Add `pressure.synth` to the profile type, defaults, descriptors and validation; verify descriptor tests
- [x] 3.2 Implement velocity synthesis in the pressure stage (screen px/ms, zoom independent, mouse/touch only, baked into points) and verify tests for fast vs slow, zoom, pen unchanged, default unchanged
- [x] 3.3 Add pencil and pen instruments (`dpPressure`/`bezierFit` finalize) and verify instrument tests
- [x] 3.4 Document `synth`, pencil and pen in the API reference and brush tuning pages; verify the docs build

## 4. Variance, easing and brush

- [x] 4.1 Introduce the per-point context argument for `halfWidthAt` with identical output when absent; verify with 1.1 golden tests
- [x] 4.2 Implement seeded `variance` (string hash + mulberry32) and `width.easing`; verify determinism across redraws/zooms with fixed-seed tests
- [x] 4.3 Add the width-profile cache and verify no recompute on redraw and a long-stroke benchmark
- [x] 4.4 Add the brush instrument (taper, variance) and verify its test; document variance, easing and brush and verify the docs build

## 5. Fountain pen

- [x] 5.1 Implement nib width from travel direction over a distance window for the legacy ribbon and round outline; verify perpendicular-vs-parallel tests for both
- [x] 5.2 Add the fountainPen instrument and verify its test
- [x] 5.3 Document nib fields and fountain pen and verify the docs build

## 6. Shift lock

- [x] 6.1 Implement pure `lockToHeading` with anchor, 16 px threshold and 8 headings; verify unit tests including below threshold, nearest heading and zoom independence
- [x] 6.2 Wire it before the stabilizer for mouse strokes only behind `capture.shiftLock` (default off), with release mid-stroke; verify tool tests for default off, enabled, pen/touch ignored, release
- [x] 6.3 Let instruments enable the lock, add its descriptor, and document it; verify descriptor tests and the docs build

## 7. Integration

- [x] 7.1 Run the sdk test suite, typecheck and lint and verify all pass
- [x] 7.2 Add documentation ledger rows in `AGENTS.md` for the new and changed pages and verify they match the pages
- [ ] 7.3 Verify in Brush Lab that every instrument draws and that, with no instrument and the lock off, drawing is unchanged
