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
 * Handles the stage `pointerup` event: ends any in-progress area-selection
 * (including the node-filtering/commit step), or delegates to the click/tap
 * handler for point interactions.
 */
export function handlePointerUp(
  ctx: SelectionContext,
  e: KonvaEventObject<PointerEvent, Stage>
): void {
  const weave = ctx.getWeaveInstance();
  const stage = weave.getStage();
  const store = weave.getStore();
  const actUser = store.getUser();
  const tr = ctx.getTransformerController().getTransformer();

  tr.setAttrs({ listening: true });

  ctx.setAreaSelecting(false);
  ctx.getEdgePanning().stop();

  const moved = ctx.getGesture().checkMoved(e.evt.clientX, e.evt.clientY);
  ctx.getGesture().checkDoubleTap(e.evt.clientX, e.evt.clientY);
  ctx.unregisterPointer(e.evt.pointerId);
  ctx.getGesture().commitTap();

  if (stage.mode() !== WEAVE_STAGE_DEFAULT_MODE) return;

  const contextMenuPlugin = ctx.getContextMenuPlugin();

  if (!ctx.isInitialized()) {
    ctx.getAreaSelector().hide();
    return;
  }

  if (!ctx.isActive()) {
    ctx.getAreaSelector().hide();
    return;
  }

  weave.emitEvent<WeaveNodesSelectionPluginOnSelectionStateEvent>('onSelectionState', false);

  if (ctx.getGesture().isDoubleTap) {
    ctx.getAreaSelector().hide();
    handleClickOrTap(ctx, e);
    return;
  }

  const isStage = e.target instanceof Konva.Stage;
  const isContainerEmptyArea =
    e.target.getAttrs().isContainerPrincipal !== undefined &&
    !e.target.getAttrs().isContainerPrincipal;

  if ((isStage || isContainerEmptyArea) && !moved) {
    ctx.setAreaSelecting(false);
    ctx.getEdgePanning().stop();
    ctx.getAreaSelector().hide();
    ctx.setSelectedNodes([]);
    return;
  }

  if (e.evt.pointerType === 'touch' && ctx.getPointerCount() + 1 > 1) {
    ctx.getAreaSelector().hide();
    return;
  }

  if (contextMenuPlugin?.isContextMenuVisible()) {
    ctx.getEdgePanning().stop();
  }

  const selectedGroup = getTargetedNode(weave);

  if (
    !moved &&
    selectedGroup?.getParent() instanceof Konva.Transformer &&
    !ctx.wasClickOrTapHandled()
  ) {
    ctx.setAreaSelecting(false);
    ctx.getEdgePanning().stop();
    ctx.getAreaSelector().hide();
    handleClickOrTap(ctx, e);
    return;
  }

  if (!ctx.getAreaSelector().getRect().visible()) {
    ctx.getAreaSelector().hide();
    return;
  }

  // ── Area-selection commit ──────────────────────────────────────────────────

  const shapes = stage.find((node: Konva.Node) => {
    return (
      ['Shape', 'Group'].includes(node.getType()) &&
      typeof node.getAttrs().id !== 'undefined'
    );
  });

  const box = ctx.getAreaSelector().getBox();
  ctx.getAreaSelector().getRect().visible(false);

  const selected = shapes.filter((shape) => {
    const shapeMutex = weave.getNodeMutexLock(shape.id());
    if (shapeMutex && shapeMutex.user.id !== actUser.id) return false;

    let parent = weave.getInstanceRecursive(shape.getParent() as Konva.Node);

    if (parent.getAttrs().nodeId) {
      parent = stage.findOne(`#${parent.getAttrs().nodeId}`) as Konva.Node;
    }

    if (shape.getAttrs().nodeType && shape.getAttrs().nodeType === 'frame') {
      const frameBox = shape.getClientRect();
      return (
        frameBox.x >= box.x &&
        frameBox.y >= box.y &&
        frameBox.x + frameBox.width <= box.x + box.width &&
        frameBox.y + frameBox.height <= box.y + box.height
      );
    }
    if (
      shape.getAttrs().nodeType &&
      shape?.getAttrs().nodeType === 'group' &&
      ['layer', 'frame'].includes(parent?.getAttrs().nodeType)
    ) {
      return (
        shape.getAttrs().nodeType &&
        Konva.Util.haveIntersection(box, shape.getClientRect())
      );
    }
    if (
      shape.getAttrs().nodeType &&
      shape.getAttrs().nodeType !== 'group' &&
      ['layer', 'frame'].includes(parent?.getAttrs().nodeType)
    ) {
      return (
        shape.getAttrs().nodeType &&
        Konva.Util.haveIntersection(box, shape.getClientRect())
      );
    }
    return false;
  });

  const selectedNodes = new Set<Konva.Node>();
  const containerNodesIds: string[] = [];
  const otherNodes: Konva.Node[] = [];

  for (const node of selected) {
    let realNode = node;
    if (node.getAttrs().nodeId) {
      realNode = stage.findOne(`#${node.getAttrs().nodeId}`) as Konva.Node;
    }

    if (!realNode) continue;

    const isContainer =
      typeof realNode.getAttrs().isContainerPrincipal !== 'undefined' &&
      realNode.getAttrs().isContainerPrincipal;

    if (isContainer) {
      containerNodesIds.push(realNode.getAttrs().id ?? '');
      if (!realNode.getAttrs().locked) {
        selectedNodes.add(realNode);
      }
    } else {
      otherNodes.push(realNode);
    }
  }

  for (const node of otherNodes) {
    let parent = weave.getInstanceRecursive(node.getParent() as Konva.Node);

    if (parent?.getAttrs().nodeId) {
      parent = stage.findOne(`#${parent.getAttrs().nodeId}`) as Konva.Node;
    }

    if (
      parent &&
      !containerNodesIds.includes(parent?.getAttrs().id ?? '') &&
      !node.getAttrs().locked
    ) {
      selectedNodes.add(node);
    }
  }

  ctx.setAreaSelecting(false);
  ctx.getEdgePanning().stop();

  tr.nodes([...selectedNodes]);
  ctx.handleMultipleSelectionBehavior();
  ctx.handleBehaviors();

  if (tr.nodes().length > 0) {
    stage.container().tabIndex = 1;
    stage.container().focus();
  }

  ctx.triggerSelectedNodesEvent();
}
