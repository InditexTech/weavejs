// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveElementInstance,
  type WeaveExportNodesOptions,
} from '@inditextech/weave-types';
import type Konva from 'konva';

export type WeaveExportNodesActionParams = {
  nodes: WeaveElementInstance[];
  boundingNodes?: (nodes: Konva.Node[]) => Konva.Node[];
  options?: WeaveExportNodesOptions;
  triggerSelectionTool?: boolean;
  download?: boolean;
};
