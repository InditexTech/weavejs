// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import { type Vector2d } from 'konva/lib/types';
import { type WeaveElementInstance } from '@inditextech/weave-types';
import { WeaveAction } from '@/actions/action';
import {
  type WeaveRegularPolygonToolActionOnAddedEvent,
  type WeaveRegularPolygonToolActionOnAddingEvent,
  type WeaveRegularPolygonToolActionState,
} from './types';
import {
  REGULAR_POLYGON_TOOL_ACTION_NAME,
  REGULAR_POLYGON_TOOL_STATE,
} from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import type { WeaveRegularPolygonNode } from '@/nodes/regular-polygon/regular-polygon';

export class WeaveRegularPolygonToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state: WeaveRegularPolygonToolActionState;
  protected regularPolygonId: string | null;
  protected creating: boolean;
  protected moved: boolean;
  protected pointers: Map<number, Vector2d>;
  protected clickPoint: Vector2d | null;
  protected container!: Konva.Layer | Konva.Node | undefined;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  onInit = undefined;

  constructor() {
    super();

    this.pointers = new Map<number, Vector2d>();
    this.initialized = false;
    this.state = REGULAR_POLYGON_TOOL_STATE.IDLE;
    this.regularPolygonId = null;
    this.creating = false;
    this.moved = false;
    this.container = undefined;
    this.clickPoint = null;
    this.props = this.initProps();
  }

  getName(): string {
    return REGULAR_POLYGON_TOOL_ACTION_NAME;
  }

  initProps() {
    return {
      opacity: 1,
      fill: '#ffffffff',
      stroke: '#000000ff',
      strokeWidth: 1,
      sides: 5,
      radius: 50,
    };
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    window.addEventListener('keydown', (e) => {
      if (
        e.code === 'Enter' &&
        this.instance.getActiveAction() === REGULAR_POLYGON_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
      if (
        e.code === 'Escape' &&
        this.instance.getActiveAction() === REGULAR_POLYGON_TOOL_ACTION_NAME
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
        this.instance.getActiveAction() === REGULAR_POLYGON_TOOL_ACTION_NAME
      ) {
        this.state = REGULAR_POLYGON_TOOL_STATE.ADDING;
        return;
      }

      if (this.state === REGULAR_POLYGON_TOOL_STATE.ADDING) {
        this.creating = true;

        this.handleAdding();
      }
    });

    stage.on('pointermove', (e) => {
      if (this.state === REGULAR_POLYGON_TOOL_STATE.IDLE) return;

      this.setCursor();

      if (!this.isPressed(e)) return;

      if (!this.pointers.has(e.evt.pointerId)) return;

      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === REGULAR_POLYGON_TOOL_ACTION_NAME
      ) {
        this.state = REGULAR_POLYGON_TOOL_STATE.ADDING;
        return;
      }

      if (this.state === REGULAR_POLYGON_TOOL_STATE.DEFINING_SIZE) {
        this.moved = true;

        this.handleMovement();
      }
    });

    stage.on('pointerup', (e) => {
      this.pointers.delete(e.evt.pointerId);

      const isTap = this.isTap(e);

      if (isTap) {
        this.moved = false;
      }

      if (this.state === REGULAR_POLYGON_TOOL_STATE.DEFINING_SIZE) {
        this.creating = false;

        this.handleSettingSize();
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveRegularPolygonToolActionState) {
    this.state = state;
  }

  private addRegularPolygon() {
    this.setCursor();
    this.setFocusStage();

    this.instance.emitEvent<WeaveRegularPolygonToolActionOnAddingEvent>(
      'onAddingRegularPolygon'
    );

    this.clickPoint = null;
    this.setState(REGULAR_POLYGON_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const { mousePoint, container } = this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;

    this.regularPolygonId = uuidv4();

    const nodeHandler =
      this.instance.getNodeHandler<WeaveRegularPolygonNode>('regular-polygon');

    if (nodeHandler) {
      const node = nodeHandler.create(this.regularPolygonId, {
        ...this.props,
        strokeScaleEnabled: true,
        x: (this.clickPoint?.x ?? 0) + this.props.radius,
        y: (this.clickPoint?.y ?? 0) + this.props.radius,
        radius: 0,
      });
      this.instance.addNode(node, this.container?.getAttrs().id);
    }

    this.setState(REGULAR_POLYGON_TOOL_STATE.DEFINING_SIZE);
  }

  private handleSettingSize() {
    const regularPolygon = this.instance
      .getStage()
      .findOne(`#${this.regularPolygonId}`);

    if (
      this.regularPolygonId &&
      this.clickPoint &&
      this.container &&
      regularPolygon
    ) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.container
      );

      const nodeHandler =
        this.instance.getNodeHandler<WeaveRegularPolygonNode>(
          'regular-polygon'
        );

      const starPos: Vector2d = {
        x: this.clickPoint.x,
        y: this.clickPoint.y,
      };
      let newRadius = this.props.radius;
      if (this.moved) {
        starPos.x = Math.min(this.clickPoint.x, mousePoint.x);
        starPos.y = Math.min(this.clickPoint.y, mousePoint.y);
        newRadius = Math.abs(this.clickPoint.x - mousePoint.x);
      }

      regularPolygon.setAttrs({
        ...this.props,
        x: starPos.x + newRadius,
        y: starPos.y + newRadius,
        radius: newRadius,
      });

      if (nodeHandler) {
        this.instance.updateNode(
          nodeHandler.serialize(regularPolygon as WeaveElementInstance)
        );
      }

      this.instance.emitEvent<WeaveRegularPolygonToolActionOnAddedEvent>(
        'onAddedRegularPolygon'
      );
    }

    this.cancelAction();
  }

  private handleMovement() {
    if (this.state !== REGULAR_POLYGON_TOOL_STATE.DEFINING_SIZE) {
      return;
    }

    const regularPolygon = this.instance
      .getStage()
      .findOne(`#${this.regularPolygonId}`);

    if (
      this.regularPolygonId &&
      this.container &&
      this.clickPoint &&
      regularPolygon
    ) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.container
      );

      const deltaX = Math.abs(mousePoint.x - this.clickPoint?.x);

      const starPos: Vector2d = {
        x: this.clickPoint.x,
        y: this.clickPoint.y,
      };
      if (this.moved) {
        starPos.x = Math.min(this.clickPoint.x, mousePoint.x);
        starPos.y = Math.min(this.clickPoint.y, mousePoint.y);
      }

      regularPolygon.setAttrs({
        x: starPos.x + deltaX,
        y: starPos.y + deltaX,
        radius: deltaX,
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
    this.addRegularPolygon();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.regularPolygonId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    this.regularPolygonId = null;
    this.creating = false;
    this.moved = false;
    this.container = undefined;
    this.clickPoint = null;
    this.setState(REGULAR_POLYGON_TOOL_STATE.IDLE);
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
