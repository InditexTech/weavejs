// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { Weave } from '@/weave';
import { type Logger } from 'pino';
import type {
  WeaveMousePointInfo,
  WeaveMousePointInfoSimple,
} from '@inditextech/weave-types';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { getBoundingBox } from '@/utils';

export class WeaveTargetingManager {
  private instance: Weave;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('targeting-manager');
    this.logger.debug('Targeting manager created');
  }

  resolveNode(node: Konva.Node): Konva.Node | undefined {
    const stage = this.instance.getStage();

    const nodeAttrs = node.getAttrs();

    // Is an internal node container, continue to its parent
    if (nodeAttrs.nodeId) {
      const parentNode = stage.findOne(`#${nodeAttrs.nodeId}`);

      if (!parentNode) {
        return undefined;
      }

      return this.resolveNode(parentNode);
    }
    // Is a node and not a layer
    if (nodeAttrs.nodeType && nodeAttrs.nodeType !== 'layer') {
      return node;
    }
    return undefined;
  }

  pointIntersectsElement(point?: Konva.Vector2d): Konva.Node | null {
    const stage = this.instance.getStage();
    const relativeMousePointer = point
      ? point
      : stage.getPointerPosition() ?? { x: 0, y: 0 };

    const mainLayer = this.instance.getMainLayer();

    if (!mainLayer) {
      return null;
    }

    const intersectedNode = mainLayer.getIntersection(relativeMousePointer);

    return intersectedNode;
  }

  isBoundingBoxIntersecting(nodeA: Konva.Node, nodeB: Konva.Node) {
    const stage = this.instance.getStage();
    const a = nodeA.getClientRect({ relativeTo: stage });
    const b = nodeB.getClientRect({ relativeTo: stage });

    return !(
      (
        a.x + a.width < b.x || // A is to the left of B
        a.x > b.x + b.width || // A is to the right of B
        a.y + a.height < b.y || // A is above B
        a.y > b.y + b.height
      ) // A is below B
    );
  }

  isNodesBoundingBoxIntersecting(nodes: Konva.Node[], nodeB: Konva.Node) {
    const stage = this.instance.getStage();
    const a = getBoundingBox(nodes, {
      relativeTo: stage,
    });
    const b = nodeB.getClientRect({ relativeTo: stage });

    return !(
      (
        a.x + a.width < b.x || // A is to the left of B
        a.x > b.x + b.width || // A is to the right of B
        a.y + a.height < b.y || // A is above B
        a.y > b.y + b.height
      ) // A is below B
    );
  }

  nodeIntersectsContainerElement(
    node: Konva.Node | Konva.Transformer,
    actualLayer?: Konva.Layer | Konva.Group
  ): Konva.Node | undefined {
    const stage = this.instance.getStage();
    const containers = stage.find('.containerCapable');

    const intersections: Konva.Node[] = [];

    if (node instanceof Konva.Transformer) {
      const transformerNodes = node.nodes();
      const containersInSelection = [];
      for (const actualNode of transformerNodes) {
        if (actualNode.getParent()?.getAttrs().nodeId) {
          const realParent = stage.findOne(
            `#${actualNode.getParent()?.getAttrs().nodeId}`
          );
          if (realParent) {
            containersInSelection.push(realParent.getAttrs().id ?? '');
          }
        }
      }

      const containersInSelectionSet = new Set(containersInSelection);
      const uniqueContainersInSelection = Array.from(containersInSelectionSet);

      for (const container of containers) {
        const intersects = this.isNodesBoundingBoxIntersecting(
          transformerNodes,
          container
        );

        if (
          intersects &&
          !uniqueContainersInSelection.includes(container.getAttrs().id ?? '')
        ) {
          intersections.push(container);
        }
      }
    } else {
      let nodeActualContainer: Konva.Node | undefined =
        node.getParent() as Konva.Node;

      if (nodeActualContainer?.getAttrs().nodeId) {
        const realParent = stage.findOne(
          `#${nodeActualContainer.getAttrs().nodeId}`
        );

        if (realParent) {
          nodeActualContainer = realParent;
        }
      }

      for (const container of containers) {
        const intersects = this.isBoundingBoxIntersecting(node, container);
        if (intersects && container.getAttrs().id !== node.getAttrs().id) {
          intersections.push(container);
        }
      }
    }

    let intersectedNode: Konva.Node | undefined = undefined;
    for (const node of intersections) {
      if (node.getAttrs().nodeId) {
        const parent = stage.findOne(`#${node.getAttrs().nodeId}`);
        if (!parent) {
          continue;
        }
        const resolvedNode = this.resolveNode(parent);
        if (
          resolvedNode &&
          resolvedNode.getAttrs().id !== actualLayer?.getAttrs().id
        ) {
          intersectedNode = parent;
        }
        continue;
      }
      if (node.getAttrs().id !== actualLayer?.getAttrs().id) {
        intersectedNode = node;
        continue;
      }
    }

    return intersectedNode;
  }

  getMousePointer(point?: Konva.Vector2d): WeaveMousePointInfo {
    this.logger.debug({ point }, 'getMousePointer');
    const stage = this.instance.getStage();
    const mainLayer = this.instance.getMainLayer();

    let relativeMousePointer =
      typeof point !== 'undefined'
        ? point
        : mainLayer?.getRelativePointerPosition() ?? { x: 0, y: 0 };
    let measureContainer: Konva.Layer | Konva.Group | undefined = mainLayer;
    let container: Konva.Layer | Konva.Node | undefined = mainLayer;

    const nodesSelection =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelection) {
      nodesSelection.disable();
    }

    const dummyRect = new Konva.Rect({
      width: 10,
      height: 10,
      x: relativeMousePointer.x,
      y: relativeMousePointer.y,
    });
    mainLayer?.add(dummyRect);

    const intersectedNode = this.nodeIntersectsContainerElement(dummyRect);
    if (intersectedNode) {
      const containerOfNode = stage.findOne(
        `#${intersectedNode.getAttrs().containerId}`
      ) as Konva.Group | undefined;
      if (containerOfNode) {
        container = intersectedNode;
        measureContainer = containerOfNode;
      }
    }

    if (
      typeof point === 'undefined' &&
      container?.getAttrs().nodeType !== 'layer'
    ) {
      relativeMousePointer =
        measureContainer?.getRelativePointerPosition() ?? relativeMousePointer;
    }

    if (
      typeof point === 'undefined' &&
      container?.getAttrs().nodeType === 'layer'
    ) {
      relativeMousePointer = measureContainer?.getRelativePointerPosition() ?? {
        x: 0,
        y: 0,
      };
    }

    if (nodesSelection) {
      nodesSelection.enable();
    }

    dummyRect.destroy();

    return { mousePoint: relativeMousePointer, container, measureContainer };
  }

  getMousePointerRelativeToContainer(
    container: Konva.Node | Konva.Layer
  ): WeaveMousePointInfoSimple {
    const relativeMousePointer = container.getRelativePointerPosition() ?? {
      x: 0,
      y: 0,
    };

    return { mousePoint: relativeMousePointer, container };
  }
}
