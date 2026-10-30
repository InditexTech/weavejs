# Tasks

## 1. SDK: staged brush pipeline with legacy preset

- [x] 1.1 Add golden-test helpers in `code/packages/sdk/src/actions/brush-tool/__tests__/` that feed synthetic gestures (mouse, 60 fps pen with coalesced batches, 200 Hz pen with pressure ramp, pinch) to the current brush tool and snapshot the recorded points; verify the snapshots are generated from the unchanged code and committed
- [x] 1.2 Define the profile configuration types and defaults (capture, pressure, stabilizer, finalize, touch guard) in `brush-tool/types.ts` and `constants.ts`; remove nothing yet; verify `npm run types:check` passes
- [x] 1.3 Extract capture, pressure, stabilizer and finalize into stage functions behind a legacy preset that wires the existing logic unchanged; verify the golden tests from 1.1 pass with identical points and the existing `brush-tool.test.ts` suite passes untouched
- [x] 1.4 Add the profile resolver (`mouse`, `touch`, `pen.applePencil`, `pen.desktop`, unknown pointer type to `mouse`), `resolveProfile` hook and `forceProfile`, resolved once at stroke start; verify unit tests for each pointer type and platform, the override, and that a profile does not change mid-stroke
- [x] 1.5 Add public setters/getters for per-profile configuration (applied from the next stroke, validated against the descriptors from group 2); verify tests that a change mid-stroke does not affect that stroke and that the legacy default is kept when nothing is configured
- [x] 1.6 Remove or mark deprecated the unused `interpolationSteps` option only if no test or documented API depends on it (otherwise leave it); verify by searching usages and running the suite
- [x] 1.7 Update `docs/src/modules/sdk/pages/api-reference/actions/brush-tool.adoc` for profiles, the resolver and setters, and update the documentation-state ledger in `AGENTS.md`; verify `docouture build` succeeds with no broken xrefs

## 2. SDK: tunables, presets and scenarios as data

- [x] 2.1 Create the descriptor list (key, group, stage, capture/draw kind, type, default, range, unit, help) for every setting accepted by the profile and look configurations; verify a test that every accepted setting has a descriptor and that all defaults reproduce the legacy preset
- [x] 2.2 Implement validation from the descriptors, rejecting out-of-range values and keeping the previous value; verify unit tests for numeric, enum and boolean cases
- [x] 2.3 Publish factory presets per profile and per look and scenarios A to F (read-only; copy under a new name allowed); verify tests that scenario A equals legacy output on the golden gestures and scenario B enables coalesced capture, event time and zero-pressure keep on all pen profiles
- [x] 2.4 Implement versioned JSON export and import of the whole configuration, rejecting unknown versions and invalid values without changing state; verify round-trip and invalid-document tests
- [x] 2.5 Document the descriptor list, presets and scenarios in `brush-tool.adoc` (or a new `brush-tuning.adoc` linked from the nav); verify the docs build

## 3. SDK: capture and pressure modes (scenario B)

- [x] 3.1 Implement the coalesced capture mode computing each sample's container position from its client coordinates (stage content rect and the container's inverse absolute transform), without `setPointersPositions`; verify unit tests with scaled, translated and nested-container stages that every distinct sample position is recorded and ordering is preserved
- [x] 3.2 Keep predicted samples provisional in the new mode (removed before real samples and at stroke end); verify tests for add, rollback and finish
- [x] 3.3 Implement event-time elapsed time for time-based filters with a nominal-rate fallback; verify a test that the same timed samples processed one by one or as one batch give identical pressures
- [x] 3.4 Implement the zero-pressure policies (legacy, keep, holdLast), the pressure filters (legacy, time-based EMA, One Euro, none) and the start/end policies (backfill, average of first readings, none); verify tests for lift-off, 133 Hz vs 240 Hz agreement, non-finite input and no carry-over between strokes
- [x] 3.5 Add the modified requirement behaviour to `openspec/specs` documentation of pressure sampling by confirming the existing `brush-tool/pressure-sampling` tests still pass for the legacy start policy and adding scenarios for the new policies; verify the suite passes
- [x] 3.6 Update the brush-tool docs page with the capture and pressure options and their defaults; verify the docs build

## 4. SDK: stabilizer and finalize (scenarios C and F)

- [x] 4.1 Implement the position stabilizers (none, One Euro, pulled string, streamline) with screen-pixel distances, optional zoom following, and completion at the pen's final position on release; verify tests for jitter reduction on a straight path, final point equals release point, and stabilizer off equals raw
- [x] 4.2 Implement the finalize modes (none, DP by position, DP by position plus pressure, Bézier fit resampled to points) with tolerance in screen pixels converted using the zoom at stroke end; verify tests that the same pixel tolerance gives the same on-screen deviation at 30% and 200% zoom and that pressure-significant points survive
- [x] 4.3 Implement the touch gesture guard (wait in ms and px, cancel on a second finger, optional "finger does not draw after pen") and fix the early return in `handlePointerUp` while pinching so the tool never stays in the drawing state; verify tests for pinch start, deliberate single-finger stroke, finger-after-pen and recovery after a pinch
- [x] 4.4 Attach profile and preset identifiers to new strokes only when the lab plugin is active; verify tests with and without the plugin
- [x] 4.5 Document stabilizers, finalize modes and the touch guard, including the One Euro tuning procedure; verify the docs build

## 5. SDK: stroke look and renderer

- [x] 5.1 Add the optional per-stroke `look` (outline, curve, widthRule, ends, zoomAware, version) to the stroke node types and read it in rendering; absent means the unchanged legacy path; verify the existing `stroke.test.ts` suite passes untouched and a test that a document without `look` renders the same draw calls as before
- [x] 5.2 Implement the round outline (discs at points plus segment quads, one shared winding, one nonzero fill) including dashed strokes; verify geometry tests for no spike at a reversal, a round sharp point with width equal to the stroke width, and widths never exceeding the wider neighbour
- [x] 5.3 Implement uniform translucent drawing (ends and overlaps in the same fill); verify a test rendering a 50% opacity stroke with node-canvas and checking constant alpha at both ends and at self-crossings, and for dashes
- [x] 5.4 Implement the centripetal curve option for position and width and the zoom-aware spacing and subdivision in screen pixels; verify tests for close-then-far points staying within an envelope and no facets longer than one screen pixel at 200% zoom
- [x] 5.5 Implement the configurable width rule (min and max fractions, response curve, start and end taper) versioned inside the look; verify tests for constant pressure, tapered ends, and that no look keeps the legacy half-width behaviour for mouse strokes
- [ ] 5.6 Implement the optional perfect-freehand style outline after confirming the licence allows vendoring or reimplementation; verify the licence note in the PR and tests that it renders without errors and no spikes on the reversal case
- [x] 5.7 Implement the viewer-side look preview override (not persisted, not synchronised); verify tests that turning it on and off changes drawing only and never changes serialized nodes
- [x] 5.8 Document the look, outline modes and preview in `docs/src/modules/sdk/pages/api-reference/nodes/stroke.adoc` and update the `AGENTS.md` ledger; verify the docs build

## 6. SDK: lab plugin

- [x] 6.1 Add the separate entry point (`src/index.lab.ts`, tsdown entry, `exports["./lab"]` in `package.json`) and verify the default bundle contains no lab code (inspect `dist` or the visualizer stats) and the entry builds with types
- [x] 6.2 Implement `WeaveBrushLabPlugin` on its own Konva layer with enable/disable, the device report (pointer type, resolved profile, sample rate, samples per event, pressure range, tilt, predicted availability, zoom, fps) and the pen-as-mouse warning; verify unit tests with simulated events including the warning case
- [x] 6.3 Implement the independently switchable overlays (raw samples, stabilized path, final points, pressure graph) without touching the document; verify tests that toggling overlays adds no document node and draws one marker per reported sample
- [x] 6.4 Implement per-stroke metrics (samples, points, dropped duplicates, effective rate, jitter, lag, moved on finish, width roughness, draw time) emitted as an event and kept in memory; verify tests on synthetic gestures with known expected values
- [x] 6.5 Implement in-memory ghost replay of the last N strokes (default 5) through other presets on the lab layer, labelled by preset and never added to the document; verify tests that ghosts do not change the document, are cleared on request, and the oldest samples are discarded beyond N
- [x] 6.6 Add a test that the plugin makes no network request and writes nothing to the document, browser storage or files (spy on `fetch`, `localStorage`, Yjs transactions); verify it passes
- [x] 6.7 Add the lab plugin documentation page and nav entry; verify the docs build

## 7. SDK: release readiness

- [x] 7.1 Add the `code/CHANGELOG.md` entry under `[Unreleased]` in the matching subsection using the exact issue title: `- [#1254](https://github.com/InditexTech/weavejs/issues/1254) Wacom handwriting produces uneven, angular strokes`; verify the format matches neighbouring entries
- [x] 7.2 Run `npm run lint`, `npm run test` and `npm run build` in `code/packages/sdk`; verify all pass and coverage for the new code is reported
- [ ] 7.3 Publish a snapshot (`publish:snapshot --tag next`) for the deployed Showcase; verify the snapshot version installs in the frontend

## 8. Frontend: Brush Lab in the Showcase (`/Users/jesusmpc/inditex/weavejs-frontend/code`)

- [x] 8.1 Add the `VITE_BRUSH_LAB` flag (build time), the `?lab=brush` search parameter and a store flag, plus an "Extra" menu entry beside "Connection testing" in `components/room/room.header.tsx`; verify the entry is absent when the flag is off and present when on
- [x] 8.2 Register the lab plugin in `components/utils/weave/plugins.ts` and restore the saved configuration into the brush tool with `importConfig` once the room is ready (instead of constructor config, so the look is restored too) only when the lab is on; verify with the flag off that the Weave instance is identical to today's
- [x] 8.3 Build the panel overlay from the descriptor list using the existing UI kit (Tabs per profile, Look, Compare, Device; Slider, Switch, Collapsible; Basic and Advanced groups; touch-sized controls; collapsible), following `connection-tests-overlay.tsx`; verify each descriptor renders a control and changes call the SDK setters without reload
- [x] 8.4 Implement scenario and preset selection, forced profile, ghost toggles, look preview toggle, "Copy config" and "Import config" (JSON), and persistence of configuration only in `localStorage`; verify a reload restores configuration and that no recorded samples are ever stored
- [x] 8.5 Guard the Chrome-only `performance.memory` read in `components/room-components/toolbars/memory.toolbar.tsx`; verify no console error on Safari or with the property absent
- [x] 8.6 Keep `maximum-scale=1, user-scalable=no` on room routes when the coming-soon flag is on (`src/routes/__root.tsx`); verify with the flag on that a two-finger pinch zooms the canvas, not the page
- [ ] 8.7 Add unit tests (vitest, jsdom) for the flag logic and panel control generation; verify `npx vitest run`, `npm run lint` and `npm run build` pass
- [ ] 8.8 Add a short testers' guide (login, iPad in landscape, preview key if the coming-soon gate is on, how to switch scenarios, what to paste into #1254); verify a colleague can follow it end to end

## 9. Backend and hardware validation

- [ ] 9.1 Confirm no backend code is needed: with the snapshot SDK in the frontend, open a lab room, draw with a look, reload and verify the stroke persists and renders the same; record the result
- [ ] 9.2 At release time, bump `@inditextech/weave-*` in `/Users/jesusmpc/inditex/weavejs-backend/code/package.json`, rebuild, and verify a page export of a stroke with a look matches the on-screen rendering (use a snapshot build, since dev export workers may bypass the local alias)
- [ ] 9.3 Run the hardware rounds (Wacom on Windows with Windows Ink on and off, Wacom on macOS, iPad with Apple Pencil, iPad with finger, mouse, trackpad) with the overlays on, covering the cursive-loops, "n"/"v" reversals, translucent stroke and zoom 30% / 100% / 200% cases; verify the exported configuration JSON and device report for each are attached to issue #1254
- [ ] 9.4 Re-check on iPad Safari and Wacom that coalesced positions land on the pen path (overlay raw dots vs stroke) and record the cause of the earlier geometry problem in the design notes; verify the finding is written down
- [ ] 9.5 Obtain the reporter's environment and an Illustrator reference (settings, SVG as drawn and after Outline Stroke), compare against scenario F, and record the differences; verify the comparison is attached to the issue
- [ ] 9.6 Request the legal review for speed-adaptive smoothing before any such mode becomes a default; verify a written answer is on record
