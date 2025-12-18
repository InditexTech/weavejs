// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import { WeaveAction } from '@/actions/action';
import {
  type WeaveLineToolActionParams,
  type WeaveLineToolActionProperties,
  type WeaveLineToolActionState,
} from './types';
import {
  LINE_TOOL_ACTION_NAME,
  LINE_TOOL_DEFAULT_CONFIG,
  LINE_TOOL_STATE,
} from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveLineNode } from '@/nodes/line/line';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import { mergeExceptArrays } from '@/utils';
import { GreedySnapper } from '@/utils/greedy-snapper';

export class WeaveLineToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected config: WeaveLineToolActionProperties;
  protected state: WeaveLineToolActionState;
  protected lineId: string | null;
  protected tempLineId: string | null;
  protected tempMainLineNode: Konva.Line | null;
  protected tempLineNode: Konva.Line | null;
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

  constructor(params?: WeaveLineToolActionParams) {
    super();

    this.config = mergeExceptArrays(
      LINE_TOOL_DEFAULT_CONFIG,
      params?.config ?? {}
    );

    this.pointers = new Map<number, Konva.Vector2d>();
    this.initialized = false;
    this.state = LINE_TOOL_STATE.IDLE;
    this.lineId = null;
    this.shiftPressed = false;
    this.tempLineId = null;
    this.tempMainLineNode = null;
    this.tempLineNode = null;
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
    return LINE_TOOL_ACTION_NAME;
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

    window.addEventListener('keydown', (e) => {
      if (
        e.code === 'Enter' &&
        this.instance.getActiveAction() === LINE_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
      if (
        e.code === 'Escape' &&
        this.instance.getActiveAction() === LINE_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
      if (
        e.key === 'Shift' &&
        this.instance.getActiveAction() === LINE_TOOL_ACTION_NAME
      ) {
        this.snappedAngle = null;
        this.shiftPressed = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (
        e.key === 'Shift' &&
        this.instance.getActiveAction() === LINE_TOOL_ACTION_NAME
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
        this.instance.getActiveAction() === LINE_TOOL_ACTION_NAME
      ) {
        this.state = LINE_TOOL_STATE.ADDING;
        return;
      }

      if (!this.tempMainLineNode && this.state === LINE_TOOL_STATE.ADDING) {
        this.handleAdding();
      }

      if (this.tempMainLineNode && this.state === LINE_TOOL_STATE.ADDING) {
        this.state = LINE_TOOL_STATE.DEFINING_SIZE;
      }
    });

    stage.on('pointermove', () => {
      if (this.state === LINE_TOOL_STATE.IDLE) {
        return;
      }

      this.setCursor();

      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === LINE_TOOL_ACTION_NAME
      ) {
        this.state = LINE_TOOL_STATE.ADDING;
        return;
      }

      if (this.state === LINE_TOOL_STATE.DEFINING_SIZE) {
        this.handleMovement();
      }
    });

    stage.on('pointerup', (e) => {
      this.pointers.delete(e.evt.pointerId);

      if (this.state === LINE_TOOL_STATE.DEFINING_SIZE) {
        this.handleSettingSize();
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveLineToolActionState) {
    this.state = state;
  }

  private addLine() {
    this.setCursor();
    this.setFocusStage();

    this.instance.emitEvent<undefined>('onAddingLine');

    this.shiftPressed = false;
    this.clickPoint = null;
    this.setState(LINE_TOOL_STATE.ADDING);
  }

  private handleAdding() {
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
        strokeScaleEnabled: true,
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        points: [0, 0],
      });
      this.measureContainer?.add(this.tempMainLineNode);

      this.tempLineNode = new Konva.Line({
        ...this.props,
        id: this.tempLineId,
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        strokeScaleEnabled: true,
        points: [0, 0],
      });
      this.measureContainer?.add(this.tempLineNode);

      this.setState(LINE_TOOL_STATE.DEFINING_SIZE);
    }
  }

  private defineFinalPoint(): Konva.Vector2d {
    if (!this.tempLineNode || !this.measureContainer) {
      return { x: 0, y: 0 };
    }

    const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
      this.measureContainer
    );

    const pos: Konva.Vector2d = { x: 0, y: 0 };

    if (this.shiftPressed) {
      let dx =
        mousePoint.x - (this.tempLineNode.x() + this.tempLineNode.points()[0]);
      let dy =
        mousePoint.y - (this.tempLineNode.y() + this.tempLineNode.points()[1]);

      const angle = Math.atan2(dy, dx);
      const angleDeg = (angle * 180) / Math.PI;
      const snapped = this.snapper.apply(angleDeg);

      const dist = Math.hypot(dx, dy);
      const rad = (snapped * Math.PI) / 180;
      dx = Math.cos(rad) * dist;
      dy = Math.sin(rad) * dist;

      pos.x = this.tempLineNode.points()[0] + dx;
      pos.y = this.tempLineNode.points()[1] + dy;
    } else {
      pos.x = mousePoint.x - this.tempLineNode.x();
      pos.y = mousePoint.y - this.tempLineNode.y();
    }

    return pos;
  }

  private handleSettingSize() {
    if (
      this.lineId &&
      this.tempLineNode &&
      this.tempMainLineNode &&
      this.measureContainer
    ) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.measureContainer
      );

      const pos: Konva.Vector2d = this.defineFinalPoint();
      const newPoints = [...this.tempMainLineNode.points(), pos.x, pos.y];
      this.tempMainLineNode.setAttrs({
        ...this.props,
        points: newPoints,
      });

      this.tempLineNode.setAttrs({
        ...this.props,
        x: mousePoint.x,
        y: mousePoint.y,
        points: [0, 0],
      });

      this.cancelAction();
    }
  }

  private handleMovement() {
    if (this.state !== LINE_TOOL_STATE.DEFINING_SIZE) {
      return;
    }

    if (this.tempLineNode && this.measureContainer) {
      const pos: Konva.Vector2d = this.defineFinalPoint();

      this.tempLineNode.setAttrs({
        ...this.props,
        points: [
          this.tempLineNode.points()[0],
          this.tempLineNode.points()[1],
          pos.x,
          pos.y,
        ],
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

    this.tempLineNode?.destroy();

    let nodeCreated = false;

    if (
      this.lineId &&
      this.tempMainLineNode?.points().length === 4 &&
      !this.tempMainLineNode?.points().every((coord) => coord === 0)
    ) {
      const nodeHandler = this.instance.getNodeHandler<WeaveLineNode>('line');

      if (nodeHandler) {
        const clonedLine = this.tempMainLineNode.clone();
        nodeHandler.scaleReset(clonedLine as unknown as Konva.Line);
        this.tempMainLineNode.destroy();
        const node = nodeHandler.create(this.lineId, {
          ...this.props,
          ...clonedLine.getAttrs(),
          hitStrokeWidth: 16,
        });
        this.instance.addNode(node, this.container?.getAttrs().id);

        this.instance.emitEvent<undefined>('onAddedLine');

        nodeCreated = true;
      }
    }

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (nodeCreated && selectionPlugin) {
      const node = stage.findOne(`#${this.lineId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    stage.container().style.cursor = 'default';

    this.initialCursor = null;
    this.lineId = null;
    this.tempMainLineNode = null;
    this.tempLineId = null;
    this.tempLineNode = null;
    this.container = undefined;
    this.measureContainer = undefined;
    this.clickPoint = null;
    this.setState(LINE_TOOL_STATE.IDLE);
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
