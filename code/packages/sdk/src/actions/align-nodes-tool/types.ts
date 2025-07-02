// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ALIGN_NODES_TOOL_STATE, ALIGN_NODES_ALIGN_TO } from './constants';

export type WeaveAlignNodesToolActionStateKeys =
  keyof typeof ALIGN_NODES_TOOL_STATE;
export type WeaveAlignNodesToolActionState =
  (typeof ALIGN_NODES_TOOL_STATE)[WeaveAlignNodesToolActionStateKeys];

export type WeaveAlignNodesToolActionAlignToKeys =
  keyof typeof ALIGN_NODES_ALIGN_TO;
export type WeaveAlignNodesToolActionAlignTo =
  (typeof ALIGN_NODES_ALIGN_TO)[WeaveAlignNodesToolActionAlignToKeys];

export type WeaveAlignNodesToolActionTriggerParams = {
  alignTo: WeaveAlignNodesToolActionAlignTo;
  triggerSelectionTool?: boolean;
};
