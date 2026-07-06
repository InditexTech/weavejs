// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage } from 'konva/lib/Stage';
import type { SelectionContext } from '../selection-context';

/**
 * Handles the stage `pointermove` for single-gesture select+drag. When a node
 * has been "armed" by a fresh single-selection click (see click-tap.ts), this
 * starts the drag on the same gesture as soon as the pointer moves past the
 * move threshold, so the user does not need a second press to begin moving.
 *
 * A plain click (no movement) never reaches the threshold, so it only selects.
 * Uses the public Konva `startDrag` API — the node's own `dragstart` handler
 * and the transformer's drag proxy take over from there.
 *
 * Wired un-throttled (separate from the throttled selection pointermove) to
 * keep drag initiation responsive.
 */
export function handleArmedDrag(
  ctx: SelectionContext,
  e: KonvaEventObject<PointerEvent, Stage>
): void {
  const node: Konva.Node | null = ctx.getArmedDragNode();

  if (!node || !e?.evt) return;

  // Button released without crossing the threshold: cancel arming (plain click).
  if (e.evt.buttons === 0) {
    ctx.clearArmedDrag();
    return;
  }

  if (e.evt.pointerId !== ctx.getArmedDragPointerId()) return;
  if (!ctx.getGesture().checkMoved(e.evt.clientX, e.evt.clientY)) return;
  if (node.isDragging()) return;

  ctx.clearArmedDrag();

  // Wrap the raw DOM `PointerEvent` as a Konva-style event object. Konva fires
  // `dragstart` with `evt: evt && evt.evt`, so the node's own dragstart handler
  // needs `.evt` present or it bails on `!e.evt` before any Weave drag setup.
  //
  // We deliberately do NOT forward `pointerId`. Konva drives the per-frame drag
  // position from native `mousemove`/`touchmove` (see DragAndDrop `_drag`), and
  // a mouse `mousemove` has no `pointerId` so Konva stamps the drag position
  // with id `999` (`Util._getFirstPointerId`). If we seed the drag element with
  // the PointerEvent's real `pointerId` (e.g. `1`), it can never match `999`,
  // so `_drag` finds no matching pointer and the node stays frozen. Leaving it
  // `undefined` lets `_drag` self-assign the id from the driving event.
  node.startDrag({ evt: e.evt });
}
