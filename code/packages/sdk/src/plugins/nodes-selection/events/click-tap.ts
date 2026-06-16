// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage } from 'konva/lib/Stage';
import { getTargetedNode, buildAncestorGroupIds } from '@/utils/utils';
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
    // If we're in group context, clicking on empty canvas exits it
    if (ctx.getActiveGroupContext() !== null) {
      ctx.exitGroupContext();
    }
    ctx.getGesture().resetDoubleTap();
    ctx.getNodesSelectionFeedbackPlugin()?.cleanupSelectedHalos();
    return;
  }

  nodeTargeted = weave.getRealSelectedNode(nodeTargeted);

  if (!nodeTargeted.getAttrs().nodeType) {
    ctx.getGesture().resetDoubleTap();
    return;
  }

  // If in group context, check whether the click is outside the active group.
  // If so, exit the context first and let normal outer selection proceed.
  const activeGroupContext = ctx.getActiveGroupContext();
  if (activeGroupContext !== null) {
    const isInsideActiveGroup = isNodeInsideGroup(
      nodeTargeted,
      activeGroupContext,
      stage
    );
    if (isInsideActiveGroup) {
      const parentId = nodeTargeted.getParent()?.getAttrs().id ?? '';
      if (parentId !== activeGroupContext) {
        ctx.enterGroupContext(parentId);
      }
    }

    if (!isInsideActiveGroup) {
      ctx.exitGroupContext();
      // After exiting, re-resolve the target without group context constraint
      // so the outer node (group or top-level node) is selected normally
      nodeTargeted = weave.getInstanceRecursive(
        nodeTargeted
      ) as typeof nodeTargeted;
    }
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

  // Walk up to the topmost group that is neither the active context nor an
  // ancestor of it. A single-step bump is not enough for deeply nested groups:
  // e.g. stage → groupA → groupB → node with no active context must resolve to
  // groupA, not groupB.
  let cur: Konva.Node = nodeTargeted;
  let p = cur.getParent();
  while (
    p?.getAttrs().nodeType === 'group' &&
    activeGroupContext !== p.getAttrs().id &&
    !isAncestorOfActiveGroup(p, activeGroupContext, stage)
  ) {
    cur = p;
    p = cur.getParent();
  }
  nodeTargeted = cur as typeof nodeTargeted;

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

/**
 * Returns true if `node` is anywhere within the group hierarchy rooted at
 * `groupId`: either a descendant of the active group itself, or a descendant
 * of any ancestor group in the path from `groupId` to the root.
 * Used to decide whether a click should keep the current group context active.
 */
function isNodeInsideGroup(
  node: Konva.Node,
  groupId: string,
  stage: Konva.Stage
): boolean {
  const groupNode = stage.findOne(`#${groupId}`);
  if (!groupNode) return false;

  // Build the set of all Weave container IDs from the active group up to the root
  const containerIds = new Set<string>(buildAncestorGroupIds(groupId, stage));

  // The node is "inside" if it or any of its ancestors is one of those containers
  let current: Konva.Node | null = node;
  while (current) {
    if (containerIds.has(current.getAttrs().id ?? '')) return true;
    current = current.getParent();
  }
  return false;
}

/**
 * Returns true if `node` is a (strict) ancestor of the active group — i.e.
 * it appears in the parent chain above `activeGroupId`, not at the group
 * itself and not below it.
 */
function isAncestorOfActiveGroup(
  node: Konva.Node | null | undefined,
  activeGroupId: string | null,
  stage: Konva.Stage
): boolean {
  if (!node || !activeGroupId) return false;
  const nodeId = node.getAttrs().id ?? '';
  const activeGroupNode = stage.findOne(`#${activeGroupId}`);
  if (!activeGroupNode) return false;

  let cur: Konva.Node | null = activeGroupNode.getParent();
  while (cur) {
    if ((cur.getAttrs().id ?? '') === nodeId) return true;
    cur = cur.getParent();
  }
  return false;
}
