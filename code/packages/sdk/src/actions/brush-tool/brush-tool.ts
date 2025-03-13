import { v4 as uuidv4 } from 'uuid';
import { WeaveAction } from '@/actions/action';
import { Vector2d } from 'konva/lib/types';
import { WeaveBrushToolActionState, WeaveBrushToolCallbacks } from './types';
import { BRUSH_TOOL_STATE } from './constants';
import Konva from 'konva';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import { WeaveElementInstance } from '@/types';

export class WeaveBrushToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected state: WeaveBrushToolActionState;
  protected clickPoint: Vector2d | null;
  protected strokeId: string | null;
  protected container: Konva.Layer | Konva.Group | undefined;
  protected measureContainer: Konva.Layer | Konva.Group | undefined;
  protected cancelAction!: () => void;
  internalUpdate = undefined;
  init = undefined;

  constructor(callbacks: WeaveBrushToolCallbacks) {
    super(callbacks);

    this.initialized = false;
    this.state = BRUSH_TOOL_STATE.INACTIVE;
    this.strokeId = null;
    this.clickPoint = null;
    this.container = undefined;
    this.measureContainer = undefined;
    this.props = this.initProps();
  }

  getName(): string {
    return 'brushTool';
  }

  initProps() {
    return {
      stroke: '#000000ff',
      strokeWidth: 1,
      opacity: 1,
    };
  }

  private setupEvents() {
    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    stage.container().addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.cancelAction();
        return;
      }
    });

    stage.on('mousedown touchstart', (e) => {
      if (this.state !== BRUSH_TOOL_STATE.IDLE) {
        return;
      }

      this.handleStartStroke();

      e.evt.preventDefault();
      e.evt.stopPropagation();
    });

    stage.on('mousemove touchmove', (e) => {
      if (this.state !== BRUSH_TOOL_STATE.DEFINE_STROKE) {
        return;
      }

      this.handleMovement();

      e.evt.preventDefault();
      e.evt.stopPropagation();
    });

    stage.on('mouseup touchend', (e) => {
      if (this.state !== BRUSH_TOOL_STATE.DEFINE_STROKE) {
        return;
      }

      this.handleEndStroke();

      e.evt.preventDefault();
      e.evt.stopPropagation();
    });

    this.initialized = true;
  }

  private setState(state: WeaveBrushToolActionState) {
    this.state = state;
  }

  private handleStartStroke() {
    const { mousePoint, container, measureContainer } =
      this.instance.getMousePointer();

    this.clickPoint = mousePoint;
    this.container = container;
    this.measureContainer = measureContainer;

    this.strokeId = uuidv4();

    const nodeHandler = this.instance.getNodeHandler('line');

    const node = nodeHandler.createNode(this.strokeId, {
      ...this.props,
      x: this.clickPoint?.x ?? 0,
      y: this.clickPoint?.y ?? 0,
      points: [0, 0],
    });

    this.instance.addNode(node, this.container?.getAttrs().id);

    this.setState(BRUSH_TOOL_STATE.DEFINE_STROKE);
  }

  private handleEndStroke() {
    const stage = this.instance.getStage();

    const tempStroke = this.instance.getStage().findOne(`#${this.strokeId}`) as
      | Konva.Line
      | undefined;

    if (tempStroke) {
      const nodeHandler = this.instance.getNodeHandler('line');

      tempStroke.setAttrs({
        ...this.props,
        hitStrokeWidth: 10,
      });

      this.instance.updateNode(
        nodeHandler.toNode(tempStroke as WeaveElementInstance)
      );

      this.clickPoint = null;

      stage.container().tabIndex = 1;
      stage.container().focus();

      this.setState(BRUSH_TOOL_STATE.IDLE);
    }
  }

  private handleMovement() {
    if (this.state !== BRUSH_TOOL_STATE.DEFINE_STROKE) {
      return;
    }

    const tempStroke = this.instance.getStage().findOne(`#${this.strokeId}`) as
      | Konva.Line
      | undefined;

    if (this.measureContainer && tempStroke) {
      const { mousePoint } = this.instance.getMousePointerRelativeToContainer(
        this.measureContainer
      );

      tempStroke.points([
        ...tempStroke.points(),
        mousePoint.x - tempStroke.x(),
        mousePoint.y - tempStroke.y(),
      ]);

      const nodeHandler = this.instance.getNodeHandler('line');

      this.instance.updateNode(
        nodeHandler.toNode(tempStroke as WeaveElementInstance)
      );
    }
  }

  trigger(cancel: () => void) {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    if (!this.initialized) {
      this.setupEvents();
    }

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.hide();
    }

    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    this.cancelAction = cancel;

    this.props = this.initProps();
    this.setState(BRUSH_TOOL_STATE.IDLE);

    stage.container().style.cursor = 'crosshair';
  }

  cleanup() {
    const stage = this.instance.getStage();

    stage.container().style.cursor = 'default';

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.strokeId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction('selectionTool');
    }

    this.clickPoint = null;
    this.setState(BRUSH_TOOL_STATE.INACTIVE);
  }
}
