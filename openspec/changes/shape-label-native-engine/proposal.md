# Proposal

## Why

The shape label editor (`nodes/shared/shape-label-editor.ts`, used by rectangle, ellipse and polygon) is a second copy of the old text node's DOM textarea overlay. It carries the same overlay-vs-canvas misalignment class of bugs and the `enableStageTextSelection` user-select hack. The native-canvas text engine (`WeaveTextV2Shape` + `TextEditSession`) landed in #1231 and #1234, so labels can now use it. Existing apps must not be forced to migrate.

## What Changes

- Introduce a `ShapeLabelEngine` interface covering the calls shapes already make: `renderLabel`, `updateLabel`, `triggerEditMode`, `exitEditMode`, `isEditing`, `repositionTextArea`.
- Keep the current `WeaveShapeLabelEditor` as the **legacy** engine, behavior unchanged, and the **default**.
- Add a **native** engine: label rendered as `WeaveTextV2Shape`, edited via `TextEditSession`, no DOM overlay, rotation and vertical alignment from the session target, live shape growth through `setBlocks`/`onChange` with a bounded convergence loop.
- Add an optional per-node-type config on rectangle, ellipse and polygon to select the engine (`legacy` default, `native` opt-in).
- Make `shape-label.utils.ts` min-size helpers work against a shared label-node interface instead of `Konva.Text` only.
- No persisted schema change: both engines read/write `labelText` and the `label*` props. Native flattens to plain text on commit.
- No **BREAKING** changes. Legacy removal is deferred to a separate deprecation change.

## Capabilities

### New Capabilities
- `shape-label/engine`: engine selection, shared lifecycle contract (mutex, stage mode, selection plugin, commit/exit), and native-engine editing and rendering behavior for shape labels.

### Modified Capabilities

## Impact

- Code: `code/packages/sdk/src/nodes/shared/shape-label-editor.ts`, `shape-label.utils.ts`, `shape-label.constants.ts`, `shape-label.types.ts`; `nodes/rectangle`, `nodes/ellipse`, `nodes/polygon` (config + engine wiring); new native engine file(s).
- Tests: existing `shape-label-editor.test.ts` and `shape-label.utils.test.ts` must pass unmodified on legacy; new native suite and shared contract test.
- Public API: additive config option and exported interface only.
- Docs: node pages for rectangle, ellipse, polygon (config option).
- Server-side export: labels must render in both engines (to verify for `WeaveTextV2Shape` in the node backend).
