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

import { WeaveFitToSelectionToolAction } from '../fit-to-selection-tool';
import { FIT_TO_SELECTION_TOOL_ACTION_NAME } from '../constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

type R = Record<string, unknown>;

function makeMockZoomPlugin() {
  return { fitToSelection: vi.fn() };
}

function makeMockSelectionPlugin() {
  return { setSelectedNodes: vi.fn() };
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

describe('WeaveFitToSelectionToolAction', () => {
  let action: WeaveFitToSelectionToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;

  beforeEach(() => {
    action = new WeaveFitToSelectionToolAction();
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
    it('2.1 returns FIT_TO_SELECTION_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(FIT_TO_SELECTION_TOOL_ACTION_NAME);
    });
  });

  // ── Suite 3: getNodesSelectionPlugin (private) ────────────────────────────

  describe('getNodesSelectionPlugin (private)', () => {
    const callGet = (a: WeaveFitToSelectionToolAction) =>
      (a as unknown as R)['getNodesSelectionPlugin']();

    it('3.1 plugin present → returns without throwing', () => {
      const plugin = makeMockSelectionPlugin();
      mockWeave.getPlugin.mockReturnValue(plugin);
      expect(() => callGet(action)).not.toThrow();
      expect(callGet(action)).toBe(plugin);
    });

    it('3.2 plugin absent → throws descriptive error', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() => callGet(action)).toThrow(
        'WeaveFitToSelectionToolAction requires the WeaveNodesSelectionPlugin to be loaded'
      );
    });
  });

  // ── Suite 4: getStageZoomPlugin (private) ─────────────────────────────────

  describe('getStageZoomPlugin (private)', () => {
    const callGet = (a: WeaveFitToSelectionToolAction) =>
      (a as unknown as R)['getStageZoomPlugin']();

    it('4.1 plugin present → returns without throwing', () => {
      const plugin = makeMockZoomPlugin();
      mockWeave.getPlugin.mockReturnValue(plugin);
      expect(() => callGet(action)).not.toThrow();
      expect(callGet(action)).toBe(plugin);
    });

    it('4.2 plugin absent → throws descriptive error', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() => callGet(action)).toThrow(
        'WeaveFitToSelectionToolAction requires the WeaveStageZoomPlugin to be loaded'
      );
    });
  });

  // ── Suite 5: onInit ───────────────────────────────────────────────────────

  describe('onInit', () => {
    it('5.1 both plugins present → no throw', () => {
      // getPlugin is called with 'stageZoom' first, then 'nodesSelection'
      mockWeave.getPlugin.mockImplementation((name: string) => {
        if (name === 'stageZoom') return makeMockZoomPlugin();
        if (name === 'nodesSelection') return makeMockSelectionPlugin();
        return undefined;
      });
      expect(() => action.onInit()).not.toThrow();
    });

    it('5.2 stageZoom absent → throws (first getter fails)', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() => action.onInit()).toThrow(
        'WeaveFitToSelectionToolAction requires the WeaveStageZoomPlugin to be loaded'
      );
    });

    it('5.3 stageZoom present, nodesSelection absent → throws (second getter fails)', () => {
      mockWeave.getPlugin.mockImplementation((name: string) => {
        if (name === 'stageZoom') return makeMockZoomPlugin();
        return undefined; // nodesSelection absent
      });
      expect(() => action.onInit()).toThrow(
        'WeaveFitToSelectionToolAction requires the WeaveNodesSelectionPlugin to be loaded'
      );
    });
  });

  // ── Suite 6: trigger ──────────────────────────────────────────────────────

  describe('trigger', () => {
    it('6.1 stageZoom absent → throws immediately', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() =>
        action.trigger(vi.fn(), { previousAction: 'selectionTool' })
      ).toThrow('WeaveFitToSelectionToolAction requires the WeaveStageZoomPlugin to be loaded');
    });

    it('6.2 all params defined → fitToSelection({ smartZoom:true, overrideZoom:false })', () => {
      const plugin = makeMockZoomPlugin();
      mockWeave.getPlugin.mockReturnValue(plugin);
      const cancelFn = vi.fn();
      action.trigger(cancelFn, {
        previousAction: 'selectionTool',
        smartZoom: true,
        overrideZoom: false,
      });
      expect(plugin.fitToSelection).toHaveBeenCalledWith({ smartZoom: true, overrideZoom: false });
      expect(cancelFn).toHaveBeenCalled();
    });

    it('6.3 smartZoom=undefined → fitToSelection({ smartZoom:false, … }) (?? false branch)', () => {
      const plugin = makeMockZoomPlugin();
      mockWeave.getPlugin.mockReturnValue(plugin);
      action.trigger(vi.fn(), {
        previousAction: 'selectionTool',
        smartZoom: undefined,
        overrideZoom: true,
      });
      expect(plugin.fitToSelection).toHaveBeenCalledWith({ smartZoom: false, overrideZoom: true });
    });

    it('6.4 overrideZoom=undefined → fitToSelection({ …, overrideZoom:true }) (?? true branch)', () => {
      const plugin = makeMockZoomPlugin();
      mockWeave.getPlugin.mockReturnValue(plugin);
      action.trigger(vi.fn(), {
        previousAction: 'selectionTool',
        smartZoom: false,
        overrideZoom: undefined,
      });
      expect(plugin.fitToSelection).toHaveBeenCalledWith({ smartZoom: false, overrideZoom: true });
    });

    it('6.5 params=undefined → all ?. null branches; cancelAction still called', () => {
      const plugin = makeMockZoomPlugin();
      mockWeave.getPlugin.mockReturnValue(plugin);
      const cancelFn = vi.fn();
      action.trigger(cancelFn, undefined as never);
      expect(plugin.fitToSelection).toHaveBeenCalledWith({ smartZoom: false, overrideZoom: true });
      expect((action as unknown as R)['previousAction']).toBeUndefined();
      expect(cancelFn).toHaveBeenCalled();
    });
  });

  // ── Suite 7: cleanup ──────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('7.1 previousAction set → triggerAction called with previousAction', () => {
      (action as unknown as R)['previousAction'] = 'selectionTool';
      action.cleanup();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith('selectionTool');
    });

    it('7.2 previousAction falsy/undefined → triggerAction NOT called', () => {
      (action as unknown as R)['previousAction'] = undefined;
      action.cleanup();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('7.3 cursor always set to "default"', () => {
      (action as unknown as R)['previousAction'] = undefined;
      action.cleanup();
      expect(mockWeave._container.style.cursor).toBe('default');
    });
  });
});
