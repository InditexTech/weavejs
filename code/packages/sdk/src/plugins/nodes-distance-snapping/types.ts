// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import { NODE_SNAP_HORIZONTAL, NODE_SNAP_VERTICAL } from './constants';

export type NodeSnapHorizontalKeys = keyof typeof NODE_SNAP_HORIZONTAL;
export type NodeSnapHorizontal =
  (typeof NODE_SNAP_HORIZONTAL)[NodeSnapHorizontalKeys];

export type NodeSnapVerticalKeys = keyof typeof NODE_SNAP_VERTICAL;
export type NodeSnapVertical =
  (typeof NODE_SNAP_VERTICAL)[NodeSnapVerticalKeys];

export type WeaveNodesDistanceSnappingPluginConfig = {
  enterSnappingTolerance: number;
  exitSnappingTolerance: number;
};

export type WeaveNodesDistanceSnappingPluginParams = {
  config?: WeaveNodesDistanceSnappingPluginConfig;
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
