import { v4 as uuidv4 } from 'uuid';
import { Vector2d } from 'konva/lib/types';
import {
  ColorTokenToolCallbacks,
  ColorTokenToolActionState,
  ColorTokenToolActionTriggerParams,
} from './types';
import { COLOR_TOKEN_TOOL_STATE } from './constants';
import { WeaveAction, WeaveNodesSelectionPlugin } from '@inditextech/weave-sdk';
import Konva from 'konva';

export class ColorTokenToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state: ColorTokenToolActionState;
  protected colorTokenId: string | null;
  protected container: Konva.Layer | Konva.Group | undefined;
  protected clickPoint: Vector2d | null;
  protected cancelAction!: () => void;
  internalUpdate = undefined;

  constructor(callbacks: ColorTokenToolCallbacks) {
    super(callbacks);

    this.initialized = false;
    this.state = COLOR_TOKEN_TOOL_STATE.IDLE;
    this.colorTokenId = null;
    this.container = undefined;
    this.clickPoint = null;
  }

  getName(): string {
    return 'colorTokenTool';
  }

  initProps() {
    return {
      colorToken: '#000000',
      width: 300,
      height: 300,
      opacity: 1,
    };
  }

  onInit() {
    this.instance.addEventListener('onStageDrop', () => {
      if (window.colorTokenDragColor) {
        this.instance.triggerAction('colorTokenTool', {
          color: window.colorTokenDragColor,
        });
        window.colorTokenDragColor = undefined;
      }
    });
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cancelAction();
        return;
      }
    });

    stage.on('click tap', (e) => {
      e.evt.preventDefault();

      if (this.state === COLOR_TOKEN_TOOL_STATE.IDLE) {
        return;
      }

      if (this.state === COLOR_TOKEN_TOOL_STATE.ADDING) {
        this.handleAdding();
        return;
      }
    });

    this.initialized = true;
  }

  private setState(state: ColorTokenToolActionState) {
    this.state = state;
  }

  private addColorToken() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'crosshair';
    stage.container().focus();

    this.colorTokenId = null;
    this.clickPoint = null;
    this.setState(COLOR_TOKEN_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const { mousePoint, container } = this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;

    this.colorTokenId = uuidv4();

    const nodeHandler = this.instance.getNodeHandler('color-token');

    const node = nodeHandler.createNode(this.colorTokenId, {
      ...this.props,
      x: this.clickPoint.x,
      y: this.clickPoint.y,
    });

    this.instance.addNode(node, this.container?.getAttrs().id);

    this.cancelAction?.();
  }

  trigger(
    cancelAction: () => void,
    params?: ColorTokenToolActionTriggerParams
  ) {
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

    this.props = this.initProps();

    if (params?.color) {
      this.props.colorToken = params.color;
    }

    this.addColorToken();
  }

  cleanup() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.colorTokenId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction('selectionTool');
    }

    this.colorTokenId = null;
    this.container = undefined;
    this.clickPoint = null;
    this.setState(COLOR_TOKEN_TOOL_STATE.IDLE);
  }
}
