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
  WEAVE_CONNECTOR_NODE_DECORATOR_TYPE,
  WEAVE_CONNECTOR_NODE_LINE_ORIGIN,
  WEAVE_CONNECTOR_NODE_LINE_TYPE,
  WEAVE_CONNECTOR_NODE_TYPE,
  WEAVE_CONNECTOR_NODE_DEFAULT_CONFIG,
} from './constants';
import type { WeaveNodesSelectionPlugin } from '@/plugins/nodes-selection/nodes-selection';
import type {
  WeaveConnectorNodeInfo,
  WeaveConnectorNodeLineType,
  WeaveConnectorNodeLineOrigin,
  WeaveConnectorNodeDecoratorType,
  WeaveConnectorNodeParams,
  WeaveConnectorNodeProperties,
} from './types';
import {
  createElbowConnector,
  setConnectorTypeElbow,
} from './line-types/elbow';
import { mergeExceptArrays, moveNodeToContainer } from '@/utils';
import { setupNodeDecoratorDot } from './decorators/dot';
import { setupNodeDecoratorArrow } from './decorators/arrow';
import { setupNodeDecoratorNone } from './decorators/none';
import {
  getAnchorPosition,
  hideAllConnectorAnchors,
  showConnectorAnchors,
  snapToAnchors,
} from './anchors';
import {
  setConnectorTypeCurved,
  setupCurvedLine,
  teardownCurvedLine,
} from './line-types/curved';
import { quadraticToCubic } from './utils';
import { setConnectorTypeStraight } from './line-types/straight';

export class WeaveConnectorNode extends WeaveNode {
  private readonly config: WeaveConnectorNodeProperties;
  protected nodeType: string = WEAVE_CONNECTOR_NODE_TYPE;
  private readonly decorators: Record<
    string,
    (
      config: WeaveConnectorNodeProperties,
      connector: Konva.Group,
      line: Konva.Line,
      origin: WeaveConnectorNodeLineOrigin,
      handler: WeaveConnectorNode
    ) => void
  > = {
    [WEAVE_CONNECTOR_NODE_DECORATOR_TYPE.NONE]: setupNodeDecoratorNone,
    [WEAVE_CONNECTOR_NODE_DECORATOR_TYPE.DOT]: setupNodeDecoratorDot,
    [WEAVE_CONNECTOR_NODE_DECORATOR_TYPE.ARROW]: setupNodeDecoratorArrow,
  };

  constructor(params?: WeaveConnectorNodeParams) {
    super();

    this.config = mergeExceptArrays(
      WEAVE_CONNECTOR_NODE_DEFAULT_CONFIG,
      params?.config
    );
  }

  loadAsyncElement(nodeId: string) {
    this.instance.loadAsyncElement(nodeId, WEAVE_CONNECTOR_NODE_TYPE);
  }

  resolveAsyncElement(nodeId: string) {
    this.instance.resolveAsyncElement(nodeId, WEAVE_CONNECTOR_NODE_TYPE);
  }

  updateLinePosition(connector: Konva.Group) {
    const connectorAttrs = connector.getAttrs();

    const linePoints = [];

    if (connectorAttrs.startNodeId) {
      const startNode = this.getConnectingNode(connectorAttrs.startNodeId);
      if (startNode) {
        const startClone = startNode.clone();
        const startAnchorPosition = getAnchorPosition(
          startClone,
          connectorAttrs.startNodeAnchor
        );

        if (startAnchorPosition) {
          connector.setAttrs({
            x: startAnchorPosition.x,
            y: startAnchorPosition.y,
            startAnchorPosition: {
              x: startAnchorPosition.x,
              y: startAnchorPosition.y,
            },
          });

          linePoints.push(startAnchorPosition.x, startAnchorPosition.y);
        }

        startClone.destroy();
      }
    }
    if (connectorAttrs.startPoint) {
      connector.setAttrs({
        x: connectorAttrs.startPoint.x,
        y: connectorAttrs.startPoint.y,
        startAnchorPosition: {
          x: connectorAttrs.startPoint.x,
          y: connectorAttrs.startPoint.y,
        },
      });

      linePoints.push(connectorAttrs.startPoint.x, connectorAttrs.startPoint.y);
    }
    if (connectorAttrs.endNodeId) {
      const endNode = this.getConnectingNode(connectorAttrs.endNodeId);
      if (endNode) {
        const endClone = endNode.clone();
        const endAnchorPosition = getAnchorPosition(
          endClone,
          connectorAttrs.endNodeAnchor
        );

        if (endAnchorPosition) {
          connector.setAttrs({
            endAnchorPosition: {
              x: endAnchorPosition.x,
              y: endAnchorPosition.y,
            },
          });

          linePoints.push(endAnchorPosition.x, endAnchorPosition.y);
        }

        endClone.destroy();
      }
    }
    if (connectorAttrs.endPoint) {
      connector.setAttrs({
        endAnchorPosition: {
          x: connectorAttrs.endPoint.x,
          y: connectorAttrs.endPoint.y,
        },
      });

      linePoints.push(connectorAttrs.endPoint.x, connectorAttrs.endPoint.y);
    }

    const connectorLine = connector.findOne<Konva.Line>(
      `#${connector.getAttrs().id}-line`
    );

    connectorLine?.setAttrs({
      points: this.stageToGroupPoints(connector, linePoints),
    });

    this.updateSelection(connector);

    this.setupNodeDecorator(connector, WEAVE_CONNECTOR_NODE_LINE_ORIGIN.START);
    this.setupNodeDecorator(connector, WEAVE_CONNECTOR_NODE_LINE_ORIGIN.END);
  }

  setupNodeDecorator(
    connector: Konva.Group,
    origin: WeaveConnectorNodeLineOrigin
  ) {
    const connectorAttrs = connector.getAttrs();

    const line = connector.findOne<Konva.Line>(
      `#${connector.getAttrs().id}-line`
    );

    if (line && line.points().length >= 4) {
      const decoratorType =
        connectorAttrs[`${origin}NodeDecoratorType`] ??
        WEAVE_CONNECTOR_NODE_DECORATOR_TYPE.NONE;
      this.decorators[decoratorType](
        this.config,
        connector,
        line,
        origin,
        this
      );
    }
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

  private registerHooks() {
    // Register onMoveNodesToContainer hook
    this.instance.registerHook<{
      nodes: Konva.Node[];
    }>('onMoveNodesToContainer:connector', ({ nodes }) => {
      this.handleNodesMovedToContainer(nodes);
    });

    // Register onNodeRemoved hook
    this.instance.registerHook<{
      node: Konva.Node;
    }>('onNodeRemoved:connector', ({ node }) => {
      this.handleNodeRemoved(node);
    });
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

    const isBezier =
      connector.getAttrs().lineType === WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED;

    const connectorLine = new Konva.Line({
      id: `${props.id}-line`,
      nodeId: props.id,
      points: [],
      bezier: isBezier,
      fill: props.stroke ?? this.config.style.line.stroke,
      stroke: props.stroke ?? this.config.style.line.stroke,
      strokeWidth: props.strokeWidth ?? this.config.style.line.strokeWidth,
      tension: isBezier ? 0 : props.tension ?? this.config.style.line.tension,
      lineJoin: props.lineJoin ?? this.config.style.line.lineJoin,
      lineCap: props.lineCap ?? this.config.style.line.lineCap,
      dash: props.dash ?? this.config.style.line.dash,
      hitStrokeWidth:
        (props.strokeWidth ?? this.config.style.line.strokeWidth) + 8,
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

        let startInfo: WeaveConnectorNodeInfo | undefined = undefined;
        let endInfo: WeaveConnectorNodeInfo | undefined = undefined;

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

      const decoratorStart = connector.findOne(
        `#${connector.getAttrs().id}-startNodeDecorator`
      );

      if (decoratorStart) {
        const hoverCloneDecoratorStart = decoratorStart.clone();
        hoverCloneDecoratorStart
          .fill('#1a1aff')
          .stroke('#1a1aff')
          .name('hoverClone')
          .id(`${connector.getAttrs().id}-startNodeDecorator-hoverClone`);
        connector.add(hoverCloneDecoratorStart);
        hoverCloneDecoratorStart.moveToTop();
      }

      const decoratorEnd = connector.findOne(
        `#${connector.getAttrs().id}-endNodeDecorator`
      );

      if (decoratorEnd) {
        const hoverCloneDecoratorEnd = decoratorEnd.clone();
        hoverCloneDecoratorEnd
          .fill('#1a1aff')
          .stroke('#1a1aff')
          .name('hoverClone')
          .id(`${connector.getAttrs().id}-endNodeDecorator-hoverClone`);
        connector.add(hoverCloneDecoratorEnd);
        hoverCloneDecoratorEnd.moveToTop();
      }

      hoverClone = connectorLine.clone() as Konva.Line;
      hoverClone
        .fill('#1a1aff')
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

    connector.handleMouseout = (() => {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const handler = this;
      return function () {
        handler.teardownHover(connector);
      };
    })();

    this.instance.addEventListener('onNodesChange', () => {
      const nodesSelection = this.getNodesSelectionPlugin();
      if (nodesSelection) {
        const selectedNodes = nodesSelection.getSelectedNodes();

        if (
          selectedNodes.length === 1 &&
          selectedNodes[0].getAttrs().id === connector.getAttrs().id
        ) {
          this.teardownSelection(connector);
          teardownCurvedLine(this.instance, connector);

          this.setupSelection(connector);
          if (
            connector.getAttrs().lineType ===
            WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED
          ) {
            setupCurvedLine(this.instance, this.config, this, connector);
          }
        } else {
          this.teardownSelection(connector);
          teardownCurvedLine(this.instance, connector);
        }
      }
    });

    connector.allowedAnchors = function () {
      return [];
    };

    connector.canBeHovered = function () {
      return false;
    };

    connector.canMoveToContainer = function () {
      if (this.getAttrs().startNodeId || this.getAttrs().endNodeId) {
        return false;
      }
      return true;
    };

    connector.canDrag = function () {
      return false;
    };

    connector.getNodeAnchors = function () {
      return [];
    };

    this.registerHooks();

    return connector;
  }

  private handleNodesMovedToContainer(nodes: Konva.Node[]) {
    const stage = this.instance.getStage();

    const connectorsToUpdate: Konva.Node[] = [];

    for (const node of nodes) {
      const connectors = stage.find<Konva.Group>(`.node`).filter((n) => {
        return (
          n.getAttrs().nodeType === WEAVE_CONNECTOR_NODE_TYPE &&
          (n.getAttrs().startNodeId === node.getAttrs().id ||
            n.getAttrs().endNodeId === node.getAttrs().id) &&
          connectorsToUpdate.find(
            (c) => c.getAttrs().id === n.getAttrs().id
          ) === undefined
        );
      });

      connectorsToUpdate.push(...connectors);
    }

    this.instance.stateTransactional(() => {
      for (const connector of connectorsToUpdate) {
        let connectorParent: Konva.Node | null | undefined =
          connector.getParent();
        if (connectorParent?.getAttrs().nodeId) {
          connectorParent = stage.findOne(
            `#${connectorParent.getAttrs().nodeId}`
          );
        }

        const connectorNodeStart = stage.findOne(
          `#${connector.getAttrs().startNodeId}`
        );

        let realConnectorNodeStartParent: Konva.Node | null | undefined =
          connectorNodeStart?.getParent();
        if (connectorNodeStart?.getAttrs().nodeId) {
          realConnectorNodeStartParent = this.instance
            .getStage()
            .findOne(`#${connectorNodeStart.getAttrs().nodeId}`);
        }

        const connectorNodeEnd = stage.findOne(
          `#${connector.getAttrs().endNodeId}`
        );

        let realConnectorNodeEndParent: Konva.Node | null | undefined =
          connectorNodeEnd?.getParent();
        if (connectorNodeEnd?.getAttrs().nodeId) {
          realConnectorNodeEndParent = this.instance
            .getStage()
            .findOne(`#${connectorNodeEnd.getAttrs().nodeId}`);
        }

        // Connector's nodes are on the same container but different than connector's one
        if (
          connectorParent &&
          realConnectorNodeStartParent &&
          realConnectorNodeEndParent &&
          realConnectorNodeStartParent.getAttrs().id ===
            realConnectorNodeEndParent.getAttrs().id &&
          (connectorParent.getAttrs().id !==
            realConnectorNodeStartParent.getAttrs().id ||
            connectorParent.getAttrs().id !==
              realConnectorNodeEndParent.getAttrs().id)
        ) {
          moveNodeToContainer(
            this.instance,
            connector,
            realConnectorNodeStartParent as Konva.Layer | Konva.Group
          );
          continue;
        }

        // Connector's nodes are on different containers, lets remove the connector
        if (
          connectorParent &&
          realConnectorNodeStartParent &&
          realConnectorNodeEndParent &&
          (connectorParent.getAttrs().id !==
            realConnectorNodeStartParent.getAttrs().id ||
            connectorParent.getAttrs().id !==
              realConnectorNodeEndParent.getAttrs().id)
        ) {
          this.instance.removeNodeNT(
            this.serialize(connector as WeaveElementInstance)
          );
        }
      }
    });
  }

  private handleNodeRemoved(node: Konva.Node) {
    const stage = this.instance.getStage();

    const connectors = stage
      .find<Konva.Group>(`.node`)
      .filter(
        (n) =>
          n.getAttrs().nodeType === WEAVE_CONNECTOR_NODE_TYPE &&
          (n.getAttrs().startNodeId === node.getAttrs().id ||
            n.getAttrs().endNodeId === node.getAttrs().id)
      );

    for (const connector of connectors) {
      let connectorParent: Konva.Node | null | undefined =
        connector.getParent();
      if (connectorParent?.getAttrs().nodeId) {
        connectorParent = stage.findOne(
          `#${connectorParent.getAttrs().nodeId}`
        );
      }

      let connectorChanged = false;

      if (connector.getAttrs().startNodeId === node.getAttrs().id) {
        const anchors = node.getNodeAnchors();

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
        const anchors = node.getNodeAnchors();

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

  private setupSelection(connector: Konva.Group) {
    const connectorLine = connector.findOne<Konva.Line>(
      `#${connector.getAttrs().id}-line`
    );

    if (!connectorLine) {
      return;
    }

    this.setupSelectorLineClone(connector, connectorLine);
    this.setupSelectorDecoratorClone(
      connector,
      WEAVE_CONNECTOR_NODE_LINE_ORIGIN.START
    );
    this.setupSelectorDecoratorClone(
      connector,
      WEAVE_CONNECTOR_NODE_LINE_ORIGIN.END
    );

    this.setupSelectionHandler(
      connector,
      connectorLine,
      WEAVE_CONNECTOR_NODE_LINE_ORIGIN.START
    );
    this.setupSelectionHandler(
      connector,
      connectorLine,
      WEAVE_CONNECTOR_NODE_LINE_ORIGIN.END
    );
  }

  private setupSelectorLineClone(connector: Konva.Group, line: Konva.Line) {
    let selectionClone = connector.findOne<Konva.Line>('.selectionClone');

    if (selectionClone) {
      return;
    }

    const selectionColor = this.config.style.selection.color;

    selectionClone = line.clone() as Konva.Line;
    selectionClone
      .fill(selectionColor)
      .stroke(selectionColor)
      .name('selectionClone')
      .id(`${connector.getAttrs().id}-selectionClone`);
    connector.add(selectionClone);
    selectionClone.moveToTop();
  }

  private setupSelectorDecoratorClone(
    connector: Konva.Group,
    origin: WeaveConnectorNodeLineOrigin
  ) {
    const decoratorSelectionClone = connector.findOne(
      `${connector.getAttrs().id}-${origin}NodeDecorator-selectionClone`
    );

    if (decoratorSelectionClone) {
      return;
    }

    const decoratorOrigin = connector.findOne(
      `#${connector.getAttrs().id}-${origin}NodeDecorator`
    );

    if (decoratorOrigin) {
      const selectionColor = this.config.style.selection.color;

      const selectionCloneDecoratorStart = decoratorOrigin.clone();
      selectionCloneDecoratorStart
        .fill(selectionColor)
        .stroke(selectionColor)
        .name('selectionClone')
        .id(`${connector.getAttrs().id}-${origin}NodeDecorator-selectionClone`);
      connector.add(selectionCloneDecoratorStart);
      selectionCloneDecoratorStart.moveToTop();
    }
  }

  private setupSelectionHandler(
    connector: Konva.Group,
    line: Konva.Line,
    origin: WeaveConnectorNodeLineOrigin
  ) {
    let nodeHandler = this.instance
      .getSelectionLayer()
      ?.findOne<Konva.Circle>(
        `#${connector.getAttrs().id}-${origin}NodeHandler`
      );

    if (nodeHandler) {
      return;
    }

    const radius = this.config.style.pointsHandler.radius;

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

    nodeHandler = new Konva.Circle({
      id: `${connector.getAttrs().id}-${origin}NodeHandler`,
      name: `${origin}NodeHandler`,
      x: connector.getAttrs()[`${origin}AnchorPosition`].x,
      y: connector.getAttrs()[`${origin}AnchorPosition`].y,
      edgeSnappingDisableOnDrag: true,
      edgeDistanceDisableOnDrag: true,
      radius: radius / this.instance.getStage().scaleX(),
      strokeScaleEnabled: false,
      stroke: this.config.style.pointsHandler.stroke,
      strokeWidth: this.config.style.pointsHandler.strokeWidth,
      fill: this.config.style.pointsHandler.fill,
      draggable: true,
    });

    nodeHandler.on('pointermove pointerover', () => {
      this.instance.getStage().container().style.cursor = 'move';
    });

    nodeHandler.on('dragstart', () => {
      connector.listening(false);

      this.teardownHover(connector);
      this.teardownSelection(connector, true);

      this.instance.emitEvent(
        `onConnector${
          origin.charAt(0).toUpperCase() + origin.slice(1)
        }HandleDragStart`,
        { connector }
      );
    });

    const SNAP_DISTANCE = this.config.handlerSnapping.activateThreshold;
    const SNAP_OUT_DISTANCE = this.config.handlerSnapping.releaseThreshold;

    nodeHandler.on('dragmove', (e) => {
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
            ![WEAVE_CONNECTOR_NODE_TYPE].includes(
              targetNode.getAttrs().nodeType
            ) &&
            targetNode !== nodeHovered)
        ) {
          hideAllConnectorAnchors(this.instance);
          showConnectorAnchors(this.instance, this.config, targetNode);
          nodeHovered = targetNode;
        }
      }

      if (nodeHovered && anchorPosition) {
        const node = e.target;
        const targetPos = node.getAbsolutePosition();
        const dx = anchorPosition.x - targetPos.x;
        const dy = anchorPosition.y - targetPos.y;
        const distance = Math.hypot(dx, dy);

        if (distance > SNAP_OUT_DISTANCE) {
          anchorNode?.setAttrs({
            fill: this.config.style.anchorNode.fill,
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
        const hoveredNodeAnchors = nodeHovered.getNodeAnchors();
        const { name, position } = snapToAnchors(
          this.instance,
          node,
          nodeParent,
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
            fill: this.config.style.anchorNode.anchoredFill,
          });

          connector.setAttrs({
            [`${origin}NodeId`]: nodeHovered.getAttrs().id,
            [`${origin}NodeAnchor`]: name,
            [`${origin}Point`]: undefined,
          });
          this.updateLinePosition(connector);
          return;
        }
      }

      if (!targetNode && !anchorPosition) {
        hideAllConnectorAnchors(this.instance);
        nodeHovered = undefined;
      }

      const point = e.target.position();
      if (isInContainer && nodeParent) {
        const containerAbsPos = nodeParent.position();
        point.x = point.x - containerAbsPos.x;
        point.y = point.y - containerAbsPos.y;
      }

      connector.setAttrs({
        [`${origin}NodeId`]: undefined,
        [`${origin}NodeAnchor`]: undefined,
        [`${origin}Point`]: {
          x: point.x,
          y: point.y,
        },
      });

      this.updateLinePosition(connector);
    });

    nodeHandler.on('dragend', () => {
      connector.listening(true);

      hideAllConnectorAnchors(this.instance);

      if (nodeId && anchorName) {
        connector.setAttrs({
          [`${origin}NodeId`]: nodeId,
          [`${origin}NodeAnchor`]: anchorName,
          [`${origin}Point`]: undefined,
        });
      } else {
        const point = nodeHandler.position();
        if (isInContainer && nodeParent) {
          const containerAbsPos = nodeParent.position();
          point.x = point.x - containerAbsPos.x;
          point.y = point.y - containerAbsPos.y;
        }

        connector.setAttrs({
          [`${origin}NodeId`]: undefined,
          [`${origin}NodeAnchor`]: undefined,
          [`${origin}Point`]: {
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

      this.instance.emitEvent(
        `onConnector${
          origin.charAt(0).toUpperCase() + origin.slice(1)
        }HandleDragEnd`,
        { connector }
      );
    });

    this.instance.addEventListener('onZoomChange', () => {
      nodeHandler!.setAttrs({
        radius: radius / this.instance.getStage().scaleX(),
      });
    });

    this.instance.getSelectionLayer()?.add(nodeHandler);

    if (isInContainer && nodeParent) {
      const containerAbsPos = nodeParent.position();
      nodeHandler.position({
        x: nodeHandler.x() + containerAbsPos.x,
        y: nodeHandler.y() + containerAbsPos.y,
      });
    }

    nodeHandler.moveToTop();
  }

  private updateSelection(connector: Konva.Group) {
    const connectorLine = connector.findOne<Konva.Line>(
      `#${connector.getAttrs().id}-line`
    );

    if (!connectorLine) {
      return;
    }

    const connectorSelectionLine = connector.findOne<Konva.Line>(
      `#${connector.getAttrs().id}-selectionClone`
    );

    connectorSelectionLine?.setAttrs({
      points: connectorLine.points(),
    });
  }

  private teardownHover(connector: Konva.Group) {
    const hoverClones = connector.find<Konva.Line>(`.hoverClone`);
    hoverClones.forEach((hoverClone) => hoverClone.destroy());
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

    const selectionClones = connector.find<Konva.Line>(`.selectionClone`);
    selectionClones.forEach((selectionClone) => selectionClone.destroy());
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });

    if (nextProps?.initialized === undefined) {
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

    const internalLine = (nodeInstance as Konva.Group).findOne<Konva.Line>(
      `#${nodeInstance.getAttrs().id}-line`
    );

    if (internalLine) {
      const isBezier =
        nextProps.lineType === WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED;

      internalLine.setAttrs({
        fill: nextProps.stroke ?? this.config.style.line.stroke,
        stroke: nextProps.stroke ?? this.config.style.line.stroke,
        strokeWidth:
          nextProps.strokeWidth ?? this.config.style.line.strokeWidth,
        tension: isBezier
          ? 0
          : nextProps.tension ?? this.config.style.line.tension,
        lineJoin: nextProps.lineJoin ?? this.config.style.line.lineJoin,
        lineCap: nextProps.lineCap ?? this.config.style.line.lineCap,
        dash: nextProps.dash ?? this.config.style.line.dash,
        hitStrokeWidth:
          (nextProps.strokeWidth ?? this.config.style.line.strokeWidth) + 8,
      });
    }

    const nodesSelectionPlugin =
      this.instance.getPlugin<WeaveNodesSelectionPlugin>('nodesSelection');

    if (nodesSelectionPlugin) {
      nodesSelectionPlugin.getTransformer().forceUpdate();
    }
  }

  serialize(instance: WeaveElementInstance): WeaveStateElement {
    const attrs = instance.getAttrs();

    const cleanedAttrs = { ...attrs };
    delete cleanedAttrs.mutexLocked;
    delete cleanedAttrs.mutexUserId;
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

  changeConnectorDecorator(
    connector: Konva.Group,
    origin: WeaveConnectorNodeLineOrigin,
    type: WeaveConnectorNodeDecoratorType
  ) {
    connector.setAttrs({
      [`${origin}NodeDecoratorType`]: type,
    });

    connector
      .findOne<Konva.Group>(
        `#${connector.getAttrs().id}-${origin}NodeDecorator`
      )
      ?.destroy();

    this.instance.updateNode(this.serialize(connector));

    this.setupNodeDecorator(connector, origin);
  }

  changeConnectorType(
    connector: Konva.Group,
    type: WeaveConnectorNodeLineType
  ) {
    switch (type) {
      case WEAVE_CONNECTOR_NODE_LINE_TYPE.STRAIGHT:
        this.teardownSelection(connector, true);
        this.teardownHover(connector);
        setConnectorTypeStraight(connector);
        break;
      case WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED:
        this.teardownSelection(connector, true);
        this.teardownHover(connector);
        setConnectorTypeCurved(connector);
        break;
      case WEAVE_CONNECTOR_NODE_LINE_TYPE.ELBOW:
        this.teardownSelection(connector, true);
        this.teardownHover(connector);
        setConnectorTypeElbow(connector);
        break;
      default:
        break;
    }

    this.instance.updateNode(this.serialize(connector));
  }

  private readonly stageToGroupPoints = (
    connector: Konva.Group,
    points: number[]
  ) => {
    let linePoints: number[] = points;

    if (
      connector.getAttrs().lineType === WEAVE_CONNECTOR_NODE_LINE_TYPE.STRAIGHT
    ) {
      linePoints = [
        points[0],
        points[1],
        points[points.length - 2],
        points[points.length - 1],
      ];
    }

    const curvedControlPoint = connector.getAttrs().curvedControlPoint;

    if (
      connector.getAttrs().lineType === WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED &&
      curvedControlPoint
    ) {
      linePoints = quadraticToCubic(
        { x: points[0], y: points[1] },
        {
          x: curvedControlPoint.x + connector.x(),
          y: curvedControlPoint.y + connector.y(),
        },
        { x: points[points.length - 2], y: points[points.length - 1] }
      );
    }

    if (
      connector.getAttrs().lineType === WEAVE_CONNECTOR_NODE_LINE_TYPE.ELBOW
    ) {
      const elbowPoints = createElbowConnector(
        { x: points[0], y: points[1] },
        connector.getAttrs().startNodeAnchor,
        { x: points[points.length - 2], y: points[points.length - 1] },
        connector.getAttrs().endNodeAnchor
      );

      const elbowLinePoints = [];
      for (const elbowPoint of elbowPoints) {
        elbowLinePoints.push(elbowPoint.x, elbowPoint.y);
      }

      linePoints = elbowLinePoints;
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
  };
}
