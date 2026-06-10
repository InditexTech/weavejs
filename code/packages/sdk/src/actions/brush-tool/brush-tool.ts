// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import simplify from 'simplify-js';
import { v4 as uuidv4 } from 'uuid';
import { type WeaveElementInstance } from '@inditextech/weave-types';
import Konva from 'konva';
import { WeaveAction } from '@/actions/action';
import {
  type WeaveBrushToolActionOnAddedEvent,
  type WeaveBrushToolActionOnAddingEvent,
  type WeaveBrushToolActionParams,
  type WeaveBrushToolActionProperties,
  type WeaveBrushToolActionState,
} from './types';
import {
  BRUSH_TOOL_ACTION_NAME,
  BRUSH_TOOL_DEFAULT_CONFIG,
  BRUSH_TOOL_STATE,
} from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveStrokeNode } from '@/nodes/stroke/stroke';
import type { WeaveStrokePoint } from '@/nodes/stroke/types';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import type { WeaveStageZoomPlugin } from '@/plugins/stage-zoom/stage-zoom';
import { mergeExceptArrays } from '@/utils/utils';

export class WeaveBrushToolAction extends WeaveAction {
  protected config: WeaveBrushToolActionProperties;
  protected initialized: boolean = false;
  protected state!: WeaveBrushToolActionState;
  protected clickPoint!: Konva.Vector2d | null;
  protected strokeId!: string | null;
  protected isSpacePressed: boolean = false;
  protected isEraser!: boolean;
  protected container: Konva.Layer | Konva.Node | undefined;
  protected measureContainer: Konva.Layer | Konva.Group | undefined;
  protected cancelAction!: () => void;
  protected prevTouchAction!: string;
  protected penActive = false;
  protected lastSmoothedPressure = 0.5;
  protected lastPointerPos: { x: number; y: number } | null = null;
  protected lastPointerTime = 0;
  protected predictedCount = 0;
  onPropsChange = undefined;
  onInit = undefined;

  constructor(params?: WeaveBrushToolActionParams) {
    super();

    this.config = mergeExceptArrays(
      BRUSH_TOOL_DEFAULT_CONFIG,
      params?.config ?? {}
    );

    this.initialize();
  }

  initialize(): void {
    this.initialized = false;
    this.state = BRUSH_TOOL_STATE.INACTIVE;
    this.strokeId = null;
    this.clickPoint = null;
    this.container = undefined;
    this.isEraser = false;
    this.measureContainer = undefined;
    this.props = this.initProps();
    this.isSpacePressed = false;
  }

  getName(): string {
    return BRUSH_TOOL_ACTION_NAME;
  }

  initProps() {
    return {
      stroke: '#000000ff',
      strokeWidth: 1,
      opacity: 1,
    };
  }

  private getEventPressure(e: Konva.KonvaEventObject<PointerEvent>) {
    const now = performance.now();
    let velocity = 0;

    if (this.lastPointerPos && now - this.lastPointerTime > 0) {
      const dx = e.evt.clientX - this.lastPointerPos.x;
      const dy = e.evt.clientY - this.lastPointerPos.y;
      velocity = (Math.hypot(dx, dy) / (now - this.lastPointerTime)) * 1000; // px/s
    }
    this.lastPointerPos = { x: e.evt.clientX, y: e.evt.clientY };
    this.lastPointerTime = now;

    // Fast movement → higher alpha (less smoothing, more responsive)
    // Slow movement → lower alpha (more smoothing, eliminates jitter)
    const alpha = Math.min(Math.max(velocity / 1500, 0.15), 0.6);

    let raw: number;
    if (e.evt.pointerType === 'pen') {
      raw = e.evt.pressure || 0.5;
    } else {
      raw = 0.5;
    }

    this.lastSmoothedPressure =
      alpha * raw + (1 - alpha) * this.lastSmoothedPressure;
    return Math.max(this.lastSmoothedPressure, 0.15); // floor prevents invisible strokes
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    this.prevTouchAction = stage.container().style.touchAction;
    stage.container().style.touchAction = 'none';

    window.addEventListener(
      'keyup',
      (e) => {
        if (
          e.code === 'Space' &&
          this.instance.getActiveAction() === BRUSH_TOOL_ACTION_NAME
        ) {
          this.isSpacePressed = false;
        }
      },
      { signal: this.instance.getEventsController().signal }
    );

    window.addEventListener(
      'keydown',
      (e) => {
        if (
          e.code === 'Enter' &&
          this.instance.getActiveAction() === BRUSH_TOOL_ACTION_NAME
        ) {
          e.stopPropagation();
          this.cancelAction();
          return;
        }
        if (
          e.code === 'Space' &&
          this.instance.getActiveAction() === BRUSH_TOOL_ACTION_NAME
        ) {
          e.stopPropagation();
          this.isSpacePressed = true;
          return;
        }
        if (
          e.code === 'Escape' &&
          this.instance.getActiveAction() === BRUSH_TOOL_ACTION_NAME
        ) {
          e.stopPropagation();
          this.cancelAction();
        }
      },
      { signal: this.instance.getEventsController().signal }
    );

    const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (this.state === BRUSH_TOOL_STATE.INACTIVE) return;

      if (this.state !== BRUSH_TOOL_STATE.IDLE) {
        return;
      }

      if (this.getZoomPlugin()?.isPinching()) {
        return;
      }

      if (this.isSpacePressed) {
        return;
      }

      if (e?.evt?.button !== 0) {
        return;
      }

      if (e.evt.pointerType === 'touch' && this.penActive) return;

      if (e.evt.pointerType === 'pen') this.penActive = true;

      const pointPressure = this.getEventPressure(e);
      this.handleStartStroke(pointPressure);

      e.evt.stopPropagation();
    };

    stage.on('pointerdown', handlePointerDown);

    const handlePointerMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (this.state === BRUSH_TOOL_STATE.INACTIVE) return;

      this.setCursor();

      if (this.state !== BRUSH_TOOL_STATE.DEFINE_STROKE) {
        return;
      }

      if (this.getZoomPlugin()?.isPinching()) {
        return;
      }

      const coalescedEvents = e.evt.getCoalescedEvents
        ? e.evt.getCoalescedEvents()
        : [];
      if (coalescedEvents.length > 1) {
        for (const ce of coalescedEvents) {
          const pointPressure =
            ce.pointerType === 'pen' && typeof ce.pressure === 'number'
              ? ce.pressure
              : 0.5;
          this.handleMovement(pointPressure, undefined, false);
        }

        const predictedEvents = e.evt.getPredictedEvents
          ? e.evt.getPredictedEvents()
          : [];
        if (predictedEvents.length > 0) {
          const last = predictedEvents[predictedEvents.length - 1];
          const predPressure =
            last.pointerType === 'pen' && typeof last.pressure === 'number'
              ? last.pressure
              : 0.5;
          this.handleMovement(predPressure, last, true);
        }
      } else {
        const pointPressure = this.getEventPressure(e);
        this.handleMovement(pointPressure, undefined, false);
      }
      e.evt.stopPropagation();
    };

    stage.on('pointermove', handlePointerMove);

    const handlePointerUp = (e: Konva.KonvaEventObject<PointerEvent>) => {
      this.penActive = false;

      if (this.state !== BRUSH_TOOL_STATE.DEFINE_STROKE) {
        return;
      }

      if (this.getZoomPlugin()?.isPinching()) {
        return;
      }

      this.handleEndStroke();

      e.evt.stopPropagation();
    };

    stage.on('pointerup', handlePointerUp);

    this.initialized = true;
  }

  private setState(state: WeaveBrushToolActionState) {
    this.state = state;
  }

  private getBoundingBox(strokeElements: WeaveStrokePoint[]) {
    if (strokeElements.length === 0) {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      };
    }

    let minX = strokeElements[0].x;
    let maxX = strokeElements[0].x;
    let minY = strokeElements[0].y;
    let maxY = strokeElements[0].y;

    strokeElements.forEach((point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  private handleStartStroke(pressure: number) {
    this.lastSmoothedPressure = 0.5;
    this.lastPointerPos = null;
    this.lastPointerTime = 0;
    this.predictedCount = 0;

    const { mousePoint, container, measureContainer } =
      this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;
    this.measureContainer = measureContainer;

    this.strokeId = uuidv4();

    const nodeHandler = this.instance.getNodeHandler<WeaveStrokeNode>('stroke');

    if (nodeHandler && mousePoint && this.measureContainer) {
      const newStrokeElements = [];
      newStrokeElements.push({
        x: mousePoint.x,
        y: mousePoint.y,
        pressure,
      });

      const node = nodeHandler.create(this.strokeId, {
        ...this.props,
        isEraser: this.isEraser,
        strokeScaleEnabled: true,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        strokeElements: newStrokeElements,
      });
      const nodeInstance = nodeHandler.onRender(node.props);
      this.measureContainer?.add(nodeInstance);
    }

    this.setState(BRUSH_TOOL_STATE.DEFINE_STROKE);
  }

  private handleMovement(
    pressure: number,
    predictedEvent?: PointerEvent,
    isPredicted: boolean = false
  ) {
    if (this.state !== BRUSH_TOOL_STATE.DEFINE_STROKE) {
      return;
    }

    const stage = this.instance.getStage();

    const tempStroke = this.instance.getStage().findOne(`#${this.strokeId}`) as
      | Konva.Line
      | undefined;

    if (this.measureContainer && tempStroke) {
      if (predictedEvent) {
        stage.setPointersPositions(predictedEvent);
      }

      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.measureContainer
      );

      const currentPoint: WeaveStrokePoint = {
        x: mousePoint.x - tempStroke.x(),
        y: mousePoint.y - tempStroke.y(),
        pressure,
      };

      let newStrokeElements = [...tempStroke.getAttrs().strokeElements];

      if (!isPredicted && this.predictedCount > 0) {
        newStrokeElements = newStrokeElements.slice(
          0,
          -1 * this.predictedCount
        );
        this.predictedCount = 0;
      }

      newStrokeElements.push(currentPoint);

      if (isPredicted) {
        this.predictedCount++;
      }

      const box = this.getBoundingBox(newStrokeElements);

      tempStroke.setAttrs({
        width: box.width,
        height: box.height,
        x: 0,
        y: 0,
        strokeElements: newStrokeElements,
      });

      const nodeHandler =
        this.instance.getNodeHandler<WeaveStrokeNode>('stroke');

      if (nodeHandler) {
        nodeHandler.onUpdate(
          tempStroke as WeaveElementInstance,
          tempStroke.getAttrs()
        );
      }
    }
  }

  private finalizeStroke(
    tempStroke: Konva.Line,
    nodeHandler: WeaveStrokeNode
  ): void {
    const box = this.getBoundingBox(tempStroke.getAttrs().strokeElements);

    let newStrokeElements = [...tempStroke.getAttrs().strokeElements];

    if (this.predictedCount > 0) {
      newStrokeElements = newStrokeElements.slice(
        0,
        -1 * this.predictedCount
      );
      this.predictedCount = 0;
    }

    newStrokeElements = newStrokeElements.map((point) => ({
      ...point,
      x: point.x - box.x,
      y: point.y - box.y,
    }));

    const compressedPoints = simplify(newStrokeElements, 1, true);

    const sw = tempStroke.getAttrs().strokeWidth ?? 1;
    const finalWidth = Math.max(box.width, sw);
    const finalHeight = Math.max(box.height, sw);
    const finalX = box.width === 0 ? box.x - sw / 2 : box.x;
    const finalY = box.height === 0 ? box.y - sw / 2 : box.y;

    tempStroke.setAttrs({
      width: finalWidth,
      height: finalHeight,
      x: finalX,
      y: finalY,
      strokeElements: compressedPoints,
    });

    const realNode = this.instance
      .getStage()
      .findOne(`#${tempStroke.getAttrs().id}`);
    if (realNode) {
      realNode.destroy();
    }

    if (tempStroke.getAttrs().strokeElements.length >= 1) {
      this.instance.addNode(
        nodeHandler.serialize(tempStroke as WeaveElementInstance),
        this.container?.getAttrs().id
      );
    }
  }

  private handleEndStroke() {
    const tempStroke = this.instance.getStage().findOne(`#${this.strokeId}`) as
      | Konva.Line
      | undefined;

    if (tempStroke) {
      const nodeHandler =
        this.instance.getNodeHandler<WeaveStrokeNode>('stroke');

      if (nodeHandler) {
        this.finalizeStroke(tempStroke, nodeHandler);
      }

      this.clickPoint = null;

      this.setCursor();
      this.setFocusStage();

      this.setState(BRUSH_TOOL_STATE.IDLE);
    }
  }

  trigger(cancel: () => void): void {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    if (!this.initialized) {
      this.setupEvents();
    }

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.hide();
    }

    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    this.cancelAction = cancel;

    if (selectionPlugin) {
      selectionPlugin.setSelectedNodes([]);
    }

    this.props = this.initProps();
    this.setState(BRUSH_TOOL_STATE.IDLE);

    this.instance.emitEvent<WeaveBrushToolActionOnAddingEvent>('onAddingBrush');

    this.setCursor();
    this.setFocusStage();
  }

  onEraserMode(): boolean {
    return this.isEraser;
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().style.touchAction = this.prevTouchAction;
    stage.container().style.cursor = 'default';

    this.instance.emitEvent<WeaveBrushToolActionOnAddedEvent>('onAddedBrush');

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.strokeId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    this.clickPoint = null;
    this.setState(BRUSH_TOOL_STATE.INACTIVE);
  }

  getZoomPlugin() {
    const zoomPlugin =
      this.instance.getPlugin<WeaveStageZoomPlugin>('stageZoom');
    return zoomPlugin;
  }

  private setCursor() {
    const stage = this.instance.getStage();

    if (this.isSpacePressed) {
      return;
    }

    stage.container().style.cursor = 'crosshair';
  }

  private setFocusStage() {
    const stage = this.instance.getStage();
    stage.container().tabIndex = 1;
    stage.container().blur();
    stage.container().focus();
  }
}
