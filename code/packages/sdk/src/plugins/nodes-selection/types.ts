// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveSelection } from '@inditextech/weave-types';
import type Konva from 'konva';

export type WeaveNodesSelectionPluginOnSelectionStateEvent = boolean;
export type WeaveNodesSelectionPluginOnNodesChangeEvent = WeaveSelection[];
export type WeaveNodesSelectionPluginOnStageSelectionEvent = undefined;

export type WeaveNodesSelectionOnSelectionParams = {
  resizeEnabled: boolean;
  rotateEnabled: boolean;
  enabledAnchors: string[];
};

export type WeaveNodesSelectionBehaviorsConfig = {
  singleSelection: {
    enabled: boolean;
  };
  multipleSelection: {
    enabled: boolean;
  };
  onMultipleSelection?: (
    selectedNodes: Konva.Node[]
  ) => Partial<WeaveNodesSelectionOnSelectionParams>;
};

export type WeaveNodesSelectionPanningOnSelectionConfig = {
  edgeThreshold: number;
  minScrollSpeed: number;
  maxScrollSpeed: number;
};

export type WeaveNodesSelectionConfig = {
  selection: Konva.TransformerConfig;
  hover: Konva.TransformerConfig;
  selectionArea: Konva.RectConfig;
  panningWhenSelection: WeaveNodesSelectionPanningOnSelectionConfig;
  behaviors: WeaveNodesSelectionBehaviorsConfig;
};

export type WeaveNodesSelectionPluginConfig =
  Partial<WeaveNodesSelectionConfig>;

export type WeaveNodesSelectionPluginParams = {
  config?: WeaveNodesSelectionPluginConfig;
};
