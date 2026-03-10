// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import { WeaveAction } from '@/actions/action';
import {
  type WeaveImageToolActionTriggerParams,
  type WeaveImageToolActionState,
  type WeaveImageToolActionTriggerReturn,
  type WeaveImageToolActionOnEndLoadImageEvent,
  type WeaveImageToolActionOnStartLoadImageEvent,
  type WeaveImageToolActionOnAddedEvent,
  type WeaveImageToolActionOnAddingEvent,
  type WeaveImageToolActionUploadType,
  type WeaveImageToolDragAndDropProperties,
  type WeaveImageToolActionParams,
  type WeaveImageToolActionConfig,
} from './types';
import {
  WEAVE_IMAGE_TOOL_ACTION_NAME,
  WEAVE_IMAGE_TOOL_UPLOAD_TYPE,
  WEAVE_IMAGE_TOOL_STATE,
  WEAVE_IMAGE_TOOL_CONFIG_DEFAULT,
} from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import Konva from 'konva';
import type { WeaveImageNode } from '@/nodes/image/image';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import {
  getPositionRelativeToContainerOnPosition,
  mergeExceptArrays,
} from '@/utils';
import type { WeaveElementInstance } from '@inditextech/weave-types';

export class WeaveImageToolAction extends WeaveAction {
  protected readonly config: WeaveImageToolActionConfig;
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeaveImageToolActionState;
  protected imageId: string | null;
  protected tempImageId: string | null;
  protected tempImageNode: Konva.Image | null;
  protected container: Konva.Layer | Konva.Node | undefined;
  protected pointers: Map<number, Konva.Vector2d>;
  protected imageURL: string | null;
  protected clickPoint: Konva.Vector2d | null;
  protected forceMainContainer: boolean = false;
  protected cancelAction!: () => void;
  private ignoreKeyboardEvents: boolean = false;
  private ignorePointerEvents: boolean = false;
  private uploadType: WeaveImageToolActionUploadType | null = null;
  onPropsChange = undefined;
  update = undefined;

  constructor(params?: WeaveImageToolActionParams) {
    super();

    this.config = mergeExceptArrays(
      WEAVE_IMAGE_TOOL_CONFIG_DEFAULT,
      params?.config ?? {}
    );

    this.pointers = new Map<number, Konva.Vector2d>();
    this.initialized = false;
    this.state = WEAVE_IMAGE_TOOL_STATE.IDLE;
    this.imageId = null;
    this.tempImageId = null;
    this.tempImageNode = null;
    this.container = undefined;
    this.imageURL = null;
    this.uploadType = null;
    this.clickPoint = null;
  }

  getName(): string {
    return WEAVE_IMAGE_TOOL_ACTION_NAME;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.instance.addEventListener('onStageDrop', (e: any) => {
      const dragId = this.instance.getDragStartedId();
      const dragProperties =
        this.instance.getDragProperties<WeaveImageToolDragAndDropProperties>();

      if (dragProperties && dragId === WEAVE_IMAGE_TOOL_ACTION_NAME) {
        this.instance.getStage().setPointersPositions(e);

        const position: Konva.Vector2d | null | undefined =
          getPositionRelativeToContainerOnPosition(this.instance);

        this.instance.triggerAction(WEAVE_IMAGE_TOOL_ACTION_NAME, {
          type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL,
          imageURL: dragProperties.imageURL,
          imageFallback: dragProperties.imageFallback,
          imageWidth: dragProperties.imageWidth,
          imageHeight: dragProperties.imageHeight,
          position,
        });
      }
    });
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    window.addEventListener('keydown', (e) => {
      if (
        e.code === 'Escape' &&
        this.instance.getActiveAction() === WEAVE_IMAGE_TOOL_ACTION_NAME &&
        !this.ignoreKeyboardEvents
      ) {
        this.cancelAction();
        return;
      }
    });

    stage.on('pointerdown', (e) => {
      this.setTapStart(e);

      if (this.ignorePointerEvents) {
        return;
      }

      this.pointers.set(e.evt.pointerId, {
        x: e.evt.clientX,
        y: e.evt.clientY,
      });

      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === WEAVE_IMAGE_TOOL_ACTION_NAME
      ) {
        this.state = WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION;
        return;
      }

      if (this.state === WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION) {
        this.state = WEAVE_IMAGE_TOOL_STATE.SELECTED_POSITION;
      }
    });

    stage.on('pointermove', (e) => {
      if (this.ignorePointerEvents) {
        return;
      }

      if (this.state === WEAVE_IMAGE_TOOL_STATE.IDLE) {
        return;
      }

      this.setCursor();

      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === WEAVE_IMAGE_TOOL_ACTION_NAME
      ) {
        this.state = WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION;
        return;
      }

      if (
        [
          WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION as string,
          WEAVE_IMAGE_TOOL_STATE.SELECTED_POSITION as string,
        ].includes(this.state) &&
        this.tempImageNode &&
        this.instance.getActiveAction() === WEAVE_IMAGE_TOOL_ACTION_NAME &&
        e.evt.pointerType === 'mouse'
      ) {
        const mousePos = stage.getRelativePointerPosition();

        const cursorPadding = this.config.style.cursor.padding;

        this.tempImageNode.setAttrs({
          x: (mousePos?.x ?? 0) + cursorPadding / stage.scaleX(),
          y: (mousePos?.y ?? 0) + cursorPadding / stage.scaleX(),
        });
      }
    });

    stage.on('pointerup', (e) => {
      if (this.ignorePointerEvents) {
        return;
      }

      this.pointers.delete(e.evt.pointerId);

      if (this.state === WEAVE_IMAGE_TOOL_STATE.SELECTED_POSITION) {
        this.handleAdding();
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveImageToolActionState) {
    this.state = state;
  }

  private async loadImage(
    imageData: string | File,
    downscalingRatio?: number,
    position?: Konva.Vector2d
  ) {
    this.setCursor();
    this.setFocusStage();

    if (!this.imageId) {
      this.cancelAction();
      return;
    }

    const imageNodeHandler = this.getImageNodeHandler();

    if (!imageNodeHandler) {
      return;
    }

    const actualImageId = this.imageId;

    if (imageData instanceof File && downscalingRatio) {
      const realImageSize = await this.getImageSizeFromFile(imageData);
      const downscaledImage = await this.downscaleImageFile(
        imageData,
        downscalingRatio
      );

      const reader = new FileReader();
      reader.onloadend = () => {
        imageNodeHandler.preloadFallbackImage(
          actualImageId,
          reader.result as string,
          false,
          {
            onLoad: () => {
              this.instance.emitEvent<WeaveImageToolActionOnEndLoadImageEvent>(
                'onImageLoadEnd',
                undefined
              );

              this.props = {
                ...this.props,
                imageFallback: reader.result as string,
                imageURL: undefined,
                width: realImageSize.width,
                height: realImageSize.height,
              };

              this.addImageNode(position);
            },
            onError: () => {
              this.instance.emitEvent<WeaveImageToolActionOnEndLoadImageEvent>(
                'onImageLoadEnd',
                new Error('Error loading image')
              );

              this.cancelAction();
            },
          }
        );
      };
      reader.onerror = () => {};
      reader.readAsDataURL(downscaledImage);
    } else {
      const actualImageData = imageData as string;

      this.imageURL = actualImageData;

      if (!imageNodeHandler) {
        this.cancelAction();
        return;
      }

      if (WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL === this.uploadType) {
        setTimeout(() => {
          this.saveImageUrl(actualImageId, actualImageData);
        }, 0);

        this.addImageNode(position);
      }
    }

    this.instance.emitEvent<WeaveImageToolActionOnStartLoadImageEvent>(
      'onImageLoadStart'
    );
  }

  private isTouchDevice() {
    return window.matchMedia('(pointer: coarse)').matches;
  }

  private addImageNode(position?: Konva.Vector2d) {
    const stage = this.instance.getStage();

    this.setCursor();
    this.setFocusStage();

    if (position) {
      this.setState(WEAVE_IMAGE_TOOL_STATE.SELECTED_POSITION);
      this.handleAdding(position);
      return;
    }

    if (this.imageId) {
      const mousePos = stage.getRelativePointerPosition();

      this.tempImageId = uuidv4();

      const imageNodeHandler = this.getImageNodeHandler();

      if (!imageNodeHandler) {
        this.cancelAction();
        return;
      }

      let imageSource = imageNodeHandler.getImageSource(this.imageId);
      if (this.uploadType === 'file') {
        imageSource = imageNodeHandler.getFallbackImageSource(this.imageId);
      }

      if (!imageSource) {
        this.cancelAction();
        return;
      }

      const aspectRatio = imageSource.width / imageSource.height;

      if (!this.tempImageNode && this.tempImageId && !this.isTouchDevice()) {
        const cursorPadding = this.config.style.cursor.padding;
        const imageThumbnailWidth =
          this.config.style.cursor.imageThumbnail.width;
        const imageThumbnailHeight =
          this.config.style.cursor.imageThumbnail.height;

        const shadowColor = this.config.style.cursor.imageThumbnail.shadowColor;
        const shadowBlur = this.config.style.cursor.imageThumbnail.shadowBlur;
        const shadowOffset =
          this.config.style.cursor.imageThumbnail.shadowOffset;
        const shadowOpacity =
          this.config.style.cursor.imageThumbnail.shadowOpacity;

        this.tempImageNode = new Konva.Image({
          id: this.tempImageId,
          x: (mousePos?.x ?? 0) + cursorPadding / stage.scaleX(),
          y: (mousePos?.y ?? 0) + cursorPadding / stage.scaleY(),
          width: imageThumbnailWidth * aspectRatio * (1 / stage.scaleX()),
          height: imageThumbnailHeight * (1 / stage.scaleY()),
          opacity: 1,
          adding: true,
          image: imageSource,
          stroke: '#000000ff',
          strokeWidth: 0,
          strokeScaleEnabled: true,
          listening: false,
          shadowColor,
          shadowBlur,
          shadowOffset,
          shadowOpacity,
        });

        this.instance.getMainLayer()?.add(this.tempImageNode);
      }

      this.instance.emitEvent<WeaveImageToolActionOnAddingEvent>(
        'onAddingImage',
        { imageURL: this.props.imageURL }
      );
    }

    this.clickPoint = null;
    this.setState(WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION);
  }

  private handleAdding(position?: Konva.Vector2d) {
    if (this.imageId) {
      const imageNodeHandler = this.getImageNodeHandler();

      if (!imageNodeHandler) {
        this.cancelAction();
        return;
      }

      let imageSource = imageNodeHandler.getImageSource(this.imageId);
      if (this.uploadType === 'file') {
        imageSource = imageNodeHandler.getFallbackImageSource(this.imageId);
      }

      if (!imageSource && !position) {
        this.cancelAction();
        return;
      }

      const { mousePoint, container } = this.instance.getMousePointer(position);

      this.clickPoint = mousePoint;
      this.container = container;

      const nodeHandler = this.instance.getNodeHandler<WeaveImageNode>('image');

      const imageWidth = this.props.width
        ? this.props.width
        : imageSource?.width;
      const imageHeight = this.props.height
        ? this.props.height
        : imageSource?.height;

      if (nodeHandler) {
        const node = nodeHandler.create(this.imageId, {
          ...this.props,
          x: this.clickPoint?.x ?? 0,
          y: this.clickPoint?.y ?? 0,
          opacity: 1,
          adding: false,
          imageURL: this.imageURL ?? undefined,
          stroke: '#000000ff',
          strokeWidth: 0,
          strokeScaleEnabled: true,
          imageWidth,
          imageHeight,
          imageInfo: {
            width: imageWidth,
            height: imageHeight,
          },
          uncroppedImage: {
            width: imageWidth,
            height: imageHeight,
          },
        });

        this.instance.addNode(
          node,
          this.forceMainContainer
            ? this.instance.getMainLayer()?.getAttrs().id
            : this.container?.getAttrs().id
        );

        this.instance.emitEvent<WeaveImageToolActionOnAddedEvent>(
          'onAddedImage',
          { imageURL: this.props.imageURL, nodeId: this.imageId }
        );
      }

      this.setState(WEAVE_IMAGE_TOOL_STATE.FINISHED);
    }

    this.cancelAction();
  }

  trigger(
    cancelAction: () => void,
    params: WeaveImageToolActionTriggerParams
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

    this.ignorePointerEvents = false;
    this.ignoreKeyboardEvents = false;
    this.forceMainContainer = params?.forceMainContainer ?? false;

    this.imageURL = null;
    this.imageId = uuidv4();

    this.props = this.initProps();

    if (params?.imageId) {
      this.updateProps({
        imageId: params.imageId,
      });
    }

    if (this.forceExecution) {
      this.ignorePointerEvents = true;
      this.ignoreKeyboardEvents = true;
    }

    if (params?.position) {
      this.setState(WEAVE_IMAGE_TOOL_STATE.SELECTED_POSITION);
    }

    if (
      params.type === WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE &&
      params.imageFile &&
      params.imageDownscaleRatio
    ) {
      this.uploadType = WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE;
      this.loadImage(
        params.imageFile,
        params.imageDownscaleRatio,
        params?.position ?? undefined
      );
    }
    if (
      params.type === WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL &&
      params.imageURL &&
      params.imageFallback &&
      params.imageWidth &&
      params.imageHeight
    ) {
      this.uploadType = WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL;
      this.updateProps({
        imageFallback: params.imageFallback,
        width: params.imageWidth,
        height: params.imageHeight,
      });
      this.loadImage(params.imageURL, undefined, params?.position ?? undefined);
    }

    if (
      ![
        WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE,
        WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL,
      ].includes(params.type)
    ) {
      this.cancelAction();
      return;
    }

    return {
      nodeId: this.imageId,
      finishUploadCallback: (nodeId: string, imageURL: string) => {
        return this.saveImageUrl.bind(this)(nodeId, imageURL);
      },
    };
  }

  saveImageUrl(nodeId: string, imageURL: string) {
    this.imageURL = imageURL;

    const stage = this.instance.getStage();

    const nodeHandler = this.instance.getNodeHandler<WeaveImageNode>('image');
    const node = stage.findOne(`#${nodeId}`);

    if (nodeHandler && node) {
      node.setAttr('imageURL', imageURL);
      nodeHandler.forceLoadImage(node as WeaveElementInstance);
      this.instance.updateNode(
        nodeHandler.serialize(node as WeaveElementInstance),
        { origin: 'system' }
      );
    }
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    if (this.tempImageNode) {
      this.tempImageNode.destroy();
    }

    if (!this.forceExecution) {
      const selectionPlugin =
        this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
      if (selectionPlugin) {
        const node = stage.findOne(`#${this.imageId}`);
        if (node) {
          selectionPlugin.setSelectedNodes([node]);
        }
        this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
      }

      stage.container().style.cursor = 'default';

      this.instance.endDrag(WEAVE_IMAGE_TOOL_ACTION_NAME);
    }

    this.initialCursor = null;
    this.imageId = null;
    this.forceMainContainer = false;
    this.container = undefined;
    this.tempImageNode = null;
    this.imageURL = null;
    this.clickPoint = null;
    this.setState(WEAVE_IMAGE_TOOL_STATE.IDLE);
  }

  private getImageNodeHandler() {
    return this.instance.getNodeHandler<WeaveImageNode>('image');
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

  private getImageSizeFromFile(
    file: File
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
        URL.revokeObjectURL(url);
      };

      img.onerror = reject;
      img.src = url;
    });
  }

  private async downscaleImageFile(file: File, ratio: number): Promise<Blob> {
    const bitmap = await createImageBitmap(file);

    const width = Math.round(bitmap.width * ratio);
    const height = Math.round(bitmap.height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, width, height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), file.type, 0.9);
    });
  }

  setDragAndDropProperties(properties: WeaveImageToolDragAndDropProperties) {
    this.instance.startDrag(WEAVE_IMAGE_TOOL_ACTION_NAME);
    this.instance.setDragProperties<WeaveImageToolDragAndDropProperties>(
      properties
    );
  }

  getActualState(): WeaveImageToolActionState {
    return this.state;
  }
}
