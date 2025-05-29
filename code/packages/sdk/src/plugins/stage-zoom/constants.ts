// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type { WeaveStageZoomPluginConfig } from './types';

export const WEAVE_STAGE_ZOOM_KEY = 'stageZoom';

export const WEAVE_STAGE_ZOOM_DEFAULT_CONFIG: WeaveStageZoomPluginConfig = {
  zoomSteps: [
    0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 1.75, 2, 3, 4, 6,
    8, 10,
  ],
  defaultZoom: 1,
};
