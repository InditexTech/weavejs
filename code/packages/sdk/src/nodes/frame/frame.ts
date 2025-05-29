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
      height: props.frameHeight + titleHeight,
      fill: '#ffffffff',
      clipX: 0,
      clipY: 0,
      clipWidth: props.frameWidth,
      clipHeight: props.frameHeight + titleHeight,
      name: 'node',
    });

    frame.getTransformerProperties = () => {
      return this.config.transform;
    };

    const background = new Konva.Rect({
      id: `${id}-bg`,
      nodeId: id,
      x: 0,
      y: titleHeight,
      width: props.frameWidth,
      stroke: borderColor,
      strokeWidth: borderWidth,
      strokeScaleEnabled: false,
      height: props.frameHeight,
      fill: '#ffffffff',
      draggable: false,
    });

    frame.add(background);

    const text = new Konva.Text({
      id: `${id}-title`,
      x: 0,
      y: 0,
      width: props.frameWidth,
      height: titleHeight - 10,
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

    frame.add(text);

    const frameInternal = new Konva.Group({
      id: `${id}-group-internal`,
      nodeId: id,
      x: 0,
      y: titleHeight,
      width: props.frameWidth,
      height: props.frameHeight,
      draggable: false,
      stroke: 'transparent',
      strokeScaleEnabled: false,
      borderWidth: 0,
      clipX: 0,
      clipY: 0,
      clipWidth: props.frameWidth,
      clipHeight: props.frameHeight,
    });

    frame.add(frameInternal);

    this.setupDefaultNodeEvents(frame);

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

    nodeInstance.setAttrs({
      ...newProps,
    });

    const frameTitle = frameNode.findOne(`#${id}-title`);
    if (frameTitle) {
      frameTitle.setAttrs({
        text: nextProps.title,
      });
    }
  }

  serialize(instance: WeaveElementInstance): WeaveStateElement {
    const attrs = instance.getAttrs();

    const frameInternal = (instance as Konva.Group).findOne(
      `#${attrs.containerId}`
    ) as Konva.Group | undefined;

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

    const cleanedAttrs = { ...attrs };
    delete cleanedAttrs.draggable;

    return {
      key: attrs.id ?? '',
      type: attrs.nodeType,
      props: {
        ...cleanedAttrs,
        id: attrs.id ?? '',
        nodeType: attrs.nodeType,
        children: childrenMapped,
      },
    };
  }
}
