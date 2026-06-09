// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type R = Record<string, unknown>;

export interface ZoomToolTestConfig {
  createAction: () => { getName(): string; onInit?(): void; trigger(cancelAction: () => void, params: { previousAction: string }): void; cleanup(): void; onPropsChange: unknown };
  actionName: string;
  errorMessage: string;
  canZoomMethod: string;
  zoomMethod: string;
  makeStageZoomPlugin: () => Record<string, ReturnType<typeof vi.fn>>;
}

export function createZoomToolTests(config: ZoomToolTestConfig) {
  const {
    createAction,
    actionName,
    errorMessage,
    canZoomMethod,
    zoomMethod,
    makeStageZoomPlugin,
  } = config;

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

  let action: ReturnType<typeof createAction>;
  let mockWeave: ReturnType<typeof makeMockWeave>;

  beforeEach(() => {
    action = createAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('1.1 onPropsChange and initialize are undefined', () => {
      expect(action.onPropsChange).toBeUndefined();
      expect((action as unknown as R)['initialize']).toBeUndefined();
    });
  });

  describe('getName', () => {
    it(`2.1 returns ${actionName}`, () => {
      expect(action.getName()).toBe(actionName);
    });
  });

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
      ).toThrow(errorMessage);
    });
  });

  describe('onInit', () => {
    it('4.1 plugin present → runs without error', () => {
      expect(() => action.onInit!()).not.toThrow();
    });

    it('4.2 plugin absent → throws', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() => action.onInit!()).toThrow(errorMessage);
    });
  });

  describe('trigger', () => {
    it(`5.1 ${canZoomMethod}()=false → returns early, no ${zoomMethod}, no cancelAction`, () => {
      mockWeave._stageZoomPlugin[canZoomMethod].mockReturnValue(false);
      const cancelFn = vi.fn();
      action.trigger(cancelFn, { previousAction: 'selectionTool' });
      expect(mockWeave._stageZoomPlugin[zoomMethod]).not.toHaveBeenCalled();
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it(`5.2 ${canZoomMethod}()=true → calls ${zoomMethod}()`, () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn, { previousAction: 'selectionTool' });
      expect(mockWeave._stageZoomPlugin[zoomMethod]).toHaveBeenCalled();
    });

    it(`5.3 ${canZoomMethod}()=true → stores previousAction from params`, () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn, { previousAction: 'selectionTool' });
      expect((action as unknown as R)['previousAction']).toBe('selectionTool');
    });

    it(`5.4 ${canZoomMethod}()=true → calls cancelAction()`, () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn, { previousAction: 'selectionTool' });
      expect(cancelFn).toHaveBeenCalled();
    });
  });

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
}
