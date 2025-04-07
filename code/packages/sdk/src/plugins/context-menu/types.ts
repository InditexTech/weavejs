// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Weave } from '@/weave';
import { WeaveSelection } from '@inditextech/weavejs-types';
import { Vector2d } from 'konva/lib/types';

export type WeaveStageContextMenuPluginOptions = {
  xOffset?: number;
  yOffset?: number;
};

export type WeaveOnNodeMenuCallback = (
  instance: Weave,
  selection: WeaveSelection[],
  point: Vector2d
) => void;

export type WeaveStageContextMenuPluginCallbacks = {
  onNodeMenu: WeaveOnNodeMenuCallback;
};
