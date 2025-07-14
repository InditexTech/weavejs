// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import { type Vector2d } from 'konva/lib/types';
import { type WeaveElementInstance } from '@inditextech/weave-types';
import { WeaveAction } from '@/actions/action';
import { type WeaveEllipseToolActionState } from './types';
import { ELLIPSE_TOOL_ACTION_NAME, ELLIPSE_TOOL_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import type { WeaveEllipseNode } from '@/nodes/ellipse/ellipse';

export class WeaveEllipseToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state: WeaveEllipseToolActionState;
  protected ellipseId: string | null;
  protected creating: boolean;
  protected moved: boolean;
  protected clickPoint: Vector2d | null;
  protected container!: Konva.Group | Konva.Layer | undefined;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  onInit = undefined;

  constructor() {
    super();

    this.initialized = false;
    this.state = ELLIPSE_TOOL_STATE.IDLE;
    this.ellipseId = null;
    this.creating = false;
    this.moved = false;
    this.container = undefined;
    this.clickPoint = null;
    this.props = this.initProps();
  }

  getName(): string {
    return ELLIPSE_TOOL_ACTION_NAME;
  }

  initProps() {
    return {
      opacity: 1,
      fill: '#ffffffff',
      stroke: '#000000ff',
      strokeWidth: 1,
      radiusX: 50,
      radiusY: 50,
      keepAspectRatio: false,
    };
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (
        e.key === 'Enter' &&
        this.instance.getActiveAction() === ELLIPSE_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
      if (
        e.key === 'Escape' &&
        this.instance.getActiveAction() === ELLIPSE_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
    });

    stage.on('pointerdown', (e) => {
      this.setTapStart(e);

      if (this.state === ELLIPSE_TOOL_STATE.ADDING) {
        this.creating = true;

        this.handleAdding();
      }
    });

    stage.on('pointermove', (e) => {
      if (!this.isPressed(e)) return;

      if (this.state === ELLIPSE_TOOL_STATE.DEFINING_SIZE) {
        this.moved = true;

        this.handleMovement();
      }
    });

    stage.on('pointerup', (e) => {
      const isTap = this.isTap(e);

      if (isTap) {
        this.moved = false;
      }

      if (this.state === ELLIPSE_TOOL_STATE.DEFINING_SIZE) {
        this.creating = false;

        this.handleSettingSize();
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveEllipseToolActionState) {
    this.state = state;
  }

  private addEllipse() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'crosshair';
    stage.container().focus();

    this.clickPoint = null;
    this.setState(ELLIPSE_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const { mousePoint, container } = this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;

    this.ellipseId = uuidv4();

    const nodeHandler =
      this.instance.getNodeHandler<WeaveEllipseNode>('ellipse');

    if (nodeHandler) {
      const node = nodeHandler.create(this.ellipseId, {
        ...this.props,
        strokeScaleEnabled: true,
        x: this.clickPoint?.x ?? 0 + this.props.radiusX,
        y: this.clickPoint?.y ?? 0 + this.props.radiusY,
        radiusX: 0,
        radiusY: 0,
      });

      this.instance.addNode(node, this.container?.getAttrs().id);
    }

    this.setState(ELLIPSE_TOOL_STATE.DEFINING_SIZE);
  }

  private handleSettingSize() {
    const ellipse = this.instance.getStage().findOne(`#${this.ellipseId}`);

    if (this.ellipseId && this.clickPoint && this.container && ellipse) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.container
      );

      const nodeHandler =
        this.instance.getNodeHandler<WeaveEllipseNode>('ellipse');

      const ellipsePos: Vector2d = {
        x: this.clickPoint.x,
        y: this.clickPoint.y,
      };
      let ellipseRadiusX = this.props.radiusY;
      let ellipseRadiusY = this.props.radiusY;
      if (this.moved) {
        ellipsePos.x = Math.min(this.clickPoint.x, mousePoint.x);
        ellipsePos.y = Math.min(this.clickPoint.y, mousePoint.y);
        ellipseRadiusX = Math.abs(this.clickPoint.x - mousePoint.x);
        ellipseRadiusY = Math.abs(this.clickPoint.y - mousePoint.y);
      }

      ellipse.setAttrs({
        ...this.props,
        x: ellipsePos.x + ellipseRadiusX,
        y: ellipsePos.y + ellipseRadiusY,
        radiusX: ellipseRadiusX,
        radiusY: ellipseRadiusY,
      });

      if (nodeHandler) {
        this.instance.updateNode(
          nodeHandler.serialize(ellipse as WeaveElementInstance)
        );
      }
    }

    this.cancelAction();
  }

  private handleMovement() {
    if (this.state !== ELLIPSE_TOOL_STATE.DEFINING_SIZE) {
      return;
    }

    const ellipse = this.instance.getStage().findOne(`#${this.ellipseId}`);

    if (this.ellipseId && this.container && this.clickPoint && ellipse) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.container
      );

      const deltaX = Math.abs(mousePoint.x - this.clickPoint?.x);
      const deltaY = Math.abs(mousePoint.y - this.clickPoint?.y);

      const nodeHandler =
        this.instance.getNodeHandler<WeaveEllipseNode>('ellipse');

      const ellipsePos: Vector2d = {
        x: this.clickPoint.x,
        y: this.clickPoint.y,
      };
      if (this.moved) {
        ellipsePos.x = Math.min(this.clickPoint.x, mousePoint.x);
        ellipsePos.y = Math.min(this.clickPoint.y, mousePoint.y);
      }

      ellipse.setAttrs({
        x: ellipsePos.x + deltaX,
        y: ellipsePos.y + deltaY,
        radiusX: deltaX,
        radiusY: deltaY,
      });

      if (nodeHandler) {
        this.instance.updateNode(
          nodeHandler.serialize(ellipse as WeaveElementInstance)
        );
      }
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
    this.addEllipse();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.ellipseId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    this.ellipseId = null;
    this.creating = false;
    this.moved = false;
    this.container = undefined;
    this.clickPoint = null;
    this.setState(ELLIPSE_TOOL_STATE.IDLE);
  }
}
