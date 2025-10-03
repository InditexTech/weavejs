// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import { WeaveAction } from '@/actions/action';
import { type Vector2d } from 'konva/lib/types';
import {
  type VideoOptions,
  type WeaveVideoToolActionTriggerParams,
  type WeaveVideoToolActionState,
  type WeaveVideoToolActionTriggerReturn,
  type WeaveVideoToolActionOnEndLoadImageEvent,
  type WeaveVideoToolActionOnStartLoadImageEvent,
  type WeaveVideoToolActionOnAddedEvent,
  type WeaveVideoToolActionOnAddingEvent,
} from './types';
import { VIDEO_TOOL_ACTION_NAME, VIDEO_TOOL_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import Konva from 'konva';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import type { WeaveVideoNode } from '@/nodes/video/video';

export class WeaveVideoToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeaveVideoToolActionState;
  protected cursorPadding: number = 5;
  protected videoId: string | null;
  protected tempVideoId: string | null;
  protected tempVideoNode: Konva.Image | null;
  protected container: Konva.Layer | Konva.Node | undefined;
  protected pointers: Map<number, Vector2d>;
  protected videoURL: string | null;
  protected preloadVideos: Record<string, HTMLVideoElement>;
  protected clickPoint: Vector2d | null;
  protected forceMainContainer: boolean = false;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  update = undefined;

  constructor() {
    super();

    this.pointers = new Map<number, Vector2d>();
    this.initialized = false;
    this.state = VIDEO_TOOL_STATE.IDLE;
    this.videoId = null;
    this.tempVideoId = null;
    this.tempVideoNode = null;
    this.container = undefined;
    this.videoURL = null;
    this.preloadVideos = {};
    this.clickPoint = null;
  }

  getName(): string {
    return VIDEO_TOOL_ACTION_NAME;
  }

  getPreloadedVideo(videoId: string): HTMLVideoElement | undefined {
    return this.preloadVideos?.[videoId];
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
      if (window.weaveDragImageURL) {
        this.instance.getStage().setPointersPositions(e);
        const position = this.instance.getStage().getRelativePointerPosition();

        this.instance.triggerAction(VIDEO_TOOL_ACTION_NAME, {
          imageURL: window.weaveDragImageURL,
          imageId: window.weaveDragImageId,
          position,
        });
        window.weaveDragImageURL = undefined;
        window.weaveDragImageId = undefined;
      }
    });
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    window.addEventListener('keydown', (e) => {
      if (
        e.key === 'Escape' &&
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

      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === VIDEO_TOOL_ACTION_NAME
      ) {
        this.state = VIDEO_TOOL_STATE.DEFINING_POSITION;
        return;
      }

      if (this.state === VIDEO_TOOL_STATE.DEFINING_POSITION) {
        this.state = VIDEO_TOOL_STATE.SELECTED_POSITION;
      }
    });

    stage.on('pointermove', (e) => {
      if (this.state === VIDEO_TOOL_STATE.IDLE) {
        return;
      }

      this.setCursor();

      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === VIDEO_TOOL_ACTION_NAME
      ) {
        this.state = VIDEO_TOOL_STATE.DEFINING_POSITION;
        return;
      }

      if (
        [
          VIDEO_TOOL_STATE.DEFINING_POSITION as string,
          VIDEO_TOOL_STATE.SELECTED_POSITION as string,
        ].includes(this.state) &&
        this.tempVideoNode &&
        this.instance.getActiveAction() === VIDEO_TOOL_ACTION_NAME &&
        e.evt.pointerType === 'mouse'
      ) {
        const mousePos = stage.getRelativePointerPosition();

        this.tempVideoNode.setAttrs({
          x: (mousePos?.x ?? 0) + this.cursorPadding,
          y: (mousePos?.y ?? 0) + this.cursorPadding,
        });
      }
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

  private loadVideo(
    videoURL: string,
    options?: VideoOptions,
    position?: Vector2d
  ) {
    const imageOptions = {
      crossOrigin: 'anonymous',
      ...options,
    };

    this.setCursor();
    this.setFocusStage();

    this.videoId = uuidv4();
    this.videoURL = videoURL;

    this.preloadVideos[this.videoId] = document.createElement('video');
    this.preloadVideos[this.videoId].crossOrigin = imageOptions.crossOrigin;
    this.preloadVideos[this.videoId].onerror = () => {
      this.instance.emitEvent<WeaveVideoToolActionOnEndLoadImageEvent>(
        'onVideoLoadEnd',
        new Error('Error loading video')
      );
      this.cancelAction();
    };
    this.preloadVideos[this.videoId].onloadedmetadata = () => {
      this.instance.emitEvent<WeaveVideoToolActionOnEndLoadImageEvent>(
        'onVideoLoadEnd',
        undefined
      );

      console.log('AQUI VIDEO METADATA LOADED');

      if (this.videoId) {
        this.props = {
          ...this.props,
          videoURL: this.videoURL,
          width: this.preloadVideos[this.videoId].videoWidth,
          height: this.preloadVideos[this.videoId].videoHeight,
        };
      }

      this.addVideoNode(position);
    };

    this.preloadVideos[this.videoId].src = videoURL;
    this.instance.emitEvent<WeaveVideoToolActionOnStartLoadImageEvent>(
      'onVideoLoadStart'
    );
  }

  private isTouchDevice() {
    return window.matchMedia('(pointer: coarse)').matches;
  }

  private addVideoNode(position?: Vector2d) {
    const stage = this.instance.getStage();

    this.setCursor();
    this.setFocusStage();

    if (position) {
      this.setState(VIDEO_TOOL_STATE.SELECTED_POSITION);
      this.handleAdding(position);
      return;
    }

    if (this.videoId) {
      const mousePos = stage.getRelativePointerPosition();

      this.tempVideoId = uuidv4();

      const aspectRatio =
        this.preloadVideos[this.videoId].videoWidth /
        this.preloadVideos[this.videoId].videoHeight;

      if (!this.tempVideoNode && this.tempVideoId && !this.isTouchDevice()) {
        this.tempVideoNode = new Konva.Image({
          id: this.tempVideoId,
          x: (mousePos?.x ?? 0) + this.cursorPadding,
          y: (mousePos?.y ?? 0) + this.cursorPadding,
          width: 240 * aspectRatio * (1 / stage.scaleX()),
          height: 240 * (1 / stage.scaleY()),
          opacity: 1,
          adding: true,
          image: this.preloadVideos[this.videoId],
          stroke: '#000000ff',
          strokeWidth: 0,
          strokeScaleEnabled: true,
          listening: false,
        });

        this.instance.getMainLayer()?.add(this.tempVideoNode);
      }

      this.instance.emitEvent<WeaveVideoToolActionOnAddingEvent>(
        'onAddingVideo',
        { videoURL: this.props.videoURL }
      );
    }

    this.clickPoint = null;
    this.setState(VIDEO_TOOL_STATE.DEFINING_POSITION);
  }

  private addVideo(position?: Vector2d) {
    if (position) {
      this.clickPoint = position;
    }

    this.setState(VIDEO_TOOL_STATE.UPLOADING);
  }

  private handleAdding(position?: Vector2d) {
    if (this.videoId && this.videoURL && this.preloadVideos[this.videoId]) {
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
          videoURL: this.videoURL,
          stroke: '#000000ff',
          strokeWidth: 0,
          strokeScaleEnabled: true,
          videoWidth: this.preloadVideos[this.videoId].videoWidth,
          videoHeight: this.preloadVideos[this.videoId].videoHeight,
          videoInfo: {
            width: this.preloadVideos[this.videoId].videoWidth,
            height: this.preloadVideos[this.videoId].videoHeight,
          },
        });

        this.instance.addNode(
          node,
          this.forceMainContainer
            ? this.instance.getMainLayer()?.getAttrs().id
            : this.container?.getAttrs().id
        );

        this.instance.emitEvent<WeaveVideoToolActionOnAddedEvent>(
          'onAddedVideo',
          { videoURL: this.props.videoURL, nodeId: this.videoId }
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

    if (params?.videoURL) {
      this.loadVideo(
        params.videoURL,
        params?.options ?? undefined,
        params?.position ?? undefined
      );
      return;
    }

    this.props = this.initProps();
    this.addVideo();

    console.log('AQUI ADDING VIDEO');

    return { finishUploadCallback: this.loadVideo.bind(this) };
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    if (this.videoId) {
      delete this.preloadVideos[this.videoId];
    }

    if (this.tempVideoNode) {
      this.tempVideoNode.destroy();
    }

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
    this.tempVideoNode = null;
    this.videoURL = null;
    this.clickPoint = null;
    this.setState(VIDEO_TOOL_STATE.IDLE);
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
