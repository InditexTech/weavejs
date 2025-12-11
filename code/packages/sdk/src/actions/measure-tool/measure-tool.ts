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
import type { WeaveMeasureNode } from '@/index.node';

export class WeaveMeasureToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeaveMeasureToolActionState;
  protected measureId: string | null;
  protected container: Konva.Layer | Konva.Node | undefined;
  protected clickPoint: Konva.Vector2d | null;
  protected firstPoint: Konva.Circle | null;
  protected measureLine: Konva.Line | null;
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
    this.firstPoint = null;
    this.measureLine = null;
    this.props = this.initProps();
  }

  getName(): string {
    return MEASURE_TOOL_ACTION_NAME;
  }

  initProps() {
    return {
      separation: 100,
      separationOrientation: 1,
      textPadding: 20,
      separationPadding: 30,
      unit: 'cms',
      unitPerPixel: 100,
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
        return;
      }
    });

    stage.on('pointermove', () => {
      if (this.state === MEASURE_TOOL_STATE.IDLE) return;

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
        return;
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

    this.setCursor();
    this.setFocusStage();

    this.clickPoint = null;
    this.setState(MEASURE_TOOL_STATE.SET_FROM);
  }

  private handleSetFrom() {
    const { mousePoint, container } = this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;

    this.measureId = uuidv4();

    this.firstPoint = new Konva.Circle({
      x: this.clickPoint?.x ?? 0,
      y: this.clickPoint?.y ?? 0,
      radius: 5,
      fill: 'red',
      id: `${this.measureId}_from`,
      draggable: true,
    });

    this.measureLine = new Konva.Line({
      points: [this.clickPoint?.x ?? 0, this.clickPoint?.y ?? 0],
      stroke: 'red',
      strokeWidth: 2,
      id: `${this.measureId}_line`,
      draggable: false,
    });

    this.instance.getUtilityLayer()?.add(this.firstPoint);
    this.instance.getUtilityLayer()?.add(this.measureLine);

    this.setState(MEASURE_TOOL_STATE.SET_TO);
  }

  private handleSetTo() {
    const { mousePoint, container } = this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;

    const nodeHandler =
      this.instance.getNodeHandler<WeaveMeasureNode>('measure');

    if (nodeHandler && this.measureId && this.firstPoint) {
      const node = nodeHandler.create(this.measureId, {
        ...this.props,
        fromPoint: {
          x: this.firstPoint.x(),
          y: this.firstPoint.y(),
        },
        toPoint: {
          x: this.clickPoint?.x ?? 0,
          y: this.clickPoint?.y ?? 0,
        },
        separation: 100,
        separationOrientation: 1,
        textPadding: 20,
        separationPadding: 30,
        unit: 'cms',
        unitPerPixel: 100,
        draggable: true,
      });
      this.instance.addNode(node, this.container?.getAttrs().id);
    }

    this.setState(MEASURE_TOOL_STATE.FINISHED);
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
    this.addMeasure();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.measureId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
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
    this.setState(MEASURE_TOOL_STATE.IDLE);
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
