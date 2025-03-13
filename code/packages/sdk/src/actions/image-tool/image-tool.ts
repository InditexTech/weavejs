import { v4 as uuidv4 } from 'uuid';
import { WeaveAction } from '@/actions/action';
import { Vector2d } from 'konva/lib/types';
import {
  WeaveImageToolActionTriggerParams,
  WeaveImageToolActionCallbacks,
  WeaveImageToolActionState,
} from './types';
import { IMAGE_TOOL_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import Konva from 'konva';
import { WeaveElementInstance } from '@/types';

export class WeaveImageToolAction extends WeaveAction {
  private imageCallbacks: WeaveImageToolActionCallbacks;
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
  update = undefined;

  constructor(imageCallbacks: WeaveImageToolActionCallbacks) {
    const { onPropsChange, ...restCallbacks } = imageCallbacks;
    super({ onPropsChange });

    this.imageCallbacks = restCallbacks;
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
    return 'imageTool';
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

  init() {
    this.instance.addEventListener('onStageDrop', () => {
      if (window.weaveDragImageURL) {
        this.instance.triggerAction('imageTool', {
          imageURL: window.weaveDragImageURL,
        });
      }
    });
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cancelAction();
      }
      e.preventDefault();
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

    stage.on('mousemove', (e) => {
      e.evt.preventDefault();

      const tempImage = this.instance
        .getStage()
        .findOne(`#${this.tempImageId}`);

      if (this.state === IMAGE_TOOL_STATE.ADDING && tempImage) {
        const mousePos = stage.getRelativePointerPosition();
        tempImage.setAttrs({
          ...this.props,
          name: undefined,
          x: mousePos?.x ?? 0,
          y: mousePos?.y ?? 0,
          fill: '#ccccccff',
          stroke: '#000000ff',
          strokeWidth: 1,
        });

        const nodeHandler = this.instance.getNodeHandler('rectangle');
        this.instance.updateNode(
          nodeHandler.toNode(tempImage as WeaveElementInstance)
        );
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveImageToolActionState) {
    this.state = state;
  }

  private loadImage(imageURL: string) {
    this.imageId = uuidv4();
    this.imageURL = imageURL;

    this.preloadImgs[this.imageId] = new Image();
    this.preloadImgs[this.imageId].onload = () => {
      this.imageCallbacks?.onImageLoadEnd?.();

      if (this.imageId) {
        this.props = {
          ...this.props,
          width: this.preloadImgs[this.imageId].width,
          height: this.preloadImgs[this.imageId].height,
        };
      }
      this.addImageNode();
    };
    this.preloadImgs[this.imageId].onerror = () => {
      this.imageCallbacks?.onImageLoadEnd?.(new Error('Error loading image'));
      this.cancelAction();
    };

    this.preloadImgs[this.imageId].src = imageURL;
    this.imageCallbacks?.onImageLoadStart?.();
  }

  private addImageNode() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'crosshair';
    stage.container().focus();

    if (this.imageId) {
      const mousePos = stage.getRelativePointerPosition();

      const nodeHandler = this.instance.getNodeHandler('rectangle');

      this.tempImageId = uuidv4();

      const node = nodeHandler.createNode(this.tempImageId, {
        ...this.props,
        x: mousePos?.x ?? 0,
        y: mousePos?.y ?? 0,
        width: this.preloadImgs[this.imageId].width,
        height: this.preloadImgs[this.imageId].height,
        fill: '#ccccccff',
        stroke: '#000000ff',
        strokeWidth: 1,
      });

      this.instance.addNode(node, this.container?.getAttrs().id);
    }

    this.clickPoint = null;
    this.setState(IMAGE_TOOL_STATE.ADDING);
  }

  private addImage() {
    this.imageCallbacks?.onUploadImage(this.loadImage.bind(this));

    this.setState(IMAGE_TOOL_STATE.UPLOADING);
  }

  private handleAdding() {
    const tempImage = this.instance.getStage().findOne(`#${this.tempImageId}`);

    if (
      this.imageId &&
      this.imageURL &&
      this.preloadImgs[this.imageId] &&
      tempImage
    ) {
      const { mousePoint, container } = this.instance.getMousePointer();

      this.clickPoint = mousePoint;
      this.container = container;

      const nodeHandler = this.instance.getNodeHandler('image');

      const node = nodeHandler.createNode(this.imageId, {
        ...this.props,
        x: this.clickPoint?.x ?? 0,
        y: this.clickPoint?.y ?? 0,
        opacity: 1,
        imageURL: this.imageURL,
        stroke: '#000000ff',
        strokeWidth: 0,
        imageInfo: {
          width: this.preloadImgs[this.imageId].width,
          height: this.preloadImgs[this.imageId].height,
        },
      });

      this.instance.addNode(node, this.container?.getAttrs().id);

      const rectangleNodeHandler = this.instance.getNodeHandler('rectangle');
      this.instance.removeNode(
        rectangleNodeHandler.toNode(tempImage as WeaveElementInstance)
      );

      this.setState(IMAGE_TOOL_STATE.FINISHED);
    }

    this.cancelAction();
  }

  trigger(
    cancelAction: () => void,
    params?: WeaveImageToolActionTriggerParams
  ) {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    if (!this.initialized) {
      this.setupEvents();
    }

    this.cancelAction = cancelAction;

    if (params?.imageURL) {
      this.loadImage(params.imageURL);
      return;
    }

    this.props = this.initProps();
    this.addImage();
  }

  internalUpdate() {
    const stage = this.instance?.getStage();
    if (stage) {
      const tempImage = this.instance
        .getStage()
        .findOne(`#${this.tempImageId}`);

      if (tempImage) {
        tempImage.setAttrs({
          ...this.props,
          name: undefined,
          fill: '#ccccccff',
          stroke: '#000000ff',
          strokeWidth: 1,
        });

        const nodeHandler = this.instance.getNodeHandler('rectangle');

        this.instance.updateNode(
          nodeHandler.toNode(tempImage as WeaveElementInstance)
        );
      }
    }
  }

  cleanup() {
    const stage = this.instance.getStage();

    const tempImage = this.instance.getStage().findOne(`#${this.tempImageId}`);
    if (tempImage) {
      const nodeHandler = this.instance.getNodeHandler('rectangle');
      this.instance.removeNode(
        nodeHandler.toNode(tempImage as WeaveElementInstance)
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
