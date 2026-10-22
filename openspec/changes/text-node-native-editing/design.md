## Context

`text.ts` (~1700 lines) extends `Konva.Text` and edits via a DOM textarea overlay kept aligned with CSS. Slice 0 spike (see #1224 comment) found: only `text.test.ts` asserts `instanceof Konva.Text`; only `text-tool` and the enter/exit events touch the node; SDK does not cull; server backends are node-canvas/skia-canvas with no font registration; large payloads are chunked on Azure; app-level undo is guarded only by the textarea's keydown `stopPropagation`. No in-repo consumer reads the enter/exit event payload.

Code location: `code/packages/sdk/src/nodes/text-v2/` (`model.ts`, `layout/engine.ts`, later node + session).

## Goals / Non-Goals

**Goals:** native editing, parity wrapping, multi-run-ready engine, reusable engine/session, document compatibility.
**Non-Goals:** rich formatting/lists, bidi, collab, HTML paste, global layout scheduler.

## Decisions

0. **New class `WeaveTextV2Node`, same `nodeType = 'text'`, old class left in place** (decided). Documents keep `type: 'text'` so nothing stops rendering; registering is a one-line swap per app. Handlers are keyed by node type, so only one of the two classes can be registered at a time. Avoids touching the 1.7k-line node and its tests. Legacy payloads use lazy synthesis; no document rewrite.
1. **Base class `Konva.Shape`** (decided) with Text-compatible facade getters; no casting to `Konva.Text`. text-v2 has its own enter/exit events with payload `{ node: <TextV2Shape> }`, type exported publicly. Rationale: full control of `sceneFunc` and layout; audit shows low coupling. Alternative (extend `Konva.Text`) rejected: can't do multi-run.
2. **Model:** `blocks -> runs[{t,m}]` canonical, `text` mirror, lazy synthesis, no rewrite on load.
3. **Layout engine** is pure and independent: input = blocks + bounds provider + font config; output = lines/positions. `measureText` cache keyed `(font, chunk)`; greedy wrap; `Intl.Segmenter`; per-paragraph invalidation.
4. **Edit session** takes `(target, boundsProvider)`; proxy textarea + utilityLayer painting; own undo stack with coalescing; handles Ctrl/Cmd+Z/Y and keeps stopping keydown propagation. Consider exposing an editing flag.
5. **Single commit** on exit via `updateNode`.
6. **Size warning** default ~200 KB serialized `blocks` (unmeasured guess), configurable.
7. **Culling** inside `sceneFunc` at line level.

```
WeaveTextNode(Shape) -> LayoutEngine(boundsProvider) 
        \-> TextEditSession(target, boundsProvider) -> proxy textarea, utilityLayer
```

## Risks / Trade-offs

- Wrap parity drift vs Konva.Text (CJK, emoji, long words) -> golden tests on all layouts.
- skia vs canvas `measureText`/`letterSpacing` differences -> tests on both backends.
- IME/mobile proxy-textarea quirks -> manual QA matrix.
- Zoom/pan caret sync -> reuse zoom/stage-move hooks.
- Two classes share one node type: only one may be registered per app; text-tool and selection checks keyed on `'text'` work unchanged but must be verified against v2.
- Azure real frame limit unverified -> configurable threshold.

## Migration Plan

Documents unchanged. Old `text` untouched. Land text-v2 read-only first, then editing, behind opt-in registration. Rollback by revert; no data migration. Deprecating/removing `text` is a separate future change.

## Open Questions

- skia vs canvas letterSpacing behavior; Azure real limit; external app usage of Konva.Text-only APIs.

## Implementation notes

- Layout: engine keeps a signature pool so paragraphs that shift index after an insert are reused; `warm()` pre-computes paragraphs within a time budget (used to time-slice bulk paste). Wrap uses an exponential probe so cost is per-line, not per-remaining-text.
- Edit session: the hidden textarea mirrors the full text and selection, so IME, mobile keyboards and native copy/cut work; `input` events are diffed into model edits. Up/Down/Home/End are handled by the session (visual lines). Undo/redo is the session's own stack; `beforeinput` history events are cancelled and keydown never propagates. `window.weaveTextEditing[id]` is set during a session for app-level key handlers.
- Benchmarks (jsdom + node-canvas, `WEAVE_BENCH=1`): 10k chars/many paragraphs 2.9 ms vs Konva 16.6 ms; 10k single paragraph 80 ms vs 1430 ms; 100k single paragraph 1.6 s (Konva: minutes); typing in a 100k-char, 2000-paragraph doc p50 4.7 ms, p95 9.9 ms; 5k-node load 4.0 s vs 5.4 s (dominated by canvas drawing). No scheduler added: numbers do not justify it.
- Size warning default stays 200k serialized chars (unmeasured; Azure's real limit unverified).
- skia-canvas 3.0.8 verified: wrap parity with Konva.Text holds on skia (letterSpacing 0 and 2, widths auto/150/320, Latin, hyphens, emoji, CJK) and server painting produces ink. Differences: skia's context supports `letterSpacing` natively (node-canvas does not); the engine adds spacing per character itself on both, so results match. `server-skia.test.ts` skips when skia-canvas is not installed.
