## Why

`WeaveTextNode` edits text through a DOM `<textarea>` overlay that must mimic the canvas text in CSS (`mimicTextNode`, `textAreaDomResize`, the `user-select` hack). This has caused repeated misalignment and selection bugs (#1099, #1134, #1125). Drawing the editing natively on the canvas makes idle and editing appearance identical and is the foundation for rich text (#1204). Tracked in #1224.

## What Changes

- Add a NEW class `WeaveTextV2Node` (in `nodes/text-v2/`) as a drop-in replacement for `WeaveTextNode`. It keeps `nodeType = 'text'`, so existing documents load unchanged. The old class and its overlay editor stay untouched; an app opts in by registering `WeaveTextV2Node` instead of `WeaveTextNode` (both cannot be registered together: handlers are keyed by node type).
- `text-v2` edits natively on canvas instead of the DOM textarea overlay: a hidden proxy textarea handles typing, IME and clipboard; caret and selection are painted on the `utilityLayer`.
- `text-v2` is a `Konva.Shape` subclass with Konva.Text-compatible facade getters.
- Canonical `text-v2` node model `blocks[] -> runs[{t, m}]`; `text` stays as a derived mirror; missing `blocks` is synthesized lazily from `text` (no document rewrite). A legacy `text`-shaped payload (`text`, whole-text `link`) loaded into `text-v2` is synthesized lazily; whole-text `link` becomes a full-range `link` mark; existing marks render read-only and are preserved on edit.
- New layout engine: `measureText` per chunk with `(font, chunk)` cache, greedy wrap, LTR only, `Intl.Segmenter`, multi-run capable, lazy cached `ensureLayout()`, per-paragraph incremental relayout, paint-time line culling. All four layouts (`smart`, `auto-all`, `auto-height`, `fixed`) preserved.
- Session-local undo/redo with coalescing; native textarea undo blocked; exit commits one `updateNode` (skipped if unchanged).
- Plain-text paste as one command; layout time-sliced for bulk content.
- New `onTextSizeWarning` event past a configurable threshold; no hard size cap.
- Overlay code of the old `text` node is NOT removed here (separate future deprecation). `text-v2` keeps the `text-edit` mutex, `text-edition` stage mode, enter/exit events, `text-tool` create-then-edit, link and outline behavior.
- Not breaking for existing apps: the old class and its event types are unchanged. `WeaveTextV2Node` emits the same event names with its own payload types (payload = exported Shape type).
- Layout engine and `TextEditSession` take a bounds provider and a target, not `WeaveTextNode`, so shape labels can adopt them later.

## Capabilities

### New Capabilities
- `text-v2/model`: blocks/runs model, derived `text` mirror, lazy synthesis, link mark mapping, mark preservation.
- `text-v2/layout`: layout engine, wrap parity with Konva.Text, culling, size accessors, server-side measure/render, facade getters.
- `text-v2/editing`: proxy input, caret/selection painting, pointer/keyboard navigation, IME, clipboard, session undo, lifecycle, size warning.

### Modified Capabilities
<!-- none: no existing text specs -->

## Impact

- Code: new `code/packages/sdk/src/nodes/text-v2/*`; a text-v2 creation path (tool/action) alongside `text-tool`; server measure via existing backends. `nodes/text/*` unchanged.
- Public API: new `WeaveTextV2Node` and types, text-v2 edit-mode events; new `onTextSizeWarning` event and config.
- Docs: Antora text node pages (`docs/`), `AGENTS.md` ledger.
- Out of scope: rich formatting/lists, bidi, collab, HTML paste, global layout scheduler.
