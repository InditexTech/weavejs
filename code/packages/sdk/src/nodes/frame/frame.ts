// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { WeaveNode } from '../node';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
  WEAVE_NODE_CUSTOM_EVENTS,
} from '@inditextech/weave-types';
import {
  WEAVE_FRAME_NODE_DEFAULT_CONFIG,
  WEAVE_FRAME_NODE_DEFAULT_PROPS,
  WEAVE_FRAME_NODE_TYPE,
} from './constants';
import type {
  WeaveFrameAttributes,
  WeaveFrameNodeParams,
  WeaveFrameProperties,
} from './types';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Rect } from 'konva/lib/shapes/Rect';
import type { WeaveNodesSnappingPlugin } from '@/plugins/nodes-snapping/nodes-snapping';

export class WeaveFrameNode extends WeaveNode {
  private config: WeaveFrameProperties;
  protected nodeType: string = WEAVE_FRAME_NODE_TYPE;

  constructor(params?: WeaveFrameNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      ...WEAVE_FRAME_NODE_DEFAULT_CONFIG,
      ...config,
    };
  }

  create(key: string, props: Partial<WeaveFrameAttributes>): WeaveStateElement {
    return {
      key,
      type: this.nodeType,
      props: {
        ...props,
        id: key,
        nodeType: this.nodeType,
        ...this.config,
        ...WEAVE_FRAME_NODE_DEFAULT_PROPS,
        ...(props.title && { title: props.title }),
        ...(props.frameWidth && { frameWidth: props.frameWidth }),
        ...(props.frameHeight && { frameHeight: props.frameHeight }),
        ...(props.frameType && { frameType: props.frameType }),
        ...(props.frameOrientation && {
          frameOrientation: props.frameOrientation,
        }),
        children: [],
      },
    };
  }

  onRender(props: WeaveFrameAttributes): WeaveElementInstance {
    const {
      id,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      zIndex,
      ...restProps
    } = props;

    const {
      fontFamily,
      fontStyle,
      titleHeight,
      borderColor,
      borderWidth,
      onTargetEnter: {
        borderColor: onTargetEnterBorderColor,
        fill: onTargetEnterFill,
      },
      onTargetLeave: {
        borderColor: onTargetLeaveBorderColor,
        fill: onTargetLeaveFill,
      },
    } = this.config;

    const frameParams = {
      ...restProps,
    };

    const frame = new Konva.Group({
      ...frameParams,
      id,
      containerId: `${id}-group-internal`,
      containerOffsetX: 0,
      containerOffsetY: titleHeight,
      width: props.frameWidth,
      height: props.frameHeight,
      fill: 'transparent',
      draggable: false,
    });

    const frameInternalGroup = new Konva.Group({
      id: `${id}-selector`,
      x: 0,
      y: 0,
      width: props.frameWidth,
      height: props.frameHeight,
      strokeScaleEnabled: false,
      draggable: false,
    });

    frame.add(frameInternalGroup);

    const background = new Konva.Rect({
      id: `${id}-bg`,
      nodeId: id,
      x: 0,
      y: 0,
      width: props.frameWidth,
      stroke: borderColor,
      strokeWidth: borderWidth,
      strokeScaleEnabled: false,
      shadowForStrokeEnabled: false,
      height: props.frameHeight,
      fill: '#ffffffff',
      listening: false,
      draggable: false,
    });

    frameInternalGroup.add(background);

    const text = new Konva.Text({
      id: `${id}-title`,
      x: 0,
      y: -titleHeight,
      width: props.frameWidth,
      height: titleHeight,
      fontSize: 20,
      fontFamily,
      fontStyle,
      align: 'left',
      text: props.title,
      stroke: '#000000ff',
      strokeWidth: 1,
      strokeScaleEnabled: false,
      listening: false,
      draggable: false,
    });

    frameInternalGroup.add(text);

    const selectorArea = new Konva.Rect({
      ...frameParams,
      id: `${id}-selector-area`,
      name: 'node',
      nodeId: id,
      containerId: `${id}-group-internal`,
      x: 0,
      y: 0,
      strokeWidth: 0,
      strokeScaleEnabled: false,
      width: props.frameWidth,
      height: props.frameHeight,
      fill: 'transparent',
      draggable: false,
    });

    selectorArea.getTransformerProperties = () => {
      return this.config.transform;
    };

    selectorArea.updatePosition = (position) => {
      frame.setAbsolutePosition(position);
      selectorArea.setAttrs({
        x: 0,
        y: 0,
      });
      this.instance.updateNode(
        this.serialize(selectorArea as WeaveElementInstance)
      );
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFrame = (e: KonvaEventObject<any, Rect>) => {
      const selectorArea = e.target;
      const stage = selectorArea.getStage();
      if (!stage) return;

      const absPos = selectorArea.getAbsolutePosition();
      const absRot = selectorArea.getAbsoluteRotation();

      const scaleX = selectorArea.scaleX();
      const scaleY = selectorArea.scaleY();
      selectorArea.x(0);
      selectorArea.y(0);

      frame.setAbsolutePosition(absPos);
      frame.rotation(absRot);
      frame.width(selectorArea.width());
      frame.height(selectorArea.height());

      frameInternalGroup.width(Math.max(5, selectorArea.width() * scaleX));
      frameInternalGroup.height(Math.max(5, selectorArea.height() * scaleY));

      background.width(Math.max(5, selectorArea.width() * scaleX));
      background.height(Math.max(5, selectorArea.height() * scaleY));

      text.width(Math.max(5, selectorArea.width() * scaleX));
      text.height(titleHeight * scaleY);

      frameInternal.width(Math.max(5, selectorArea.width() * scaleX));
      frameInternal.height(Math.max(5, selectorArea.height() * scaleY));
    };

    selectorArea.on('transform', (e) => {
      updateFrame(e);

      const node = e.target;

      const nodesSnappingPlugin =
        this.instance.getPlugin<WeaveNodesSnappingPlugin>('nodesSnapping');

      if (
        nodesSnappingPlugin &&
        this.isSelecting() &&
        this.isNodeSelected(node)
      ) {
        nodesSnappingPlugin.evaluateGuidelines(e);
      }

      const clonedSA = selectorArea.clone();
      const scaleX = clonedSA.scaleX();
      const scaleY = clonedSA.scaleY();

      clonedSA.x(0);
      clonedSA.y(0);
      clonedSA.width(Math.max(5, clonedSA.width() * scaleX));
      clonedSA.height(Math.max(5, clonedSA.height() * scaleY));
      clonedSA.scaleX(1);
      clonedSA.scaleY(1);

      this.instance.updateNode(
        this.serialize(clonedSA as WeaveElementInstance)
      );

      e.cancelBubble = true;
    });

    selectorArea.on('transformend', (e) => {
      const node = e.target;

      const nodesSnappingPlugin =
        this.instance.getPlugin<WeaveNodesSnappingPlugin>('nodesSnapping');

      if (
        nodesSnappingPlugin &&
        this.isSelecting() &&
        this.isNodeSelected(node)
      ) {
        nodesSnappingPlugin.cleanupEvaluateGuidelines();
      }

      const scaleX = selectorArea.scaleX();
      const scaleY = selectorArea.scaleY();

      selectorArea.x(0);
      selectorArea.y(0);
      selectorArea.width(Math.max(5, selectorArea.width() * scaleX));
      selectorArea.height(Math.max(5, selectorArea.height() * scaleY));
      selectorArea.scaleX(1);
      selectorArea.scaleY(1);

      updateFrame(e);

      this.instance.updateNode(
        this.serialize(selectorArea as WeaveElementInstance)
      );
    });

    frameInternalGroup.add(selectorArea);

    const frameInternal = new Konva.Group({
      id: `${id}-group-internal`,
      nodeId: id,
      x: 0,
      y: titleHeight,
      width: props.frameWidth,
      height: props.frameHeight,
      strokeScaleEnabled: false,
      draggable: false,
    });

    frameInternal.clipFunc((ctx) => {
      const width = frameInternal.width() * frameInternal.scaleX();
      const height = frameInternal.height() * frameInternal.scaleY();
      ctx.rect(0, -titleHeight, width, height);
    });

    frameInternalGroup.add(frameInternal);

    this.setupDefaultNodeEvents(frame);

    frame.on('dragmove', () => {});
    frame.on('dragend', () => {});

    frame.on(WEAVE_NODE_CUSTOM_EVENTS.onTargetLeave, () => {
      background.setAttrs({
        stroke: onTargetLeaveBorderColor,
        strokeWidth: borderWidth,
        fill: onTargetLeaveFill,
      });
    });

    frame.on(WEAVE_NODE_CUSTOM_EVENTS.onTargetEnter, () => {
      background.setAttrs({
        stroke: onTargetEnterBorderColor,
        strokeWidth: borderWidth,
        fill: onTargetEnterFill,
      });
    });

    return frame;
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    const { id } = nextProps;

    const frameNode = nodeInstance as Konva.Group;

    const newProps = { ...nextProps };

    const { titleHeight } = this.config;

    nodeInstance.setAttrs({
      ...newProps,
    });

    const selectorArea = frameNode.findOne(`#${id}-selector-area`);
    if (selectorArea) {
      selectorArea.setAttrs({
        x: 0,
        y: 0,
        width: nextProps.width,
        height: nextProps.height,
      });

      const frameInternalGroup = frameNode.findOne(`#${id}-selector`);
      if (frameInternalGroup) {
        frameInternalGroup.setAttrs({
          x: 0,
          y: 0,
          width: nextProps.width * selectorArea.scaleX(),
          height: nextProps.height * selectorArea.scaleY(),
        });
      }

      const background = frameNode.findOne(`#${id}-bg`);
      if (background) {
        background.setAttrs({
          x: 0,
          y: 0,
          width: nextProps.width * selectorArea.scaleX(),
          height: nextProps.height * selectorArea.scaleY(),
        });
      }

      const text = frameNode.findOne(`#${id}-title`);
      if (text) {
        text.setAttrs({
          x: 0,
          y: -titleHeight,
          text: nextProps.title,
          width: nextProps.width * selectorArea.scaleX(),
        });
      }

      const frameInternal = frameNode.findOne(`#${id}-group-internal`);
      if (frameInternal) {
        frameInternal.setAttrs({
          x: 0,
          y: titleHeight,
          width: nextProps.width * selectorArea.scaleX(),
          height: nextProps.height * selectorArea.scaleY(),
        });
      }
    }

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  serialize(instance: WeaveElementInstance): WeaveStateElement {
    const stage = this.instance.getStage();
    const attrs = instance.getAttrs();

    const mainNode = stage?.findOne(`#${attrs.nodeId}`) as
      | Konva.Group
      | undefined;

    const frameInternal = mainNode?.findOne(`#${attrs.containerId}`) as
      | Konva.Group
      | undefined;

    const childrenMapped: WeaveStateElement[] = [];
    if (frameInternal) {
      const children: WeaveElementInstance[] = [
        ...(frameInternal as Konva.Group).getChildren(),
      ];
      for (const node of children) {
        const handler = this.instance.getNodeHandler<WeaveNode>(
          node.getAttr('nodeType')
        );
        childrenMapped.push(handler.serialize(node));
      }
    }

    const realAttrs = mainNode?.getAttrs();

    const cleanedAttrs = { ...realAttrs };
    delete cleanedAttrs.draggable;

    return {
      key: realAttrs?.id ?? '',
      type: realAttrs?.nodeType,
      props: {
        ...cleanedAttrs,
        id: realAttrs?.id ?? '',
        // x: instance.x(),
        // y: instance.y(),
        // width: instance.width(),
        // height: instance.height(),
        nodeType: realAttrs?.nodeType,
        children: childrenMapped,
      },
    };
  }
}
