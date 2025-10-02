// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeavePlugin } from '@/plugins/plugin';
import merge from 'lodash/merge';
import {
  WEAVE_STAGE_KEYBOARD_MOVE_DEFAULT_CONFIG,
  WEAVE_STAGE_KEYBOARD_MOVE_KEY,
} from './constants';
import type { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';
import type {
  WeaveMoveOrientation,
  WeaveStageKeyboardMovePluginConfig,
  WeaveStageKeyboardMovePluginParams,
} from './types';
import type { WeaveNode } from '@/nodes/node';

export class WeaveStageKeyboardMovePlugin extends WeavePlugin {
  private config!: WeaveStageKeyboardMovePluginConfig;
  getLayerName = undefined;
  initLayer = undefined;
  onRender: undefined;

  constructor(params?: WeaveStageKeyboardMovePluginParams) {
    super();

    this.config = merge(
      WEAVE_STAGE_KEYBOARD_MOVE_DEFAULT_CONFIG,
      params?.config ?? {}
    );
  }

  getName(): string {
    return WEAVE_STAGE_KEYBOARD_MOVE_KEY;
  }

  handleNodesMovement(movementOrientation: WeaveMoveOrientation) {
    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      const selectedNodes = nodesSelectionPlugin.getSelectedNodes();

      for (const node of selectedNodes) {
        switch (movementOrientation) {
          case 'up':
            node.y(node.y() - this.config.movementDelta);
            break;
          case 'down':
            node.y(node.y() + this.config.movementDelta);
            break;
          case 'left':
            node.x(node.x() - this.config.movementDelta);
            break;
          case 'right':
            node.x(node.x() + this.config.movementDelta);
            break;
        }

        const nodeHandler = this.instance.getNodeHandler<WeaveNode>(
          node.getAttrs().nodeType
        );

        if (!nodeHandler) {
          break;
        }

        this.instance.updateNode(nodeHandler.serialize(node));
      }
    }
  }

  onInit(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' && e.shiftKey) {
        this.handleNodesMovement('up');
      }
      if (e.key === 'ArrowLeft' && e.shiftKey) {
        this.handleNodesMovement('left');
      }
      if (e.key === 'ArrowRight' && e.shiftKey) {
        this.handleNodesMovement('right');
      }
      if (e.key === 'ArrowDown' && e.shiftKey) {
        this.handleNodesMovement('down');
      }
    });
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
