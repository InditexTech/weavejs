// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import { WEAVE_LAYER_NODE_TYPE } from './constants';

export class WeaveLayerNode extends WeaveNode {
  protected nodeType: string = WEAVE_LAYER_NODE_TYPE;

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const layer = new Konva.Layer({
      ...props,
    });

    return layer;
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });
  }

  serialize(instance: WeaveElementInstance): WeaveStateElement {
    const attrs = instance.getAttrs();

    const childrenMapped: WeaveStateElement[] = [];
    const children: WeaveElementInstance[] = [
      ...(instance as Konva.Group).getChildren(),
    ];
    for (const node of children) {
      const handler = this.instance.getNodeHandler<WeaveNode>(
        node.getAttr('nodeType')
      );
      if (!handler) {
        continue;
      }
      childrenMapped.push(handler.serialize(node));
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
