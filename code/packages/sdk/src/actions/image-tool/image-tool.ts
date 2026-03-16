// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import { WeaveAction } from '@/actions/action';
import {
  type WeaveImageToolActionTriggerParams,
  type WeaveImageToolActionState,
  type WeaveImageToolActionOnAddedEvent,
  type WeaveImageToolActionUploadType,
  type WeaveImageToolDragAndDropProperties,
  type WeaveImageToolActionParams,
  type WeaveImageToolActionConfig,
  type WeaveImageFile,
  type WeaveImageURL,
  type WeaveImageToolActionUploadFunction,
  type WeaveImageToolActionOnImageUploadedEvent,
  type WeaveImageToolActionTriggerReturn,
  type WeaveImageToolActionOnImageUploadedErrorEvent,
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
} from '@/utils/utils';
import type {
  WeaveElementAttributes,
  WeaveElementInstance,
} from '@inditextech/weave-types';
import { downscaleImageFile, getImageSizeFromFile } from '@/utils/image';

type ImageToolActionData = {
  props: WeaveElementAttributes;
  imageId: string | null;
  container: Konva.Layer | Konva.Node | undefined;
  imageFile: WeaveImageFile | null;
  imageURL: WeaveImageURL | null;
  forceMainContainer: boolean;
  clickPoint: Konva.Vector2d | null;
  uploadType: WeaveImageToolActionUploadType | null;
  uploadImageFunction: WeaveImageToolActionUploadFunction | null;
};

export class WeaveImageToolAction extends WeaveAction {
  protected readonly config: WeaveImageToolActionConfig;
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeaveImageToolActionState;
  protected imageId: string | null;
  protected pointers: Map<number, Konva.Vector2d>;
  protected imageAction: Record<string, ImageToolActionData> = {};
  protected cancelAction!: () => void;
  protected tempImageId: string | null;
  protected tempImageNode: Konva.Image | null;
  private ignoreKeyboardEvents: boolean = false;
  private ignorePointerEvents: boolean = false;
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
    this.imageId = null;
    this.state = WEAVE_IMAGE_TOOL_STATE.IDLE;
    this.tempImageId = null;
    this.tempImageNode = null;
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
    this.instance.addEventListener('onStageDrop', (e: DragEvent) => {
      const dragId = this.instance.getDragStartedId();
      const dragProperties =
        this.instance.getDragProperties<WeaveImageToolDragAndDropProperties>();

      if (dragProperties && dragId === WEAVE_IMAGE_TOOL_ACTION_NAME) {
        this.instance.getStage().setPointersPositions(e);

        const position: Konva.Vector2d | null | undefined =
          getPositionRelativeToContainerOnPosition(this.instance);

        if (!position) {
          return;
        }

        this.instance.triggerAction<
          WeaveImageToolActionTriggerParams,
          WeaveImageToolActionTriggerReturn
        >(WEAVE_IMAGE_TOOL_ACTION_NAME, {
          type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL,
          image: dragProperties.imageURL,
          ...(dragProperties.imageId
            ? { imageId: dragProperties.imageId }
            : {}),
          ...(dragProperties.forceMainContainer && {
            forceMainContainer: dragProperties.forceMainContainer,
          }),
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
        this.handleAdding(this.imageId ?? '');
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveImageToolActionState) {
    this.state = state;
  }

  private async loadImage(
    nodeId: string,
    params:
      | {
          type: typeof WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE;
          image: WeaveImageFile;
          position?: Konva.Vector2d;
        }
      | {
          type: typeof WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL;
          image: WeaveImageURL;
          position?: Konva.Vector2d;
        }
  ) {
    this.setCursor();
    this.setFocusStage();

    const imageNodeHandler = this.getImageNodeHandler();

    if (!imageNodeHandler) {
      return;
    }

    if (params.type === WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE) {
      const image = params.image;

      const realImageSize = await getImageSizeFromFile(image.file);
      const downscaledImage = await downscaleImageFile(
        image.file,
        image.downscaleRatio
      );

      try {
        const dataURL = await this.getDataURL(downscaledImage);

        this.imageAction[nodeId].props = {
          ...this.imageAction[nodeId].props,
          imageFallback: dataURL,
          imageURL: undefined,
          width: realImageSize.width,
          height: realImageSize.height,
        };

        this.addImageNode(nodeId, params?.position);
      } catch {
        this.cancelAction();
      }
    }
    if (params.type === WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL) {
      const image = params.image;

      setTimeout(() => {
        this.saveImageUrl(nodeId, image.url);
      }, 0);

      this.addImageNode(nodeId, params?.position);
    }
  }

  private isTouchDevice() {
    return window.matchMedia('(pointer: coarse)').matches;
  }

  private async addImageNode(nodeId: string, position?: Konva.Vector2d) {
    const stage = this.instance.getStage();

    this.setCursor();
    this.setFocusStage();

    if (position) {
      this.setState(WEAVE_IMAGE_TOOL_STATE.SELECTED_POSITION);
      this.handleAdding(nodeId, position);
      return;
    }

    const imageNodeHandler = this.getImageNodeHandler();

    if (!imageNodeHandler) {
      this.cancelAction();
      return;
    }

    if (this.imageAction[nodeId]) {
      const { uploadType } = this.imageAction[nodeId];

      const mousePos = stage.getRelativePointerPosition();

      this.tempImageId = uuidv4();

      let imageSource = imageNodeHandler.getImageSource(nodeId);
      if (uploadType === 'file') {
        imageSource = imageNodeHandler.getFallbackImageSource(nodeId);
        imageSource ??= await this.loadImageDataURL(
          this.imageAction[nodeId].props.imageFallback
        );
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

      this.instance.emitEvent<undefined>('onAddingImage');

      this.imageAction[nodeId].clickPoint = null;
    }

    this.setState(WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION);
  }

  private async handleAdding(nodeId: string, position?: Konva.Vector2d) {
    const imageNodeHandler = this.getImageNodeHandler();

    if (!imageNodeHandler) {
      this.cancelAction();
      return;
    }

    if (this.imageAction[nodeId]) {
      const { uploadType, imageURL, forceMainContainer } =
        this.imageAction[nodeId];

      let imageSource = imageNodeHandler.getImageSource(nodeId);
      if (uploadType === WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE) {
        imageSource = imageNodeHandler.getFallbackImageSource(nodeId);
        imageSource ??= await this.loadImageDataURL(
          this.imageAction[nodeId].props.imageFallback
        );
      }

      if (!imageSource && !position) {
        this.cancelAction();
        return;
      }

      const { mousePoint, container } = this.instance.getMousePointer(position);

      this.imageAction[nodeId].clickPoint = mousePoint;
      this.imageAction[nodeId].container = container;

      const nodeHandler = this.instance.getNodeHandler<WeaveImageNode>('image');

      const imageWidth = this.imageAction[nodeId].props.width
        ? this.imageAction[nodeId].props.width
        : imageSource?.width;
      const imageHeight = this.imageAction[nodeId].props.height
        ? this.imageAction[nodeId].props.height
        : imageSource?.height;

      let realImageURL: string | undefined = undefined;
      if (uploadType === WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL && imageURL) {
        realImageURL = imageURL?.url;
      }

      if (nodeHandler) {
        const node = nodeHandler.create(nodeId, {
          ...this.imageAction[nodeId].props,
          x: this.imageAction[nodeId].clickPoint.x,
          y: this.imageAction[nodeId].clickPoint.y,
          opacity: 1,
          adding: false,
          imageURL: realImageURL,
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
          forceMainContainer
            ? this.instance.getMainLayer()?.getAttrs().id
            : this.imageAction[nodeId].container?.getAttrs().id
        );

        this.instance.emitEvent<WeaveImageToolActionOnAddedEvent>(
          'onAddedImage',
          { nodeId }
        );

        if (uploadType === WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE) {
          const uploadImageFunctionInternal = async (
            imageActionData: ImageToolActionData
          ) => {
            const { uploadImageFunction, imageFile } = imageActionData;
            try {
              const imageURL = await uploadImageFunction?.(imageFile!.file);

              if (!imageURL) {
                return;
              }

              this.saveImageUrl(nodeId, imageURL);

              this.instance.emitEvent<WeaveImageToolActionOnImageUploadedEvent>(
                'onImageUploaded',
                { imageURL, nodeId }
              );
            } catch (error) {
              this.instance.emitEvent<WeaveImageToolActionOnImageUploadedErrorEvent>(
                'onImageUploadedError',
                { error }
              );
            }
          };

          uploadImageFunctionInternal(this.imageAction[nodeId]);
        }
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

    const nodeId = params?.nodeId ?? uuidv4();

    this.imageId = nodeId;

    this.imageAction[nodeId] = {
      props: this.initProps(),
      imageId: nodeId,
      clickPoint: null,
      container: undefined,
      imageFile: null,
      imageURL: null,
      forceMainContainer: params?.forceMainContainer ?? false,
      uploadType: null,
      uploadImageFunction: null,
    };

    if (params?.imageId) {
      this.imageAction[nodeId].imageId = params.imageId;
    }

    if (this.forceExecution) {
      this.ignorePointerEvents = true;
      this.ignoreKeyboardEvents = true;
    }

    if (params?.position) {
      this.setState(WEAVE_IMAGE_TOOL_STATE.SELECTED_POSITION);
    }

    if (params.type === WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE && params.image) {
      this.imageAction[nodeId].uploadType = WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE;
      this.imageAction[nodeId].imageFile = params.image;
      this.imageAction[nodeId].uploadImageFunction = params.uploadImageFunction;
      this.loadImage(nodeId, {
        type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE,
        image: params.image,
        position: params?.position,
      });
    }

    if (
      params.type === WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL &&
      params.image
    ) {
      this.imageAction[nodeId].uploadType =
        WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL;
      this.imageAction[nodeId].imageURL = params.image;
      this.imageAction[nodeId].props = {
        ...this.imageAction[nodeId].props,
        imageFallback: params.image.fallback,
        width: params.image.width,
        height: params.image.height,
      };
      this.loadImage(nodeId, {
        type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL,
        image: params.image,
        position: params?.position,
      });
    }

    return {
      nodeId,
    };
  }

  saveImageUrl(nodeId: string, imageURL: string) {
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
    this.tempImageNode = null;
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

  setDragAndDropProperties(properties: WeaveImageToolDragAndDropProperties) {
    this.instance.startDrag(WEAVE_IMAGE_TOOL_ACTION_NAME);
    this.instance.setDragProperties<WeaveImageToolDragAndDropProperties>(
      properties
    );
  }

  getActualState(): WeaveImageToolActionState {
    return this.state;
  }

  private loadImageDataURL(imageDataURL: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const imageEle = Konva.Util.createImageElement();
      imageEle.onerror = (error) => {
        reject(error);
      };

      imageEle.onload = async () => {
        resolve(imageEle);
      };

      imageEle.src = imageDataURL;
    });
  }

  getDataURL(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error('Failed to generate dataURL from file'));
      };
      reader.readAsDataURL(blob);
    });
  }
}
