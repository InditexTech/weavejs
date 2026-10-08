// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import { WeaveAction } from '@/actions/action';
import { type WeaveElementInstance } from '@inditextech/weave-types';
import {
  type WeavePolygonToolActionState,
  type WeavePolygonToolActionTriggerParams,
} from './types';
import { POLYGON_TOOL_ACTION_NAME, POLYGON_TOOL_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import type { WeavePolygonNode } from '@/nodes/polygon/polygon';
import {
  WEAVE_POLYGON_PRESETS,
  instantiatePreset,
  type WeavePolygonPresetDef,
} from '@/nodes/polygon/presets';
import { WEAVE_POLYGON_NODE_TYPE } from '@/nodes/polygon/constants';
import {
  getShapeDragBounds,
  type ShapeDragModifiers,
} from '../shared/shape-geometry';

export class WeavePolygonToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state!: WeavePolygonToolActionState;
  protected polygonId!: string | null;
  protected pointers!: Map<number, Konva.Vector2d>;
  protected clickPoint!: Konva.Vector2d | null;
  protected container!: Konva.Layer | Konva.Node | undefined;
  protected moved!: boolean;
  protected cancelAction!: () => void;
  protected preset: string;
  onPropsChange = undefined;
  onInit = undefined;

  constructor(preset?: string) {
    super();
    this.preset = preset ?? 'pentagon';
    this.initialize();
  }

  initialize(): void {
    this.initialized = false;
    this.state = POLYGON_TOOL_STATE.IDLE;
    this.polygonId = null;
    this.pointers = new Map<number, Konva.Vector2d>();
    this.clickPoint = null;
    this.container = undefined;
    this.moved = false;
    this.props = this.initProps();
  }

  getName(): string {
    return POLYGON_TOOL_ACTION_NAME;
  }

  initProps() {
    return {
      opacity: 1,
      fill: '#ffffffff',
      stroke: '#000000ff',
      strokeWidth: 1,
    };
  }

  getPolygonsPresets(): Record<string, WeavePolygonPresetDef> {
    return WEAVE_POLYGON_PRESETS;
  }

  getPolygonPreset(): string {
    return this.preset;
  }

  setPolygonPreset(preset: string) {
    this.preset = preset;
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    window.addEventListener(
      'keydown',
      (e) => {
        if (
          (e.code === 'Enter' || e.code === 'Escape') &&
          this.instance.getActiveAction() === POLYGON_TOOL_ACTION_NAME
        ) {
          this.cancelAction();
          return;
        }
        if (
          (e.key === 'Shift' || e.key === 'Alt') &&
          this.state === POLYGON_TOOL_STATE.DEFINING_SIZE &&
          this.moved
        ) {
          this.handleMovement(e);
        }
      },
      { signal: this.instance.getEventsController().signal }
    );
    window.addEventListener(
      'keyup',
      (e) => {
        if (
          (e.key === 'Shift' || e.key === 'Alt') &&
          this.state === POLYGON_TOOL_STATE.DEFINING_SIZE &&
          this.moved
        ) {
          this.handleMovement(e);
        }
      },
      { signal: this.instance.getEventsController().signal }
    );

    stage.on('pointermove', () => {
      if (this.state === POLYGON_TOOL_STATE.IDLE) return;

      this.setCursor();
    });

    stage.on('pointerdown', (e) => {
      this.setTapStart(e);
      this.pointers.set(e.evt.pointerId, {
        x: e.evt.clientX,
        y: e.evt.clientY,
      });

      if (this.state !== POLYGON_TOOL_STATE.ADDING) return;

      this.handleAdding();
    });

    stage.on('pointermove', (e) => {
      if (this.state === POLYGON_TOOL_STATE.IDLE) return;
      this.setCursor();
      if (!this.isPressed(e) || !this.pointers.has(e.evt.pointerId)) return;
      if (this.state === POLYGON_TOOL_STATE.DEFINING_SIZE) {
        this.moved = true;
        this.handleMovement(e.evt);
      }
    });

    stage.on('pointerup', (e) => {
      this.pointers.delete(e.evt.pointerId);
      const isTap = this.isTap(e);
      if (isTap) this.moved = false;
      if (this.state === POLYGON_TOOL_STATE.DEFINING_SIZE) {
        this.handleSettingSize(e.evt);
      }
    });

    this.initialized = true;
  }

  private setState(state: WeavePolygonToolActionState) {
    this.state = state;
  }

  private addPolygon() {
    this.setCursor();
    this.setFocusStage();

    this.instance.emitEvent<undefined>('onAddingPolygon');

    this.setState(POLYGON_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const { mousePoint, container } = this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;

    this.polygonId = uuidv4();

    const presetDef = WEAVE_POLYGON_PRESETS[this.preset];
    const scaleFactor = (this.props.scaleFactor as number | undefined) ?? 1;
    const { points, innerRect, width, height } = instantiatePreset(
      presetDef,
      presetDef.defaultWidth * scaleFactor,
      presetDef.defaultHeight * scaleFactor
    );

    const nodeHandler = this.instance.getNodeHandler<WeavePolygonNode>(
      WEAVE_POLYGON_NODE_TYPE
    );

    if (nodeHandler) {
      const node = nodeHandler.create(this.polygonId, {
        ...this.props,
        x: mousePoint?.x ?? 0,
        y: mousePoint?.y ?? 0,
        width,
        height,
        sides: presetDef.sides,
        points,
        innerRect,
      });
      this.instance.addNode(node, container?.getAttrs().id);
    }

    this.setState(POLYGON_TOOL_STATE.DEFINING_SIZE);
  }

  private handleMovement(modifiers: ShapeDragModifiers = {}) {
    if (
      this.state !== POLYGON_TOOL_STATE.DEFINING_SIZE ||
      !this.polygonId ||
      !this.clickPoint ||
      !this.container
    ) {
      return;
    }
    const polygon = this.instance.getStage().findOne(`#${this.polygonId}`);
    const nodeHandler = this.instance.getNodeHandler<WeavePolygonNode>(
      WEAVE_POLYGON_NODE_TYPE
    );
    const presetDef = WEAVE_POLYGON_PRESETS[this.preset];
    if (!polygon || !nodeHandler) return;

    const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
      this.container
    );
    const defaultGeometry = instantiatePreset(
      presetDef,
      presetDef.defaultWidth,
      presetDef.defaultHeight
    );
    const bounds = getShapeDragBounds(this.clickPoint, mousePoint, {
      centered: modifiers.altKey,
      constrained: modifiers.shiftKey,
      aspectRatio: defaultGeometry.width / defaultGeometry.height,
    });
    const geometry = instantiatePreset(
      presetDef,
      (bounds.width * presetDef.defaultWidth) / defaultGeometry.width,
      (bounds.height * presetDef.defaultHeight) / defaultGeometry.height
    );
    nodeHandler.onUpdate(polygon as WeaveElementInstance, {
      ...this.props,
      id: this.polygonId,
      x: bounds.x,
      y: bounds.y,
      ...geometry,
    });
  }

  private handleSettingSize(modifiers: ShapeDragModifiers = {}) {
    if (this.moved) this.handleMovement(modifiers);
    const polygon =
      this.polygonId && this.instance.getStage().findOne(`#${this.polygonId}`);
    const nodeHandler = this.instance.getNodeHandler<WeavePolygonNode>(
      WEAVE_POLYGON_NODE_TYPE
    );
    if (polygon && nodeHandler) {
      this.instance.updateNode(
        nodeHandler.serialize(polygon as WeaveElementInstance)
      );
    }
    this.instance.emitEvent<undefined>('onAddedPolygon');

    this.cancelAction();
  }

  trigger(
    cancelAction: () => void,
    params: WeavePolygonToolActionTriggerParams
  ): void {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    if (!this.initialized) {
      this.setupEvents();
    }

    this.preset = params?.presetId ?? 'pentagon';

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
    this.addPolygon();
  }

  cleanup(): void {
    const stage = this.instance.getStage();
    stage.container().style.cursor = 'default';

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.polygonId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    this.polygonId = null;
    this.pointers.clear();
    this.clickPoint = null;
    this.container = undefined;
    this.moved = false;
    this.setState(POLYGON_TOOL_STATE.IDLE);
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
