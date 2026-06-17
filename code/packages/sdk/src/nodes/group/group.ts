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
import { intersectArrays } from '@/utils/utils';

export class WeaveGroupNode extends WeaveNode {
  private config: WeaveGroupProperties;
  protected nodeType: string = WEAVE_GROUP_NODE_TYPE;
  initialize = undefined;

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
        enabledAnchors: group?.allowedAnchors() ?? [],
      };
    };

    group.allowedAnchors = function () {
      const children = this.getChildren();

      const anchorsArrays = [];
      for (const child of children) {
        anchorsArrays.push(child?.allowedAnchors() ?? []);
      }

      return intersectArrays(anchorsArrays);
    };

    this.setupDefaultNodeEvents(group);

    group.on('transform', () => {
      const sx = group.scaleX();
      const sy = group.scaleY();
      group.getChildren().forEach((child) => {
        child.scaleX(child.scaleX() * sx);
        child.scaleY(child.scaleY() * sy);
        child.x(child.x() * sx);
        child.y(child.y() * sy);
        const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
          child.getAttrs().nodeType
        );
        if (nodeHandler) {
          nodeHandler.scaleReset(child);
          nodeHandler.onUpdate(child, child.getAttrs());
        }
      });
      group.scale({ x: 1, y: 1 });
    });

    group.dblClick = () => {
      const selectionPlugin =
        this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
      if (!selectionPlugin) return;

      const groupId = group.getAttrs().id ?? '';

      // Enter context first so getInstanceRecursive respects the group boundary
      selectionPlugin.enterGroupContext(groupId);

      // Find the direct child under the cursor using the context-aware machinery
      const stage = this.instance.getStage();
      const mousePos = stage.getPointerPosition();
      if (!mousePos) return;

      // Disable selection layer so it doesn't intercept the hit test
      const selectionLayer = stage.findOne(
        '#' + selectionPlugin.getLayerName()
      );
      selectionLayer?.listening(false);
      const intersected = stage.getIntersection(mousePos);
      selectionLayer?.listening(true);

      if (!intersected) return;

      // getInstanceRecursive with stopAtGroupId stops at the direct child
      // of the group, correctly handling any Konva inner shapes without nodeType
      const directChild = this.instance.getInstanceRecursive(
        intersected,
        [],
        groupId
      );

      if (directChild.getParent()?.getAttrs().id === groupId) {
        selectionPlugin.setSelectedNodes([directChild]);
        selectionPlugin.triggerSelectedNodesEvent();
      }
    };

    return group;
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
      x: nextProps.x ?? 0,
      y: nextProps.y ?? 0,
      scaleX: nextProps.scaleX ?? 1,
      scaleY: nextProps.scaleY ?? 1,
      rotation: nextProps.rotation ?? 0,
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

    const cleanedAttrs = { ...attrs };
    delete cleanedAttrs.mutexLocked;
    delete cleanedAttrs.mutexUserId;
    delete cleanedAttrs.draggable;
    delete cleanedAttrs.overridesMouseControl;
    delete cleanedAttrs.dragBoundFunc;

    return {
      key: attrs.id ?? '',
      type: attrs.nodeType,
      props: {
        ...cleanedAttrs,
        id: attrs.id ?? '',
        nodeType: attrs.nodeType,
        sceneFunc: undefined,
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

  scaleReset(node: Konva.Group): void {
    const sx = node.scaleX();
    const sy = node.scaleY();
    node.getChildren().forEach((child) => {
      child.scaleX(child.scaleX() * sx);
      child.scaleY(child.scaleY() * sy);
      child.x(child.x() * sx);
      child.y(child.y() * sy);
      const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
        child.getAttrs().nodeType
      );
      if (nodeHandler) {
        nodeHandler.scaleReset(child);
        nodeHandler.onUpdate(child, child.getAttrs());
      }
    });
    node.scale({ x: 1, y: 1 });
  }
}
