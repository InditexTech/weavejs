// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveAction } from '@/actions/action';
import { type WeaveEraserToolActionState } from './types';
import { ERASER_TOOL_ACTION_NAME, ERASER_TOOL_STATE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import type { WeaveNode } from '@/nodes/node';
import type { WeaveElementInstance } from '@inditextech/weave-types';

export class WeaveEraserToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state: WeaveEraserToolActionState;
  protected erasing: boolean = false;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  onInit = undefined;

  constructor() {
    super();

    this.initialized = false;
    this.erasing = false;
    this.state = ERASER_TOOL_STATE.IDLE;
  }

  getName(): string {
    return ERASER_TOOL_ACTION_NAME;
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.on('pointerclick', (e) => {
      e.evt.preventDefault();

      if (!this.erasing) {
        return;
      }

      const nodeIntersected = this.instance.pointIntersectsElement();

      if (nodeIntersected) {
        const realNode = this.instance.resolveNode(nodeIntersected);

        if (!realNode) {
          return;
        }

        const nodeType = realNode.getAttrs().nodeType;
        const nodeHandler = this.instance.getNodeHandler<WeaveNode>(nodeType);

        if (nodeHandler) {
          const nodeSerialized = nodeHandler.serialize(
            realNode as WeaveElementInstance
          );
          this.instance.removeNode(nodeSerialized);
        }
      }
    });

    stage.container().addEventListener('keydown', (e) => {
      if (
        e.key === 'Escape' &&
        this.instance.getActiveAction() === ERASER_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveEraserToolActionState) {
    this.state = state;
  }

  private setEraser() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'crosshair';
    stage.container().focus();

    this.erasing = true;

    this.setState(ERASER_TOOL_STATE.ERASING);
  }

  trigger(cancelAction: () => void): void {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    if (!this.initialized) {
      this.setupEvents();
    }
    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    this.cancelAction = cancelAction;

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      selectionPlugin.disable();
    }

    this.setEraser();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';
    this.erasing = false;

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      selectionPlugin.enable();
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    this.setState(ERASER_TOOL_STATE.IDLE);
  }
}
