// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';

import { WeaveAction } from '@/actions/action';
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

export class WeavePolygonToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state!: WeavePolygonToolActionState;
  protected polygonId!: string | null;
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

      if (this.state !== POLYGON_TOOL_STATE.ADDING) return;

      this.handleAdding();
    });

    this.initialized = true;
  }

  private setState(state: WeavePolygonToolActionState) {
    this.state = state;
  }

  private addPolygon() {
    this.setCursor();
    this.setFocusStage();

    this.instance.emitEvent<undefined>(
      'onAddingPolygon'
    );

    this.setState(POLYGON_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const { mousePoint, container } = this.instance.getMousePointer();

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

    this.instance.emitEvent<undefined>(
      'onAddedPolygon'
    );

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
