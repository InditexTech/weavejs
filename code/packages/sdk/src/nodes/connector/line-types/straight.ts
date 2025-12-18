// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import { WEAVE_CONNECTOR_NODE_LINE_TYPE } from '../constants';

export const setConnectorTypeStraight = (connector: Konva.Group) => {
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
};
