## Context

`WeaveTextV2Node` (nodes/text-v2) stores `blocks[] -> runs[{t,m}]`. The layout engine carries `m` per segment but measures every run with one node-wide font; the painter sets `ctx.font` once, ignores `m`, and uses uniform `lineHeightPx`. `hasMarks()` has no callers. The edit session mirrors `model.getText()` into a proxy textarea and diffs input into `replaceRange`, which inherits marks from the char before the start. Resize multiplies the node `fontSize` (text-v2.ts transform handlers). Legacy node `link` forces fill/underline over the whole node.

## Goals / Non-Goals

**Goals:** rich marks and lists per the proposal; identical rendering on all clients; byte-identical plain docs.
**Non-Goals:** HTML paste, bidi, collab.

## Decisions

1. **Size as ratio of base `fontSize`.** Resize and base-size edits scale all runs for free. Px at the API, ratio rounded to 4 decimals, 1 omitted, base 0/NaN falls back to 1. `setBaseFontSize` is the explicit "scale all" command (event reason `base-size`). Alternative (absolute px plus rescale in transform) rejected: block rewrite per frame, drift.
2. **Markers are layout-only.** Not in `text`/offsets, so the textarea mirror and offsets stay valid. Gutter width is fixed per depth (indent step) so digit count does not change wrapping.
3. **Numbering outside paragraph signature.** A cheap prepass over blocks computes marker strings; paragraph cache sig adds `kind`, `depth`, base style and per-run fonts, not the number. Typing in one item relays out one paragraph.
4. **Per-line metrics.** Layout emits per-line height and baseline (max run ascent/descent). `LayoutLine` gains `height`, `baseline`; `y` becomes cumulative. `caretRect`, `moveVertical` and selection rects use these; caret height follows stored marks.
5. **Effective style** = node defaults overridden by marks. Bold/italic compose into the font style string. Marks win over node attrs.
6. **Lists render always; flag gates commands and key rules.** Model preserves `kind/depth/start`. Flag off: Enter copies `kind/depth`.
7. **Stored marks** live in the edit model, cleared on selection move, part of undo snapshots. `replaceRange` gets explicit insert marks plus block-start/empty-block fallbacks and carries block fields on split.
8. **Command surface.** Pure range ops in `model.ts`; session wraps them as single undo entries; the node exposes the API and, with no session, applies via `updateNode`. Selection events throttled.
9. **Export.** Image export uses the same painter; PDF is raster (spike), so no PDF work. Server measurer must register per-run families.
10. **Indent config.** Only `richText.indentStep` is configurable (node config, multiple of base `fontSize`, default 1.5, invalid -> default). The text-width clamp is a fixed internal rule: 4 x base `fontSize`, not applied to auto-width layouts, indent 0 if the box is smaller. All clients must register the same `indentStep` or wrapping differs.
11. **Per-node enablement.** `richText` is a node attribute (serialized, in the schema); `isRich(node)` = attribute if boolean, else `config.richText.enabled`. Needed because a Weave instance has one handler per type (`text`), so a handler-wide flag cannot give a plain and a rich tool. `indentStep` stays handler-wide so wrapping never differs per node. Turning it off keeps marks and lists, which still render. `WeaveTextToolAction` gets optional `{ name, props }`.
12. **Per-run link.** `m.link` renders with `link.defaultColor` plus underline (hover colour on the hovered run only), unless the legacy node-level `link` is set, which wins as today. Hit testing maps a local point to a run via line and segment rectangles; hover and cursor update on `pointermove`, click reads the stage pointer. Only http(s) URLs (same rule as `isValidTextLink`) render as links and open, checked at write time, in the schema and at click time. Renders on all clients regardless of the flag; commands are gated by it.
13. **Paragraph align and line height.** `align` is a block field (not in the paragraph cache signature; applied per line after layout). `lineHeight` is a run mark, so a line's height is the max over its runs and lowering it next to a taller run has no visible effect (documented). Empty paragraphs have no runs and use the node line height. Vertical alignment stays node-wide: it uses `contentHeight`, which already follows real line heights. Node-level `align`/`lineHeight` are defaults and never clear overrides.
14. **Schema.** Extend `getSchema` for new mark/block fields.

## Risks / Trade-offs

- Painter/engine rework is the largest, riskiest slice -> golden tests against single-style parity first.
- Ratio conversions can surprise users when base changes -> documented; event reason.
- Fixed gutter may look wide for short markers -> acceptable, configurable `indentStep`.
- Missing fonts on server fall back silently -> test and docs.

## Migration Plan

Additive. Plain documents unchanged; no rewrite. Rollback: unset flag (rendering still shows marks/lists).

## Open Questions

- Per-run link follow-up issue to be filed.
