import { WeaveNode } from '@inditextech/weavejs-sdk';
import {
  WeaveElementAttributes,
  WeaveElementInstance,
} from '@inditextech/weavejs-types';
import Konva from 'konva';
import { Noto_Sans_Mono } from 'next/font/google';

export const COLOR_TOKEN_NODE_TYPE = 'color-token';

const notoSansMono = Noto_Sans_Mono({
  preload: true,
  variable: '--font-noto-sans-mono',
  subsets: ['latin'],
});

export class ColorTokenNode extends WeaveNode {
  protected nodeType = COLOR_TOKEN_NODE_TYPE;

  createNode(key: string, props: WeaveElementAttributes) {
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

  createInstance(props: WeaveElementAttributes) {
    const { id } = props;

    const colorTokenColor = props.colorToken ?? '#DEFFA0';

    const colorTokenParams = {
      ...props,
    };
    delete colorTokenParams.zIndex;

    const colorToken = new Konva.Group({
      ...colorTokenParams,
      width: colorTokenParams.width,
      height: colorTokenParams.height,
      name: 'node',
    });

    const internalRect = new Konva.Rect({
      groupId: id,
      x: 0,
      y: 0,
      fill: '#FFFFFFFF',
      width: colorTokenParams.width,
      height: colorTokenParams.height,
      draggable: false,
      listening: true,
      stroke: 'black',
      strokeWidth: 2,
    });

    colorToken.add(internalRect);

    const internalRect2 = new Konva.Rect({
      id: `${id}-colorToken-1`,
      groupId: id,
      x: 1,
      y: 1,
      fill: colorTokenColor,
      width: colorTokenParams.width - 2,
      height: (colorTokenParams.height ?? 0) - 60,
      draggable: false,
    });

    colorToken.add(internalRect2);

    const internalRect3 = new Konva.Rect({
      id: `${id}-colorToken-2`,
      groupId: id,
      x: 1,
      y: 168,
      fill: colorTokenColor,
      width: colorTokenParams.width - 2,
      height: 12,
      draggable: false,
    });

    colorToken.add(internalRect3);

    const internalText = new Konva.Text({
      id: `${id}-colorToken-code`,
      groupId: id,
      x: 20,
      y: 260,
      fontSize: 20,
      fontFamily: notoSansMono.style.fontFamily,
      fill: '#CCCCCCFF',
      strokeEnabled: false,
      stroke: '#000000FF',
      strokeWidth: 1,
      text: `${colorTokenColor}`,
      width: (colorTokenParams.width ?? 0) - 40,
      height: 20,
      align: 'left',
      draggable: false,
    });

    colorToken.add(internalText);

    this.setupDefaultNodeEvents(colorToken);

    return colorToken;
  }

  updateInstance(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ) {
    const { id, colorToken } = nextProps;

    const colorTokenNode = nodeInstance as Konva.Group;

    const nodeInstanceZIndex = nodeInstance.zIndex();
    nodeInstance.setAttrs({
      ...nextProps,
      zIndex: nodeInstanceZIndex,
    });

    const colorTokenColor = colorToken ?? '#DEFFA0';

    const colorTokenNode1 = colorTokenNode.findOne(`#${id}-colorToken-1`);
    if (colorTokenNode1) {
      colorTokenNode1.setAttrs({
        fill: colorTokenColor,
      });
    }
    const colorTokenNode2 = colorTokenNode.findOne(`#${id}-colorToken-2`);
    if (colorTokenNode2) {
      colorTokenNode2.setAttrs({
        fill: colorTokenColor,
      });
    }
    const colorTokenCode = colorTokenNode.findOne(`#${id}-colorToken-code`);
    if (colorTokenCode) {
      colorTokenCode.setAttr('text', `${colorTokenColor}`);
    }
  }

  removeInstance(nodeInstance: WeaveElementInstance) {
    nodeInstance.destroy();
  }

  toNode(instance: WeaveElementInstance) {
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
