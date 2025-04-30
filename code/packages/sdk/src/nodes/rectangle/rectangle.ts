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

export const WEAVE_RECTANGLE_NODE_TYPE = 'rectangle';

export class WeaveRectangleNode extends WeaveNode {
  protected nodeType: string = WEAVE_RECTANGLE_NODE_TYPE;

  createNode(key: string, props: WeaveElementAttributes): WeaveStateElement {
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

  createInstance(props: WeaveElementAttributes): WeaveElementInstance {
    const rectangle = new Konva.Rect({
      ...props,
      name: 'node',
    });

    this.setupDefaultNodeEvents(rectangle);

    return rectangle;
  }

  updateInstance(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });
  }

  removeInstance(nodeInstance: WeaveElementInstance): void {
    nodeInstance.destroy();
  }

  toNode(instance: WeaveElementInstance): WeaveStateElement {
    const attrs = instance.getAttrs();

    const cleanedAttrs = { ...attrs };
    delete cleanedAttrs.draggable;

    return {
      key: attrs.id ?? '',
      type: attrs.nodeType,
      props: {
        ...cleanedAttrs,
        id: attrs.id ?? '',
        nodeType: attrs.nodeType,
        children: [],
      },
    };
  }
}
