# Design

## Context

See proposal.md for motivation. Current state in `code/packages/sdk/src/nodes/text-v2`:

- `WeaveTextBlock` already has `depth`; `blockFields` copies it on block split and the clipboard parser already round-trips it (`depth > 0`, without requiring `kind`).
- `indentBlocks` (`model.ts`) only changes blocks with `kind`; `outdentBlocks` returns plain blocks untouched.
- `indentFor` (`layout/engine.ts`) returns 0 when `!block.kind`; for lists it returns `(depth + 1) * indentStep * fontSize`, clamped. The paragraph layout cache signature already includes `indent`, and markers are only produced for list blocks, so plain blocks with an indent draw no marker.
- Tab / Shift+Tab already route to `session.indent()` / `outdent()` (`edit/session.ts`), and the public node API already has range-aware `indent` / `outdent`.
- `backspaceInList` (`edit/model.ts`) only handles list items.

## Goals / Non-Goals

**Goals:**
- Reuse the existing `depth` field and `indentStep` config so no schema, config or wire-format change is needed.
- Keep list behavior byte-for-byte unchanged.

**Non-Goals:**
- No new block field, no tab-character insertion, no depth cap beyond the existing layout clamp.
- No change to `toggleList` / `stripList`.

## Decisions

**1. Reuse `depth` on plain blocks (vs. a new `indent` field).** Split, clipboard, normalize, serialization and collab already carry `depth`. A new field would need wiring in all of those and a second concept to keep coherent. Cost: `depth` means "marker level" for lists and "indent level" for plain paragraphs; the block's `kind` disambiguates.

**2. Plain indent = `depth * step`, list indent unchanged = `(depth + 1) * step`.** A list at depth `d` has its text where a plain paragraph at depth `d + 1` has it, so text aligns across both. Implemented by changing `indentFor`: plain blocks return the clamped `depth * step`; the existing list branch is untouched. Depth 0 returns 0 so existing documents lay out identically.

**3. `indentBlocks` raises depth for all blocks; `outdentBlocks` lowers plain blocks and keeps list logic.** Plain at depth 0 is a no-op (and removes the property when reaching 0 so serialization matches pre-change documents). `stripList` is not modified, so toggling a list off still drops `depth` (decision confirmed with the user: list behavior is out of scope).

**4. Backspace outdent lives next to `backspaceInList`.** Generalize the check in `edit/model.ts` / `edit/session.ts` into "backspace at block start": list item -> existing behavior; plain block with `depth > 0` -> outdent by one; otherwise return false so the normal delete/merge runs. Only with a collapsed selection at the exact start of the block.

**5. `getSelectionFormat.indent` is a separate field.** Shaped like `align` (`state` + optional `depth`), computed only over plain blocks, so toolbars can bind indent buttons without parsing `list`. `list` stays computed over all blocks as today (unchanged).

**6. Layout independent of `richText.enabled`.** `indentFor` does not look at the flag, matching how lists render. Commands stay gated by `isRich`.

## Risks / Trade-offs

- [Older clients ignore `depth` on plain blocks and render flush left] -> graceful degradation, consistent with the existing "`indentStep` must match across clients" rule; note in docs.
- [Same field, two meanings] -> documented in the model spec and docs; `kind` decides.
- [Toggling a list on an indented paragraph shifts its text by one step because list indent is `(d+1) * step`] -> accepted; consistent with list semantics.
- [Existing spec text states list indent as `depth * indentStep` while code uses `(depth + 1)`] -> not touched here (out of scope); worth a separate cleanup.

## Migration Plan

No data migration: documents without `depth` on plain blocks render as before. Rollback is code-only; stored `depth` on plain blocks becomes inert.
