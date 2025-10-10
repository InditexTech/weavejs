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
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveGroupNodeParams, WeaveGroupProperties } from './types';
import { intersectArrays } from '@/utils';

export class WeaveGroupNode extends WeaveNode {
  private config: WeaveGroupProperties;
  protected nodeType: string = WEAVE_GROUP_NODE_TYPE;

  constructor(params?: WeaveGroupNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: {
        ...config?.transform,
      },
    };
  }

  groupHasFrames(group: Konva.Group) {
    const frameNodes = group.find((node: Konva.Node) => {
      return node.getAttrs().nodeType === 'frame';
    });

    if (frameNodes.length === 0) {
      return false;
    } else {
      return true;
    }
  }

  groupHasImages(group: Konva.Group) {
    const imageNodes = group.find((node: Konva.Node) => {
      return node.getAttrs().nodeType === 'image';
    });

    if (imageNodes.length === 0) {
      return false;
    } else {
      return true;
    }
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const group = new Konva.Group({
      ...props,
      isContainerPrincipal: true,
      name: 'node',
    });

    this.setupDefaultNodeAugmentation(group);

    const defaultTransformerProperties = this.defaultGetTransformerProperties(
      this.config.transform
    );

    group.getTransformerProperties = function () {
      return {
        ...defaultTransformerProperties,
        enabledAnchors: group.allowedAnchors(),
      };
    };

    group.allowedAnchors = function () {
      const children = this.getChildren();

      const anchorsArrays = [];
      for (const child of children) {
        anchorsArrays.push(child.allowedAnchors());
      }

      return intersectArrays(anchorsArrays);
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
        isCloned: undefined,
        isCloneOrigin: undefined,
        x: instance.x() ?? 0,
        y: instance.y() ?? 0,
        scaleX: instance.scaleX() ?? 1,
        scaleY: instance.scaleY() ?? 1,
      },
    };
  }

  scaleReset(): void {
    // don't change anything
  }
}
