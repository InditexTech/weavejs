// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { orderBy } from 'lodash';
import Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
import { Weave } from '@/weave';
import { type Vector2d } from 'konva/lib/types';
import { type Logger } from 'pino';
import { type WeaveStateElement } from '@inditextech/weave-types';
import type { WeaveNode } from '@/nodes/node';

export class WeaveCloningManager {
  private instance: Weave;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('cloning-manager');
    this.logger.debug('Cloning manager created');
  }

  nodesToGroupSerialized(instancesToClone: Konva.Node[]):
    | {
        serializedNodes: WeaveStateElement[];
        minPoint: Vector2d;
      }
    | undefined {
    if (instancesToClone.length === 0) {
      return;
    }

    const groupId = uuidv4();
    const newGroup = new Konva.Group({
      id: groupId,
    });

    const nodesWithZIndex = instancesToClone
      .map((node) => ({ node, zIndex: node.zIndex() }))
      .filter((node) => node.zIndex !== -1);

    const sortedNodesByZIndex = orderBy(
      nodesWithZIndex,
      ['zIndex'],
      ['asc']
    ).map((node) => node.node);

    for (const [index, node] of sortedNodesByZIndex.entries()) {
      const nodeAttrs = node.getAttrs();

      if (nodeAttrs.type === 'group') {
        const clonedNode: Konva.Group = node.clone({
          id: uuidv4(),
          type: 'group',
        });

        const nodePos = clonedNode.getAbsolutePosition();
        const nodeRotation = clonedNode.getAbsoluteRotation();

        const parent = node.getParent();
        // Is a Container (frame)
        if (node.getAttrs().nodeId) {
          const realParent = this.instance
            .getStage()
            .findOne(`#${node.getAttrs().nodeId}`);
          if (realParent) {
            nodePos.x += realParent.x();
            nodePos.y += realParent.y();
          }
        }
        // Its parent is a Container (frame)
        if (parent && parent.getAttrs().nodeId) {
          const realParent = this.instance
            .getStage()
            .findOne(`#${parent.getAttrs().nodeId}`);
          if (realParent) {
            nodePos.x += realParent.x();
            nodePos.y += realParent.y();
          }
        }

        clonedNode.moveTo(newGroup);
        clonedNode.zIndex(index);
        clonedNode.setAbsolutePosition(nodePos);
        clonedNode.rotation(nodeRotation);

        continue;
      }

      const clonedNode = node.clone({
        id: uuidv4(),
      });

      const nodePos = clonedNode.getAbsolutePosition();
      const nodeRotation = clonedNode.getAbsoluteRotation();

      const parent = node.getParent();
      // Is a Container (frame)
      if (node.getAttrs().nodeId) {
        const realParent = this.instance
          .getStage()
          .findOne(`#${node.getAttrs().nodeId}`);
        if (realParent) {
          nodePos.x += realParent.x();
          nodePos.y += realParent.y();
        }
      }
      // Its parent is a Container (frame)
      if (parent && parent.getAttrs().nodeId) {
        const realParent = this.instance
          .getStage()
          .findOne(`#${parent.getAttrs().nodeId}`);
        if (realParent) {
          nodePos.x += realParent.x();
          nodePos.y += realParent.y();
        }
      }

      clonedNode.moveTo(newGroup);
      clonedNode.zIndex(index);
      clonedNode.setAbsolutePosition(nodePos);
      clonedNode.rotation(nodeRotation);
    }

    const minPoint: Vector2d = { x: Infinity, y: Infinity };
    const serializedNodes: WeaveStateElement[] = [];
    newGroup.getChildren().forEach((node) => {
      const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
        node.getAttrs().nodeType
      );

      const nodePos = node.getClientRect();

      if (nodePos.x < minPoint.x) {
        minPoint.x = nodePos.x;
      }
      if (nodePos.y < minPoint.y) {
        minPoint.y = nodePos.y;
      }
      const serialized: WeaveStateElement = nodeHandler.serialize(node);
      serializedNodes.push(serialized);
    });

    newGroup.destroy();

    return { serializedNodes, minPoint };
  }

  cloneNodes(
    instancesToClone: Konva.Node[],
    targetContainer: Konva.Group | Konva.Layer | undefined,
    onPoint: Vector2d
  ): void {
    if (instancesToClone.length === 0) {
      return;
    }

    if (!targetContainer) {
      return;
    }

    const groupId = uuidv4();
    const newGroup = new Konva.Group({
      id: groupId,
    });

    targetContainer.add(newGroup);

    const nodesWithZIndex = instancesToClone
      .map((node) => ({ node, zIndex: node.zIndex() }))
      .filter((node) => node.zIndex !== -1);

    const sortedNodesByZIndex = orderBy(
      nodesWithZIndex,
      ['zIndex'],
      ['asc']
    ).map((node) => node.node);

    for (const [index, node] of sortedNodesByZIndex.entries()) {
      const nodeAttrs = node.getAttrs();

      if (nodeAttrs.type === 'group') {
        const clonedNode: Konva.Group = node.clone({
          id: uuidv4(),
          type: 'group',
        });

        const nodePos = clonedNode.getAbsolutePosition();
        const nodeRotation = clonedNode.getAbsoluteRotation();

        const parent = node.getParent();
        if (
          parent &&
          parent.getAttrs().nodeId &&
          !parent.getAttrs().containerId
        ) {
          const realParent = this.instance
            .getStage()
            .findOne(`#${parent.getAttrs().nodeId}`);
          if (realParent) {
            nodePos.x += realParent.x();
            nodePos.y += realParent.y();
          }
        }

        clonedNode.moveTo(newGroup);
        clonedNode.zIndex(index);
        clonedNode.setAbsolutePosition(nodePos);
        clonedNode.rotation(nodeRotation);

        continue;
      }

      const clonedNode = node.clone({
        id: uuidv4(),
      });

      const nodePos = clonedNode.getAbsolutePosition();
      const nodeRotation = clonedNode.getAbsoluteRotation();

      const parent = node.getParent();
      if (
        parent &&
        parent.getAttrs().nodeId &&
        !parent.getAttrs().containerId
      ) {
        const realParent = this.instance
          .getStage()
          .findOne(`#${parent.getAttrs().nodeId}`);
        if (realParent) {
          nodePos.x += realParent.x();
          nodePos.y += realParent.y();
        }
      }

      clonedNode.moveTo(newGroup);
      clonedNode.zIndex(index);
      clonedNode.setAbsolutePosition(nodePos);
      clonedNode.rotation(nodeRotation);
    }

    const actualPos = newGroup.getClientRect({ relativeTo: targetContainer });

    newGroup.x(onPoint.x - actualPos.x);
    newGroup.y(onPoint.y - actualPos.y);

    const groupChildren = [...newGroup.getChildren()];
    for (const [index, node] of groupChildren.entries()) {
      const nodePos = node.getAbsolutePosition();
      const nodeRotation = node.getAbsoluteRotation();

      node.moveTo(targetContainer);
      node.zIndex(index);
      node.setAbsolutePosition(nodePos);
      node.rotation(nodeRotation);

      const handler = this.instance.getNodeHandler<WeaveNode>(
        node.getAttrs().nodeType
      );
      const stateNode = handler.serialize(node);

      this.instance.addNode(stateNode, targetContainer.getAttrs().id);
      node.destroy();
    }

    newGroup.destroy();
  }
}
