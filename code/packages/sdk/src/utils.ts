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
  const containers = instance.getContainerNodes();
  for (const container of containers) {
    container.fire(WEAVE_NODE_CUSTOM_EVENTS.onTargetLeave, { bubbles: true });
  }
}

export function checkIfOverContainer(
  instance: Weave,
  node: Konva.Node | Konva.Transformer
): Konva.Node | undefined {
  if (node instanceof Konva.Transformer) {
    const transformerNodes = node.nodes();
    const containersInSelection = [];
    for (const actualNode of transformerNodes) {
      if (
        typeof actualNode.getAttrs().isContainerPrincipal !== 'undefined' &&
        actualNode.getAttrs().isContainerPrincipal
      ) {
        containersInSelection.push(actualNode);
        continue;
      }
    }

    const containersInSelectionSet = new Set(containersInSelection);
    const uniqueContainersInSelection = Array.from(containersInSelectionSet);

    if (uniqueContainersInSelection.length > 0) {
      return undefined;
    }
  }

  const intersectedNode = instance.nodeIntersectsContainerElement(node);

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
    intersectedNode &&
    nodeActualContainer?.getAttrs().id !== intersectedNode.getAttrs().id
  ) {
    layerToMove = intersectedNode;
  }

  return layerToMove;
}

export function moveNodeToContainer(
  instance: Weave,
  node: Konva.Node
): Konva.Node | undefined {
  const stage = instance.getStage();
  const nodeIntersected = instance.nodeIntersectsContainerElement(node);

  // check is node is locked
  const isLocked = instance.allNodesLocked([node]);

  if (isLocked) {
    return;
  }

  let nodeActualContainer: Konva.Node | undefined =
    node.getParent() as Konva.Node;

  if (nodeActualContainer.getAttrs().nodeId) {
    const realParent = stage.findOne(
      `#${nodeActualContainer.getAttrs().nodeId}`
    );

    if (realParent) {
      nodeActualContainer = realParent;
    }
  }

  if (!nodeActualContainer) {
    return undefined;
  }

  const actualContainerAttrs = nodeActualContainer.getAttrs();

  let layerToMove = undefined;
  // Move to container
  if (
    nodeIntersected &&
    actualContainerAttrs.id !== nodeIntersected.getAttrs().id &&
    !node.getAttrs().isContainerPrincipal
  ) {
    layerToMove = nodeIntersected;
  }
  // Move to main layer
  if (!nodeIntersected && actualContainerAttrs.id !== WEAVE_NODE_LAYER_ID) {
    layerToMove = instance.getMainLayer();
  }

  if (
    layerToMove &&
    actualContainerAttrs.id !== layerToMove.getAttrs().id &&
    actualContainerAttrs.id !== layerToMove.getAttrs().containerId
  ) {
    const layerToMoveAttrs = layerToMove.getAttrs();

    const nodePos = node.getAbsolutePosition();
    const nodeRotation = node.getAbsoluteRotation();

    node.moveTo(layerToMove);
    node.setAbsolutePosition(nodePos);
    node.rotation(nodeRotation);
    node.x(node.x() - (layerToMoveAttrs.containerOffsetX ?? 0));
    node.y(node.y() - (layerToMoveAttrs.containerOffsetY ?? 0));
    node.movedToContainer(layerToMove);

    const nodeHandler = instance.getNodeHandler<WeaveNode>(
      node.getAttrs().nodeType
    );

    if (nodeHandler) {
      const actualNode = nodeHandler.serialize(node as WeaveElementInstance);

      instance.removeNode(actualNode);
      instance.addNode(actualNode, layerToMoveAttrs.id);

      return layerToMove;
    }
  }

  return undefined;
}

export function getContrastTextColor(hex: string): 'white' | 'black' {
  // Remove "#" if present
  const cleaned = hex.replace(/^#/, '');

  // Parse R, G, B from hex
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);

  // Calculate luminance (per W3C)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black for light colors, white for dark
  return luminance > 0.5 ? 'black' : 'white';
}

export function stringToColor(str: string) {
  let hash = 0;
  str.split('').forEach((char) => {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  });
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += value.toString(16).padStart(2, '0');
  }
  return color;
}

export function getBoundingBox(
  stage: Konva.Stage,
  nodes: Konva.Node[]
): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const box = node.getRealClientRect({ skipTransform: false });

    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
