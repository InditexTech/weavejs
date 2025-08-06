// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import { NODE_SNAP_HORIZONTAL, NODE_SNAP_VERTICAL } from './constants';
import type { DeepPartial } from '@inditextech/weave-types';

export type NodeSnapHorizontalKeys = keyof typeof NODE_SNAP_HORIZONTAL;
export type NodeSnapHorizontal =
  (typeof NODE_SNAP_HORIZONTAL)[NodeSnapHorizontalKeys];

export type NodeSnapVerticalKeys = keyof typeof NODE_SNAP_VERTICAL;
export type NodeSnapVertical =
  (typeof NODE_SNAP_VERTICAL)[NodeSnapVerticalKeys];

export type WeaveNodesDistanceSnappingPluginConfig = {
  enterSnappingTolerance: number;
  exitSnappingTolerance: number;
  ui: WeaveNodesDistanceSnappingUIConfig;
};

export type WeaveNodesDistanceSnappingPluginParams = {
  config?: DeepPartial<WeaveNodesDistanceSnappingPluginConfig>;
};

export type DistanceInfoH = {
  index: number;
  from: Konva.Node;
  to: Konva.Node;
  midY: number;
  distance: number;
};

export type DistanceInfoV = {
  index: number;
  from: Konva.Node;
  to: Konva.Node;
  midX: number;
  distance: number;
};

export type WeaveNodesDistanceSnappingUIConfig = {
  line: {
    stroke: string;
    strokeWidth: number;
  };
  label: {
    height: number;
    cornerRadius: number;
    fill: string;
    fontSize: number;
    fontFamily: string;
    fontStyle: string;
    linePadding: number;
    paddingX: number;
  };
};
