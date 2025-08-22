// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import { WeaveAction } from '@/actions/action';
import { type Vector2d } from 'konva/lib/types';
import {
  type WeaveTextToolActionOnAddingEvent,
  type WeaveTextToolActionState,
} from './types';
import {
  TEXT_LAYOUT,
  TEXT_TOOL_ACTION_NAME,
  TEXT_TOOL_STATE,
} from './constants';
import Konva from 'konva';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveTextNode } from '@/nodes/text/text';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import type { WeaveArrowToolActionOnAddingEvent } from '../arrow-tool/types';

export class WeaveTextToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeaveTextToolActionState;
  protected textId: string | null;
  protected container: Konva.Layer | Konva.Node | undefined;
  protected clickPoint: Vector2d | null;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  onInit = undefined;

  constructor() {
    super();

    this.initialized = false;
    this.state = TEXT_TOOL_STATE.IDLE;
    this.textId = null;
    this.container = undefined;
    this.clickPoint = null;
    this.props = this.initProps();
  }

  getName(): string {
    return TEXT_TOOL_ACTION_NAME;
  }

  initProps() {
    return {
      text: '',
      layout: TEXT_LAYOUT.AUTO_ALL,
      fontSize: 20,
      fontFamily: 'Arial, sans-serif',
      fill: '#000000',
      align: 'left',
      verticalAlign: 'top',
      strokeEnabled: false,
    };
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (
        e.key === 'Escape' &&
        this.instance.getActiveAction() === TEXT_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
    });

    stage.on('pointerover', () => {
      if (this.state === TEXT_TOOL_STATE.IDLE) return;

      stage.container().style.cursor = 'crosshair';
      stage.container().blur();
      stage.container().focus();
    });

    stage.on('pointerclick', () => {
      if (this.state === TEXT_TOOL_STATE.IDLE) {
        return;
      }

      if (this.state === TEXT_TOOL_STATE.ADDING) {
        this.handleAdding();
        return;
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveTextToolActionState) {
    this.state = state;
  }

  private addText() {
    const stage = this.instance.getStage();

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.hide();
    }

    stage.container().style.cursor = 'crosshair';
    stage.container().focus();

    this.instance.emitEvent<WeaveTextToolActionOnAddingEvent>('onAddingText');

    this.clickPoint = null;
    this.setState(TEXT_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const { mousePoint, container } = this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;

    this.textId = uuidv4();

    const nodeHandler = this.instance.getNodeHandler<WeaveTextNode>('text');

    if (nodeHandler) {
      const node = nodeHandler.create(this.textId, {
        ...this.props,
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        draggable: true,
      });
      this.instance.addNode(node, this.container?.getAttrs().id);

      this.instance.emitEvent<WeaveArrowToolActionOnAddingEvent>(
        'onAddedArrow'
      );
    }

    this.setState(TEXT_TOOL_STATE.FINISHED);
    this.cancelAction();
  }

  trigger(cancelAction: () => void): void {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    if (!this.initialized) {
      this.setupEvents();
    }

    this.cancelAction = cancelAction;

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      selectionPlugin.setSelectedNodes([]);
    }

    this.props = this.initProps();
    this.addText();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.textId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    const node = stage.findOne(`#${this.textId}`) as Konva.Text | undefined;
    if (node) {
      node.getAttr('triggerEditMode')(node);
    }

    this.initialCursor = null;
    this.textId = null;
    this.container = undefined;
    this.clickPoint = null;
    this.setState(TEXT_TOOL_STATE.IDLE);
  }
}
