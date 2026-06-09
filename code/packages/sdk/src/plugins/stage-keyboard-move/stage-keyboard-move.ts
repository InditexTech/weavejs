// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeavePlugin } from '@/plugins/plugin';
import {
  WEAVE_STAGE_KEYBOARD_MOVE_DEFAULT_CONFIG,
  WEAVE_STAGE_KEYBOARD_MOVE_KEY,
  WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION,
} from './constants';
import type { WeaveNodesSelectionPlugin } from '../nodes-selection/nodes-selection';
import type {
  WeaveMoveOrientation,
  WeaveStageKeyboardMovePluginConfig,
  WeaveStageKeyboardMovePluginParams,
} from './types';
import type { WeaveNode } from '@/nodes/node';
import { mergeExceptArrays } from '@/utils/utils';

export class WeaveStageKeyboardMovePlugin extends WeavePlugin {
  private config!: WeaveStageKeyboardMovePluginConfig;
  getLayerName = undefined;
  initLayer = undefined;
  onRender: undefined;
  initialize = undefined;

  constructor(params?: WeaveStageKeyboardMovePluginParams) {
    super();

    this.config = mergeExceptArrays(
      WEAVE_STAGE_KEYBOARD_MOVE_DEFAULT_CONFIG,
      params?.config ?? {}
    );
  }

  getName(): string {
    return WEAVE_STAGE_KEYBOARD_MOVE_KEY;
  }

  handleNodesMovement(
    movementOrientation: WeaveMoveOrientation,
    { isShiftPressed }: { isShiftPressed: boolean }
  ) {
    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      const selectedNodes = nodesSelectionPlugin.getSelectedNodes();

      const movementDelta = isShiftPressed
        ? this.config.shiftMovementDelta
        : this.config.movementDelta;

      for (const node of selectedNodes) {
        switch (movementOrientation) {
          case WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.UP:
            node.y(node.y() - movementDelta);
            break;
          case WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.DOWN:
            node.y(node.y() + movementDelta);
            break;
          case WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.LEFT:
            node.x(node.x() - movementDelta);
            break;
          case WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.RIGHT:
            node.x(node.x() + movementDelta);
            break;
        }

        this.instance.emitEvent('onNodeKeyboardMove', {
          node,
          orientation: movementOrientation,
          delta: movementDelta,
        });

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
    window.addEventListener(
      'keydown',
      (e) => {
        const isShiftPressed = e.shiftKey || e.code === 'Shift';

        if (e.code === 'ArrowUp') {
          this.handleNodesMovement(WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.UP, {
            isShiftPressed,
          });
        }
        if (e.code === 'ArrowLeft') {
          this.handleNodesMovement(WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.LEFT, {
            isShiftPressed,
          });
        }
        if (e.code === 'ArrowRight') {
          this.handleNodesMovement(
            WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.RIGHT,
            { isShiftPressed }
          );
        }
        if (e.code === 'ArrowDown') {
          this.handleNodesMovement(WEAVE_STAGE_KEYBOARD_MOVE_ORIENTATION.DOWN, {
            isShiftPressed,
          });
        }
      },
      { signal: this.instance.getEventsController().signal }
    );
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }
}
