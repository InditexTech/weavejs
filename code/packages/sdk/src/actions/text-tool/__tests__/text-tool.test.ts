// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Break circular dependency: action.ts → @/weave → managers → index
vi.mock('@/weave', () => ({ Weave: class Weave {} }));
// Break circular dependency: nodes-selection → context-menu → nodes-selection
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));

vi.mock('konva', () => ({ default: {} }));

vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('test-uuid-1234') }));

// In Vitest node environment, `window` is not defined — alias it to globalThis
if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { type R } from '../../__tests__/shared/action.test-helpers';
import { WeaveTextToolAction } from '../text-tool';
import { TEXT_TOOL_ACTION_NAME, TEXT_TOOL_STATE } from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';
import { TEXT_LAYOUT } from '@/nodes/text/constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeContainer() {
  return {
    tabIndex: 0,
    focus: vi.fn(),
    blur: vi.fn(),
    style: { cursor: '' },
    click: vi.fn(),
  };
}

function makeSelectionPlugin() {
  const transformer = { hide: vi.fn() };
  return {
    getTransformer: vi.fn().mockReturnValue(transformer),
    setSelectedNodes: vi.fn(),
    _transformer: transformer,
  };
}

function makeMockNodeHandler() {
  const renderedNode = { id: 'rendered' };
  return {
    create: vi.fn().mockReturnValue({ props: { x: 10, y: 20, text: '' } }),
    onRender: vi.fn().mockReturnValue(renderedNode),
    _renderedNode: renderedNode,
  };
}

function makeMockWeave() {
  const container = makeContainer();
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
    getActiveAction: vi.fn().mockReturnValue(TEXT_TOOL_ACTION_NAME),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    getMousePointer: vi.fn().mockReturnValue({
      mousePoint: { x: 10, y: 20 },
      container: { add: vi.fn() },
    }),
    emitEvent: vi.fn(),
    triggerAction: vi.fn(),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
    _stage: stage,
    _container: container,
    _stageHandlers: stageHandlers,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveTextToolAction', () => {
  let action: WeaveTextToolAction;
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

    action = new WeaveTextToolAction();
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

  // Drive the action through a placement click so state becomes FINISHED and
  // textId is set — the precondition for cleanup()'s auto-edit-mode block.
  function advanceToFinished(cancelFn = vi.fn()) {
    action.trigger(cancelFn);
    mockWeave._stageHandlers['pointerclick']?.();
    return { cancelFn, handlers: mockWeave._stageHandlers };
  }

  // ── Suite 1: constructor / initialize() ────────────────────────────────────

  describe('constructor / initialize()', () => {
    it('1.1 initialized is false after construction', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
    });

    it('1.2 state is IDLE after construction', () => {
      expect((action as unknown as R)['state']).toBe(TEXT_TOOL_STATE.IDLE);
    });

    it('1.3 textId=null, container=undefined, clickPoint=null after construction', () => {
      const a = action as unknown as R;
      expect(a['textId']).toBeNull();
      expect(a['container']).toBeUndefined();
      expect(a['clickPoint']).toBeNull();
    });

    it('1.4 onPropsChange and onInit are undefined', () => {
      expect(action.onPropsChange).toBeUndefined();
      expect(action.onInit).toBeUndefined();
    });
  });

  // ── Suite 2: getName() ────────────────────────────────────────────────────

  describe('getName()', () => {
    it('2.1 returns TEXT_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(TEXT_TOOL_ACTION_NAME);
      expect(action.getName()).toBe('textTool');
    });
  });

  // ── Suite 3: initProps() ──────────────────────────────────────────────────

  describe('initProps()', () => {
    it('3.1 returns all correct default props', () => {
      const props = (action as unknown as R)['initProps']() as R;
      expect(props['text']).toBe('');
      expect(props['layout']).toBe(TEXT_LAYOUT.SMART);
      expect(props['fontSize']).toBe(20);
      expect(props['fontFamily']).toBe('Arial, sans-serif');
      expect(props['fill']).toBe('#000000');
      expect(props['align']).toBe('left');
      expect(props['lineHeight']).toBe(1);
      expect(props['verticalAlign']).toBe('top');
      expect(props['strokeEnabled']).toBe(false);
    });
  });

  // ── Suite 4: trigger() — guards and setup ─────────────────────────────────

  describe('trigger() — guards and setup', () => {
    it('4.1 throws Error when instance is not defined', () => {
      const bare = new WeaveTextToolAction();
      // instance is not set
      expect(() => bare.trigger(vi.fn())).toThrow('Instance not defined');
    });

    it('4.2 first trigger(): setupEvents runs → initialized=true, stage.on called', () => {
      triggerAndCapture();
      expect((action as unknown as R)['initialized']).toBe(true);
      expect(mockWeave._stage.on).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(mockWeave._stage.on).toHaveBeenCalledWith('pointerclick', expect.any(Function));
    });

    it('4.3 second trigger(): setupEvents NOT called again (stage.on count unchanged)', () => {
      triggerAndCapture();
      const callCount = mockWeave._stage.on.mock.calls.length;
      triggerAndCapture();
      expect(mockWeave._stage.on.mock.calls.length).toBe(callCount);
    });

    it('4.4 cancelAction stored as the provided function', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);
      expect((action as unknown as R)['cancelAction']).toBe(cancelFn);
    });

    it('4.5 props reset to initProps() defaults on every trigger()', () => {
      action.trigger(vi.fn());
      // Mutate props then trigger again
      action.props['fill'] = '#ff0000';
      action.trigger(vi.fn());
      expect(action.props['fill']).toBe('#000000');
    });
  });

  // ── Suite 5: trigger() — selectionPlugin ─────────────────────────────────

  describe('trigger() — selectionPlugin', () => {
    it('5.1 selectionPlugin present → setSelectedNodes([]) called', () => {
      const plugin = makeSelectionPlugin();
      mockWeave.getPlugin.mockReturnValue(plugin);
      action.trigger(vi.fn());
      expect(plugin.setSelectedNodes).toHaveBeenCalledWith([]);
    });

    it('5.2 selectionPlugin absent → no error, proceeds normally', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() => action.trigger(vi.fn())).not.toThrow();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddingText');
    });
  });

  // ── Suite 6: addText() ────────────────────────────────────────────────────

  describe('addText() via trigger()', () => {
    it('6.1 selectionPlugin present → transformer.hide() called', () => {
      const plugin = makeSelectionPlugin();
      mockWeave.getPlugin.mockReturnValue(plugin);
      action.trigger(vi.fn());
      expect(plugin._transformer.hide).toHaveBeenCalled();
    });

    it('6.2 selectionPlugin absent → no error, addText continues', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      expect(() => action.trigger(vi.fn())).not.toThrow();
    });

    it('6.3 stage container cursor set to crosshair', () => {
      action.trigger(vi.fn());
      expect(mockWeave._container.style.cursor).toBe('crosshair');
    });

    it('6.4 setFocusStage: container tabIndex=1, blur() and focus() called', () => {
      action.trigger(vi.fn());
      expect(mockWeave._container.tabIndex).toBe(1);
      expect(mockWeave._container.blur).toHaveBeenCalled();
      expect(mockWeave._container.focus).toHaveBeenCalled();
    });

    it('6.5 emitEvent(onAddingText); clickPoint=null; state→ADDING', () => {
      action.trigger(vi.fn());
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddingText');
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['state']).toBe(TEXT_TOOL_STATE.ADDING);
    });
  });

  // ── Suite 7: window keydown handler ──────────────────────────────────────

  describe('keydown handler (window)', () => {
    it('7.1 Escape + activeAction=textTool → cancelAction called', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);
      mockWeave.getActiveAction.mockReturnValue(TEXT_TOOL_ACTION_NAME);
      windowHandlers['keydown']?.({ code: 'Escape' });
      expect(cancelFn).toHaveBeenCalled();
    });

    it('7.2 Escape + activeAction≠textTool → cancelAction NOT called', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);
      mockWeave.getActiveAction.mockReturnValue('selectionTool');
      windowHandlers['keydown']?.({ code: 'Escape' });
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('7.3 Non-Escape key → cancelAction NOT called', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);
      mockWeave.getActiveAction.mockReturnValue(TEXT_TOOL_ACTION_NAME);
      windowHandlers['keydown']?.({ code: 'Enter' });
      windowHandlers['keydown']?.({ code: 'KeyA' });
      expect(cancelFn).not.toHaveBeenCalled();
    });
  });

  // ── Suite 8: stage pointermove ────────────────────────────────────────────

  describe('stage pointermove', () => {
    it('8.1 state=IDLE → cursor NOT changed by pointermove', () => {
      const { handlers } = triggerAndCapture();
      // Reset cursor back to empty then fire pointermove in IDLE would not call setCursor
      // But after trigger state=ADDING — we need to reset to IDLE
      (action as unknown as R)['state'] = TEXT_TOOL_STATE.IDLE;
      mockWeave._container.style.cursor = '';
      handlers['pointermove']?.();
      expect(mockWeave._container.style.cursor).toBe('');
    });

    it('8.2 state=ADDING → cursor set to crosshair by pointermove', () => {
      const { handlers } = triggerAndCapture();
      // state is already ADDING after trigger
      mockWeave._container.style.cursor = '';
      handlers['pointermove']?.();
      expect(mockWeave._container.style.cursor).toBe('crosshair');
    });
  });

  // ── Suite 9: stage pointerclick / handleAdding() ──────────────────────────

  describe('stage pointerclick / handleAdding()', () => {
    it('9.1 state=IDLE → click is no-op', () => {
      const { handlers } = triggerAndCapture();
      (action as unknown as R)['state'] = TEXT_TOOL_STATE.IDLE;
      mockWeave.getNodeHandler.mockReturnValue(makeMockNodeHandler());
      handlers['pointerclick']?.();
      expect(mockWeave.getMousePointer).not.toHaveBeenCalled();
    });

    it('9.2 state=ADDING + nodeHandler present → mousePoint+container captured', () => {
      const { handlers } = triggerAndCapture();
      mockWeave.getNodeHandler.mockReturnValue(makeMockNodeHandler());
      handlers['pointerclick']?.();
      expect((action as unknown as R)['clickPoint']).toEqual({ x: 10, y: 20 });
    });

    it('9.3 state=ADDING + nodeHandler present → nodeHandler.create() called with x, y, draggable', () => {
      const { handlers } = triggerAndCapture();
      const nodeHandler = makeMockNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      handlers['pointerclick']?.();
      expect(nodeHandler.create).toHaveBeenCalledWith(
        'test-uuid-1234',
        expect.objectContaining({
          x: 10,
          y: 20,
          draggable: true,
        })
      );
    });

    it('9.4 state=ADDING + nodeHandler present → onRender added to container; emitEvent(onAddedArrow); state→FINISHED; cancelAction called', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);
      const nodeHandler = makeMockNodeHandler();
      const addFn = vi.fn();
      mockWeave.getMousePointer.mockReturnValue({
        mousePoint: { x: 10, y: 20 },
        container: { add: addFn },
      });
      mockWeave.getNodeHandler.mockReturnValue(nodeHandler);
      mockWeave._stageHandlers['pointerclick']?.();
      expect(addFn).toHaveBeenCalledWith(nodeHandler._renderedNode);
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedArrow');
      expect((action as unknown as R)['state']).toBe(TEXT_TOOL_STATE.FINISHED);
      expect(cancelFn).toHaveBeenCalled();
    });

    it('9.5 state=ADDING + nodeHandler absent → no node ops, state→FINISHED, cancelAction called', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      mockWeave._stageHandlers['pointerclick']?.();
      expect((action as unknown as R)['state']).toBe(TEXT_TOOL_STATE.FINISHED);
      expect(cancelFn).toHaveBeenCalled();
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onAddedArrow');
    });

    it('9.6 state=FINISHED → pointerclick does nothing', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);
      // Advance to FINISHED via click
      mockWeave.getNodeHandler.mockReturnValue(undefined);
      mockWeave._stageHandlers['pointerclick']?.();
      // Reset mocks and fire again
      cancelFn.mockClear();
      mockWeave.getMousePointer.mockClear();
      mockWeave._stageHandlers['pointerclick']?.();
      expect(mockWeave.getMousePointer).not.toHaveBeenCalled();
      expect(cancelFn).not.toHaveBeenCalled();
    });
  });

  // ── Suite 10: cleanup() ───────────────────────────────────────────────────

  describe('cleanup()', () => {
    it('10.1 cursor reset to default', () => {
      action.trigger(vi.fn());
      action.cleanup();
      expect(mockWeave._container.style.cursor).toBe('default');
    });

    it('10.2 selectionPlugin + findOne finds node → setSelectedNodes([node]) called', () => {
      const plugin = makeSelectionPlugin();
      mockWeave.getPlugin.mockReturnValue(plugin);
      // Node needs getAttr so the textGroup branch in cleanup() doesn't throw
      const node = { id: 'found-node', getAttr: vi.fn().mockReturnValue(vi.fn()) };
      mockWeave._stage.findOne.mockReturnValue(node);
      advanceToFinished();
      action.cleanup();
      expect(plugin.setSelectedNodes).toHaveBeenCalledWith([node]);
    });

    it('10.3 selectionPlugin + findOne returns undefined → setSelectedNodes NOT called with node', () => {
      const plugin = makeSelectionPlugin();
      mockWeave.getPlugin.mockReturnValue(plugin);
      mockWeave._stage.findOne.mockReturnValue(undefined);
      advanceToFinished();
      // setSelectedNodes([]) is called in trigger, clear before cleanup
      plugin.setSelectedNodes.mockClear();
      action.cleanup();
      expect(plugin.setSelectedNodes).not.toHaveBeenCalled();
    });

    it('10.4 selectionPlugin present → triggerAction(selectionTool) called', () => {
      const plugin = makeSelectionPlugin();
      mockWeave.getPlugin.mockReturnValue(plugin);
      advanceToFinished();
      action.cleanup();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('10.5 selectionPlugin absent → no error', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      advanceToFinished();
      expect(() => action.cleanup()).not.toThrow();
    });

    it('10.6 textGroup found with triggerEditMode attr → triggerEditMode(textGroup, true) called', () => {
      const triggerEditMode = vi.fn();
      const textGroup = {
        getAttr: vi.fn().mockReturnValue(triggerEditMode),
      };
      // findOne returns textGroup for both calls in cleanup
      mockWeave._stage.findOne.mockReturnValue(textGroup);
      mockWeave.getPlugin.mockReturnValue(undefined);
      advanceToFinished();
      action.cleanup();
      expect(triggerEditMode).toHaveBeenCalledWith(textGroup, true);
    });

    it('10.7 textGroup NOT found → no error', () => {
      mockWeave._stage.findOne.mockReturnValue(undefined);
      mockWeave.getPlugin.mockReturnValue(undefined);
      advanceToFinished();
      expect(() => action.cleanup()).not.toThrow();
    });

    it('10.8 state→IDLE; textId, container, clickPoint, initialCursor all reset', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      action.trigger(vi.fn());
      action.cleanup();
      const a = action as unknown as R;
      expect(a['state']).toBe(TEXT_TOOL_STATE.IDLE);
      expect(a['textId']).toBeNull();
      expect(a['container']).toBeUndefined();
      expect(a['clickPoint']).toBeNull();
      expect(a['initialCursor']).toBeNull();
    });

    it('10.9 plain cancel (state≠FINISHED) → triggerEditMode NOT triggered', () => {
      const triggerEditMode = vi.fn();
      const textGroup = {
        getAttr: vi.fn().mockReturnValue(triggerEditMode),
      };
      mockWeave._stage.findOne.mockReturnValue(textGroup);
      mockWeave.getPlugin.mockReturnValue(undefined);
      // trigger() leaves state=ADDING (no placement) → cleanup must not auto-edit
      action.trigger(vi.fn());
      action.cleanup();
      expect(triggerEditMode).not.toHaveBeenCalled();
    });

    it('10.10 plain cancel (state≠FINISHED) → triggerAction(selectionTool) NOT called', () => {
      const plugin = makeSelectionPlugin();
      mockWeave.getPlugin.mockReturnValue(plugin);
      action.trigger(vi.fn());
      mockWeave.triggerAction.mockClear();
      action.cleanup();
      expect(mockWeave.triggerAction).not.toHaveBeenCalledWith(
        SELECTION_TOOL_ACTION_NAME
      );
    });
  });
});
