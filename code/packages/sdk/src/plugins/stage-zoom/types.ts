// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { DeepPartial } from '@inditextech/weave-types';
import type { WEAVE_STAGE_ZOOM_TYPE } from './constants';

export type WeaveStageZoomTypeKeys = keyof typeof WEAVE_STAGE_ZOOM_TYPE;
export type WeaveStageZoomType =
  (typeof WEAVE_STAGE_ZOOM_TYPE)[WeaveStageZoomTypeKeys];

export type WeaveStageZoomChanged = {
  scale: number;
  zoomSteps: number[];
  actualStep: number;
  onDefaultStep: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
};

export type WeaveStageZoomPluginOnZoomChangeEvent = WeaveStageZoomChanged;

export type WeaveStageZoomPluginConfig = {
  zoomSteps: number[];
  defaultZoom: number;
  fitToScreen: {
    padding: number;
  };
  fitToSelection: {
    padding: number;
  };
  zoomInertia: {
    friction: number;
    mouseWheelStep: number;
    trackpadStep: number;
  };
};

export type WeaveStageZoomPluginParams = {
  config?: DeepPartial<WeaveStageZoomPluginConfig>;
};
