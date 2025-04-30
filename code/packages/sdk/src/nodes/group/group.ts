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
import { WEAVE_GROUP_NODE_TYPE } from './constants';

export class WeaveGroupNode extends WeaveNode {
  protected nodeType: string = WEAVE_GROUP_NODE_TYPE;

  render(props: WeaveElementAttributes): WeaveElementInstance {
    const group = new Konva.Group({
      ...props,
      name: 'node',
    });

    this.setupDefaultNodeEvents(group);

    return group;
  }

  update(
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
      const handler = this.instance.getNodeHandler(node.getAttr('nodeType'));
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
