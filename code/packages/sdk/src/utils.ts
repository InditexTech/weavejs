// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type { Weave } from './weave';
import {
  WEAVE_NODE_CUSTOM_EVENTS,
  WEAVE_NODE_LAYER_ID,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import type { WeaveNode } from './nodes/node';

export function resetScale(node: Konva.Node): void {
  node.width(
    Math.round(
      (Math.max(1, node.width() * node.scaleX()) + Number.EPSILON) * 100
    ) / 100
  );
  node.height(
    Math.round(
      (Math.max(1, node.height() * node.scaleY()) + Number.EPSILON) * 100
    ) / 100
  );
  node.scaleX(1);
  node.scaleY(1);
  node.x(Math.round((node.x() + Number.EPSILON) * 100) / 100);
  node.y(Math.round((node.y() + Number.EPSILON) * 100) / 100);
  node.rotation(Math.round((node.rotation() + Number.EPSILON) * 100) / 100);
}

// Container management functions

export function clearContainerTargets(instance: Weave): void {
  const getContainers = instance.getContainerNodes();
  for (const container of getContainers) {
    container.fire(WEAVE_NODE_CUSTOM_EVENTS.onTargetLeave, { bubbles: true });
  }
}

export function checkIfOverContainer(
  instance: Weave,
  node: Konva.Node
): Konva.Node | undefined {
  const nodesIntersected = instance.pointIntersectsContainerElement(
    node.getParent() as Konva.Layer | Konva.Group
  );

  let nodeActualContainer: Konva.Node | undefined =
    node.getParent() as Konva.Node;
  if (nodeActualContainer?.getAttrs().nodeId) {
    nodeActualContainer = instance
      .getStage()
      .findOne(`#${nodeActualContainer.getAttrs().nodeId}`);
  }

  let layerToMove = undefined;
  // Move to container
  if (
    !node.getAttrs().containerId &&
    nodesIntersected &&
    nodeActualContainer?.getAttrs().id !== nodesIntersected.getAttrs().id
  ) {
    layerToMove = nodesIntersected;
  }

  return layerToMove;
}

export function moveNodeToContainer(
  instance: Weave,
  node: Konva.Node
): Konva.Node | undefined {
  const nodeIntersected = instance.pointIntersectsContainerElement();

  let nodeActualContainer: Konva.Node | undefined =
    node.getParent() as Konva.Node;

  if (!nodeActualContainer) {
    return undefined;
  }

  const actualContainerAttrs = nodeActualContainer.getAttrs();
  const nodeAttrs = node.getAttrs();

  if (actualContainerAttrs.nodeId) {
    nodeActualContainer = instance
      .getStage()
      .findOne(`#${actualContainerAttrs.nodeId}`);
  }

  let layerToMove = undefined;
  // Move to container
  if (
    !nodeAttrs.containerId &&
    nodeIntersected &&
    actualContainerAttrs.id !== nodeIntersected.getAttrs().id
  ) {
    layerToMove = nodeIntersected;
  }
  // Move to main layer
  if (!nodeIntersected && actualContainerAttrs.id !== WEAVE_NODE_LAYER_ID) {
    layerToMove = instance.getMainLayer();
  }

  if (layerToMove) {
    const layerToMoveAttrs = layerToMove.getAttrs();

    const nodePos = node.getAbsolutePosition();
    const nodeRotation = node.getAbsoluteRotation();

    node.moveTo(layerToMove);
    node.setAbsolutePosition(nodePos);
    node.rotation(nodeRotation);
    node.x(node.x() - (layerToMoveAttrs.containerOffsetX ?? 0));
    node.y(node.y() - (layerToMoveAttrs.containerOffsetY ?? 0));

    const nodeHandler = instance.getNodeHandler<WeaveNode>(
      node.getAttrs().nodeType
    );
    const actualNode = nodeHandler.serialize(node as WeaveElementInstance);

    instance.removeNode(actualNode);
    instance.addNode(actualNode, layerToMoveAttrs.id);
  }

  return layerToMove;
}
