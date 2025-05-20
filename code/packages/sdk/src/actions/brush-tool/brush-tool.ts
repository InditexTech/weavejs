// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import { type WeaveElementInstance } from '@inditextech/weave-types';
import Konva from 'konva';
import { type Vector2d } from 'konva/lib/types';
import { WeaveAction } from '@/actions/action';
import { type WeaveBrushToolActionState } from './types';
import { BRUSH_TOOL_ACTION_NAME, BRUSH_TOOL_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveLineNode } from '@/nodes/line/line';

export class WeaveBrushToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state: WeaveBrushToolActionState;
  protected clickPoint: Vector2d | null;
  protected strokeId: string | null;
  protected container: Konva.Layer | Konva.Group | undefined;
  protected measureContainer: Konva.Layer | Konva.Group | undefined;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  onInit = undefined;

  constructor() {
    super();

    this.initialized = false;
    this.state = BRUSH_TOOL_STATE.INACTIVE;
    this.strokeId = null;
    this.clickPoint = null;
    this.container = undefined;
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

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    stage.container().addEventListener('keydown', (e) => {
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

    stage.on('mousedown touchstart', (e) => {
      if (this.state !== BRUSH_TOOL_STATE.IDLE) {
        return;
      }

      this.handleStartStroke();

      e.evt.preventDefault();
      e.evt.stopPropagation();
    });

    stage.on('mousemove touchmove', (e) => {
      if (this.state !== BRUSH_TOOL_STATE.DEFINE_STROKE) {
        return;
      }

      this.handleMovement();

      e.evt.preventDefault();
      e.evt.stopPropagation();
    });

    stage.on('mouseup touchend', (e) => {
      if (this.state !== BRUSH_TOOL_STATE.DEFINE_STROKE) {
        return;
      }

      this.handleEndStroke();

      e.evt.preventDefault();
      e.evt.stopPropagation();
    });

    this.initialized = true;
  }

  private setState(state: WeaveBrushToolActionState) {
    this.state = state;
  }

  private handleStartStroke() {
    const { mousePoint, container, measureContainer } =
      this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;
    this.measureContainer = measureContainer;

    this.strokeId = uuidv4();

    const nodeHandler = this.instance.getNodeHandler<WeaveLineNode>('line');

    const node = nodeHandler.create(this.strokeId, {
      ...this.props,
      strokeScaleEnabled: false,
      x: this.clickPoint?.x ?? 0,
      y: this.clickPoint?.y ?? 0,
      points: [0, 0],
    });

    this.instance.addNode(node, this.container?.getAttrs().id);

    this.setState(BRUSH_TOOL_STATE.DEFINE_STROKE);
  }

  private handleEndStroke() {
    const stage = this.instance.getStage();

    const tempStroke = this.instance.getStage().findOne(`#${this.strokeId}`) as
      | Konva.Line
      | undefined;

    if (tempStroke) {
      const nodeHandler = this.instance.getNodeHandler<WeaveLineNode>('line');

      tempStroke.setAttrs({
        ...this.props,
        hitStrokeWidth: 10,
      });

      this.instance.updateNode(
        nodeHandler.serialize(tempStroke as WeaveElementInstance)
      );

      this.clickPoint = null;

      stage.container().tabIndex = 1;
      stage.container().focus();

      this.setState(BRUSH_TOOL_STATE.IDLE);
    }
  }

  private handleMovement() {
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

      tempStroke.points([
        ...tempStroke.points(),
        mousePoint.x - tempStroke.x(),
        mousePoint.y - tempStroke.y(),
      ]);

      const nodeHandler = this.instance.getNodeHandler<WeaveLineNode>('line');

      this.instance.updateNode(
        nodeHandler.serialize(tempStroke as WeaveElementInstance)
      );
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

    stage.container().style.cursor = 'crosshair';
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.strokeId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction('selectionTool');
    }

    this.clickPoint = null;
    this.setState(BRUSH_TOOL_STATE.INACTIVE);
  }
}
