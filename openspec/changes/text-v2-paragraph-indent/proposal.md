# Proposal

## Why

Indentation in `WeaveTextV2Node` only works on list items. A regular paragraph line cannot be indented: `indentBlocks` skips blocks without `kind`, and layout returns an indent of 0 for them. Users need to indent lines of a plain paragraph (GitHub issue #1262).

## What Changes

- Plain paragraph blocks (no `kind`) honor `depth`: they render with an indent of `depth * indentStep`, using the same `config.richText.indentStep` and the same width clamp as lists. No new config or block field.
- `indent` (Tab) raises `depth` by 1 on every block in the selection range, plain paragraphs included. List behavior is unchanged.
- `outdent` (Shift+Tab) lowers `depth` on plain paragraphs, and is a no-op at depth 0. List behavior (marker removed at depth 0) is unchanged.
- Backspace at the start of an indented plain paragraph with a collapsed selection outdents it by one level. At depth 0 it keeps its current behavior.
- Paragraph indent renders on all clients, independent of `richText.enabled`; commands remain no-ops when disabled.
- Indent persists across edits, Enter (block split already copies `depth`), copy/paste (clipboard already round-trips `depth`) and undo/redo.
- `getSelectionFormat` gains a separate `indent: { state: 'all' | 'none' | 'some'; depth?: number }` field describing plain paragraphs only. `list` is unchanged.
- Out of scope: list formatting (including `toggleList`, which still drops `depth` when turning a list off).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `text-v2/layout`: plain paragraphs with `depth > 0` are laid out with an indent; rendering is independent of `richText.enabled`.
- `text-v2/editing`: Tab / Shift+Tab and Backspace at block start act on indented plain paragraphs.
- `text-v2/model`: `depth` is meaningful on plain paragraphs; `indentBlocks` / `outdentBlocks` act on them.
- `text-v2/rich-text-api`: `indent` / `outdent` apply to plain paragraphs; `getSelectionFormat` exposes `indent`.

## Impact

- Code: `code/packages/sdk/src/nodes/text-v2/model.ts`, `layout/engine.ts`, `edit/model.ts`, `edit/session.ts`, `text-v2.ts` (public type of the selection format).
- Types: `WeaveTextSelectionFormat` gains `indent`; additive, non-breaking.
- Compatibility: older clients ignore `depth` on plain blocks and render them flush left (graceful degradation). `indentStep` must match across clients, as for lists.
- Tests: `rich-model`, `rich-layout`, `rich-session`, `clipboard-blocks`, `rich-api`.
- Docs: `main:build/nodes/text-v2.adoc`, `sdk:api-reference/nodes/text-v2.adoc`, and the AGENTS.md documentation ledger.
