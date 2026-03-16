// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import { WeaveAction } from '@/actions/action';
import {
  type WeaveImageToolActionTriggerParams,
  type WeaveImageToolActionState,
  type WeaveImageToolActionOnAddedEvent,
  type WeaveImageToolActionOnAddingEvent,
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
import type { WeaveElementInstance } from '@inditextech/weave-types';
import { downscaleImageFile, getImageSizeFromFile } from '@/utils/image';

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
  protected imageFile: WeaveImageFile | null = null;
  protected imageURL: WeaveImageURL | null = null;
  protected clickPoint: Konva.Vector2d | null;
  protected forceMainContainer: boolean = false;
  protected cancelAction!: () => void;
  private uploadImageFunction!: WeaveImageToolActionUploadFunction;
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
        this.handleAdding();
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveImageToolActionState) {
    this.state = state;
  }

  private async loadImage(
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

    if (!this.imageId) {
      this.cancelAction();
      return;
    }

    const imageNodeHandler = this.getImageNodeHandler();

    if (!imageNodeHandler) {
      return;
    }

    const actualImageId = this.imageId;

    if (params.type === WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE) {
      const image = params.image;

      const realImageSize = await getImageSizeFromFile(image.file);
      const downscaledImage = await downscaleImageFile(
        image.file,
        image.downscaleRatio
      );

      const reader = new FileReader();
      reader.onloadend = () => {
        imageNodeHandler.preloadFallbackImage(
          actualImageId,
          reader.result as string,
          {
            onLoad: () => {
              this.props = {
                ...this.props,
                imageFallback: reader.result as string,
                imageURL: undefined,
                width: realImageSize.width,
                height: realImageSize.height,
              };

              this.addImageNode(params?.position);
            },
            onError: () => {
              this.cancelAction();
            },
          }
        );
      };
      reader.onerror = () => {};
      reader.readAsDataURL(downscaledImage);
    }
    if (params.type === WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL) {
      const image = params.image;

      setTimeout(() => {
        this.saveImageUrl(actualImageId, image.url);
      }, 0);

      this.addImageNode(params?.position);
    }
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

    const imageNodeHandler = this.getImageNodeHandler();

    if (!imageNodeHandler) {
      this.cancelAction();
      return;
    }

    if (this.imageId) {
      const mousePos = stage.getRelativePointerPosition();

      this.tempImageId = uuidv4();

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
    const imageNodeHandler = this.getImageNodeHandler();

    if (!imageNodeHandler) {
      this.cancelAction();
      return;
    }

    if (this.imageId) {
      let imageSource = imageNodeHandler.getImageSource(this.imageId);
      if (this.uploadType === WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE) {
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

      let realImageURL: string | undefined = undefined;
      if (
        this.uploadType === WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL &&
        this.imageURL
      ) {
        realImageURL = this.imageURL?.url;
      }

      if (nodeHandler) {
        const node = nodeHandler.create(this.imageId, {
          ...this.props,
          x: this.clickPoint?.x ?? 0,
          y: this.clickPoint?.y ?? 0,
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

        console.log('add image', node);

        this.instance.addNode(
          node,
          this.forceMainContainer
            ? this.instance.getMainLayer()?.getAttrs().id
            : this.container?.getAttrs().id
        );

        this.instance.emitEvent<WeaveImageToolActionOnAddedEvent>(
          'onAddedImage',
          { nodeId: this.imageId }
        );

        if (this.uploadType === WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE) {
          const uploadImageFunctionInternal = async () => {
            const nodeId = this.imageId ?? '';
            try {
              const imageURL = await this.uploadImageFunction(
                this.imageFile!.file
              );

              this.saveImageUrl(nodeId, imageURL);

              this.instance.emitEvent<WeaveImageToolActionOnImageUploadedEvent>(
                'onImageUploaded',
                { imageURL: imageURL, nodeId }
              );
            } catch (error) {
              this.instance.emitEvent<WeaveImageToolActionOnImageUploadedErrorEvent>(
                'onImageUploadedError',
                { error }
              );
            }
          };

          uploadImageFunctionInternal();
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
    this.forceMainContainer = params?.forceMainContainer ?? false;

    this.imageFile = null;
    this.imageURL = null;
    this.imageId = uuidv4();

    console.log('add image', { id: this.imageId });

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

    if (params.type === WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE && params.image) {
      this.uploadType = WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE;
      this.imageFile = params.image;
      this.uploadImageFunction = params.uploadImageFunction;
      this.loadImage({
        type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE,
        image: params.image,
        position: params?.position,
      });
    }

    if (
      params.type === WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL &&
      params.image
    ) {
      this.uploadType = WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL;
      this.imageURL = params.image;
      this.updateProps({
        imageFallback: params.image.fallback,
        width: params.image.width,
        height: params.image.height,
      });
      this.loadImage({
        type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL,
        image: params.image,
        position: params?.position,
      });
    }

    return {
      nodeId: this.imageId,
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
