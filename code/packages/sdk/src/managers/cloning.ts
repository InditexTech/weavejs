// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { orderBy } from 'lodash';
import Konva from 'konva';
import { v4 as uuidv4 } from 'uuid';
import { Weave } from '@/weave';
import { type Logger } from 'pino';
import {
  type WeaveElementInstance,
  type WeaveStateElement,
} from '@inditextech/weave-types';
import type { WeaveNode } from '@/nodes/node';

export class WeaveCloningManager {
  private instance: Weave;
  private logger: Logger;
  private clones: Konva.Node[] = [];

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('cloning-manager');
    this.logger.debug('Cloning manager created');
  }

  nodesToGroupSerialized(instancesToClone: Konva.Node[]):
    | {
        serializedNodes: WeaveStateElement[];
        minPoint: Konva.Vector2d;
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

    const minPoint: Konva.Vector2d = { x: Infinity, y: Infinity };
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

      if (nodeHandler) {
        const serialized: WeaveStateElement = nodeHandler.serialize(node);
        serializedNodes.push(serialized);
      }
    });

    newGroup.destroy();

    return { serializedNodes, minPoint };
  }

  private recursivelyUpdateKeys(nodes: WeaveStateElement[]) {
    for (const child of nodes) {
      const newNodeId = uuidv4();
      child.key = newNodeId;
      child.props.id = newNodeId;
      if (child.props.children) {
        this.recursivelyUpdateKeys(child.props.children);
      }
    }
  }

  cloneNode(targetNode: Konva.Node): Konva.Node | undefined {
    const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
      targetNode.getAttrs().nodeType
    );

    if (!nodeHandler) {
      return undefined;
    }

    const parent: Konva.Container = targetNode.getParent() as Konva.Container;

    const serializedNode = nodeHandler.serialize(
      targetNode as WeaveElementInstance
    );

    this.recursivelyUpdateKeys(serializedNode.props.children ?? []);

    const newNodeId = uuidv4();
    serializedNode.key = newNodeId;
    serializedNode.props.id = newNodeId;

    const realParent = this.instance.getInstanceRecursive(parent);

    this.instance.addNode(serializedNode, realParent?.getAttrs().id, {
      emitUserChangeEvent: false,
    });

    return this.instance.getStage().findOne(`#${newNodeId}`);
  }

  addClone(node: Konva.Node) {
    this.clones.push(node);
  }

  removeClone(node: Konva.Node) {
    this.clones = this.clones.filter((c) => c !== node);
  }

  getClones() {
    return this.clones;
  }

  isClone(node: Konva.Node) {
    return this.clones.find((c) => c === node);
  }

  cleanupClones() {
    this.clones = [];
  }
}
