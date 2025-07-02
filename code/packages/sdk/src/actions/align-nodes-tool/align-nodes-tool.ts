// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveAction } from '@/actions/action';
import {
  type WeaveAlignNodesToolActionAlignTo,
  type WeaveAlignNodesToolActionState,
  type WeaveAlignNodesToolActionTriggerParams,
} from './types';
import {
  ALIGN_NODES_TOOL_ACTION_NAME,
  ALIGN_NODES_TOOL_STATE,
  ALIGN_NODES_ALIGN_TO,
} from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type Konva from 'konva';
import type { WeaveNode } from '@/nodes/node';
import type { WeaveElementInstance } from '@inditextech/weave-types';

export class WeaveAlignNodesToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state: WeaveAlignNodesToolActionState;
  protected triggerSelectionTool!: boolean;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  onInit = undefined;

  constructor() {
    super();

    this.initialized = false;
    this.state = ALIGN_NODES_TOOL_STATE.IDLE;
  }

  getName(): string {
    return ALIGN_NODES_TOOL_ACTION_NAME;
  }

  private setupEvents() {
    this.initialized = true;
  }

  private setState(state: WeaveAlignNodesToolActionState) {
    this.state = state;
  }

  private updateNode(node: Konva.Node) {
    const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
      node.getAttrs().nodeType
    );
    if (nodeHandler) {
      const actualNode = nodeHandler.serialize(node as WeaveElementInstance);
      this.instance.updateNode(actualNode);
    }
  }

  private alignNodes(alignTo: WeaveAlignNodesToolActionAlignTo) {
    let selectedNodes: (Konva.Group | Konva.Shape)[] = [];

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      selectedNodes = selectionPlugin.getSelectedNodes();
    }

    switch (alignTo) {
      case ALIGN_NODES_ALIGN_TO.LEFT_HORIZONTAL: {
        let minX = Infinity;

        for (const node of selectedNodes) {
          if (node.x() < minX) {
            minX = node.x();
          }
        }

        for (const node of selectedNodes) {
          node.x(minX);
          this.updateNode(node);
        }

        break;
      }
      case ALIGN_NODES_ALIGN_TO.CENTER_HORIZONTAL: {
        let maxX = -Infinity;
        let minX = Infinity;

        for (const node of selectedNodes) {
          if (node.x() < minX) {
            minX = node.x();
          }
          if (node.x() > maxX) {
            maxX = node.x();
          }
        }

        for (const node of selectedNodes) {
          node.x((Math.abs(maxX) - Math.abs(minX)) / 2);
          this.updateNode(node);
        }
        break;
      }
      case ALIGN_NODES_ALIGN_TO.RIGHT_HORIZONTAL: {
        let maxX = -Infinity;

        for (const node of selectedNodes) {
          if (node.x() > maxX) {
            maxX = node.x();
          }
        }

        for (const node of selectedNodes) {
          node.x(maxX);
          this.updateNode(node);
        }
        break;
      }
      case ALIGN_NODES_ALIGN_TO.TOP_VERTICAL: {
        let minY = Infinity;

        for (const node of selectedNodes) {
          if (node.y() < minY) {
            minY = node.y();
          }
        }

        for (const node of selectedNodes) {
          node.y(minY);
          this.updateNode(node);
        }
        break;
      }
      case ALIGN_NODES_ALIGN_TO.CENTER_VERTICAL: {
        let maxY = -Infinity;
        let minY = Infinity;

        for (const node of selectedNodes) {
          if (node.y() < minY) {
            minY = node.y();
          }
          if (node.y() > maxY) {
            maxY = node.y();
          }
        }

        for (const node of selectedNodes) {
          node.y((Math.abs(maxY) - Math.abs(minY)) / 2);
          this.updateNode(node);
        }
        break;
      }
      case ALIGN_NODES_ALIGN_TO.BOTTOM_VERTICAL: {
        let maxY = -Infinity;

        for (const node of selectedNodes) {
          if (node.y() > maxY) {
            maxY = node.y();
          }
        }

        for (const node of selectedNodes) {
          node.y(maxY);
          this.updateNode(node);
        }
        break;
      }
      default:
        break;
    }

    this.cancelAction();
  }

  trigger(
    cancelAction: () => void,
    {
      alignTo,
      triggerSelectionTool = true,
    }: WeaveAlignNodesToolActionTriggerParams
  ): void {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    if (!this.initialized) {
      this.setupEvents();
    }
    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    this.triggerSelectionTool = triggerSelectionTool;
    this.cancelAction = cancelAction;

    this.alignNodes(alignTo);
  }

  cleanup(): void {
    if (this.triggerSelectionTool) {
      this.instance.triggerAction('selectionTool');
    }

    this.setState(ALIGN_NODES_TOOL_STATE.IDLE);
  }
}
