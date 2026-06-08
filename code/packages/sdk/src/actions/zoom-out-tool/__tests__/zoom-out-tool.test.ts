// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/stage-zoom/stage-zoom', () => ({
  WeaveStageZoomPlugin: class WeaveStageZoomPlugin {},
}));
vi.mock('konva', () => ({ default: {} }));

import { WeaveZoomOutToolAction } from '../zoom-out-tool';
import { ZOOM_OUT_TOOL_ACTION_NAME } from '../constants';

type R = Record<string, unknown>;

function makeStageZoomPlugin() {
  return {
    canZoomOut: vi.fn().mockReturnValue(true),
    zoomOut: vi.fn(),
  };
}

function makeMockWeave() {
  const stageContainer = { style: { cursor: '' } };
  const stage = {
    container: vi.fn().mockReturnValue(stageContainer),
  };
  const stageZoomPlugin = makeStageZoomPlugin();

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(stageZoomPlugin),
    triggerAction: vi.fn(),
    emitEvent: vi.fn(),
    _stageContainer: stageContainer,
    _stageZoomPlugin: stageZoomPlugin,
  };
}

describe('WeaveZoomOutToolAction', () => {
  let action: WeaveZoomOutToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;

  beforeEach(() => {
    action = new WeaveZoomOutToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Suite 1: constructor ─────────────────────────────────────────────────────

  describe('constructor', () => {
    it('1.1 onPropsChange and initialize are undefined', () => {
      expect(action.onPropsChange).toBeUndefined();
      expect((action as unknown as R)['initialize']).toBeUndefined();
    });
  });

  // ── Suite 2: getName ─────────────────────────────────────────────────────────

  describe('getName', () => {
    it('2.1 returns ZOOM_OUT_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(ZOOM_OUT_TOOL_ACTION_NAME);
    });
  });

  // ── Suite 3: getStageZoomPlugin (private) ────────────────────────────────────

  describe('getStageZoomPlugin', () => {
    it('3.1 plugin present → returns plugin without throwing', () => {
      expect(() =>
        (action as unknown as R)['getStageZoomPlugin']()
      ).not.toThrow();
    });

    it('3.2 plugin absent → throws descriptive error', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() =>
        (action as unknown as R)['getStageZoomPlugin']()
      ).toThrow(
        'WeaveZoomOutToolAction requires the WeaveStageZoomPlugin to be loaded'
      );
    });
  });

  // ── Suite 4: onInit ──────────────────────────────────────────────────────────

  describe('onInit', () => {
    it('4.1 plugin present → runs without error', () => {
      expect(() => action.onInit!()).not.toThrow();
    });

    it('4.2 plugin absent → throws', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() => action.onInit!()).toThrow(
        'WeaveZoomOutToolAction requires the WeaveStageZoomPlugin to be loaded'
      );
    });
  });

  // ── Suite 5: trigger ─────────────────────────────────────────────────────────

  describe('trigger', () => {
    it('5.1 canZoomOut()=false → returns early, no zoomOut, no cancelAction', () => {
      mockWeave._stageZoomPlugin.canZoomOut.mockReturnValue(false);
      const cancelFn = vi.fn();
      action.trigger(cancelFn, { previousAction: 'selectionTool' });
      expect(mockWeave._stageZoomPlugin.zoomOut).not.toHaveBeenCalled();
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('5.2 canZoomOut()=true → calls zoomOut()', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn, { previousAction: 'selectionTool' });
      expect(mockWeave._stageZoomPlugin.zoomOut).toHaveBeenCalled();
    });

    it('5.3 canZoomOut()=true → stores previousAction from params', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn, { previousAction: 'selectionTool' });
      expect((action as unknown as R)['previousAction']).toBe('selectionTool');
    });

    it('5.4 canZoomOut()=true → calls cancelAction()', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn, { previousAction: 'selectionTool' });
      expect(cancelFn).toHaveBeenCalled();
    });
  });

  // ── Suite 6: cleanup ─────────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('6.1 previousAction truthy → calls triggerAction(previousAction)', () => {
      (action as unknown as R)['previousAction'] = 'selectionTool';
      action.cleanup();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith('selectionTool');
    });

    it('6.2 previousAction falsy → skips triggerAction', () => {
      (action as unknown as R)['previousAction'] = '';
      action.cleanup();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('6.3 always sets cursor to default', () => {
      (action as unknown as R)['previousAction'] = '';
      action.cleanup();
      expect(mockWeave._stageContainer.style.cursor).toBe('default');
    });
  });
});
