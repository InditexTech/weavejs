// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type NodeSerializable,
  type WeaveNodeTransformerProperties,
} from '@inditextech/weave-types';

export type TextSerializable = Konva.TextConfig &
  NodeSerializable & {
    type: 'text';
    id: string;
  };

export type WeaveTextProperties = {
  transform: WeaveNodeTransformerProperties;
};

export type WeaveTextNodeParams = {
  config: Partial<WeaveTextProperties>;
};
