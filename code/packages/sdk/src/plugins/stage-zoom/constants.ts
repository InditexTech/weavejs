// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveStageZoomPluginConfig } from './types';

export const WEAVE_STAGE_ZOOM_TYPE = {
  MOUSE_WHEEL: 'mouseWheel',
  PINCH_ZOOM: 'pinchZoom',
} as const;

export const WEAVE_STAGE_ZOOM_KEY = 'stageZoom';

export const WEAVE_STAGE_ZOOM_DEFAULT_CONFIG: WeaveStageZoomPluginConfig = {
  zoomInertia: {
    friction: 0.9,
    mouseWheelStep: 0.01,
  },
  zoomSteps: [
    0.01, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 1.75,
    2, 3, 4, 6, 8, 10, 20, 50, 100, 250,
  ],
  defaultZoom: 1,
  fitToScreen: {
    padding: 40,
  },
  fitToSelection: {
    padding: 40,
  },
};
