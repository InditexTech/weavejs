## 1. Model

- [x] 1.1 Add optional `m` to `WeaveTextBlock`; copy/strip it correctly in block helpers
- [x] 1.2 In `replaceRange`, set `m` (inherited marks minus `link`) on new empty blocks; drop `m` when a block gets runs
- [x] 1.3 `marksAtOffset` returns `m` for empty blocks; `setMark`/size range ops write `m` on empty blocks
- [x] 1.4 Verify persist/serialize/sanitize paths keep `m`

## 2. Layout

- [x] 2.1 Marker font/size/color from `runs[0]?.m ?? block.m` in `emitLines`
- [x] 2.2 Empty-line size, line height, baseline from `block.m` in `measureLines`
- [x] 2.3 Include `block.m` in the paragraph cache signature

## 3. Editing

- [x] 3.1 Edit session: Enter, typing into empty block and toolbar read the block marks
- [x] 3.2 Keep `m` on outdent/Backspace; clear on Enter-on-empty list exit

## 4. Tests and docs

- [x] 4.1 Tests: split, layout, marker, typing, outdent, exit, persistence round-trip
- [x] 4.2 Add Fixed entry to `code/CHANGELOG.md`: `- [#1245](https://github.com/InditexTech/weavejs/issues/1245) Rich text: new list item after Enter loses marks (size); marker and empty line render at base size`
- [x] 4.3 Check text-v2 docs pages for block shape and update if needed
