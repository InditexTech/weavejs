import { WeaveAction } from '@inditextech/weave-sdk';
import { WeaveElementInstance, WeaveSelection } from '@inditextech/weave-types';
import Konva from 'konva';

export class AlignElementsToolAction extends WeaveAction {
  protected cancelAction!: () => void;
  internalUpdate = undefined;
  init = undefined;

  getName(): string {
    return 'alignElementsTool';
  }

  private alignElements(nodes: WeaveSelection[], gap: number) {
    if (nodes.length === 0) {
      this.cancelAction?.();
      return;
    }

    const instances: Konva.Node[] = [];
    let actualType: string | undefined = nodes[0].node.type;
    for (const node of nodes) {
      if (node.instance.getAttrs().nodeType === actualType) {
        instances.push(node.instance);
      }
      if (node.instance.getAttrs().nodeType !== actualType) {
        actualType = undefined;
        break;
      }
    }

    if (!actualType) {
      this.cancelAction?.();
      return;
    }

    let y: number | undefined = undefined;
    let prevInstance: Konva.Node | undefined = undefined;
    for (const [index, instance] of instances.entries()) {
      if (index === 0) {
        prevInstance = instance;
        y = instance.y();
        continue;
      }

      if (prevInstance) {
        const handler = this.instance.getNodeHandler(
          instance.getAttrs().nodeType
        );
        const node = handler.toNode(instance as WeaveElementInstance);

        const newNode = {
          ...node,
          props: {
            ...node.props,
            x: (prevInstance.x() ?? 0) + (prevInstance.width() ?? 0) + gap,
            y,
          },
        };

        instance.setAttrs({
          x: (prevInstance.x() ?? 0) + (prevInstance.width() ?? 0) + gap,
          y,
        });

        this.instance.updateNode(newNode);

        prevInstance = instance;
      }
    }

    this.cancelAction?.();
  }

  trigger(
    cancelAction: () => void,
    { gap = 20, nodes }: { gap: number; nodes: WeaveSelection[] }
  ) {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    this.cancelAction = cancelAction;

    this.alignElements(nodes, gap);
  }

  cleanup() {}
}
