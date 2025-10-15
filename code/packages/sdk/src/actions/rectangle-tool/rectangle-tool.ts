// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import { type Vector2d } from 'konva/lib/types';
import { WeaveAction } from '@/actions/action';
import {
  type WeaveRectangleToolActionOnAddingEvent,
  type WeaveRectangleToolActionState,
} from './types';
import { RECTANGLE_TOOL_ACTION_NAME, RECTANGLE_TOOL_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import type { WeaveRectangleNode } from '@/nodes/rectangle/rectangle';

export class WeaveRectangleToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state: WeaveRectangleToolActionState;
  protected rectId: string | null;
  protected moved: boolean;
  protected tempRectNode: Konva.Rect | null;
  protected pointers: Map<number, Vector2d>;
  protected clickPoint: Vector2d | null;
  protected container!: Konva.Layer | Konva.Node | undefined;
  protected measureContainer: Konva.Layer | Konva.Group | undefined;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  onInit = undefined;

  constructor() {
    super();

    this.pointers = new Map<number, Vector2d>();
    this.initialized = false;
    this.state = RECTANGLE_TOOL_STATE.IDLE;
    this.rectId = null;
    this.tempRectNode = null;
    this.moved = false;
    this.container = undefined;
    this.measureContainer = undefined;
    this.clickPoint = null;
    this.props = this.initProps();
  }

  getName(): string {
    return RECTANGLE_TOOL_ACTION_NAME;
  }

  initProps() {
    return {
      opacity: 1,
      fill: '#ffffffff',
      stroke: '#000000ff',
      strokeWidth: 1,
      width: 100,
      height: 100,
    };
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    window.addEventListener('keydown', (e) => {
      if (
        e.code === 'Enter' &&
        this.instance.getActiveAction() === RECTANGLE_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
      if (
        e.code === 'Escape' &&
        this.instance.getActiveAction() === RECTANGLE_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
    });

    stage.on('pointermove', () => {
      if (this.state === RECTANGLE_TOOL_STATE.IDLE) return;

      this.setCursor();
    });

    stage.on('pointerdown', (e) => {
      this.setTapStart(e);

      this.pointers.set(e.evt.pointerId, {
        x: e.evt.clientX,
        y: e.evt.clientY,
      });

      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === RECTANGLE_TOOL_ACTION_NAME
      ) {
        this.state = RECTANGLE_TOOL_STATE.ADDING;
        return;
      }

      if (this.state === RECTANGLE_TOOL_STATE.ADDING) {
        this.handleAdding();
      }
    });

    stage.on('pointermove', (e) => {
      if (this.state === RECTANGLE_TOOL_STATE.IDLE) return;

      this.setCursor();

      if (!this.isPressed(e)) return;

      if (!this.pointers.has(e.evt.pointerId)) return;

      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === RECTANGLE_TOOL_ACTION_NAME
      ) {
        this.state = RECTANGLE_TOOL_STATE.ADDING;
        return;
      }

      if (this.state === RECTANGLE_TOOL_STATE.DEFINING_SIZE) {
        this.handleMovement();
      }
    });

    stage.on('pointerup', (e) => {
      this.pointers.delete(e.evt.pointerId);

      const isTap = this.isTap(e);

      if (isTap) {
        this.moved = false;
      }

      if (this.state === RECTANGLE_TOOL_STATE.DEFINING_SIZE) {
        this.handleSettingSize();
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveRectangleToolActionState) {
    this.state = state;
  }

  private addRectangle() {
    this.setCursor();
    this.setFocusStage();

    this.instance.emitEvent<WeaveRectangleToolActionOnAddingEvent>(
      'onAddingRectangle'
    );

    this.clickPoint = null;
    this.setState(RECTANGLE_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const { mousePoint, container, measureContainer } =
      this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;
    this.measureContainer = measureContainer;

    this.rectId = uuidv4();

    if (!this.tempRectNode) {
      this.tempRectNode = new Konva.Rect({
        ...this.props,
        id: this.rectId,
        strokeScaleEnabled: true,
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        width: 0,
        height: 0,
      });
      this.measureContainer?.add(this.tempRectNode);
    }

    this.setState(RECTANGLE_TOOL_STATE.DEFINING_SIZE);
  }

  private handleSettingSize() {
    if (this.rectId && this.tempRectNode && this.clickPoint && this.container) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.container
      );

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

      this.tempRectNode.setAttrs({
        ...this.props,
        x: rectPos.x,
        y: rectPos.y,
        width: rectWidth,
        height: rectHeight,
      });

      const nodeHandler =
        this.instance.getNodeHandler<WeaveRectangleNode>('rectangle');

      if (nodeHandler) {
        const clonedRectNode = this.tempRectNode.clone();
        this.tempRectNode.destroy();

        const node = nodeHandler.create(this.rectId, {
          ...this.props,
          ...clonedRectNode.getAttrs(),
        });

        this.instance.addNode(node, this.container?.getAttrs().id);
      }

      this.instance.emitEvent<WeaveRectangleToolActionOnAddingEvent>(
        'onAddedRectangle'
      );
    }

    this.cancelAction();
  }

  private handleMovement() {
    if (this.state !== RECTANGLE_TOOL_STATE.DEFINING_SIZE) {
      return;
    }

    if (
      this.rectId &&
      this.tempRectNode &&
      this.measureContainer &&
      this.clickPoint
    ) {
      this.moved = true;

      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.measureContainer
      );

      const deltaX = mousePoint.x - this.clickPoint?.x;
      const deltaY = mousePoint.y - this.clickPoint?.y;

      this.tempRectNode.setAttrs({
        width: deltaX,
        height: deltaY,
      });
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
    this.tempRectNode = null;
    this.moved = false;
    this.container = undefined;
    this.measureContainer = undefined;
    this.clickPoint = null;
    this.setState(RECTANGLE_TOOL_STATE.IDLE);
  }

  private setCursor() {
    const stage = this.instance.getStage();
    stage.container().style.cursor = 'crosshair';
  }

  private setFocusStage() {
    const stage = this.instance.getStage();
    stage.container().tabIndex = 1;
    stage.container().blur();
    stage.container().focus();
  }
}
