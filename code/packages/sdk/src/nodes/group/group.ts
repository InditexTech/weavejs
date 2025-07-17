// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  WEAVE_DEFAULT_TRANSFORM_PROPERTIES,
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import { WEAVE_GROUP_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveGroupNodeParams, WeaveGroupProperties } from './types';

export class WeaveGroupNode extends WeaveNode {
  private config: WeaveGroupProperties;
  protected nodeType: string = WEAVE_GROUP_NODE_TYPE;

  constructor(params?: WeaveGroupNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: {
        ...WEAVE_DEFAULT_TRANSFORM_PROPERTIES,
        ...config?.transform,
      },
    };
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const group = new Konva.Group({
      ...props,
      isContainerPrincipal: true,
      name: 'node',
    });

    this.setupDefaultNodeAugmentation(group);

    group.getTransformerProperties = () => {
      return this.config.transform;
    };

    this.setupDefaultNodeEvents(group);

    return group;
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
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
