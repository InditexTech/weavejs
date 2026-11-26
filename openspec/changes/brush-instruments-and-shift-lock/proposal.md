# Proposal

## Why

The brush tool has a single look. Collaborative canvases expect pens with distinct character (pencil, marker, highlighter, brush, fountain pen), and a Shift key lock to straight lines at 8 headings. The stroke look, input profiles and Brush Lab already provide most of the machinery. Tracks InditexTech/weavejs#1312.

## What Changes

- Add named **instruments**: bundles of stroke look, node props and input-profile changes, applied with `brushTool.setInstrument(id)`. The selection is sticky: `getInstrument()` reports it, and a later `setLook`/`setInputProfile` marks it `custom`. Instruments: pencil, pen, fineliner, marker, highlighter, brush, fountain pen.
- Add optional look fields, all additive with `look.version` staying 1: `ends` (`round` | `flat`), `variance` (0-1, seeded from the stroke id), `width.easing`, `width.nibAngle`, `width.nibContrast`.
- Add optional `pressure.synth: 'velocity'` for devices that report no pressure; speed-derived pressure is baked into the stored points at capture.
- Add a Shift lock to 8 headings for mouse input, applied before the stabilizer, **off by default** and enabled through brush config or by an instrument.
- Add Brush Lab descriptors and validation for every new field.
- Export/import of the brush config carries an optional `instrument` field; document version stays 1.
- Non-breaking: with no instrument set and the lock off, behaviour, profiles, looks and rendering of existing documents are unchanged. A viewer on an older release draws a new look as a plain round stroke.

## Capabilities

### New Capabilities
- `brush-tool/instruments`: named pen presets, `setInstrument`/`getInstrument`, sticky selection, `custom` marking, config export/import.
- `brush-tool/shift-lock`: Shift key lock of mouse strokes to the nearest of 8 headings.

### Modified Capabilities
- `stroke-node/rendering`: new look fields (`ends`, `variance`, `width.easing`, nib width) and their deterministic rendering.
- `brush-tool/pressure-sampling`: velocity-synthesised pressure for devices without pressure.
- `brush-tool/tunables`: descriptors and validation for every new look and profile field.

## Impact

- `code/packages/sdk/src/nodes/stroke/` (types, constants, `render/look.ts`, `render/round-outline.ts`, `stroke.ts`).
- `code/packages/sdk/src/actions/brush-tool/` (`brush-tool.ts`, `types.ts`, `stages/pressure.ts`, `tunables/{presets,descriptors,validate,config-io}.ts`, a new heading-lock module).
- `code/packages/sdk/src/plugins/brush-lab/` consumes the new descriptors.
- Docs: SDK API reference and build pages for brush tool, stroke node, brush tuning; ledger rows in `AGENTS.md`.
- Downstream: weavejs-frontend#237, weavejs-backend#193.
