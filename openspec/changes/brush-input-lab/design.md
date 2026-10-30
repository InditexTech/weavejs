# Design

## Context

See proposal.md for motivation and the specs for requirements. Current state, verified in the code and in a running room:

- `WeaveBrushToolAction` (`code/packages/sdk/src/actions/brush-tool/brush-tool.ts`) has a fixed pipeline. On `pointermove` it reads `getCoalescedEvents()` but keeps every sample at the event's already-resolved pointer position (a comment says per-sample repositioning with `setPointersPositions` "broke stroke geometry", cause unrecorded). Pressure smoothing is a velocity-adaptive EMA timed with `performance.now()`. `pressure || 0.5` turns 0 into 0.5. First and last points are overwritten with their neighbours' pressure. Finishing uses `simplify-js` with a fixed canvas-unit tolerance (`simplifyTolerance: 0.5`). `config` is `protected` and `interpolationSteps` is unused.
- `WeaveStrokeNode` (`nodes/stroke/stroke.ts`) resamples with a greedy min-distance filter, fits a uniform Catmull-Rom spline, builds a left/right offset polygon per dash run with no joins, and draws the round caps as separate circles after the fill. Its `config` is `private readonly`. Spacing and spline settings are in canvas units.
- Width is `strokeWidth * pressure / 2`, floored at 0.5. Mouse and finger always record pressure 0.5, so they draw at half the nominal width.
- `window.weave` is set by the SDK. The embedding apps create the Weave instance once (`weave-react` ignores later config), so anything tunable must be changeable at runtime. Frontend and backend alias the local SDK through `DEV_WEAVEJS_REPO_PATH`.
- The backend persists the whole Yjs document on every update and draws exports with its own pinned SDK (`@inditextech/weave-*` 5.7.1), registering `WeaveStrokeNode` with default config.
- The undo manager tracks only the `weave` map. `saveMetadata` replaces the whole `weaveMetadata` map.
- Evidence behind the design (live room, Chrome 156, 200 Hz synthetic pen): 241 samples became 81 distinct positions; the smoothing factor flipped between 0.15 and 0.6 at constant speed; retrace and sharp-turn artifacts reproduced with the real renderer; a disc-union prototype removed them.

## Goals / Non-Goals

**Goals:**
- Make capture, pressure, stabilizing, finishing and outline independently switchable, with per-device profiles chosen automatically per stroke.
- Keep today's behaviour as the default and make it provably identical (legacy preset).
- Keep the SDK headless: the UI is generated from published data and lives in the Showcase frontend.
- Make it possible to compare presets on identical gestures on real hardware without storing anything.

**Non-Goals:**
- No recording storage, upload, download or sharing of raw pen data, in rooms, files, browser storage or the backend.
- No backend code change, no standalone drawing-pad route, no UI inside the SDK.
- No change of the default behaviour, and no choice of the final per-device defaults. Those follow hardware results in a later change.
- No calligraphic nib driven by tilt, bearing or rotation; no per-point tilt storage.
- No Web Worker, offscreen or desynchronized-canvas ink layer for the in-progress stroke.

## Decisions

**1. Staged pipeline with one configuration object per profile.** The brush tool becomes four pure stages (capture, pressure, stabilizer, finalize) selected by a profile configuration. The legacy preset wires the existing logic unchanged and is covered by a golden test comparing recorded points against the current implementation on synthetic input. *Alternative:* patching the existing handlers behind flags. Rejected: interleaved flags make the legacy guarantee untestable and keep the batch-timing bug (B2) entangled.

**2. Profile resolved once per stroke at `pointerdown`.** Key is `pointerType` plus platform (iPad gives `pen.applePencil`, other platforms `pen.desktop`), with a `resolveProfile(info)` hook and a `forceProfile` option. `persistentDeviceId` is only used when present (Chrome 128+, Firefox 141+, not Safari). *Alternatives:* resolving per event (rejected: mixed processing inside one stroke); detecting Pencil vs Wacom by sample rate (rejected: fragile); one `pen` profile (kept as the fallback if hardware data shows no need to split).

**3. Capture mode "coalesced" computes positions from each sample's client coordinates.** The stage-to-container mapping is computed directly from `clientX/clientY` (stage content rect and the container's inverse absolute transform) instead of calling `setPointersPositions` per sample, which mutates shared stage state and is the suspected cause of the earlier geometry problem. The lab overlay draws raw samples so any remaining mismatch on iPad Safari (coalesced events since 18.2) or Wacom is visible at once. The change stays behind scenario B until verified. *Alternative:* re-enabling `setPointersPositions` per sample (rejected: already tried and reverted).

**4. Event time for all time-based filters.** Elapsed time uses each sample's `timeStamp`, which shares `performance.now()`'s origin in current browsers; filters fall back to a nominal rate if time does not advance. *Alternative:* keep `performance.now()` (rejected: it is the measured cause of the erratic smoothing factor).

**5. One Euro filter for position and pressure, tuned in the lab.** Two parameters (minimum cutoff, speed coefficient) with the published tuning procedure (beta 0 first, then raise beta). Pulled string and streamline are offered as alternatives. Distances are in screen pixels and optionally follow zoom. The stroke is completed at the pen's last position on release. Speed-adaptive smoothing is the subject of Adobe's US 9,411,796, so no such mode becomes a default before a legal review; the One Euro filter (2012) predates the filing. *Alternative:* only EMA (rejected: lag/jitter trade-off cannot be balanced).

**6. Finalize tolerance in screen pixels, converted with the zoom at stroke end.** Modes: none, DP by position, DP by position plus pressure (pressure scaled into distance units by a weight), and Bézier fit (Schneider's algorithm, resampled back to points). Points stay `{x, y, pressure}`, so the data format does not change; `fit-curve` (MIT) is a candidate implementation but a small in-repo implementation is preferred to avoid a dependency. *Alternative:* storing Béziers (rejected: format change).

**7. Per-stroke look persisted on the stroke.** An optional `look` object (outline, curve, widthRule, ends, zoomAware, version) is saved in the stroke's props and read by `WeaveStrokeNode`. Absent means legacy. A viewer on an older SDK ignores it and draws legacy. Persisting it, rather than keeping it client-local, keeps collaborators and server exports consistent. Look changes in the width rule are versioned inside `look`, so existing strokes keep today's rule. *Alternatives:* a global render configuration (rejected: collaborators and exports would disagree, and old strokes would change); storing the look on the document root (rejected: ties all strokes together).

**8. Round outline as a union of discs and segment quads filled once.** All sub-paths share one winding direction and are filled with a single nonzero fill, so overlaps and translucent colours stay uniform and joins are round by construction. Prototyped in the running app: it removed the spike on "n", the chopped "v" and the dark discs on translucent colours. The cost is more sub-paths; this is measured in the lab and a fallback (polygon on straight runs, discs only at sharp corners, as perfect-freehand does) is kept in reserve. The perfect-freehand style (MIT) is offered as outline `freehand`, implemented in-repo or vendored; a licence check is part of the tasks. *Alternative:* keeping the offset polygon and adding miter/round joins (rejected: swallowtail geometry on the inner side needs extra handling and still double-blends caps).

**9. Look preview is a viewer-side override, not data.** A static override on the stroke node (not persisted, not synchronised) lets the lab redraw all strokes under a candidate look for comparison.

**10. Tunables published as plain data.** The SDK exports a descriptor list (key, group, stage, kind capture/draw, type, default, range, unit, help), factory presets and scenarios A to F. The frontend generates controls from it; the SDK contains no UI. Validation of imported configuration uses the same descriptors. *Alternative:* hand-built controls per setting (rejected: dozens of settings and frequent change).

**11. Lab plugin as a separate entry point (`@inditextech/weave-sdk/lab`).** It follows the existing plugin pattern (`WeavePlugin`, own Konva layer like `users-pointers`) and talks to the brush tool through its public setters and events. It keeps the last N strokes' raw samples in memory only (default 5), computes metrics, draws overlays, and replays strokes through other presets as ghosts on its own layer. It never writes to the Yjs document, browser storage, files or network. Adding an `exports` entry in `package.json` and a tsdown entry keeps it out of the default bundle. *Alternative:* a flag inside the default entry (rejected: production bundles would carry lab code).

**12. Frontend wiring.** Build flag `VITE_BRUSH_LAB`, `?lab=brush` and a header "Extra" menu entry (same pattern as "Connection testing": store flag plus overlay). When on, the plugin is added in `plugins.ts`, saved configuration is passed to `new WeaveBrushToolAction({ config })` (`actions.ts:51`) and `new WeaveStrokeNode({ config })` (`nodes.ts:61`), and later changes go through setters without reload. Configuration (not recordings) is kept in `localStorage`; "Copy config" and "Import config" use the JSON export. The panel is an overlay card (Tabs, Slider, Switch, Collapsible from the existing UI kit) with a tab per profile, Look, Compare and Device. Also fixed for device testing: guard the Chrome-only `performance.memory` read, and keep `maximum-scale=1, user-scalable=no` on room routes when the coming-soon flag is on. Rooms only render at 1024 px or wider, so iPad testing is in landscape; testers need to log in and may need the preview key.

**13. Backend: no code.** The whole document is already persisted on every update. At release, `weavejs-backend` bumps `@inditextech/weave-*` so exports honour the look. For local export checks against an unreleased SDK a snapshot build is used, because the dev export workers start from raw `.ts` and may bypass the Vite alias.

**14. Touch gesture guard.** For `touch`, a stroke is committed after a configurable wait (ms and px) and cancelled if a second touch arrives. The existing pinch flag is cleared on touch end; `handlePointerUp` is made to leave a stroke in progress in a recoverable state (verify and fix the early return while pinching, which can leave the tool stuck in the drawing state).

## Risks / Trade-offs

- [Coalesced positions broke geometry before, cause unrecorded] → Computed directly from client coordinates; overlay shows raw samples; behind scenario B until verified on iPad Safari and Wacom; unit test with synthetic transformed stages.
- [About three times more points, higher draw cost, whole-layer redraw while drawing] → Lab metrics (draw time, fps); finish simplification keeps stored size down; a separate layer for the in-progress stroke is deferred and tracked.
- [Capsule outline slower on long strokes] → Measure in the lab; fallback of polygon on straight runs with discs at corners.
- [Bézier fit shifts a stroke when the pen lifts] → "moved on finish" metric; apply the same stabilizer while drawing.
- [Per-stroke look unseen by an older SDK or the backend until it is bumped] → Falls back to legacy rendering; backend bump is a release step; documented known limitation during the lab phase.
- [Width rule change would alter existing strokes] → Versioned inside the look; legacy rule remains when no look.
- [Device detection wrong (Pencil vs Wacom, Windows Ink off)] → Lab shows resolved profile and warnings; testers can force a profile; hook for the application.
- [Patent on speed-adaptive smoothing] → No such mode becomes a default before legal review.
- [Lab code or data reaching production] → Separate entry point; frontend build flag; no persistence by design; spec forbids storing or transmitting samples.
- [Handwriting dynamics are personal data] → Nothing is stored or transmitted; ghosts live in memory and vanish on reload.

## Migration Plan

1. Land the staged pipeline with the legacy preset and golden tests; no behaviour change, default unchanged.
2. Add modes and the lab plugin; publish an SDK snapshot (`publish:snapshot --tag next`).
3. Frontend: bump to the snapshot (or use `DEV_WEAVEJS_REPO_PATH` locally), enable `VITE_BRUSH_LAB` in the test environment only.
4. Run hardware rounds (Wacom on Windows and macOS, iPad with Pencil and with finger, mouse and trackpad) and collect configurations as JSON in the #1254 issue.
5. A follow-up change promotes the winning presets to per-device defaults, updates the backend SDK version and documentation.
Rollback: the default is the legacy preset, so disabling the flag or not registering the plugin restores current behaviour; strokes with a look still render correctly on any SDK version.

## Open Questions

- Reporter's setup: operating system, browser, Windows Ink state, and Illustrator brush settings (type, Size, Variation, Fidelity, zoom) for a like-for-like comparison.
- Whether to split `pen.applePencil` and `pen.desktop` further, or merge them, once hardware data exists.
- Whether `touch` should ignore finger input after a pen has been seen by default.
- Whether perfect-freehand style is implemented in-repo or vendored, subject to a licence check.

## Decisions made during implementation

- **Predicted samples are skipped when a stabilizer is on.** They moved the stabilizer's state and bent the real line after them.
- **The smoothing presets finish with a Bézier fit, resampled every 8 screen px** (mouse Stabilized, touch Smooth, pen Smooth and Illustrator-like). Simplifying by distance left straight, visible segments. The fit keeps about 50 points per stroke instead of 190 at a 2 px spacing.
- **The round outline merges nearly straight stretches into one polygon, with discs only at real bends and the ends**, and the centripetal curve takes only the steps its error tolerance needs. A disc and quad per point was 6-30x slower than the legacy ribbon when redrawing many strokes while zooming.
- **The lab records the pointer gesture itself** (window capture listeners) and replays it through a chosen brush to compare with what was drawn: positions only, with per-sample times and the end catch-up.

