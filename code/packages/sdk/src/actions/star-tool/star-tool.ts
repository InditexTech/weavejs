// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import { type Vector2d } from 'konva/lib/types';
import { type WeaveElementInstance } from '@inditextech/weave-types';
import { WeaveAction } from '@/actions/action';
import {
  type WeaveStarToolActionOnAddedEvent,
  type WeaveStarToolActionOnAddingEvent,
  type WeaveStarToolActionState,
} from './types';
import { STAR_TOOL_ACTION_NAME, STAR_TOOL_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import type { WeaveStarNode } from '@/nodes/star/star';

export class WeaveStarToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state: WeaveStarToolActionState;
  protected starId: string | null;
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
    this.state = STAR_TOOL_STATE.IDLE;
    this.starId = null;
    this.creating = false;
    this.moved = false;
    this.container = undefined;
    this.clickPoint = null;
    this.props = this.initProps();
  }

  getName(): string {
    return STAR_TOOL_ACTION_NAME;
  }

  initProps() {
    return {
      opacity: 1,
      fill: '#ffffffff',
      stroke: '#000000ff',
      strokeWidth: 1,
      numPoints: 5,
      innerRadius: 35,
      outerRadius: 92,
      keepAspectRatio: false,
    };
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (
        e.key === 'Enter' &&
        this.instance.getActiveAction() === STAR_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
      if (
        e.key === 'Escape' &&
        this.instance.getActiveAction() === STAR_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
    });

    stage.on('pointerover', () => {
      if (this.state === STAR_TOOL_STATE.IDLE) return;

      stage.container().style.cursor = 'crosshair';
      stage.container().blur();
      stage.container().focus();
    });

    stage.on('pointerdown', (e) => {
      this.setTapStart(e);

      this.pointers.set(e.evt.pointerId, {
        x: e.evt.clientX,
        y: e.evt.clientY,
      });

      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === STAR_TOOL_ACTION_NAME
      ) {
        this.state = STAR_TOOL_STATE.ADDING;
        return;
      }

      if (this.state === STAR_TOOL_STATE.ADDING) {
        this.creating = true;

        this.handleAdding();
      }
    });

    stage.on('pointermove', (e) => {
      if (!this.isPressed(e)) return;

      if (!this.pointers.has(e.evt.pointerId)) return;

      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === STAR_TOOL_ACTION_NAME
      ) {
        this.state = STAR_TOOL_STATE.ADDING;
        return;
      }

      if (this.state === STAR_TOOL_STATE.DEFINING_SIZE) {
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

      if (this.state === STAR_TOOL_STATE.DEFINING_SIZE) {
        this.creating = false;

        this.handleSettingSize();
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveStarToolActionState) {
    this.state = state;
  }

  private addStar() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'crosshair';
    stage.container().focus();

    this.instance.emitEvent<WeaveStarToolActionOnAddingEvent>('onAddingStar');

    this.clickPoint = null;
    this.setState(STAR_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const { mousePoint, container } = this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;

    this.starId = uuidv4();

    const nodeHandler = this.instance.getNodeHandler<WeaveStarNode>('star');

    if (nodeHandler) {
      const node = nodeHandler.create(this.starId, {
        ...this.props,
        strokeScaleEnabled: false,
        x: this.clickPoint?.x ?? 0 + this.props.outerRadius,
        y: this.clickPoint?.y ?? 0 + this.props.outerRadius,
        numPoints: 5,
        innerRadius: 0,
        outerRadius: 0,
      });
      this.instance.addNode(node, this.container?.getAttrs().id);
    }

    this.setState(STAR_TOOL_STATE.DEFINING_SIZE);
  }

  private handleSettingSize() {
    const star = this.instance.getStage().findOne(`#${this.starId}`);

    if (this.starId && this.clickPoint && this.container && star) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.container
      );

      const nodeHandler = this.instance.getNodeHandler<WeaveStarNode>('star');

      const starPos: Vector2d = {
        x: this.clickPoint.x,
        y: this.clickPoint.y,
      };
      let starOuterRadius = this.props.outerRadius;
      let starInnerRadius = this.props.innerRadius;
      if (this.moved) {
        starPos.x = Math.min(this.clickPoint.x, mousePoint.x);
        starPos.y = Math.min(this.clickPoint.y, mousePoint.y);
        starOuterRadius = Math.abs(this.clickPoint.x - mousePoint.x);
        starInnerRadius = Math.abs(this.clickPoint.y - mousePoint.y);
      }

      star.setAttrs({
        ...this.props,
        x: starPos.x + starOuterRadius,
        y: starPos.y + starOuterRadius,
        outerRadius: starOuterRadius,
        innerRadius: starInnerRadius,
      });

      if (nodeHandler) {
        this.instance.updateNode(
          nodeHandler.serialize(star as WeaveElementInstance)
        );
      }

      this.instance.emitEvent<WeaveStarToolActionOnAddedEvent>('onAddedStar');
    }

    this.cancelAction();
  }

  private handleMovement() {
    if (this.state !== STAR_TOOL_STATE.DEFINING_SIZE) {
      return;
    }

    const star = this.instance.getStage().findOne(`#${this.starId}`);

    if (this.starId && this.container && this.clickPoint && star) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.container
      );

      const deltaX = Math.abs(mousePoint.x - this.clickPoint?.x);
      const deltaY = Math.abs(mousePoint.y - this.clickPoint?.y);

      const nodeHandler = this.instance.getNodeHandler<WeaveStarNode>('star');

      const starPos: Vector2d = {
        x: this.clickPoint.x,
        y: this.clickPoint.y,
      };
      if (this.moved) {
        starPos.x = Math.min(this.clickPoint.x, mousePoint.x);
        starPos.y = Math.min(this.clickPoint.y, mousePoint.y);
      }

      star.setAttrs({
        x: starPos.x + deltaX,
        y: starPos.y + deltaX,
        outerRadius: deltaX,
        innerRadius: deltaY,
      });

      if (nodeHandler) {
        this.instance.updateNode(
          nodeHandler.serialize(star as WeaveElementInstance)
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
    this.addStar();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.starId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    this.starId = null;
    this.creating = false;
    this.moved = false;
    this.container = undefined;
    this.clickPoint = null;
    this.setState(STAR_TOOL_STATE.IDLE);
  }
}
