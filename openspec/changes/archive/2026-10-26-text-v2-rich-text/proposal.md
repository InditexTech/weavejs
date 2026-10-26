## Why

Designers build presentation boards where one text block needs mixed styling and lists. Today a text node has a single style, so a title plus bulleted list needs several hand-aligned nodes (issue #1204, implemented by #1225). #1224 delivered the blocks/runs model and native editing, which this builds on.

## What Changes

- Add opt-in rich text to `WeaveTextV2Node` via a per-node `richText` attribute (set by the creating tool), with `config.richText.enabled` as the default for nodes without it, plus `config.richText.indentStep`. `WeaveTextToolAction` accepts `{ name, props }` so an app can register a plain and a rich text tool. Target class is `WeaveTextV2Node` (the issue text says `WeaveTextNode`).
- Typed marks on runs: bold, italic, underline, strikethrough, color, font size (stored as a ratio of the node base `fontSize`), font family, link (per-run URL).
- List blocks `{kind, depth, start}` (bulleted/ordered, unbounded depth, marker cycling, continuous numbering). Lists render on every client regardless of the flag.
- Layout and painter: per-run font, mixed baselines and line heights, per-run decorations and colors, marker and indent gutter.
- Editing: stored marks at a collapsed caret, Ctrl/Cmd+B/I/U, Enter/Backspace/Tab list rules, one session-undo entry per format command.
- Public command API usable in an active session and on a selected non-editing node (whole text or a range): `applyMark`, `toggleMark`, `toggleList`, `indent`, `outdent`, `setBaseFontSize`, `getSelectionFormat` (tri-state), events `onTextSelectionChange` / `onTextFormatChange`. Sizes are px at the API.
- Formatting survives move, resize, copy, paste, duplicate, undo/redo and image export. PDF is raster (spike), so it follows image export.
- Plain-text paste inheriting caret marks. Docs.
- Paragraph alignment (`align` on a block, left/center/right) and per-selection line height (a `lineHeight` mark, multiplier of the run font size). A line is as tall as its tallest run. Both render on all clients; commands are gated by rich text. Vertical alignment stays a node setting.
- Per-run link: link colour and underline per run, hover and pointer cursor only over the run, Ctrl/Cmd+click (or click on a selected node) opens it, http(s) only; `applyMark('link')`, `setRunLink`, `removeRunLink`. The legacy node-level `link` is unchanged and wins when both exist.
- Non-goals: HTML paste, bidi, collab `Y.Text`, shape-label adoption, global layout scheduler.

## Capabilities

### New Capabilities
- `text-v2/rich-text-api`: commands, selection-format query, events and config flag.

### Modified Capabilities
- `text-v2/model`: typed marks, list block fields, range operations, size ratio, mark/list preservation.
- `text-v2/layout`: per-run fonts, baselines, list markers and numbering, painter decorations.
- `text-v2/editing`: stored marks, shortcuts, list key rules, format undo entries.

## Impact

- Code: `code/packages/sdk/src/nodes/text-v2/{model,shape,text-v2,types,constants}.ts`, `layout/engine.ts`, `edit/{model,session,geometry}.ts`; server-side font registration for per-run families.
- Public API and events of the SDK; new config. Existing documents stay byte-identical when no rich features are used.
- Docs under `docs/src/modules/`.
