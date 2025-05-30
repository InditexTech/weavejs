// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  WEAVE_DEFAULT_TRANSFORM_PROPERTIES,
  type WeaveElementAttributes,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import { WEAVE_LINE_NODE_TYPE } from './constants';
import type { WeaveLineNodeParams, WeaveLineProperties } from './types';

export class WeaveLineNode extends WeaveNode {
  private config: WeaveLineProperties;
  protected nodeType: string = WEAVE_LINE_NODE_TYPE;

  constructor(params?: WeaveLineNodeParams) {
    super();

    const { config } = params ?? {};

    this.config = {
      transform: {
        ...WEAVE_DEFAULT_TRANSFORM_PROPERTIES,
        ...config?.transform,
      },
    };
  }

  onRender(props: WeaveElementAttributes): WeaveElementInstance {
    const line = new Konva.Line({
      ...props,
      name: 'node',
    });

    line.getTransformerProperties = () => {
      return this.config.transform;
    };

    this.setupDefaultNodeEvents(line);

    return line;
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });
  }
}
