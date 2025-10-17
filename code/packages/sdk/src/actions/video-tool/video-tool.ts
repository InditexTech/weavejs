// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import { WeaveAction } from '@/actions/action';
import {
  type WeaveVideoToolActionTriggerParams,
  type WeaveVideoToolActionState,
  type WeaveVideoToolActionTriggerReturn,
  type WeaveVideoToolActionOnAddedEvent,
  type WeaveVideoToolDragParams,
  type WeaveVideoToolActionOnAddingEvent,
} from './types';
import { VIDEO_TOOL_ACTION_NAME, VIDEO_TOOL_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import Konva from 'konva';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import type { WeaveVideoNode } from '@/nodes/video/video';
import { getPositionRelativeToContainerOnPosition } from '@/utils';

export class WeaveVideoToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeaveVideoToolActionState;
  protected cursorPadding: number = 5;
  protected videoId: string | null;
  protected container: Konva.Layer | Konva.Node | undefined;
  protected pointers: Map<number, Konva.Vector2d>;
  protected videoParams: WeaveVideoToolDragParams | null;
  protected clickPoint: Konva.Vector2d | null;
  protected forceMainContainer: boolean = false;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  update = undefined;

  constructor() {
    super();

    this.pointers = new Map<number, Konva.Vector2d>();
    this.initialized = false;
    this.state = VIDEO_TOOL_STATE.IDLE;
    this.videoId = null;
    this.container = undefined;
    this.videoParams = null;
    this.clickPoint = null;
  }

  getName(): string {
    return VIDEO_TOOL_ACTION_NAME;
  }

  getVideoSource(videoId: string): HTMLVideoElement | undefined {
    const nodeHandler = this.instance.getNodeHandler<WeaveVideoNode>('video');

    if (!nodeHandler) {
      return undefined;
    }

    return nodeHandler.getVideoSource(videoId);
  }

  initProps() {
    return {
      width: 100,
      height: 100,
      scaleX: 1,
      scaleY: 1,
    };
  }

  onInit(): void {
    this.instance.addEventListener('onStageDrop', (e) => {
      if (window.weaveDragVideoId && window.weaveDragVideoParams) {
        this.instance.getStage().setPointersPositions(e);
        const position: Konva.Vector2d | null | undefined =
          getPositionRelativeToContainerOnPosition(this.instance);

        this.instance.triggerAction(VIDEO_TOOL_ACTION_NAME, {
          videoId: window.weaveDragVideoId,
          videoParams: window.weaveDragVideoParams,
          position,
        });

        window.weaveDragVideoParams = undefined;
        window.weaveDragVideoId = undefined;
      }
    });
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    window.addEventListener('keydown', (e) => {
      if (
        e.code === 'Escape' &&
        this.instance.getActiveAction() === VIDEO_TOOL_ACTION_NAME
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

      if (this.state === VIDEO_TOOL_STATE.DEFINING_POSITION) {
        this.state = VIDEO_TOOL_STATE.SELECTED_POSITION;
      }
    });

    stage.on('pointermove', () => {
      if (this.state === VIDEO_TOOL_STATE.IDLE) {
        return;
      }

      this.setCursor();
    });

    stage.on('pointerup', (e) => {
      this.pointers.delete(e.evt.pointerId);

      if (this.state === VIDEO_TOOL_STATE.SELECTED_POSITION) {
        this.handleAdding();
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveVideoToolActionState) {
    this.state = state;
  }

  private doVideoAdding(
    videoParams: WeaveVideoToolDragParams,
    position?: Konva.Vector2d
  ) {
    this.videoId = uuidv4();
    this.videoParams = videoParams;

    this.setState(VIDEO_TOOL_STATE.DEFINING_POSITION);

    if (!position) {
      this.clickPoint = null;

      this.instance.emitEvent<WeaveVideoToolActionOnAddingEvent>(
        'onAddingVideo',
        { videoURL: this.videoParams.url }
      );
    } else {
      this.handleAdding(position);
    }
  }

  private addVideo(position?: Konva.Vector2d) {
    if (position) {
      this.clickPoint = position;
    }

    this.setState(VIDEO_TOOL_STATE.UPLOADING);
  }

  private handleAdding(position?: Konva.Vector2d) {
    if (this.videoId && this.videoParams) {
      const { mousePoint, container } = this.instance.getMousePointer(position);

      this.clickPoint = mousePoint;
      this.container = container;

      const nodeHandler = this.instance.getNodeHandler<WeaveVideoNode>('video');

      if (nodeHandler) {
        const node = nodeHandler.create(this.videoId, {
          ...this.props,
          x: this.clickPoint?.x ?? 0,
          y: this.clickPoint?.y ?? 0,
          opacity: 1,
          adding: false,
          videoPlaceholderURL: this.videoParams.placeholderUrl,
          videoURL: this.videoParams.url,
          stroke: '#000000ff',
          strokeWidth: 0,
          strokeScaleEnabled: true,
        });

        this.instance.addNode(
          node,
          this.forceMainContainer
            ? this.instance.getMainLayer()?.getAttrs().id
            : this.container?.getAttrs().id
        );

        this.instance.emitEvent<WeaveVideoToolActionOnAddedEvent>(
          'onAddedVideo',
          { videoURL: this.videoParams.url, nodeId: this.videoId }
        );
      }

      this.setState(VIDEO_TOOL_STATE.FINISHED);
    }

    this.cancelAction();
  }

  trigger(
    cancelAction: () => void,
    params?: WeaveVideoToolActionTriggerParams
  ): WeaveVideoToolActionTriggerReturn {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    if (!this.initialized) {
      this.setupEvents();
    }

    this.cancelAction = cancelAction;

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      selectionPlugin.setSelectedNodes([]);
    }

    this.forceMainContainer = params?.forceMainContainer ?? false;

    if (params?.videoId) {
      this.updateProps({
        videoId: params.videoId,
      });
    }

    if (params?.videoParams) {
      this.updateProps({
        width: params.videoParams.width,
        height: params.videoParams.height,
      });
      this.doVideoAdding(params.videoParams, params?.position ?? undefined);
      return;
    }

    this.props = this.initProps();
    this.addVideo();

    return { finishUploadCallback: this.doVideoAdding.bind(this) };
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.videoId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    stage.container().style.cursor = 'default';

    this.initialCursor = null;
    this.videoId = null;
    this.forceMainContainer = false;
    this.container = undefined;
    this.videoParams = null;
    this.clickPoint = null;
    this.setState(VIDEO_TOOL_STATE.IDLE);
  }

  private setCursor() {
    const stage = this.instance.getStage();
    stage.container().style.cursor = 'crosshair';
  }
}
