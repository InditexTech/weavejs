// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import { WeaveAction } from '@/actions/action';
import {
  type WeaveStrokeToolActionOnAddedEvent,
  type WeaveStrokeToolActionOnAddingEvent,
  type WeaveStrokeToolActionParams,
  type WeaveStrokeToolActionProperties,
  type WeaveStrokeToolActionState,
} from './types';
import {
  WEAVE_STROKE_TOOL_ACTION_NAME,
  WEAVE_STROKE_TOOL_ACTION_NAME_ALIASES,
  WEAVE_STROKE_TOOL_DEFAULT_CONFIG,
  WEAVE_STROKE_TOOL_STATE,
} from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import { mergeExceptArrays } from '@/utils';
import { GreedySnapper } from '@/utils/greedy-snapper';
import type { WeaveStrokeSingleNode } from '@/nodes/stroke-single/stroke-single';
import { WEAVE_STROKE_SINGLE_NODE_TYPE } from '@/nodes/stroke-single/constants';

export class WeaveStrokeToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected config: WeaveStrokeToolActionProperties;
  protected state: WeaveStrokeToolActionState;
  protected arrowId: string | null;
  protected tempArrowId: string | null;
  protected tempArrowNode: Konva.Group | null;
  protected container: Konva.Layer | Konva.Node | undefined;
  protected measureContainer: Konva.Layer | Konva.Group | undefined;
  protected clickPoint: Konva.Vector2d | null;
  protected pointers: Map<number, Konva.Vector2d>;
  protected cancelAction!: () => void;
  protected snappedAngle: number | null = null;
  protected snapper: GreedySnapper;
  protected shiftPressed: boolean = false;
  onPropsChange = undefined;
  onInit = undefined;

  constructor(params?: WeaveStrokeToolActionParams) {
    super();

    this.config = mergeExceptArrays(
      WEAVE_STROKE_TOOL_DEFAULT_CONFIG,
      params?.config ?? {}
    );

    this.pointers = new Map<number, Konva.Vector2d>();
    this.initialized = false;
    this.state = WEAVE_STROKE_TOOL_STATE.IDLE;
    this.arrowId = null;
    this.shiftPressed = false;
    this.tempArrowId = null;
    this.tempArrowNode = null;
    this.container = undefined;
    this.snappedAngle = null;
    this.measureContainer = undefined;
    this.clickPoint = null;
    this.snapper = new GreedySnapper({
      snapAngles: this.config.snapAngles.angles,
      activateThreshold: this.config.snapAngles.activateThreshold,
      releaseThreshold: this.config.snapAngles.releaseThreshold,
    });
    this.props = this.initProps();
  }

  getName(): string {
    return WEAVE_STROKE_TOOL_ACTION_NAME;
  }

  hasAliases(): boolean {
    return true;
  }

  getAliases(): string[] {
    return WEAVE_STROKE_TOOL_ACTION_NAME_ALIASES;
  }

  initProps() {
    return {
      stroke: '#000000ff',
      strokeWidth: 1,
      opacity: 1,
      tipStartStyle: 'none',
      tipEndStyle: 'none',
    };
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    window.addEventListener('keydown', (e) => {
      if (
        e.code === 'Enter' &&
        this.instance.getActiveAction() === WEAVE_STROKE_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
      if (
        e.code === 'Escape' &&
        this.instance.getActiveAction() === WEAVE_STROKE_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
      if (
        e.key === 'Shift' &&
        this.instance.getActiveAction() === WEAVE_STROKE_TOOL_ACTION_NAME
      ) {
        this.snappedAngle = null;
        this.shiftPressed = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (
        e.key === 'Shift' &&
        this.instance.getActiveAction() === WEAVE_STROKE_TOOL_ACTION_NAME
      ) {
        this.snappedAngle = null;
        this.shiftPressed = false;
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
        this.instance.getActiveAction() === WEAVE_STROKE_TOOL_ACTION_NAME
      ) {
        this.state = WEAVE_STROKE_TOOL_STATE.ADDING;
        return;
      }

      if (
        !this.tempArrowNode &&
        this.state === WEAVE_STROKE_TOOL_STATE.ADDING
      ) {
        this.handleAdding();
      }

      if (this.tempArrowNode && this.state === WEAVE_STROKE_TOOL_STATE.ADDING) {
        this.state = WEAVE_STROKE_TOOL_STATE.DEFINING_SIZE;
      }
    });

    stage.on('pointermove', () => {
      if (this.state === WEAVE_STROKE_TOOL_STATE.IDLE) {
        return;
      }

      this.setCursor();

      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === WEAVE_STROKE_TOOL_ACTION_NAME
      ) {
        this.state = WEAVE_STROKE_TOOL_STATE.ADDING;
        return;
      }

      if (this.state === WEAVE_STROKE_TOOL_STATE.DEFINING_SIZE) {
        this.handleMovement();
      }
    });

    stage.on('pointerup', (e) => {
      this.pointers.delete(e.evt.pointerId);

      if (this.state === WEAVE_STROKE_TOOL_STATE.DEFINING_SIZE) {
        this.handleSettingSize();
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveStrokeToolActionState) {
    this.state = state;
  }

  private addLine() {
    this.setCursor();
    this.setFocusStage();

    this.instance.emitEvent<WeaveStrokeToolActionOnAddingEvent>(
      'onAddingStroke',
      {
        actionName:
          this.instance.getActiveAction() ?? WEAVE_STROKE_TOOL_ACTION_NAME,
      }
    );

    this.shiftPressed = false;
    this.clickPoint = null;
    this.setState(WEAVE_STROKE_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const { mousePoint, container, measureContainer } =
      this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;
    this.measureContainer = measureContainer;

    this.arrowId = uuidv4();
    this.tempArrowId = uuidv4();

    const nodeHandler = this.instance.getNodeHandler<WeaveStrokeSingleNode>(
      WEAVE_STROKE_SINGLE_NODE_TYPE
    );

    if (!this.tempArrowNode && nodeHandler) {
      this.tempArrowNode = nodeHandler.onRender({
        ...this.props,
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        strokeScaleEnabled: true,
        linePoints: [0, 0, 1, 1],
      }) as Konva.Group;
      this.measureContainer?.add(this.tempArrowNode);

      this.setState(WEAVE_STROKE_TOOL_STATE.DEFINING_SIZE);
    }
  }

  private defineFinalPoint(): Konva.Vector2d {
    if (!this.tempArrowNode || !this.measureContainer) {
      return { x: 0, y: 0 };
    }

    const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
      this.measureContainer
    );

    const pos: Konva.Vector2d = { x: 0, y: 0 };

    if (this.shiftPressed) {
      const linePoints = this.tempArrowNode.getAttrs().linePoints as number[];

      let dx = mousePoint.x - (this.tempArrowNode.x() + linePoints[0]);
      let dy = mousePoint.y - (this.tempArrowNode.y() + linePoints[1]);

      const angle = Math.atan2(dy, dx);
      const angleDeg = (angle * 180) / Math.PI;
      const snapped = this.snapper.apply(angleDeg);

      const dist = Math.hypot(dx, dy);
      const rad = (snapped * Math.PI) / 180;
      dx = Math.cos(rad) * dist;
      dy = Math.sin(rad) * dist;

      pos.x = linePoints[0] + dx;
      pos.y = linePoints[1] + dy;
    } else {
      pos.x = mousePoint.x - this.tempArrowNode.x();
      pos.y = mousePoint.y - this.tempArrowNode.y();
    }

    return pos;
  }

  private handleSettingSize() {
    if (this.arrowId && this.tempArrowNode && this.measureContainer) {
      this.cancelAction();
    }
  }

  private handleMovement() {
    if (this.state !== WEAVE_STROKE_TOOL_STATE.DEFINING_SIZE) {
      return;
    }

    const nodeHandler = this.instance.getNodeHandler<WeaveStrokeSingleNode>(
      WEAVE_STROKE_SINGLE_NODE_TYPE
    );

    if (this.tempArrowNode && this.measureContainer && nodeHandler) {
      const pos: Konva.Vector2d = this.defineFinalPoint();

      const linePoints = this.tempArrowNode.getAttrs().linePoints as number[];
      this.tempArrowNode.setAttrs({
        ...this.props,
        linePoints: [linePoints[0], linePoints[1], pos.x, pos.y],
      });
      nodeHandler.updateLine(this.tempArrowNode);
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

    this.tempArrowNode?.destroy();

    let nodeCreated = false;

    if (
      this.arrowId &&
      this.tempArrowNode?.getAttrs().linePoints.length === 4 &&
      !this.tempArrowNode
        ?.getAttrs()
        .linePoints.every((coord: number) => coord === 0)
    ) {
      const nodeHandler = this.instance.getNodeHandler<WeaveStrokeSingleNode>(
        WEAVE_STROKE_SINGLE_NODE_TYPE
      );

      if (nodeHandler) {
        const clonedArrow = this.tempArrowNode.clone();
        this.tempArrowNode.destroy();

        const node = nodeHandler.create(this.arrowId, {
          ...this.props,
          ...clonedArrow.getAttrs(),
          hitStrokeWidth: 16,
        });
        this.instance.addNode(node, this.container?.getAttrs().id);

        this.instance.emitEvent<WeaveStrokeToolActionOnAddedEvent>(
          'onAddedStroke',
          {
            actionName:
              this.instance.getActiveAction() ?? WEAVE_STROKE_TOOL_ACTION_NAME,
          }
        );

        nodeCreated = true;
      }
    }

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (nodeCreated && selectionPlugin) {
      const node = stage.findOne(`#${this.arrowId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    stage.container().style.cursor = 'default';

    this.initialCursor = null;
    this.arrowId = null;
    this.tempArrowId = null;
    this.tempArrowNode = null;
    this.container = undefined;
    this.measureContainer = undefined;
    this.clickPoint = null;
    this.setState(WEAVE_STROKE_TOOL_STATE.IDLE);
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
