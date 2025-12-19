// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import type {
  WeaveConnectorNodeLineOrigin,
  WeaveConnectorNodeProperties,
} from '../types';

export const setupNodeDecoratorNone = (
  config: WeaveConnectorNodeProperties,
  connector: Konva.Group,
  line: Konva.Line,
  origin: WeaveConnectorNodeLineOrigin
) => {
  const actualDecorator = connector.findOne(
    `#${connector.getAttrs().id}-${origin}NodeDecorator`
  );

  actualDecorator?.destroy();
};
