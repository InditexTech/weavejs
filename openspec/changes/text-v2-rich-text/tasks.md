## 1. Model (pure)

- [x] 1.1 Typed marks and block fields (`kind`, `depth`, `start`) in `model.ts`; size ratio helpers
- [x] 1.2 Range ops: apply/toggle mark, tri-state query, split block with fields, indent/outdent, toggle list
- [x] 1.3 `replaceRange` with explicit insert marks and block-field carrying; preserve fields when flag off
- [x] 1.4 Unit tests incl. byte-identical plain docs

## 2. Layout and painter

- [x] 2.1 Per-run font in engine measuring, paragraph sig update, per-line height/baseline
- [x] 2.2 Numbering prepass, marker and indent layout, fixed min-width clamp (4 x base fontSize)
- [x] 2.3 Painter: group by font, color, underline, strike, markers
- [x] 2.4 Update `geometry.ts` (caret, vertical move, selection) for per-line metrics
- [x] 2.5 Golden tests: single-style parity, mixed runs, lists

## 3. Editing session

- [x] 3.1 Stored marks in edit model and snapshots
- [x] 3.2 Ctrl/Cmd+B/I/U; format commands as one undo entry
- [x] 3.3 Enter/Backspace/Tab list rules; flag-off Enter copies kind/depth
- [x] 3.4 Plain paste inheriting marks; keep keydown stopPropagation

## 4. Node API and config

- [x] 4.1 `richText` config (`enabled`, `indentStep` default 1.5), types, defaults
- [x] 4.2 Commands (`applyMark`, `toggleMark`, `toggleList`, `indent`, `outdent`, `setBaseFontSize`) in session and on selected node
- [x] 4.3 `getSelectionFormat`; `onTextSelectionChange` / `onTextFormatChange` events
- [x] 4.4 Extend `getSchema`; export from `index.ts`

## 5. Integration

- [x] 5.1 Resize scales runs via base size; tests
- [x] 5.2 Copy/paste, duplicate, undo/redo, commit single step tests
- [x] 5.3 Image export and server-side (skia) per-run fonts
- [x] 5.4 Docs (main and sdk api-reference) and AGENTS.md ledger
- [x] 5.5 Fix class name in #1225 (`WeaveTextV2Node`) and note per-run link is included

## 7. Per-node enablement

- [x] 7.1 `richText` node attribute, `isRich`, schema; commands and session read it
- [x] 7.2 `WeaveTextToolAction` `{ name, props }`
- [x] 7.3 Tests, docs (text-v2 pages, text-tool pages) and AGENTS.md ledger

## 6. Per-run link

- [x] 6.1 Model: `isSafeLink`; link in selection format query
- [x] 6.2 Layout/painter: link colour and underline per run, hover run, node-level link wins
- [x] 6.3 Hit testing: point to link run; hover, cursor and click behaviour in the node
- [x] 6.4 API: `setRunLink`, `removeRunLink`, `applyMark('link')` validation
- [x] 6.5 Tests and docs
