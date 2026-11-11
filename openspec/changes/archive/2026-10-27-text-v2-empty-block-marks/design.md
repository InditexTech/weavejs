## Context

`replaceRange` builds the new block with `mk('')`, which returns `[]`, so inherited marks are dropped. `layout/engine.ts` reads `block.runs[0]?.m` for the marker and falls back to base style in `measureLines` when a line has no runs. `marksAtOffset` returns nothing for an empty block, so typing after Enter relies on session-only stored marks.

## Goals / Non-Goals

**Goals:** new item shows inherited size/marks immediately; same render on remote clients; toolbar reads and writes marks on an empty block.
**Non-Goals:** carrying `link`; changing marks of non-empty blocks; frontend changes.

## Decisions

- **Block-level `m` over a retained empty run.** `normalizeRuns` drops empty runs on purpose and many consumers index runs; an empty run would need auditing everywhere. `blockFields` already copies structure fields, so a block field fits.
- **`m` applies only when `runs` is empty.** Inserting text moves marks into runs and removes `m`; `normalizeBlock`-style cleanup strips `m` on non-empty blocks.
- **Carry excludes `link`**; uses `cleanMarks` for normalization.
- **Lifecycle:** kept on outdent/Backspace-at-start; cleared when Enter on an empty item exits the list.
- **Reads:** `marksAtOffset` returns `m` for empty blocks; `setMark`/size commands write it.
- **Layout:** marker uses `runs[0]?.m ?? block.m`; `measureLines` empty branch uses `block.m` size/lineHeight/family; paragraph cache signature includes `block.m`.

## Risks / Trade-offs

- Older clients ignore `m` and render base size (acceptable degradation).
- Persistence/sanitization allowlists may strip `m`; verify with a round-trip test.
- Stale `m` on non-empty blocks if some operation misses cleanup; mitigate by central normalization.
