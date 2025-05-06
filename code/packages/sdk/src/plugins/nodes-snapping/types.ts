// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';
import { GUIDE_ORIENTATION, NODE_SNAP } from './constants';

export type NodeSnapKeys = keyof typeof NODE_SNAP;
export type NodeSnap = (typeof NODE_SNAP)[NodeSnapKeys];

export type NodeSnappingEdge = {
  guide: number;
  offset: number;
  snap: NodeSnap;
};

export type NodeSnappingEdges = {
  vertical: NodeSnappingEdge[];
  horizontal: NodeSnappingEdge[];
};

export type LineGuideStop = {
  vertical: number[];
  horizontal: number[];
};

export type LineGuide = {
  lineGuide: number;
  diff: number;
  snap: NodeSnap;
  offset: number;
};

export type GuideOrientationKeys = keyof typeof GUIDE_ORIENTATION;
export type GuideOrientation = (typeof GUIDE_ORIENTATION)[GuideOrientationKeys];

export type Guide = {
  lineGuide: number;
  offset: number;
  orientation: GuideOrientation;
  snap: NodeSnap;
};

export type WeaveNodesSnappingPluginConfig = {
  guideLine: Konva.LineConfig;
  dragSnappingThreshold: number;
  transformSnappingThreshold: number;
};

export type WeaveNodesSnappingPluginParams = {
  config?: WeaveNodesSnappingPluginConfig;
};
