// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import { WeaveAction } from '@/actions/action';
import Konva from 'konva';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import type { WeaveMeasureToolActionState } from './types';
import { MEASURE_TOOL_ACTION_NAME, MEASURE_TOOL_STATE } from './constants';
import { moveNodeToContainer, type WeaveMeasureNode } from '@/index';

export class WeaveMeasureToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeaveMeasureToolActionState;
  protected measureId: string | null;
  protected container: Konva.Layer | Konva.Node | undefined;
  protected clickPoint: Konva.Vector2d | null;
  protected crosshairCursor: Konva.Group | null;
  protected firstPoint: Konva.Circle | null;
  protected color: string = '#FF3366';
  protected measureLine: Konva.Line | null;
  protected measureContainer: Konva.Layer | Konva.Group | undefined;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  onInit = undefined;

  constructor() {
    super();

    this.initialized = false;
    this.state = MEASURE_TOOL_STATE.IDLE;
    this.measureId = null;
    this.container = undefined;
    this.clickPoint = null;
    this.crosshairCursor = null;
    this.firstPoint = null;
    this.measureLine = null;
    this.measureContainer = undefined;
    this.props = this.initProps();
  }

  getName(): string {
    return MEASURE_TOOL_ACTION_NAME;
  }

  initProps() {
    return {
      orientation: -1,
      separation: 0,
      textPadding: 20,
      separationPadding: 0,
      unit: 'cms',
      unitPerPixel: 10,
      color: this.color,
      strokeEnabled: false,
    };
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    window.addEventListener('keydown', (e) => {
      if (
        e.code === 'Escape' &&
        this.instance.getActiveAction() === MEASURE_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
      }
    });

    stage.on('pointermove', () => {
      if (this.state === MEASURE_TOOL_STATE.IDLE) return;

      if (this.state === MEASURE_TOOL_STATE.SET_TO) {
        const finalPoint = this.defineFinalPoint();

        if (this.measureLine && this.firstPoint) {
          this.measureLine.points([0, 0, finalPoint.x, finalPoint.y]);
        }
      }

      this.setCursor();
    });

    stage.on('pointerclick', () => {
      if (this.state === MEASURE_TOOL_STATE.IDLE) {
        return;
      }

      if (this.state === MEASURE_TOOL_STATE.SET_FROM) {
        this.handleSetFrom();
        return;
      }

      if (this.state === MEASURE_TOOL_STATE.SET_TO) {
        this.handleSetTo();
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveMeasureToolActionState) {
    this.state = state;
  }

  private addMeasure() {
    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.hide();
    }

    this.buildCrosshairCursor();
    this.setCursor();
    this.setFocusStage();

    this.clickPoint = null;
    this.setState(MEASURE_TOOL_STATE.SET_FROM);
  }

  private buildCrosshairCursor(): void {
    const stage = this.instance.getStage();
    const { mousePoint } = this.instance.getMousePointer();

    this.crosshairCursor = new Konva.Group({
      x: mousePoint?.x,
      y: mousePoint?.y,
      scale: { x: 1 / stage.scaleX(), y: 1 / stage.scaleY() },
      listening: false,
      draggable: false,
    });

    const crosshairSize = 60;

    const lineH = new Konva.Line({
      points: [0, 0, crosshairSize, 0],
      x: -1 * (crosshairSize / 2),
      y: 0,
      stroke: this.color,
      strokeWidth: 1,
    });

    const lineV = new Konva.Line({
      points: [0, 0, 0, crosshairSize],
      x: 0,
      y: (-1 * crosshairSize) / 2,
      stroke: this.color,
      strokeWidth: 1,
    });

    this.crosshairCursor.add(lineH);
    this.crosshairCursor.add(lineV);

    this.instance.getStage().on('pointermove.measureTool', () => {
      const pos = this.instance.getStage().getRelativePointerPosition();
      if (this.crosshairCursor && pos) {
        this.crosshairCursor.position(pos);
        this.crosshairCursor.moveToTop();
      }
    });

    this.instance.getUtilityLayer()?.add(this.crosshairCursor);
  }

  private handleSetFrom() {
    const stage = this.instance.getStage();
    const realMousePoint = stage.getRelativePointerPosition();
    const { container, measureContainer } = this.instance.getMousePointer();

    this.clickPoint = realMousePoint;
    this.container = container;
    this.measureContainer = measureContainer;

    this.firstPoint = new Konva.Circle({
      x: this.clickPoint?.x ?? 0,
      y: this.clickPoint?.y ?? 0,
      radius: 6,
      fill: '#FFFFFF',
      stroke: '#000000',
      scale: { x: 1 / stage.scaleX(), y: 1 / stage.scaleY() },
      strokeWidth: 1,
      listening: false,
      draggable: false,
    });

    this.measureLine = new Konva.Line({
      x: this.clickPoint?.x,
      y: this.clickPoint?.y,
      points: [0, 0],
      scale: { x: 1 / stage.scaleX(), y: 1 / stage.scaleY() },
      stroke: this.color,
      dashed: [4, 4],
      strokeWidth: 1,
      listening: false,
      draggable: false,
    });

    this.instance.getUtilityLayer()?.add(this.firstPoint);
    this.instance.getUtilityLayer()?.add(this.measureLine);

    this.firstPoint.moveToTop();
    this.measureLine.moveToBottom();

    this.setState(MEASURE_TOOL_STATE.SET_TO);
  }

  private handleSetTo() {
    const stage = this.instance.getStage();
    const realMousePoint = stage.getRelativePointerPosition();
    const { container } = this.instance.getMousePointer();

    this.clickPoint = realMousePoint;
    this.container = container;

    const nodeHandler =
      this.instance.getNodeHandler<WeaveMeasureNode>('measure');

    if (nodeHandler && this.firstPoint) {
      this.measureId = uuidv4();

      const node = nodeHandler.create(this.measureId, {
        ...this.props,
        id: this.measureId,
        x: 0,
        y: 0,
        fromPoint: {
          x: this.firstPoint.x(),
          y: this.firstPoint.y(),
        },
        toPoint: {
          x: this.clickPoint?.x ?? 0,
          y: this.clickPoint?.y ?? 0,
        },
        draggable: true,
      });

      this.instance.addOnceEventListener(
        'onNodeRenderedAdded',
        (child: Konva.Node) => {
          if (child.getAttrs().id === this.measureId) {
            if (
              typeof this.measureContainer !== 'undefined' &&
              this.measureContainer?.id() !== 'mainLayer'
            ) {
              const nodeInstance = this.instance
                .getMainLayer()
                ?.findOne(`#${this.measureId}`);

              const stage = this.instance.getStage();
              let realContainer = this.measureContainer;
              if (realContainer?.getAttrs().nodeId !== undefined) {
                realContainer = stage.findOne(
                  `#${realContainer?.getAttrs().nodeId}`
                ) as Konva.Layer | Konva.Group;
              }

              if (nodeInstance) {
                moveNodeToContainer(this.instance, nodeInstance, realContainer);
              }
            }

            this.cancelAction();
          }
        }
      );

      this.instance.addNode(node, 'mainLayer');

      this.setState(MEASURE_TOOL_STATE.FINISHED);
    }
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
    this.addMeasure();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

    this.instance.getStage().off('pointermove.measureTool');

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.measureId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    if (this.crosshairCursor) {
      this.crosshairCursor.destroy();
    }
    if (this.firstPoint) {
      this.firstPoint.destroy();
    }
    if (this.measureLine) {
      this.measureLine.destroy();
    }

    this.initialCursor = null;
    this.measureId = null;
    this.container = undefined;
    this.clickPoint = null;
    this.firstPoint = null;
    this.measureLine = null;
    this.setState(MEASURE_TOOL_STATE.IDLE);
  }

  private setCursor() {
    const stage = this.instance.getStage();
    stage.container().style.cursor = 'none';
  }

  private setFocusStage() {
    const stage = this.instance.getStage();
    stage.container().tabIndex = 1;
    stage.container().blur();
    stage.container().focus();
  }

  private defineFinalPoint(): Konva.Vector2d {
    if (!this.measureLine || !this.measureContainer) {
      return { x: 0, y: 0 };
    }

    const stage = this.instance.getStage();
    const realMousePoint = this.instance
      .getStage()
      .getRelativePointerPosition();

    const pos: Konva.Vector2d = { x: 0, y: 0 };

    pos.x = ((realMousePoint?.x ?? 0) - this.measureLine.x()) * stage.scaleX();
    pos.y = ((realMousePoint?.y ?? 0) - this.measureLine.y()) * stage.scaleY();

    return pos;
  }
}
