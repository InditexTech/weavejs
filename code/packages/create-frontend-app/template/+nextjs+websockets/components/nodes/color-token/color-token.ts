import { WeaveNode } from '@inditextech/weave-sdk';
import {
  WeaveElementAttributes,
  WeaveElementInstance,
} from '@inditextech/weave-types';
import Konva from 'konva';
import { Inter } from 'next/font/google';

export const COLOR_TOKEN_NODE_TYPE = 'color-token';

const inter = Inter({
  preload: true,
  variable: '--inter',
  subsets: ['latin'],
});

export class ColorTokenNode extends WeaveNode {
  protected nodeType = COLOR_TOKEN_NODE_TYPE;

  onRender(props: WeaveElementAttributes) {
    const { id } = props;

    const colorTokenColor = props.colorToken ?? '#DEFFA0';

    const colorTokenParams = {
      ...props,
    };
    delete colorTokenParams.zIndex;

    const colorTokenNode = new Konva.Group({
      ...colorTokenParams,
      width: colorTokenParams.width,
      height: colorTokenParams.height,
      name: 'node',
    });

    const internalRect = new Konva.Rect({
      groupId: id,
      id: `${id}-colorToken`,
      x: 0,
      y: 0,
      fill: '#FFFFFFFF',
      width: colorTokenParams.width,
      height: colorTokenParams.height,
      draggable: false,
      stroke: 'black',
      strokeWidth: 2,
      name: 'node',
    });

    colorTokenNode.add(internalRect);

    const internalRect2 = new Konva.Rect({
      id: `${id}-colorToken-1`,
      groupId: id,
      x: 1,
      y: 1,
      fill: colorTokenColor,
      width: colorTokenParams.width - 2,
      height: (colorTokenParams.height ?? 0) - 60,
      listening: false,
      draggable: false,
    });

    colorTokenNode.add(internalRect2);

    const internalText = new Konva.Text({
      id: `${id}-colorToken-code`,
      groupId: id,
      x: 20,
      y: 260,
      fontSize: 20,
      fontFamily: inter.style.fontFamily,
      fill: '#CCCCCCFF',
      strokeEnabled: false,
      stroke: '#000000FF',
      strokeWidth: 1,
      text: `${colorTokenColor}`,
      width: (colorTokenParams.width ?? 0) - 40,
      height: 20,
      align: 'left',
      listening: false,
      draggable: false,
    });

    colorTokenNode.add(internalText);

    this.setupDefaultNodeEvents(colorTokenNode);

    return colorTokenNode;
  }

  onUpdate(
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
    const colorTokenCode = colorTokenNode.findOne(`#${id}-colorToken-code`);
    if (colorTokenCode) {
      colorTokenCode.setAttr('text', `${colorTokenColor}`);
    }
  }
}
