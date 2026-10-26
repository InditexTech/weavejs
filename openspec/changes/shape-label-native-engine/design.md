## Context

`WeaveShapeLabelEditor` is reached by rectangle, ellipse and polygon through a lazy getter and six calls. It uses `Konva.Text`, a DOM textarea with CSS rotation, a pan listener, a user-select hack and `runLiveResizeLoop` (max 5 passes plus a final corrective grow). `TextEditSession` (#1231) takes a `TextEditTarget` (blocks, layout, absolute transform incl. rotation, content offset, size, `setBlocks`) and a `TextEditHost` (`onChange`, `onRequestExit`, caret/outline options). `WeaveTextV2Shape` has a Konva.Text-compatible facade.

## Goals / Non-Goals

**Goals:**
- Opt-in native label engine without any behavior change by default.
- Reuse text-v2 layout and session unchanged.

**Non-Goals:**
- Schema changes, `labelBlocks`, rich-text toolbar for labels, shape geometry changes, removing legacy.

## Decisions

1. **Strategy seam.** Extract `ShapeLabelEngine` from the existing public methods; `WeaveShapeLabelEditor` implements it untouched (legacy). New `WeaveShapeLabelNativeEditor` implements it. Alternative (subclass or flag inside one class) rejected: mixes two lifecycles in 756 lines.
2. **Selection by node config**, default `legacy`. Mirrors node-level config used elsewhere (`config.transform`). Alternative persisted `labelEngine` prop rejected: schema leak and migration.
3. **Plain-text persistence.** Native wraps `labelText` in blocks for the session and flattens back on commit. Rich labels are a follow-up adding an additive field.
4. **Native target.** `getContentOffset` supplies padding and vertical align; `getAbsoluteTransform` supplies rotation; `setBlocks` re-lays out and calls `growCallback`. The convergence loop re-measures layout synchronously (grow -> re-layout -> compare), MAX 5 passes plus final corrective grow, same as legacy.
5. **Label node typing.** `shape-label.utils.ts` depends on a minimal `LabelNode` interface (text, height, clone, getClientRect) satisfied by both `Konva.Text` and `WeaveTextV2Shape`.
6. **Hide during edit.** Native hides the label node while a session runs unless the session paints content itself; verify against text-v2 behavior.
7. **`repositionTextArea`** is a no-op in native (overlay is on-canvas).

## Risks / Trade-offs

- `WeaveTextV2Shape` facade may differ from `Konva.Text` on `height(undefined)` auto-height, `clone`, `getClientRect` -> contract test run on both engines.
- Minor visual differences between engines on wrapping -> parity tests on plain text.
- Node backend painting of `WeaveTextV2Shape` unverified -> spike first (`shape.ts` export path).
- Two engines to maintain until deprecation.

## Migration Plan

None required; default unchanged. Deprecation of legacy is a later change.

## Open Questions

- Config property name and location (`label: { engine }` per node config).
- Do label edit events exist beyond mutex/stage mode? Audit before wiring.
