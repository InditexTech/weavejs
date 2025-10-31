// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { DeepPartial } from '@inditextech/weave-types';

export type WeaveNodesMultiSelectionFeedbackStyle = {
  stroke: string;
  strokeWidth: number;
  fill: string;
};

export type WeaveNodesMultiSelectionFeedbackConfig = {
  style: WeaveNodesMultiSelectionFeedbackStyle;
};

export type WeaveNodesMultiSelectionFeedbackPluginConfig =
  DeepPartial<WeaveNodesMultiSelectionFeedbackConfig>;

export type WeaveNodesMultiSelectionFeedbackPluginParams = {
  config?: WeaveNodesMultiSelectionFeedbackPluginConfig;
};
