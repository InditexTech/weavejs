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

import { WeaveZoomInToolAction } from '../zoom-in-tool';
import { ZOOM_IN_TOOL_ACTION_NAME } from '../constants';
import { createZoomToolTests } from '../../__tests__/shared/zoom-tool.test-factory';

describe('WeaveZoomInToolAction', () => {
  createZoomToolTests({
    createAction: () => new WeaveZoomInToolAction(),
    actionName: ZOOM_IN_TOOL_ACTION_NAME,
    errorMessage:
      'WeaveZoomInToolAction requires the WeaveStageZoomPlugin to be loaded',
    canZoomMethod: 'canZoomIn',
    zoomMethod: 'zoomIn',
    makeStageZoomPlugin: () => ({
      canZoomIn: vi.fn().mockReturnValue(true),
      zoomIn: vi.fn(),
    }),
  });
});

