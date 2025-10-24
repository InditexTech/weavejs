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

  private updateLinePosition(
    connector: Konva.Group,
    initialNode: Konva.Node,
    initialAnchor: string,
    finalNode: Konva.Node,
    finalAnchor: string
  ) {
    const initialClone = initialNode.clone();
    const finalClone = finalNode.clone();

    const initialAnchorPosition = this.getAnchorPosition(
      initialClone,
      initialAnchor
    );
    const finalAnchorPosition = this.getAnchorPosition(finalClone, finalAnchor);

    if (initialAnchorPosition && finalAnchorPosition) {
      const connectorLine = connector.findOne<Konva.Line>(
        `#${connector.getAttrs().id}-line`
      );
      connector.setAttrs({
        x: initialAnchorPosition.x,
        y: initialAnchorPosition.y,
      });
      connectorLine?.setAttrs({
        points: this.stageToGroupPoints([
          initialAnchorPosition.x,
          initialAnchorPosition.y,
          finalAnchorPosition.x,
          finalAnchorPosition.y,
        ]),
      });
    }

    initialClone.destroy();
    finalClone.destroy();
  }

  private setupConnector(
    connector: Konva.Group,
    initialNode: Konva.Node,
    initialAnchor: string,
    finalNode: Konva.Node,
    finalAnchor: string
  ) {
    const initialClone = initialNode.clone();
    const finalClone = finalNode.clone();

    const initialAnchorPosition = this.getAnchorPosition(
      initialClone,
      initialAnchor
    );
    const finalAnchorPosition = this.getAnchorPosition(finalClone, finalAnchor);

    if (initialAnchorPosition && finalAnchorPosition) {
      const connectorLine = connector.findOne<Konva.Line>(
        `#${connector.getAttrs().id}-line`
      );
      connector.setAttrs({
        x: initialAnchorPosition.x,
        y: initialAnchorPosition.y,
      });
      connectorLine?.setAttrs({
        points: this.stageToGroupPoints([
          initialAnchorPosition.x,
          initialAnchorPosition.y,
          finalAnchorPosition.x,
          finalAnchorPosition.y,
        ]),
      });
    }

    initialNode.on('dragmove dragend transform transformend', () => {
      this.updateLinePosition(
        connector,
        initialNode,
        initialAnchor,
        finalNode,
        finalAnchor
      );
    });

    finalNode.on('dragmove dragend transform transformend', () => {
      this.updateLinePosition(
        connector,
        initialNode,
        initialAnchor,
        finalNode,
        finalAnchor
      );
    });

    connector.setAttrs({
      initialized: true,
    });

    this.resolveAsyncElement(connector.getAttrs().id ?? '');

    initialClone.destroy();
    finalClone.destroy();
  }

  private getConnectingNodes(
    initialNodeId: string,
    finalNodeId: string
  ): {
    initialNode: Konva.Node | undefined;
    finalNode: Konva.Node | undefined;
  } {
    const initialNode = this.instance.getStage().findOne(`#${initialNodeId}`);
    const finalNode = this.instance.getStage().findOne(`#${finalNodeId}`);

    return { initialNode, finalNode };
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
      initialLoaded: false,
      finalLoaded: false,
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
          nodeAttrs.id === connectorAttrs.initialNodeId &&
          !connectorAttrs.initialLoaded
        ) {
          connector.setAttrs({ initialLoaded: true });
        }
        if (
          nodeAttrs.id !== connectorAttrs.id &&
          nodeAttrs.nodeType !== 'connector' &&
          nodeAttrs.id === connectorAttrs.finalNodeId &&
          !connectorAttrs.finalLoaded
        ) {
          connector.setAttrs({ finalLoaded: true });
        }
        if (
          connector.getAttrs().initialLoaded &&
          connector.getAttrs().finalLoaded &&
          !connector.getAttrs().initialized
        ) {
          const { initialNode, finalNode } = this.getConnectingNodes(
            props.initialNodeId,
            props.finalNodeId
          );

          if (initialNode && finalNode) {
            this.setupConnector(
              connector,
              initialNode,
              props.initialNodeAnchor,
              finalNode,
              props.finalNodeAnchor
            );
          }
        }
      }
    );
    this.instance.addEventListener(
      'onNodeRenderedRemoved',
      (node: Konva.Node) => {
        console.log('node removed', node);
      }
    );

    const { initialNode, finalNode } = this.getConnectingNodes(
      props.initialNodeId,
      props.finalNodeId
    );

    if (
      initialNode &&
      finalNode &&
      props.initialNodeAnchor &&
      props.finalNodeAnchor
    ) {
      connector.setAttrs({
        initialLoaded: true,
        finalLoaded: true,
        initialized: false,
      });
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

    let hoverClone: Konva.Line | undefined = undefined;

    connector.handleMouseover = function () {
      if (hoverClone) {
        return;
      }

      hoverClone = connectorLine.clone() as Konva.Line;
      hoverClone.stroke('#1a1aff').name('hoverClone');
      connector.add(hoverClone);
      hoverClone.moveToTop();

      const initialNodeHandler = connector.findOne<Konva.Circle>(
        '.initialNodeHandler'
      );
      if (initialNodeHandler) {
        initialNodeHandler.moveToTop();
      }

      const finalNodeHandler =
        connector.findOne<Konva.Circle>('.finalNodeHandler');
      if (finalNodeHandler) {
        finalNodeHandler.moveToTop();
      }
    };

    connector.handleMouseout = function () {
      if (hoverClone) {
        hoverClone.destroy();
        hoverClone = undefined;
      }
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

    let initialNodeHandler = connector.findOne<Konva.Circle>(
      `#${connector.getAttrs().id}-initialNodeHandler`
    );
    let finalNodeHandler = this.instance
      .getSelectionLayer()
      ?.findOne<Konva.Circle>(`#${connector.getAttrs().id}-finalNodeHandler`);
    let selectionClone = this.instance
      .getSelectionLayer()
      ?.findOne<Konva.Line>(`#${connector.getAttrs().id}-selectionClone`);

    if (initialNodeHandler || finalNodeHandler || selectionClone) {
      return;
    }

    selectionClone = connectorLine.clone() as Konva.Line;
    selectionClone
      .stroke('#1a1aff')
      .id(`${connector.getAttrs().id}-selectionClone`);
    connector.add(selectionClone);
    selectionClone.moveToTop();

    const radius = 7;

    initialNodeHandler = new Konva.Circle({
      id: `${connector.getAttrs().id}-initialNodeHandler`,
      x: connectorLine.points()[0],
      y: connectorLine.points()[1],
      radius: radius / this.instance.getStage().scaleX(),
      strokeScaleEnabled: false,
      stroke: '#000000',
      strokeWidth: 1,
      fill: '#ffffff',
      draggable: true,
    });

    initialNodeHandler.on('pointermove pointerover', (e) => {
      this.instance.getStage().container().style.cursor = 'crosshair';
      e.cancelBubble = true;
    });

    this.instance.addEventListener('onZoomChange', () => {
      initialNodeHandler!.setAttrs({
        radius: radius / this.instance.getStage().scaleX(),
      });
    });

    this.instance.getSelectionLayer()?.add(initialNodeHandler);
    initialNodeHandler.position(connector.position());
    initialNodeHandler.moveToTop();

    finalNodeHandler = new Konva.Circle({
      id: `${connector.getAttrs().id}-finalNodeHandler`,
      x: connectorLine.points()[connectorLine.points().length - 2],
      y: connectorLine.points()[connectorLine.points().length - 1],
      radius: radius / this.instance.getStage().scaleX(),
      strokeScaleEnabled: false,
      stroke: '#000000',
      strokeWidth: 1,
      fill: '#ffffff',
      draggable: true,
    });

    finalNodeHandler.on('pointermove pointerover', (e) => {
      this.instance.getStage().container().style.cursor = 'crosshair';
      e.cancelBubble = true;
    });

    this.instance.addEventListener('onZoomChange', () => {
      finalNodeHandler!.setAttrs({
        radius: radius / this.instance.getStage().scaleX(),
      });
    });

    this.instance.getSelectionLayer()?.add(finalNodeHandler);
    finalNodeHandler.position({
      x:
        connector.position().x +
        connectorLine.points()[connectorLine.points().length - 2],
      y:
        connector.position().y +
        connectorLine.points()[connectorLine.points().length - 1],
    });
    finalNodeHandler.moveToTop();
  }

  private teardownSelection(connector: Konva.Group) {
    const initialNodeHandler = this.instance
      .getSelectionLayer()
      ?.findOne<Konva.Circle>(`#${connector.getAttrs().id}-initialNodeHandler`);
    const finalNodeHandler = this.instance
      .getSelectionLayer()
      ?.findOne<Konva.Circle>(`#${connector.getAttrs().id}-finalNodeHandler`);
    const selectionClone = connector.findOne<Konva.Line>(
      `#${connector.getAttrs().id}-selectionClone`
    );

    initialNodeHandler?.destroy();
    finalNodeHandler?.destroy();
    selectionClone?.destroy();
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });

    const { initialNode, finalNode } = this.getConnectingNodes(
      nextProps.initialNodeId,
      nextProps.finalNodeId
    );

    if (
      initialNode &&
      finalNode &&
      nextProps.initialNodeAnchor &&
      nextProps.finalNodeAnchor
    ) {
      this.setupConnector(
        nodeInstance as Konva.Group,
        initialNode,
        nextProps.initialNodeAnchor,
        finalNode,
        nextProps.finalNodeAnchor
      );
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
}
