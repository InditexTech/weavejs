# Proposal

## Why

Issue #1254 reports that handwriting with a Wacom pen produces uneven, angular strokes with jumps in curves and thickness that does not follow pressure smoothly, compared with Illustrator on the same tablet. This follows #1000, #1040 and #1174 (Apple Pencil). Reproducing it against a running room showed the problem is structural and not tied to one device: the brush tool discards most of the pen's samples (241 samples at 200 Hz became 81 distinct positions), its pressure smoothing measures time inside synchronous batches, pen pressure 0 is read as 0.5, and the stroke renderer has no joins at sharp turns (spikes on "n", chopped points on "v") and double-blends round ends on translucent colours. Previous rounds fixed symptoms on one device and then regressed another, and there is no real-hardware data to decide what "good" is across mouse, finger, Apple Pencil and Wacom. We need a way to switch the new behaviour on and tune it on final hardware, with the old behaviour kept as the default until it is validated.

## What Changes

- Split the brush tool's input handling into configurable stages (capture, pressure, stabilizer, finalize) with per-device input profiles (`mouse`, `touch`, `pen.applePencil`, `pen.desktop`) resolved on each stroke's first event from `pointerType` and platform. The application can override the resolver, and profiles can be changed at runtime through new setters.
- Add the new capture and pressure behaviours as opt-in modes: every coalesced pen sample is kept with its own position and event timestamp, pressure 0 is preserved, a time-based or One Euro pressure filter, a position stabilizer (One Euro, pulled string, streamline), and a finalize step with a tolerance expressed in screen pixels (DP, DP with pressure, Bézier fit).
- Add a per-stroke "look" (outline style, curve type, width rule, ends, zoom-aware detail) read by `WeaveStrokeNode`. A new outline mode joins segments with discs so turns and ends are round, draws ends in the same fill so translucent colours stay uniform, and an optional centripetal curve avoids overshoot. Strokes without a look keep today's rendering.
- Publish all tunable settings as plain data (name, group, stage, range, default, help) together with factory presets and named scenarios (A legacy to F Illustrator-like), so any UI can render controls for them.
- Add an opt-in `WeaveBrushLabPlugin`, shipped as a separate entry point so production bundles do not include it. It reports the detected device and its capabilities, draws raw/smoothed/final overlays on its own Konva layer, computes per-stroke metrics, and replays the last few strokes in memory through other presets as temporary ghost strokes. Nothing is persisted or uploaded: ghosts and metrics live in memory and disappear on reload.
- Showcase frontend (`weavejs-frontend`): a dev-only Brush Lab panel generated from the settings list, enabled by build flag `VITE_BRUSH_LAB`, `?lab=brush` or an "Extra" menu entry; wiring of the plugin and saved settings (browser `localStorage`, configuration only) into the brush tool and stroke node; fixes needed to test on Safari/iPad (memory meter, viewport scaling).
- No backend code change. When the per-stroke look ships, `weavejs-backend` bumps its pinned `@inditextech/weave-*` version so exports draw strokes the same way.
- The default behaviour is unchanged by this change: scenario A reproduces today's output point for point. Promoting a validated preset to the default for each device is a follow-up once hardware results exist.

## Capabilities

### New Capabilities
- `brush-tool/input-profiles`: how the brush tool resolves a device profile for each stroke and how capture, pressure, stabilizer and finalize behaviour is configured and changed at runtime, including the legacy-equivalent profile.
- `brush-tool/tunables`: the published, data-only description of tunable settings, factory presets and scenarios that UIs consume.
- `stroke-node/rendering`: how `WeaveStrokeNode` turns recorded points and an optional per-stroke look into a ribbon (outline modes, round joins and ends, uniform translucent colour, curve options, zoom-aware detail, legacy fallback).
- `brush-lab/plugin`: the opt-in plugin that detects devices, shows overlays and metrics, and replays strokes in memory as ghosts without persisting anything.

### Modified Capabilities
- `brush-tool/pressure-sampling`: pressure handling becomes configurable per profile (zero pressure, filter, first/last-point policy). The existing requirements keep holding for the legacy profile and stay the default.

## Impact

- **SDK** (`code/packages/sdk`): `actions/brush-tool/*` (stages, profiles, setters, new config types), `nodes/stroke/*` (look, outline modes, curve options), a new `lab` entry point and plugin, new unit and geometry tests, docs pages for the brush tool, stroke node and lab plugin, `code/CHANGELOG.md` entry for #1254, `package.json` exports.
- **Frontend** (`/Users/jesusmpc/inditex/weavejs-frontend/code`): `components/utils/weave/actions.ts`, `nodes.ts`, `plugins.ts`, the room header menu and store, a new overlay panel, `memory.toolbar.tsx`, `src/routes/__root.tsx` viewport handling.
- **Backend** (`/Users/jesusmpc/inditex/weavejs-backend/code`): no code change; version bump of `@inditextech/weave-*` at release.
- **Data format**: persisted strokes keep `{x, y, pressure}` points. One optional per-stroke look field is added; its absence means legacy rendering, so existing rooms are unaffected.
- **Risks**: the earlier decision not to use coalesced positions ("broke stroke geometry", cause unrecorded) must be re-verified on iPad and Wacom; roughly three times more points and the new outline's draw cost; Bézier fitting can shift a stroke when the pen lifts; a patent covers speed-adaptive path smoothing (US 9,411,796) and needs a legal check before such smoothing becomes a default.
