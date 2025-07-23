// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { isEmpty } from 'lodash';
import { Weave } from '@/weave';
import { type Logger } from 'pino';
import {
  type WeaveNodeFound,
  type WeavePosition,
  type WeaveStateElement,
  WEAVE_NODE_POSITION,
} from '@inditextech/weave-types';
import Konva from 'konva';

export class WeaveStateManager {
  private instance: Weave;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('state-manager');
    this.logger.debug('State manager created');
  }

  getInstanceRecursive(
    node: Konva.Node,
    filterNodes: string[] = []
  ): Konva.Node {
    const attributes = node.getAttrs();

    if (
      node.getParent() &&
      node.getParent()?.getAttrs().nodeType &&
      !['stage', 'layer', ...filterNodes].includes(
        node.getParent()?.getAttrs().nodeType
      )
    ) {
      return this.getInstanceRecursive(node.getParent() as Konva.Node);
    }

    if (attributes.id === 'mainLayer') {
      return this.instance.getMainLayer() as Konva.Node;
    }

    if (attributes.id === 'stage') {
      return this.instance.getMainLayer() as Konva.Node;
    }

    return node;
  }

  findNodeById(
    tree: WeaveStateElement,
    key: string,
    parent: WeaveStateElement | null = null,
    index = -1
  ): WeaveNodeFound {
    let found: {
      node: WeaveStateElement | null;
      parent: WeaveStateElement | null;
      index: number;
    } = {
      node: null,
      parent,
      index,
    };

    if (tree.key === key) {
      return { node: tree, parent, index };
    }

    if (Array.isArray(tree.props.children) && tree.props.children.length > 0) {
      tree.props.children.some((child, index) => {
        found = this.findNodeById(child, key, tree, index);
        return found.node;
      });
    }

    return found;
  }

  findNodesByType(
    tree: WeaveStateElement,
    nodeType: string
  ): WeaveStateElement[] {
    const found: WeaveStateElement[] = [];

    if (tree.type === nodeType) {
      found.push(tree);
      return found;
    }

    if (tree.props?.children && tree.props.children.length > 0) {
      tree.props.children.some((child) => {
        found.push(...this.findNodesByType(child, nodeType));
      });
    }

    return found;
  }

  getContainerNodes(tree: WeaveStateElement): WeaveStateElement[] {
    const found: WeaveStateElement[] = [];

    if (tree.props.containerId) {
      found.push(tree);
      return found;
    }

    if (tree.props?.children && tree.props.children.length > 0) {
      tree.props.children.some((child) => {
        found.push(...this.getContainerNodes(child));
      });
    }

    return found;
  }

  getNode(nodeKey: string): WeaveNodeFound {
    const state = this.instance.getStore().getState().weave;

    if (isEmpty(state)) {
      return { node: null, parent: null, index: -1 };
    }

    return this.findNodeById(state as WeaveStateElement, nodeKey);
  }

  addNode(
    node: WeaveStateElement,
    parentId = 'mainLayer',
    index: number | undefined = undefined
  ): void {
    const state = this.instance.getStore().getState();

    this.logger.info(
      { state: JSON.parse(JSON.stringify(state)) },
      'State before addNode'
    );

    if (isEmpty(state.weave)) {
      const msg = `State is empty, cannot add the node`;
      this.logger.warn({ node, parentId }, msg);
      return;
    }

    const { node: nodeState } = this.findNodeById(
      state.weave as WeaveStateElement,
      node.key
    );
    if (nodeState) {
      const msg = `Node with key [${node.key}] already exists, cannot add it`;
      this.logger.warn({ node, parentId }, msg);
      return;
    }

    const { node: parent } = this.findNodeById(
      state.weave as WeaveStateElement,
      parentId
    );
    if (!parent) {
      const msg = `Parent container with key [${node.key}] doesn't exists, cannot add it`;
      this.logger.warn({ node, parentId }, msg);
      return;
    }

    this.logger.info(
      { parent: JSON.parse(JSON.stringify(parent)) },
      'addNode: parent before init'
    );

    const newChildren = JSON.parse(JSON.stringify(parent.props.children ?? []));

    this.logger.info(
      { parent: JSON.parse(JSON.stringify(parent)) },
      'addNode: parent before add'
    );

    if (index) {
      newChildren?.splice(index, 0, node);
      for (let i = 0; i < newChildren.length; i++) {
        newChildren[i].props.zIndex = i;
      }
    }

    if (!index) {
      const childrenAmount = newChildren.length;
      node.props.zIndex = childrenAmount;

      const nodeToAdd = {
        ...node,
        props: {
          ...node.props,
          zIndex: childrenAmount,
        },
      };

      this.logger.info(
        { node: JSON.parse(JSON.stringify(nodeToAdd)) },
        'addNode: node to add'
      );

      newChildren.push(nodeToAdd);
    }

    if (typeof newChildren !== 'undefined') {
      parent.props.children = newChildren;
    }

    this.logger.info(
      { parent: JSON.parse(JSON.stringify(parent)) },
      'addNode: parent after add'
    );

    this.instance.emitEvent('onNodeAdded', node);
  }

  updateNode(node: WeaveStateElement): void {
    const state = this.instance.getStore().getState();

    this.logger.info(
      { state: JSON.parse(JSON.stringify(state)) },
      'State before updateNode'
    );

    if (isEmpty(state.weave)) {
      const msg = `State is empty, cannot update the node`;
      this.logger.warn({ node }, msg);
      return;
    }

    const { node: nodeState } = this.findNodeById(
      state.weave as WeaveStateElement,
      node.key
    );
    if (!nodeState) {
      const msg = `Node with key [${node.key}] doesn't exists, cannot update it`;
      this.logger.warn({ node }, msg);
      return;
    }

    this.logger.info(
      { node: JSON.parse(JSON.stringify(nodeState)) },
      'updateNode: before update'
    );

    const newNode = JSON.parse(JSON.stringify(nodeState));

    newNode.props = {
      ...newNode.props,
      ...node.props,
    };

    if (typeof newNode.props !== 'undefined') {
      nodeState.props = newNode.props;
    }

    this.logger.info(
      { node: JSON.parse(JSON.stringify(nodeState)) },
      'updateNode: after update'
    );

    this.instance.emitEvent('onNodeUpdated', node);
  }

  removeNode(node: WeaveStateElement): void {
    const state = this.instance.getStore().getState();

    this.logger.info(
      { stage: JSON.parse(JSON.stringify(state)) },
      'State before removeNode'
    );

    if (isEmpty(state.weave)) {
      const msg = `State is empty, cannot update the node`;
      this.logger.warn({ node }, msg);
      return;
    }

    const { node: nodeState, parent } = this.findNodeById(
      state.weave as WeaveStateElement,
      node.key
    );

    if (!nodeState) {
      const msg = `Node with key [${node.key}] doesn't exists, cannot remove it`;
      this.logger.warn({ node }, msg);
      return;
    }

    if (!parent) {
      const msg = `Parent doesn't exists, cannot remove it`;
      this.logger.warn({ node }, msg);
      return;
    }

    this.logger.info({ key: node.key }, 'removeNode: node to remove');

    this.logger.info(
      { parent: JSON.parse(JSON.stringify(parent)) },
      'removeNode: parent before remove'
    );

    const newChildren = JSON.parse(JSON.stringify(parent.props.children ?? []));

    for (let i = newChildren.length - 1; i >= 0; i--) {
      if (newChildren[i].key === node.key) {
        newChildren.splice(i, 1);
        break;
      }
    }

    for (let i = 0; i < newChildren.length; i++) {
      newChildren[i].props.zIndex = i;
    }

    if (typeof newChildren !== 'undefined') {
      parent.props.children = newChildren;
    }

    this.logger.info(
      { parent: JSON.parse(JSON.stringify(parent)) },
      'removeNode: parent after remove'
    );

    this.instance.emitEvent('onNodeRemoved', node);
  }

  removeNodes(nodes: WeaveStateElement[]): void {
    for (const node of nodes) {
      this.removeNode(node);
    }
  }

  moveNode(node: WeaveStateElement, position: WeavePosition): void {
    const state = this.instance.getStore().getState();

    this.logger.info(
      { stage: JSON.parse(JSON.stringify(state)) },
      'State before moveNode'
    );

    if (isEmpty(state.weave)) {
      const msg = `State is empty, cannot update the node`;
      this.logger.warn({ node }, msg);
      return;
    }

    const { node: nodeState, parent } = this.findNodeById(
      state.weave as WeaveStateElement,
      node.key
    );
    if (!nodeState) {
      const msg = `Node with key [${node.key}] doesn't exists, cannot update it`;
      this.logger.warn({ node }, msg);
      return;
    }

    this.logger.info(
      { parent: JSON.parse(JSON.stringify(parent)) },
      'moveNode: parent before move'
    );

    if (parent && parent.props.children) {
      const childrenAmount = parent.props.children.length;
      const nodeIndex = parent.props.children.findIndex(
        (child: WeaveStateElement) => child.key === node.key
      );

      const newChildren = JSON.parse(
        JSON.stringify(parent.props.children ?? [])
      );

      newChildren.splice(nodeIndex, 1);

      if (position === WEAVE_NODE_POSITION.UP) {
        newChildren.splice(nodeIndex + 1, 0, { ...node });
      }
      if (position === WEAVE_NODE_POSITION.DOWN) {
        newChildren.splice(nodeIndex - 1, 0, { ...node });
      }
      if (position === WEAVE_NODE_POSITION.FRONT) {
        newChildren.splice(childrenAmount - 1, 0, { ...node });
      }
      if (position === WEAVE_NODE_POSITION.BACK) {
        newChildren.splice(0, 0, { ...node });
      }

      for (let i = 0; i < newChildren.length; i++) {
        newChildren[i].props.zIndex = i;
      }

      if (typeof newChildren !== 'undefined') {
        parent.props.children = newChildren;
      }
    }

    this.logger.info(
      { parent: JSON.parse(JSON.stringify(parent)) },
      'moveNode: parent after move'
    );
  }

  getElementsTree(): WeaveStateElement[] {
    const state = this.instance.getStore().getState().weave;
    const jsonState = JSON.parse(JSON.stringify(state, null, 2));

    const mainLayer = jsonState.props?.children.find(
      (node: WeaveStateElement) => node.key === 'mainLayer'
    );

    if (!mainLayer) {
      return [];
    }

    if (!mainLayer.props?.children) {
      return [];
    }

    return mainLayer.props.children;
  }
}
