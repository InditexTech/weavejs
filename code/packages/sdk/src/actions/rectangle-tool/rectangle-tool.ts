// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import { type Vector2d } from 'konva/lib/types';
import { type WeaveElementInstance } from '@inditextech/weave-types';
import { WeaveAction } from '@/actions/action';
import { type WeaveRectangleToolActionState } from './types';
import { RECTANGLE_TOOL_ACTION_NAME, RECTANGLE_TOOL_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import type { WeaveRectangleNode } from '@/nodes/rectangle/rectangle';

export class WeaveRectangleToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state: WeaveRectangleToolActionState;
  protected rectId: string | null;
  protected creating: boolean;
  protected moved: boolean;
  protected clickPoint: Vector2d | null;
  protected container!: Konva.Group | Konva.Layer | undefined;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  onInit = undefined;

  constructor() {
    super();

    this.initialized = false;
    this.state = RECTANGLE_TOOL_STATE.IDLE;
    this.rectId = null;
    this.creating = false;
    this.moved = false;
    this.container = undefined;
    this.clickPoint = null;
    this.props = this.initProps();
  }

  getName(): string {
    return RECTANGLE_TOOL_ACTION_NAME;
  }

  initProps() {
    return {
      opacity: 1,
      fill: '#71717aff',
      stroke: '#000000ff',
      strokeWidth: 1,
      width: 100,
      height: 100,
    };
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (
        e.key === 'Enter' &&
        this.instance.getActiveAction() === RECTANGLE_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
      if (
        e.key === 'Escape' &&
        this.instance.getActiveAction() === RECTANGLE_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
    });

    stage.on('mousedown touchstart', (e) => {
      e.evt.preventDefault();

      if (this.state === RECTANGLE_TOOL_STATE.ADDING) {
        this.creating = true;

        this.handleAdding();
      }
    });

    stage.on('mousemove touchmove', (e) => {
      e.evt.preventDefault();

      if (this.state === RECTANGLE_TOOL_STATE.DEFINING_SIZE) {
        this.moved = true;

        this.handleMovement();
      }
    });

    stage.on('mouseup touchend', (e) => {
      e.evt.preventDefault();

      if (this.state === RECTANGLE_TOOL_STATE.DEFINING_SIZE) {
        this.creating = false;

        this.handleSettingSize();
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveRectangleToolActionState) {
    this.state = state;
  }

  private addRectangle() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'crosshair';
    stage.container().focus();

    this.clickPoint = null;
    this.setState(RECTANGLE_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const { mousePoint, container } = this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;

    this.rectId = uuidv4();

    const nodeHandler =
      this.instance.getNodeHandler<WeaveRectangleNode>('rectangle');

    const node = nodeHandler.create(this.rectId, {
      ...this.props,
      strokeScaleEnabled: true,
      x: this.clickPoint?.x ?? 0,
      y: this.clickPoint?.y ?? 0,
      width: 0,
      height: 0,
    });

    this.instance.addNode(node, this.container?.getAttrs().id);

    this.setState(RECTANGLE_TOOL_STATE.DEFINING_SIZE);
  }

  private handleSettingSize() {
    const rectangle = this.instance.getStage().findOne(`#${this.rectId}`);

    if (this.rectId && this.clickPoint && this.container && rectangle) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.container
      );

      const nodeHandler =
        this.instance.getNodeHandler<WeaveRectangleNode>('rectangle');

      const rectPos: Vector2d = {
        x: this.clickPoint.x,
        y: this.clickPoint.y,
      };
      let rectWidth = this.props.width;
      let rectHeight = this.props.height;
      if (this.moved) {
        rectPos.x = Math.min(this.clickPoint.x, mousePoint.x);
        rectPos.y = Math.min(this.clickPoint.y, mousePoint.y);
        rectWidth = Math.abs(this.clickPoint.x - mousePoint.x);
        rectHeight = Math.abs(this.clickPoint.y - mousePoint.y);
      }

      rectangle.setAttrs({
        ...this.props,
        x: rectPos.x,
        y: rectPos.y,
        width: rectWidth,
        height: rectHeight,
      });

      this.instance.updateNode(
        nodeHandler.serialize(rectangle as WeaveElementInstance)
      );
    }

    this.cancelAction();
  }

  private handleMovement() {
    if (this.state !== RECTANGLE_TOOL_STATE.DEFINING_SIZE) {
      return;
    }

    const rectangle = this.instance.getStage().findOne(`#${this.rectId}`);

    if (this.rectId && this.container && this.clickPoint && rectangle) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.container
      );

      const deltaX = mousePoint.x - this.clickPoint?.x;
      const deltaY = mousePoint.y - this.clickPoint?.y;

      const nodeHandler =
        this.instance.getNodeHandler<WeaveRectangleNode>('rectangle');

      rectangle.setAttrs({
        width: deltaX,
        height: deltaY,
      });

      this.instance.updateNode(
        nodeHandler.serialize(rectangle as WeaveElementInstance)
      );
    }
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
      selectionPlugin.setSelectedNodes([]);
    }

    this.props = this.initProps();
    this.addRectangle();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.rectId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    this.rectId = null;
    this.creating = false;
    this.moved = false;
    this.container = undefined;
    this.clickPoint = null;
    this.setState(RECTANGLE_TOOL_STATE.IDLE);
  }
}
