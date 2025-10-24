// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid';
import Konva from 'konva';
import { WeaveAction } from '@/actions/action';
import {
  type WeaveConnectorToolActionOnAddedEvent,
  type WeaveConnectorToolActionOnAddingEvent,
  type WeaveConnectorToolActionState,
} from './types';
import { CONNECTOR_TOOL_ACTION_NAME, CONNECTOR_TOOL_STATE } from './constants';
import { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type { WeaveConnectorNode } from '@/nodes/connector/connector';
import { SELECTION_TOOL_ACTION_NAME } from '../selection-tool/constants';

export class WeaveConnectorToolAction extends WeaveAction {
  protected initialized: boolean = false;
  protected initialCursor: string | null = null;
  protected state: WeaveConnectorToolActionState;
  protected container: Konva.Layer | Konva.Node | undefined;
  protected measureContainer: Konva.Layer | Konva.Group | undefined;
  protected clickPoint: Konva.Vector2d | null;
  protected pointers: Map<number, Konva.Vector2d>;
  protected nodeSelected: string | undefined;
  protected initialNodeId: string | undefined;
  protected initialNodeAnchor: string | undefined;
  protected initialAnchorNode: Konva.Node | undefined;
  protected finalNodeId: string | undefined;
  protected finalNodeAnchor: string | undefined;
  protected finalAnchorNode: Konva.Node | undefined;
  protected tempPoint: Konva.Circle | undefined;
  protected tempNextPoint: Konva.Circle | undefined;
  protected connectorId: string | undefined;
  protected cancelAction!: () => void;
  protected overHandle: boolean;
  onPropsChange = undefined;
  onInit = undefined;

  constructor() {
    super();

    this.pointers = new Map<number, Konva.Vector2d>();
    this.initialized = false;
    this.initialNodeId = undefined;
    this.initialNodeAnchor = undefined;
    this.finalNodeId = undefined;
    this.finalNodeAnchor = undefined;
    this.initialAnchorNode = undefined;
    this.finalAnchorNode = undefined;
    this.overHandle = false;
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
        return;
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

      if (shape) {
        const targetNode = this.instance.getInstanceRecursive(shape);
        if (nodeHovered && targetNode !== nodeHovered) {
          this.hideAllConnectorAnchors();
        }
        this.showConnectorAnchors(targetNode);
        nodeHovered = targetNode;
      } else {
        this.hideAllConnectorAnchors();
        nodeHovered = undefined;
      }
    });

    stage.on('pointermove', () => {
      if (this.state === CONNECTOR_TOOL_STATE.IDLE) {
        return;
      }

      this.setCursor();
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

    this.instance.emitEvent<WeaveConnectorToolActionOnAddingEvent>(
      'onAddingConnector'
    );

    this.initialNodeId = undefined;
    this.initialNodeAnchor = undefined;
    this.finalNodeId = undefined;
    this.finalNodeAnchor = undefined;
    this.initialAnchorNode = undefined;
    this.finalAnchorNode = undefined;

    this.tempPoint = undefined;
    this.tempNextPoint = undefined;
    this.clickPoint = null;
    this.setState(CONNECTOR_TOOL_STATE.SELECTING_INITIAL);
  }

  private saveConnector() {
    if (
      !this.initialNodeId ||
      !this.initialNodeAnchor ||
      !this.finalNodeId ||
      !this.finalNodeAnchor
    ) {
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
      initialNodeId: this.initialNodeId,
      initialNodeAnchor: this.initialNodeAnchor,
      finalNodeId: this.finalNodeId,
      finalNodeAnchor: this.finalNodeAnchor,
      hitStrokeWidth: 16,
    });
    this.instance.addNode(node, this.container?.getAttrs().id);

    this.instance.emitEvent<WeaveConnectorToolActionOnAddedEvent>(
      'onAddedConnector'
    );

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

    if (this.initialAnchorNode) {
      this.initialAnchorNode.destroy();
    }

    if (this.finalAnchorNode) {
      this.finalAnchorNode.destroy();
    }

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
    this.initialNodeId = undefined;
    this.initialNodeAnchor = undefined;
    this.finalNodeId = undefined;
    this.finalNodeAnchor = undefined;
    this.initialAnchorNode = undefined;
    this.finalAnchorNode = undefined;
    this.tempPoint = undefined;
    this.tempNextPoint = undefined;
    this.container = undefined;
    this.measureContainer = undefined;
    this.clickPoint = null;
    this.setState(CONNECTOR_TOOL_STATE.IDLE);
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

  private getNodesSelectionPlugin(): WeaveNodesSelectionPlugin | undefined {
    return this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');
  }

  protected showConnectorAnchors(node: Konva.Node): void {
    if (this.nodeSelected === node.getAttrs().id) {
      return;
    }

    const clone = node.clone();

    this.nodeSelected = node.getAttrs().id;

    const localBox = clone.getClientRect({
      skipTransform: true,
      skipStroke: true,
    });

    const transform = clone.getAbsoluteTransform();

    // Compute the four absolute corners of the box
    const corners = [
      { x: localBox.x, y: localBox.y },
      { x: localBox.x + localBox.width, y: localBox.y },
      { x: localBox.x + localBox.width, y: localBox.y + localBox.height },
      { x: localBox.x, y: localBox.y + localBox.height },
    ].map((p) => transform.point(p));

    const anchors = [];

    const topMid = {
      x: (corners[0].x + corners[1].x) / 2,
      y: (corners[0].y + corners[1].y) / 2,
    };
    const rightMid = {
      x: (corners[1].x + corners[2].x) / 2,
      y: (corners[1].y + corners[2].y) / 2,
    };
    const bottomMid = {
      x: (corners[2].x + corners[3].x) / 2,
      y: (corners[2].y + corners[3].y) / 2,
    };
    const leftMid = {
      x: (corners[3].x + corners[0].x) / 2,
      y: (corners[3].y + corners[0].y) / 2,
    };

    anchors.push({ name: 'top', point: topMid });
    anchors.push({ name: 'right', point: rightMid });
    anchors.push({ name: 'bottom', point: bottomMid });
    anchors.push({ name: 'left', point: leftMid });

    for (const anchor of anchors) {
      const radius = 7;

      const circle = new Konva.Circle({
        x: anchor.point.x,
        y: anchor.point.y,
        anchorPosition: anchor.name,
        radius: radius / this.instance.getStage().scaleX(),
        strokeScaleEnabled: false,
        stroke: '#000000',
        strokeWidth: 1,
        fill: '#ffffff',
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
            fill: '#1a1aff',
            radius: (radius * 1.5) / this.instance.getStage().scaleX(),
          });
          this.instance.getSelectionLayer()?.add(selectedAnchor);
          selectedAnchor.moveToTop();
          this.hideAllConnectorAnchors();
          this.initialAnchorNode = selectedAnchor;

          this.instance.addEventListener('onZoomChange', () => {
            selectedAnchor!.setAttrs({
              radius: (radius * 1.5) / this.instance.getStage().scaleX(),
            });
          });

          const parent = node.getParent();
          if (parent && parent.getAttrs().nodeId) {
            const realParent = this.instance
              .getStage()
              .findOne(`#${parent.getAttrs().nodeId}`);
            if (realParent) {
              this.container = realParent;
            }
          }

          this.initialNodeId = node.getAttrs().id;
          this.initialNodeAnchor = circle.getAttrs().anchorPosition;
          this.setState(CONNECTOR_TOOL_STATE.SELECTING_FINAL);
          return;
        }
        if (this.state === CONNECTOR_TOOL_STATE.SELECTING_FINAL) {
          const selectedAnchor = circle.clone();
          selectedAnchor.setAttrs({
            name: 'connector-anchor-selected',
            fill: '#1a1aff',
            radius: (radius * 1.5) / this.instance.getStage().scaleX(),
          });
          this.instance.getSelectionLayer()?.add(selectedAnchor);
          selectedAnchor.moveToTop();
          this.hideAllConnectorAnchors();
          this.finalAnchorNode = selectedAnchor;

          this.instance.addEventListener('onZoomChange', () => {
            selectedAnchor!.setAttrs({
              radius: (radius * 1.5) / this.instance.getStage().scaleX(),
            });
          });

          this.finalNodeId = node.getAttrs().id;
          this.finalNodeAnchor = circle.getAttrs().anchorPosition;
          this.setState(CONNECTOR_TOOL_STATE.ADDED);
          this.saveConnector();
        }
      });

      circle.on('pointermove pointerover', (e) => {
        this.overHandle = true;
        circle.setAttrs({
          fill: '#ff2c2cff',
        });
        prevCursor = this.instance.getStage().container().style.cursor;
        this.instance.getStage().container().style.cursor = 'crosshair';
        e.cancelBubble = true;
      });

      circle.on('pointerleave', () => {
        this.overHandle = false;
        circle.setAttrs({
          fill: '#ffffffff',
        });
        if (prevCursor) {
          this.instance.getStage().container().style.cursor = prevCursor;
        }
        prevCursor = undefined;
      });

      this.instance.getSelectionLayer()?.add(circle);
      circle.moveToTop();
    }

    clone.destroy();
  }

  private hideAllConnectorAnchors(): void {
    this.nodeSelected = undefined;

    const selectionLayer = this.instance.getSelectionLayer();
    if (selectionLayer) {
      const anchors = selectionLayer.find('.connector-anchor');
      anchors.forEach((anchor) => anchor.destroy());
    }
  }
}
