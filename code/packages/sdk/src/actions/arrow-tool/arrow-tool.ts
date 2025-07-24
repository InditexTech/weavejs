// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import { type Vector2d } from 'konva/lib/types';
import { WeaveAction } from '@/actions/action';
import {
  type WeaveArrowToolActionOnAddingEvent,
  type WeaveArrowToolActionState,
} from './types';
import { ARROW_TOOL_ACTION_NAME, ARROW_TOOL_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveArrowNode } from '@/nodes/arrow/arrow';

export class WeaveArrowToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeaveArrowToolActionState;
  protected arrowId: string | null;
  protected tempArrowId: string | null;
  protected tempMainArrowNode: Konva.Line | null;
  protected tempArrowNode: Konva.Arrow | null;
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
    this.state = ARROW_TOOL_STATE.IDLE;
    this.arrowId = null;
    this.tempArrowId = null;
    this.tempMainArrowNode = null;
    this.tempArrowNode = null;
    this.container = undefined;
    this.measureContainer = undefined;
    this.clickPoint = null;
    this.tempPoint = undefined;
    this.tempNextPoint = undefined;
    this.props = this.initProps();
  }

  getName(): string {
    return ARROW_TOOL_ACTION_NAME;
  }

  initProps() {
    return {
      fill: '#000000ff',
      stroke: '#000000ff',
      strokeWidth: 1,
      opacity: 1,
      pointerLength: 10,
      pointerWidth: 10,
      pointerAtBeginning: false,
      pointerAtEnding: true,
    };
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (
        e.key === 'Enter' &&
        this.instance.getActiveAction() === ARROW_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
      if (
        e.key === 'Escape' &&
        this.instance.getActiveAction() === ARROW_TOOL_ACTION_NAME
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
        this.instance.getActiveAction() === ARROW_TOOL_ACTION_NAME
      ) {
        this.state = ARROW_TOOL_STATE.ADDING;
        return;
      }

      if (!this.tempMainArrowNode && this.state === ARROW_TOOL_STATE.ADDING) {
        this.handleAdding();
      }

      if (this.tempMainArrowNode && this.state === ARROW_TOOL_STATE.ADDING) {
        this.state = ARROW_TOOL_STATE.DEFINING_SIZE;
      }
    });

    stage.on('pointermove', () => {
      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === ARROW_TOOL_ACTION_NAME
      ) {
        this.state = ARROW_TOOL_STATE.ADDING;
        return;
      }

      if (this.state === ARROW_TOOL_STATE.DEFINING_SIZE) {
        this.handleMovement();
      }
    });

    stage.on('pointerup', (e) => {
      this.pointers.delete(e.evt.pointerId);

      if (this.state === ARROW_TOOL_STATE.DEFINING_SIZE) {
        this.handleSettingSize();
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveArrowToolActionState) {
    this.state = state;
  }

  private addArrow() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'crosshair';
    stage.container().focus();

    this.instance.emitEvent<WeaveArrowToolActionOnAddingEvent>('onAddingArrow');

    this.tempPoint = undefined;
    this.tempNextPoint = undefined;
    this.clickPoint = null;
    this.setState(ARROW_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const stage = this.instance.getStage();
    const { mousePoint, container, measureContainer } =
      this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;
    this.measureContainer = measureContainer;

    this.arrowId = uuidv4();
    this.tempArrowId = uuidv4();

    if (!this.tempMainArrowNode) {
      this.tempMainArrowNode = new Konva.Line({
        ...this.props,
        id: this.arrowId,
        strokeScaleEnabled: true,
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        points: [0, 0],
      });
      this.measureContainer?.add(this.tempMainArrowNode);

      this.tempPoint = new Konva.Circle({
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        radius: 5 / stage.scaleX(),
        strokeScaleEnabled: true,
        stroke: '#cccccc',
        strokeWidth: 0,
        fill: '#cccccc',
      });
      this.measureContainer?.add(this.tempPoint);

      this.tempArrowNode = new Konva.Arrow({
        ...this.props,
        id: this.tempArrowId,
        strokeScaleEnabled: true,
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        points: [0, 0],
      });
      this.measureContainer?.add(this.tempArrowNode);

      this.tempNextPoint = new Konva.Circle({
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        radius: 5 / stage.scaleX(),
        strokeScaleEnabled: true,
        stroke: '#cccccc',
        strokeWidth: 0,
        fill: '#cccccc',
      });
      this.measureContainer?.add(this.tempNextPoint);

      this.setState(ARROW_TOOL_STATE.DEFINING_SIZE);
    }
  }

  private handleSettingSize() {
    if (
      this.arrowId &&
      this.tempMainArrowNode &&
      this.tempArrowNode &&
      this.tempPoint &&
      this.tempNextPoint &&
      this.measureContainer
    ) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.measureContainer
      );

      const newPoints = [...this.tempMainArrowNode.points()];
      newPoints.push(mousePoint.x - this.tempMainArrowNode.x());
      newPoints.push(mousePoint.y - this.tempMainArrowNode.y());
      this.tempMainArrowNode.setAttrs({
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

      this.tempArrowNode.setAttrs({
        ...this.props,
        x: mousePoint.x,
        y: mousePoint.y,
        points: [0, 0],
      });

      this.setState(ARROW_TOOL_STATE.DEFINING_SIZE);
    }
  }

  private handleMovement() {
    if (this.state !== ARROW_TOOL_STATE.DEFINING_SIZE) {
      return;
    }

    if (
      this.arrowId &&
      this.tempArrowNode &&
      this.measureContainer &&
      this.tempNextPoint
    ) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.measureContainer
      );

      this.tempArrowNode.setAttrs({
        ...this.props,
        points: [
          this.tempArrowNode.points()[0],
          this.tempArrowNode.points()[1],
          mousePoint.x - this.tempArrowNode.x(),
          mousePoint.y - this.tempArrowNode.y(),
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
    this.addArrow();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    this.tempPoint?.destroy();
    this.tempNextPoint?.destroy();
    this.tempArrowNode?.destroy();

    if (
      this.arrowId &&
      this.tempMainArrowNode &&
      this.tempMainArrowNode.points().length >= 4
    ) {
      const nodeHandler = this.instance.getNodeHandler<WeaveArrowNode>('arrow');

      if (nodeHandler) {
        const clonedLine = this.tempMainArrowNode.clone();
        this.tempMainArrowNode.destroy();

        const finalArrow = nodeHandler.create(this.arrowId, {
          ...this.props,
          ...clonedLine.getAttrs(),
          hitStrokeWidth: 16,
        });

        this.instance.addNode(finalArrow, this.container?.getAttrs().id);

        this.instance.emitEvent<WeaveArrowToolActionOnAddingEvent>(
          'onAddedArrow'
        );
      }
    }

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.arrowId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction('selectionTool');
    }

    stage.container().style.cursor = 'default';

    this.initialCursor = null;
    this.tempPoint = undefined;
    this.tempNextPoint = undefined;
    this.arrowId = null;
    this.tempArrowId = null;
    this.tempMainArrowNode = null;
    this.tempArrowNode = null;
    this.container = undefined;
    this.measureContainer = undefined;
    this.clickPoint = null;
    this.setState(ARROW_TOOL_STATE.IDLE);
  }
}
