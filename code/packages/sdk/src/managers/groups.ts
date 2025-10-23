// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { isEmpty, orderBy } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import {
  type WeaveElementInstance,
  type WeaveStateElement,
  WEAVE_NODE_LAYER_ID,
} from '@inditextech/weave-types';
import { Weave } from '@/weave';
import { type Logger } from 'pino';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveNode } from '@/nodes/node';
import type { WeaveGroupNode } from '@/nodes/group/group';
import {
  WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY,
  WeaveNodesMultiSelectionFeedbackPlugin,
} from '@/index.node';

export class WeaveGroupsManager {
  private instance: Weave;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('groups-manager');
    this.logger.debug('Groups manager created');
  }

  private allNodesInSameParent(nodes: WeaveStateElement[]) {
    const stage = this.instance.getStage();

    if (nodes.length === 0) {
      return { realNodes: [], parentId: undefined };
    }

    const framesIds: string[] = [];
    nodes.forEach((node: WeaveStateElement) => {
      const nodeInstance = stage.findOne(`#${node.key}`);
      if (nodeInstance && nodeInstance.getAttrs().nodeType === 'frame') {
        framesIds.push(node.key);
      }
    });

    let realNodes: WeaveStateElement[] = [];
    if (framesIds.length > 0) {
      for (const node of nodes) {
        const nodeInstance = stage.findOne(`#${node.key}`);
        if (framesIds.includes(node.key)) {
          realNodes.push(node);
        }
        if (
          !framesIds.includes(node.key) &&
          nodeInstance &&
          !framesIds.includes(nodeInstance.getParent()?.getAttrs().nodeId)
        ) {
          realNodes.push(node);
        }
      }
    }

    if (realNodes.length === 0) {
      realNodes = nodes;
    }

    const parentIds: string[] = [];
    for (const node of realNodes) {
      const nodeInstance = stage.findOne(`#${node.key}`);
      if (nodeInstance) {
        const parentId = nodeInstance.getParent()?.getAttrs().id;
        if (parentId && !parentIds.includes(parentId)) {
          parentIds.push(parentId);
        }
      }
    }

    const nodeInstance = stage.findOne(`#${realNodes[0].props.id}`);
    const nodeId = nodeInstance?.getParent()?.getAttrs().nodeId;

    let parentId = nodeInstance?.getParent()?.getAttrs().id;
    if (parentIds.length === 1 && nodeId) {
      parentId = nodeId;
    }
    if (parentIds.length > 1) {
      parentId = undefined;
    }

    return { realNodes, parentId };
  }

  group(nodes: WeaveStateElement[]): void {
    this.logger.debug({ nodes }, 'Grouping nodes');

    const stage = this.instance.getStage();
    const state = this.instance.getStore().getState();
    const mainLayer = this.instance.getMainLayer();

    if (isEmpty(state.weave)) {
      this.logger.warn({ nodes }, 'State is empty, cannot group nodes');
      return;
    }

    const { realNodes, parentId } = this.allNodesInSameParent(nodes);

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.hide();
      selectionPlugin.setSelectedNodes([]);
    }

    let parentNodeId = parentId ?? WEAVE_NODE_LAYER_ID;
    if (typeof parentNodeId === 'undefined') {
      parentNodeId = WEAVE_NODE_LAYER_ID;
    }

    const parentLayer = stage.findOne(`#${parentNodeId}`) as
      | Konva.Layer
      | Konva.Group
      | undefined;

    const groupId = uuidv4();
    const groupInstance = new Konva.Group({
      id: uuidv4(),
      nodeType: 'group',
      draggable: true,
    });

    parentLayer?.add(groupInstance);

    const groupHandler = this.instance.getNodeHandler<WeaveGroupNode>('group');
    if (groupHandler) {
      const groupNode = groupHandler.create(groupId, {
        draggable: true,
      });
      this.instance.addNode(groupNode, parentNodeId);
    }

    const nodesWithZIndex = realNodes
      .map((node) => {
        const instance = mainLayer?.findOne(`#${node.key}`) as
          | Konva.Shape
          | Konva.Group
          | undefined;
        return { node, zIndex: instance?.zIndex() ?? -1 };
      })
      .filter((node) => node.zIndex !== -1);

    const sortedNodesByZIndex = orderBy(
      nodesWithZIndex,
      ['zIndex'],
      ['asc']
    ).map((node) => node.node);

    for (const [index, node] of sortedNodesByZIndex.entries()) {
      if (node.type === 'group') {
        const groupChild = node as WeaveStateElement;
        const konvaGroup = mainLayer?.findOne(`#${groupChild.key}`) as
          | Konva.Group
          | undefined;
        if (konvaGroup) {
          const nodePos = konvaGroup.getAbsolutePosition();
          const nodeRotation = konvaGroup.getAbsoluteRotation();

          konvaGroup.moveTo(groupInstance);
          konvaGroup.setAbsolutePosition(nodePos);
          konvaGroup.rotation(nodeRotation);
          konvaGroup.zIndex(index);
          konvaGroup.setAttr('id', uuidv4());
          konvaGroup.setAttr('draggable', false);

          const handler = this.instance.getNodeHandler<WeaveGroupNode>('group');

          if (handler) {
            const stateNode = handler.serialize(konvaGroup);
            this.instance.addNode(stateNode, groupId);
          }
        }
        continue;
      }

      const konvaNode = mainLayer?.findOne(`#${node.key}`) as
        | Konva.Shape
        | undefined;
      if (konvaNode) {
        const nodePos = konvaNode.getAbsolutePosition();
        const nodeRotation = konvaNode.getAbsoluteRotation();

        konvaNode.moveTo(groupInstance);
        konvaNode.setAbsolutePosition(nodePos);
        konvaNode.rotation(nodeRotation);
        konvaNode.zIndex(index);
        konvaNode.setAttr('id', uuidv4());
        konvaNode.setAttr('draggable', false);

        const handler = this.instance.getNodeHandler<WeaveNode>(
          konvaNode.getAttrs().nodeType
        );

        if (handler) {
          const stateNode = handler.serialize(konvaNode);
          this.instance.addNode(stateNode, groupId);
        }
      }
    }

    this.instance.removeNodes(sortedNodesByZIndex);

    groupInstance.destroy();

    const groupNode = stage.findOne(`#${groupId}`);

    if (groupHandler && groupNode) {
      this.instance.updateNode(
        groupHandler.serialize(groupNode as WeaveElementInstance)
      );
    }

    setTimeout(() => {
      this.getNodesMultiSelectionFeedbackPlugin()?.cleanupSelectedHalos();

      const groupNode = stage.findOne(`#${groupId}`) as
        | Konva.Layer
        | Konva.Group
        | undefined;
      const selectionPlugin =
        this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
      if (groupNode && selectionPlugin) {
        const tr = selectionPlugin.getTransformer();
        selectionPlugin.setSelectedNodes([groupNode]);
        tr.show();
        tr.forceUpdate();
      }
    }, 0);
  }

  unGroup(group: WeaveStateElement): void {
    this.logger.debug({ group }, 'Un-grouping group');

    const stage = this.instance.getStage();
    const konvaGroup = stage.findOne(`#${group.props.id}`) as
      | Konva.Group
      | undefined;

    if (!konvaGroup) {
      this.logger.debug(
        { group },
        "Group instance doesn't exists, cannot un-group"
      );
      return;
    }

    let nodeId: string | undefined = undefined;
    let newLayer: Konva.Layer | Konva.Group | undefined =
      this.instance.getMainLayer();
    if (
      konvaGroup.getParent() &&
      konvaGroup.getParent() instanceof Konva.Group &&
      konvaGroup.getParent()?.getAttrs().nodeId
    ) {
      nodeId = konvaGroup.getParent()?.getAttrs().nodeId;
      newLayer = konvaGroup.getParent() as Konva.Group;
    }
    if (
      konvaGroup.getParent() &&
      konvaGroup.getParent() instanceof Konva.Group &&
      !konvaGroup.getParent()?.getAttrs().nodeId
    ) {
      newLayer = konvaGroup.getParent() as Konva.Group;
    }
    if (
      konvaGroup.getParent() &&
      konvaGroup.getParent() instanceof Konva.Layer
    ) {
      newLayer = konvaGroup.getParent() as Konva.Layer;
    }

    if (!newLayer) {
      this.logger.debug(
        { group },
        "Group target container doesn't exists, cannot un-group"
      );
      return;
    }

    const newLayerChildrenAmount = newLayer?.getChildren().length ?? 0;

    let newChildId = undefined;
    const children = [...konvaGroup.getChildren()];
    for (const child of children) {
      const absPos = child.getAbsolutePosition();
      const absScale = child.getAbsoluteScale();
      const absRotation = child.getAbsoluteRotation();

      child.moveTo(newLayer);

      child.position({ x: 0, y: 0 });
      child.scale({ x: 1, y: 1 });
      child.rotation(0);
      child.offset({ x: 0, y: 0 });

      child.setAbsolutePosition(absPos);
      child.scale({
        x: absScale.x / stage.scaleX(),
        y: absScale.y / stage.scaleY(),
      });
      child.rotation(absRotation);

      child.zIndex(newLayerChildrenAmount - 1 + child.zIndex());
      child.setAttr('draggable', true);
      newChildId = child.getAttrs().id;

      const handler = this.instance.getNodeHandler<WeaveNode>(
        child.getAttrs().nodeType
      );
      if (handler) {
        // Serialize the child node and add it to the instance
        const node = handler.serialize(child);
        const newNodeId = uuidv4();
        const oldId = node.key;

        node.key = newNodeId;
        node.props.id = newNodeId;
        for (const prop of Object.keys(node.props)) {
          if (typeof node.props[prop] === 'string') {
            node.props[prop] = node.props[prop].replace(oldId, newNodeId);
          }
        }

        this.instance.addNode(node, nodeId ?? newLayer.getAttrs().id);
      }

      child.destroy();
    }

    const groupHandler = this.instance.getNodeHandler<WeaveNode>('group');
    if (groupHandler) {
      const groupNode = groupHandler.serialize(konvaGroup);
      this.instance.removeNode(groupNode);
    }

    setTimeout(() => {
      this.getNodesMultiSelectionFeedbackPlugin()?.cleanupSelectedHalos();

      const firstElement = newLayer.findOne(`#${newChildId}`) as
        | Konva.Node
        | undefined;
      const selectionPlugin =
        this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
      if (firstElement && selectionPlugin) {
        selectionPlugin.setSelectedNodes([firstElement]);
      }
    }, 0);
  }

  extractTransformFromMatrix(m: number[]) {
    const a = m[0],
      b = m[1],
      c = m[2],
      d = m[3],
      e = m[4],
      f = m[5];

    const scaleX = Math.sqrt(a * a + b * b);
    const scaleY = Math.sqrt(c * c + d * d);

    const rotation = Math.atan2(b, a) * (180 / Math.PI); // in degrees

    return {
      x: e,
      y: f,
      scaleX,
      scaleY,
      rotation,
    };
  }

  getNodesMultiSelectionFeedbackPlugin() {
    return this.instance.getPlugin<WeaveNodesMultiSelectionFeedbackPlugin>(
      WEAVE_NODES_MULTI_SELECTION_FEEDBACK_PLUGIN_KEY
    );
  }
}
