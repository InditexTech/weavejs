// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import { WEAVE_CONNECTOR_NODE_TYPE } from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type {
  WeaveConnectorInfo,
  WeaveConnectorNodeParams,
  WeaveConnectorProperties,
} from './types';

export class WeaveConnectorNode extends WeaveNode {
  private config: WeaveConnectorProperties;
  protected nodeType: string = WEAVE_CONNECTOR_NODE_TYPE;

  constructor(params?: WeaveConnectorNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: {
        ...config?.transform,
      },
    };
  }

  loadAsyncElement(nodeId: string) {
    this.instance.loadAsyncElement(nodeId, 'connector');
  }

  resolveAsyncElement(nodeId: string) {
    this.instance.resolveAsyncElement(nodeId, 'connector');
  }

  getAnchorPosition(
    node: Konva.Node,
    anchorName: string
  ): Konva.Vector2d | undefined {
    const localBox = node.getClientRect({
      skipTransform: true,
      skipStroke: true,
    });

    const transform = node.getAbsoluteTransform();

    // Compute the four absolute corners of the box
    const corners = [
      { x: localBox.x, y: localBox.y },
      { x: localBox.x + localBox.width, y: localBox.y },
      { x: localBox.x + localBox.width, y: localBox.y + localBox.height },
      { x: localBox.x, y: localBox.y + localBox.height },
    ].map((p) => transform.point(p));

    if (anchorName === 'top') {
      return {
        x: (corners[0].x + corners[1].x) / 2,
        y: (corners[0].y + corners[1].y) / 2,
      };
    }
    if (anchorName === 'right') {
      return {
        x: (corners[1].x + corners[2].x) / 2,
        y: (corners[1].y + corners[2].y) / 2,
      };
    }
    if (anchorName === 'bottom') {
      return {
        x: (corners[2].x + corners[3].x) / 2,
        y: (corners[2].y + corners[3].y) / 2,
      };
    }
    if (anchorName === 'left') {
      return {
        x: (corners[3].x + corners[0].x) / 2,
        y: (corners[3].y + corners[0].y) / 2,
      };
    }

    return undefined;
  }

  private updateLinePosition(connector: Konva.Group) {
    const connectorAttrs = connector.getAttrs();

    const linePoints = [];

    if (connectorAttrs.startType === 'node') {
      const startNode = this.getConnectingNode(connectorAttrs.startNodeId);
      if (startNode) {
        const startClone = startNode.clone();
        const startAnchorPosition = this.getAnchorPosition(
          startClone,
          connectorAttrs.startNodeAnchor!
        );

        if (startAnchorPosition) {
          connector.setAttrs({
            x: startAnchorPosition.x,
            y: startAnchorPosition.y,
          });

          linePoints.push(startAnchorPosition.x);
          linePoints.push(startAnchorPosition.y);
        }

        startClone.destroy();
      }
    }
    if (connectorAttrs.startType === 'point') {
      connector.setAttrs({
        x: connectorAttrs.startPoint.x,
        y: connectorAttrs.startPoint.y,
      });

      linePoints.push(connectorAttrs.startPoint.x);
      linePoints.push(connectorAttrs.startPoint.y);
    }
    if (connectorAttrs.endType === 'node') {
      const endNode = this.getConnectingNode(connectorAttrs.endNodeId);
      if (endNode) {
        const endClone = endNode.clone();
        const endAnchorPosition = this.getAnchorPosition(
          endClone,
          connectorAttrs.endNodeAnchor!
        );

        if (endAnchorPosition) {
          linePoints.push(endAnchorPosition.x);
          linePoints.push(endAnchorPosition.y);
        }

        endClone.destroy();
      }
    }
    if (connectorAttrs.endType === 'point') {
      linePoints.push(connectorAttrs.endPoint.x);
      linePoints.push(connectorAttrs.endPoint.y);
    }

    const connectorLine = connector.findOne<Konva.Line>(
      `#${connector.getAttrs().id}-line`
    );
    connectorLine?.setAttrs({
      points: this.stageToGroupPoints(linePoints),
    });
  }

  private setupConnector(connector: Konva.Group) {
    const connectorAttrs = connector.getAttrs();

    if (connectorAttrs.startType === 'node') {
      const startNode = this.getConnectingNode(connectorAttrs.startNodeId);
      if (startNode) {
        startNode.on('dragmove dragend transform transformend', () => {
          this.updateLinePosition(connector);
        });
      }
    }
    if (connectorAttrs.endType === 'node') {
      const endNode = this.getConnectingNode(connectorAttrs.endNodeId);
      if (endNode) {
        endNode.on('dragmove dragend transform transformend', () => {
          this.updateLinePosition(connector);
        });
      }
    }

    this.updateLinePosition(connector);

    connector.setAttrs({
      initialized: true,
    });

    this.resolveAsyncElement(connector.getAttrs().id ?? '');
  }

  private getConnectingNode(nodeId: string): Konva.Node | undefined {
    return this.instance.getStage().findOne(`#${nodeId}`);
  }

  private stageToGroupPoints(points: number[]) {
    const firstPoint = { x: points[0], y: points[1] };
    const result = [];
    for (let i = 0; i < points.length; i += 2) {
      const pt = {
        x: points[i] - firstPoint.x,
        y: points[i + 1] - firstPoint.y,
      };
      result.push(pt.x, pt.y);
    }
    return result;
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    this.loadAsyncElement(props.id ?? '');

    const connector = new Konva.Group({
      ...props,
      name: 'node',
      startInfoLoaded: false,
      endInfoLoaded: false,
      initialized: false,
      draggable: false,
    });

    const stroke = 'black';
    const strokeWidth = 1;

    const connectorLine = new Konva.Line({
      id: `${props.id}-line`,
      nodeId: props.id,
      points: [],
      stroke,
      strokeWidth,
      hitStrokeWidth: strokeWidth + 4,
      strokeScaleEnabled: true,
      draggable: false,
    });

    connector.add(connectorLine);

    this.instance.addEventListener(
      'onNodeRenderedAdded',
      (node: Konva.Node) => {
        const connectorAttrs = connector.getAttrs();
        const nodeAttrs = node.getAttrs();

        if (
          nodeAttrs.id !== connectorAttrs.id &&
          nodeAttrs.nodeType !== 'connector' &&
          nodeAttrs.id === connectorAttrs.startNodeId &&
          !connectorAttrs.startInfoLoaded
        ) {
          connector.setAttrs({ startInfoLoaded: true });
        }

        if (
          nodeAttrs.id !== connectorAttrs.id &&
          nodeAttrs.nodeType !== 'connector' &&
          nodeAttrs.id === connectorAttrs.endNodeId &&
          !connectorAttrs.endInfoLoaded
        ) {
          connector.setAttrs({ endInfoLoaded: true });
        }

        let startInfo: WeaveConnectorInfo | undefined = undefined;
        let endInfo: WeaveConnectorInfo | undefined = undefined;

        if (
          connector.getAttrs().startInfoLoaded &&
          connector.getAttrs().startType === 'node'
        ) {
          const startNode = this.getConnectingNode(props.startNodeId);
          if (startNode) {
            startInfo = {
              type: 'node',
              node: startNode,
              anchor: props.startNodeAnchor!,
            };
          }
        }
        if (
          connector.getAttrs().startInfoLoaded &&
          connector.getAttrs().startType === 'point'
        ) {
          startInfo = {
            type: 'point',
            point: props.startPoint!,
          };
        }
        if (
          connector.getAttrs().endInfoLoaded &&
          connector.getAttrs().endType === 'node'
        ) {
          const endNode = this.getConnectingNode(props.endNodeId);
          if (endNode) {
            endInfo = {
              type: 'node',
              node: endNode,
              anchor: props.endNodeAnchor!,
            };
          }
        }
        if (
          connector.getAttrs().endInfoLoaded &&
          connector.getAttrs().endType === 'point'
        ) {
          endInfo = {
            type: 'point',
            point: props.endPoint!,
          };
        }

        if (startInfo && endInfo && !connector.getAttrs().initialized) {
          this.setupConnector(connector);
        }
      }
    );
    this.instance.addEventListener(
      'onNodeRenderedRemoved',
      (node: Konva.Node) => {
        console.log('node removed', node);
      }
    );

    if (props.startNodeId) {
      const startNode = this.getConnectingNode(props.startNodeId);

      let loaded = false;
      if (startNode) {
        loaded = true;
      }

      connector.setAttrs({
        startType: 'node',
        startInfoLoaded: loaded,
        initialized: false,
      });
    }
    if (props.startPoint) {
      connector.setAttrs({
        startType: 'point',
        startInfoLoaded: true,
      });
    }
    if (props.endNodeId) {
      const endNode = this.getConnectingNode(props.endNodeId);

      let loaded = false;
      if (endNode) {
        loaded = true;
      }

      connector.setAttrs({
        endType: 'node',
        endInfoLoaded: loaded,
        initialized: false,
      });
    }
    if (props.endPoint) {
      connector.setAttrs({
        endType: 'point',
        endInfoLoaded: true,
      });
    }

    if (props.startPoint && props.endPoint) {
      this.setupConnector(connector);
    }

    this.setupDefaultNodeAugmentation(connector);

    const defaultTransformerProperties = this.defaultGetTransformerProperties({
      ...this.config.transform,
      rotateEnabled: false,
      borderStroke: 'transparent',
    });

    connector.getTransformerProperties = function () {
      return defaultTransformerProperties;
    };

    this.setupDefaultNodeEvents(connector);

    connector.handleMouseover = function () {
      let hoverClone = connector.findOne<Konva.Line>('.hoverClone');

      if (hoverClone) {
        return;
      }

      hoverClone = connectorLine.clone() as Konva.Line;
      hoverClone
        .stroke('#1a1aff')
        .name('hoverClone')
        .id(`${connector.getAttrs().id}-hoverClone`);
      connector.add(hoverClone);
      hoverClone.moveToTop();

      const startNodeHandler =
        connector.findOne<Konva.Circle>('.startNodeHandler');
      if (startNodeHandler) {
        startNodeHandler.moveToTop();
      }

      const endNodeHandler = connector.findOne<Konva.Circle>('.endNodeHandler');
      if (endNodeHandler) {
        endNodeHandler.moveToTop();
      }
    };

    connector.handleMouseout = function () {
      const hoverClone = connector.findOne<Konva.Line>('.hoverClone');
      hoverClone?.destroy();
    };

    this.instance.addEventListener('onNodesChange', () => {
      const nodesSelection = this.getNodesSelectionPlugin();
      if (nodesSelection) {
        const selectedNodes = nodesSelection.getSelectedNodes();

        if (
          selectedNodes.length === 1 &&
          selectedNodes[0].getAttrs().id === connector.getAttrs().id
        ) {
          this.setupSelection(connector);
        } else {
          this.teardownSelection(connector);
        }
      }
    });

    connector.allowedAnchors = function () {
      return [];
    };

    return connector;
  }

  private setupSelection(connector: Konva.Group) {
    const connectorLine = connector.findOne<Konva.Line>(
      `#${connector.getAttrs().id}-line`
    );

    if (!connectorLine) {
      return;
    }

    let startNodeHandler = connector.findOne<Konva.Circle>('.startNodeHandler');
    let endNodeHandler = this.instance
      .getSelectionLayer()
      ?.findOne<Konva.Circle>('.endNodeHandler');
    let selectionClone = this.instance
      .getSelectionLayer()
      ?.findOne<Konva.Line>('.selectionClone');

    if (startNodeHandler || endNodeHandler || selectionClone) {
      return;
    }

    selectionClone = connectorLine.clone() as Konva.Line;
    selectionClone
      .stroke('#1a1aff')
      .name('selectionClone')
      .id(`${connector.getAttrs().id}-selectionClone`);
    connector.add(selectionClone);
    selectionClone.moveToTop();

    const radius = 7;

    let nodeHovered: Konva.Node | undefined = undefined;
    let nodeId: string | undefined = undefined;
    let anchorName: string | undefined = undefined;
    let anchorPosition: Konva.Vector2d | undefined = undefined;

    startNodeHandler = new Konva.Circle({
      id: `${connector.getAttrs().id}-startNodeHandler`,
      name: 'startNodeHandler disableEdgeSnapping disableDistanceSnapping',
      x: connectorLine.points()[0],
      y: connectorLine.points()[1],
      radius: radius / this.instance.getStage().scaleX(),
      strokeScaleEnabled: false,
      stroke: '#000000',
      strokeWidth: 1,
      fill: '#ffffff',
      draggable: true,
    });

    startNodeHandler.on('pointermove pointerover', () => {
      this.instance.getStage().container().style.cursor = 'crosshair';
      // e.cancelBubble = true;
    });

    startNodeHandler.on('dragstart', () => {
      connector.listening(false);

      const hoverClone = connector.findOne<Konva.Line>(`.hoverClone`);
      hoverClone?.destroy();

      this.teardownSelection(connector, true);
    });

    const SNAP_DISTANCE = 20;
    const SNAP_OUT_DISTANCE = 25;

    startNodeHandler.on('dragmove', (e) => {
      // check hovered node?
      const stage = this.instance.getStage();
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
            ['connector'].includes(targetNode.getAttrs().nodeType) &&
            targetNode !== nodeHovered)
        ) {
          this.hideAllConnectorAnchors();
          this.showConnectorAnchors(targetNode);
          nodeHovered = targetNode;
        }
      }

      if (nodeHovered && anchorPosition) {
        const dx = anchorPosition.x - e.target.getAbsolutePosition().x;
        const dy = anchorPosition.y - e.target.getAbsolutePosition().y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > SNAP_OUT_DISTANCE) {
          nodeId = undefined;
          anchorName = undefined;
          anchorPosition = undefined;
          nodeHovered = undefined;
        }
      }

      if (nodeHovered) {
        const node = e.target;
        const anchors = this.getNodeAnchors(nodeHovered);
        const { name, position } = this.snapToAnchors(
          node,
          anchors,
          SNAP_DISTANCE
        );
        if (name) {
          node.setAbsolutePosition({ x: position.x, y: position.y });
          nodeId = nodeHovered.getAttrs().id;
          anchorName = name;
          anchorPosition = position;
          connector.setAttrs({
            startType: 'node',
            startNodeId: nodeHovered.getAttrs().id,
            startNodeAnchor: name,
            startPoint: undefined,
          });
          this.updateLinePosition(connector);
          return;
        }
      }

      if (!targetNode && !anchorPosition) {
        this.hideAllConnectorAnchors();
        nodeHovered = undefined;
      }

      connector.setAttrs({
        startType: 'point',
        startNodeId: undefined,
        startNodeAnchor: undefined,
        startPoint: {
          x: e.target.x(),
          y: e.target.y(),
        },
      });
      this.updateLinePosition(connector);
    });

    startNodeHandler.on('dragend', () => {
      connector.listening(true);

      this.teardownSelection(connector);
      this.hideAllConnectorAnchors();

      if (nodeId && anchorName) {
        connector.setAttrs({
          startType: 'node',
          startNodeId: nodeId,
          startNodeAnchor: anchorName,
          startPoint: undefined,
        });
      } else {
        connector.setAttrs({
          startType: 'point',
          startNodeId: undefined,
          startNodeAnchor: undefined,
          startPoint: {
            x: startNodeHandler!.x(),
            y: startNodeHandler!.y(),
          },
        });
      }

      nodeId = undefined;
      anchorName = undefined;
      this.setupConnector(connector);
      this.setupSelection(connector);

      this.instance.updateNode(this.serialize(connector));
    });

    this.instance.addEventListener('onZoomChange', () => {
      startNodeHandler!.setAttrs({
        radius: radius / this.instance.getStage().scaleX(),
      });
    });

    this.instance.getSelectionLayer()?.add(startNodeHandler);
    startNodeHandler.position(connector.position());
    startNodeHandler.moveToTop();

    endNodeHandler = new Konva.Circle({
      id: `${connector.getAttrs().id}-endNodeHandler`,
      name: 'endNodeHandler disableEdgeSnapping disableDistanceSnapping',
      x: connectorLine.points()[connectorLine.points().length - 2],
      y: connectorLine.points()[connectorLine.points().length - 1],
      radius: radius / this.instance.getStage().scaleX(),
      strokeScaleEnabled: false,
      stroke: '#000000',
      strokeWidth: 1,
      fill: '#ffffff',
      draggable: true,
    });

    endNodeHandler.on('pointermove pointerover', () => {
      this.instance.getStage().container().style.cursor = 'crosshair';
      // e.cancelBubble = true;
    });

    endNodeHandler.on('dragstart', () => {
      connector.listening(false);

      const hoverClone = connector.findOne<Konva.Line>('.hoverClone');
      hoverClone?.destroy();

      this.teardownSelection(connector, true);
    });

    endNodeHandler.on('dragmove', (e) => {
      // check hovered node?
      const stage = this.instance.getStage();
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
            ['connector'].includes(targetNode.getAttrs().nodeType) &&
            targetNode !== nodeHovered)
        ) {
          this.hideAllConnectorAnchors();
          this.showConnectorAnchors(targetNode);
          nodeHovered = targetNode;
        }
      }

      if (nodeHovered && anchorPosition) {
        const dx = anchorPosition.x - e.target.getAbsolutePosition().x;
        const dy = anchorPosition.y - e.target.getAbsolutePosition().y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > SNAP_OUT_DISTANCE) {
          nodeId = undefined;
          anchorName = undefined;
          anchorPosition = undefined;
          nodeHovered = undefined;
        }
      }

      if (nodeHovered) {
        const node = e.target;
        const anchors = this.getNodeAnchors(nodeHovered);
        const { name, position } = this.snapToAnchors(
          node,
          anchors,
          SNAP_DISTANCE
        );
        if (name) {
          node.setAbsolutePosition({ x: position.x, y: position.y });
          nodeId = nodeHovered.getAttrs().id;
          anchorName = name;
          anchorPosition = position;
          connector.setAttrs({
            endType: 'node',
            endNodeId: nodeHovered.getAttrs().id,
            endNodeAnchor: name,
            endPoint: undefined,
          });
          this.updateLinePosition(connector);
          return;
        }
      }

      if (!targetNode && !anchorPosition) {
        this.hideAllConnectorAnchors();
        nodeHovered = undefined;
      }

      connector.setAttrs({
        endType: 'point',
        endNodeId: undefined,
        endNodeAnchor: undefined,
        endPoint: {
          x: e.target.x(),
          y: e.target.y(),
        },
      });
      this.updateLinePosition(connector);
    });

    endNodeHandler.on('dragend', () => {
      connector.listening(true);

      this.teardownSelection(connector);
      this.hideAllConnectorAnchors();

      if (nodeId && anchorName) {
        connector.setAttrs({
          endType: 'node',
          endNodeId: nodeId,
          endNodeAnchor: anchorName,
          endPoint: undefined,
        });
        this.setupConnector(connector);
      } else {
        connector.setAttrs({
          endType: 'point',
          endNodeId: undefined,
          endNodeAnchor: undefined,
          endPoint: {
            x: endNodeHandler!.x(),
            y: endNodeHandler!.y(),
          },
        });
      }

      nodeId = undefined;
      anchorName = undefined;
      this.setupConnector(connector);
      this.setupSelection(connector);

      this.instance.updateNode(this.serialize(connector));
    });

    this.instance.addEventListener('onZoomChange', () => {
      endNodeHandler!.setAttrs({
        radius: radius / this.instance.getStage().scaleX(),
      });
    });

    this.instance.getSelectionLayer()?.add(endNodeHandler);
    endNodeHandler.position({
      x:
        connector.position().x +
        connectorLine.points()[connectorLine.points().length - 2],
      y:
        connector.position().y +
        connectorLine.points()[connectorLine.points().length - 1],
    });
    endNodeHandler.moveToTop();
  }

  private teardownSelection(
    connector: Konva.Group,
    onlyConnector: boolean = false
  ) {
    if (!onlyConnector) {
      const startNodeHandler = this.instance
        .getSelectionLayer()
        ?.findOne<Konva.Circle>(`#${connector.id()}-startNodeHandler`);
      const endNodeHandler = this.instance
        .getSelectionLayer()
        ?.findOne<Konva.Circle>(`#${connector.id()}-endNodeHandler`);

      startNodeHandler?.destroy();
      endNodeHandler?.destroy();
    }

    const selectionClone = connector.findOne<Konva.Line>(
      `#${connector.id()}-selectionClone`
    );
    selectionClone?.destroy();
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });

    // Connector is paired to two nodes
    if (nextProps.initialNodeId && nextProps.finalNodeId) {
      const initialNode = this.getConnectingNode(nextProps.initialNodeId);
      const finalNode = this.getConnectingNode(nextProps.finalNodeId);

      if (
        initialNode &&
        finalNode &&
        nextProps.initialNodeAnchor &&
        nextProps.finalNodeAnchor
      ) {
        this.setupConnector(nodeInstance as Konva.Group);
      }
    }
    // Connector only paired on initial node
    if (nextProps.initialNodeId && nextProps.startPoint) {
      const initialNode = this.getConnectingNode(nextProps.initialNodeId);

      if (initialNode && nextProps.initialNodeAnchor) {
        this.setupConnector(nodeInstance as Konva.Group);
      }
    }
    // Connector only paired on final node
    if (nextProps.finalNodeId && nextProps.startPoint) {
      const finalNode = this.getConnectingNode(nextProps.finalNodeId);

      if (finalNode && nextProps.finalNodeAnchor) {
        this.setupConnector(nodeInstance as Konva.Group);
      }
    }
    // Connector is not yet paired
    if (nextProps.startPoint && nextProps.endPoint) {
      this.setupConnector(nodeInstance as Konva.Group);
    }

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  scaleReset(node: Konva.Line): void {
    const scale = node.scale();

    const oldPoints = node.points();
    const newPoints = [];

    for (let i = 0; i < oldPoints.length; i += 2) {
      const x = oldPoints[i] * scale.x;
      const y = oldPoints[i + 1] * scale.y;
      newPoints.push(x, y);
    }

    node.points(newPoints);

    // reset scale to 1
    node.scale({ x: 1, y: 1 });
  }

  protected showConnectorAnchors(node: Konva.Node): void {
    if (node.getAttrs().nodeType === 'connector') {
      return;
    }

    const clone = node.clone();

    const anchors = this.getNodeAnchors(clone);

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

      circle.on('pointermove pointerover', (e) => {
        circle.setAttrs({
          fill: '#ff2c2cff',
        });
        prevCursor = this.instance.getStage().container().style.cursor;
        this.instance.getStage().container().style.cursor = 'crosshair';
        e.cancelBubble = true;
      });

      circle.on('pointerleave', () => {
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
    const selectionLayer = this.instance.getSelectionLayer();
    if (selectionLayer) {
      const anchors = selectionLayer.find('.connector-anchor');
      anchors.forEach((anchor) => anchor.destroy());
    }
  }

  protected getNodeAnchors(node: Konva.Node) {
    const localBox = node.getClientRect({
      skipTransform: true,
      skipStroke: true,
    });

    const transform = node.getAbsoluteTransform();

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

    return anchors;
  }

  protected snapToAnchors(
    dragNode: Konva.Node,
    dragAnchors: { name: string; point: Konva.Vector2d }[],
    snapDist = 10
  ): {
    name: string | undefined;
    position: Konva.Vector2d;
  } {
    let anchorPosition = { x: 0, y: 0 };
    let minDist = snapDist; // track closest snap
    let anchorName = undefined;

    const a = dragNode.getAbsolutePosition();

    for (const aKey in dragAnchors) {
      const b = dragAnchors[aKey];

      const dx = b.point.x - a.x;
      const dy = b.point.y - a.y;
      const dist = Math.hypot(dx, dy);

      if (dist < minDist && dist < snapDist) {
        minDist = dist;
        anchorName = b.name;
        anchorPosition = b.point;
      }
    }

    return { name: anchorName, position: anchorPosition };
  }
}
