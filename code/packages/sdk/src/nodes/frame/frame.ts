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
  WEAVE_FRAME_NODE_DEFAULT_PROPS,
  WEAVE_FRAME_NODE_TYPE,
} from './constants';
import type { WeaveFrameAttributes } from './types';

export class WeaveFrameNode extends WeaveNode {
  protected nodeType: string = WEAVE_FRAME_NODE_TYPE;

  create(key: string, props: Partial<WeaveFrameAttributes>): WeaveStateElement {
    return {
      key,
      type: this.nodeType,
      props: {
        ...props,
        id: key,
        nodeType: this.nodeType,
        ...WEAVE_FRAME_NODE_DEFAULT_PROPS,
        ...(props.fontFamily && { title: props.fontFamily }),
        ...(props.title && { title: props.title }),
        ...(props.titleHeight && { titleHeight: props.titleHeight }),
        ...(props.borderColor && { borderColor: props.borderColor }),
        ...(props.borderWidth && { borderWidth: props.borderWidth }),
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, zIndex, ...restProps } = props;

    const frameParams = {
      ...restProps,
    };

    const frame = new Konva.Group({
      ...frameParams,
      id,
      containerId: `${id}-group-internal`,
      containerOffsetX: 0,
      containerOffsetY: props.titleHeight + props.borderWidth,
      width: props.frameWidth + props.borderWidth * 2,
      height: props.frameHeight + props.titleHeight + props.borderWidth * 2,
      fill: '#ffffffff',
      clipX: 0,
      clipY: 0,
      clipWidth: props.frameWidth + props.borderWidth * 2,
      clipHeight: props.frameHeight + props.titleHeight + props.borderWidth * 2,
      name: 'node',
    });

    const background = new Konva.Rect({
      id: `${id}-bg`,
      nodeId: id,
      x: props.borderWidth,
      y: props.titleHeight + props.borderWidth,
      width: props.frameWidth,
      stroke: props.borderColor,
      strokeWidth: props.borderWidth,
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
      height: props.titleHeight - 10,
      fontSize: 20,
      fontFamily: props.fontFamily,
      align: 'left',
      text: props.title,
      stroke: '#000000ff',
      strokeWidth: 1,
      listening: false,
      draggable: false,
    });

    frame.add(text);

    const frameInternal = new Konva.Group({
      id: `${id}-group-internal`,
      nodeId: id,
      x: props.borderWidth,
      y: props.titleHeight + props.borderWidth,
      width: props.frameWidth,
      height: props.frameHeight,
      draggable: false,
      stroke: 'transparent',
      borderWidth: props.borderWidth,
      clipX: 0,
      clipY: 0,
      clipWidth: props.frameWidth,
      clipHeight: props.frameHeight,
    });

    frame.add(frameInternal);

    this.setupDefaultNodeEvents(frame);

    frame.on(WEAVE_NODE_CUSTOM_EVENTS.onTargetLeave, () => {
      background.setAttrs({
        stroke: '#000000ff',
        strokeWidth: props.borderWidth,
        fill: '#ffffffff',
      });
    });

    frame.on(WEAVE_NODE_CUSTOM_EVENTS.onTargetEnter, () => {
      background.setAttrs({
        stroke: '#ff6863ff',
        strokeWidth: props.borderWidth,
        fill: '#ecececff',
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
    delete newProps.title;

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
