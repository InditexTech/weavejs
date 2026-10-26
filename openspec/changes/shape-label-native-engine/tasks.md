## 1. Spikes

- [ ] 1.1 Verify `WeaveTextV2Shape` paints in the node backend export path and supports `height(undefined)`, `clone`, `getClientRect` like `Konva.Text`
- [ ] 1.2 Audit label-related events and public exports of the label editor

## 2. Seam

- [ ] 2.1 Define `ShapeLabelEngine` and `LabelNode` interfaces in `shape-label.types.ts`
- [ ] 2.2 Make `WeaveShapeLabelEditor` implement the interface with no behavior change
- [ ] 2.3 Type `shape-label.utils.ts` helpers against `LabelNode`
- [ ] 2.4 Confirm existing `shape-label-editor.test.ts` and `shape-label.utils.test.ts` pass unmodified

## 3. Native engine

- [ ] 3.1 Implement `WeaveShapeLabelNativeEditor` render/update using `WeaveTextV2Shape` with `labelId(id)` and `label*` props
- [ ] 3.2 Build the `TextEditTarget` (blocks from `labelText`, content offset, transform, `setBlocks` with grow callback)
- [ ] 3.3 Wire `TextEditSession` host: mutex `'label-edit'`, stage mode, selection plugin disable, Escape/outside exit, re-select on exit
- [ ] 3.4 Implement bounded grow/shrink convergence loop with original-height floor
- [ ] 3.5 Commit flattens blocks to `labelText`; `repositionTextArea` no-op

## 4. Wiring

- [ ] 4.1 Add optional engine config (default `legacy`) to rectangle, ellipse, polygon and select the engine in each
- [ ] 4.2 Export new types additively

## 5. Tests

- [ ] 5.1 Shared contract test run against both engines
- [ ] 5.2 Native suite: no DOM overlay, rotation, vertical align, growth/shrink, commit, mixed-engine `labelText`
- [ ] 5.3 Server-side export test for both engines

## 6. Docs

- [ ] 6.1 Document the engine option on rectangle, ellipse and polygon pages
