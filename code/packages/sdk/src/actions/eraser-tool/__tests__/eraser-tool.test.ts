// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Break circular dependency: action.ts → @/weave → managers/async → @/index.node → index.common → …
vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));

// No Konva shapes needed — eraser-tool only deletes nodes.
vi.mock('konva', () => ({ default: {} }));

// In Vitest node environment, `window` is not defined — alias it to globalThis
if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { type R } from '../../__tests__/shared/action.test-helpers';
import { WeaveEraserToolAction } from '../eraser-tool';
import { ERASER_TOOL_ACTION_NAME, ERASER_TOOL_STATE } from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeMockRealNode(nodeType = 'rect') {
  return {
    getAttrs: vi.fn().mockReturnValue({ nodeType }),
    destroy: vi.fn(),
  };
}

function makeMockWeave() {
  const container = {
    tabIndex: 0,
    focus: vi.fn(),
    blur: vi.fn(),
    style: { cursor: '' },
  };

  const stageHandlers: Record<string, (e?: unknown) => void> = {};
  const stage = {
    container: vi.fn().mockReturnValue(container),
    on: vi.fn((event: string, handler: (e?: unknown) => void) => {
      stageHandlers[event] = handler;
    }),
  };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(undefined),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    getActiveAction: vi.fn().mockReturnValue(ERASER_TOOL_ACTION_NAME),
    getEventsController: vi.fn().mockReturnValue({ signal: new AbortController().signal }),
    pointIntersectsElement: vi.fn().mockReturnValue(undefined),
    resolveNode: vi.fn().mockReturnValue(undefined),
    allNodesLocked: vi.fn().mockReturnValue(false),
    removeNode: vi.fn(),
    triggerAction: vi.fn(),
    emitEvent: vi.fn(),
    _stage: stage,
    _container: container,
    _stageHandlers: stageHandlers,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveEraserToolAction', () => {
  let action: WeaveEraserToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let windowHandlers: Record<string, (e: unknown) => void>;

  beforeEach(() => {
    windowHandlers = {};
    vi.stubGlobal(
      'addEventListener',
      vi.fn((type: string, handler: (e: unknown) => void) => {
        windowHandlers[type] = handler;
      })
    );

    action = new WeaveEraserToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
    (action as unknown as R)['cancelAction'] = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function triggerAndCapture(cancelFn = vi.fn()) {
    action.trigger(cancelFn);
    return { cancelFn, handlers: mockWeave._stageHandlers };
  }

  // ── Suite 1: constructor / initialize ─────────────────────────────────────

  describe('constructor / initialize', () => {
    it('1.1 initialized is false after construction', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
    });

    it('1.2 erasing is false after construction', () => {
      expect((action as unknown as R)['erasing']).toBe(false);
    });

    it('1.3 state is ERASER_TOOL_STATE.IDLE after construction', () => {
      expect((action as unknown as R)['state']).toBe(ERASER_TOOL_STATE.IDLE);
    });

    it('1.4 onPropsChange and onInit are undefined', () => {
      expect(action.onPropsChange).toBeUndefined();
      expect(action.onInit).toBeUndefined();
    });
  });

  // ── Suite 2: getName ───────────────────────────────────────────────────────

  describe('getName', () => {
    it('2.1 returns ERASER_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(ERASER_TOOL_ACTION_NAME);
    });
  });

  // ── Suite 3: setupEvents – pointermove ────────────────────────────────────

  describe('setupEvents – pointermove', () => {
    let handlers: Record<string, (e?: unknown) => void>;

    beforeEach(() => {
      const result = triggerAndCapture();
      handlers = result.handlers;
    });

    it('3.1 state=IDLE → early return, cursor NOT changed', () => {
      (action as unknown as R)['state'] = ERASER_TOOL_STATE.IDLE;
      mockWeave._container.style.cursor = '';
      handlers['pointermove']?.();
      expect(mockWeave._container.style.cursor).toBe('');
    });

    it('3.2 state=ERASING → setCursor() called (cursor → "crosshair")', () => {
      (action as unknown as R)['state'] = ERASER_TOOL_STATE.ERASING;
      mockWeave._container.style.cursor = '';
      handlers['pointermove']?.();
      expect(mockWeave._container.style.cursor).toBe('crosshair');
    });
  });

  // ── Suite 4: setupEvents – pointerclick ───────────────────────────────────

  describe('setupEvents – pointerclick', () => {
    let handlers: Record<string, (e?: unknown) => void>;

    beforeEach(() => {
      const result = triggerAndCapture();
      handlers = result.handlers;
    });

    it('4.1 erasing=false → early return, resolveNode NOT called', () => {
      (action as unknown as R)['erasing'] = false;
      handlers['pointerclick']?.();
      expect(mockWeave.pointIntersectsElement).not.toHaveBeenCalled();
    });

    it('4.2 erasing=true + nodeIntersected=null → skips resolveNode', () => {
      (action as unknown as R)['erasing'] = true;
      mockWeave.pointIntersectsElement.mockReturnValue(null);
      handlers['pointerclick']?.();
      expect(mockWeave.resolveNode).not.toHaveBeenCalled();
    });

    it('4.3 erasing=true + nodeIntersected found + resolveNode returns null → early return', () => {
      (action as unknown as R)['erasing'] = true;
      const intersected = { id: 'node-1' };
      mockWeave.pointIntersectsElement.mockReturnValue(intersected);
      mockWeave.resolveNode.mockReturnValue(null);
      handlers['pointerclick']?.();
      expect(mockWeave.getNodeHandler).not.toHaveBeenCalled();
      expect(mockWeave.removeNode).not.toHaveBeenCalled();
    });

    it('4.4 erasing=true + realNode found + nodeHandler + not locked → removeNode() called', () => {
      (action as unknown as R)['erasing'] = true;
      const intersected = { id: 'node-1' };
      const realNode = makeMockRealNode('rect');
      mockWeave.pointIntersectsElement.mockReturnValue(intersected);
      mockWeave.resolveNode.mockReturnValue(realNode);
      mockWeave.allNodesLocked.mockReturnValue(false);
      const nodeHandler = {
        serialize: vi.fn().mockReturnValue({ id: 'node-1', type: 'rect', props: {} }),
      };
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      handlers['pointerclick']?.();
      expect(nodeHandler.serialize).toHaveBeenCalledWith(realNode);
      expect(mockWeave.removeNode).toHaveBeenCalledWith({ id: 'node-1', type: 'rect', props: {} });
    });

    it('4.5 nodeHandler absent → removeNode() NOT called', () => {
      (action as unknown as R)['erasing'] = true;
      const intersected = { id: 'node-1' };
      const realNode = makeMockRealNode('rect');
      mockWeave.pointIntersectsElement.mockReturnValue(intersected);
      mockWeave.resolveNode.mockReturnValue(realNode);
      mockWeave.allNodesLocked.mockReturnValue(false);
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      handlers['pointerclick']?.();
      expect(mockWeave.removeNode).not.toHaveBeenCalled();
    });

    it('4.6 isLocked=true → removeNode() NOT called', () => {
      (action as unknown as R)['erasing'] = true;
      const intersected = { id: 'node-1' };
      const realNode = makeMockRealNode('rect');
      mockWeave.pointIntersectsElement.mockReturnValue(intersected);
      mockWeave.resolveNode.mockReturnValue(realNode);
      mockWeave.allNodesLocked.mockReturnValue(true);
      const nodeHandler = { serialize: vi.fn() };
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      handlers['pointerclick']?.();
      expect(mockWeave.removeNode).not.toHaveBeenCalled();
    });
  });

  // ── Suite 5: setupEvents – keydown ────────────────────────────────────────

  describe('setupEvents – keydown', () => {
    beforeEach(() => {
      triggerAndCapture();
    });

    it('5.1 Escape + active=eraserTool → cancelAction() called', () => {
      const cancelAction = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelAction;
      mockWeave.getActiveAction.mockReturnValue(ERASER_TOOL_ACTION_NAME);
      windowHandlers['keydown']?.({ code: 'Escape' });
      expect(cancelAction).toHaveBeenCalled();
    });

    it('5.2 Escape + active≠eraserTool → cancelAction() NOT called', () => {
      const cancelAction = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelAction;
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      windowHandlers['keydown']?.({ code: 'Escape' });
      expect(cancelAction).not.toHaveBeenCalled();
    });

    it('5.3 other key → nothing', () => {
      const cancelAction = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelAction;
      windowHandlers['keydown']?.({ code: 'KeyA' });
      expect(cancelAction).not.toHaveBeenCalled();
    });

  });

  // ── Suite 6: trigger ──────────────────────────────────────────────────────

  describe('trigger', () => {
    it('6.1 no instance set → throws "Instance not defined"', () => {
      const bare = new WeaveEraserToolAction();
      expect(() => bare.trigger(vi.fn())).toThrow('Instance not defined');
    });

    it('6.2 first call → setupEvents called, initialized=true', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
      action.trigger(vi.fn());
      expect((action as unknown as R)['initialized']).toBe(true);
      // stage.on called for pointermove + pointerclick
      expect(mockWeave._stage.on).toHaveBeenCalledTimes(2);
    });

    it('6.3 second call → setupEvents NOT called again', () => {
      action.trigger(vi.fn());
      action.trigger(vi.fn());
      expect(mockWeave._stage.on).toHaveBeenCalledTimes(2);
    });

    it('6.4 selectionPlugin present → setSelectedNodes([]) and disable() called', () => {
      const selPlugin = { setSelectedNodes: vi.fn(), disable: vi.fn() };
      mockWeave.getPlugin.mockReturnValue(selPlugin);
      action.trigger(vi.fn());
      expect(selPlugin.setSelectedNodes).toHaveBeenCalledWith([]);
      expect(selPlugin.disable).toHaveBeenCalled();
    });

    it('6.5 selectionPlugin absent → skips plugin calls; setEraser still runs (state→ERASING)', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      action.trigger(vi.fn());
      expect((action as unknown as R)['state']).toBe(ERASER_TOOL_STATE.ERASING);
      expect((action as unknown as R)['erasing']).toBe(true);
    });
  });

  // ── Suite 7: cleanup ──────────────────────────────────────────────────────

  describe('cleanup', () => {
    beforeEach(() => {
      triggerAndCapture();
    });

    it('7.1 selectionPlugin present → enable() + triggerAction(SELECTION_TOOL_ACTION_NAME)', () => {
      const selPlugin = { enable: vi.fn() };
      mockWeave.getPlugin.mockReturnValue(selPlugin);
      action.cleanup();
      expect(selPlugin.enable).toHaveBeenCalled();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('7.2 selectionPlugin absent → skips both', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      action.cleanup();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('7.3 cursor set to "default"; erasing set to false', () => {
      action.cleanup();
      expect(mockWeave._container.style.cursor).toBe('default');
      expect((action as unknown as R)['erasing']).toBe(false);
    });

    it('7.4 state set to IDLE', () => {
      action.cleanup();
      expect((action as unknown as R)['state']).toBe(ERASER_TOOL_STATE.IDLE);
    });
  });

  // ── Suite 8: setCursor ────────────────────────────────────────────────────

  describe('setCursor (private, via trigger)', () => {
    it('8.1 sets stage.container().style.cursor to "crosshair"', () => {
      mockWeave._container.style.cursor = '';
      action.trigger(vi.fn()); // trigger → setEraser → setCursor
      expect(mockWeave._container.style.cursor).toBe('crosshair');
    });
  });

  // ── Suite 9: setFocusStage ────────────────────────────────────────────────

  describe('setFocusStage (private, via trigger)', () => {
    it('9.1 sets tabIndex=1, calls blur() then focus()', () => {
      action.trigger(vi.fn()); // trigger → setEraser → setFocusStage
      expect(mockWeave._container.tabIndex).toBe(1);
      expect(mockWeave._container.blur).toHaveBeenCalled();
      expect(mockWeave._container.focus).toHaveBeenCalled();
    });
  });
});
