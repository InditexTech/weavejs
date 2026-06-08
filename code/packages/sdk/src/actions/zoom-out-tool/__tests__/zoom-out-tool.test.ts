// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, vi } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/stage-zoom/stage-zoom', () => ({
  WeaveStageZoomPlugin: class WeaveStageZoomPlugin {},
}));
vi.mock('konva', () => ({ default: {} }));

import { WeaveZoomOutToolAction } from '../zoom-out-tool';
import { ZOOM_OUT_TOOL_ACTION_NAME } from '../constants';
import { createZoomToolTests } from '../../__tests__/shared/zoom-tool.test-factory';

describe('WeaveZoomOutToolAction', () => {
  createZoomToolTests({
    createAction: () => new WeaveZoomOutToolAction(),
    actionName: ZOOM_OUT_TOOL_ACTION_NAME,
    errorMessage:
      'WeaveZoomOutToolAction requires the WeaveStageZoomPlugin to be loaded',
    canZoomMethod: 'canZoomOut',
    zoomMethod: 'zoomOut',
    makeStageZoomPlugin: () => ({
      canZoomOut: vi.fn().mockReturnValue(true),
      zoomOut: vi.fn(),
    }),
  });
});

