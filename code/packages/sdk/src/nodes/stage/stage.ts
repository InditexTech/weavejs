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

export const WEAVE_STAGE_NODE_TYPE = 'stage';

export class WeaveStageNode extends WeaveNode {
  protected nodeType: string = WEAVE_STAGE_NODE_TYPE;

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
    const stage = new Konva.Stage({
      ...props,
    });

    stage.draw();

    return stage;
  }

  updateInstance(): void {}

  removeInstance(nodeInstance: WeaveElementInstance): void {
    nodeInstance.destroy();
  }

  toNode(instance: WeaveElementInstance): WeaveStateElement {
    const attrs = instance.getAttrs();

    return {
      key: attrs.id ?? '',
      type: attrs.nodeType,
      props: {
        ...attrs,
        id: attrs.id ?? '',
        nodeType: attrs.nodeType,
        children: [],
      },
    };
  }
}
