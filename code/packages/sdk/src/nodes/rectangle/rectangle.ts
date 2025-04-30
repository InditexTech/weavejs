// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
} from '@inditextech/weave-types';
import { WeaveNode } from '../node';
import { WEAVE_RECTANGLE_NODE_TYPE } from './constants';

export class WeaveRectangleNode extends WeaveNode {
  protected nodeType: string = WEAVE_RECTANGLE_NODE_TYPE;

  render(props: WeaveElementAttributes): WeaveElementInstance {
    const rectangle = new Konva.Rect({
      ...props,
      name: 'node',
    });

    this.setupDefaultNodeEvents(rectangle);

    return rectangle;
  }

  update(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void {
    nodeInstance.setAttrs({
      ...nextProps,
    });
  }
}
