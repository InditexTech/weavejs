// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveSelection } from '@inditextech/weave-types';
import { type Vector2d } from 'konva/lib/types';

export type WeaveStageContextMenuPluginParams = {
  config?: WeaveStageContextMenuPluginConfig;
};

export type WeaveStageContextMenuPluginConfig = {
  xOffset?: number;
  yOffset?: number;
};

export type WeaveStageContextMenuPluginOnNodeContextMenuEvent = {
  selection: WeaveSelection[];
  contextMenuPoint: Vector2d;
  clickPoint: Vector2d;
  visible: boolean;
};
