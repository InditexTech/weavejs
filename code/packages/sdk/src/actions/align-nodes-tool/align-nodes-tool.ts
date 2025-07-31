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
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';

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

  private getParents(nodes: Konva.Node[]): string[] {
    if (nodes.length === 0) return [];

    const counts: Record<
      string,
      { count: number; id: string; value: Konva.Node | null }
    > = {};

    for (const node of nodes) {
      let realNode: Konva.Node | undefined = node;
      if (node.getAttrs().nodeId) {
        realNode = this.instance
          .getStage()
          .findOne(`#${node.getAttrs().nodeId}`);
      }

      if (!realNode) {
        continue;
      }

      const parentId = realNode.getParent()?.getAttrs().id ?? '';
      const entry = counts[parentId];

      if (entry) {
        entry.count++;
      } else {
        counts[parentId] = {
          count: 1,
          id: realNode.getParent()?.getAttrs().id ?? '',
          value: realNode.getParent(),
        };
      }
    }

    return Object.keys(counts).map((key) => counts[key].id);
  }

  private alignToLeftHorizontal(nodes: Konva.Node[]) {
    let targetX = Infinity;

    for (const node of nodes) {
      const box = node.getClientRect({
        relativeTo: this.instance.getStage(),
      });

      const realX = box.x;
      if (realX < targetX) {
        targetX = realX;
      }
    }

    for (const node of nodes) {
      let realNode: Konva.Node | undefined = node;
      if (node.getAttrs().nodeId) {
        realNode = this.instance
          .getStage()
          .findOne(`#${node.getAttrs().nodeId}`);
      }

      if (!realNode) {
        continue;
      }

      const box = node.getClientRect({
        relativeTo: this.instance.getStage(),
      });

      const deltaX = targetX - box.x;
      realNode.x(realNode.x() + deltaX);
      this.updateNode(realNode);
    }
  }

  private alignToCenterHorizontal(nodes: Konva.Node[]) {
    let minX = Infinity;
    let maxX = -Infinity;

    for (const node of nodes) {
      const box = node.getClientRect({
        relativeTo: this.instance.getStage(),
      });

      const realX = box.x;
      const realXWidth = box.x + box.width;
      if (realX < minX) {
        minX = realX;
      }
      if (realXWidth > maxX) {
        maxX = realXWidth;
      }
    }

    const targetX = minX + (maxX - minX) / 2;

    for (const node of nodes) {
      let realNode: Konva.Node | undefined = node;
      if (node.getAttrs().nodeId) {
        realNode = this.instance
          .getStage()
          .findOne(`#${node.getAttrs().nodeId}`);
      }

      if (!realNode) {
        continue;
      }

      const box = node.getClientRect({
        relativeTo: this.instance.getStage(),
      });

      const deltaX = targetX - (box.x + box.width / 2);
      realNode.x(realNode.x() + deltaX);
      this.updateNode(realNode);
    }
  }

  private alignToRightHorizontal(nodes: Konva.Node[]) {
    let targetX = -Infinity;

    for (const node of nodes) {
      const box = node.getClientRect({
        relativeTo: this.instance.getStage(),
      });

      const realX = box.x + box.width;
      if (realX > targetX) {
        targetX = realX;
      }
    }

    for (const node of nodes) {
      let realNode: Konva.Node | undefined = node;
      if (node.getAttrs().nodeId) {
        realNode = this.instance
          .getStage()
          .findOne(`#${node.getAttrs().nodeId}`);
      }

      if (!realNode) {
        continue;
      }

      const box = node.getClientRect({
        relativeTo: this.instance.getStage(),
      });

      const deltaX = targetX - (box.x + box.width);
      realNode.x(realNode.x() + deltaX);
      this.updateNode(realNode);
    }
  }

  private alignToTopVertical(nodes: Konva.Node[]) {
    let targetY = Infinity;

    for (const node of nodes) {
      let realNode: Konva.Node | undefined = node;
      if (node.getAttrs().nodeId) {
        realNode = this.instance
          .getStage()
          .findOne(`#${node.getAttrs().nodeId}`);
      }

      if (!realNode) {
        continue;
      }

      const box = realNode.getClientRect({
        relativeTo: this.instance.getStage(),
      });

      const realY = box.y;
      if (realY < targetY) {
        targetY = realY;
      }
    }

    for (const node of nodes) {
      let realNode: Konva.Node | undefined = node;
      if (node.getAttrs().nodeId) {
        realNode = this.instance
          .getStage()
          .findOne(`#${node.getAttrs().nodeId}`);
      }

      if (!realNode) {
        continue;
      }

      const box = realNode.getClientRect({
        relativeTo: this.instance.getStage(),
      });

      const deltaY = targetY - box.y;
      realNode.y(realNode.y() + deltaY);
      this.updateNode(realNode);
    }
  }

  private alignToCenterVertical(nodes: Konva.Node[]) {
    let minY = Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      let realNode: Konva.Node | undefined = node;
      if (node.getAttrs().nodeId) {
        realNode = this.instance
          .getStage()
          .findOne(`#${node.getAttrs().nodeId}`);
      }

      if (!realNode) {
        continue;
      }

      const box = realNode.getClientRect({
        relativeTo: this.instance.getStage(),
      });

      const realY = box.y;
      const realYWidth = box.y + box.height;
      if (realY < minY) {
        minY = realY;
      }
      if (realYWidth > maxY) {
        maxY = realYWidth;
      }
    }

    const targetY = minY + (maxY - minY) / 2;

    for (const node of nodes) {
      let realNode: Konva.Node | undefined = node;
      if (node.getAttrs().nodeId) {
        realNode = this.instance
          .getStage()
          .findOne(`#${node.getAttrs().nodeId}`);
      }

      if (!realNode) {
        continue;
      }

      const box = realNode.getClientRect({
        relativeTo: this.instance.getStage(),
      });

      const deltaY = targetY - (box.y + box.height / 2);
      realNode.y(realNode.y() + deltaY);
      this.updateNode(realNode);
    }
  }

  private alignToBottomVertical(nodes: Konva.Node[]) {
    let targetY = -Infinity;

    for (const node of nodes) {
      let realNode: Konva.Node | undefined = node;
      if (node.getAttrs().nodeId) {
        realNode = this.instance
          .getStage()
          .findOne(`#${node.getAttrs().nodeId}`);
      }

      if (!realNode) {
        continue;
      }

      const box = realNode.getClientRect({
        relativeTo: this.instance.getStage(),
      });

      const realY = box.y + box.height;
      if (realY > targetY) {
        targetY = realY;
      }
    }

    for (const node of nodes) {
      let realNode: Konva.Node | undefined = node;
      if (node.getAttrs().nodeId) {
        realNode = this.instance
          .getStage()
          .findOne(`#${node.getAttrs().nodeId}`);
      }

      if (!realNode) {
        continue;
      }

      const box = realNode.getClientRect({
        relativeTo: this.instance.getStage(),
      });

      const deltaY = targetY - (box.y + box.height);
      realNode.y(realNode.y() + deltaY);
      this.updateNode(realNode);
    }
  }

  private alignNodes(alignTo: WeaveAlignNodesToolActionAlignTo) {
    let selectedNodes: (Konva.Group | Konva.Shape)[] = [];

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      selectedNodes = selectionPlugin.getSelectedNodes();
    }

    const parentsIds = this.getParents(selectedNodes);

    let parent = this.instance.getMainLayer();
    if (parentsIds.length === 1) {
      parent = this.instance.getStage().findOne(`#${parentsIds[0]}`);
    }
    if (parentsIds.length > 1 && !parentsIds.includes('mainLayer')) {
      this.cancelAction();
      return;
    }

    selectedNodes = [
      ...selectedNodes.filter((node) => {
        let realNode: Konva.Node | undefined = node;
        if (node.getAttrs().nodeId) {
          realNode = this.instance
            .getStage()
            .findOne(`#${node.getAttrs().nodeId}`);
        }

        return realNode?.getParent()?.getAttrs().id === parent?.getAttrs().id;
      }),
    ];

    switch (alignTo) {
      case ALIGN_NODES_ALIGN_TO.LEFT_HORIZONTAL: {
        this.alignToLeftHorizontal(selectedNodes);
        break;
      }
      case ALIGN_NODES_ALIGN_TO.CENTER_HORIZONTAL: {
        this.alignToCenterHorizontal(selectedNodes);
        break;
      }
      case ALIGN_NODES_ALIGN_TO.RIGHT_HORIZONTAL: {
        this.alignToRightHorizontal(selectedNodes);
        break;
      }
      case ALIGN_NODES_ALIGN_TO.TOP_VERTICAL: {
        this.alignToTopVertical(selectedNodes);
        break;
      }
      case ALIGN_NODES_ALIGN_TO.CENTER_VERTICAL: {
        this.alignToCenterVertical(selectedNodes);
        break;
      }
      case ALIGN_NODES_ALIGN_TO.BOTTOM_VERTICAL: {
        this.alignToBottomVertical(selectedNodes);
        break;
      }
      default:
        break;
    }

    this.cancelAction();
  }

  canAlignSelectedNodes(): boolean {
    let selectedNodes: (Konva.Group | Konva.Shape)[] = [];

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      selectedNodes = selectionPlugin.getSelectedNodes();
    }

    const parentsIds = this.getParents(selectedNodes);

    if (parentsIds.length > 1) {
      return false;
    }

    return true;
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
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    this.setState(ALIGN_NODES_TOOL_STATE.IDLE);
  }
}
