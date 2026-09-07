// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveSelection } from '@inditextech/weave-types';
import type Konva from 'konva';

export type WeaveNodesSelectionPluginOnSelectionStateEvent = boolean;
export type WeaveNodesSelectionPluginOnNodesChangeEvent = WeaveSelection[];
export type WeaveNodesSelectionPluginOnStageSelectionEvent = undefined;
export type WeaveNodesSelectionPluginOnGroupContextChangeEvent =
  | string
  | null;

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

export type WeaveNodesSelectionMode = 'intersects' | 'contains';

export type WeaveNodesSelectionConfig = {
  selection: Konva.TransformerConfig;
  hover: Konva.TransformerConfig;
  selectionArea: Konva.RectConfig;
  panningWhenSelection: WeaveNodesSelectionPanningOnSelectionConfig;
  behaviors: WeaveNodesSelectionBehaviorsConfig;
  style: WeaveNodesSelectionStyleConfig;
  /**
   * Controls how a drag-selection rectangle picks up nodes:
   * - 'intersects' (default): a node is selected if its bounding box merely
   *   overlaps the drag rectangle.
   * - 'contains': a node is selected only if its bounding box is fully
   *   enclosed by the drag rectangle. For group nodes, containment is
   *   checked against the group's own outer bounding box, not per child.
   *
   * Frame nodes are always selected using containment, regardless of this
   * setting — that behavior predates this option and is unaffected by it.
   */
  selectionMode: WeaveNodesSelectionMode;
};

export type WeaveNodesSelectionStyleConfig = {
  dragOpacity: number;
};

export type WeaveNodesSelectionPluginConfig =
  Partial<WeaveNodesSelectionConfig>;

export type WeaveNodesSelectionPluginParams = {
  config?: WeaveNodesSelectionPluginConfig;
};
