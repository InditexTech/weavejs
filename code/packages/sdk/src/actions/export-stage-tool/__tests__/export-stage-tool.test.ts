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

import { WeaveExportStageToolAction } from '../export-stage-tool';
import { EXPORT_STAGE_TOOL_ACTION_NAME } from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';
import {
  WEAVE_EXPORT_FORMATS,
  WEAVE_EXPORT_BACKGROUND_COLOR,
  WEAVE_EXPORT_RETURN_FORMAT,
} from '@inditextech/weave-types';

// ─── helpers ──────────────────────────────────────────────────────────────────

type R = Record<string, unknown>;

const MOCK_IMG = { src: 'data:image/png;base64,abc' } as HTMLImageElement;
const MOCK_CHILDREN = [{ id: 'node-1' }, { id: 'node-2' }];

function makeMockWeave() {
  const container = { tabIndex: 0, focus: vi.fn(), click: vi.fn() };
  const stage = { container: vi.fn().mockReturnValue(container) };
  const mainLayer = { getChildren: vi.fn().mockReturnValue(MOCK_CHILDREN) };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getMainLayer: vi.fn().mockReturnValue(mainLayer),
    exportNodes: vi.fn().mockResolvedValue(MOCK_IMG),
    triggerAction: vi.fn(),
    emitEvent: vi.fn(),
    getChildLogger: vi.fn().mockReturnValue({ debug: vi.fn() }),
    _stage: stage,
    _container: container,
    _mainLayer: mainLayer,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveExportStageToolAction', () => {
  let action: WeaveExportStageToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;

  beforeEach(() => {
    action = new WeaveExportStageToolAction();
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
    it('2.1 returns EXPORT_STAGE_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(EXPORT_STAGE_TOOL_ACTION_NAME);
    });
  });

  // ── Suite 3: trigger — guard ───────────────────────────────────────────────

  describe('trigger — guard', () => {
    it('3.1 !instance → throws "Instance not defined"', async () => {
      const bare = new WeaveExportStageToolAction();
      await expect(bare.trigger(vi.fn(), {})).rejects.toThrow('Instance not defined');
    });
  });

  // ── Suite 4: trigger — normal flow ────────────────────────────────────────

  describe('trigger — normal flow', () => {
    it('4.1 sets tabIndex=1 and calls focus()', async () => {
      await action.trigger(vi.fn(), {});
      expect(mockWeave._container.tabIndex).toBe(1);
      expect(mockWeave._container.focus).toHaveBeenCalled();
    });

    it('4.2 options provided → merged with defaults', async () => {
      await action.trigger(vi.fn(), {
        options: { format: WEAVE_EXPORT_FORMATS.JPEG, pixelRatio: 3 },
      });
      const opts = (action as unknown as R)['options'] as Record<string, unknown>;
      expect(opts.format).toBe(WEAVE_EXPORT_FORMATS.JPEG);
      expect(opts.pixelRatio).toBe(3);
      expect(opts.padding).toBe(0); // default preserved
    });

    it('4.3 options not provided → uses defaultFormatOptions entirely', async () => {
      await action.trigger(vi.fn(), {});
      const opts = (action as unknown as R)['options'] as Record<string, unknown>;
      expect(opts.format).toBe(WEAVE_EXPORT_FORMATS.PNG);
      expect(opts.backgroundColor).toBe(WEAVE_EXPORT_BACKGROUND_COLOR);
    });

    it('4.4 boundingNodes defined → passed to instance.exportNodes', async () => {
      const boundingFn = vi.fn().mockImplementation((n) => n);
      await action.trigger(vi.fn(), { boundingNodes: boundingFn });
      expect(mockWeave.exportNodes).toHaveBeenCalledWith(
        MOCK_CHILDREN,
        boundingFn,
        expect.anything(),
        WEAVE_EXPORT_RETURN_FORMAT.IMAGE
      );
    });

    it('4.5 boundingNodes undefined → identity function passed', async () => {
      await action.trigger(vi.fn(), {});
      const [, passedFn] = mockWeave.exportNodes.mock.calls[0];
      const testNodes = [{ id: 'x' }];
      expect(passedFn(testNodes)).toBe(testNodes);
    });

    it('4.6 cancelAction?.() called after export', async () => {
      const cancelFn = vi.fn();
      await action.trigger(cancelFn, {});
      expect(cancelFn).toHaveBeenCalled();
    });

    it('4.7 returns the HTMLImageElement from instance.exportNodes', async () => {
      const result = await action.trigger(vi.fn(), {});
      expect(result).toBe(MOCK_IMG);
    });
  });

  // ── Suite 5: exportStage (private) — mainLayer null branch ────────────────

  describe('exportStage (private) — mainLayer?.getChildren() ?? []', () => {
    beforeEach(() => {
      (action as unknown as R)['options'] = {
        format: WEAVE_EXPORT_FORMATS.PNG,
        padding: 0,
        pixelRatio: 1,
        backgroundColor: WEAVE_EXPORT_BACKGROUND_COLOR,
        quality: 1,
      };
    });

    it('5.1 mainLayer defined → getChildren() result passed as nodes', async () => {
      await (action as unknown as R)['exportStage']((n: unknown) => n);
      expect(mockWeave._mainLayer.getChildren).toHaveBeenCalled();
      expect(mockWeave.exportNodes).toHaveBeenCalledWith(
        MOCK_CHILDREN,
        expect.anything(),
        expect.anything(),
        WEAVE_EXPORT_RETURN_FORMAT.IMAGE
      );
    });

    it('5.2 mainLayer=null → ?? fallback [] passed as nodes', async () => {
      mockWeave.getMainLayer.mockReturnValue(null);
      await (action as unknown as R)['exportStage']((n: unknown) => n);
      expect(mockWeave.exportNodes).toHaveBeenCalledWith(
        [],
        expect.anything(),
        expect.anything(),
        WEAVE_EXPORT_RETURN_FORMAT.IMAGE
      );
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

    it('6.2 always calls triggerAction(SELECTION_TOOL_ACTION_NAME)', () => {
      action.cleanup();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });
  });

  // ── Suite 7: cancelAction null-safety ─────────────────────────────────────

  describe('cancelAction null-safety', () => {
    it('7.1 cancelAction=undefined → cancelAction?.() does not throw', async () => {
      await expect(
        action.trigger(undefined as unknown as () => void, {})
      ).resolves.toBe(MOCK_IMG);
    });
  });
});
