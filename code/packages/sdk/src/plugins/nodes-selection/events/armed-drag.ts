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
  node.startDrag(e.evt);
}
