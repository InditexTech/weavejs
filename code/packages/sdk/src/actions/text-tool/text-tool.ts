// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import { WeaveAction } from '@/actions/action';
import { type Vector2d } from 'konva/lib/types';
import { type WeaveTextToolActionState } from './types';
import { TEXT_TOOL_STATE } from './constants';
import Konva from 'konva';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';

export class WeaveTextToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeaveTextToolActionState;
  protected textId: string | null;
  protected container: Konva.Layer | Konva.Group | undefined;
  protected clickPoint: Vector2d | null;
  protected cancelAction!: () => void;
  internalUpdate = undefined;
  onInit = undefined;

  constructor() {
    super();

    this.initialized = false;
    this.state = TEXT_TOOL_STATE.IDLE;
    this.textId = null;
    this.container = undefined;
    this.clickPoint = null;
  }

  getName(): string {
    return 'textTool';
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

      if (this.state === TEXT_TOOL_STATE.IDLE) {
        return;
      }

      if (this.state === TEXT_TOOL_STATE.ADDING) {
        this.handleAdding();
        return;
      }
    });

    stage.on('mousemove touchmove', (e) => {
      e.evt.preventDefault();
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

    this.clickPoint = null;
    this.setState(TEXT_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const { mousePoint, container } = this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;

    this.textId = uuidv4();

    const nodeHandler = this.instance.getNodeHandler('text');

    const node = nodeHandler.create(this.textId, {
      x: this.clickPoint?.x ?? 0,
      y: this.clickPoint?.y ?? 0,
      text: 'Your text here...',
      width: 300,
      fontSize: 20,
      fontFamily: 'NotoSansMono, monospace',
      fill: '#000000ff',
      strokeEnabled: false,
      stroke: '#000000ff',
      strokeWidth: 1,
      align: 'left',
      verticalAlign: 'top',
      opacity: 1,
      draggable: true,
    });

    this.instance.addNode(node, this.container?.getAttrs().id);

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

    this.addText();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

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
