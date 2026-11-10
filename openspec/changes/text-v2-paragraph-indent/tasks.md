## 1. Model

- [x] 1.1 `model.ts`: make `indentBlocks` increase `depth` for plain blocks too (lists unchanged)
- [x] 1.2 `model.ts`: make `outdentBlocks` decrease `depth` of plain blocks, no-op at 0, drop the property at 0 (lists unchanged); leave `stripList` as is
- [x] 1.3 `model.ts`: add `indent: { state; depth? }` to `WeaveTextSelectionFormat` and compute it over plain blocks in `getSelectionFormat`
- [x] 1.4 Confirm `blockFields` / split / clipboard keep `depth` on plain blocks; add tests only (no code change expected)

## 2. Layout

- [x] 2.1 `layout/engine.ts`: in `indentFor` return the clamped `depth * step * fontSize` for plain blocks with `depth > 0`, keep 0 otherwise and keep the list branch untouched
- [x] 2.2 Verify no marker is produced, wrapped lines use `maxWidth - indent`, alignment uses the indent, and the paragraph cache invalidates when `depth` changes
- [x] 2.3 Verify rendering does not depend on `richText.enabled` (browser and server paths)

## 3. Editing

- [x] 3.1 `edit/model.ts` / `edit/session.ts`: Backspace at block start with a collapsed selection outdents a plain paragraph with `depth > 0`; keep the list behavior; fall through to normal Backspace at depth 0
- [x] 3.2 Check Tab / Shift+Tab with a collapsed caret indent the whole paragraph without moving the caret offset, and that undo restores depth and selection
- [x] 3.3 Check Enter keeps `depth` on both halves, and an empty indented paragraph does not exit anything

## 4. Public API

- [x] 4.1 `text-v2.ts` / `types`: export the extended selection format type; confirm `indent` / `outdent` on a non-editing node (with and without range) work on plain paragraphs with one `updateNode`
- [x] 4.2 Confirm `onTextFormatChange` fires after indent / outdent of plain paragraphs

## 5. Tests

- [x] 5.1 `rich-model.test.ts`: indent / outdent on plain, list and mixed ranges; depth 0 removal; `stripList` unchanged; `getSelectionFormat.indent` states
- [x] 5.2 `rich-layout.test.ts`: plain indent offset, wrapping, clamp, alignment, no marker, richText disabled
- [x] 5.3 `rich-session.test.ts`: Tab / Shift+Tab / Backspace / Enter / undo on plain paragraphs
- [x] 5.4 `clipboard-blocks.test.ts`: copy / paste keeps paragraph depth
- [x] 5.5 `rich-api.test.ts`: node-level `indent` / `outdent` with and without range, disabled no-op
- [x] 5.6 Run the sdk test suite and type check

## 6. Docs and changelog

- [x] 6.1 Update `main:build/nodes/text-v2.adoc` and `sdk:api-reference/nodes/text-v2.adoc` (paragraph indent, `indent` in the selection format, Backspace, compatibility note) and the AGENTS.md documentation ledger
- [x] 6.2 Add to `code/CHANGELOG.md` under `[Unreleased]` > Added: `- [#1262](https://github.com/InditexTech/weavejs/issues/1262) Text indentation: apply to a single paragraph line, not only to bulleted lists`
