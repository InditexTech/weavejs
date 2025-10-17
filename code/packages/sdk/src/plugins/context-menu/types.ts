// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type WeaveSelection } from '@inditextech/weave-types';
import type Konva from 'konva';

export type WeaveStageContextMenuPluginParams = {
  config?: WeaveStageContextMenuPluginConfig;
};

export type WeaveStageContextMenuPluginConfig = {
  xOffset?: number;
  yOffset?: number;
};

export type WeaveStageContextMenuPluginOnNodeContextMenuEvent = {
  selection: WeaveSelection[];
  contextMenuPoint: Konva.Vector2d;
  clickPoint: Konva.Vector2d;
  stageClickPoint: Konva.Vector2d;
  visible: boolean;
};
