// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import {
  WEAVE_CONNECTOR_NODE_LINE_TYPE,
  WEAVE_CONNECTOR_NODE_TYPE,
} from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type {
  WeaveAnchorSnap,
  WeaveConnectorAnchor,
  WeaveConnectorInfo,
  WeaveConnectorLineType,
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

    if (connectorAttrs.startNodeId) {
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
    if (connectorAttrs.startPoint) {
      connector.setAttrs({
        x: connectorAttrs.startPoint.x,
        y: connectorAttrs.startPoint.y,
      });

      linePoints.push(connectorAttrs.startPoint.x);
      linePoints.push(connectorAttrs.startPoint.y);
    }
    if (connectorAttrs.endNodeId) {
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
    if (connectorAttrs.endPoint) {
      linePoints.push(connectorAttrs.endPoint.x);
      linePoints.push(connectorAttrs.endPoint.y);
    }

    const connectorLine = connector.findOne<Konva.Line>(
      `#${connector.getAttrs().id}-line`
    );

    connectorLine?.setAttrs({
      points: this.stageToGroupPoints(connector, linePoints),
    });

    const connectorLineSelector = connector.findOne<Konva.Line>(
      `#${connector.getAttrs().id}-selectionClone`
    );

    connectorLineSelector?.setAttrs({
      points: this.stageToGroupPoints(connector, linePoints),
    });
  }

  private setupConnector(connector: Konva.Group) {
    const connectorAttrs = connector.getAttrs();

    if (connectorAttrs.startNodeId) {
      const startNode = this.getConnectingNode(connectorAttrs.startNodeId);
      if (startNode) {
        startNode.on('dragmove dragend transform', () => {
          this.updateLinePosition(connector);
        });
      }
    }
    if (connectorAttrs.endNodeId) {
      const endNode = this.getConnectingNode(connectorAttrs.endNodeId);
      if (endNode) {
        endNode.on('dragmove dragend transform', () => {
          this.updateLinePosition(connector);
        });
      }
    }

    connector.setAttrs({
      initialized: true,
    });

    this.updateLinePosition(connector);

    this.resolveAsyncElement(connector.getAttrs().id ?? '');
  }

  private getConnectingNode(nodeId: string): Konva.Node | undefined {
    return this.instance.getStage().findOne(`#${nodeId}`);
  }

  private quadraticToCubic(
    x0: number,
    y0: number,
    cx: number,
    cy: number,
    x1: number,
    y1: number
  ) {
    const c1x = x0 + (2 / 3) * (cx - x0);
    const c1y = y0 + (2 / 3) * (cy - y0);

    const c2x = x1 + (2 / 3) * (cx - x1);
    const c2y = y1 + (2 / 3) * (cy - y1);

    return [x0, y0, c1x, c1y, c2x, c2y, x1, y1];
  }

  private stageToGroupPoints(connector: Konva.Group, points: number[]) {
    let linePoints: number[] = points;

    if (
      connector.getAttrs().lineType ===
        WEAVE_CONNECTOR_NODE_LINE_TYPE.STRAIGHT &&
      linePoints.length > 4
    ) {
      linePoints = [
        points[0],
        points[1],
        points[points.length - 2],
        points[points.length - 1],
      ];
    }

    if (
      connector.getAttrs().lineType === WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED &&
      connector.getAttrs().curvedControlPoint
    ) {
      linePoints = this.quadraticToCubic(
        points[0],
        points[1],
        connector.getAttrs().curvedControlPoint.x,
        connector.getAttrs().curvedControlPoint.y,
        points[points.length - 2],
        points[points.length - 1]
      );
    }

    const firstPoint = { x: linePoints[0], y: linePoints[1] };
    const result = [];
    for (let i = 0; i < linePoints.length; i += 2) {
      const pt = {
        x: linePoints[i] - firstPoint.x,
        y: linePoints[i + 1] - firstPoint.y,
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
      draggable: false,
    });

    if (!connector.getAttrs().lineType) {
      connector.setAttrs({
        lineType: WEAVE_CONNECTOR_NODE_LINE_TYPE.STRAIGHT,
        curvedControlPoint: undefined,
      });
    }

    const stroke = 'black';
    const strokeWidth = 1;

    const isBezier =
      connector.getAttrs().lineType === WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED;

    const connectorLine = new Konva.Line({
      id: `${props.id}-line`,
      nodeId: props.id,
      points: [],
      stroke,
      strokeWidth,
      bezier: isBezier,
      hitStrokeWidth: strokeWidth + 8,
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
          connector.getAttrs().startNodeId
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
          connector.getAttrs().startPoint
        ) {
          startInfo = {
            type: 'point',
            point: props.startPoint!,
          };
        }
        if (
          connector.getAttrs().endInfoLoaded &&
          connector.getAttrs().endNodeId
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
          connector.getAttrs().endPoint
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
      'onNodeRenderedUpdated',
      (node: Konva.Node) => {
        if (
          connector.getAttrs().startNodeId &&
          node.getAttrs().id === connector.getAttrs().startNodeId
        ) {
          this.updateLinePosition(connector);
        }

        if (
          connector.getAttrs().endNodeId &&
          node.getAttrs().id === connector.getAttrs().endNodeId
        ) {
          this.updateLinePosition(connector);
        }
      }
    );

    if (props.startNodeId) {
      const startNode = this.getConnectingNode(props.startNodeId);

      let loaded = false;
      if (startNode) {
        loaded = true;
      }

      connector.setAttrs({
        initialized: false,
        startInfoLoaded: loaded,
      });
    }
    if (props.startPoint) {
      connector.setAttrs({
        initialized: false,
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
        initialized: false,
        endInfoLoaded: loaded,
      });
    }
    if (props.endPoint) {
      connector.setAttrs({
        initialized: false,
        endInfoLoaded: true,
      });
    }

    if (props.startPoint && props.endPoint) {
      this.setupConnector(connector);
    }

    this.setupDefaultNodeAugmentation(connector);

    connector.getTransformerProperties = () => {
      return this.defaultGetTransformerProperties({
        ...this.config.transform,
        rotateEnabled: false,
        shouldOverdrawWholeArea: false,
        borderStroke: 'transparent',
      });
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
          this.teardownSelection(connector);
          this.teardownCurvedLine(connector);

          this.setupSelection(connector);
          if (
            connector.getAttrs().lineType ===
            WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED
          ) {
            this.setupCurvedLine(connector);
          }
        } else {
          this.teardownSelection(connector);
          this.teardownCurvedLine(connector);
        }
      }
    });

    connector.allowedAnchors = function () {
      return [];
    };

    return connector;
  }

  nodeMoveToContainerTN(
    node: Konva.Node,
    container: Konva.Node,
    oldNode: Konva.Node,
    oldContainer: Konva.Node
  ) {
    const stage = this.instance.getStage();

    const connectors = stage
      .find<Konva.Group>(`.node`)
      .filter(
        (n) =>
          n.getAttrs().nodeType === WEAVE_CONNECTOR_NODE_TYPE &&
          (n.getAttrs().startNodeId === node.getAttrs().id ||
            n.getAttrs().endNodeId === node.getAttrs().id)
      );

    for (let i = 0; i < connectors.length; i++) {
      const connector = connectors[i];

      let connectorParent: Konva.Node | null | undefined =
        connector.getParent();
      if (connectorParent?.getAttrs().nodeId) {
        connectorParent = stage.findOne(
          `#${connectorParent.getAttrs().nodeId}`
        );
      }

      let connectorChanged = false;

      if (
        connectorParent?.getAttrs().id !== container.getAttrs().id &&
        connector.getAttrs().startNodeId === node.getAttrs().id
      ) {
        const anchors = this.getNodeAnchors(oldNode, oldContainer!);

        const actualAnchor = anchors.find(
          (a) => a.name === connector.getAttrs().startNodeAnchor
        );

        connector.setAttrs({
          startNodeId: undefined,
          startNodeAnchor: undefined,
          startPoint: actualAnchor?.point,
        });
        this.updateLinePosition(connector);

        connectorChanged = true;
      }

      if (
        connectorParent?.getAttrs().id !== container.getAttrs().id &&
        connector.getAttrs().endNodeId === node.getAttrs().id
      ) {
        const anchors = this.getNodeAnchors(oldNode, oldContainer!);

        const actualAnchor = anchors.find(
          (a) => a.name === connector.getAttrs().endNodeAnchor
        );

        connector.setAttrs({
          endNodeId: undefined,
          endNodeAnchor: undefined,
          endPoint: actualAnchor?.point,
        });
        this.updateLinePosition(connector);

        connectorChanged = true;
      }

      if (connectorChanged) {
        this.instance.updateNodeNT(this.serialize(connector));
      }
    }
  }

  nodeRemovedTN(node: Konva.Node) {
    const stage = this.instance.getStage();

    let nodeParent: Konva.Node | null | undefined = node.getParent();
    if (nodeParent?.getAttrs().nodeId) {
      nodeParent = stage.findOne(`#${nodeParent.getAttrs().nodeId}`);
    }

    const connectors = stage
      .find<Konva.Group>(`.node`)
      .filter(
        (n) =>
          n.getAttrs().nodeType === WEAVE_CONNECTOR_NODE_TYPE &&
          (n.getAttrs().startNodeId === node.getAttrs().id ||
            n.getAttrs().endNodeId === node.getAttrs().id)
      );

    for (let i = 0; i < connectors.length; i++) {
      const connector = connectors[i];

      let connectorParent: Konva.Node | null | undefined =
        connector.getParent();
      if (connectorParent?.getAttrs().nodeId) {
        connectorParent = stage.findOne(
          `#${connectorParent.getAttrs().nodeId}`
        );
      }

      let connectorChanged = false;

      if (connector.getAttrs().startNodeId === node.getAttrs().id) {
        const anchors = this.getNodeAnchors(node, nodeParent!);

        const actualAnchor = anchors.find(
          (a) => a.name === connector.getAttrs().startNodeAnchor
        );

        connector.setAttrs({
          startNodeId: undefined,
          startNodeAnchor: undefined,
          startPoint: actualAnchor?.point,
        });

        connectorChanged = true;
      }

      if (connector.getAttrs().endNodeId === node.getAttrs().id) {
        const anchors = this.getNodeAnchors(node, nodeParent!);

        const actualAnchor = anchors.find(
          (a) => a.name === connector.getAttrs().endNodeAnchor
        );

        connector.setAttrs({
          endNodeId: undefined,
          endNodeAnchor: undefined,
          endPoint: actualAnchor?.point,
        });

        connectorChanged = true;
      }

      if (connectorChanged) {
        this.updateLinePosition(connector);
        this.instance.updateNodeNT(this.serialize(connector));
      }
    }
  }

  private setupCurvedLine(connector: Konva.Group) {
    const connectorLine = connector.findOne<Konva.Line>(
      `#${connector.getAttrs().id}-line`
    );

    if (
      !connectorLine ||
      connector.getAttrs().lineType !== WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED
    ) {
      return;
    }

    let curvedControlNodeHandler = this.instance
      .getSelectionLayer()
      ?.findOne<Konva.Circle>(
        `#${connector.getAttrs().id}-curvedControlNodeHandler`
      );

    if (curvedControlNodeHandler) {
      return;
    }

    const radius = 7;

    curvedControlNodeHandler = new Konva.Circle({
      id: `${connector.getAttrs().id}-curvedControlNodeHandler`,
      name: 'curvedControlNodeHandler',
      x: connector.getAttrs().curvedControlPoint.x,
      y: connector.getAttrs().curvedControlPoint.y,
      edgeSnappingDisableOnDrag: true,
      edgeDistanceDisableOnDrag: true,
      radius: radius / this.instance.getStage().scaleX(),
      strokeScaleEnabled: false,
      stroke: '#000000',
      strokeWidth: 1,
      fill: '#ffffff',
      draggable: true,
    });

    curvedControlNodeHandler.on('pointermove pointerover', () => {
      this.instance.getStage().container().style.cursor = 'move';
    });

    curvedControlNodeHandler.on('dragmove', (e) => {
      connector.setAttrs({
        curvedControlPoint: e.target.position(),
      });

      this.updateLinePosition(connector);
    });

    curvedControlNodeHandler.on('dragend', (e) => {
      connector.setAttrs({
        curvedControlPoint: e.target.position(),
      });

      this.updateLinePosition(connector);

      this.instance.updateNodeNT(this.serialize(connector));
    });

    this.instance.addEventListener('onZoomChange', () => {
      curvedControlNodeHandler!.setAttrs({
        radius: radius / this.instance.getStage().scaleX(),
      });
    });

    this.instance.getSelectionLayer()?.add(curvedControlNodeHandler);
  }

  private setupSelection(connector: Konva.Group) {
    const connectorLine = connector.findOne<Konva.Line>(
      `#${connector.getAttrs().id}-line`
    );

    if (!connectorLine) {
      return;
    }

    let startNodeHandler = this.instance
      .getSelectionLayer()
      ?.findOne<Konva.Circle>(`#${connector.getAttrs().id}-startNodeHandler`);
    let endNodeHandler = this.instance
      .getSelectionLayer()
      ?.findOne<Konva.Circle>(`#${connector.getAttrs().id}-endNodeHandler`);
    let selectionClone = connector.findOne<Konva.Line>('.selectionClone');

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
    let anchorNode: Konva.Node | undefined = undefined;
    let anchorPosition: Konva.Vector2d | undefined = undefined;

    const stage = this.instance.getStage();
    let nodeParent: Konva.Node | null | undefined = connector.getParent();
    if (nodeParent?.getAttrs().nodeId) {
      nodeParent = stage.findOne(`#${nodeParent.getAttrs().nodeId}`);
    }

    let isInContainer = false;
    if (nodeParent !== this.instance.getMainLayer()) {
      isInContainer = true;
    }

    startNodeHandler = new Konva.Circle({
      id: `${connector.getAttrs().id}-startNodeHandler`,
      name: 'startNodeHandler',
      x: connectorLine.points()[0],
      y: connectorLine.points()[1],
      edgeSnappingDisableOnDrag: true,
      edgeDistanceDisableOnDrag: true,
      radius: radius / this.instance.getStage().scaleX(),
      strokeScaleEnabled: false,
      stroke: '#000000',
      strokeWidth: 1,
      fill: '#ffffff',
      draggable: true,
    });

    startNodeHandler.on('pointermove pointerover', () => {
      this.instance.getStage().container().style.cursor = 'move';
    });

    startNodeHandler.on('dragstart', () => {
      connector.listening(false);

      const hoverClone = connector.findOne<Konva.Line>(`.hoverClone`);
      hoverClone?.destroy();

      this.teardownSelection(connector, true);

      this.instance.emitEvent('onConnectorStartHandleDragStart', { connector });
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

      let targetNode: Konva.Node | null | undefined = undefined;

      let connectorParent: Konva.Node | null | undefined =
        connector.getParent();
      if (connectorParent?.getAttrs().nodeId) {
        connectorParent = stage.findOne(
          `#${connectorParent.getAttrs().nodeId}`
        );
      }

      if (shape) {
        targetNode = this.instance.getInstanceRecursive(shape);

        let targetNodeParent: Konva.Node | null | undefined =
          targetNode.getParent();

        if (targetNodeParent?.getAttrs().nodeId) {
          targetNodeParent = stage.findOne(
            `#${targetNodeParent.getAttrs().nodeId}`
          );
        }

        if (connectorParent !== targetNodeParent) {
          return;
        }

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

      if (nodeHovered && anchorPosition) {
        const node = e.target;
        const targetPos = node.getAbsolutePosition();
        const dx = anchorPosition.x - targetPos.x;
        const dy = anchorPosition.y - targetPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > SNAP_OUT_DISTANCE) {
          anchorNode?.setAttrs({
            fill: '#ffffff',
          });

          nodeId = undefined;
          anchorName = undefined;
          anchorNode = undefined;
          anchorPosition = undefined;
          nodeHovered = undefined;
        }
      }

      if (nodeHovered) {
        const node = e.target;
        const hoveredNodeAnchors = this.getNodeAnchors(
          nodeHovered,
          nodeHovered.getParent()!
        );
        const { name, position } = this.snapToAnchors(
          node,
          nodeParent!,
          hoveredNodeAnchors,
          SNAP_DISTANCE
        );
        if (name) {
          node.setAbsolutePosition({ x: position.x, y: position.y });

          nodeId = nodeHovered.getAttrs().id;
          anchorName = name;
          anchorNode = this.instance
            .getSelectionLayer()
            ?.findOne<Konva.Circle>(
              `#${nodeHovered.getAttrs().id}-${name}-connector-anchor`
            );
          anchorPosition = position;

          anchorNode?.setAttrs({
            fill: '#ff2c2cff',
          });

          connector.setAttrs({
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

      const point = e.target.position();
      if (isInContainer && nodeParent) {
        const containerAbsPos = nodeParent.position();
        point.x = point.x - containerAbsPos.x;
        point.y = point.y - containerAbsPos.y;
      }

      connector.setAttrs({
        startNodeId: undefined,
        startNodeAnchor: undefined,
        startPoint: {
          x: point.x,
          y: point.y,
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
          startNodeId: nodeId,
          startNodeAnchor: anchorName,
          startPoint: undefined,
        });
      } else {
        const point = startNodeHandler.position();
        if (isInContainer && nodeParent) {
          const containerAbsPos = nodeParent.position();
          point.x = point.x - containerAbsPos.x;
          point.y = point.y - containerAbsPos.y;
        }

        connector.setAttrs({
          startNodeId: undefined,
          startNodeAnchor: undefined,
          startPoint: {
            x: point.x,
            y: point.y,
          },
        });
      }

      nodeId = undefined;
      anchorName = undefined;
      this.setupConnector(connector);
      this.setupSelection(connector);

      this.instance.updateNode(this.serialize(connector));

      this.instance.emitEvent('onConnectorStartHandleDragEnd', { connector });
    });

    this.instance.addEventListener('onZoomChange', () => {
      startNodeHandler!.setAttrs({
        radius: radius / this.instance.getStage().scaleX(),
      });
    });

    this.instance.getSelectionLayer()?.add(startNodeHandler);
    startNodeHandler.position(connector.position());

    if (isInContainer && nodeParent) {
      const containerAbsPos = nodeParent.position();
      startNodeHandler.position({
        x: startNodeHandler.x() + containerAbsPos.x,
        y: startNodeHandler.y() + containerAbsPos.y,
      });
    }

    startNodeHandler.moveToTop();

    endNodeHandler = new Konva.Circle({
      id: `${connector.getAttrs().id}-endNodeHandler`,
      name: 'endNodeHandler',
      x: connectorLine.points()[connectorLine.points().length - 2],
      y: connectorLine.points()[connectorLine.points().length - 1],
      radius: radius / this.instance.getStage().scaleX(),
      edgeSnappingDisableOnDrag: true,
      edgeDistanceDisableOnDrag: true,
      strokeScaleEnabled: false,
      stroke: '#000000',
      strokeWidth: 1,
      fill: '#ffffff',
      draggable: true,
    });

    endNodeHandler.on('pointermove pointerover', () => {
      this.instance.getStage().container().style.cursor = 'move';
    });

    endNodeHandler.on('dragstart', () => {
      connector.listening(false);

      const hoverClone = connector.findOne<Konva.Line>('.hoverClone');
      hoverClone?.destroy();

      this.teardownSelection(connector, true);

      this.instance.emitEvent('onConnectorEndHandleDragStart', { connector });
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

      let connectorParent: Konva.Node | null | undefined =
        connector.getParent();
      if (connectorParent?.getAttrs().nodeId) {
        connectorParent = stage.findOne(
          `#${connectorParent.getAttrs().nodeId}`
        );
      }

      if (shape) {
        targetNode = this.instance.getInstanceRecursive(shape);

        let targetNodeParent: Konva.Node | null | undefined =
          targetNode.getParent();

        if (targetNodeParent?.getAttrs().nodeId) {
          targetNodeParent = stage.findOne(
            `#${targetNodeParent.getAttrs().nodeId}`
          );
        }

        if (connectorParent !== targetNodeParent) {
          return;
        }

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

      if (nodeHovered && anchorPosition) {
        const node = e.target;
        const targetPos = node.getAbsolutePosition();
        const dx = anchorPosition.x - targetPos.x;
        const dy = anchorPosition.y - targetPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > SNAP_OUT_DISTANCE) {
          anchorNode?.setAttrs({
            fill: '#ffffff',
          });

          nodeId = undefined;
          anchorName = undefined;
          anchorPosition = undefined;
          nodeHovered = undefined;
        }
      }

      if (nodeHovered) {
        const node = e.target;
        const hoveredNodeAnchors = this.getNodeAnchors(
          nodeHovered,
          nodeHovered.getParent()!
        );
        const { name, position } = this.snapToAnchors(
          node,
          nodeParent!,
          hoveredNodeAnchors,
          SNAP_DISTANCE
        );
        if (name) {
          node.setAbsolutePosition({ x: position.x, y: position.y });

          nodeId = nodeHovered.getAttrs().id;
          anchorName = name;
          anchorNode = this.instance
            .getSelectionLayer()
            ?.findOne<Konva.Circle>(
              `#${nodeHovered.getAttrs().id}-${name}-connector-anchor`
            );
          anchorPosition = position;

          anchorNode?.setAttrs({
            fill: '#ff2c2cff',
          });

          connector.setAttrs({
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

      const point = e.target.position();
      if (isInContainer && nodeParent) {
        const containerAbsPos = nodeParent.position();
        point.x = point.x - containerAbsPos.x;
        point.y = point.y - containerAbsPos.y;
      }

      connector.setAttrs({
        endNodeId: undefined,
        endNodeAnchor: undefined,
        endPoint: {
          x: point.x,
          y: point.y,
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
          endNodeId: nodeId,
          endNodeAnchor: anchorName,
          endPoint: undefined,
        });
        this.setupConnector(connector);
      } else {
        const point = endNodeHandler.position();
        if (isInContainer && nodeParent) {
          const containerAbsPos = nodeParent.position();
          point.x = point.x - containerAbsPos.x;
          point.y = point.y - containerAbsPos.y;
        }

        connector.setAttrs({
          endNodeId: undefined,
          endNodeAnchor: undefined,
          endPoint: {
            x: point.x,
            y: point.y,
          },
        });
      }

      nodeId = undefined;
      anchorName = undefined;
      this.setupConnector(connector);
      this.setupSelection(connector);

      this.instance.updateNode(this.serialize(connector));

      this.instance.emitEvent('onConnectorEndHandleDragEnd', { connector });
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

    if (isInContainer && nodeParent) {
      const containerAbsPos = nodeParent.position();
      endNodeHandler.position({
        x: endNodeHandler.x() + containerAbsPos.x,
        y: endNodeHandler.y() + containerAbsPos.y,
      });
    }

    endNodeHandler.moveToTop();
  }

  private teardownCurvedLine(connector: Konva.Group) {
    const curvedControlNodeHandler = this.instance
      .getSelectionLayer()
      ?.findOne<Konva.Circle>(`#${connector.id()}-curvedControlNodeHandler`);
    curvedControlNodeHandler?.destroy();
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

    if (typeof nextProps.initialized === 'undefined') {
      nodeInstance.setAttrs({
        initialized: false,
      });
    }

    if (!nextProps.startNodeId) {
      nodeInstance.setAttrs({
        startNodeId: undefined,
        startNodeAnchor: undefined,
      });
    }

    if (!nextProps.startPoint) {
      nodeInstance.setAttrs({
        startPoint: undefined,
      });
    }

    if (!nextProps.endNodeId) {
      nodeInstance.setAttrs({
        endNodeId: undefined,
        endNodeAnchor: undefined,
      });
    }

    if (!nextProps.endPoint) {
      nodeInstance.setAttrs({
        endPoint: undefined,
      });
    }

    // Connector is paired to two nodes
    if (nextProps.startNodeId && nextProps.endNodeId) {
      const startNode = this.getConnectingNode(nextProps.startNodeId);
      const endNode = this.getConnectingNode(nextProps.endNodeId);

      if (
        startNode &&
        endNode &&
        nextProps.startNodeAnchor &&
        nextProps.endNodeAnchor
      ) {
        this.setupConnector(nodeInstance as Konva.Group);
      }
    }
    // Connector only paired on initial node
    if (nextProps.startNodeId && nextProps.endPoint) {
      const startNode = this.getConnectingNode(nextProps.startNodeId);

      if (startNode && nextProps.startNodeAnchor) {
        this.setupConnector(nodeInstance as Konva.Group);
      }
    }
    // Connector only paired on final node
    if (nextProps.endNodeId && nextProps.startPoint) {
      const endNode = this.getConnectingNode(nextProps.endNodeId);

      if (endNode && nextProps.endNodeAnchor) {
        this.setupConnector(nodeInstance as Konva.Group);
      }
    }
    // Connector is not yet paired
    if (nextProps.startPoint && nextProps.endPoint) {
      this.setupConnector(nodeInstance as Konva.Group);
    }

    // this.updateLinePosition(nodeInstance as Konva.Group);

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

  protected showConnectorAnchors(node: Konva.Node) {
    if (node.getAttrs().nodeType === 'connector') {
      return;
    }

    const clone = node.clone();

    const anchors = this.getNodeAnchors(clone, node.getParent()!);

    for (const anchor of anchors) {
      const radius = 7;

      const circle = new Konva.Circle({
        id: `${node.getAttrs().id}-${anchor.name}-connector-anchor`,
        name: 'connector-anchor',
        x: anchor.point.x,
        y: anchor.point.y,
        anchorPosition: anchor.name,
        radius: radius / this.instance.getStage().scaleX(),
        strokeScaleEnabled: false,
        stroke: '#000000',
        strokeWidth: 1,
        fill: '#ffffff',
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
        this.instance.getStage().container().style.cursor = 'move';
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

  protected getNodeAnchors(
    node: Konva.Node,
    parent: Konva.Node
  ): WeaveConnectorAnchor[] {
    const stage = this.instance.getStage();

    let nodeParent: Konva.Node | null | undefined = parent;
    if (nodeParent?.getAttrs().nodeId) {
      nodeParent = stage.findOne(`#${nodeParent.getAttrs().nodeId}`);
    }

    let isInContainer = false;
    if (nodeParent !== this.instance.getMainLayer()) {
      isInContainer = true;
    }

    const localBox = node.getClientRect({
      relativeTo: stage,
      skipTransform: true,
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

    if (isInContainer && nodeParent) {
      const containerAbsPos = nodeParent.position();
      topMid.x += containerAbsPos.x || 0;
      topMid.y += containerAbsPos.y || 0;
      rightMid.x += containerAbsPos.x || 0;
      rightMid.y += containerAbsPos.y || 0;
      bottomMid.x += containerAbsPos.x || 0;
      bottomMid.y += containerAbsPos.y || 0;
      leftMid.x += containerAbsPos.x || 0;
      leftMid.y += containerAbsPos.y || 0;
    }

    anchors.push({ name: 'top', point: topMid });
    anchors.push({ name: 'right', point: rightMid });
    anchors.push({ name: 'bottom', point: bottomMid });
    anchors.push({ name: 'left', point: leftMid });

    return anchors;
  }

  protected snapToAnchors(
    dragNode: Konva.Node,
    dragNodeContainer: Konva.Node | null,
    dragAnchors: WeaveConnectorAnchor[],
    snapDist = 10
  ): WeaveAnchorSnap {
    let anchorPosition = { x: 0, y: 0 };
    let minDist = snapDist; // track closest snap
    let anchorName: string | undefined = undefined;

    const a = dragNode.getAbsolutePosition();

    let isInContainer = false;
    if (dragNodeContainer !== this.instance.getMainLayer()) {
      isInContainer = true;
    }

    if (isInContainer && dragNodeContainer) {
      const containerAbsPos = dragNodeContainer.position();
      a.x += containerAbsPos.x || 0;
      a.y += containerAbsPos.y || 0;
    }

    for (const aKey in dragAnchors) {
      const b = dragAnchors[aKey];

      const dx = b.point.x - a.x;
      const dy = b.point.y - a.y;
      const dist = Math.hypot(dx, dy);

      if (dist < minDist && dist < snapDist) {
        minDist = dist;
        anchorName = b.name;
        anchorPosition = {
          ...b.point,
          ...(isInContainer &&
            dragNodeContainer && {
              x: b.point.x - (dragNodeContainer.position().x || 0),
              y: b.point.y - (dragNodeContainer.position().y || 0),
            }),
        };
      }
    }

    return { name: anchorName, position: anchorPosition };
  }

  serialize(instance: WeaveElementInstance): WeaveStateElement {
    const attrs = instance.getAttrs();

    const cleanedAttrs = { ...attrs };
    delete cleanedAttrs.draggable;
    delete cleanedAttrs.sceneFunc;
    delete cleanedAttrs.hitFunc;
    delete cleanedAttrs.initialized;
    delete cleanedAttrs.startInfoLoaded;
    delete cleanedAttrs.endInfoLoaded;

    return {
      key: attrs.id ?? '',
      type: attrs.nodeType,
      props: {
        ...cleanedAttrs,
        isCloned: undefined,
        isCloneOrigin: undefined,
        id: attrs.id ?? '',
        nodeType: attrs.nodeType,
        children: [],
      },
    };
  }

  changeConnectorType(connector: Konva.Group, type: WeaveConnectorLineType) {
    if (type === WEAVE_CONNECTOR_NODE_LINE_TYPE.STRAIGHT) {
      const connectorLine = connector.findOne<Konva.Line>(
        `#${connector.getAttrs().id}-line`
      );

      if (!connectorLine) {
        return;
      }

      connectorLine.setAttrs({
        bezier: false,
      });

      connector.setAttrs({
        lineType: WEAVE_CONNECTOR_NODE_LINE_TYPE.STRAIGHT,
        curvedControlPoint: undefined,
      });
    }
    if (type === WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED) {
      const connectorLine = connector.findOne<Konva.Line>(
        `#${connector.getAttrs().id}-line`
      );

      if (!connectorLine) {
        return;
      }

      const connectorPos = connector.position();
      const points = connectorLine.points();

      const defaultControlPoint = {
        x: connectorPos.x + (points[0] + points[points.length - 2]) / 2,
        y: connectorPos.y + (points[1] + points[points.length - 1]) / 2,
      };

      connectorLine.setAttrs({
        bezier: true,
      });

      connector.setAttrs({
        lineType: WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED,
        curvedControlPoint: defaultControlPoint,
      });
    }
    if (type === WEAVE_CONNECTOR_NODE_LINE_TYPE.ELBOW) {
      connector.setAttrs({
        lineType: WEAVE_CONNECTOR_NODE_LINE_TYPE.ELBOW,
        curvedControlPoint: undefined,
      });
    }

    this.updateLinePosition(connector);
    this.instance.updateNodeNT(this.serialize(connector));
  }
}
