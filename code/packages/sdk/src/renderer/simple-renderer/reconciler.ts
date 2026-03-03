// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type {
  WeaveElementAttributes,
  WeaveElementInstance,
} from '@inditextech/weave-types';
import { Weave } from '@/weave';
import type { WeaveNode } from '@/nodes/node';
import Konva from 'konva';
import { isEqual } from 'lodash';

export const SIMPLE_RECONCILER = {
  createInstance(
    instance: Weave,
    type: string,
    props: WeaveElementAttributes
  ): WeaveElementInstance | undefined {
    const handler = instance.getNodeHandler<WeaveNode>(type);

    if (!handler) {
      return undefined;
    }

    const newProps = { ...props };
    delete newProps.zIndex;
    newProps.initialZIndex = props.zIndex;

    if (type === 'stage') {
      newProps.container = instance.getStageConfiguration().container;
      newProps.width = instance.getStageConfiguration().width;
      newProps.height = instance.getStageConfiguration().height;
    }

    const element = handler.onRender(newProps);

    instance.emitEvent('onNodeRenderedAdded', element);

    return element;
  },
  createRoot(instance: Weave, child: WeaveElementInstance) {
    if (child instanceof Konva.Stage) {
      instance.getStageManager().setStage(child);
    }
  },
  appendChildToContainer(
    instance: Weave,
    parent: WeaveElementInstance,
    child: WeaveElementInstance,
    index: number
  ) {
    if (child.getParent() !== parent) {
      const parentAttrs = parent.getAttrs();

      const childInitialZIndex = child.getAttrs().initialZIndex;

      const type = child.getAttrs().nodeType;

      const handler = instance.getNodeHandler<WeaveNode>(type);

      if (!handler) {
        return;
      }

      let nodeAdded = false;

      if (parent instanceof Konva.Stage && child instanceof Konva.Layer) {
        parent.add(child);
        handler.onAdd?.(child);
        nodeAdded = true;
      }
      if (parent instanceof Konva.Layer) {
        parent.add(child);
        handler.onAdd?.(child);
        nodeAdded = true;
      }
      if (
        parent instanceof Konva.Group &&
        parentAttrs.containerId !== undefined
      ) {
        const realParent = parent.findOne(`#${parentAttrs.containerId}`) as
          | Konva.Group
          | undefined;
        realParent?.add(child);
        handler.onAdd?.(child);
        nodeAdded = true;
      }
      if (
        parent instanceof Konva.Group &&
        parentAttrs.containerId === undefined
      ) {
        parent.add(child);
        handler.onAdd?.(child);
        nodeAdded = true;
      }

      if (childInitialZIndex) {
        child.zIndex(childInitialZIndex);
      }

      if (nodeAdded) {
        instance.emitEvent('onNodeRenderedAdded', child);
      }
    }

    if (parent instanceof Konva.Layer || parent instanceof Konva.Group) {
      child.setZIndex(index);
    }
  },
  removeChild(
    instance: Weave,
    parent: WeaveElementInstance,
    child: WeaveElementInstance
  ) {
    const type = child.getAttrs().nodeType;

    const handler = instance.getNodeHandler<WeaveNode>(type);

    if (!handler) {
      return;
    }

    handler.onDestroy(child);

    instance.emitEvent('onNodeRenderedRemoved', child);
  },
  commitUpdate(
    instance: Weave,
    node: WeaveElementInstance,
    type: string,
    prevProps: WeaveElementAttributes,
    nextProps: WeaveElementAttributes
  ) {
    if (node instanceof Weave) {
      return;
    }

    if (!isEqual(prevProps, nextProps)) {
      const handler = instance.getNodeHandler<WeaveNode>(type);

      if (!handler) {
        return;
      }

      handler.onUpdate(node, nextProps);

      const childZIndex = nextProps.zIndex;
      if (childZIndex) {
        node.zIndex(childZIndex as number);
      }

      instance.emitEvent('onNodeRenderedUpdated', node);
    }
  },
};
