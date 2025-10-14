// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import { type WeaveElementInstance } from '@inditextech/weave-types';
import Konva from 'konva';
import { type Vector2d } from 'konva/lib/types';
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
import { mergeExceptArrays } from '@/utils';

export class WeaveBrushToolAction extends WeaveAction {
  protected config: WeaveBrushToolActionProperties;
  protected initialized: boolean = false;
  protected state: WeaveBrushToolActionState;
  protected clickPoint: Vector2d | null;
  protected strokeId: string | null;
  protected isEraser: boolean;
  protected container: Konva.Layer | Konva.Node | undefined;
  protected measureContainer: Konva.Layer | Konva.Group | undefined;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  onInit = undefined;

  constructor(params?: WeaveBrushToolActionParams) {
    super();

    this.config = mergeExceptArrays(
      BRUSH_TOOL_DEFAULT_CONFIG,
      params?.config ?? {}
    );
    this.initialized = false;
    this.state = BRUSH_TOOL_STATE.INACTIVE;
    this.strokeId = null;
    this.clickPoint = null;
    this.container = undefined;
    this.isEraser = false;
    this.measureContainer = undefined;
    this.props = this.initProps();
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
    if (e.evt.pointerType && e.evt.pointerType === 'pen') {
      return e.evt.pressure || 0.5;
    }
    return 0.5;
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    window.addEventListener('keydown', (e) => {
      if (
        e.key === 'Enter' &&
        this.instance.getActiveAction() === BRUSH_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
      if (
        e.key === 'Escape' &&
        this.instance.getActiveAction() === BRUSH_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
    });

    const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
      if (this.state !== BRUSH_TOOL_STATE.IDLE) {
        return;
      }

      if (this.getZoomPlugin()?.isPinching()) {
        return;
      }

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

      const pointPressure = this.getEventPressure(e);
      this.handleMovement(pointPressure);

      e.evt.stopPropagation();
    };

    stage.on('pointermove', handlePointerMove);

    const handlePointerUp = (e: Konva.KonvaEventObject<PointerEvent>) => {
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

  private handleMovement(pressure: number) {
    if (this.state !== BRUSH_TOOL_STATE.DEFINE_STROKE) {
      return;
    }

    const tempStroke = this.instance.getStage().findOne(`#${this.strokeId}`) as
      | Konva.Line
      | undefined;

    if (this.measureContainer && tempStroke) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.measureContainer
      );

      const currentPoint: WeaveStrokePoint = {
        x: mousePoint.x - tempStroke.x(),
        y: mousePoint.y - tempStroke.y(),
        pressure,
      };

      const newStrokeElements = [
        ...tempStroke.getAttrs().strokeElements,
        currentPoint,
      ];

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

  private handleEndStroke() {
    const tempStroke = this.instance.getStage().findOne(`#${this.strokeId}`) as
      | Konva.Line
      | undefined;

    if (tempStroke) {
      const nodeHandler =
        this.instance.getNodeHandler<WeaveStrokeNode>('stroke');

      if (nodeHandler) {
        const box = this.getBoundingBox(tempStroke.getAttrs().strokeElements);

        let newStrokeElements = [...tempStroke.getAttrs().strokeElements];
        newStrokeElements = newStrokeElements.map((point) => ({
          ...point,
          x: point.x - box.x,
          y: point.y - box.y,
        }));

        tempStroke.setAttrs({
          width: box.width,
          height: box.height,
          x: box.x,
          y: box.y,
          strokeElements: newStrokeElements,
        });

        const realNode = this.instance
          .getStage()
          .findOne(`#${tempStroke.getAttrs().id}`);
        if (realNode) {
          realNode.destroy();
        }

        if (tempStroke.getAttrs().strokeElements.length >= 3) {
          this.instance.addNode(
            nodeHandler.serialize(tempStroke as WeaveElementInstance),
            this.container?.getAttrs().id
          );
        }
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
    stage.container().style.cursor = 'crosshair';
  }

  private setFocusStage() {
    const stage = this.instance.getStage();
    stage.container().tabIndex = 1;
    stage.container().blur();
    stage.container().focus();
  }
}
