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
