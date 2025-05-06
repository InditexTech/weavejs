// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import { type Vector2d } from 'konva/lib/types';
import { FRAME_TOOL_ACTION_NAME, FRAME_TOOL_STATE } from './constants';
import Konva from 'konva';
import { WeaveAction } from '../action';
import { WEAVE_NODE_LAYER_ID } from '@inditextech/weave-types';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import {
  type WeaveFrameToolActionState,
  type WeaveFrameToolActionTriggerParams,
  type WeaveFrameToolCallbacks,
  type WeaveFrameToolProps,
} from './types';
import type { WeaveFrameNode } from '@/nodes/frame/frame';
import { WEAVE_FRAME_NODE_DEFAULT_PROPS } from '@/nodes/frame/constants';

export class WeaveFrameToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state: WeaveFrameToolActionState;
  protected frameId: string | null;
  protected container: Konva.Layer | Konva.Group | undefined;
  protected clickPoint: Vector2d | null;
  protected cancelAction!: () => void;
  internalUpdate = undefined;
  onInit = undefined;

  constructor(callbacks: WeaveFrameToolCallbacks) {
    super(callbacks);

    this.initialized = false;
    this.state = FRAME_TOOL_STATE.IDLE;
    this.frameId = null;
    this.container = undefined;
    this.clickPoint = null;
  }

  getName(): string {
    return FRAME_TOOL_ACTION_NAME;
  }

  initProps(params?: WeaveFrameToolActionTriggerParams): WeaveFrameToolProps {
    return {
      title: params?.title ?? WEAVE_FRAME_NODE_DEFAULT_PROPS.title,
      fontFamily:
        params?.fontFamily ?? WEAVE_FRAME_NODE_DEFAULT_PROPS.fontFamily,
      editing: false,
      opacity: 1,
    };
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cancelAction();
        return;
      }
    });

    stage.on('click tap', (e) => {
      e.evt.preventDefault();

      if (this.state === FRAME_TOOL_STATE.IDLE) {
        return;
      }

      if (this.state === FRAME_TOOL_STATE.ADDING) {
        this.handleAdding();
        return;
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveFrameToolActionState) {
    this.state = state;
  }

  private addFrame() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'crosshair';
    stage.container().focus();

    this.frameId = null;
    this.clickPoint = null;
    this.setState(FRAME_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const { mousePoint, container } = this.instance.getMousePointer();

    if (container?.getAttrs().id !== WEAVE_NODE_LAYER_ID) {
      this.cancelAction?.();
      return;
    }

    this.clickPoint = mousePoint;
    this.container = container;

    this.frameId = uuidv4();

    const nodeHandler = this.instance.getNodeHandler<WeaveFrameNode>('frame');

    const node = nodeHandler.create(this.frameId, {
      ...this.props,
      x: this.clickPoint.x,
      y: this.clickPoint.y,
    });

    this.instance.addNode(node, this.container?.getAttrs().id);

    this.cancelAction?.();
  }

  trigger(
    cancelAction: () => void,
    params?: WeaveFrameToolActionTriggerParams
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

    this.cancelAction = cancelAction;

    this.props = this.initProps(params);
    this.addFrame();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.frameId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction('selectionTool');
    }

    this.frameId = null;
    this.container = undefined;
    this.clickPoint = null;
    this.setState(FRAME_TOOL_STATE.IDLE);
  }
}
