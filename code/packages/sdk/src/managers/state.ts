// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Weave } from '@/weave';
import { type Logger } from 'pino';
import {
  type WeaveNodeFound,
  type WeavePosition,
  type WeaveStateElement,
  WEAVE_NODE_POSITION,
} from '@inditextech/weave-types';
import Konva from 'konva';
import * as Y from 'yjs';
import { WeaveStateManipulation } from '@/state.manipulation';

export class WeaveStateManager {
  private instance: Weave;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('state-manager');
    this.logger.debug('State manager created');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private findYjsNodeById(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    node: Y.Map<any>,
    key: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parentArray: Y.Array<any> | null = null,
    index: number = -1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    node: Y.Map<any> | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parentArray: Y.Array<any> | null;
    index: number;
  } {
    if (node.get('key') === key) {
      return { node, parentArray, index };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: Y.Array<any> | undefined = node
      .get('props')
      ?.get('children');
    if (children) {
      for (let i = 0; i < children.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const child = children.get(i) as Y.Map<any>;
        const result = this.findYjsNodeById(child, key, children, i);
        if (result.node) return result;
      }
    }

    return { node: null, parentArray: null, index: -1 };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private updateYjsMapFromObject(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yjsMap: Y.Map<any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    obj: Record<string, any>
  ): void {
    // Remove keys not present in obj
    for (const key of Array.from(yjsMap.keys())) {
      if (!(key in obj)) {
        yjsMap.delete(key);
      }
    }

    // Update or add keys from obj
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'children') continue; // children are managed by addNode / removeNode

      if (Array.isArray(value)) {
        yjsMap.set(key, WeaveStateManipulation.mapValueToYjs(value));
      } else if (typeof value === 'object' && value !== null) {
        let nested = yjsMap.get(key);
        if (!(nested instanceof Y.Map)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nested = new Y.Map<any>();
          yjsMap.set(key, nested);
        }
        this.updateYjsMapFromObject(nested, value);
      } else if (yjsMap.get(key) !== value) {
        yjsMap.set(key, value);
      }
    }
  }

  syncMetadata<T extends Record<string, unknown>>(metadata: T): void {
    const yjsMetadata = this.instance
      .getStore()
      .getDocument()
      .getMap('weaveMetadata');
    this.updateYjsMapFromObject(yjsMetadata, metadata);
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
    const doc = this.instance.getStore().getDocument();
    const root = doc.getMap('weave');

    if (root.size === 0) {
      return { node: null, parent: null, index: -1 };
    }

    const state = root.toJSON() as WeaveStateElement;
    return this.findNodeById(state, nodeKey);
  }

  addNode(
    node: WeaveStateElement,
    parentId = 'mainLayer',
    index: number | undefined = undefined
  ): void {
    const doc = this.instance.getStore().getDocument();
    const root = doc.getMap('weave');

    if (root.size === 0) {
      const msg = `State is empty, cannot add the node`;
      this.logger.warn({ node, parentId }, msg);
      return;
    }

    const { node: existing } = this.findYjsNodeById(root, node.key);
    if (existing) {
      const msg = `Node with key [${node.key}] already exists, cannot add it`;
      this.logger.warn({ node, parentId }, msg);
      return;
    }

    const { node: parentNode } = this.findYjsNodeById(root, parentId);
    if (!parentNode) {
      const msg = `Parent container with key [${parentId}] doesn't exists, cannot add it`;
      this.logger.warn({ node, parentId }, msg);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parentChildren: Y.Array<any> | undefined = parentNode
      .get('props')
      ?.get('children');
    if (!parentChildren) {
      const msg = `Parent container with key [${parentId}] has no children array`;
      this.logger.warn({ node, parentId }, msg);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { element } = WeaveStateManipulation.mapNodeToYjs(node);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elementMap = element as unknown as Y.Map<any>;

    if (index !== undefined) {
      // Insert into the document first so elementMap.get() works correctly.
      parentChildren.insert(index, [elementMap]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (elementMap.get('props') as Y.Map<any>)?.set('zIndex', index);
      for (let i = 0; i < parentChildren.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const child = parentChildren.get(i) as Y.Map<any>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (child.get('props') as Y.Map<any>)?.set('zIndex', i);
      }
    } else {
      const zIndex = parentChildren.length;
      // Insert into the document first so elementMap.get() works correctly.
      parentChildren.push([elementMap]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (elementMap.get('props') as Y.Map<any>)?.set('zIndex', zIndex);
    }

    this.instance.emitEvent('onNodeAdded', node);
  }

  updateNode(node: WeaveStateElement): void {
    const doc = this.instance.getStore().getDocument();
    const root = doc.getMap('weave');

    if (root.size === 0) {
      const msg = `State is empty, cannot update the node`;
      this.logger.warn({ node }, msg);
      return;
    }

    const { node: yjsNode } = this.findYjsNodeById(root, node.key);
    if (!yjsNode) {
      const msg = `Node with key [${node.key}] doesn't exists, cannot update it`;
      this.logger.warn({ node }, msg);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yjsProps = yjsNode.get('props') as Y.Map<any>;
    this.updateYjsMapFromObject(yjsProps, node.props);

    this.instance.emitEvent('onNodeUpdated', node);
  }

  updateNodes(nodes: WeaveStateElement[]): void {
    for (const node of nodes) {
      this.updateNode(node);
    }
  }

  stateTransactional(callback: () => void, origin?: string): void {
    const doc = this.instance.getStore().getDocument();
    const transactionOrigin = origin ?? this.instance.getStore().getUser().id;

    doc.transact(() => {
      callback();
    }, transactionOrigin);
  }

  removeNode(node: WeaveStateElement): void {
    const doc = this.instance.getStore().getDocument();
    const root = doc.getMap('weave');

    if (root.size === 0) {
      const msg = `State is empty, cannot remove the node`;
      this.logger.warn({ node }, msg);
      return;
    }

    const {
      node: yjsNode,
      parentArray,
      index,
    } = this.findYjsNodeById(root, node.key);

    if (!yjsNode) {
      const msg = `Node with key [${node.key}] doesn't exists, cannot remove it`;
      this.logger.warn({ node }, msg);
      return;
    }

    if (!parentArray) {
      const msg = `Parent doesn't exists, cannot remove it`;
      this.logger.warn({ node }, msg);
      return;
    }

    parentArray.delete(index, 1);

    for (let i = 0; i < parentArray.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const child = parentArray.get(i) as Y.Map<any>;
      child.get('props')?.set('zIndex', i);
    }

    this.instance.emitEvent('onNodeRemoved', node);
  }

  zMoveNode(node: WeaveStateElement, position: WeavePosition): void {
    const doc = this.instance.getStore().getDocument();
    const root = doc.getMap('weave');

    if (root.size === 0) {
      const msg = `State is empty, cannot move the node`;
      this.logger.warn({ node }, msg);
      return;
    }

    const {
      node: yjsNode,
      parentArray,
      index: nodeIndex,
    } = this.findYjsNodeById(root, node.key);

    if (!yjsNode) {
      const msg = `Node with key [${node.key}] doesn't exists, cannot update it`;
      this.logger.warn({ node }, msg);
      return;
    }

    if (!parentArray) {
      const msg = `Parent doesn't exists, cannot move it`;
      this.logger.warn({ node }, msg);
      return;
    }

    if (nodeIndex === -1) {
      const msg = `Element doesn't exists on parent, cannot move it`;
      this.logger.warn({ node }, msg);
      return;
    }

    const childrenAmount = parentArray.length;
    const itemJson = yjsNode.toJSON() as WeaveStateElement;
    parentArray.delete(nodeIndex, 1);

    const { element: newElement } =
      WeaveStateManipulation.mapNodeToYjs(itemJson);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newElementMap = newElement as unknown as Y.Map<any>;

    if (position === WEAVE_NODE_POSITION.UP && nodeIndex + 1 < childrenAmount) {
      parentArray.insert(nodeIndex + 1, [newElementMap]);
    }
    if (
      position === WEAVE_NODE_POSITION.UP &&
      nodeIndex + 1 >= childrenAmount
    ) {
      parentArray.insert(childrenAmount - 1, [newElementMap]);
    }
    if (position === WEAVE_NODE_POSITION.DOWN && nodeIndex - 1 >= 0) {
      parentArray.insert(nodeIndex - 1, [newElementMap]);
    }
    if (position === WEAVE_NODE_POSITION.DOWN && nodeIndex - 1 < 0) {
      parentArray.insert(0, [newElementMap]);
    }
    if (position === WEAVE_NODE_POSITION.FRONT) {
      parentArray.insert(childrenAmount - 1, [newElementMap]);
    }
    if (position === WEAVE_NODE_POSITION.BACK) {
      parentArray.insert(0, [newElementMap]);
    }

    for (let i = 0; i < parentArray.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const child = parentArray.get(i) as Y.Map<any>;
      child.get('props')?.set('zIndex', i);
    }
  }

  getElementsTree(): WeaveStateElement[] {
    const doc = this.instance.getStore().getDocument();
    const jsonState = doc.getMap('weave').toJSON();

    const mainLayer = jsonState.props?.children?.find(
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
