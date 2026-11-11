## Why

In a rich-text WeaveTextV2 node, pressing Enter in a list item creates a block with no runs, so the new item loses the previous item's marks. Its marker and empty line render at the node base size until text is typed, causing a visual jump (GitHub issue #1245, reported from weavejs-frontend#219).

## What Changes

- Add an optional block-level `m` (marks) field, meaningful only while a block has no runs.
- Enter (block split) writes the inherited marks, minus `link`, onto the new empty block.
- Marks of an empty block are read for caret marks, toolbar state and `setMark`/size commands.
- Layout uses block `m` for the list marker (font, size, color) and for empty-line height and baseline; the layout cache key includes it.
- `m` is cleared once the block receives text, and when Enter on an empty item exits the list. It is kept on outdent.
- Persisted blocks carry `m` so remote clients render identically; older clients ignore it.
- Add a Fixed entry in `code/CHANGELOG.md`.

## Capabilities

### New Capabilities

### Modified Capabilities
- `text-v2/model`: empty blocks may carry marks; split and mark reads/writes honor them.
- `text-v2/layout`: marker and empty-line metrics use the empty block marks.
- `text-v2/editing`: Enter, outdent and list exit rules for empty-block marks.

## Impact

- `code/packages/sdk/src/nodes/text-v2/model.ts`, `layout/engine.ts`, `edit/model.ts`.
- Persisted block shape gains an optional field; frontend (weavejs-frontend) must tolerate it.
- Tests for split, layout, marker and sync round-trip; `code/CHANGELOG.md`.
