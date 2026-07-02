// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage } from 'konva/lib/Stage';
import { getTargetedNode } from '@/utils/utils';
import { WEAVE_STAGE_DEFAULT_MODE } from '@/nodes/stage/constants';
import type { WeaveNodesSelectionPluginOnSelectionStateEvent } from '../types';
import type { SelectionContext } from '../selection-context';
import { handleClickOrTap } from './click-tap';

/**
 * Handles the stage `pointerdown` event: records pointer state, decides
 * whether to start an area-selection or delegate to a click/tap handler.
 */
export function handlePointerDown(
  ctx: SelectionContext,
  e: KonvaEventObject<PointerEvent, Stage>
): void {
  ctx.getGesture().setTapStart(e.evt.clientX, e.evt.clientY);

  if (e.target.getClassName().includes('custom-snap-guide')) return;

  ctx.setClickOrTapHandled(false);
  ctx.registerPointer(e.evt.pointerId, e.evt);
  ctx.clearArmedDrag();

  if (e.evt.pointerType === 'touch' && ctx.getPointerCount() > 1) return;
  if (e.evt.pointerType === 'mouse' && e.evt?.button !== 0) return;
  if (e.evt.pointerType === 'pen' && e.evt?.pressure <= 0.05) return;
  if (!ctx.isInitialized()) return;
  if (!ctx.isActive()) return;

  const stage = ctx.getWeaveInstance().getStage();
  if (stage.mode() !== WEAVE_STAGE_DEFAULT_MODE) return;

  const selectedGroup = getTargetedNode(ctx.getWeaveInstance());

  if (selectedGroup?.getParent() instanceof Konva.Transformer) {
    ctx.setAreaSelecting(false);
    ctx.getEdgePanning().stop();
    ctx.getAreaSelector().hide();
    return;
  }

  const isStage = e.target instanceof Konva.Stage;
  const isTransformer = e.target?.getParent() instanceof Konva.Transformer;
  const canBeTargeted = e.target.getAttrs().canBeTargeted !== false;
  const isContainerEmptyArea =
    e.target.getAttrs().isContainerPrincipal !== undefined &&
    !e.target.getAttrs().isContainerPrincipal;

  if (isTransformer) return;

  if (!isStage && !isContainerEmptyArea && canBeTargeted) {
    ctx.setAreaSelecting(false);
    ctx.getEdgePanning().stop();
    ctx.getAreaSelector().hide();
    handleClickOrTap(ctx, e);
    return;
  }

  ctx.getEdgePanning().reset();

  const relPos = stage.getRelativePointerPosition() ?? { x: 0, y: 0 };
  ctx.getAreaSelector().setStart(relPos.x, relPos.y);
  ctx
    .getAreaSelector()
    .resetForScale(stage.scaleX(), ctx.getConfiguration().selectionArea);
  ctx.setAreaSelecting(true);

  const isCtrlOrMetaPressed = e.evt.ctrlKey || e.evt.metaKey;
  if (isCtrlOrMetaPressed) {
    const tr = ctx.getTransformerController().getTransformer();
    const nodesSelected = tr.nodes();
    for (const node of nodesSelected) {
      node.fire('onSelectionCleared', { bubbles: true });
    }
  }

  const activeGroupContext = ctx.getActiveGroupContext();
  if (activeGroupContext !== null) {
    ctx.exitGroupContext();
  }

  ctx.selectNone();
  ctx.triggerSelectedNodesEvent();

  ctx
    .getWeaveInstance()
    .emitEvent<WeaveNodesSelectionPluginOnSelectionStateEvent>(
      'onSelectionState',
      true
    );

  ctx.getEdgePanning().start();
}
