// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import { WeaveAction } from '@/actions/action';
import { type Vector2d } from 'konva/lib/types';
import {
  type WeaveImageToolActionTriggerParams,
  type WeaveImageToolActionState,
  type WeaveImageToolActionTriggerReturn,
  type WeaveImageToolActionOnEndLoadImageEvent,
  type WeaveImageToolActionOnStartLoadImageEvent,
} from './types';
import { IMAGE_TOOL_ACTION_NAME, IMAGE_TOOL_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import Konva from 'konva';
import { type WeaveElementInstance } from '@inditextech/weave-types';
import type { WeaveRectangleNode } from '@/nodes/rectangle/rectangle';
import type { WeaveImageNode } from '@/nodes/image/image';

export class WeaveImageToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeaveImageToolActionState;
  protected imageId: string | null;
  protected tempImageId: string | null;
  protected container: Konva.Layer | Konva.Group | undefined;
  protected imageURL: string | null;
  protected preloadImgs: Record<string, HTMLImageElement>;
  protected clickPoint: Vector2d | null;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  update = undefined;

  constructor() {
    super();

    this.initialized = false;
    this.state = IMAGE_TOOL_STATE.IDLE;
    this.imageId = null;
    this.tempImageId = null;
    this.container = undefined;
    this.imageURL = null;
    this.preloadImgs = {};
    this.clickPoint = null;
  }

  getName(): string {
    return IMAGE_TOOL_ACTION_NAME;
  }

  getPreloadedImage(imageId: string): HTMLImageElement | undefined {
    return this.preloadImgs?.[imageId];
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
        const position = this.instance.getStage().getPointerPosition();
        this.instance.triggerAction('imageTool', {
          imageURL: window.weaveDragImageURL,
          position,
        });
        window.weaveDragImageURL = undefined;
      }
    });
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (
        e.key === 'Escape' &&
        this.instance.getActiveAction() === IMAGE_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
    });

    stage.on('click tap', (e) => {
      e.evt.preventDefault();

      if (this.state === IMAGE_TOOL_STATE.IDLE) {
        return;
      }

      if (this.state === IMAGE_TOOL_STATE.UPLOADING) {
        return;
      }

      if (this.state === IMAGE_TOOL_STATE.ADDING) {
        this.handleAdding();
        return;
      }
    });

    stage.on('mousemove touchmove', (e) => {
      e.evt.preventDefault();

      const tempImage = this.instance
        .getStage()
        .findOne(`#${this.tempImageId}`);

      if (this.state === IMAGE_TOOL_STATE.ADDING && tempImage) {
        const mousePos = stage.getRelativePointerPosition();
        tempImage.setAttrs({
          x: (mousePos?.x ?? 0) + 2,
          y: (mousePos?.y ?? 0) + 2,
        });

        const nodeHandler =
          this.instance.getNodeHandler<WeaveRectangleNode>('rectangle');
        this.instance.updateNode(
          nodeHandler.serialize(tempImage as WeaveElementInstance)
        );
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveImageToolActionState) {
    this.state = state;
  }

  private loadImage(imageURL: string, position?: Vector2d) {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'crosshair';
    stage.container().focus();

    this.imageId = uuidv4();
    this.imageURL = imageURL;

    this.preloadImgs[this.imageId] = new Image();
    this.preloadImgs[this.imageId].onerror = () => {
      this.instance.emitEvent<WeaveImageToolActionOnEndLoadImageEvent>(
        'onImageLoadEnd',
        new Error('Error loading image')
      );
      this.cancelAction();
    };
    this.preloadImgs[this.imageId].onload = () => {
      this.instance.emitEvent<WeaveImageToolActionOnEndLoadImageEvent>(
        'onImageLoadEnd',
        undefined
      );

      if (this.imageId) {
        this.props = {
          ...this.props,
          imageURL: this.imageURL,
          width: this.preloadImgs[this.imageId].width,
          height: this.preloadImgs[this.imageId].height,
        };
      }

      this.addImageNode(position);
    };

    this.preloadImgs[this.imageId].src = imageURL;
    this.instance.emitEvent<WeaveImageToolActionOnStartLoadImageEvent>(
      'onImageLoadStart'
    );
  }

  private addImageNode(position?: Vector2d) {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'crosshair';
    stage.container().focus();

    if (position) {
      this.handleAdding(position);
      this.setState(IMAGE_TOOL_STATE.ADDING);
      return;
    }

    if (this.imageId) {
      const mousePos = stage.getRelativePointerPosition();

      const nodeHandler = this.instance.getNodeHandler<WeaveImageNode>('image');

      this.tempImageId = uuidv4();

      const aspectRatio =
        this.preloadImgs[this.imageId].width /
        this.preloadImgs[this.imageId].height;

      const node = nodeHandler.create(this.tempImageId, {
        x: (mousePos?.x ?? 0) + 5,
        y: (mousePos?.y ?? 0) + 5,
        width: 100 * aspectRatio,
        height: 100,
        opacity: 1,
        adding: true,
        imageURL: this.imageURL,
        stroke: '#000000ff',
        strokeWidth: 0,
        strokeScaleEnabled: true,
        listening: false,
      });

      this.instance.addNode(node, this.container?.getAttrs().id);
    }

    this.clickPoint = null;
    this.setState(IMAGE_TOOL_STATE.ADDING);
  }

  private addImage(position?: Vector2d) {
    if (position) {
      this.clickPoint = position;
    }

    this.setState(IMAGE_TOOL_STATE.UPLOADING);
  }

  private handleAdding(position?: Vector2d) {
    const tempImage = this.instance.getStage().findOne(`#${this.tempImageId}`);

    if (
      this.imageId &&
      this.imageURL &&
      this.preloadImgs[this.imageId] &&
      ((!position && tempImage) || position)
    ) {
      const { mousePoint, container } = this.instance.getMousePointer(position);

      this.clickPoint = mousePoint;
      this.container = container;

      const nodeHandler = this.instance.getNodeHandler<WeaveImageNode>('image');

      const node = nodeHandler.create(this.imageId, {
        ...this.props,
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        opacity: 1,
        adding: false,
        imageURL: this.imageURL,
        stroke: '#000000ff',
        strokeWidth: 0,
        strokeScaleEnabled: true,
        imageWidth: this.preloadImgs[this.imageId].width,
        imageHeight: this.preloadImgs[this.imageId].height,
        imageInfo: {
          width: this.preloadImgs[this.imageId].width,
          height: this.preloadImgs[this.imageId].height,
        },
      });

      this.instance.addNode(node, this.container?.getAttrs().id);

      if (!position) {
        const imageNodeHandler =
          this.instance.getNodeHandler<WeaveImageNode>('image');
        this.instance.removeNode(
          imageNodeHandler.serialize(tempImage as WeaveElementInstance)
        );
      }

      this.setState(IMAGE_TOOL_STATE.FINISHED);
    }

    this.cancelAction();
  }

  trigger(
    cancelAction: () => void,
    params?: WeaveImageToolActionTriggerParams
  ): WeaveImageToolActionTriggerReturn {
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

    if (params?.imageURL) {
      this.loadImage(params.imageURL, params?.position ?? undefined);
      return;
    }

    this.props = this.initProps();
    this.addImage();

    return { finishUploadCallback: this.loadImage.bind(this) };
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    if (this.imageId) {
      delete this.preloadImgs[this.imageId];
    }

    const tempImage = this.instance.getStage().findOne(`#${this.tempImageId}`);
    if (tempImage) {
      const nodeHandler =
        this.instance.getNodeHandler<WeaveRectangleNode>('rectangle');
      this.instance.removeNode(
        nodeHandler.serialize(tempImage as WeaveElementInstance)
      );
    }

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.imageId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction('selectionTool');
    }

    stage.container().style.cursor = 'default';

    this.initialCursor = null;
    this.imageId = null;
    this.container = undefined;
    this.imageURL = null;
    this.clickPoint = null;
    this.setState(IMAGE_TOOL_STATE.IDLE);
  }
}
