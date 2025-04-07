import { WeavePlugin } from '@/plugins/plugin';
import {
  WeaveStageContextMenuPluginCallbacks,
  WeaveStageContextMenuPluginOptions,
} from './types';
import {
  WeaveElementInstance,
  WeaveSelection,
} from '@inditextech/weavejs-types';
import { Vector2d } from 'konva/lib/types';
import { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';

export class WeaveContextMenuPlugin extends WeavePlugin {
  private config: WeaveStageContextMenuPluginOptions;
  private callbacks: WeaveStageContextMenuPluginCallbacks;
  getLayerName = undefined;
  initLayer = undefined;
  render: undefined;

  constructor(
    options: WeaveStageContextMenuPluginOptions,
    callbacks: WeaveStageContextMenuPluginCallbacks
  ) {
    super();

    this.config = options;
    this.callbacks = callbacks;
  }

  registersLayers() {
    return false;
  }

  getName() {
    return 'contextMenu';
  }

  init() {
    this.initEvents();
  }

  private initEvents() {
    const stage = this.instance.getStage();

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    stage.on('contextmenu', (e) => {
      e.evt.preventDefault();

      if (!this.enabled) {
        return;
      }

      let clickOnTransformer = false;
      if (selectionPlugin) {
        const transformer = selectionPlugin.getTransformer();
        const box = transformer.getClientRect();
        const mousePos = stage.getPointerPosition();
        if (
          mousePos &&
          mousePos.x >= box.x &&
          mousePos.x <= box.x + box.width &&
          mousePos.y >= box.y &&
          mousePos.y <= box.y + box.height
        ) {
          clickOnTransformer = true;
        }
      }

      if (e.target === stage && !clickOnTransformer) {
        return;
      }

      let nodes: WeaveSelection[] = [];

      if (clickOnTransformer) {
        const transformer = selectionPlugin.getTransformer();

        nodes = transformer
          .getNodes()
          .map((node) => {
            const nodeHandler = this.instance.getNodeHandler(
              node.getAttrs().nodeType
            );

            return {
              instance: node as WeaveElementInstance,
              node: nodeHandler.toNode(node as WeaveElementInstance),
            };
          })
          .filter((node) => node !== undefined);
      }

      if (nodes.length > 0) {
        const containerRect = stage.container().getBoundingClientRect();
        const pointerPos = stage.getPointerPosition();

        if (containerRect && pointerPos) {
          const point: Vector2d = {
            x: containerRect.left + pointerPos.x + (this.config.xOffset ?? 4),
            y: containerRect.top + pointerPos.y + (this.config.yOffset ?? 4),
          };

          this.callbacks.onNodeMenu?.(this.instance, nodes, point);
        }
      }
    });
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}
