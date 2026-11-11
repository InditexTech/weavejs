## 1. Spikes

- [x] 1.1 Verify `WeaveTextV2Shape` paints in the node backend export path and supports `height(undefined)`, `clone`, `getClientRect` like `Konva.Text`
- [x] 1.2 Audit label-related events and public exports of the label editor

## 2. Seam

- [x] 2.1 Define `ShapeLabelEngine` and `LabelNode` interfaces in `shape-label.types.ts`
- [x] 2.2 Make `WeaveShapeLabelEditor` implement the interface with no behavior change
- [x] 2.3 Type `shape-label.utils.ts` helpers against `LabelNode`
- [x] 2.4 Confirm existing `shape-label-editor.test.ts` and `shape-label.utils.test.ts` pass unmodified

## 3. Native engine

- [x] 3.1 Implement `WeaveShapeLabelNativeEditor` render/update using `WeaveTextV2Shape` with `labelId(id)` and `label*` props
- [x] 3.2 Build the `TextEditTarget` (blocks from `labelText`, content offset, transform, `setBlocks` with grow callback)
- [x] 3.3 Wire `TextEditSession` host: mutex `'label-edit'`, stage mode, selection plugin disable, Escape/outside exit, re-select on exit
- [x] 3.4 Implement bounded grow/shrink convergence loop with original-height floor
- [x] 3.5 Commit writes `labelText` plain mirror; `repositionTextArea` tracks bounds

## 3b. Rich text

- [x] 3.6 Enable rich text in the native session
- [x] 3.7 Persist optional `labelBlocks` (schema, state spread, clear on absent) and render only when it matches `labelText`

- [x] 3.8 Emit enter, format-change and exit events from the native engine, typed and documented

## 4. Wiring

- [x] 4.1 Add optional engine config (default `legacy`) to rectangle, ellipse, polygon and select the engine in each
- [x] 4.2 Export new types additively

## 5. Tests

- [x] 5.1 Shared contract test run against both engines
- [x] 5.2 Native suite: no DOM overlay, rotation, vertical align, growth/shrink, commit, mixed-engine `labelText`
- [ ] 5.3 Server-side export test for both engines

## 6. Docs

- [x] 6.1 Document the engine option on rectangle, ellipse and polygon pages
