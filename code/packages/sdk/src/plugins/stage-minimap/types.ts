// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { DeepPartial } from '@inditextech/weave-types';
import Konva from 'konva';

export type WeaveStageMinimapPluginStyle = {
  viewportReference: Konva.RectConfig;
};

export type WeaveStageMinimapPluginConfig = {
  getContainer: () => HTMLElement;
  id: string;
  width: number;
  fitToContentPadding: number;
  style: WeaveStageMinimapPluginStyle;
};

export type WeaveStageMinimapPluginParams = {
  config: Pick<
    WeaveStageMinimapPluginConfig,
    'getContainer' | 'id' | 'width' | 'fitToContentPadding'
  > &
    DeepPartial<Pick<WeaveStageMinimapPluginConfig, 'style'>>;
};
