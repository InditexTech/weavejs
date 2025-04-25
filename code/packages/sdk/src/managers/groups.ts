// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { isEmpty, orderBy } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import {
  WeaveStateElement,
  WEAVE_NODE_LAYER_ID,
} from '@inditextech/weave-types';
import { Weave } from '@/weave';
import { Logger } from 'pino';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';

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
      return { allInSame: false, nodeId: undefined, parentId: undefined };
    }

    let allInSame = true;
    const nodeInstance = stage.findOne(`#${nodes[0].props.id}`);
    const parentId = nodeInstance?.getParent()?.getAttrs().id;
    const nodeId = nodeInstance?.getParent()?.getAttrs().nodeId;
    for (const node of nodes) {
      const nodeInstance = stage.findOne(`#${node.props.id}`);
      const nodeParentId = nodeInstance?.getParent()?.getAttrs().id;
      if (nodeParentId !== parentId) {
        allInSame = false;
        break;
      }
    }

    return { allInSame, nodeId, parentId };
  }

  group(nodes: WeaveStateElement[]) {
    this.logger.debug({ nodes }, 'Grouping nodes');

    const stage = this.instance.getStage();
    const state = this.instance.getStore().getState();
    const mainLayer = this.instance.getMainLayer();

    if (isEmpty(state.weave)) {
      this.logger.warn({ nodes }, 'State is empty, cannot group nodes');
      return;
    }

    const { allInSame, nodeId, parentId } = this.allNodesInSameParent(nodes);

    if (!allInSame) {
      this.logger.warn(
        { nodes },
        'Not all nodes are in the same container, cannot group them'
      );
      return;
    }

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

    const groupHandler = this.instance.getNodeHandler('group');
    const groupNode = groupHandler.createNode(groupId, {
      draggable: true,
    });
    this.instance.addNode(groupNode, nodeId ?? parentNodeId);

    const nodesWithZIndex = nodes
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

          const handler = this.instance.getNodeHandler('group');
          const stateNode = handler.toNode(konvaGroup);

          this.instance.addNode(stateNode, groupId);
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

        const handler = this.instance.getNodeHandler(
          konvaNode.getAttrs().nodeType
        );
        const stateNode = handler.toNode(konvaNode);

        this.instance.addNode(stateNode, groupId);
      }
    }

    this.instance.removeNodes(sortedNodesByZIndex);

    groupInstance.destroy();

    setTimeout(() => {
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

  unGroup(group: WeaveStateElement) {
    this.logger.warn({ group }, 'Un-grouping group');

    const stage = this.instance.getStage();
    const konvaGroup = stage.findOne(`#${group.props.id}`) as
      | Konva.Group
      | undefined;

    if (!konvaGroup) {
      this.logger.warn(
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
      this.logger.warn(
        { group },
        "Group target container doesn't exists, cannot un-group"
      );
      return;
    }

    const newLayerChildrenAmount = newLayer?.getChildren().length ?? 0;

    let newChildId = undefined;
    const children = [...konvaGroup.getChildren()];
    for (const child of children) {
      const nodePos = child.getAbsolutePosition();
      const nodeRotation = child.getAbsoluteRotation();

      child.moveTo(newLayer);
      child.setAbsolutePosition(nodePos);
      child.rotation(nodeRotation);
      child.zIndex(newLayerChildrenAmount - 1 + child.zIndex());
      child.setAttr('id', uuidv4());
      child.setAttr('draggable', true);
      newChildId = child.getAttrs().id;

      const handler = this.instance.getNodeHandler(child.getAttrs().nodeType);
      const node = handler.toNode(child);

      this.instance.addNode(node, nodeId ?? newLayer.getAttrs().id);
      child.destroy();
    }

    const groupHandler = this.instance.getNodeHandler('group');
    const groupNode = groupHandler.toNode(konvaGroup);
    this.instance.removeNode(groupNode);

    setTimeout(() => {
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
}
