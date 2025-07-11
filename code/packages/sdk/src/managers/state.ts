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
    const userName = this.instance.getStore().getUser().name;

    this.instance
      .getStore()
      .getDocument()
      .transact(() => {
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

        if (
          !parent.props.children ||
          typeof parent.props.children === 'undefined'
        ) {
          parent.props.children = [];
        }

        if (index) {
          let parentChildren = JSON.parse(
            JSON.stringify([...parent.props.children])
          );
          parentChildren.splice(index, 0, node);
          parentChildren = parentChildren.map(
            (actNode: WeaveStateElement, index: number) => {
              return {
                ...actNode,
                props: {
                  ...actNode.props,
                  zIndex: index,
                },
              };
            }
          );
          parent.props.children = parentChildren;
        } else {
          const childrenAmount = parent.props.children.length;
          const finalNode = {
            ...node,
            props: {
              ...node.props,
              zIndex: childrenAmount,
            },
          };
          parent.props.children.push(finalNode);
        }

        this.instance.emitEvent('onNodeAdded', node);
      }, userName);
  }

  updateNode(node: WeaveStateElement): void {
    const userName = this.instance.getStore().getUser().name;

    this.instance
      .getStore()
      .getDocument()
      .transact(() => {
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

        const nodeNew = JSON.parse(
          JSON.stringify({ ...nodeState.props, ...node.props })
        );

        nodeState.props = {
          ...nodeNew,
        };

        this.instance.emitEvent('onNodeUpdated', node);
      }, userName);
  }

  removeNode(node: WeaveStateElement): void {
    const userName = this.instance.getStore().getUser().name;

    this.instance
      .getStore()
      .getDocument()
      .transact(() => {
        const state = this.instance.getStore().getState();

        if (isEmpty(state.weave)) {
          const msg = `State is empty, cannot update the node`;
          this.logger.warn({ node }, msg);
          return;
        }

        const { node: nodeState, parent: parentState } = this.findNodeById(
          state.weave as WeaveStateElement,
          node.key
        );

        if (!nodeState) {
          const msg = `Node with key [${node.key}] doesn't exists, cannot remove it`;
          this.logger.warn({ node }, msg);
          return;
        }

        if (parentState) {
          const newChildren: WeaveStateElement[] = JSON.parse(
            JSON.stringify(parentState.props.children)
          );
          const filteredChildren = newChildren.filter(
            (actNode) => actNode.key !== node.key
          );
          parentState.props.children = filteredChildren;
        }

        this.instance.emitEvent('onNodeRemoved', node);
      }, userName);
  }

  removeNodes(nodes: WeaveStateElement[]): void {
    for (const node of nodes) {
      this.removeNode(node);
    }
  }

  moveNode(node: WeaveStateElement, position: WeavePosition): void {
    const userName = this.instance.getStore().getUser().name;

    this.instance
      .getStore()
      .getDocument()
      .transact(() => {
        const state = this.instance.getStore().getState();

        if (isEmpty(state.weave)) {
          const msg = `State is empty, cannot update the node`;
          this.logger.warn({ node }, msg);
          return;
        }

        const { node: nodeState, parent: nodeParent } = this.findNodeById(
          state.weave as WeaveStateElement,
          node.key
        );
        if (!nodeState) {
          const msg = `Node with key [${node.key}] doesn't exists, cannot update it`;
          this.logger.warn({ node }, msg);
          return;
        }

        if (nodeParent) {
          let nodeParentNewChildren = JSON.parse(
            JSON.stringify([...(nodeParent.props.children ?? [])])
          );
          const nodeNew = JSON.parse(JSON.stringify({ ...node }));

          const childrenAmount = nodeParentNewChildren.length;
          const nodeIndex = nodeParentNewChildren.findIndex(
            (n: WeaveStateElement) => n.key === nodeNew.key
          );

          nodeParentNewChildren.splice(nodeIndex, 1);

          if (position === WEAVE_NODE_POSITION.UP) {
            nodeParentNewChildren.splice(nodeIndex + 1, 0, nodeNew);
          }
          if (position === WEAVE_NODE_POSITION.DOWN) {
            nodeParentNewChildren.splice(nodeIndex - 1, 0, nodeNew);
          }
          if (position === WEAVE_NODE_POSITION.FRONT) {
            nodeParentNewChildren.splice(childrenAmount - 1, 0, nodeNew);
          }
          if (position === WEAVE_NODE_POSITION.BACK) {
            nodeParentNewChildren.splice(0, 0, nodeNew);
          }

          nodeParentNewChildren = nodeParentNewChildren.map(
            (actNode: WeaveStateElement, index: number) => {
              return {
                ...actNode,
                props: {
                  ...actNode.props,
                  zIndex: index,
                },
              };
            }
          );

          if (!nodeParent.props.children) {
            nodeParent.props.children = [];
          }

          nodeParent.props.children = nodeParentNewChildren;
        }
      }, userName);
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

    return mainLayer.props.children;
  }
}
