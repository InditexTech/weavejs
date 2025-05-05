// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { WeaveNode } from '../node';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
} from '@inditextech/weave-types';
import { WEAVE_FRAME_NODE_TYPE } from './constants';

export class WeaveFrameNode extends WeaveNode {
  protected nodeType: string = WEAVE_FRAME_NODE_TYPE;

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const { id } = props;

    const frameParams = {
      ...props,
    };
    delete frameParams.fontFamily;
    delete frameParams.zIndex;

    const frameWidth = 1403;
    const frameHeight = 992;
    const titleHeight = 30;
    const strokeWidth = 2;

    const frame = new Konva.Group({
      ...frameParams,
      containerId: `${id}-group-internal`,
      containerOffsetX: 0,
      containerOffsetY: titleHeight + strokeWidth,
      width: frameWidth + strokeWidth * 2,
      height: frameHeight + titleHeight + strokeWidth * 2,
      fill: '#ffffffff',
      clipX: 0,
      clipY: 0,
      clipWidth: frameWidth + strokeWidth * 2,
      clipHeight: frameHeight + titleHeight + strokeWidth * 2,
      name: 'node',
    });

    const background = new Konva.Rect({
      id: `${id}-bg`,
      nodeId: id,
      x: strokeWidth,
      y: titleHeight + strokeWidth,
      width: frameWidth,
      stroke: '#000000ff',
      strokeWidth: 2,
      height: frameHeight,
      fill: '#ffffffff',
      draggable: false,
    });

    frame.add(background);

    const text = new Konva.Text({
      id: `${id}-title`,
      x: 0,
      y: 0,
      width: frameWidth,
      height: titleHeight - 10,
      fontSize: 20,
      fontFamily: props.fontFamily,
      align: 'left',
      text: frameParams.title,
      stroke: '#000000ff',
      strokeWidth: 1,
      listening: false,
      draggable: false,
    });

    frame.add(text);

    const frameInternal = new Konva.Group({
      id: `${id}-group-internal`,
      nodeId: id,
      x: strokeWidth,
      y: titleHeight + strokeWidth,
      width: frameWidth,
      height: frameHeight,
      draggable: false,
      stroke: 'transparent',
      strokeWidth,
      clipX: 0,
      clipY: 0,
      clipWidth: frameWidth,
      clipHeight: frameHeight,
    });

    frame.add(frameInternal);

    this.setupDefaultNodeEvents(frame);

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
