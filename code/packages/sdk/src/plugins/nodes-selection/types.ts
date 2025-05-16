// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveSelection } from '@inditextech/weave-types';
import type Konva from 'konva';

export type WeaveNodesSelectionPluginOnSelectionStateEvent = boolean;
export type WeaveNodesSelectionPluginOnNodesChangeEvent = WeaveSelection[];
export type WeaveNodesSelectionPluginOnStageSelectionEvent = undefined;

export type WeaveNodesSelectionPluginConfig = {
  transformer?: Konva.TransformerConfig;
};

export type WeaveNodesSelectionPluginParams = {
  config?: WeaveNodesSelectionPluginConfig;
};
