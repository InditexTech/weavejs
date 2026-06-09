// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage } from 'konva/lib/Stage';
import type { SelectionContext } from '../selection-context';

/**
 * Handles the stage `pointermove` event: cancels long-press timers when
 * the pointer moves, hides the selection rect when no movement, and
 * updates the area-selection rectangle and edge-panning direction while
 * a selection drag is in progress.
 */
export function handlePointerMove(
  ctx: SelectionContext,
  e: KonvaEventObject<PointerEvent, Konva.Stage>
): void {
  if (!e?.evt) return;

  const moved = ctx.getGesture().checkMoved(e.evt.clientX, e.evt.clientY);

  if (e.evt?.buttons === 0) return;

  if (e.evt.pointerType === 'touch' && ctx.getPointerCount() > 1) return;
  if (!ctx.isInitialized()) return;
  if (!ctx.isActive()) return;

  const contextMenuPlugin = ctx.getContextMenuPlugin();
  if (moved) {
    contextMenuPlugin?.cancelLongPressTimer();
  } else {
    ctx.getAreaSelector().hide();
  }

  if (contextMenuPlugin?.isContextMenuVisible()) {
    ctx.getEdgePanning().stop();
  }

  if (ctx.getSpaceKeyPressedState()) return;
  if (!ctx.isAreaSelecting()) return;

  ctx.getAreaSelector().update(
    ctx.getWeaveInstance().getStage() as unknown as Stage,
    () => ctx.selectNone()
  );
  ctx.getEdgePanning().updateDirection();
}
