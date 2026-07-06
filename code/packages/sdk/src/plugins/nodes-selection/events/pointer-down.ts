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

    // The pointer landed on the selection transformer's overdraw area (its
    // `back` shape spans the whole bounding box). Re-resolve the real node
    // underneath: if a *different*, targetable node sits on top of the current
    // selection, the drag must move that node — not proxy-drag the selection.
    const weave = ctx.getWeaveInstance();
    const realNode = weave.getRealSelectedNode(selectedGroup);
    const tr = ctx.getTransformerController().getTransformer();

    const selectedIds = new Set(tr.nodes().map((node) => node.getAttrs().id));
    let isWithinSelection = false;
    for (let cur: Konva.Node | null = realNode; cur; cur = cur.getParent()) {
      if (typeof cur.getAttrs !== 'function') break;
      if (selectedIds.has(cur.getAttrs().id)) {
        isWithinSelection = true;
        break;
      }
    }

    if (!isWithinSelection && realNode.getAttrs().nodeType) {
      // Because the previous selection's nodes are draggable, the transformer's
      // `back` overdraw shape is draggable too, so Konva armed a `ready` drag
      // element for it on this pointerdown. Left in place it would compete with
      // (or hijack) the drag of the node we are about to re-target. Drop any
      // not-yet-started (`ready`) drag elements so only the re-targeted node's
      // armed drag proceeds.
      Konva.DD._dragElements.forEach((elem, key) => {
        if (elem.dragStatus === 'ready') {
          Konva.DD._dragElements.delete(key);
        }
      });

      // Stop the transformer from proxy-dragging the old selection for this
      // gesture (restored on pointerup). handleClickOrTap re-resolves the node
      // under the overlay, selects it, and arms its drag.
      tr.setAttrs({ listening: false });
      handleClickOrTap(ctx, e);
    }
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
