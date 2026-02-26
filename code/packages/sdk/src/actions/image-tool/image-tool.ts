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
  type WeaveImageToolActionLoadFrom,
  type WeaveImageToolDragAndDropProperties,
} from './types';
import {
  IMAGE_TOOL_ACTION_NAME,
  IMAGE_TOOL_LOAD_FROM,
  IMAGE_TOOL_STATE,
} from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import Konva from 'konva';
import type { WeaveImageNode } from '@/nodes/image/image';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import { getPositionRelativeToContainerOnPosition } from '@/utils';
import type { WeaveElementInstance } from '@inditextech/weave-types';

export class WeaveImageToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeaveImageToolActionState;
  protected cursorPadding: number = 5;
  protected imageId: string | null;
  protected tempImageId: string | null;
  protected tempImageNode: Konva.Image | null;
  protected container: Konva.Layer | Konva.Node | undefined;
  protected pointers: Map<number, Konva.Vector2d>;
  protected imageURL: string | null;
  protected clickPoint: Konva.Vector2d | null;
  protected forceMainContainer: boolean = false;
  protected dragAndDropProperties: WeaveImageToolDragAndDropProperties | null =
    null;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  update = undefined;

  constructor() {
    super();

    this.pointers = new Map<number, Konva.Vector2d>();
    this.initialized = false;
    this.state = IMAGE_TOOL_STATE.IDLE;
    this.imageId = null;
    this.tempImageId = null;
    this.tempImageNode = null;
    this.container = undefined;
    this.imageURL = null;
    this.clickPoint = null;
  }

  getName(): string {
    return IMAGE_TOOL_ACTION_NAME;
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
      if (this.dragAndDropProperties?.imageURL) {
        this.instance.getStage().setPointersPositions(e);
        const position: Konva.Vector2d | null | undefined =
          getPositionRelativeToContainerOnPosition(this.instance);

        this.instance.triggerAction(IMAGE_TOOL_ACTION_NAME, {
          imageURL: this.dragAndDropProperties.imageURL,
          ...(this.dragAndDropProperties.imageId && {
            imageId: this.dragAndDropProperties.imageId,
          }),
          ...(this.dragAndDropProperties.imageWidth && {
            imageWidth: this.dragAndDropProperties.imageWidth,
          }),
          ...(this.dragAndDropProperties.imageHeight && {
            imageHeight: this.dragAndDropProperties.imageHeight,
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
        this.instance.getActiveAction() === IMAGE_TOOL_ACTION_NAME
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
        this.instance.getActiveAction() === IMAGE_TOOL_ACTION_NAME
      ) {
        this.state = IMAGE_TOOL_STATE.DEFINING_POSITION;
        return;
      }

      if (this.state === IMAGE_TOOL_STATE.DEFINING_POSITION) {
        this.state = IMAGE_TOOL_STATE.SELECTED_POSITION;
      }
    });

    stage.on('pointermove', (e) => {
      if (this.state === IMAGE_TOOL_STATE.IDLE) {
        return;
      }

      this.setCursor();

      if (
        this.pointers.size === 2 &&
        this.instance.getActiveAction() === IMAGE_TOOL_ACTION_NAME
      ) {
        this.state = IMAGE_TOOL_STATE.DEFINING_POSITION;
        return;
      }

      if (
        [
          IMAGE_TOOL_STATE.DEFINING_POSITION as string,
          IMAGE_TOOL_STATE.SELECTED_POSITION as string,
        ].includes(this.state) &&
        this.tempImageNode &&
        this.instance.getActiveAction() === IMAGE_TOOL_ACTION_NAME &&
        e.evt.pointerType === 'mouse'
      ) {
        const mousePos = stage.getRelativePointerPosition();

        this.tempImageNode.setAttrs({
          x: (mousePos?.x ?? 0) + this.cursorPadding,
          y: (mousePos?.y ?? 0) + this.cursorPadding,
        });
      }
    });

    stage.on('pointerup', (e) => {
      this.pointers.delete(e.evt.pointerId);

      if (this.state === IMAGE_TOOL_STATE.SELECTED_POSITION) {
        this.handleAdding();
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveImageToolActionState) {
    this.state = state;
  }

  private loadImage(
    imageData: string,
    kind: WeaveImageToolActionLoadFrom,
    position?: Konva.Vector2d
  ) {
    this.setCursor();
    this.setFocusStage();

    if (!this.imageId) {
      this.cancelAction();
      return;
    }

    this.imageURL =
      kind === IMAGE_TOOL_LOAD_FROM.DATAURL ? 'not-defined' : imageData;

    const imageNodeHandler = this.getImageNodeHandler();

    if (!imageNodeHandler) {
      this.cancelAction();
      return;
    }

    if (IMAGE_TOOL_LOAD_FROM.URL === kind) {
      this.props = {
        ...this.props,
        imageURL: this.imageURL,
        width: this.props.loadImageWidth,
        height: this.props.loadImageHeight,
      };

      this.addImageNode(position);
    }

    imageNodeHandler.preloadImage(this.imageId, imageData, {
      onLoad: () => {
        this.instance.emitEvent<WeaveImageToolActionOnEndLoadImageEvent>(
          'onImageLoadEnd',
          undefined
        );

        const imageSource = imageNodeHandler.getImageSource(this.imageId!);

        if (imageSource && this.imageId) {
          this.props = {
            ...this.props,
            imageURL: this.imageURL,
            width: imageSource.width,
            height: imageSource.height,
          };
        }

        this.addImageNode(position);
      },
      onError: () => {
        this.instance.emitEvent<WeaveImageToolActionOnEndLoadImageEvent>(
          'onImageLoadEnd',
          new Error('Error loading image')
        );

        this.cancelAction();
      },
    });

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
      this.setState(IMAGE_TOOL_STATE.SELECTED_POSITION);
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

      const imageSource = imageNodeHandler.getImageSource(this.imageId);

      if (!imageSource) {
        this.cancelAction();
        return;
      }

      const aspectRatio = imageSource.width / imageSource.height;

      if (!this.tempImageNode && this.tempImageId && !this.isTouchDevice()) {
        this.tempImageNode = new Konva.Image({
          id: this.tempImageId,
          x: (mousePos?.x ?? 0) + this.cursorPadding,
          y: (mousePos?.y ?? 0) + this.cursorPadding,
          width: 240 * aspectRatio * (1 / stage.scaleX()),
          height: 240 * (1 / stage.scaleY()),
          opacity: 1,
          adding: true,
          image: imageSource,
          stroke: '#000000ff',
          strokeWidth: 0,
          strokeScaleEnabled: true,
          listening: false,
        });

        this.instance.getMainLayer()?.add(this.tempImageNode);
      }

      this.instance.emitEvent<WeaveImageToolActionOnAddingEvent>(
        'onAddingImage',
        { imageURL: this.props.imageURL }
      );
    }

    this.clickPoint = null;
    this.setState(IMAGE_TOOL_STATE.DEFINING_POSITION);
  }

  private handleAdding(position?: Konva.Vector2d) {
    if (this.imageId) {
      const imageNodeHandler = this.getImageNodeHandler();

      if (!imageNodeHandler) {
        this.cancelAction();
        return;
      }

      const imageSource = imageNodeHandler.getImageSource(this.imageId);

      if (!imageSource && !position) {
        this.cancelAction();
        return;
      }

      const { mousePoint, container } = this.instance.getMousePointer(position);

      this.clickPoint = mousePoint;
      this.container = container;

      const nodeHandler = this.instance.getNodeHandler<WeaveImageNode>('image');

      const imageWidth = this.props.loadImageWidth
        ? this.props.loadImageWidth
        : imageSource?.width;
      const imageHeight = this.props.loadImageHeight
        ? this.props.loadImageHeight
        : imageSource?.height;

      if (nodeHandler) {
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
          imageWidth,
          imageHeight,
          imageInfo: {
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

      this.setState(IMAGE_TOOL_STATE.FINISHED);
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

    this.forceMainContainer = params?.forceMainContainer ?? false;

    this.imageId = uuidv4();

    this.props = this.initProps();

    if (params?.imageId) {
      this.updateProps({
        imageId: params.imageId,
      });
    }

    if (params?.imageId) {
      this.updateProps({
        loadImageWidth: params.imageWidth,
      });
    }

    if (params?.imageId) {
      this.updateProps({
        loadImageHeight: params.imageHeight,
      });
    }

    if (params.imageData) {
      this.loadImage(
        params.imageData,
        IMAGE_TOOL_LOAD_FROM.DATAURL,

        params?.position ?? undefined
      );
    }
    if (params.imageURL) {
      this.loadImage(
        params.imageURL,
        IMAGE_TOOL_LOAD_FROM.URL,
        params?.position ?? undefined
      );
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

    if (this.state !== IMAGE_TOOL_STATE.DEFINING_POSITION) {
      const stage = this.instance.getStage();

      const nodeHandler = this.instance.getNodeHandler<WeaveImageNode>('image');
      const node = stage.findOne(`#${nodeId}`);

      if (nodeHandler && node) {
        node.setAttr('imageURL', imageURL);
        this.instance.updateNode(
          nodeHandler.serialize(node as WeaveElementInstance)
        );
      }
    }
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    if (this.tempImageNode) {
      this.tempImageNode.destroy();
    }

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

    this.dragAndDropProperties = null;

    this.initialCursor = null;
    this.imageId = null;
    this.forceMainContainer = false;
    this.container = undefined;
    this.tempImageNode = null;
    this.imageURL = null;
    this.clickPoint = null;
    this.setState(IMAGE_TOOL_STATE.IDLE);
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
    this.dragAndDropProperties = properties;
  }
}
