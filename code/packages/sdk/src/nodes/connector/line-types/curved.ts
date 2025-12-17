// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { WEAVE_CONNECTOR_NODE_LINE_TYPE } from '../constants';
import type { Weave } from '@/weave';
import type { WeaveConnectorNodeProperties } from '../types';
import type { WeaveConnectorNode } from '../connector';

export const setConnectorTypeCurved = (connector: Konva.Group) => {
  const connectorLine = connector.findOne<Konva.Line>(
    `#${connector.getAttrs().id}-line`
  );

  if (!connectorLine) {
    return;
  }

  const points = connectorLine.points();

  const defaultControlPoint = {
    x: connectorLine.x() + (points[0] + points[points.length - 2]) / 2,
    y: connectorLine.y() + (points[1] + points[points.length - 1]) / 2,
  };

  connectorLine.setAttrs({
    bezier: true,
  });

  connector.setAttrs({
    lineType: WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED,
    curvedControlPoint: defaultControlPoint,
  });
};

export const setupCurvedLine = (
  instance: Weave,
  config: WeaveConnectorNodeProperties,
  connectorHandler: WeaveConnectorNode,
  connector: Konva.Group
) => {
  const connectorLine = connector.findOne<Konva.Line>(
    `#${connector.getAttrs().id}-line`
  );

  if (
    !connectorLine ||
    connector.getAttrs().lineType !== WEAVE_CONNECTOR_NODE_LINE_TYPE.CURVED
  ) {
    return;
  }

  let curvedControlNodeHandler = instance
    .getSelectionLayer()
    ?.findOne<Konva.Circle>(
      `#${connector.getAttrs().id}-curvedControlNodeHandler`
    );

  if (curvedControlNodeHandler) {
    return;
  }

  const radius = config.style.curvedControl.radius;

  curvedControlNodeHandler = new Konva.Circle({
    id: `${connector.getAttrs().id}-curvedControlNodeHandler`,
    name: 'curvedControlNodeHandler',
    x: connector.getAttrs().curvedControlPoint.x + connector.x(),
    y: connector.getAttrs().curvedControlPoint.y + connector.y(),
    edgeSnappingDisableOnDrag: true,
    edgeDistanceDisableOnDrag: true,
    radius: radius / instance.getStage().scaleX(),
    strokeScaleEnabled: false,
    stroke: config.style.curvedControl.stroke,
    strokeWidth: config.style.curvedControl.strokeWidth,
    fill: config.style.curvedControl.fill,
    draggable: true,
  });

  curvedControlNodeHandler.on('pointermove pointerover', () => {
    instance.getStage().container().style.cursor = 'move';
  });

  curvedControlNodeHandler.on('dragmove', (e) => {
    connector.setAttrs({
      curvedControlPoint: {
        x: e.target.position().x - connector.x(),
        y: e.target.position().y - connector.y(),
      },
    });

    connectorHandler.updateLinePosition(connector);
  });

  curvedControlNodeHandler.on('dragend', (e) => {
    connector.setAttrs({
      curvedControlPoint: {
        x: e.target.position().x - connector.x(),
        y: e.target.position().y - connector.y(),
      },
    });

    connectorHandler.updateLinePosition(connector);

    instance.updateNodeNT(connectorHandler.serialize(connector));
  });

  instance.addEventListener('onZoomChange', () => {
    curvedControlNodeHandler!.setAttrs({
      radius: radius / instance.getStage().scaleX(),
    });
  });

  instance.getSelectionLayer()?.add(curvedControlNodeHandler);
};

export const teardownCurvedLine = (instance: Weave, connector: Konva.Group) => {
  const curvedControlNodeHandler = instance
    .getSelectionLayer()
    ?.findOne<Konva.Circle>(`#${connector.id()}-curvedControlNodeHandler`);
  curvedControlNodeHandler?.destroy();
};
