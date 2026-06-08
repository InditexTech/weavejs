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
vi.mock('konva', () => ({ default: {} }));

import { WeaveExportNodesToolAction } from '../export-nodes-tool';
import { EXPORT_NODES_TOOL_ACTION_NAME } from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';
import {
  WEAVE_EXPORT_FORMATS,
  WEAVE_EXPORT_BACKGROUND_COLOR,
  WEAVE_EXPORT_RETURN_FORMAT,
} from '@inditextech/weave-types';

// ─── helpers ──────────────────────────────────────────────────────────────────

type R = Record<string, unknown>;

const MOCK_IMG = { src: 'data:image/png;base64,abc' } as HTMLImageElement;

function makeMockWeave() {
  const container = {
    tabIndex: 0,
    focus: vi.fn(),
    click: vi.fn(),
  };
  const stage = {
    container: vi.fn().mockReturnValue(container),
  };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    exportNodes: vi.fn().mockResolvedValue(MOCK_IMG),
    triggerAction: vi.fn(),
    emitEvent: vi.fn(),
    getChildLogger: vi.fn().mockReturnValue({ debug: vi.fn() }),
    _stage: stage,
    _container: container,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveExportNodesToolAction', () => {
  let action: WeaveExportNodesToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;

  beforeEach(() => {
    action = new WeaveExportNodesToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Suite 1: constructor / static fields ──────────────────────────────────

  describe('constructor / static fields', () => {
    it('1.1 onPropsChange, onInit, initialize are undefined', () => {
      expect(action.onPropsChange).toBeUndefined();
      expect(action.onInit).toBeUndefined();
      expect(action.initialize).toBeUndefined();
    });

    it('1.2 defaultFormatOptions has expected defaults', () => {
      const defaults = (action as unknown as R)['defaultFormatOptions'] as Record<
        string,
        unknown
      >;
      expect(defaults.format).toBe(WEAVE_EXPORT_FORMATS.PNG);
      expect(defaults.padding).toBe(0);
      expect(defaults.pixelRatio).toBe(1);
      expect(defaults.backgroundColor).toBe(WEAVE_EXPORT_BACKGROUND_COLOR);
      expect(defaults.quality).toBe(1);
    });
  });

  // ── Suite 2: getName ───────────────────────────────────────────────────────

  describe('getName', () => {
    it('2.1 returns EXPORT_NODES_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(EXPORT_NODES_TOOL_ACTION_NAME);
    });
  });

  // ── Suite 3: trigger — guard ───────────────────────────────────────────────

  describe('trigger — guard', () => {
    it('3.1 !instance → throws "Instance not defined"', async () => {
      const bare = new WeaveExportNodesToolAction();
      await expect(bare.trigger(vi.fn(), { nodes: [] })).rejects.toThrow(
        'Instance not defined'
      );
    });
  });

  // ── Suite 4: trigger — normal flow ────────────────────────────────────────

  describe('trigger — normal flow', () => {
    it('4.1 sets tabIndex=1 and calls focus()', async () => {
      await action.trigger(vi.fn(), { nodes: [] });
      expect(mockWeave._container.tabIndex).toBe(1);
      expect(mockWeave._container.focus).toHaveBeenCalled();
    });

    it('4.2 options provided → merged with defaults', async () => {
      await action.trigger(vi.fn(), {
        nodes: [],
        options: { format: WEAVE_EXPORT_FORMATS.JPEG, pixelRatio: 2 },
      });
      const opts = (action as unknown as R)['options'] as Record<string, unknown>;
      expect(opts.format).toBe(WEAVE_EXPORT_FORMATS.JPEG);
      expect(opts.pixelRatio).toBe(2);
      // defaults still present for unspecified fields
      expect(opts.padding).toBe(0);
      expect(opts.quality).toBe(1);
    });

    it('4.3 options not provided → uses defaultFormatOptions entirely', async () => {
      await action.trigger(vi.fn(), { nodes: [] });
      const opts = (action as unknown as R)['options'] as Record<string, unknown>;
      expect(opts.format).toBe(WEAVE_EXPORT_FORMATS.PNG);
      expect(opts.backgroundColor).toBe(WEAVE_EXPORT_BACKGROUND_COLOR);
    });

    it('4.4 boundingNodes defined → passed to instance.exportNodes', async () => {
      const boundingFn = vi.fn().mockImplementation((n) => n);
      await action.trigger(vi.fn(), { nodes: [], boundingNodes: boundingFn });
      expect(mockWeave.exportNodes).toHaveBeenCalledWith(
        [],
        boundingFn,
        expect.anything(),
        WEAVE_EXPORT_RETURN_FORMAT.IMAGE
      );
    });

    it('4.5 boundingNodes undefined → identity function passed to instance.exportNodes', async () => {
      await action.trigger(vi.fn(), { nodes: [] });
      const [, passedFn] = mockWeave.exportNodes.mock.calls[0];
      const testNodes = [{ id: 'n1' }];
      expect(passedFn(testNodes)).toBe(testNodes); // identity: returns same array
    });

    it('4.6 cancelAction?.() called after export', async () => {
      const cancelFn = vi.fn();
      await action.trigger(cancelFn, { nodes: [] });
      expect(cancelFn).toHaveBeenCalled();
    });

    it('4.7 returns the HTMLImageElement from instance.exportNodes', async () => {
      const result = await action.trigger(vi.fn(), { nodes: [] });
      expect(result).toBe(MOCK_IMG);
    });

    it('4.8 triggerSelectionTool defaults to true', async () => {
      await action.trigger(vi.fn(), { nodes: [] });
      expect((action as unknown as R)['triggerSelectionTool']).toBe(true);
    });

    it('4.9 triggerSelectionTool=false → stored as false', async () => {
      await action.trigger(vi.fn(), { nodes: [], triggerSelectionTool: false });
      expect((action as unknown as R)['triggerSelectionTool']).toBe(false);
    });
  });

  // ── Suite 5: exportNodes (private) — boundingNodes null branch ────────────

  describe('exportNodes (private) — boundingNodes ?? fallback', () => {
    beforeEach(() => {
      // Set options so exportNodes can access this.options
      (action as unknown as R)['options'] = {
        format: WEAVE_EXPORT_FORMATS.PNG,
        padding: 0,
        pixelRatio: 1,
        backgroundColor: WEAVE_EXPORT_BACKGROUND_COLOR,
        quality: 1,
      };
    });

    it('5.1 boundingNodes=undefined → ?? fallback used (identity fn passed)', async () => {
      await (action as unknown as R)['exportNodes']([], undefined);
      const [, passedFn] = mockWeave.exportNodes.mock.calls[0];
      const testNodes = [{ id: 'n1' }];
      expect(passedFn(testNodes)).toBe(testNodes);
    });

    it('5.2 boundingNodes defined → passes it straight through', async () => {
      const boundingFn = vi.fn().mockImplementation((n) => n);
      await (action as unknown as R)['exportNodes']([], boundingFn);
      const [, passedFn] = mockWeave.exportNodes.mock.calls[0];
      expect(passedFn).toBe(boundingFn);
    });
  });

  // ── Suite 6: cleanup ──────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('6.1 sets tabIndex=0, calls click() and focus()', () => {
      action.cleanup();
      expect(mockWeave._container.tabIndex).toBe(0);
      expect(mockWeave._container.click).toHaveBeenCalled();
      expect(mockWeave._container.focus).toHaveBeenCalled();
    });

    it('6.2 triggerSelectionTool=true → triggerAction(SELECTION_TOOL_ACTION_NAME) called', () => {
      (action as unknown as R)['triggerSelectionTool'] = true;
      action.cleanup();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('6.3 triggerSelectionTool=false → triggerAction NOT called', () => {
      (action as unknown as R)['triggerSelectionTool'] = false;
      action.cleanup();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });
  });

  // ── Suite 7: cancelAction null-safety ─────────────────────────────────────

  describe('cancelAction null-safety', () => {
    it('7.1 cancelAction=undefined → cancelAction?.() does not throw', async () => {
      // Passing undefined bypasses the type but exercises the ?. null branch
      await expect(
        action.trigger(undefined as unknown as () => void, { nodes: [] })
      ).resolves.toBe(MOCK_IMG);
    });
  });
});
