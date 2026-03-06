// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import {
  type DeepPartial,
  type NodeSerializable,
  type WeaveNodeTransformerProperties,
} from '@inditextech/weave-types';
import type { TEXT_LAYOUT } from './constants';

export type TextSerializable = Konva.TextConfig &
  NodeSerializable & {
    type: 'text';
    id: string;
  };

export type WeaveTextOutlineProperties =
  | {
      enabled: true;
      color: string;
      width: number;
    }
  | {
      enabled: false;
    };

export type WeaveTextProperties = {
  transform: WeaveNodeTransformerProperties;
  outline: WeaveTextOutlineProperties;
};
export type WeaveTextNodeParams = {
  config: DeepPartial<WeaveTextProperties>;
};

export type WeaveTextNodeOnEnterTextNodeEditMode = { node: Konva.Text };
export type WeaveTextNodeOnExitTextNodeEditMode = { node: Konva.Text };

export type WeaveTextLayoutKeys = keyof typeof TEXT_LAYOUT;
export type WeaveTextLayout = (typeof TEXT_LAYOUT)[WeaveTextLayoutKeys];
