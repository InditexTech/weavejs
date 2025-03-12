import Konva from 'konva';
import { WeaveElementAttributes, WeaveElementInstance } from '@/types';
import { WeaveNode } from '../node';

export const WEAVE_LINE_NODE_TYPE = 'line';

export class WeaveLineNode extends WeaveNode {
  protected nodeType = WEAVE_LINE_NODE_TYPE;

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
    const line = new Konva.Line({
      ...props,
    });

    this.setupDefaultNodeEvents(line);

    return line;
  }

  updateInstance(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ) {
    nodeInstance.setAttrs({
      ...nextProps,
    });
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
