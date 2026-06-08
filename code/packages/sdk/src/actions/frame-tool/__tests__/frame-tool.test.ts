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

// In Vitest node environment, `window` is not defined — alias it to globalThis
if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { WeaveFrameToolAction } from '../frame-tool';
import { FRAME_TOOL_ACTION_NAME, FRAME_TOOL_STATE } from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';
import { WEAVE_FRAME_NODE_DEFAULT_PROPS } from '@/nodes/frame/constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

type R = Record<string, unknown>;

// WEAVE_NODE_LAYER_ID = 'mainLayer'
const MAIN_LAYER_ID = 'mainLayer';

function makeMockNodeHandler() {
  return {
    create: vi.fn().mockReturnValue({ id: 'frame-1', props: {} }),
    serialize: vi.fn().mockReturnValue({ id: 'frame-1', type: 'frame', props: {} }),
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
    findOne: vi.fn().mockReturnValue(undefined),
  };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(undefined),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    getActiveAction: vi.fn().mockReturnValue(FRAME_TOOL_ACTION_NAME),
    getEventsController: vi.fn().mockReturnValue({ signal: new AbortController().signal }),
    getMousePointer: vi.fn().mockReturnValue({
      mousePoint: { x: 10, y: 20 },
      container: { getAttrs: vi.fn().mockReturnValue({ id: MAIN_LAYER_ID }) },
    }),
    addNode: vi.fn(),
    triggerAction: vi.fn(),
    emitEvent: vi.fn(),
    _stage: stage,
    _container: container,
    _stageHandlers: stageHandlers,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveFrameToolAction', () => {
  let action: WeaveFrameToolAction;
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

    action = new WeaveFrameToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
    (action as unknown as R)['cancelAction'] = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function triggerAndCapture(cancelFn = vi.fn(), params?: unknown) {
    action.trigger(cancelFn, params as never);
    return { cancelFn, handlers: mockWeave._stageHandlers };
  }

  // ── Suite 1: constructor / initialize ─────────────────────────────────────

  describe('constructor / initialize', () => {
    it('1.1 initialized is false after construction', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
    });

    it('1.2 state is FRAME_TOOL_STATE.IDLE after construction', () => {
      expect((action as unknown as R)['state']).toBe(FRAME_TOOL_STATE.IDLE);
    });

    it('1.3 frameId is null', () => {
      expect((action as unknown as R)['frameId']).toBeNull();
    });

    it('1.4 container is undefined, clickPoint is null', () => {
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['clickPoint']).toBeNull();
    });

    it('1.5 templateId is null; onPropsChange and onInit are undefined', () => {
      expect((action as unknown as R)['templateId']).toBeNull();
      expect(action.onPropsChange).toBeUndefined();
      expect(action.onInit).toBeUndefined();
    });
  });

  // ── Suite 2: getName ───────────────────────────────────────────────────────

  describe('getName', () => {
    it('2.1 returns FRAME_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(FRAME_TOOL_ACTION_NAME);
    });
  });

  // ── Suite 3: initProps ─────────────────────────────────────────────────────

  describe('initProps', () => {
    it('3.1 params=undefined → title from WEAVE_FRAME_NODE_DEFAULT_PROPS.title, editing=false, opacity=1', () => {
      const props = action.initProps(undefined);
      expect(props.title).toBe(WEAVE_FRAME_NODE_DEFAULT_PROPS.title);
      expect(props.editing).toBe(false);
      expect(props.opacity).toBe(1);
    });

    it('3.2 params.title defined → title uses params.title', () => {
      const props = action.initProps({ title: 'My Frame' });
      expect(props.title).toBe('My Frame');
    });

    it('3.3 extra params spread into result', () => {
      const props = action.initProps({ frameWidth: 800, frameHeight: 600 }) as R;
      expect(props['frameWidth']).toBe(800);
      expect(props['frameHeight']).toBe(600);
    });
  });

  // ── Suite 4: setTemplateToUse ──────────────────────────────────────────────

  describe('setTemplateToUse', () => {
    it('4.1 sets templateId to provided string', () => {
      action.setTemplateToUse('tmpl-1');
      expect((action as unknown as R)['templateId']).toBe('tmpl-1');
    });

    it('4.2 sets templateId to null', () => {
      action.setTemplateToUse('tmpl-1');
      action.setTemplateToUse(null);
      expect((action as unknown as R)['templateId']).toBeNull();
    });
  });

  // ── Suite 5: setupEvents – keydown ─────────────────────────────────────────

  describe('setupEvents – keydown', () => {
    beforeEach(() => {
      triggerAndCapture();
    });

    it('5.1 Escape + active=frameTool → cancelAction() called', () => {
      const cancelAction = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelAction;
      mockWeave.getActiveAction.mockReturnValue(FRAME_TOOL_ACTION_NAME);
      windowHandlers['keydown']?.({ code: 'Escape' });
      expect(cancelAction).toHaveBeenCalled();
    });

    it('5.2 Escape + active≠frameTool → cancelAction NOT called', () => {
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

    it('5.4 getEventsController() returns null → setupEvents does not throw', () => {
      const freshAction = new WeaveFrameToolAction();
      const freshMock = makeMockWeave();
      freshMock.getEventsController.mockReturnValue(null);
      (freshAction as unknown as R)['instance'] = freshMock;
      (freshAction as unknown as R)['cancelAction'] = vi.fn();
      expect(() => freshAction.trigger(vi.fn())).not.toThrow();
    });
  });

  // ── Suite 6: setupEvents – pointermove ────────────────────────────────────

  describe('setupEvents – pointermove', () => {
    let handlers: Record<string, (e?: unknown) => void>;

    beforeEach(() => {
      const result = triggerAndCapture();
      handlers = result.handlers;
    });

    it('6.1 state=IDLE → early return, cursor NOT changed', () => {
      (action as unknown as R)['state'] = FRAME_TOOL_STATE.IDLE;
      mockWeave._container.style.cursor = '';
      handlers['pointermove']?.();
      expect(mockWeave._container.style.cursor).toBe('');
    });

    it('6.2 state=ADDING → setCursor() called (cursor → "crosshair")', () => {
      (action as unknown as R)['state'] = FRAME_TOOL_STATE.ADDING;
      mockWeave._container.style.cursor = '';
      handlers['pointermove']?.();
      expect(mockWeave._container.style.cursor).toBe('crosshair');
    });
  });

  // ── Suite 7: setupEvents – pointerclick ───────────────────────────────────

  describe('setupEvents – pointerclick', () => {
    let handlers: Record<string, (e?: unknown) => void>;

    beforeEach(() => {
      const result = triggerAndCapture();
      handlers = result.handlers;
    });

    it('7.1 state=IDLE → early return, handleAdding NOT called', () => {
      (action as unknown as R)['state'] = FRAME_TOOL_STATE.IDLE;
      handlers['pointerclick']?.();
      // state remains IDLE (handleAdding would change it)
      expect((action as unknown as R)['state']).toBe(FRAME_TOOL_STATE.IDLE);
    });

    it('7.2 state=ADDING + templateId=null → handleAdding called', () => {
      (action as unknown as R)['state'] = FRAME_TOOL_STATE.ADDING;
      (action as unknown as R)['templateId'] = null;
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      handlers['pointerclick']?.();
      // handleAdding calls cancelAction at the end
      expect(cancelFn).toHaveBeenCalled();
    });

    it('7.3 state=ADDING + templateId≠null → falls through silently (handleAdding NOT called)', () => {
      (action as unknown as R)['state'] = FRAME_TOOL_STATE.ADDING;
      (action as unknown as R)['templateId'] = 'tmpl-1';
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      handlers['pointerclick']?.();
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('7.4 state=ADDED + templateId=null → falls through (not ADDING state)', () => {
      (action as unknown as R)['state'] = FRAME_TOOL_STATE.ADDED;
      (action as unknown as R)['templateId'] = null;
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      handlers['pointerclick']?.();
      expect(cancelFn).not.toHaveBeenCalled();
    });
  });

  // ── Suite 8: handleAdding (private) ───────────────────────────────────────

  describe('handleAdding (private)', () => {
    const callHandleAdding = (a: WeaveFrameToolAction) =>
      (a as unknown as R)['handleAdding']();

    beforeEach(() => {
      triggerAndCapture();
      (action as unknown as R)['state'] = FRAME_TOOL_STATE.ADDING;
    });

    it('8.1 container.id !== mainLayer → cancelAction called, returns early', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 10, y: 20 },
        container: { getAttrs: vi.fn().mockReturnValue({ id: 'otherLayer' }) },
      });
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      callHandleAdding(action);
      expect(cancelFn).toHaveBeenCalled();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('8.2 container=undefined → cancelAction?.() safe (guard: undefined !== mainLayer → early return)', () => {
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 10, y: 20 },
        container: undefined,
      });
      // cancelAction is not set — verify ?. prevents throw
      (action as unknown as R)['cancelAction'] = undefined as never;
      expect(() => callHandleAdding(action)).not.toThrow();
    });

    it('8.3 container.id === mainLayer + nodeHandler present → create, addNode, emitEvent, cancelAction', () => {
      const nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      callHandleAdding(action);
      expect(nodeHandler.create).toHaveBeenCalled();
      expect(mockWeave.addNode).toHaveBeenCalled();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedFrame');
      expect(cancelFn).toHaveBeenCalled();
    });

    it('8.4 container.id === mainLayer + nodeHandler absent → skips node creation; cancelAction still called', () => {
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      callHandleAdding(action);
      expect(mockWeave.addNode).not.toHaveBeenCalled();
      expect(cancelFn).toHaveBeenCalled();
    });

    it('8.5 this.container undefined when addNode called → container?.getAttrs().id yields undefined', () => {
      // Guard passes (getMousePointer returns mainLayer), then we null container before addNode
      const nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      // Intercept: after handleAdding stores container, patch it away before addNode runs
      // The cleanest approach: override addNode to assert container arg is undefined
      let capturedContainerId: unknown = 'NOT_SET';
      mockWeave.addNode.mockImplementation((_node: unknown, containerId: unknown) => {
        capturedContainerId = containerId;
        // Now null out container to cover the second ?.getAttrs().id branch
        (action as unknown as R)['container'] = undefined;
      });
      callHandleAdding(action);
      // addNode was called — container was defined at that point (mainLayer)
      expect(capturedContainerId).toBe(MAIN_LAYER_ID);
      // After addNode ran, container is undefined — this.container?.getAttrs().id was already resolved;
      // to directly cover the null branch on line 140, call a second time with container forced to undefined
      (action as unknown as R)['container'] = undefined;
      (action as unknown as R)['clickPoint'] = { x: 0, y: 0 };
      (action as unknown as R)['frameId'] = 'frame-x';
      // Patch getMousePointer to return container=undefined so guard short-circuits via ?.
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 0, y: 0 },
        container: undefined,
      });
      // This call hits the container?.getAttrs().id undefined branch in the guard (line 121)
      // and calls cancelAction, covering the ?. null branch
      expect(() => callHandleAdding(action)).not.toThrow();
    });
  });

  // ── Suite 9: trigger ──────────────────────────────────────────────────────

  describe('trigger', () => {
    it('9.1 no instance set → throws "Instance not defined"', () => {
      const bare = new WeaveFrameToolAction();
      expect(() => bare.trigger(vi.fn())).toThrow('Instance not defined');
    });

    it('9.2 first call → setupEvents called, initialized=true', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
      action.trigger(vi.fn());
      expect((action as unknown as R)['initialized']).toBe(true);
      expect(mockWeave._stage.on).toHaveBeenCalledTimes(2); // pointermove + pointerclick
    });

    it('9.3 second call → setupEvents NOT called again', () => {
      action.trigger(vi.fn());
      action.trigger(vi.fn());
      expect(mockWeave._stage.on).toHaveBeenCalledTimes(2);
    });

    it('9.4 selectionPlugin present → setSelectedNodes([]) called', () => {
      const selPlugin = { setSelectedNodes: vi.fn() };
      mockWeave.getPlugin.mockReturnValue(selPlugin);
      action.trigger(vi.fn());
      expect(selPlugin.setSelectedNodes).toHaveBeenCalledWith([]);
    });

    it('9.5 selectionPlugin absent → addFrame still runs (state→ADDING, emits onAddingFrame)', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      action.trigger(vi.fn());
      expect((action as unknown as R)['state']).toBe(FRAME_TOOL_STATE.ADDING);
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddingFrame');
    });
  });

  // ── Suite 10: cleanup ─────────────────────────────────────────────────────

  describe('cleanup', () => {
    beforeEach(() => {
      triggerAndCapture();
      (action as unknown as R)['frameId'] = 'frame-1';
      (action as unknown as R)['container'] = { getAttrs: vi.fn().mockReturnValue({ id: 'layer' }) };
      (action as unknown as R)['clickPoint'] = { x: 5, y: 5 };
      (action as unknown as R)['templateId'] = 'tmpl-1';
    });

    it('10.1 selectionPlugin present + findOne returns node → setSelectedNodes([node]) + triggerAction', () => {
      const node = { id: 'frame-1-selector-area' };
      mockWeave._stage.findOne.mockReturnValue(node);
      const selPlugin = { setSelectedNodes: vi.fn() };
      mockWeave.getPlugin.mockReturnValue(selPlugin);
      action.cleanup();
      expect(selPlugin.setSelectedNodes).toHaveBeenCalledWith([node]);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
      // Verify findOne was called with the -selector-area suffix
      expect(mockWeave._stage.findOne).toHaveBeenCalledWith('#frame-1-selector-area');
    });

    it('10.2 selectionPlugin present + findOne returns undefined → skip setSelectedNodes, still triggerAction', () => {
      mockWeave._stage.findOne.mockReturnValue(undefined);
      const selPlugin = { setSelectedNodes: vi.fn() };
      mockWeave.getPlugin.mockReturnValue(selPlugin);
      action.cleanup();
      expect(selPlugin.setSelectedNodes).not.toHaveBeenCalled();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('10.3 selectionPlugin absent → skips both', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      action.cleanup();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('10.4 fields reset: frameId=null, container=undefined, clickPoint=null, templateId=null, cursor="default"', () => {
      action.cleanup();
      expect(mockWeave._container.style.cursor).toBe('default');
      expect((action as unknown as R)['frameId']).toBeNull();
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['templateId']).toBeNull();
    });

    it('10.5 state set to IDLE', () => {
      action.cleanup();
      expect((action as unknown as R)['state']).toBe(FRAME_TOOL_STATE.IDLE);
    });
  });

  // ── Suite 11: setCursor ───────────────────────────────────────────────────

  describe('setCursor (private, via trigger)', () => {
    it('11.1 sets stage.container().style.cursor to "crosshair"', () => {
      mockWeave._container.style.cursor = '';
      action.trigger(vi.fn()); // trigger → addFrame → setCursor
      expect(mockWeave._container.style.cursor).toBe('crosshair');
    });
  });

  // ── Suite 12: setFocusStage ───────────────────────────────────────────────

  describe('setFocusStage (private, via trigger)', () => {
    it('12.1 sets tabIndex=1, calls blur() then focus()', () => {
      action.trigger(vi.fn()); // trigger → addFrame → setFocusStage
      expect(mockWeave._container.tabIndex).toBe(1);
      expect(mockWeave._container.blur).toHaveBeenCalled();
      expect(mockWeave._container.focus).toHaveBeenCalled();
    });
  });
});
