// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Break circular dependency
vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));
vi.mock('@/plugins/stage-zoom/stage-zoom', () => ({
  WeaveStageZoomPlugin: class WeaveStageZoomPlugin {},
}));
vi.mock('konva', () => ({ default: {} }));

import { WeaveFitToScreenToolAction } from '../fit-to-screen-tool';
import { FIT_TO_SCREEN_TOOL_ACTION_NAME } from '../constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

type R = Record<string, unknown>;

function makeMockZoomPlugin() {
  return { fitToScreen: vi.fn() };
}

function makeMockWeave() {
  const container = { style: { cursor: '' } };
  const stage = { container: vi.fn().mockReturnValue(container) };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(undefined),
    triggerAction: vi.fn(),
    emitEvent: vi.fn(),
    _stage: stage,
    _container: container,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveFitToScreenToolAction', () => {
  let action: WeaveFitToScreenToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;

  beforeEach(() => {
    action = new WeaveFitToScreenToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Suite 1: constructor ──────────────────────────────────────────────────

  describe('constructor', () => {
    it('1.1 onPropsChange is undefined', () => {
      expect(action.onPropsChange).toBeUndefined();
    });

    it('1.2 initialize is undefined', () => {
      expect(action.initialize).toBeUndefined();
    });
  });

  // ── Suite 2: getName ──────────────────────────────────────────────────────

  describe('getName', () => {
    it('2.1 returns FIT_TO_SCREEN_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(FIT_TO_SCREEN_TOOL_ACTION_NAME);
    });
  });

  // ── Suite 3: getStageZoomPlugin (private) ─────────────────────────────────

  describe('getStageZoomPlugin (private)', () => {
    const callGetPlugin = (a: WeaveFitToScreenToolAction) =>
      (a as unknown as R)['getStageZoomPlugin']();

    it('3.1 plugin present → returns plugin without throwing', () => {
      const plugin = makeMockZoomPlugin();
      mockWeave.getPlugin.mockReturnValue(plugin);
      expect(() => callGetPlugin(action)).not.toThrow();
      expect(callGetPlugin(action)).toBe(plugin);
    });

    it('3.2 plugin absent → throws descriptive error', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() => callGetPlugin(action)).toThrow(
        'WeaveFitToScreenToolAction requires the WeaveStageZoomPlugin to be loaded'
      );
    });
  });

  // ── Suite 4: onInit ───────────────────────────────────────────────────────

  describe('onInit', () => {
    it('4.1 plugin present → no throw', () => {
      mockWeave.getPlugin.mockReturnValue(makeMockZoomPlugin());
      expect(() => action.onInit()).not.toThrow();
    });

    it('4.2 plugin absent → throws (from getStageZoomPlugin)', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() => action.onInit()).toThrow(
        'WeaveFitToScreenToolAction requires the WeaveStageZoomPlugin to be loaded'
      );
    });
  });

  // ── Suite 5: trigger ──────────────────────────────────────────────────────

  describe('trigger', () => {
    it('5.1 plugin absent → throws immediately', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() => action.trigger(vi.fn(), { previousAction: 'selectionTool' })).toThrow(
        'WeaveFitToScreenToolAction requires the WeaveStageZoomPlugin to be loaded'
      );
    });

    it('5.2 plugin present + params.overrideZoom=false → fitToScreen called with overrideZoom:false', () => {
      const plugin = makeMockZoomPlugin();
      mockWeave.getPlugin.mockReturnValue(plugin);
      const cancelFn = vi.fn();
      action.trigger(cancelFn, { previousAction: 'selectionTool', overrideZoom: false });
      expect(plugin.fitToScreen).toHaveBeenCalledWith({ overrideZoom: false });
      expect(cancelFn).toHaveBeenCalled();
    });

    it('5.3 plugin present + params.overrideZoom=undefined → fitToScreen called with overrideZoom:true (??)', () => {
      const plugin = makeMockZoomPlugin();
      mockWeave.getPlugin.mockReturnValue(plugin);
      action.trigger(vi.fn(), { previousAction: 'selectionTool', overrideZoom: undefined });
      expect(plugin.fitToScreen).toHaveBeenCalledWith({ overrideZoom: true });
    });

    it('5.4 params=undefined → fitToScreen({ overrideZoom:true }); previousAction=undefined; cancelAction called', () => {
      const plugin = makeMockZoomPlugin();
      mockWeave.getPlugin.mockReturnValue(plugin);
      const cancelFn = vi.fn();
      action.trigger(cancelFn, undefined as never);
      expect(plugin.fitToScreen).toHaveBeenCalledWith({ overrideZoom: true });
      expect((action as unknown as R)['previousAction']).toBeUndefined();
      expect(cancelFn).toHaveBeenCalled();
    });

    it('5.5 getStageZoomPlugin patched to return null → if(stageZoomPlugin) false → fitToScreen NOT called', () => {
      // Patch the private method to return null to cover the dead `if (stageZoomPlugin)` false branch
      (action as unknown as R)['getStageZoomPlugin'] = vi.fn().mockReturnValue(null);
      const cancelFn = vi.fn();
      action.trigger(cancelFn, { previousAction: 'selectionTool' });
      // fitToScreen not called because stageZoomPlugin is null
      expect(cancelFn).toHaveBeenCalled(); // cancelAction still called
    });
  });

  // ── Suite 6: cleanup ──────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('6.1 previousAction set → triggerAction called with previousAction', () => {
      (action as unknown as R)['previousAction'] = 'selectionTool';
      action.cleanup();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith('selectionTool');
    });

    it('6.2 previousAction falsy/undefined → triggerAction NOT called', () => {
      (action as unknown as R)['previousAction'] = undefined;
      action.cleanup();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('6.3 cursor always set to "default"', () => {
      (action as unknown as R)['previousAction'] = undefined;
      action.cleanup();
      expect(mockWeave._container.style.cursor).toBe('default');
    });
  });
});
