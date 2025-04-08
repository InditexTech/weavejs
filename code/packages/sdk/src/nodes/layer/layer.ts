// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  WeaveElementAttributes,
  WeaveElementInstance,
  WeaveStateElement,
} from '@inditextech/weavejs-types';
import { WeaveNode } from '../node';

export const WEAVE_LAYER_NODE_TYPE = 'layer';

export class WeaveLayerNode extends WeaveNode {
  protected nodeType = WEAVE_LAYER_NODE_TYPE;

  createNode(key: string, props: WeaveElementAttributes) {
    return {
      key,
      type: this.nodeType,
      props: {
        ...props,
        id: key,
        nodeType: this.nodeType,
        children: [],
      },
    };
  }

  createInstance(props: WeaveElementAttributes) {
    const layer = new Konva.Layer({
      ...props,
    });

    return layer;
  }

  updateInstance(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ) {
    nodeInstance.setAttrs({
      ...nextProps,
    });
  }

  removeInstance(nodeInstance: WeaveElementInstance) {
    nodeInstance.destroy();
  }

  toNode(instance: WeaveElementInstance) {
    const attrs = instance.getAttrs();

    const childrenMapped: WeaveStateElement[] = [];
    const children: WeaveElementInstance[] = [
      ...(instance as Konva.Group).getChildren(),
    ];
    for (const node of children) {
      const handler = this.instance.getNodeHandler(node.getAttr('nodeType'));
      childrenMapped.push(handler.toNode(node));
    }

    return {
      key: attrs.id ?? '',
      type: attrs.nodeType,
      props: {
        ...attrs,
        id: attrs.id ?? '',
        nodeType: attrs.nodeType,
        children: childrenMapped,
      },
    };
  }
}
