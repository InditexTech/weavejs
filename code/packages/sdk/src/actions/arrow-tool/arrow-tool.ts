// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import { type Vector2d } from 'konva/lib/types';
import { type WeaveElementInstance } from '@inditextech/weave-types';
import { WeaveAction } from '@/actions/action';
import { type WeaveArrowToolActionState } from './types';
import { ARROW_TOOL_ACTION_NAME, ARROW_TOOL_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveArrowNode } from '@/nodes/arrow/arrow';
import type { WeaveLineNode } from '@/nodes/line/line';

export class WeaveArrowToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeaveArrowToolActionState;
  protected arrowId: string | null;
  protected tempArrowId: string | null;
  protected container: Konva.Layer | Konva.Group | undefined;
  protected measureContainer: Konva.Layer | Konva.Group | undefined;
  protected clickPoint: Vector2d | null;
  protected tempPoint: Konva.Circle | undefined;
  protected tempNextPoint: Konva.Circle | undefined;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  onInit = undefined;

  constructor() {
    super();

    this.initialized = false;
    this.state = ARROW_TOOL_STATE.IDLE;
    this.arrowId = null;
    this.tempArrowId = null;
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

    stage.on('pointerdblclick', () => {
      this.cancelAction();
    });

    stage.on('pointerclick', () => {
      if (this.state === ARROW_TOOL_STATE.IDLE) {
        return;
      }

      if (this.state === ARROW_TOOL_STATE.ADDING) {
        this.handleAdding();
        return;
      }

      if (this.state === ARROW_TOOL_STATE.DEFINING_SIZE) {
        this.handleSettingSize();
        return;
      }
    });

    stage.on('pointermove', () => {
      this.handleMovement();
    });

    this.initialized = true;
  }

  private setState(state: WeaveArrowToolActionState) {
    this.state = state;
  }

  private addArrow() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'crosshair';

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

    const nodeHandler = this.instance.getNodeHandler<WeaveArrowNode>('arrow');
    const lineNodeHandler = this.instance.getNodeHandler<WeaveLineNode>('line');

    if (lineNodeHandler) {
      const node = lineNodeHandler.create(this.arrowId, {
        ...this.props,
        strokeScaleEnabled: true,
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        points: [0, 0],
      });

      this.instance.addNode(node, this.container?.getAttrs().id);
    }

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

    if (nodeHandler) {
      const tempArrow = nodeHandler.create(this.tempArrowId, {
        ...this.props,
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        strokeScaleEnabled: true,
        points: [0, 0],
      });

      this.instance.addNode(tempArrow, this.container?.getAttrs().id);
    }

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

  private handleSettingSize() {
    const tempArrow = this.instance
      .getStage()
      .findOne(`#${this.tempArrowId}`) as Konva.Arrow | undefined;

    const tempMainArrow = this.instance
      .getStage()
      .findOne(`#${this.arrowId}`) as Konva.Arrow | undefined;

    if (
      this.arrowId &&
      this.tempPoint &&
      this.tempNextPoint &&
      this.measureContainer &&
      tempMainArrow &&
      tempArrow
    ) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.measureContainer
      );

      const newPoints = [...tempMainArrow.points()];
      newPoints.push(mousePoint.x - tempMainArrow.x());
      newPoints.push(mousePoint.y - tempMainArrow.y());
      tempMainArrow.setAttrs({
        ...this.props,
        points: newPoints,
      });

      const nodeHandler = this.instance.getNodeHandler<WeaveArrowNode>('arrow');
      const lineNodeHandler =
        this.instance.getNodeHandler<WeaveLineNode>('line');

      if (lineNodeHandler) {
        this.instance.updateNode(
          lineNodeHandler.serialize(tempMainArrow as WeaveElementInstance)
        );
      }

      this.tempPoint.setAttrs({
        x: mousePoint.x,
        y: mousePoint.y,
      });

      this.tempNextPoint.setAttrs({
        x: mousePoint.x,
        y: mousePoint.y,
      });

      tempArrow.setAttrs({
        ...this.props,
        x: mousePoint.x,
        y: mousePoint.y,
        points: [0, 0],
      });

      if (nodeHandler) {
        this.instance.updateNode(
          nodeHandler.serialize(tempArrow as WeaveElementInstance)
        );
      }
    }

    this.setState(ARROW_TOOL_STATE.DEFINING_SIZE);
  }

  private handleMovement() {
    if (this.state !== ARROW_TOOL_STATE.DEFINING_SIZE) {
      return;
    }

    const tempArrow = this.instance
      .getStage()
      .findOne(`#${this.tempArrowId}`) as Konva.Arrow | undefined;

    if (
      this.arrowId &&
      this.measureContainer &&
      this.tempNextPoint &&
      tempArrow
    ) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.measureContainer
      );

      tempArrow.setAttrs({
        ...this.props,
        points: [
          tempArrow.points()[0],
          tempArrow.points()[1],
          mousePoint.x - tempArrow.x(),
          mousePoint.y - tempArrow.y(),
        ],
      });

      const nodeHandler = this.instance.getNodeHandler<WeaveArrowNode>('arrow');

      if (nodeHandler) {
        this.instance.updateNode(
          nodeHandler.serialize(tempArrow as WeaveElementInstance)
        );
      }

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

    const tempArrow = this.instance
      .getStage()
      .findOne(`#${this.tempArrowId}`) as Konva.Arrow | undefined;

    const tempMainArrow = this.instance
      .getStage()
      .findOne(`#${this.arrowId}`) as Konva.Line | undefined;

    if (tempArrow) {
      const nodeHandler = this.instance.getNodeHandler<WeaveArrowNode>('arrow');

      if (nodeHandler) {
        this.instance.removeNode(
          nodeHandler.serialize(tempArrow as WeaveElementInstance)
        );
      }
    }

    if (this.arrowId && tempMainArrow && tempMainArrow.points().length < 4) {
      const nodeHandler = this.instance.getNodeHandler<WeaveLineNode>('line');

      if (nodeHandler) {
        this.instance.removeNode(
          nodeHandler.serialize(tempMainArrow as WeaveElementInstance)
        );
      }
    }

    if (this.arrowId && tempMainArrow && tempMainArrow.points().length >= 4) {
      const nodeHandler = this.instance.getNodeHandler<WeaveArrowNode>('arrow');
      const lineNodeHandler =
        this.instance.getNodeHandler<WeaveLineNode>('line');

      if (nodeHandler && lineNodeHandler) {
        const finalArrow = nodeHandler.create(this.arrowId, {
          ...tempMainArrow.getAttrs(),
          ...this.props,
          strokeScaleEnabled: true,
          strokeWidth: 1,
          hitStrokeWidth: 16,
        });

        this.instance.removeNode(
          lineNodeHandler.serialize(tempMainArrow as WeaveElementInstance)
        );
        this.instance.addNode(finalArrow, this.container?.getAttrs().id);
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
    this.container = undefined;
    this.clickPoint = null;
    this.setState(ARROW_TOOL_STATE.IDLE);
  }
}
