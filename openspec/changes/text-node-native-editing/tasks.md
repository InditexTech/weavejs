## 1. Spike closeout

- [x] 1.1 Measure skia-canvas vs node-canvas `measureText`/`letterSpacing`; record results
- [x] 1.2 Derive facade getter list from members used by `text.ts`, `text-tool`, tests
- [x] 1.3 Decide size-warning default (check Azure frame limit if possible)

## 2. Model

- [x] 2.1 Define blocks/runs/marks types and export
- [x] 2.2 Implement lazy synthesis from `text`, `text` mirror, link-to-mark mapping, mark preservation
- [x] 2.3 Unit tests (pure, no Konva)

## 3. Layout engine

- [x] 3.1 Measure cache, greedy wrap, `Intl.Segmenter`, multi-run support
- [x] 3.2 Lazy `ensureLayout()`, per-paragraph incremental relayout
- [x] 3.3 Four layouts: smart, auto-all, auto-height, fixed
- [x] 3.4 Golden parity tests vs `Konva.Text` (incl. CJK, emoji, long words) on both server backends
- [x] 3.5 Bounds provider / target abstraction (no `WeaveTextNode` import)

## 4. Read-only Shape node

- [x] 4.1 Shape subclass with `sceneFunc`, line culling, size accessors forcing layout
- [x] 4.2 Facade getters + compat test; export text Shape type
- [x] 4.3 Add `WeaveTextV2Node` with `nodeType = 'text'` (old class untouched; one registered per app); link/outline and transformer rules
- [x] 4.4 Add text-v2 tests; verify old `text` tests unchanged; verify selection, snapping, export, copy/paste, clone
- [x] 4.5 Server-side export renders text

## 5. Edit session

- [x] 5.1 Hidden proxy textarea (typing, IME), stop keydown propagation
- [x] 5.2 Caret and selection painting on `utilityLayer`, zoom/pan sync
- [x] 5.3 Click/drag/double/triple selection; arrows, home/end, up/down

## 6. Clipboard and undo

- [x] 6.1 Plain-text copy/cut/paste; bulk paste one command, time-sliced layout
- [x] 6.2 Session undo/redo with coalescing and selection restore; block native undo
- [x] 6.3 Single `updateNode` commit on exit, skipped if unchanged

## 7. Lifecycle and cleanup

- [x] 7.1 Wire `text-edit` mutex, `text-edition` mode, enter/exit events with new payload type
- [x] 7.2 `text-tool` create-then-edit works with `WeaveTextV2Node` (type-keyed lookups unchanged)
- [x] 7.3 Confirm text-v2 has no DOM mimic overlay (old `text` code intentionally kept)

## 8. Performance and safety

- [x] 8.1 `onTextSizeWarning` event + configurable threshold
- [x] 8.2 Benchmarks: 1k/10k/100k chars, typing latency, 5k-node load; add scheduler only if needed
- [ ] 8.3 Manual QA: IME, mobile, browsers

## 9. Docs

- [x] 9.1 Update Antora text node pages and AGENTS.md ledger
- [x] 9.2 Docs note: opt-in by registering `WeaveTextV2Node` instead of `WeaveTextNode`
