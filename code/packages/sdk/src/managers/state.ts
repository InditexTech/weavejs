// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { isEmpty } from 'lodash';
import { Weave } from '@/weave';
import { type Logger } from 'pino';
import {
  type WeaveElementAttributes,
  type WeaveNodeFound,
  type WeavePosition,
  type WeaveStateElement,
  WEAVE_NODE_POSITION,
} from '@inditextech/weave-types';
import Konva from 'konva';
import { getYjsDoc } from '@syncedstore/core';

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

    const doc = getYjsDoc(state);

    doc.transact(() => {
      if (!parent.props.children) {
        parent.props.children = [];
      }

      if (index) {
        parent.props.children.splice(index, 0, node);
        for (let i = 0; i < parent.props.children.length; i++) {
          parent.props.children[i].props.zIndex = i;
        }
      }

      if (!index) {
        const childrenAmount = parent.props.children.length;

        const nodeToAdd = {
          ...node,
          props: {
            ...node.props,
            zIndex: childrenAmount,
          },
        };

        parent.props.children.push(nodeToAdd);
      }

      this.instance.emitEvent('onNodeAdded', node);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deepSyncSyncedStore(target: any, source: WeaveElementAttributes) {
    // Remove fields not in source
    for (const key in target) {
      if (!(key in source)) {
        delete target[key];
      }
    }

    // Update or add fields from source
    for (const key in source) {
      const srcVal = source[key];
      const tgtVal = target[key];

      const bothAreObjects = this.isObject(srcVal) && this.isObject(tgtVal);

      if (bothAreObjects && !Array.isArray(srcVal)) {
        // Recurse into nested object
        this.deepSyncSyncedStore(tgtVal, srcVal);
      } else if (Array.isArray(srcVal)) {
        // Sync array by item position
        this.syncArray(target, key, srcVal);
      } else {
        // Primitive or different type → replace
        if (tgtVal !== srcVal) {
          target[key] = srcVal;
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  syncArray(target: any, key: string, sourceArr: any[]) {
    const tgtArr = target[key];
    if (!Array.isArray(tgtArr)) {
      target[key] = [...sourceArr]; // replace if not already an array
      return;
    }

    // Truncate or extend
    while (tgtArr.length > sourceArr.length) tgtArr.pop();
    for (let i = 0; i < sourceArr.length; i++) {
      const srcItem = sourceArr[i];
      const tgtItem = tgtArr[i];

      if (this.isObject(srcItem) && this.isObject(tgtItem)) {
        this.deepSyncSyncedStore(tgtItem, srcItem);
      } else if (tgtItem !== srcItem) {
        tgtArr[i] = srcItem;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isObject(val: any) {
    return typeof val === 'object' && val !== null;
  }

  updateNode(node: WeaveStateElement): void {
    const state = this.instance.getStore().getState();

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

    const doc = getYjsDoc(state);

    doc.transact(() => {
      this.deepSyncSyncedStore(nodeState.props, node.props);
    });

    this.instance.emitEvent('onNodeUpdated', node);
  }

  removeNode(node: WeaveStateElement): void {
    const state = this.instance.getStore().getState();

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

    const doc = getYjsDoc(state);

    doc.transact(() => {
      if (parent.props.children) {
        for (let i = parent.props.children.length - 1; i >= 0; i--) {
          if (parent.props.children[i].key === node.key) {
            parent.props.children.splice(i, 1);
            break;
          }
        }

        for (let i = 0; i < parent.props.children.length; i++) {
          parent.props.children[i].props.zIndex = i;
        }

        this.instance.emitEvent('onNodeRemoved', node);
      }
    });
  }

  removeNodes(nodes: WeaveStateElement[]): void {
    for (const node of nodes) {
      this.removeNode(node);
    }
  }

  moveNode(node: WeaveStateElement, position: WeavePosition): void {
    const state = this.instance.getStore().getState();

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

    if (!parent) {
      const msg = `Parent doesn't exists, cannot move it`;
      this.logger.warn({ node }, msg);
      return;
    }

    if (parent.props.children) {
      const childrenAmount = parent.props.children.length;
      const nodeIndex = parent.props.children.findIndex(
        (child: WeaveStateElement) => child.key === node.key
      );

      if (nodeIndex === -1) {
        const msg = `Element doesn't exists on parent, cannot move it`;
        this.logger.warn({ node }, msg);
        return;
      }

      const doc = getYjsDoc(state);

      doc.transact(() => {
        if (parent.props.children) {
          const item = JSON.parse(
            JSON.stringify(parent.props.children[nodeIndex])
          );
          parent.props.children.splice(nodeIndex, 1);

          if (item && position === WEAVE_NODE_POSITION.UP) {
            parent.props.children.splice(nodeIndex + 1, 0, item);
          }
          if (item && position === WEAVE_NODE_POSITION.DOWN) {
            parent.props.children.splice(nodeIndex - 1, 0, item);
          }
          if (item && position === WEAVE_NODE_POSITION.FRONT) {
            parent.props.children.splice(childrenAmount - 1, 0, item);
          }
          if (item && position === WEAVE_NODE_POSITION.BACK) {
            parent.props.children.splice(0, 0, item);
          }

          for (let i = 0; i < parent.props.children.length; i++) {
            parent.props.children[i].props.zIndex = i;
          }
        }
      });
    }
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
