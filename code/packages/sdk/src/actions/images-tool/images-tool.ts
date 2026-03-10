// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { type Vector2d } from 'konva/lib/types';
import {
  type DeepPartial,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import {
  type WeaveImagesToolActionTriggerParams,
  type WeaveImagesToolActionState,
  type WeaveImagesToolActionParams,
  type WeaveImagesToolDragAndDropProperties,
  type WeaveImagesToolActionUploadType,
} from './types';
import {
  WEAVE_IMAGES_TOOL_ACTION_NAME,
  WEAVE_IMAGES_TOOL_DEFAULT_CONFIG,
  WEAVE_IMAGES_TOOL_STATE,
  WEAVE_IMAGES_TOOL_UPLOAD_TYPE,
} from './constants';
import { sleep } from '@/utils/generic';
import { WeaveAction } from '../action';
import {
  getPositionRelativeToContainerOnPosition,
  mergeExceptArrays,
} from '@/utils';
import type { WeaveImageToolAction } from '../image-tool/image-tool';
import { WEAVE_IMAGE_TOOL_ACTION_NAME } from '../image-tool/constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveImageNode } from '@/nodes/image/image';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import type {
  WeaveImageToolActionTriggerParams,
  WeaveImageToolActionTriggerReturn,
} from '../image-tool/types';

export class WeaveImagesToolAction extends WeaveAction {
  private readonly config: WeaveImagesToolActionParams;
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeaveImagesToolActionState;
  protected pointers: Map<number, Vector2d>;
  protected tempPointerFeedbackNode: Konva.Group | null;
  protected container: Konva.Layer | Konva.Group | undefined;
  protected nodesIds: string[] = [];
  protected imagesIds: string[] = [];
  protected imagesSize: { width: number; height: number }[] = [];
  protected imagesDownscaleRatio: number[] = [];
  protected imagesFallback: string[] = [];
  protected images: File[] | null = null;
  protected imagesURLs: string[] | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected uploadImageFunction!: any;
  protected preloadImgs: Record<string, HTMLImageElement>;
  protected clickPoint: Vector2d | null;
  protected forceMainContainer: boolean = false;
  protected cancelAction!: () => void;
  private onStartUploading: () => void = () => {};
  private onFinishedUploading: () => void = () => {};
  private uploadType: WeaveImagesToolActionUploadType | null = null;
  onPropsChange = undefined;
  update = undefined;

  constructor(params?: DeepPartial<WeaveImagesToolActionParams>) {
    super();

    this.config = mergeExceptArrays(
      WEAVE_IMAGES_TOOL_DEFAULT_CONFIG,
      params ?? {}
    );

    this.pointers = new Map<number, Vector2d>();
    this.initialized = false;
    this.tempPointerFeedbackNode = null;
    this.state = WEAVE_IMAGES_TOOL_STATE.IDLE;
    this.images = [];
    this.container = undefined;
    this.preloadImgs = {};
    this.uploadType = null;
    this.clickPoint = null;
  }

  getName(): string {
    return WEAVE_IMAGES_TOOL_ACTION_NAME;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.instance.addEventListener('onStageDrop', (e: any) => {
      const dragId = this.instance.getDragStartedId();
      const dragProperties =
        this.instance.getDragProperties<WeaveImagesToolDragAndDropProperties>();

      if (dragProperties && dragId === WEAVE_IMAGES_TOOL_ACTION_NAME) {
        this.instance.getStage().setPointersPositions(e);
        const position: Konva.Vector2d | null | undefined =
          getPositionRelativeToContainerOnPosition(this.instance);

        this.instance.triggerAction(WEAVE_IMAGES_TOOL_ACTION_NAME, {
          type: WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL,
          imagesURLs: dragProperties.imagesURls,
          imagesSize: dragProperties.imagesSize,
          imagesFallback: dragProperties.imagesFallback,
          imagesIds: dragProperties.imagesIds,
          position,
        });
      }
    });
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (
        e.key === 'Escape' &&
        this.instance.getActiveAction() === WEAVE_IMAGES_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
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
        this.instance.getActiveAction() === WEAVE_IMAGES_TOOL_ACTION_NAME
      ) {
        this.state = WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION;
        return;
      }

      if (this.state === WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION) {
        this.state = WEAVE_IMAGES_TOOL_STATE.SELECTED_POSITION;
      }
    });

    stage.on('pointermove', (e) => {
      if (this.state === WEAVE_IMAGES_TOOL_STATE.IDLE) return;

      this.setCursor();
      this.setFocusStage();

      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === WEAVE_IMAGES_TOOL_ACTION_NAME
      ) {
        this.state = WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION;
        return;
      }

      if (
        [
          WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION as string,
          WEAVE_IMAGES_TOOL_STATE.SELECTED_POSITION as string,
        ].includes(this.state) &&
        this.tempPointerFeedbackNode &&
        this.instance.getActiveAction() === WEAVE_IMAGES_TOOL_ACTION_NAME &&
        e.evt.pointerType === 'mouse'
      ) {
        const mousePos = stage.getRelativePointerPosition();

        const cursorPadding = this.config.style.cursor.padding;

        this.tempPointerFeedbackNode.setAttrs({
          x: (mousePos?.x ?? 0) + cursorPadding / stage.scaleX(),
          y: (mousePos?.y ?? 0) + cursorPadding / stage.scaleY(),
        });
      }
    });

    stage.on('pointerup', (e) => {
      this.pointers.delete(e.evt.pointerId);

      if (this.state === WEAVE_IMAGES_TOOL_STATE.SELECTED_POSITION) {
        this.handleAdding();
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveImagesToolActionState) {
    this.state = state;
  }

  private async addImages(position?: Vector2d) {
    const stage = this.instance.getStage();

    this.setCursor();
    this.setFocusStage();

    if (position) {
      this.setState(WEAVE_IMAGES_TOOL_STATE.SELECTED_POSITION);
      this.handleAdding(position);
      return;
    }

    if (
      !this.tempPointerFeedbackNode &&
      !this.isTouchDevice() &&
      this.images &&
      this.uploadType === WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE
    ) {
      const mousePos = stage.getRelativePointerPosition();

      const cursorPadding = this.config.style.cursor.padding;
      const imageThumbnailsPadding =
        this.config.style.cursor.imageThumbnails.padding;

      this.tempPointerFeedbackNode = new Konva.Group({
        x: (mousePos?.x ?? 0) + cursorPadding / stage.scaleX(),
        y: (mousePos?.y ?? 0) + cursorPadding / stage.scaleY(),
        listening: false,
      });

      const imagesTop3 = this.images.slice(0, 3) ?? [];
      let maxWidth = 0;
      let maxHeight = 0;
      let position: Konva.Vector2d = { x: 0, y: 0 };
      for (const image of imagesTop3) {
        const imageSource = await this.loadImageSource(image);

        const maxImageWidth = this.config.style.cursor.imageThumbnails.width;
        const maxImageHeight = this.config.style.cursor.imageThumbnails.height;

        const shadowColor =
          this.config.style.cursor.imageThumbnails.shadowColor;
        const shadowBlur = this.config.style.cursor.imageThumbnails.shadowBlur;
        const shadowOffset =
          this.config.style.cursor.imageThumbnails.shadowOffset;
        const shadowOpacity =
          this.config.style.cursor.imageThumbnails.shadowOpacity;

        const aspectRatio = imageSource.width / imageSource.height || 1;
        const imageWidth = maxImageWidth * aspectRatio * (1 / stage.scaleX());
        const imageHeight = maxImageHeight * (1 / stage.scaleY());

        const imageNode = new Konva.Image({
          x: position.x,
          y: position.y,
          width: imageWidth,
          height: imageHeight,
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

        maxWidth = position.x + imageWidth;
        maxHeight = Math.max(maxHeight, position.y + imageHeight);

        position = {
          x: position.x + imageThumbnailsPadding / stage.scaleX(),
          y: position.y + imageThumbnailsPadding / stage.scaleY(),
        };

        this.tempPointerFeedbackNode.add(imageNode);
        imageNode.moveToBottom();
      }

      if (this.images.length > 3) {
        const paddingX = this.config.style.moreImages.paddingX;
        const paddingY = this.config.style.moreImages.paddingY;
        const fontSize = this.config.style.moreImages.fontSize;
        const fontFamily = this.config.style.moreImages.fontFamily;
        const textColor = this.config.style.moreImages.textColor;
        const backgroundColor = this.config.style.moreImages.backgroundColor;
        const backgroundOpacity =
          this.config.style.moreImages.backgroundOpacity;

        const text = `and ${this.images.length - 3} more image(s)`;
        const textNode = new Konva.Text({
          x:
            maxWidth +
            paddingX / stage.scaleX() +
            cursorPadding / stage.scaleX(),
          y: position.y,
          fontFamily,
          fontSize: fontSize / stage.scaleX(),
          text,
          fill: textColor,
          listening: false,
        });

        const textSize = textNode.measureSize(text);
        textNode.y((maxHeight - textSize.height) / 2);

        this.tempPointerFeedbackNode.add(textNode);

        const textBg = new Konva.Rect({
          x: textNode.x() - paddingX / stage.scaleX(),
          y: textNode.y() - paddingY / stage.scaleY(),
          width: textNode.width() + (2 * paddingX) / stage.scaleX(),
          height: textNode.height() + (2 * paddingY) / stage.scaleY(),
          fill: backgroundColor,
          opacity: backgroundOpacity,
        });

        this.tempPointerFeedbackNode.add(textBg);

        textBg.moveToBottom();
        textNode.moveToTop();
      }

      this.instance.getUtilityLayer()?.add(this.tempPointerFeedbackNode);
    }

    this.clickPoint = null;
    this.setState(WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION);
  }

  private async handleAdding(position?: Vector2d) {
    const stage = this.instance.getStage();

    this.tempPointerFeedbackNode?.destroy();
    this.tempPointerFeedbackNode = null;
    this.instance.getUtilityLayer()?.batchDraw();

    stage.container().style.cursor = 'default';

    const { mousePoint, container } = this.instance.getMousePointer(position);

    this.clickPoint = mousePoint;
    this.container = container as Konva.Layer | Konva.Group;

    const originPoint = {
      x: this.clickPoint?.x ?? 0,
      y: this.clickPoint?.y ?? 0,
    };

    if (!this.images && !this.imagesURLs) {
      return;
    }

    const imageToolActionHandler =
      this.instance.getActionHandler<WeaveImageToolAction>(
        WEAVE_IMAGE_TOOL_ACTION_NAME
      );

    if (!imageToolActionHandler) {
      return;
    }

    const imagesPadding = this.config.style.images.padding;
    const layoutColumns = this.config.layout.columns;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uploadImagesPromises: any[] = [];
    let imagePositionX = originPoint.x;
    let imagePositionY = originPoint.y;
    let maxHeight = 0;

    if (this.uploadType === WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE && this.images) {
      for (let i = 0; i < this.images.length; i++) {
        const file = this.images[i];
        const downscaleRatio = this.imagesDownscaleRatio[i];
        const resourceId = this.imagesIds[i];

        const result = this.instance.triggerAction<
          WeaveImageToolActionTriggerParams,
          WeaveImageToolActionTriggerReturn
        >(
          WEAVE_IMAGE_TOOL_ACTION_NAME,
          {
            type: 'file',
            imageFile: file,
            imageDownscaleRatio: downscaleRatio,
            imageId: resourceId,
            position: {
              x: imagePositionX,
              y: imagePositionY,
            },
            forceMainContainer: this.forceMainContainer,
          },
          true
        );

        this.nodesIds.push(result?.nodeId ?? '');

        maxHeight = Math.max(maxHeight, this.imagesSize[i].height);

        imagePositionX += imagesPadding + this.imagesSize[i].width;
        if ((i + 1) % layoutColumns === 0) {
          imagePositionX = originPoint.x;
          imagePositionY = imagePositionY + maxHeight + imagesPadding;
          maxHeight = 0;
        }

        const uploadImageFunction = async () => {
          const data = await this.uploadImageFunction.mutateAsync(file);
          const room = data.image.roomId;
          const imageId = data.image.imageId;

          result?.finishUploadCallback?.(
            result?.nodeId ?? '',
            `${process.env.NEXT_PUBLIC_API_ENDPOINT}/weavejs/rooms/${room}/images/${imageId}`
          );
        };

        uploadImagesPromises.push(uploadImageFunction);

        while (
          imageToolActionHandler.getActualState() !==
          WEAVE_IMAGES_TOOL_STATE.IDLE
        ) {
          await sleep(10);
        }
      }

      const uploadImages = async () => {
        this.onStartUploading();
        await Promise.allSettled(uploadImagesPromises.map((fn) => fn()));
        this.onFinishedUploading();
      };

      uploadImages();
    }

    if (
      this.uploadType === WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL &&
      this.imagesURLs
    ) {
      for (let i = 0; i < this.imagesURLs.length; i++) {
        const imageURL = this.imagesURLs[i];
        const imageFallback = this.imagesFallback[i];
        const imageSize = this.imagesSize[i];
        const resourceId = this.imagesIds[i];

        const result = this.instance.triggerAction<
          WeaveImageToolActionTriggerParams,
          WeaveImageToolActionTriggerReturn
        >(
          WEAVE_IMAGE_TOOL_ACTION_NAME,
          {
            type: 'imageURL',
            imageURL: imageURL,
            imageFallback: imageFallback,
            imageWidth: imageSize.width,
            imageHeight: imageSize.height,
            imageId: resourceId,
            position: {
              x: imagePositionX,
              y: imagePositionY,
            },
            forceMainContainer: this.forceMainContainer,
          },
          true
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) as any;

        this.nodesIds.push(result?.nodeId ?? '');

        maxHeight = Math.max(maxHeight, this.imagesSize[i].height);

        imagePositionX += imagesPadding + this.imagesSize[i].width;
        if ((i + 1) % layoutColumns === 0) {
          imagePositionX = originPoint.x;
          imagePositionY = imagePositionY + maxHeight + imagesPadding;
          maxHeight = 0;
        }

        while (
          imageToolActionHandler.getActualState() !==
          WEAVE_IMAGES_TOOL_STATE.IDLE
        ) {
          await sleep(10);
        }
      }
    }

    this.setState(WEAVE_IMAGES_TOOL_STATE.FINISHED);

    this.cancelAction();
  }

  trigger(
    cancelAction: () => void,
    params: WeaveImagesToolActionTriggerParams
  ): void {
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

    if (params?.position) {
      this.setState(WEAVE_IMAGES_TOOL_STATE.SELECTED_POSITION);
    }

    this.forceMainContainer = params.forceMainContainer ?? false;

    if (params.type === WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE) {
      this.uploadType = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE;
      this.onStartUploading = params.onStartUploading;
      this.onFinishedUploading = params.onFinishedUploading;
      this.uploadImageFunction = params.uploadImageFunction;
      this.nodesIds = [];
      this.images = params.images;
      this.imagesDownscaleRatio = params.imagesDownscaleRatio;
    }

    if (params.type === WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL) {
      this.uploadType = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL;
      this.nodesIds = [];
      this.imagesURLs = params.imagesURLs;
      this.imagesFallback = params.imagesFallback;
    }

    if (
      ![
        WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE,
        WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL,
      ].includes(params.type)
    ) {
      this.cancelAction();
      return;
    }

    this.imagesIds = params.imagesIds;
    this.imagesSize = params.imagesSize;

    this.addImages(params?.position);
  }

  saveImageUrl(nodeId: string, imageURL: string) {
    if (this.state !== WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION) {
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
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    this.tempPointerFeedbackNode?.destroy();
    this.tempPointerFeedbackNode = null;
    this.instance.getUtilityLayer()?.batchDraw();

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const addedNodes = [];

      for (const nodeId of this.nodesIds) {
        const node = stage.findOne(`#${nodeId}`);
        if (node) {
          addedNodes.push(node);
        }
      }

      selectionPlugin.setSelectedNodes(addedNodes);
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    this.instance.endDrag(WEAVE_IMAGES_TOOL_ACTION_NAME);

    stage.container().style.cursor = 'default';

    this.uploadType = null;
    this.forceMainContainer = false;
    this.initialCursor = null;
    this.container = undefined;
    this.clickPoint = null;
    this.setState(WEAVE_IMAGES_TOOL_STATE.IDLE);
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

  getImageSizeFromFile(file: File): Promise<{ width: number; height: number }> {
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

  private loadImageSource(image: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageSource = Konva.Util.createImageElement();
        imageSource.crossOrigin = 'anonymous';
        imageSource.onerror = (error) => {
          reject(error);
        };
        imageSource.onload = async () => {
          resolve(imageSource);
        };

        imageSource.src = reader.result as string;
      };
      reader.onerror = () => {
        reject(new Error('Failed to read image file'));
      };
      reader.readAsDataURL(image);
    });
  }

  private isTouchDevice() {
    return window.matchMedia('(pointer: coarse)').matches;
  }

  setDragAndDropProperties(properties: WeaveImagesToolDragAndDropProperties) {
    this.instance.startDrag(WEAVE_IMAGES_TOOL_ACTION_NAME);
    this.instance.setDragProperties<WeaveImagesToolDragAndDropProperties>(
      properties
    );
  }
}
