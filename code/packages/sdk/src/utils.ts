// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type { Weave } from './weave';
import {
  WEAVE_NODE_CUSTOM_EVENTS,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import type { WeaveNode } from './nodes/node';
import type { Vector2d } from 'konva/lib/types';
import type { WeaveNodesSelectionPlugin } from './plugins/nodes-selection/nodes-selection';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { DOMElement } from './types';

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

export function containerOverCursor(
  instance: Weave,
  ignoreNodes: Konva.Node[],
  definedCursorPosition?: Vector2d
): Konva.Node | undefined {
  Konva.hitOnDragEnabled = true;

  const stage = instance.getStage();
  const cursorPosition =
    definedCursorPosition ?? stage.getRelativePointerPosition();

  if (!cursorPosition) {
    return undefined;
  }

  const containerUnderPointer = new Set<Konva.Node>();

  stage
    .find('.containerCapable')
    .reverse()
    .forEach((node) => {
      if (!node.isVisible()) {
        return;
      }

      if (containsNodeDeep(ignoreNodes, node)) {
        return;
      }

      const shapeRect = getBoundingBox(stage, [node]);
      if (
        cursorPosition.x >= shapeRect.x &&
        cursorPosition.x <= shapeRect.x + shapeRect.width &&
        cursorPosition.y >= shapeRect.y &&
        cursorPosition.y <= shapeRect.y + shapeRect.height
      ) {
        if (node?.getAttrs().isContainerPrincipal) {
          containerUnderPointer.add(node);
        }
      }
    });

  const nodes = Array.from(containerUnderPointer);

  if (nodes.length === 0) {
    return undefined;
  }

  let layerToMove = undefined;
  // Move to container
  if (
    nodes[0]?.getAttrs().containerId &&
    nodes[0]?.getAttrs().isContainerPrincipal
  ) {
    layerToMove = nodes[0];
  }

  return layerToMove;
}

export function moveNodeToContainer(
  instance: Weave,
  node: Konva.Node,
  containerToMove: Konva.Layer | Konva.Node,
  invalidOriginsTypes: string[] = ['frame']
): boolean {
  const stage = instance.getStage();

  // check is node is locked
  const isLocked = instance.allNodesLocked([node]);

  if (isLocked) {
    return false;
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
    return false;
  }

  const actualContainerAttrs = nodeActualContainer.getAttrs();

  let layerToMove = undefined;

  // Move to container
  if (
    actualContainerAttrs.id !== containerToMove.getAttrs().id &&
    !invalidOriginsTypes.includes(node.getAttrs().nodeType)
  ) {
    layerToMove = containerToMove;
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

      return true;
    }
  }

  return false;
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

export function getExportBoundingBox(
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
    const box = node.getExportClientRect({ skipTransform: false });

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
    const box = node.getRealClientRect({
      relativeTo: stage,
      skipTransform: false,
    });

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

export function getTargetedNode(instance: Weave): Konva.Node | undefined {
  const stage = instance.getStage();
  let selectedGroup: Konva.Node | undefined = undefined;
  const mousePos = stage.getPointerPosition();
  if (mousePos) {
    const inter = stage.getIntersection(mousePos);
    if (inter) {
      selectedGroup = instance.getInstanceRecursive(inter);
    }
  }
  return selectedGroup;
}

export function hasImages(node: Konva.Node) {
  if (node.getAttrs().nodeType === 'image') {
    return true;
  }

  if (node.getAttrs().nodeType !== 'group') {
    return false;
  }

  const nodes = (node as Konva.Group).find((node: Konva.Node) => {
    return node.getAttrs().nodeType === 'image';
  });

  if (nodes.length === 0) {
    return false;
  } else {
    return true;
  }
}

export function hasFrames(node: Konva.Node) {
  if (node.getAttrs().nodeType === 'frame') {
    return true;
  }

  if (node.getAttrs().nodeType !== 'group') {
    return false;
  }

  const nodes = (node as Konva.Group).find((node: Konva.Node) => {
    return node.getAttrs().nodeType === 'frame';
  });

  if (nodes.length === 0) {
    return false;
  } else {
    return true;
  }
}

export function intersectArrays<T>(arrays: T[][]): T[] {
  return arrays.reduce(
    (acc, arr) => acc.filter((val) => arr.includes(val)),
    arrays[0]
  );
}

export function isNodeInSelection(
  node: Konva.Node,
  nodes: Konva.Node[]
): boolean {
  return nodes.some((selectedNode) => selectedNode.id() === node.id());
}

export function containsNodeDeep(
  nodes: Konva.Node[],
  target: Konva.Node
): boolean {
  for (const node of nodes) {
    if (node === target) return true;
    if (
      node.hasChildren?.() &&
      containsNodeDeep((node as unknown as Konva.Group).getChildren(), target)
    ) {
      return true;
    }
  }
  return false;
}

export function getSelectedNodesMetadata(transformer: Konva.Transformer): {
  width: number;
  height: number;
  nodes: string[];
} {
  const firstNode = transformer.getNodes()[0];
  const firstNodeClientRect = firstNode.getClientRect();

  const rectCoordsMin: Vector2d = {
    x: firstNodeClientRect.x,
    y: firstNodeClientRect.y,
  };
  const rectCoordsMax: Vector2d = {
    x: firstNodeClientRect.x + firstNodeClientRect.width,
    y: firstNodeClientRect.y + firstNodeClientRect.height,
  };

  const nodes = [];
  for (const node of transformer.getNodes()) {
    const clientRect = node.getClientRect();
    if (clientRect.x < rectCoordsMin.x) {
      rectCoordsMin.x = clientRect.x;
    }
    if (clientRect.y < rectCoordsMin.y) {
      rectCoordsMin.y = clientRect.y;
    }
    if (clientRect.x + clientRect.width > rectCoordsMax.x) {
      rectCoordsMax.x = clientRect.x + clientRect.width;
    }
    if (clientRect.y + clientRect.height > rectCoordsMax.y) {
      rectCoordsMax.y = clientRect.y + clientRect.height;
    }
    nodes.push(node.getAttrs().id as string);
  }

  return {
    width: rectCoordsMax.x - rectCoordsMin.x,
    height: rectCoordsMax.y - rectCoordsMin.y,
    nodes,
  };
}

export function getTargetAndSkipNodes(
  instance: Weave,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  e: KonvaEventObject<any, any>
) {
  const nodesSelectionPlugin =
    instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

  let skipNodes = [];
  let node: Konva.Node | undefined = undefined;
  if (
    e.type === 'dragmove' &&
    nodesSelectionPlugin &&
    nodesSelectionPlugin.getTransformer().nodes().length === 1
  ) {
    node = nodesSelectionPlugin.getTransformer().nodes()[0];
    skipNodes.push(node.getAttrs().id ?? '');
  }
  if (
    e.type === 'dragmove' &&
    nodesSelectionPlugin &&
    nodesSelectionPlugin.getTransformer().nodes().length > 1
  ) {
    const { nodes } = getSelectedNodesMetadata(
      nodesSelectionPlugin.getTransformer()
    );
    node = nodesSelectionPlugin.getTransformer();
    skipNodes = [...nodes];
  }
  if (e.type === 'transform') {
    node = e.target;
    skipNodes.push(node.getAttrs().id ?? '');
  }

  return { targetNode: node, skipNodes };
}

export function getVisibleNodesInViewport(
  stage: Konva.Stage,
  referenceLayer: Konva.Layer | Konva.Group | undefined
) {
  const scale = stage.scaleX();
  const stagePos = stage.position();
  const stageSize = {
    width: stage.width(),
    height: stage.height(),
  };

  // Calculate viewport rect in world coordinates
  const viewRect = {
    x: -stagePos.x / scale,
    y: -stagePos.y / scale,
    width: stageSize.width / scale,
    height: stageSize.height / scale,
  };

  const visibleNodes: Konva.Node[] = [];

  referenceLayer?.find('.node').forEach((node) => {
    if (!node.isVisible()) return;

    const box = node.getClientRect({
      relativeTo: stage,
      skipStroke: true,
      skipShadow: true,
    });
    const intersects =
      box.x + box.width > viewRect.x &&
      box.x < viewRect.x + viewRect.width &&
      box.y + box.height > viewRect.y &&
      box.y < viewRect.y + viewRect.height;

    if (intersects) {
      visibleNodes.push(node);
    }
  });

  return visibleNodes;
}

export function getClosestParentWithId(el: DOMElement): DOMElement {
  while (el) {
    if (el.id) return el;
    el = el.parentElement;
  }
  return null;
}

export function isInShadowDOM(el: DOMElement): boolean {
  return el?.getRootNode() instanceof ShadowRoot;
}

export function getTopmostShadowHost(el: DOMElement): ShadowRoot | null {
  let current = el;
  let root = current?.getRootNode();

  while (root instanceof ShadowRoot) {
    current = root.host;
    root = current.getRootNode();
  }

  return current?.shadowRoot || null;
}
