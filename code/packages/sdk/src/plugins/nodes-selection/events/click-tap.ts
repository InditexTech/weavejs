// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage } from 'konva/lib/Stage';
import { getTargetedNode } from '@/utils/utils';
import { SELECTION_TOOL_ACTION_NAME } from '@/actions/selection-tool/constants';
import type { SelectionContext } from '../selection-context';

/**
 * Handles a single click or tap on the canvas: resolves the targeted node,
 * applies single/multi-selection logic, and triggers the selection-change
 * event. Called from both pointerdown (immediate click) and pointerup
 * (after area-selection ends with a tap).
 */
export function handleClickOrTap(
  ctx: SelectionContext,
  e: KonvaEventObject<PointerEvent, Stage>
): void {
  const weave = ctx.getWeaveInstance();
  const stage = weave.getStage();
  const tr = ctx.getTransformerController().getTransformer();

  ctx.setClickOrTapHandled(true);
  e.cancelBubble = true;

  if (!ctx.isEnabled()) return;
  if (weave.getActiveAction() !== SELECTION_TOOL_ACTION_NAME) return;

  const contextMenuPlugin = ctx.getContextMenuPlugin();
  if (contextMenuPlugin?.isContextMenuVisible()) {
    ctx.getEdgePanning().stop();
  }

  ctx.hideHoverState();

  const selectedGroup = getTargetedNode(weave);
  if (!ctx.isInitialized()) return;

  if (e.evt.pointerType === 'mouse' && e.evt?.button && e.evt?.button !== 0)
    return;

  let areNodesSelected = false;

  let nodeTargeted =
    selectedGroup && !(selectedGroup.getAttrs().active ?? false)
      ? selectedGroup
      : e.target;

  if (e.target === weave.getStage()) {
    ctx.getGesture().resetDoubleTap();
    ctx.getNodesSelectionFeedbackPlugin()?.cleanupSelectedHalos();
    return;
  }

  nodeTargeted = weave.getRealSelectedNode(nodeTargeted);

  if (!nodeTargeted.getAttrs().nodeType) {
    ctx.getGesture().resetDoubleTap();
    return;
  }

  const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
  const nodeSelectedIndex = tr.nodes().findIndex((node) => {
    return node.getAttrs().id === nodeTargeted.getAttrs().id;
  });
  const isSelected = nodeSelectedIndex !== -1;

  const user = weave.getStore().getUser();
  const isLocked = nodeTargeted.getAttrs().locked ?? false;
  const isMutexLocked =
    nodeTargeted.getAttrs().mutexLocked &&
    nodeTargeted.getAttrs().mutexUserId !== user.id;

  if (isLocked || isMutexLocked) {
    const parent = weave.getInstanceRecursive(
      nodeTargeted.getParent() as Konva.Node
    );
    const mainLayer = weave.getMainLayer();
    const isStage = parent instanceof Konva.Stage;
    const isMainLayer = parent === mainLayer;
    const isContainerEmptyArea =
      e.target.getAttrs().isContainerPrincipal !== undefined &&
      !e.target.getAttrs().isContainerPrincipal;

    if (isStage || isMainLayer || isContainerEmptyArea) {
      ctx.setSelectedNodes([]);
    }

    ctx.triggerSelectedNodesEvent();

    return;
  }

  if (
    !nodeTargeted.getAttrs().name?.includes('node') &&
    nodeTargeted.getAttrs().nodeId
  ) {
    const realNode = stage.findOne(`#${nodeTargeted.getAttrs().nodeId}`);
    if (realNode) nodeTargeted = realNode;
  }

  if (
    typeof nodeTargeted.getAttrs().isContainerPrincipal !== 'undefined' &&
    !nodeTargeted.getAttrs().isContainerPrincipal
  ) {
    return;
  }

  if (ctx.getGesture().isDoubleTap && !metaPressed) {
    ctx.getGesture().resetDoubleTap();
    nodeTargeted.dblClick();
    return;
  }

  const isCtrlOrCmdPressed = e.evt.ctrlKey || e.evt.metaKey;
  if (isCtrlOrCmdPressed) return;

  if (!metaPressed) {
    tr.nodes([nodeTargeted]);
    tr.show();
    areNodesSelected = true;
  }
  if (metaPressed && isSelected) {
    const nodes = tr.nodes().slice();
    nodes.splice(nodes.indexOf(nodeTargeted), 1);
    tr.nodes(nodes);
    areNodesSelected = true;
  }
  if (metaPressed && !isSelected) {
    tr.nodes(tr.nodes().concat([nodeTargeted]));
    areNodesSelected = true;
  }

  ctx.handleMultipleSelectionBehavior();
  ctx.handleBehaviors();

  if (areNodesSelected) {
    stage.container().tabIndex = 1;
    stage.container().focus();
    stage.container().style.cursor =
      (typeof nodeTargeted?.defineMousePointer === 'function'
        ? nodeTargeted.defineMousePointer()
        : null) ?? 'grab';
  }

  ctx.triggerSelectedNodesEvent();
}
