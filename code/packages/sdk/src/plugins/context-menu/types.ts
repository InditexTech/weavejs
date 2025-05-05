// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Weave } from '@/weave';
import { type WeaveSelection } from '@inditextech/weave-types';
import { type Vector2d } from 'konva/lib/types';

export type WeaveStageContextMenuPluginParams = {
  config?: WeaveStageContextMenuPluginConfig;
  callbacks: WeaveStageContextMenuPluginCallbacks;
};

export type WeaveStageContextMenuPluginConfig = {
  xOffset?: number;
  yOffset?: number;
};

export type WeaveOnNodeMenuCallback = (
  instance: Weave,
  selection: WeaveSelection[],
  point: Vector2d,
  visible: boolean
) => void;

export type WeaveStageContextMenuPluginCallbacks = {
  onNodeMenu: WeaveOnNodeMenuCallback;
};
