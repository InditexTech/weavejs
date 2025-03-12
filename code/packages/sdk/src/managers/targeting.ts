import Konva from 'konva';
import { Weave } from '@/weave';
import { Vector2d } from 'konva/lib/types';
import { Logger } from 'pino';

export class WeaveTargetingManager {
  private instance: Weave;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('targeting-manager');
    this.logger.debug('Targeting manager created');
  }

  getMousePointer(point?: Vector2d) {
    this.logger.debug({ point }, 'getMousePointer');
    const stage = this.instance.getStage();
    const mainLayer = this.instance.getMainLayer();

    let relativeMousePointer = point
      ? point
      : stage.getPointerPosition() ?? { x: 0, y: 0 };
    let measureContainer: Konva.Layer | Konva.Group | undefined = mainLayer;
    let container: Konva.Layer | Konva.Group | undefined = mainLayer;

    const intersectedNode = stage.getIntersection(relativeMousePointer);
    if (intersectedNode) {
      const node = this.instance.getInstanceRecursive(intersectedNode, [
        'group',
      ]);
      if (node && node instanceof Konva.Group && node.getAttrs().containerId) {
        measureContainer = (node as Konva.Group).findOne(
          `#${node.getAttrs().containerId}`
        ) as Konva.Group;
        container = node;
      }
    }

    if (container?.getAttrs().nodeType !== 'layer') {
      relativeMousePointer =
        measureContainer?.getRelativePointerPosition() ?? relativeMousePointer;
    }

    if (container?.getAttrs().nodeType === 'layer') {
      relativeMousePointer = measureContainer?.getRelativePointerPosition() ?? {
        x: 0,
        y: 0,
      };
    }

    return { mousePoint: relativeMousePointer, container, measureContainer };
  }

  getMousePointerRelativeToContainer(container: Konva.Group | Konva.Layer) {
    const relativeMousePointer = container.getRelativePointerPosition() ?? {
      x: 0,
      y: 0,
    };

    return { mousePoint: relativeMousePointer, container };
  }
}
