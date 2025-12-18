// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import { WeaveAction } from '@/actions/action';
import {
  type WeaveConnectorToolActionParams,
  type WeaveConnectorToolActionProperties,
  type WeaveConnectorToolActionState,
} from './types';
import {
  CONNECTOR_TOOL_ACTION_NAME,
  CONNECTOR_TOOL_DEFAULT_CONFIG,
  CONNECTOR_TOOL_STATE,
} from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveConnectorNode } from '@/nodes/connector/connector';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';
import { WEAVE_CONNECTOR_NODE_LINE_TYPE } from '@/nodes/connector/constants';
import { mergeExceptArrays } from '@/utils';

export class WeaveConnectorToolAction extends WeaveAction {
  protected readonly config!: WeaveConnectorToolActionProperties;
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected tempLineNode: Konva.Line | null;
  protected state: WeaveConnectorToolActionState;
  protected container: Konva.Layer | Konva.Node | undefined;
  protected measureContainer: Konva.Layer | Konva.Group | undefined;
  protected clickPoint: Konva.Vector2d | null;
  protected pointers: Map<number, Konva.Vector2d>;
  protected startPoint: Konva.Vector2d | undefined;
  protected startNodeId: string | undefined;
  protected startNodeAnchor: string | undefined;
  protected startNode: Konva.Node | undefined;
  protected endPoint: Konva.Vector2d | undefined;
  protected endNodeId: string | undefined;
  protected endNodeAnchor: string | undefined;
  protected endNode: Konva.Node | undefined;
  protected tempPoint: Konva.Circle | undefined;
  protected tempNextPoint: Konva.Circle | undefined;
  protected connectorId: string | undefined;
  protected cancelAction!: () => void;
  onPropsChange = undefined;
  onInit = undefined;

  constructor(params?: WeaveConnectorToolActionParams) {
    super();

    this.config = mergeExceptArrays(
      CONNECTOR_TOOL_DEFAULT_CONFIG,
      params?.config
    );

    this.pointers = new Map<number, Konva.Vector2d>();
    this.initialized = false;
    this.tempLineNode = null;
    this.startPoint = undefined;
    this.startNodeId = undefined;
    this.startNodeAnchor = undefined;
    this.startNode = undefined;
    this.endPoint = undefined;
    this.endNodeId = undefined;
    this.endNodeAnchor = undefined;
    this.endNode = undefined;
    this.state = CONNECTOR_TOOL_STATE.IDLE;
    this.connectorId = undefined;
    this.container = undefined;
    this.measureContainer = undefined;
    this.clickPoint = null;
    this.tempPoint = undefined;
    this.tempNextPoint = undefined;
    this.props = this.initProps();
  }

  getName(): string {
    return CONNECTOR_TOOL_ACTION_NAME;
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

    window.addEventListener('keydown', (e) => {
      if (
        e.code === 'Enter' &&
        this.instance.getActiveAction() === CONNECTOR_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
        return;
      }
      if (
        e.code === 'Escape' &&
        this.instance.getActiveAction() === CONNECTOR_TOOL_ACTION_NAME
      ) {
        this.cancelAction();
      }
    });

    let nodeHovered: Konva.Node | undefined = undefined;

    stage.on('pointermove', () => {
      if (
        !(
          this.state === CONNECTOR_TOOL_STATE.SELECTING_INITIAL ||
          this.state === CONNECTOR_TOOL_STATE.SELECTING_FINAL
        )
      ) {
        return;
      }

      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      this.getNodesSelectionPlugin()?.disable();
      const shape = stage.getIntersection(pointerPos);
      this.getNodesSelectionPlugin()?.enable();

      let targetNode: Konva.Node | undefined = undefined;

      if (shape) {
        targetNode = this.instance.getInstanceRecursive(shape);
        if (
          !nodeHovered ||
          (nodeHovered &&
            targetNode &&
            !['connector'].includes(targetNode.getAttrs().nodeType) &&
            targetNode !== nodeHovered)
        ) {
          this.hideAllConnectorAnchors();
          this.showConnectorAnchors(targetNode);
          nodeHovered = targetNode;
        }
      }

      if (!targetNode) {
        this.hideAllConnectorAnchors();
        nodeHovered = undefined;
      }
    });

    stage.on('pointermove', () => {
      if (this.state === CONNECTOR_TOOL_STATE.IDLE) {
        return;
      }

      if (
        this.state === CONNECTOR_TOOL_STATE.SELECTING_FINAL &&
        this.tempLineNode
      ) {
        const stageMousePoint = this.instance
          .getStage()
          .getRelativePointerPosition();

        this.tempLineNode.setAttrs({
          points: [
            this.tempLineNode.points()[0],
            this.tempLineNode.points()[1],
            stageMousePoint!.x - this.tempLineNode.x(),
            stageMousePoint!.y - this.tempLineNode.y(),
          ],
        });
      }

      this.setCursor();
    });

    stage.on('pointerclick', () => {
      if (
        !(
          this.state === CONNECTOR_TOOL_STATE.SELECTING_INITIAL ||
          this.state === CONNECTOR_TOOL_STATE.SELECTING_FINAL
        )
      ) {
        return;
      }

      if (this.state === CONNECTOR_TOOL_STATE.SELECTING_INITIAL) {
        const { mousePoint } = this.instance.getMousePointer();
        const stageMousePoint = this.instance
          .getStage()
          .getRelativePointerPosition();

        const radius = this.config.style.anchor.radius;

        this.tempLineNode = new Konva.Line({
          strokeScaleEnabled: true,
          x: stageMousePoint!.x,
          y: stageMousePoint!.y,
          points: [0, 0],
          stroke: this.config.style.line.stroke,
          strokeWidth: this.config.style.line.strokeWidth,
          dash: this.config.style.line.dash,
        });
        this.instance.getSelectionLayer()?.add(this.tempLineNode);

        const circle = new Konva.Circle({
          x: mousePoint.x,
          y: mousePoint.y,
          radius: radius / this.instance.getStage().scaleX(),
          strokeScaleEnabled: false,
          stroke: this.config.style.anchor.stroke,
          strokeWidth: this.config.style.anchor.strokeWidth,
          fill: this.config.style.anchor.fill,
          name: 'connector-anchor-selected',
          draggable: false,
          listening: true,
        });

        this.instance.getSelectionLayer()?.add(circle);
        circle.moveToTop();
        this.tempLineNode.moveToTop();
        this.hideAllConnectorAnchors();
        this.startNode = circle;

        this.startPoint = mousePoint;
        this.setState(CONNECTOR_TOOL_STATE.SELECTING_FINAL);
        return;
      }

      if (this.state === CONNECTOR_TOOL_STATE.SELECTING_FINAL) {
        // const { mousePoint, container, measureContainer } =
        const { mousePoint } = this.instance.getMousePointer();

        const radius = this.config.style.anchor.radius;

        const circle = new Konva.Circle({
          x: mousePoint.x,
          y: mousePoint.y,
          radius: (radius * 1.5) / this.instance.getStage().scaleX(),
          strokeScaleEnabled: false,
          stroke: this.config.style.anchor.stroke,
          strokeWidth: this.config.style.anchor.strokeWidth,
          fill: this.config.style.anchor.selectedFill,
          name: 'connector-anchor-selected',
          draggable: false,
          listening: true,
        });

        this.instance.getSelectionLayer()?.add(circle);
        circle.moveToTop();
        this.hideAllConnectorAnchors();
        this.endNode = circle;

        this.endPoint = mousePoint;
        this.setState(CONNECTOR_TOOL_STATE.ADDED);
        this.saveConnector();
      }
    });

    stage.on('pointerup', (e) => {
      this.pointers.delete(e.evt.pointerId);
    });

    this.initialized = true;
  }

  private setState(state: WeaveConnectorToolActionState) {
    this.state = state;
  }

  private addConnector() {
    this.setCursor();
    this.setFocusStage();

    this.instance.emitEvent<undefined>('onAddingConnector');

    this.startPoint = undefined;
    this.startNodeId = undefined;
    this.startNodeAnchor = undefined;
    this.startNode = undefined;
    this.endPoint = undefined;
    this.endNodeId = undefined;
    this.endNodeAnchor = undefined;
    this.endNode = undefined;

    this.tempPoint = undefined;
    this.tempNextPoint = undefined;
    this.clickPoint = null;
    this.setState(CONNECTOR_TOOL_STATE.SELECTING_INITIAL);
  }

  private saveConnector() {
    const stage = this.instance.getStage();

    if (!this.startPoint && !(this.startNodeId && this.startNodeAnchor)) {
      return;
    }

    if (!this.endPoint && !(this.endNodeId && this.endNodeAnchor)) {
      return;
    }

    const startNode = stage.findOne(`#${this.startNodeId}`);
    const endNode = stage.findOne(`#${this.endNodeId}`);

    if (
      startNode?.getParent()?.getAttrs().id !==
      endNode?.getParent()?.getAttrs().id
    ) {
      this.cancelAction();
      return;
    }

    const nodeHandler =
      this.instance.getNodeHandler<WeaveConnectorNode>('connector');

    if (!nodeHandler) {
      return;
    }

    this.connectorId = uuidv4();

    const node = nodeHandler.create(this.connectorId, {
      ...this.props,
      lineType: WEAVE_CONNECTOR_NODE_LINE_TYPE.STRAIGHT,
      curvedControlPoint: undefined,
      startPoint: this.startPoint,
      startNodeId: this.startNodeId,
      startNodeAnchor: this.startNodeAnchor,
      endPoint: this.endPoint,
      endNodeId: this.endNodeId,
      endNodeAnchor: this.endNodeAnchor,
      hitStrokeWidth: 16,
    });
    this.instance.addNode(node, this.container?.getAttrs().id);

    this.instance.emitEvent<undefined>('onAddedConnector');

    this.cancelAction();
  }

  trigger(cancelAction: () => void): void {
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

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      selectionPlugin.setSelectedNodes([]);
    }

    this.props = this.initProps();
    this.addConnector();
  }

  cleanup(): void {
    const stage = this.instance.getStage();

    this.hideAllConnectorAnchors();

    if (this.startNode) {
      this.startNode.destroy();
    }

    if (this.endNode) {
      this.endNode.destroy();
    }

    this.tempLineNode?.destroy();

    const selectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
    if (selectionPlugin) {
      const node = stage.findOne(`#${this.connectorId}`);
      if (node) {
        selectionPlugin.setSelectedNodes([node]);
      }
      this.instance.triggerAction(SELECTION_TOOL_ACTION_NAME);
    }

    stage.container().style.cursor = 'default';

    this.initialCursor = null;
    this.startPoint = undefined;
    this.startNodeId = undefined;
    this.startNodeAnchor = undefined;
    this.startNode = undefined;
    this.endPoint = undefined;
    this.endNodeId = undefined;
    this.endNodeAnchor = undefined;
    this.endNode = undefined;
    this.tempPoint = undefined;
    this.tempNextPoint = undefined;
    this.container = undefined;
    this.measureContainer = undefined;
    this.clickPoint = null;
    this.setState(CONNECTOR_TOOL_STATE.IDLE);
  }

  private setCursor() {
    const stage = this.instance.getStage();
    stage.container().style.cursor = 'move';
  }

  private setFocusStage() {
    const stage = this.instance.getStage();
    stage.container().tabIndex = 1;
    stage.container().blur();
    stage.container().focus();
  }

  private getNodesSelectionPlugin(): WeaveNodesSelectionPlugin | undefined {
    return this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
  }

  protected showConnectorAnchors(node: Konva.Node): void {
    const stage = this.instance.getStage();
    const anchors = node.getNodeAnchors();

    for (const anchor of anchors) {
      const radius = this.config.style.anchor.radius;

      let parent: Konva.Container | null | undefined = node.getParent();
      if (parent?.getAttrs().nodeId) {
        parent = stage.findOne(`#${parent.getAttrs().nodeId}`) as
          | Konva.Container
          | undefined;
      }

      const circle = new Konva.Circle({
        x:
          node.x() -
          (node.getAbsolutePosition().x - anchor.point.x) / stage.scaleX(),
        y:
          node.y() -
          (node.getAbsolutePosition().y - anchor.point.y) / stage.scaleY(),
        anchorPosition: anchor.name,
        radius: radius / this.instance.getStage().scaleX(),
        strokeScaleEnabled: false,
        stroke: this.config.style.anchor.stroke,
        strokeWidth: this.config.style.anchor.strokeWidth,
        fill: this.config.style.anchor.fill,
        name: `connector-anchor`,
        draggable: false,
        listening: true,
      });

      this.instance.addEventListener('onZoomChange', () => {
        circle!.setAttrs({
          radius: radius / this.instance.getStage().scaleX(),
        });
      });

      let prevCursor: string | undefined = undefined;

      circle.on('pointerclick', () => {
        if (this.state === CONNECTOR_TOOL_STATE.SELECTING_INITIAL) {
          const selectedAnchor = circle.clone();
          selectedAnchor.setAttrs({
            name: 'connector-anchor-selected',
            fill: this.config.style.anchor.fill,
          });
          this.instance.getSelectionLayer()?.add(selectedAnchor);
          selectedAnchor.moveToTop();
          this.hideAllConnectorAnchors();
          this.startNode = selectedAnchor;

          this.instance.addEventListener('onZoomChange', () => {
            selectedAnchor!.setAttrs({
              radius: radius / this.instance.getStage().scaleX(),
            });
          });

          const parent = node.getParent();
          if (parent?.getAttrs()?.nodeId) {
            const realParent = this.instance
              .getStage()
              .findOne(`#${parent.getAttrs().nodeId}`);
            if (realParent) {
              this.container = realParent;
            }
          }

          this.startNodeId = node.getAttrs().id;
          this.startNodeAnchor = circle.getAttrs().anchorPosition;

          this.tempLineNode = new Konva.Line({
            strokeScaleEnabled: true,
            x: selectedAnchor.x(),
            y: selectedAnchor.y(),
            points: [0, 0],
            dash: this.config.style.line.dash,
            stroke: this.config.style.line.stroke,
            strokeWidth: this.config.style.line.strokeWidth,
          });
          this.instance.getSelectionLayer()?.add(this.tempLineNode);

          this.setState(CONNECTOR_TOOL_STATE.SELECTING_FINAL);
          return;
        }
        if (this.state === CONNECTOR_TOOL_STATE.SELECTING_FINAL) {
          const selectedAnchor = circle.clone();
          selectedAnchor.setAttrs({
            name: 'connector-anchor-selected',
            fill: this.config.style.anchor.selectedFill,
          });
          this.instance.getSelectionLayer()?.add(selectedAnchor);
          selectedAnchor.moveToTop();
          this.hideAllConnectorAnchors();
          this.endNode = selectedAnchor;

          this.instance.addEventListener('onZoomChange', () => {
            selectedAnchor!.setAttrs({
              radius: radius / this.instance.getStage().scaleX(),
            });
          });

          this.endNodeId = node.getAttrs().id;
          this.endNodeAnchor = circle.getAttrs().anchorPosition;
          this.setState(CONNECTOR_TOOL_STATE.ADDED);
          this.saveConnector();
        }
      });

      circle.on('pointermove pointerover', (e) => {
        if (
          this.state === CONNECTOR_TOOL_STATE.SELECTING_FINAL &&
          this.tempLineNode
        ) {
          this.tempLineNode.setAttrs({
            points: [
              this.tempLineNode.points()[0],
              this.tempLineNode.points()[1],
              circle.position().x - this.tempLineNode.x(),
              circle.position().y - this.tempLineNode.y(),
            ],
          });
        }
        circle.setAttrs({
          fill: this.config.style.anchor.hoveredFill,
        });
        prevCursor = this.instance.getStage().container().style.cursor;
        this.instance.getStage().container().style.cursor = 'move';
        e.cancelBubble = true;
      });

      circle.on('pointerleave', () => {
        circle.setAttrs({
          fill: this.config.style.anchor.fill,
        });
        if (prevCursor) {
          this.instance.getStage().container().style.cursor = prevCursor;
        }
        prevCursor = undefined;
      });

      this.instance.getSelectionLayer()?.add(circle);
      circle.moveToTop();
    }
  }

  private hideAllConnectorAnchors(): void {
    const selectionLayer = this.instance.getSelectionLayer();
    if (selectionLayer) {
      const anchors = selectionLayer.find('.connector-anchor');
      anchors.forEach((anchor) => anchor.destroy());
    }
  }
}
