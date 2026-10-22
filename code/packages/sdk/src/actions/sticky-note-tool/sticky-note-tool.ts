// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import { WeaveAction } from '@/actions/action';
import type { WeaveElementInstance } from '@inditextech/weave-types';
import {
  type WeaveStickyNoteToolActionOnAddingEvent,
  type WeaveStickyNoteToolActionOnAddedEvent,
  type WeaveStickyNoteToolActionState,
} from './types';
import {
  STICKY_NOTE_TOOL_ACTION_NAME,
  STICKY_NOTE_TOOL_STATE,
} from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import type { WeaveStickyNoteNode } from '@/nodes/sticky-note/sticky-note';
import {
  WEAVE_STICKY_NOTE_NODE_TYPE,
  DEFAULT_STICKY_NOTE_WIDTH,
  DEFAULT_STICKY_NOTE_HEIGHT,
  MIN_STICKY_NOTE_SIZE,
  DEFAULT_STICKY_NOTE_COLOR,
  DEFAULT_STICKY_NOTE_TEXT,
  DEFAULT_STICKY_NOTE_FONT_SIZE,
  DEFAULT_STICKY_NOTE_FONT_FAMILY,
  DEFAULT_STICKY_NOTE_TEXT_COLOR,
  DEFAULT_DOG_EAR_SIZE,
} from '@/nodes/sticky-note/constants';
import {
  getShapeDragBounds,
  type ShapeDragModifiers,
} from '../shared/shape-geometry';
import { bindShapeDragKeyboardHandlers } from '../shared/shape-keyboard';

export class WeaveStickyNoteToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state!: WeaveStickyNoteToolActionState;
  protected noteId!: string | null;
  protected moved!: boolean;
  protected tempPreviewNode!: Konva.Rect | null;
  protected pointers!: Map<number, Konva.Vector2d>;
  protected clickPoint!: Konva.Vector2d | null;
  protected container!: Konva.Layer | Konva.Node | undefined;
  protected measureContainer: Konva.Layer | Konva.Group | undefined;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  onInit = undefined;

  constructor() {
    super();

    this.initialize();
  }

  initialize(): void {
    this.pointers = new Map<number, Konva.Vector2d>();
    this.initialized = false;
    this.state = STICKY_NOTE_TOOL_STATE.IDLE;
    this.noteId = null;
    this.tempPreviewNode = null;
    this.moved = false;
    this.container = undefined;
    this.measureContainer = undefined;
    this.clickPoint = null;
    this.props = this.initProps();
  }

  getName(): string {
    return STICKY_NOTE_TOOL_ACTION_NAME;
  }

  initProps() {
    return {
      width: DEFAULT_STICKY_NOTE_WIDTH,
      height: DEFAULT_STICKY_NOTE_HEIGHT,
      color: DEFAULT_STICKY_NOTE_COLOR,
      text: DEFAULT_STICKY_NOTE_TEXT,
      fontSize: DEFAULT_STICKY_NOTE_FONT_SIZE,
      fontFamily: DEFAULT_STICKY_NOTE_FONT_FAMILY,
      fontColor: DEFAULT_STICKY_NOTE_TEXT_COLOR,
      dogEarSize: DEFAULT_DOG_EAR_SIZE,
    };
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    bindShapeDragKeyboardHandlers(
      this.instance.getEventsController().signal,
      () => this.instance.getActiveAction() === STICKY_NOTE_TOOL_ACTION_NAME,
      () => this.state === STICKY_NOTE_TOOL_STATE.DEFINING_SIZE,
      () => this.state === STICKY_NOTE_TOOL_STATE.DEFINING_SIZE && this.moved,
      () => this.cancelAction(),
      (modifiers) => this.handleMovement(modifiers)
    );

    stage.on('pointermove', () => {
      if (this.state === STICKY_NOTE_TOOL_STATE.IDLE) return;

      this.setCursor();
    });

    stage.on('pointerdown', (e) => {
      this.setTapStart(e);

      this.pointers.set(e.evt.pointerId, {
        x: e.evt.clientX,
        y: e.evt.clientY,
      });

      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === STICKY_NOTE_TOOL_ACTION_NAME
      ) {
        this.state = STICKY_NOTE_TOOL_STATE.ADDING;
        return;
      }

      if (this.state === STICKY_NOTE_TOOL_STATE.ADDING) {
        this.handleAdding();
      }
    });

    stage.on('pointermove', (e) => {
      if (this.state === STICKY_NOTE_TOOL_STATE.IDLE) return;

      this.setCursor();

      if (!this.isPressed(e)) return;

      if (!this.pointers.has(e.evt.pointerId)) return;

      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === STICKY_NOTE_TOOL_ACTION_NAME
      ) {
        this.state = STICKY_NOTE_TOOL_STATE.ADDING;
        return;
      }

      if (this.state === STICKY_NOTE_TOOL_STATE.DEFINING_SIZE) {
        this.handleMovement(e.evt);
      }
    });

    stage.on('pointerup', (e) => {
      this.pointers.delete(e.evt.pointerId);

      const isTap = this.isTap(e);

      if (isTap) {
        this.moved = false;
      }

      if (this.state === STICKY_NOTE_TOOL_STATE.DEFINING_SIZE) {
        this.handleSettingSize(e.evt);
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveStickyNoteToolActionState) {
    this.state = state;
  }

  private addStickyNote() {
    this.setCursor();
    this.setFocusStage();

    this.instance.emitEvent<WeaveStickyNoteToolActionOnAddingEvent>(
      'onAddingStickyNote'
    );

    this.clickPoint = null;
    this.setState(STICKY_NOTE_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const { mousePoint, container, measureContainer } =
      this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;
    this.measureContainer = measureContainer;

    this.noteId = uuidv4();

    if (!this.tempPreviewNode) {
      this.tempPreviewNode = new Konva.Rect({
        id: `${this.noteId}-preview`,
        strokeScaleEnabled: true,
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        width: 0,
        height: 0,
        fill: this.props.color ?? DEFAULT_STICKY_NOTE_COLOR,
        stroke: '#00000022',
        strokeWidth: 1,
        cornerRadius: 2,
        opacity: 0.85,
      });
      this.measureContainer?.add(this.tempPreviewNode);
    }

    this.setState(STICKY_NOTE_TOOL_STATE.DEFINING_SIZE);
  }

  private handleSettingSize(modifiers: ShapeDragModifiers = {}) {
    if (
      this.noteId &&
      this.tempPreviewNode &&
      this.clickPoint &&
      this.container
    ) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.container
      );

      const notePos: Konva.Vector2d = {
        x: this.clickPoint.x,
        y: this.clickPoint.y,
      };
      let noteWidth = this.props.width;
      let noteHeight = this.props.height;
      if (this.moved) {
        const bounds = getShapeDragBounds(this.clickPoint, mousePoint, {
          centered: modifiers.altKey,
          constrained: modifiers.shiftKey,
        });
        notePos.x = bounds.x;
        notePos.y = bounds.y;
        noteWidth = Math.max(bounds.width, MIN_STICKY_NOTE_SIZE);
        noteHeight = Math.max(bounds.height, MIN_STICKY_NOTE_SIZE);
      }

      this.tempPreviewNode.setAttrs({
        x: notePos.x,
        y: notePos.y,
        width: noteWidth,
        height: noteHeight,
      });

      const nodeHandler = this.instance.getNodeHandler<WeaveStickyNoteNode>(
        WEAVE_STICKY_NOTE_NODE_TYPE
      );

      if (nodeHandler) {
        const noteIdToWatch = this.noteId;
        const tempPreviewToDestroy = this.tempPreviewNode;
        this.tempPreviewNode = null;

        const node = nodeHandler.create(this.noteId, {
          ...this.props,
          x: notePos.x,
          y: notePos.y,
          width: noteWidth,
          height: noteHeight,
        });

        const destroyOnRender = (addedNode: WeaveElementInstance) => {
          if (addedNode.getAttrs().id === noteIdToWatch) {
            tempPreviewToDestroy.destroy();
            this.instance.removeEventListener(
              'onNodeRenderedAdded',
              destroyOnRender
            );
          }
        };
        this.instance.addEventListener('onNodeRenderedAdded', destroyOnRender);

        this.instance.addNode(node, this.container?.getAttrs().id);
      }

      this.instance.emitEvent<WeaveStickyNoteToolActionOnAddedEvent>(
        'onAddedStickyNote'
      );
    }

    this.cancelAction();
  }

  private handleMovement(modifiers: ShapeDragModifiers = {}) {
    if (this.state !== STICKY_NOTE_TOOL_STATE.DEFINING_SIZE) {
      return;
    }

    if (
      this.noteId &&
      this.tempPreviewNode &&
      this.measureContainer &&
      this.clickPoint
    ) {
      this.moved = true;

      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.measureContainer
      );

      const bounds = getShapeDragBounds(this.clickPoint, mousePoint, {
        centered: modifiers.altKey,
        constrained: modifiers.shiftKey,
      });

      this.tempPreviewNode.setAttrs({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
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
    this.addStickyNote();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.noteId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    if (this.tempPreviewNode) {
      this.tempPreviewNode.destroy();
    }

    this.noteId = null;
    this.tempPreviewNode = null;
    this.moved = false;
    this.container = undefined;
    this.measureContainer = undefined;
    this.clickPoint = null;
    this.setState(STICKY_NOTE_TOOL_STATE.IDLE);
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
