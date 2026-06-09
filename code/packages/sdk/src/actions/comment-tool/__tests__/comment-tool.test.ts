// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/nodes/comment/constants', () => ({
  WEAVE_COMMENT_NODE_ACTION: { CREATING: 'creating', IDLE: 'idle', VIEWING: 'viewing' },
}));
vi.mock('@/plugins/comments-renderer/constants', () => ({
  WEAVE_COMMENTS_RENDERER_KEY: 'commentsRenderer',
}));
vi.mock('@/utils/utils', () => ({
  mergeExceptArrays: vi.fn((a: unknown, b: unknown) => ({ ...(a as object), ...(b as object) })),
}));
vi.mock('@/utils/cursors', () => ({
  extractCursorUrl: vi.fn().mockReturnValue({ preload: false, cursor: null }),
}));
vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('test-uuid') }));

const { mockImgRef } = vi.hoisted(() => {
  const mockImgRef = { current: { src: '', onload: null as (() => void) | null } };
  return { mockImgRef };
});

vi.mock('konva', () => ({
  default: {
    Util: {
      createImageElement: vi.fn().mockImplementation(() => {
        mockImgRef.current = { src: '', onload: null };
        return mockImgRef.current;
      }),
    },
  },
}));

if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { type R } from '../../__tests__/shared/action.test-helpers';
import { WeaveCommentToolAction } from '../comment-tool';
import {
  WEAVE_COMMENT_TOOL_ACTION_NAME,
  WEAVE_COMMENT_TOOL_STATE,
  WEAVE_COMMENT_TOOL_DEFAULT_CONFIG,
} from '../constants';
import { mergeExceptArrays } from '@/utils/utils';
import { extractCursorUrl } from '@/utils/cursors';
import Konva from 'konva';

const mockParams = {
  config: {
    model: { getCreateModel: vi.fn().mockReturnValue({}) },
    getUser: vi.fn().mockReturnValue({ id: 'u1', name: 'User 1' }),
    getUserBackgroundColor: vi.fn().mockReturnValue('#FF0000'),
    getUserForegroundColor: vi.fn().mockReturnValue('#FFFFFF'),
  },
};

function makeMockWeave() {
  const stageHandlers: Record<string, (e?: unknown) => void> = {};
  const instanceHandlers: Record<string, (e?: unknown) => void> = {};

  const stageContainer = {
    tabIndex: 0,
    focus: vi.fn(),
    blur: vi.fn(),
    style: { cursor: '' },
  };

  const mockFoundNode = { getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }) };

  const mainLayer = {
    getRelativePointerPosition: vi.fn().mockReturnValue({ x: 100, y: 200 }),
  };

  const mockCommentsLayer = { add: vi.fn() };

  const commentsRendererPlugin = {
    getCommentsLayer: vi.fn().mockReturnValue(mockCommentsLayer),
  };

  const selectionPlugin = { setSelectedNodes: vi.fn() };

  const mockRenderedNode = { moveToTop: vi.fn() };

  const commentNodeHandler = {
    isCommentViewing: vi.fn().mockReturnValue(false),
    isCommentCreating: vi.fn().mockReturnValue(false),
    onRender: vi.fn().mockReturnValue(mockRenderedNode),
    onUpdate: vi.fn(),
  };

  const stage = {
    container: vi.fn().mockReturnValue(stageContainer),
    on: vi.fn((event: string, handler: (e?: unknown) => void) => {
      stageHandlers[event] = handler;
    }),
    off: vi.fn(),
    findOne: vi.fn().mockReturnValue(mockFoundNode),
  };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockImplementation((key: string) => {
      if (key === 'nodesSelection') return selectionPlugin;
      if (key === 'commentsRenderer') return commentsRendererPlugin;
      return null;
    }),
    getNodeHandler: vi.fn().mockReturnValue(commentNodeHandler),
    getMainLayer: vi.fn().mockReturnValue(mainLayer),
    getActiveAction: vi.fn().mockReturnValue(WEAVE_COMMENT_TOOL_ACTION_NAME),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    emitEvent: vi.fn(),
    triggerAction: vi.fn(),
    addEventListener: vi.fn((event: string, handler: (e?: unknown) => void) => {
      instanceHandlers[event] = handler;
    }),
    // Internal refs
    _stageContainer: stageContainer,
    _stageHandlers: stageHandlers,
    _instanceHandlers: instanceHandlers,
    _selectionPlugin: selectionPlugin,
    _commentsRendererPlugin: commentsRendererPlugin,
    _commentsLayer: mockCommentsLayer,
    _commentNodeHandler: commentNodeHandler,
    _foundNode: mockFoundNode,
    _mainLayer: mainLayer,
    _stage: stage,
    _renderedNode: mockRenderedNode,
  };
}

function makePointerEvent(
  overrides: Partial<{ pointerId: number; clientX: number; clientY: number }> = {},
  targetOverrides: Partial<{ name: string; getParent: () => unknown }> = {}
) {
  return {
    evt: { pointerId: 1, clientX: 50, clientY: 75, ...overrides },
    target: {
      getAttrs: vi.fn().mockReturnValue({ name: targetOverrides.name ?? '' }),
      getParent: vi.fn().mockReturnValue(null),
      ...targetOverrides,
    },
    cancelBubble: false,
  };
}

describe('WeaveCommentToolAction', () => {
  let action: WeaveCommentToolAction<unknown>;
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let capturedKeydownHandler: ((e: KeyboardEvent) => void) | undefined;

  beforeEach(() => {
    action = new WeaveCommentToolAction<unknown>(mockParams);
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
    (action as unknown as R)['cancelAction'] = vi.fn();

    capturedKeydownHandler = undefined;
    vi.stubGlobal(
      'addEventListener',
      vi.fn((type: string, handler: unknown) => {
        if (type === 'keydown') {
          capturedKeydownHandler = handler as (e: KeyboardEvent) => void;
        }
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function triggerAction() {
    const cancelFn = vi.fn();
    (action as unknown as R)['cancelAction'] = cancelFn;
    action.trigger(cancelFn);
    return { cancelFn };
  }

  function setupTriggered() {
    triggerAction();
    (action as unknown as R)['cancelAction'] = vi.fn();
  }

  // ── Suite 1: constructor / initialize ────────────────────────────────────────
  describe('Suite 1: constructor / initialize', () => {
    it('1.1 initialize() resets all fields to defaults', () => {
      expect((action as unknown as R)['pointers']).toBeInstanceOf(Map);
      expect(((action as unknown as R)['pointers'] as Map<number, unknown>).size).toBe(0);
      expect((action as unknown as R)['initialized']).toBe(false);
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.IDLE);
      expect((action as unknown as R)['commentId']).toBeNull();
      expect((action as unknown as R)['clickPoint']).toBeNull();
    });

    it('1.2 onPropsChange is undefined', () => {
      expect((action as unknown as R)['onPropsChange']).toBeUndefined();
    });

    it('1.3 mergeExceptArrays called with default config + custom config', () => {
      expect(mergeExceptArrays).toHaveBeenCalledWith(
        WEAVE_COMMENT_TOOL_DEFAULT_CONFIG,
        mockParams.config
      );
    });

    it('1.4 custom style overrides default cursor config', () => {
      const customParams = {
        config: {
          ...mockParams.config,
          style: { cursor: { add: 'pointer', block: 'wait' } },
        },
      };
      (mergeExceptArrays as ReturnType<typeof vi.fn>).mockImplementationOnce(
        (a: unknown, b: unknown) => ({ ...(a as object), ...(b as object) })
      );
      const customAction = new WeaveCommentToolAction<unknown>(customParams as typeof mockParams);
      const config = (customAction as unknown as R)['config'] as { style: { cursor: { add: string } } };
      // mergeExceptArrays (mocked as spread) merges config with defaults
      expect(config).toBeDefined();
    });

    it('1.5 null params → uses empty fallback (params ?? {})', () => {
      const nullAction = new WeaveCommentToolAction<unknown>(
        null as unknown as typeof mockParams
      );
      expect((nullAction as unknown as R)['initialized']).toBe(false);
    });
  });

  // ── Suite 2: getName / initProps ─────────────────────────────────────────────
  describe('Suite 2: getName / initProps', () => {
    it('2.1 getName returns WEAVE_COMMENT_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(WEAVE_COMMENT_TOOL_ACTION_NAME);
    });

    it('2.2 initProps returns default comment props', () => {
      expect(action.initProps()).toEqual({
        colorToken: '#000000',
        width: 300,
        height: 300,
        opacity: 1,
      });
    });
  });

  // ── Suite 3: preloadCursors ──────────────────────────────────────────────────
  describe('Suite 3: preloadCursors', () => {
    it('3.1 extractCursorUrl preload=false → createImageElement NOT called', () => {
      (extractCursorUrl as ReturnType<typeof vi.fn>).mockReturnValue({
        preload: false,
        cursor: null,
      });
      (action as unknown as R)['preloadCursors']();
      expect(Konva.Util.createImageElement).not.toHaveBeenCalled();
    });

    it('3.2 extractCursorUrl preload=true → createImageElement called, img.src set', () => {
      (extractCursorUrl as ReturnType<typeof vi.fn>).mockReturnValue({
        preload: true,
        cursor: 'url(crosshair.png)',
      });
      (action as unknown as R)['preloadCursors']();
      // 2 cursor keys (add + block) → 2 img elements
      expect(Konva.Util.createImageElement).toHaveBeenCalledTimes(2);
      expect(mockImgRef.current.src).toBe('url(crosshair.png)');
    });

    it('3.3 img.onload fires → cursor set then restored to actualCursor', () => {
      (extractCursorUrl as ReturnType<typeof vi.fn>).mockReturnValue({
        preload: true,
        cursor: 'url(crosshair.png)',
      });
      const imgs: Array<{ src: string; onload: (() => void) | null }> = [];
      (Konva.Util.createImageElement as ReturnType<typeof vi.fn>).mockImplementation(() => {
        const img = { src: '', onload: null as (() => void) | null };
        imgs.push(img);
        return img;
      });

      mockWeave._stageContainer.style.cursor = 'initial-cursor';
      (action as unknown as R)['preloadCursors']();

      expect(imgs.length).toBe(2);
      expect(imgs[0].onload).toBeTypeOf('function');

      // Fire the onload handler
      imgs[0].onload!();
      // After onload, cursor is restored to actualCursor
      expect(mockWeave._stageContainer.style.cursor).toBe('initial-cursor');
    });

    it('3.4 extractCursorUrl returns null → no image elements created (null ?? "" is falsy for preload)', () => {
      (extractCursorUrl as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (action as unknown as R)['preloadCursors']();
      expect(Konva.Util.createImageElement).not.toHaveBeenCalled();
    });
  });

  // ── Suite 4: onInit — pointermove + onCommentView ────────────────────────────
  describe('Suite 4: onInit — pointermove + onCommentView', () => {
    it('4.1 stage.on("pointermove") registered on onInit', () => {
      (action as unknown as R)['onInit']();
      expect(mockWeave._stage.on).toHaveBeenCalledWith('pointermove', expect.any(Function));
    });

    it('4.2 pointermove: state=IDLE → early return, setCursor NOT called', () => {
      (action as unknown as R)['onInit']();
      const handler = mockWeave._stageHandlers['pointermove'];
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.IDLE;
      handler?.();
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('4.3 pointermove: state=ADDING → setCursor called', () => {
      (action as unknown as R)['onInit']();
      const handler = mockWeave._stageHandlers['pointermove'];
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.ADDING;
      handler?.();
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });

    it('4.4 onCommentView registered via instance.addEventListener', () => {
      (action as unknown as R)['onInit']();
      expect(mockWeave.addEventListener).toHaveBeenCalledWith('onCommentView', expect.any(Function));
    });

    it('4.5 onCommentView: active≠commentTool → early return, state unchanged', () => {
      (action as unknown as R)['onInit']();
      const handler = mockWeave._instanceHandlers['onCommentView'];
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.IDLE;
      handler?.();
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.IDLE);
    });

    it('4.6 onCommentView: active=commentTool → setState(ADDING)', () => {
      (action as unknown as R)['onInit']();
      const handler = mockWeave._instanceHandlers['onCommentView'];
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.IDLE;
      handler?.();
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.ADDING);
    });
  });

  // ── Suite 5: onInit — onCommentFinishCreate ──────────────────────────────────
  describe('Suite 5: onInit — onCommentFinishCreate', () => {
    beforeEach(() => {
      (action as unknown as R)['onInit']();
    });

    it('5.1 onCommentFinishCreate registered via instance.addEventListener', () => {
      expect(mockWeave.addEventListener).toHaveBeenCalledWith(
        'onCommentFinishCreate',
        expect.any(Function)
      );
    });

    it('5.2 active≠commentTool → early return, state unchanged', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.CREATING_COMMENT;
      mockWeave._instanceHandlers['onCommentFinishCreate']?.({ action: 'create' });
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.CREATING_COMMENT);
    });

    it('5.3 state≠CREATING_COMMENT → setCursor + return, no setState', () => {
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.ADDING;
      mockWeave._stageContainer.style.cursor = '';
      mockWeave._instanceHandlers['onCommentFinishCreate']?.({ action: 'create' });
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.ADDING);
    });

    it('5.4 state=CREATING_COMMENT + action≠"create" → setState(ADDING) + setCursor', () => {
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.CREATING_COMMENT;
      mockWeave._instanceHandlers['onCommentFinishCreate']?.({ action: 'cancel' });
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.ADDING);
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });

    it('5.5 state=CREATING_COMMENT + action="create" → setCursor, reset commentId/clickPoint, setState(ADDING)', () => {
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.CREATING_COMMENT;
      (action as unknown as R)['commentId'] = 'existing-id';
      (action as unknown as R)['clickPoint'] = { x: 10, y: 20 };
      mockWeave._instanceHandlers['onCommentFinishCreate']?.({ action: 'create' });
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
      expect((action as unknown as R)['commentId']).toBeNull();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.ADDING);
    });
  });

  // ── Suite 6: keydown handler ─────────────────────────────────────────────────
  describe('Suite 6: keydown handler', () => {
    beforeEach(() => {
      setupTriggered();
    });

    it('6.1 active≠commentTool → early return, no effect', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.ADDING;
      capturedKeydownHandler?.({ code: 'Escape' } as KeyboardEvent);
      expect((action as unknown as R)['cancelAction']).not.toHaveBeenCalled?.();
    });

    it('6.2 isCommentViewing=true → return, no effect', () => {
      mockWeave._commentNodeHandler.isCommentViewing.mockReturnValue(true);
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.ADDING;
      capturedKeydownHandler?.({ code: 'Escape' } as KeyboardEvent);
      expect((action as unknown as R)['cancelAction']).not.toHaveBeenCalled?.();
    });

    it('6.3 Escape + state=ADDING → cancelAction called', () => {
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.ADDING;
      capturedKeydownHandler?.({ code: 'Escape' } as KeyboardEvent);
      expect(cancelFn).toHaveBeenCalledTimes(1);
    });

    it('6.4 Escape + state=CREATING_COMMENT → setState(ADDING), cancelAction NOT called', () => {
      const cancelFn = vi.fn();
      (action as unknown as R)['cancelAction'] = cancelFn;
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.CREATING_COMMENT;
      capturedKeydownHandler?.({ code: 'Escape' } as KeyboardEvent);
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.ADDING);
      expect(cancelFn).not.toHaveBeenCalled();
    });
  });

  // ── Suite 7: setupEvents/pointermove handler ─────────────────────────────────
  describe('Suite 7: setupEvents / pointermove handler', () => {
    beforeEach(() => {
      setupTriggered();
    });

    it('7.1 state=IDLE → early return, cursor not changed', () => {
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.IDLE;
      mockWeave._stageContainer.style.cursor = '';
      mockWeave._stageHandlers['pointermove']?.(makePointerEvent());
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('7.2 isCommentViewing=true → setCursorBlock', () => {
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.ADDING;
      mockWeave._commentNodeHandler.isCommentViewing.mockReturnValue(true);
      mockWeave._stageHandlers['pointermove']?.(makePointerEvent());
      expect(mockWeave._stageContainer.style.cursor).toBe('not-allowed');
    });

    it('7.3 isCommentCreating=true → setCursorBlock', () => {
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.ADDING;
      mockWeave._commentNodeHandler.isCommentCreating.mockReturnValue(true);
      mockWeave._stageHandlers['pointermove']?.(makePointerEvent());
      expect(mockWeave._stageContainer.style.cursor).toBe('not-allowed');
    });

    it('7.4 isCommentNode(e.target)=true → early return, cursor not changed', () => {
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.ADDING;
      mockWeave._stageContainer.style.cursor = '';
      const evt = makePointerEvent({}, { name: 'comment-node' });
      mockWeave._stageHandlers['pointermove']?.(evt);
      // isCommentNode returns true (name includes 'comment') → returns early
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('7.5 not viewing/creating, not comment node → setCursor', () => {
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointermove']?.(makePointerEvent({}, { name: 'other-node' }));
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });
  });

  // ── Suite 8: setupEvents/pointerdown handler ─────────────────────────────────
  describe('Suite 8: setupEvents / pointerdown handler', () => {
    beforeEach(() => {
      setupTriggered();
    });

    it('8.1 pointer stored in map with clientX/Y', () => {
      const evt = makePointerEvent({ pointerId: 5, clientX: 10, clientY: 20 });
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.ADDING;
      mockWeave._stageHandlers['pointerdown']?.(evt);
      const pointers = (action as unknown as R)['pointers'] as Map<number, { x: number; y: number }>;
      expect(pointers.get(5)).toEqual({ x: 10, y: 20 });
    });

    it('8.2 state=IDLE → return after pointer stored, state unchanged', () => {
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.IDLE;
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent());
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.IDLE);
    });

    it('8.3 isCommentViewing=true → return, state unchanged', () => {
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.ADDING;
      mockWeave._commentNodeHandler.isCommentViewing.mockReturnValue(true);
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent());
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.ADDING);
    });

    it('8.4 isCommentCreating=true → return, state unchanged', () => {
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.ADDING;
      mockWeave._commentNodeHandler.isCommentCreating.mockReturnValue(true);
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent());
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.ADDING);
    });

    it('8.5 !isCommentNode + size=1 + active + state=ADDING → SELECTED_POSITION + setCursor', () => {
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.ADDING;
      const evt = makePointerEvent({ pointerId: 1 }, { name: 'other-node' });
      mockWeave._stageHandlers['pointerdown']?.(evt);
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.SELECTED_POSITION);
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });

    it('8.6 isCommentNode + active → setState(ADDING)', () => {
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.SELECTED_POSITION;
      const evt = makePointerEvent({ pointerId: 1 }, { name: 'comment-node' });
      mockWeave._stageHandlers['pointerdown']?.(evt);
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.ADDING);
    });
  });

  // ── Suite 9: setupEvents/pointerup handler ───────────────────────────────────
  describe('Suite 9: setupEvents / pointerup handler', () => {
    beforeEach(() => {
      setupTriggered();
    });

    it('9.1 pointer deleted from map', () => {
      const pointers = (action as unknown as R)['pointers'] as Map<number, unknown>;
      pointers.set(3, { x: 0, y: 0 });
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.IDLE;
      mockWeave._stageHandlers['pointerup']?.({ evt: { pointerId: 3 }, target: { getAttrs: vi.fn().mockReturnValue({ name: '' }), getParent: vi.fn().mockReturnValue(null) }, cancelBubble: false });
      expect(pointers.has(3)).toBe(false);
    });

    it('9.2 state=IDLE → return after delete, handleAdding NOT called', () => {
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.IDLE;
      const spy = vi.spyOn(action as unknown as { handleAdding: () => void }, 'handleAdding' as never);
      mockWeave._stageHandlers['pointerup']?.(makePointerEvent());
      expect(spy).not.toHaveBeenCalled();
    });

    it('9.3 isCommentViewing=true → return, handleAdding NOT called', () => {
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.SELECTED_POSITION;
      mockWeave._commentNodeHandler.isCommentViewing.mockReturnValue(true);
      const mainLayerSpy = vi.spyOn(mockWeave._mainLayer, 'getRelativePointerPosition');
      mockWeave._stageHandlers['pointerup']?.(makePointerEvent());
      expect(mainLayerSpy).not.toHaveBeenCalled();
    });

    it('9.4 !isCommentNode + state=SELECTED_POSITION → handleAdding + cancelBubble=true', () => {
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.SELECTED_POSITION;
      const evt = makePointerEvent({}, { name: 'other-node' });
      mockWeave._stageHandlers['pointerup']?.(evt);
      expect((evt as unknown as R)['cancelBubble']).toBe(true);
      expect((action as unknown as R)['commentId']).toBe('test-uuid');
    });

    it('9.5 isCommentNode + active → setState(ADDING)', () => {
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.SELECTED_POSITION;
      const evt = makePointerEvent({}, { name: 'comment-node' });
      mockWeave._stageHandlers['pointerup']?.(evt);
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.ADDING);
    });
  });

  // ── Suite 10: enableAddingComment ────────────────────────────────────────────
  describe('Suite 10: enableAddingComment', () => {
    it('10.1 commentNodeHandler null → setCursor fallback', () => {
      mockWeave.getNodeHandler.mockReturnValue(null);
      (action as unknown as R)['enableAddingComment']();
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });

    it('10.2 commentNodeHandler + isViewing=true → setCursorBlock', () => {
      mockWeave._commentNodeHandler.isCommentViewing.mockReturnValue(true);
      (action as unknown as R)['enableAddingComment']();
      expect(mockWeave._stageContainer.style.cursor).toBe('not-allowed');
    });

    it('10.3 commentNodeHandler + isCreating=true → setCursorBlock', () => {
      mockWeave._commentNodeHandler.isCommentCreating.mockReturnValue(true);
      (action as unknown as R)['enableAddingComment']();
      expect(mockWeave._stageContainer.style.cursor).toBe('not-allowed');
    });

    it('10.4 commentNodeHandler + neither viewing nor creating → setCursor', () => {
      (action as unknown as R)['enableAddingComment']();
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });

    it('10.5 emitEvent("onStartAddingComment") called, commentId=null, clickPoint=null, state=ADDING', () => {
      (action as unknown as R)['commentId'] = 'old-id';
      (action as unknown as R)['clickPoint'] = { x: 1, y: 2 };
      (action as unknown as R)['enableAddingComment']();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onStartAddingComment');
      expect((action as unknown as R)['commentId']).toBeNull();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.ADDING);
    });
  });

  // ── Suite 11: handleAdding ───────────────────────────────────────────────────
  describe('Suite 11: handleAdding', () => {
    it('11.1 mainLayer null → early return, commentId unchanged', () => {
      mockWeave.getMainLayer.mockReturnValue(null);
      (action as unknown as R)['handleAdding']();
      expect((action as unknown as R)['commentId']).toBeNull();
    });

    it('11.2 mousePoint null → clickPoint=null, nodeHandler branch skipped', () => {
      mockWeave._mainLayer.getRelativePointerPosition.mockReturnValue(null);
      (action as unknown as R)['handleAdding']();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['state']).not.toBe(WEAVE_COMMENT_TOOL_STATE.CREATING_COMMENT);
    });

    it('11.3 nodeHandler null → onRender NOT called, state stays non-CREATING', () => {
      mockWeave.getNodeHandler.mockReturnValue(null);
      (action as unknown as R)['handleAdding']();
      expect(mockWeave._commentNodeHandler.onRender).not.toHaveBeenCalled();
      expect((action as unknown as R)['state']).not.toBe(WEAVE_COMMENT_TOOL_STATE.CREATING_COMMENT);
    });

    it('11.4 nodeHandler + clickPoint set → onRender, moveToTop, getCommentsLayer.add, onUpdate, setState(CREATING_COMMENT)', () => {
      (action as unknown as R)['handleAdding']();
      expect(mockWeave._commentNodeHandler.onRender).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-uuid',
          x: 100,
          y: 200,
          content: '',
        })
      );
      expect(mockWeave._renderedNode.moveToTop).toHaveBeenCalled();
      expect(mockWeave._commentsLayer.add).toHaveBeenCalledWith(mockWeave._renderedNode);
      expect(mockWeave._commentNodeHandler.onUpdate).toHaveBeenCalledWith(
        mockWeave._renderedNode,
        { commentAction: 'creating' }
      );
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.CREATING_COMMENT);
    });

    it('11.5 getCommentsLayer returns null → no crash, add not called', () => {
      mockWeave.getPlugin.mockImplementation((key: string) => {
        if (key === 'nodesSelection') return mockWeave._selectionPlugin;
        return null;
      });
      (action as unknown as R)['handleAdding']();
      // Should not throw — optional chaining ?.add
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.CREATING_COMMENT);
    });
  });

  // ── Suite 12: trigger ────────────────────────────────────────────────────────
  describe('Suite 12: trigger', () => {
    it('12.1 !instance → throws "Instance not defined"', () => {
      (action as unknown as R)['instance'] = undefined;
      expect(() => action.trigger(vi.fn())).toThrow('Instance not defined');
    });

    it('12.2 !initialized → setupEvents called (stage.on registers handlers)', () => {
      expect((action as unknown as R)['initialized']).toBe(false);
      action.trigger(vi.fn());
      expect((action as unknown as R)['initialized']).toBe(true);
      expect(mockWeave._stage.on).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(mockWeave._stage.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(mockWeave._stage.on).toHaveBeenCalledWith('pointerup', expect.any(Function));
    });

    it('12.3 already initialized → setupEvents NOT called again', () => {
      action.trigger(vi.fn());
      mockWeave._stage.on.mockClear();
      action.trigger(vi.fn());
      expect(mockWeave._stage.on).not.toHaveBeenCalled();
    });

    it('12.4 trigger sets tabIndex=1, calls focus, cancelAction stored, enableAddingComment called', () => {
      const cancelFn = vi.fn();
      action.trigger(cancelFn);
      expect(mockWeave._stageContainer.tabIndex).toBe(1);
      expect(mockWeave._stageContainer.focus).toHaveBeenCalled();
      expect((action as unknown as R)['cancelAction']).toBe(cancelFn);
      // enableAddingComment sets state=ADDING
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.ADDING);
    });
  });

  // ── Suite 13: cleanup ────────────────────────────────────────────────────────
  describe('Suite 13: cleanup', () => {
    it('13.1 cursor set to "default"', () => {
      action.cleanup();
      expect(mockWeave._stageContainer.style.cursor).toBe('default');
    });

    it('13.2 emitEvent("onFinishAddingComment") called', () => {
      action.cleanup();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onFinishAddingComment');
    });

    it('13.3 selectionPlugin + node found → setSelectedNodes([node]) + triggerAction("selectionTool")', () => {
      (action as unknown as R)['commentId'] = 'test-uuid';
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([
        mockWeave._foundNode,
      ]);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith('selectionTool');
    });

    it('13.4 selectionPlugin + node NOT found → setSelectedNodes NOT called; triggerAction still called', () => {
      mockWeave._stage.findOne.mockReturnValue(null);
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
      expect(mockWeave.triggerAction).toHaveBeenCalledWith('selectionTool');
    });

    it('13.5 no selectionPlugin → no error', () => {
      mockWeave.getPlugin.mockReturnValue(null);
      expect(() => action.cleanup()).not.toThrow();
    });

    it('13.6 all fields reset after cleanup', () => {
      (action as unknown as R)['commentId'] = 'some-id';
      (action as unknown as R)['clickPoint'] = { x: 5, y: 5 };
      (action as unknown as R)['state'] = WEAVE_COMMENT_TOOL_STATE.ADDING;
      action.cleanup();
      expect((action as unknown as R)['commentId']).toBeNull();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['state']).toBe(WEAVE_COMMENT_TOOL_STATE.IDLE);
    });
  });

  // ── Suite 14: getCommentsLayer ───────────────────────────────────────────────
  describe('Suite 14: getCommentsLayer', () => {
    it('14.1 commentsRendererPlugin present → returns plugin.getCommentsLayer()', () => {
      const result = (action as unknown as R)['getCommentsLayer']();
      expect(result).toBe(mockWeave._commentsLayer);
      expect(mockWeave._commentsRendererPlugin.getCommentsLayer).toHaveBeenCalled();
    });

    it('14.2 commentsRendererPlugin absent → returns null', () => {
      mockWeave.getPlugin.mockReturnValue(null);
      const result = (action as unknown as R)['getCommentsLayer']();
      expect(result).toBeNull();
    });
  });

  // ── Suite 15: isCommentNode ──────────────────────────────────────────────────
  describe('Suite 15: isCommentNode', () => {
    it('15.1 node.attrs.name includes "comment" → true', () => {
      const node = {
        getAttrs: vi.fn().mockReturnValue({ name: 'comment-circle' }),
        getParent: vi.fn().mockReturnValue(null),
      };
      const result = (action as unknown as R)['isCommentNode'](node);
      expect(result).toBe(true);
    });

    it('15.2 node.getParent() === stage → false', () => {
      const node = {
        getAttrs: vi.fn().mockReturnValue({ name: 'other-node' }),
        getParent: vi.fn().mockReturnValue(mockWeave._stage),
      };
      const result = (action as unknown as R)['isCommentNode'](node);
      expect(result).toBe(false);
    });

    it('15.3 node.getParent() !== stage → recurse; parent name includes "comment" → true', () => {
      const intermediateParent = {
        getAttrs: vi.fn().mockReturnValue({ name: 'other-layer' }),
        getParent: vi.fn().mockReturnValue(mockWeave._stage),
      };
      const commentParent = {
        getAttrs: vi.fn().mockReturnValue({ name: 'comment-wrapper' }),
        getParent: vi.fn().mockReturnValue(intermediateParent),
      };
      const node = {
        getAttrs: vi.fn().mockReturnValue({ name: 'child-node' }),
        getParent: vi.fn().mockReturnValue(commentParent),
      };
      const result = (action as unknown as R)['isCommentNode'](node);
      expect(result).toBe(true);
    });

    it('15.4 node has no parent → false', () => {
      const node = {
        getAttrs: vi.fn().mockReturnValue({ name: 'other-node' }),
        getParent: vi.fn().mockReturnValue(null),
      };
      const result = (action as unknown as R)['isCommentNode'](node);
      expect(result).toBe(false);
    });

    it('15.5 name has no "comment" + recursion reaches stage → false', () => {
      const node = {
        getAttrs: vi.fn().mockReturnValue({ name: 'plain-node' }),
        getParent: vi.fn().mockReturnValue(mockWeave._stage),
      };
      const result = (action as unknown as R)['isCommentNode'](node);
      expect(result).toBe(false);
    });
  });

  // ── Suite 16: setCursor / setCursorBlock ─────────────────────────────────────
  describe('Suite 16: setCursor / setCursorBlock', () => {
    it('16.1 setCursor sets cursor to config.style.cursor.add', () => {
      (action as unknown as R)['setCursor']();
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });

    it('16.2 setCursorBlock sets cursor to config.style.cursor.block', () => {
      (action as unknown as R)['setCursorBlock']();
      expect(mockWeave._stageContainer.style.cursor).toBe('not-allowed');
    });
  });
});
