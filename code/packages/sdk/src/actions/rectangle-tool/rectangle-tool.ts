import { v4 as uuidv4 } from 'uuid';
import { WeaveAction } from '@/actions/action';
import { Vector2d } from 'konva/lib/types';
import { WeaveRectangleToolActionState } from './types';
import { RECTANGLE_TOOL_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import Konva from 'konva';
import { WeaveElementInstance } from '@/types';

export class WeaveRectangleToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state: WeaveRectangleToolActionState;
  protected rectId: string | null;
  protected creating: boolean;
  protected moved: boolean;
  protected clickPoint: Vector2d | null;
  protected container!: Konva.Group | Konva.Layer | undefined;
  protected cancelAction!: () => void;
  init = undefined;

  constructor() {
    super();

    this.initialized = false;
    this.state = RECTANGLE_TOOL_STATE.IDLE;
    this.rectId = null;
    this.creating = false;
    this.moved = false;
    this.container = undefined;
    this.clickPoint = null;
  }

  getName(): string {
    return 'rectangleTool';
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.cancelAction();
        return;
      }
      if (e.key === 'Escape') {
        this.cancelAction();
        return;
      }
    });

    stage.on('mousedown', (e) => {
      e.evt.preventDefault();

      if (this.state === RECTANGLE_TOOL_STATE.ADDING) {
        this.creating = true;

        this.handleAdding();
      }
    });

    stage.on('mousemove', (e) => {
      e.evt.preventDefault();

      if (this.state === RECTANGLE_TOOL_STATE.DEFINING_SIZE) {
        this.moved = true;

        this.handleMovement();
      }
    });

    stage.on('mouseup', (e) => {
      e.evt.preventDefault();

      if (this.state === RECTANGLE_TOOL_STATE.DEFINING_SIZE) {
        this.creating = false;

        this.handleSettingSize();
      }
    });

    this.initialized = true;
  }

  private setState(state: WeaveRectangleToolActionState) {
    this.state = state;
  }

  private addRectangle() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'crosshair';
    stage.container().focus();

    this.clickPoint = null;
    this.setState(RECTANGLE_TOOL_STATE.ADDING);
  }

  private handleAdding() {
    const { mousePoint, container } = this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;

    this.rectId = uuidv4();

    const nodeHandler = this.instance.getNodeHandler('rectangle');

    const node = nodeHandler.createNode(this.rectId, {
      x: this.clickPoint?.x ?? 0,
      y: this.clickPoint?.y ?? 0,
      width: 0,
      height: 0,
      opacity: 1,
      fill: '#71717aFF',
      stroke: '#000000FF',
      strokeWidth: 1,
      draggable: true,
    });

    this.instance.addNode(node, this.container?.getAttrs().id);

    this.setState(RECTANGLE_TOOL_STATE.DEFINING_SIZE);
  }

  private handleSettingSize() {
    const rectangle = this.instance.getStage().findOne(`#${this.rectId}`);

    if (this.rectId && this.clickPoint && this.container && rectangle) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.container
      );

      const deltaX = mousePoint.x - this.clickPoint?.x;
      const deltaY = mousePoint.y - this.clickPoint?.y;

      const nodeHandler = this.instance.getNodeHandler('rectangle');

      rectangle.setAttrs({
        x: this.moved ? rectangle.getAttrs().x : this.clickPoint.x,
        y: this.moved ? rectangle.getAttrs().y : this.clickPoint.y,
        width: this.moved ? Math.abs(deltaX) : 100,
        height: this.moved ? Math.abs(deltaY) : 100,
      });

      this.instance.updateNode(
        nodeHandler.toNode(rectangle as WeaveElementInstance)
      );
    }

    this.addRectangle();
  }

  private handleMovement() {
    if (this.state !== RECTANGLE_TOOL_STATE.DEFINING_SIZE) {
      return;
    }

    const rectangle = this.instance.getStage().findOne(`#${this.rectId}`);

    if (this.rectId && this.container && this.clickPoint && rectangle) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.container
      );

      const deltaX = mousePoint.x - this.clickPoint?.x;
      const deltaY = mousePoint.y - this.clickPoint?.y;

      const nodeHandler = this.instance.getNodeHandler('rectangle');

      rectangle.setAttrs({
        width: deltaX,
        height: deltaY,
      });

      this.instance.updateNode(
        nodeHandler.toNode(rectangle as WeaveElementInstance)
      );
    }
  }

  trigger(cancelAction: () => void) {
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

    this.addRectangle();
  }

  cleanup() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.rectId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction('selectionTool');
    }

    this.rectId = null;
    this.creating = false;
    this.moved = false;
    this.container = undefined;
    this.clickPoint = null;
    this.setState(RECTANGLE_TOOL_STATE.IDLE);
  }
}
