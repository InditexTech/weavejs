import { WeaveSelection, NodeSerializable } from '@/types';
import Konva from 'konva';
import { WeavePlugin } from '@/plugins/plugin';
import { WEAVE_NODES_SELECTION_LAYER_ID } from './constants';
import { WeaveNodesSelectionPluginCallbacks } from './types';

export class WeaveNodesSelectionPlugin extends WeavePlugin {
  private tr!: Konva.Transformer;
  private selectionRectangle!: Konva.Rect;
  private active: boolean;
  private selecting: boolean;
  private initialized: boolean;
  private enabled: boolean;
  private callbacks: WeaveNodesSelectionPluginCallbacks;
  render: undefined;

  constructor(callbacks: WeaveNodesSelectionPluginCallbacks) {
    super();

    this.callbacks = callbacks;
    this.active = false;
    this.selecting = false;
    this.initialized = false;
    this.enabled = false;
  }

  registersLayers() {
    return true;
  }

  getName() {
    return 'nodesSelection';
  }

  getLayerName(): string {
    return WEAVE_NODES_SELECTION_LAYER_ID;
  }

  initLayer() {
    const stage = this.instance.getStage();

    const layer = new Konva.Layer({ id: this.getLayerName() });
    stage.add(layer);
  }

  init() {
    const stage = this.instance.getStage();
    const selectionLayer = this.getLayer();

    stage.container().tabIndex = 1;
    stage.container().focus();

    const selectionRectangle = new Konva.Rect({
      fill: 'rgba(0,0,255,0.25)',
      stroke: 'blue',
      visible: false,
      // disable events to not interrupt with events
      listening: false,
    });
    selectionLayer?.add(selectionRectangle);

    const tr = new Konva.Transformer({
      id: 'selectionTransformer',
      rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315, 360],
      rotationSnapTolerance: 3,
      ignoreStroke: true,
      flipEnabled: false,
      useSingleNodeRotation: true,
      shouldOverdrawWholeArea: true,
    });
    selectionLayer?.add(tr);

    tr.on('mouseenter', (e) => {
      const stage = this.instance.getStage();
      stage.container().style.cursor = 'grab';
      e.cancelBubble = true;
    });

    tr.on('mouseleave', (e) => {
      const stage = this.instance.getStage();
      stage.container().style.cursor = 'default';
      e.cancelBubble = true;
    });

    this.tr = tr;
    this.selectionRectangle = selectionRectangle;

    this.tr.on('dblclick', (evt) => {
      evt.cancelBubble = true;

      if (this.tr.getNodes().length === 1) {
        const node = this.tr.getNodes()[0];
        node.fire('dblclick');
      }
    });

    this.initEvents();

    this.initialized = true;

    this.instance.on('onRender', () => {
      this.triggerSelectedNodesEvent();
    });

    this.instance.on(
      'onActiveActionChange',
      (activeAction: string | undefined) => {
        if (
          typeof activeAction !== 'undefined' &&
          activeAction !== 'selectionTool'
        ) {
          this.active = false;
          return;
        }

        this.active = true;
      }
    );

    this.instance.on('onNodeRemoved', (node: NodeSerializable) => {
      const selectedNodes = this.getSelectedNodes();
      const newSelectedNodes = selectedNodes.filter((actNode) => {
        return actNode.getAttrs().id !== node.id;
      });

      this.tr.nodes(newSelectedNodes);
      this.triggerSelectedNodesEvent();

      stage.container().tabIndex = 1;
      stage.container().focus();
      stage.container().style.cursor = 'default';
    });
  }

  private getLayer() {
    const stage = this.instance.getStage();
    return stage.findOne(`#${this.getLayerName()}`) as Konva.Layer | undefined;
  }

  private triggerSelectedNodesEvent() {
    const selectedNodes: WeaveSelection[] = this.tr.getNodes().map((node) => {
      const nodeType = node.getAttr('nodeType');
      const nodeHandler = this.instance.getNodeHandler(nodeType);
      return {
        instance: node as Konva.Shape | Konva.Group,
        node: nodeHandler.toNode(node as Konva.Shape | Konva.Group),
      };
    });

    this.callbacks?.onNodesChange?.(selectedNodes);
    this.instance.emitEvent('onNodesChange', selectedNodes);
  }

  private initEvents() {
    let x1: number, y1: number, x2: number, y2: number;
    this.selecting = false;

    const stage = this.instance.getStage();

    stage.container().addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        const selectedNodes = this.getSelectedNodes();
        const mappedSelectedNodes = selectedNodes.map((node) => {
          const handler = this.instance.getNodeHandler(
            node.getAttrs().nodeType
          );
          return handler.toNode(node);
        });
        this.instance.removeNodes(mappedSelectedNodes);
        this.tr.nodes([]);
        this.triggerSelectedNodesEvent();
        return;
      }
    });

    stage.on('mousedown touchstart', (e) => {
      if (!this.initialized) {
        return;
      }

      if (!this.active) {
        return;
      }

      if (e.evt.button !== 0) {
        return;
      }

      if (!(e.target instanceof Konva.Stage)) {
        return;
      }

      e.evt.preventDefault();

      const intStage = this.instance.getStage();

      x1 = intStage.getRelativePointerPosition()?.x ?? 0;
      y1 = intStage.getRelativePointerPosition()?.y ?? 0;
      x2 = intStage.getRelativePointerPosition()?.x ?? 0;
      y2 = intStage.getRelativePointerPosition()?.y ?? 0;

      this.selectionRectangle.width(0);
      this.selectionRectangle.height(0);
      this.selecting = true;
    });

    stage.on('mousemove touchmove', (e) => {
      if (!this.initialized) {
        return;
      }

      if (!this.active) {
        return;
      }

      // do nothing if we didn't start selection
      if (!this.selecting) {
        return;
      }

      e.evt.preventDefault();

      const intStage = this.instance.getStage();

      x2 = intStage.getRelativePointerPosition()?.x ?? 0;
      y2 = intStage.getRelativePointerPosition()?.y ?? 0;

      this.selectionRectangle.setAttrs({
        visible: true,
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
      });
    });

    stage.on('mouseup touchend', (e) => {
      if (!this.initialized) {
        return;
      }

      if (!this.active) {
        return;
      }

      this.selecting = false;

      if (!this.selectionRectangle.visible()) {
        return;
      }

      e.evt.preventDefault();

      this.tr.nodes([]);

      this.selectionRectangle.visible(false);
      const shapes = stage.find((node: Konva.Node) => {
        return (
          ['Shape', 'Group'].includes(node.getType()) &&
          typeof node.getAttrs().id !== 'undefined'
        );
      });
      const box = this.selectionRectangle.getClientRect();
      const selected = shapes.filter((shape) =>
        Konva.Util.haveIntersection(box, shape.getClientRect())
      );

      const selectedNodes = new Set<Konva.Node>();
      for (const node of selected) {
        selectedNodes.add(
          this.instance.getInstanceRecursive(node as Konva.Node)
        );
      }

      this.tr.nodes([...selectedNodes]);
      this.triggerSelectedNodesEvent();

      stage.container().tabIndex = 1;
      stage.container().focus();
    });

    stage.on('click tap', (e) => {
      if (!this.enabled) {
        return;
      }

      let selectedGroup: Konva.Node | undefined = undefined;
      const mousePos = stage.getPointerPosition();

      if (mousePos) {
        const inter = stage.getIntersection(mousePos);
        if (inter) {
          selectedGroup = this.instance.getInstanceRecursive(inter);
        }
      }

      if (!this.initialized) {
        return;
      }

      if (e.evt.button !== 0) {
        return;
      }

      // if we are selecting with rect, do nothing
      if (this.selectionRectangle.visible()) {
        return;
      }

      // if click on empty area - remove all selections
      if (e.target instanceof Konva.Stage && !selectedGroup) {
        this.tr.nodes([]);
        this.triggerSelectedNodesEvent();
        return;
      }

      // do we pressed shift or ctrl?
      const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
      const isSelected = this.tr.nodes().indexOf(e.target) >= 0;
      let areNodesSelected = false;

      const nodeToAdd =
        selectedGroup && !(selectedGroup.getAttrs().active ?? false)
          ? selectedGroup
          : e.target;

      if (!nodeToAdd.getAttrs().nodeType) {
        return;
      }

      if (!metaPressed && !isSelected) {
        // if no key pressed and the node is not selected
        // select just one
        this.tr.nodes([nodeToAdd]);
        this.tr.show();
        areNodesSelected = true;
      } else if (metaPressed && isSelected) {
        // if we pressed keys and node was selected
        // we need to remove it from selection:
        const nodes = this.tr.nodes().slice(); // use slice to have new copy of array
        // remove node from array
        nodes.splice(nodes.indexOf(nodeToAdd), 1);
        this.tr.nodes(nodes);
        areNodesSelected = true;
      } else if (metaPressed && !isSelected) {
        // add the node into selection
        const nodes = this.tr.nodes().concat([nodeToAdd]);
        this.tr.nodes(nodes);
        areNodesSelected = true;
      }

      if (areNodesSelected) {
        stage.container().tabIndex = 1;
        stage.container().focus();
        stage.container().style.cursor = 'grab';
      }

      this.triggerSelectedNodesEvent();
    });
  }

  getTransformer() {
    return this.tr;
  }

  setSelectedNodes(nodes: Konva.Node[]) {
    this.tr.setNodes(nodes);
    this.triggerSelectedNodesEvent();
  }

  getSelectedNodes() {
    return this.tr.getNodes() as (Konva.Group | Konva.Shape)[];
  }

  removeSelectedNodes() {
    const selectedNodes = this.tr.getNodes();
    for (const node of selectedNodes) {
      node.destroy();
    }
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    if (!enabled) {
      this.tr.nodes([]);
      this.triggerSelectedNodesEvent();
    }
    this.enabled = enabled;
  }
}
