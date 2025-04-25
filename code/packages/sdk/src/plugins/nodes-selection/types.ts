// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveSelection } from '@inditextech/weave-types';

export type WeaveNodesSelectionChangeCallback = (
  nodes: WeaveSelection[]
) => void;
export type WeaveNodesSelectionStageSelectionCallback = () => void;

export type WeaveNodesSelectionPluginCallbacks = {
  onNodesChange: WeaveNodesSelectionChangeCallback;
  onStageSelection?: WeaveNodesSelectionStageSelectionCallback;
};
