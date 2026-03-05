// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  WEAVE_ROOT_NODE_TYPE,
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveState,
  type WeaveStateElement,
} from '@inditextech/weave-types';
import Konva from 'konva';
import { isEqual } from 'lodash';
import type { Stage } from 'konva/lib/Stage';
import type { Layer } from 'konva/lib/Layer';
import type { Group } from 'konva/lib/Group';
import type { RendererInstruction } from './types';
import { SIMPLE_RECONCILER } from './reconciler';
import { WeaveRenderer } from '@inditextech/weave-sdk';

export class WeaveKonvaBaseRenderer extends WeaveRenderer {
  protected name = 'konva-base-renderer';
  private actualState!: WeaveState;
  private readonly reconciler = SIMPLE_RECONCILER;

  constructor() {
    super();
  }

  init(): void {
    this.actualState = {
      weave: {},
    };
  }

  render(callback?: () => void): void {
    const newState = JSON.parse(
      JSON.stringify(this.instance.getStore().getState())
    );

    if (
      !newState?.weave?.key ||
      !newState?.weave?.type ||
      !newState?.weave?.props
    ) {
      return;
    }

    this.deriveRendererInstructions(this.actualState, newState);

    this.actualState = newState;

    setTimeout(() => {
      callback?.();
    }, 0);
  }

  getReconciler() {
    return this.reconciler;
  }

  deriveRendererInstructions(
    prevState: WeaveState,
    nextState: WeaveState
  ): void {
    const prevRoot = prevState.weave as WeaveStateElement | undefined;
    const nextRoot = nextState.weave as WeaveStateElement | undefined;

    const prevHasRoot = !!prevRoot?.key;
    const nextHasRoot = !!nextRoot?.key;

    // ========================================
    // ROOT MOUNT
    // ========================================
    if (!prevHasRoot && nextHasRoot) {
      this.createSubtree({
        kind: 'CREATE_SUBTREE',
        element: nextRoot!,
        parentKey: WEAVE_ROOT_NODE_TYPE,
        index: 0,
      });
      return;
    }

    // ========================================
    // ROOT UNMOUNT
    // ========================================
    if (prevHasRoot && !nextHasRoot) {
      this.remove({
        kind: 'REMOVE',
        parentKey: WEAVE_ROOT_NODE_TYPE,
        key: prevRoot!.key,
      });
      return;
    }

    if (!prevRoot || !nextRoot) return;

    // ========================================
    // FULL STRUCTURAL RECONCILIATION
    // ========================================
    this.reconcileNode(prevRoot, nextRoot);
  }

  private reconcileNode(
    prevNode: WeaveStateElement,
    nextNode: WeaveStateElement
  ): void {
    if (prevNode === nextNode) return;

    if (prevNode.key !== nextNode.key) return;

    // ----------------------------------------
    // 1️⃣ Props update
    // ----------------------------------------
    const prevProps = this.stripChildren(prevNode.props);
    const nextProps = this.stripChildren(nextNode.props);

    if (!isEqual(prevProps, nextProps)) {
      this.updateProps({
        kind: 'UPDATE_PROPS',
        key: nextNode.key,
        type: nextNode.type,
        prevProps,
        nextProps,
      });
    }

    // ----------------------------------------
    // 2️⃣ Children reconciliation (keyed)
    // ----------------------------------------
    const prevChildren = prevNode.props.children ?? [];
    const nextChildren = nextNode.props.children ?? [];

    this.reconcileChildren(prevNode.key, prevChildren, nextChildren);
  }

  private reconcileChildren(
    parentKey: string,
    prevChildren: WeaveStateElement[],
    nextChildren: WeaveStateElement[]
  ): void {
    const prevMap = new Map(
      prevChildren.map((c, i) => [c.key, { node: c, index: i }])
    );
    const nextMap = new Map(
      nextChildren.map((c, i) => [c.key, { node: c, index: i }])
    );

    // ----------------------------------------
    // 1️⃣ REMOVALS
    // ----------------------------------------
    for (const prevChild of prevChildren) {
      if (!nextMap.has(prevChild.key)) {
        this.remove({
          kind: 'REMOVE',
          parentKey,
          key: prevChild.key,
        });
      }
    }

    // ----------------------------------------
    // 2️⃣ CREATE + MOVE + RECURSION
    // ----------------------------------------
    let lastPlacedIndex = 0;

    for (let nextIndex = 0; nextIndex < nextChildren.length; nextIndex++) {
      const nextChild = nextChildren[nextIndex];
      const prevEntry = prevMap.get(nextChild.key);

      // CREATE
      if (!prevEntry) {
        this.createSubtree({
          kind: 'CREATE_SUBTREE',
          element: nextChild,
          parentKey,
          index: nextIndex,
        });
        continue;
      }

      const prevIndex = prevEntry.index;

      // MOVE (React-style heuristic)
      if (prevIndex < lastPlacedIndex) {
        this.remove({
          kind: 'REMOVE',
          parentKey,
          key: nextChild.key,
        });

        this.createSubtree({
          kind: 'CREATE_SUBTREE',
          element: nextChild,
          parentKey,
          index: nextIndex,
        });
      } else {
        lastPlacedIndex = prevIndex;
      }

      // RECURSIVE reconciliation
      this.reconcileNode(prevEntry.node, nextChild);
    }
  }

  findElementByKey(state: WeaveState, key: string): WeaveStateElement {
    function walk(node: WeaveStateElement): WeaveStateElement | null {
      if (node.key === key) return node;

      const children = node.props.children ?? [];
      for (const child of children) {
        const found = walk(child);
        if (found) return found;
      }

      return null;
    }

    return walk(state.weave as WeaveStateElement)!;
  }

  stripChildren(props: WeaveElementAttributes) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { children, ...rest } = props;
    return rest;
  }

  buildSubtree(
    parentInstance: WeaveElementInstance | undefined,
    element: WeaveStateElement,
    index: number
  ): void {
    const nodeInstance = this.reconciler.createInstance(
      this.instance,
      element.type,
      this.stripChildren(element.props)
    );

    if (!nodeInstance) {
      throw new Error(`No handler found for node type ${element.type}`);
    }

    if (!parentInstance && nodeInstance) {
      this.reconciler.createRoot(this.instance, nodeInstance);
    }

    if (
      parentInstance &&
      nodeInstance &&
      (parentInstance instanceof Konva.Stage ||
        parentInstance instanceof Konva.Layer ||
        parentInstance instanceof Konva.Group)
    ) {
      this.reconciler.appendChildToContainer(
        this.instance,
        parentInstance,
        nodeInstance,
        index
      );
    }

    const children = element.props.children ?? [];

    let childIndex = 0;
    for (const child of children) {
      this.buildSubtree(nodeInstance, child, childIndex);

      childIndex++;
    }
  }

  private createSubtree(instruction: RendererInstruction) {
    if (instruction.kind !== 'CREATE_SUBTREE') {
      throw new Error(
        `Invalid instruction kind for createSubtree: ${instruction.kind}`
      );
    }

    const stage = this.instance.getStage();

    let parentInstance: WeaveElementInstance | undefined = undefined;
    if (instruction.parentKey !== WEAVE_ROOT_NODE_TYPE) {
      parentInstance = stage.findOne<WeaveElementInstance>(
        `#${instruction.parentKey}`
      );
    }

    this.buildSubtree(parentInstance, instruction.element, instruction.index);
  }

  private remove(instruction: RendererInstruction) {
    if (instruction.kind !== 'REMOVE') {
      throw new Error(
        `Invalid instruction kind for remove: ${instruction.kind}`
      );
    }

    const stage = this.instance.getStage();

    const parentInstance = stage.findOne(`#${instruction.parentKey}`) as
      | Stage
      | Layer
      | Group;

    const childInstance = stage.findOne(
      `#${instruction.key}`
    ) as WeaveElementInstance;

    if (!childInstance) {
      console.warn(
        `Trying to remove non existing node with key ${instruction.key}`
      );
      return;
    }

    this.reconciler.removeChild(this.instance, parentInstance, childInstance);
  }

  private updateProps(instruction: RendererInstruction) {
    if (instruction.kind !== 'UPDATE_PROPS') {
      throw new Error(
        `Invalid instruction kind for updateProps: ${instruction.kind}`
      );
    }

    const stage = this.instance.getStage();

    const node = stage.findOne(`#${instruction.key}`) as WeaveElementInstance;

    if (!node) {
      console.warn(
        `Trying to update non existing node with key ${instruction.key}`
      );
      return;
    }

    this.reconciler.commitUpdate(
      this.instance,
      node,
      instruction.type,
      instruction.prevProps,
      instruction.nextProps
    );
  }
}
