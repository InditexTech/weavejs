# Design

## Context

A frame (`code/packages/sdk/src/nodes/frame/frame.ts`) is a Konva group. Its only hit target is the `{id}-selection-area` rect, whose `hitFunc` draws just the title strip. The same hit function is duplicated in `onRender`, the `onZoomChange` listener and `onUpdate`. `onRender` computes `textHeight` with `titleMargin / stage.scaleX()`, but `onUpdate` omits the scale division, so the strip changes size after a prop update. `frameInternal` (children, clipped) sits above `selection-area`, so children win hits where they overlap. `onRender` calls `frame.off('pointerover')`, which disables default hover. `node.ts` already supports a per-node `defineMousePointer()` hook (default `pointer` on hover, `grab` when selected). See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- One source of truth for the frame hit region (title strip + edge bands).
- Band width stable in screen pixels across zoom.
- Hover/selected highlight and `move` cursor without breaking drop-target feedback.

**Non-Goals:**
- Title bar redesign, interior selection, resizing or rotation of frames.
- Changing how nodes are targeted by the selection plugin.

## Decisions

1. **Single `buildHitFunc` helper.** Takes frame size, `borderWidth`, `titleHeight`, band width and returns the `hitFunc`. Used by `onRender`, `onZoomChange` and `onUpdate`. Title geometry (`onRender` scaled, `onUpdate` unscaled) is deliberately left as is: making `onUpdate` zoom-aware moved the title at low zoom. The hit strip uses the actual title height. Alternative (patch each copy) rejected: duplication invites drift.

2. **Band geometry.** `band = max(borderWidth, edgeHitWidth / stage.scaleX())`. Drawn as four rects (top, bottom, left, right) around the border, `outer = band * 2/3`, `inner = band * 1/3`, in one path alongside the title rect. Alternative: even-odd outer-minus-inner rect; rejected as less predictable across Konva hit canvases. Alternative: purely `edgeHitWidth / zoom` ignoring `borderWidth`; rejected so a large `borderWidth` is never smaller than the visible border.

3. **Config.** Add to `WEAVE_FRAME_NODE_DEFAULT_CONFIG` and `types.ts` only `edgeHitWidth: 6`. Merged through existing `mergeExceptArrays`, non-breaking. No hover/selected colors: the nodes-selection plugin already draws selection and hover feedback.

4. **Cursor.** Frame sets the `move` cursor on `dragstart`/`dragmove` and restores `defineMousePointer()` on `dragend`. Hover and click keep the default pointer/grab behavior.

5. **Drop target outline.** On `onTargetEnter` the outline uses `transform.borderStrokeWidth` (the selection outline width, default 2) with `strokeScaleEnabled: false`, so it keeps its on-screen width at any zoom; on leave, `borderWidth` and scaling are restored. Colors (`onTargetEnter`) are unchanged.

6. **Docs and changelog** are part of the tasks, per AGENTS.md.

## Risks / Trade-offs

- [`frame.clip` (includes title area) may cut the outward band] → widened by the max outward band and refreshed on zoom; covered by a test.
- [Bands of adjacent frames overlap at very low zoom] → z-order decides; tune `edgeHitWidth` (try 4/6/8 in the playground).
- [Outward band steals clicks from nearby empty canvas] → keep default small (6px) and configurable.
- [Other code can reset the cursor during a drag] → re-assert `move` on `dragmove`.

## Open Questions

- Final default `edgeHitWidth` (6 for now; validate 4/6/8 in the playground).
