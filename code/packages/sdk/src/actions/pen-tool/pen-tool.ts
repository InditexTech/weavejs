// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import { type Vector2d } from 'konva/lib/types';
import { WeaveAction } from '@/actions/action';
import {
  type WeavePenToolActionOnAddedEvent,
  type WeavePenToolActionOnAddingEvent,
  type WeavePenToolActionState,
} from './types';
import { PEN_TOOL_ACTION_NAME, PEN_TOOL_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveLineNode } from '@/nodes/line/line';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';

export class WeavePenToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeavePenToolActionState;
  protected lineId: string | null;
  protected tempLineId: string | null;
  protected tempMainLineNode: Konva.Line | null;
  protected tempLineNode: Konva.Line | null;
  protected container: Konva.Layer | Konva.Node | undefined;
  protected measureContainer: Konva.Layer | Konva.Group | undefined;
  protected clickPoint: Vector2d | null;
  protected pointers: Map<number, Vector2d>;
  protected tempPoint: Konva.Circle | undefined;
  protected tempNextPoint: Konva.Circle | undefined;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  onInit = undefined;

  constructor() {
    super();

    this.pointers = new Map<number, Vector2d>();
    this.initialized = false;
    this.state = PEN_TOOL_STATE.IDLE;
    this.lineId = null;
    this.tempLineId = null;
    this.tempMainLineNode = null;
    this.tempLineNode = null;
    this.container = undefined;
    this.measureContainer = undefined;
    this.clickPoint = null;
    this.tempPoint = undefined;
    this.tempNextPoint = undefined;
    this.props = this.initProps();
  }

  getName(): string {
    return PEN_TOOL_ACTION_NAME;
  }

  initProps() {
    return {
      stroke: '#000000ff',
      strokeWidth: 1,
      opacity: 1,
    };
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (
        e.key === 'Enter' &&
        this.instance.getActiveAction() === PEN_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
      if (
        e.key === 'Escape' &&
        this.instance.getActiveAction() === PEN_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
    });

    stage.on('pointerdown', (e) => {
      this.setTapStart(e);

      this.pointers.set(e.evt.pointerId, {
        x: e.evt.clientX,
        y: e.evt.clientY,
      });

      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === PEN_TOOL_ACTION_NAME
      ) {
        this.state = PEN_TOOL_STATE.ADDING;
        return;
      }

      if (!this.tempMainLineNode && this.state === PEN_TOOL_STATE.ADDING) {
        this.handleAdding();
      }

      if (this.tempMainLineNode && this.state === PEN_TOOL_STATE.ADDING) {
        this.state = PEN_TOOL_STATE.DEFINING_SIZE;
      }
    });

    stage.on('pointermove', () => {
      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === PEN_TOOL_ACTION_NAME
      ) {
        this.state = PEN_TOOL_STATE.ADDING;
        return;
      }

      if (this.state === PEN_TOOL_STATE.DEFINING_SIZE) {
        this.handleMovement();
      }
    });

    stage.on('pointerup', (e) => {
      this.pointers.delete(e.evt.pointerId);

      if (this.state === PEN_TOOL_STATE.DEFINING_SIZE) {
        this.handleSettingSize();
      }
    });

    this.initialized = true;
  }

  private setState(state: WeavePenToolActionState) {
    this.state = state;
  }

  private addLine() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'crosshair';
    stage.container().focus();

    this.instance.emitEvent<WeavePenToolActionOnAddingEvent>('onAddingPen');

    this.tempPoint = undefined;
    this.tempNextPoint = undefined;
    this.clickPoint = null;
    this.setState(PEN_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const stage = this.instance.getStage();
    const { mousePoint, container, measureContainer } =
      this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;
    this.measureContainer = measureContainer;

    this.lineId = uuidv4();
    this.tempLineId = uuidv4();

    if (!this.tempLineNode) {
      this.tempMainLineNode = new Konva.Line({
        ...this.props,
        id: this.lineId,
        strokeScaleEnabled: false,
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        points: [0, 0],
      });
      this.measureContainer?.add(this.tempMainLineNode);

      this.tempPoint = new Konva.Circle({
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        radius: 5 / stage.scaleX(),
        strokeScaleEnabled: false,
        stroke: '#cccccc',
        strokeWidth: 0,
        fill: '#cccccc',
      });
      this.measureContainer?.add(this.tempPoint);

      this.tempLineNode = new Konva.Line({
        ...this.props,
        id: this.tempLineId,
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        strokeScaleEnabled: false,
        points: [0, 0],
      });
      this.measureContainer?.add(this.tempLineNode);

      this.tempNextPoint = new Konva.Circle({
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        radius: 5 / stage.scaleX(),
        strokeScaleEnabled: false,
        stroke: '#cccccc',
        strokeWidth: 0,
        fill: '#cccccc',
      });
      this.measureContainer?.add(this.tempNextPoint);

      this.setState(PEN_TOOL_STATE.DEFINING_SIZE);
    }
  }

  private handleSettingSize() {
    if (
      this.lineId &&
      this.tempLineNode &&
      this.tempMainLineNode &&
      this.tempPoint &&
      this.tempNextPoint &&
      this.measureContainer
    ) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.measureContainer
      );

      const newPoints = [...this.tempMainLineNode.points()];
      newPoints.push(mousePoint.x - this.tempMainLineNode.x());
      newPoints.push(mousePoint.y - this.tempMainLineNode.y());
      this.tempMainLineNode.setAttrs({
        ...this.props,
        points: newPoints,
      });

      this.tempPoint.setAttrs({
        x: mousePoint.x,
        y: mousePoint.y,
      });

      this.tempNextPoint.setAttrs({
        x: mousePoint.x,
        y: mousePoint.y,
      });

      this.tempLineNode.setAttrs({
        ...this.props,
        x: mousePoint.x,
        y: mousePoint.y,
        points: [0, 0],
      });

      this.setState(PEN_TOOL_STATE.DEFINING_SIZE);
    }
  }

  private handleMovement() {
    if (this.state !== PEN_TOOL_STATE.DEFINING_SIZE) {
      return;
    }

    if (this.tempLineNode && this.measureContainer && this.tempNextPoint) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.measureContainer
      );

      this.tempLineNode.setAttrs({
        ...this.props,
        points: [
          this.tempLineNode.points()[0],
          this.tempLineNode.points()[1],
          mousePoint.x - this.tempLineNode.x(),
          mousePoint.y - this.tempLineNode.y(),
        ],
      });

      this.tempNextPoint.setAttrs({
        x: mousePoint.x,
        y: mousePoint.y,
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
    this.addLine();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    this.tempPoint?.destroy();
    this.tempNextPoint?.destroy();
    this.tempLineNode?.destroy();

    if (
      this.lineId &&
      this.tempMainLineNode &&
      this.tempMainLineNode.points().length >= 4
    ) {
      const nodeHandler = this.instance.getNodeHandler<WeaveLineNode>('line');

      if (nodeHandler) {
        const clonedLine = this.tempMainLineNode.clone();
        this.tempMainLineNode.destroy();
        const node = nodeHandler.create(this.lineId, {
          ...this.props,
          ...clonedLine.getAttrs(),
          hitStrokeWidth: 16,
        });
        this.instance.addNode(node, this.container?.getAttrs().id);

        this.instance.emitEvent<WeavePenToolActionOnAddedEvent>('onAddedPen');
      }
    }

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.lineId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    stage.container().style.cursor = 'default';

    this.initialCursor = null;
    this.tempPoint = undefined;
    this.tempNextPoint = undefined;
    this.lineId = null;
    this.tempMainLineNode = null;
    this.tempLineId = null;
    this.tempLineNode = null;
    this.container = undefined;
    this.measureContainer = undefined;
    this.clickPoint = null;
    this.setState(PEN_TOOL_STATE.IDLE);
  }
}
