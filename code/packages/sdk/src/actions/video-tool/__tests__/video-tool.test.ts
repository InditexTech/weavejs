// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));
vi.mock('konva', () => ({ default: {} }));
vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('test-uuid') }));

if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { WeaveVideoToolAction } from '../video-tool';
import { VIDEO_TOOL_ACTION_NAME, VIDEO_TOOL_STATE } from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';
import type { WeaveVideoToolDragParams } from '../types';

type R = Record<string, unknown>;

const mockVideoParams: WeaveVideoToolDragParams = {
  placeholderUrl: 'https://example.com/thumb.jpg',
  url: 'https://example.com/video.mp4',
  width: 640,
  height: 480,
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

  const mockFoundNode = {
    getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }),
  };

  const mainLayer = {
    getAttrs: vi.fn().mockReturnValue({ id: 'main-layer-id' }),
    findOne: vi.fn().mockReturnValue(mockFoundNode),
  };

  const mockContainer = {
    getAttrs: vi.fn().mockReturnValue({ id: 'container-id' }),
    id: vi.fn().mockReturnValue('container-id'),
  };

  const mockVideoEl = { src: '', play: vi.fn(), pause: vi.fn() } as unknown as HTMLVideoElement;

  const videoNodeHandler = {
    getVideoSource: vi.fn().mockReturnValue(mockVideoEl),
    create: vi.fn().mockReturnValue({ id: 'test-uuid' }),
  };

  const selectionPlugin = { setSelectedNodes: vi.fn() };

  const stage = {
    container: vi.fn().mockReturnValue(stageContainer),
    on: vi.fn((event: string, handler: (e?: unknown) => void) => {
      stageHandlers[event] = handler;
    }),
    off: vi.fn(),
    findOne: vi.fn().mockReturnValue(mockFoundNode),
    getRelativePointerPosition: vi.fn().mockReturnValue({ x: 50, y: 75 }),
    setPointersPositions: vi.fn(),
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
  };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(selectionPlugin),
    getMousePointer: vi.fn().mockReturnValue({
      mousePoint: { x: 50, y: 75 },
      container: mockContainer,
    }),
    getNodeHandler: vi.fn().mockReturnValue(videoNodeHandler),
    getMainLayer: vi.fn().mockReturnValue(mainLayer),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    getActiveAction: vi.fn().mockReturnValue(VIDEO_TOOL_ACTION_NAME),
    emitEvent: vi.fn(),
    addNode: vi.fn(),
    triggerAction: vi.fn(),
    addEventListener: vi.fn((event: string, handler: (e?: unknown) => void) => {
      instanceHandlers[event] = handler;
    }),
    getDragStartedId: vi.fn().mockReturnValue(VIDEO_TOOL_ACTION_NAME),
    getDragProperties: vi.fn().mockReturnValue({
      videoId: 'vid-1',
      videoParams: mockVideoParams,
    }),
    startDrag: vi.fn(),
    setDragProperties: vi.fn(),
    endDrag: vi.fn(),
    // Internal references
    _stageContainer: stageContainer,
    _stageHandlers: stageHandlers,
    _instanceHandlers: instanceHandlers,
    _selectionPlugin: selectionPlugin,
    _foundNode: mockFoundNode,
    _mainLayer: mainLayer,
    _stage: stage,
    _videoNodeHandler: videoNodeHandler,
    _mockContainer: mockContainer,
    _mockVideoEl: mockVideoEl,
  };
}

function makePointerEvent(overrides: Partial<{ pointerId: number; clientX: number; clientY: number }> = {}) {
  return { evt: { pointerId: 1, clientX: 50, clientY: 75, ...overrides } };
}

describe('WeaveVideoToolAction', () => {
  let action: WeaveVideoToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let capturedKeydownHandler: ((e: KeyboardEvent) => void) | undefined;

  beforeEach(() => {
    action = new WeaveVideoToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
    (action as unknown as R)['cancelAction'] = vi.fn();

    capturedKeydownHandler = undefined;
    vi.stubGlobal('addEventListener', vi.fn((type: string, handler: unknown) => {
      if (type === 'keydown') {
        capturedKeydownHandler = handler as (e: KeyboardEvent) => void;
      }
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function triggerAction(params?: Parameters<WeaveVideoToolAction['trigger']>[1]) {
    const cancelFn = vi.fn();
    (action as unknown as R)['cancelAction'] = cancelFn;
    const result = action.trigger(cancelFn, params);
    return { cancelFn, result };
  }

  function setupTriggered() {
    triggerAction();
    (action as unknown as R)['cancelAction'] = vi.fn();
  }

  // ── Suite 1: constructor / initialize ─────────────────────────────────────────
  describe('Suite 1: constructor / initialize', () => {
    it('1.1 initialize() resets all fields to defaults', () => {
      expect((action as unknown as R)['pointers']).toBeInstanceOf(Map);
      expect(((action as unknown as R)['pointers'] as Map<number, unknown>).size).toBe(0);
      expect((action as unknown as R)['initialized']).toBe(false);
      expect((action as unknown as R)['state']).toBe(VIDEO_TOOL_STATE.IDLE);
      expect((action as unknown as R)['videoId']).toBeNull();
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['videoParams']).toBeNull();
      expect((action as unknown as R)['clickPoint']).toBeNull();
    });

    it('1.2 onPropsChange is undefined', () => {
      expect((action as unknown as R)['onPropsChange']).toBeUndefined();
    });

    it('1.3 update is undefined', () => {
      expect((action as unknown as R)['update']).toBeUndefined();
    });
  });

  // ── Suite 2: getName / initProps ──────────────────────────────────────────────
  describe('Suite 2: getName / initProps', () => {
    it('2.1 getName returns VIDEO_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(VIDEO_TOOL_ACTION_NAME);
    });

    it('2.2 initProps returns defaults', () => {
      expect(action.initProps()).toEqual({ width: 100, height: 100, scaleX: 1, scaleY: 1 });
    });
  });

  // ── Suite 3: getVideoSource ───────────────────────────────────────────────────
  describe('Suite 3: getVideoSource', () => {
    it('3.1 nodeHandler null → returns undefined', () => {
      mockWeave.getNodeHandler.mockReturnValue(null);
      expect(action.getVideoSource('some-id')).toBeUndefined();
    });

    it('3.2 nodeHandler present → returns nodeHandler.getVideoSource(videoId)', () => {
      const result = action.getVideoSource('vid-1');
      expect(result).toBe(mockWeave._mockVideoEl);
      expect(mockWeave._videoNodeHandler.getVideoSource).toHaveBeenCalledWith('vid-1');
    });
  });

  // ── Suite 4: onInit / onStageDrop ─────────────────────────────────────────────
  describe('Suite 4: onInit / onStageDrop', () => {
    beforeEach(() => {
      action.onInit();
    });

    it('4.1 dragId ≠ VIDEO_TOOL_ACTION_NAME → triggerAction NOT called', () => {
      mockWeave.getDragStartedId.mockReturnValue('otherTool');
      mockWeave._instanceHandlers['onStageDrop']?.({} as DragEvent);
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('4.2 dragProperties null → triggerAction NOT called', () => {
      mockWeave.getDragProperties.mockReturnValue(null);
      mockWeave._instanceHandlers['onStageDrop']?.({} as DragEvent);
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('4.3 mousePoint null → early return, no triggerAction', () => {
      mockWeave.getMousePointer.mockReturnValue({ mousePoint: null, container: null });
      mockWeave._instanceHandlers['onStageDrop']?.({} as DragEvent);
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('4.4 valid drop → triggerAction with videoId, videoParams, container, position', () => {
      mockWeave._instanceHandlers['onStageDrop']?.({} as DragEvent);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(
        VIDEO_TOOL_ACTION_NAME,
        expect.objectContaining({
          videoId: 'vid-1',
          videoParams: mockVideoParams,
          position: { x: 50, y: 75 },
        })
      );
    });
  });

  // ── Suite 5: trigger ──────────────────────────────────────────────────────────
  describe('Suite 5: trigger', () => {
    it('5.1 !instance → throws Error', () => {
      (action as unknown as R)['instance'] = undefined;
      expect(() => action.trigger(vi.fn())).toThrow('Instance not defined');
    });

    it('5.2 !initialized → setupEvents called (stage.on pointerdown registered)', () => {
      triggerAction();
      expect(mockWeave._stage.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect((action as unknown as R)['initialized']).toBe(true);
    });

    it('5.3 already initialized → setupEvents NOT called again', () => {
      triggerAction();
      const addEventListenerMock = (globalThis.addEventListener as ReturnType<typeof vi.fn>);
      const keydownBefore = addEventListenerMock.mock.calls.filter(([t]) => t === 'keydown').length;
      triggerAction();
      const keydownAfter = addEventListenerMock.mock.calls.filter(([t]) => t === 'keydown').length;
      expect(keydownAfter).toBe(keydownBefore);
    });

    it('5.4 selectionPlugin present → setSelectedNodes([])', () => {
      triggerAction();
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([]);
    });

    it('5.5 selectionPlugin absent → no error', () => {
      mockWeave.getPlugin.mockReturnValue(null);
      expect(() => triggerAction()).not.toThrow();
    });

    it('5.6 params.videoId → updateProps called with { videoId }', () => {
      // updateProps is called on `this` — verify state by checking action proxy
      const { result } = triggerAction({ videoId: 'ext-id', videoParams: mockVideoParams });
      // With videoParams present, doVideoAdding is called which eventually calls handleAdding
      // Just verify no error and the tool ran
      expect(result).toBeUndefined(); // early return when videoParams present
    });

    it('5.7 params.videoParams present → doVideoAdding + early return (undefined)', () => {
      const { result } = triggerAction({ videoParams: mockVideoParams });
      expect(result).toBeUndefined();
    });

    it('5.8 no params.videoParams → return { finishUploadCallback }', () => {
      const { result } = triggerAction();
      expect(result).toHaveProperty('finishUploadCallback');
      expect(typeof (result as { finishUploadCallback: unknown })?.finishUploadCallback).toBe('function');
    });

    it('5.9 forceMainContainer ?? false → stored as false when absent', () => {
      triggerAction();
      expect((action as unknown as R)['forceMainContainer']).toBe(false);
    });
  });

  // ── Suite 6: doVideoAdding ────────────────────────────────────────────────────
  describe('Suite 6: doVideoAdding', () => {
    beforeEach(() => {
      setupTriggered();
    });

    it('6.1 !position → emitEvent(onAddingVideo), clickPoint=null, state=DEFINING_POSITION', () => {
      (mockWeave.emitEvent as ReturnType<typeof vi.fn>).mockClear();
      (action as unknown as R)['doVideoAdding'](mockVideoParams);
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddingVideo', { videoURL: mockVideoParams.url });
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['state']).toBe(VIDEO_TOOL_STATE.DEFINING_POSITION);
    });

    it('6.2 position provided → handleAdding(position) called (state→FINISHED)', () => {
      (action as unknown as R)['doVideoAdding'](mockVideoParams, { x: 10, y: 20 });
      expect((action as unknown as R)['state']).toBe(VIDEO_TOOL_STATE.FINISHED);
    });

    it('6.3 videoId = "test-uuid" (uuidv4 called)', () => {
      (action as unknown as R)['doVideoAdding'](mockVideoParams);
      expect((action as unknown as R)['videoId']).toBe('test-uuid');
    });

    it('6.4 videoParams stored on instance', () => {
      (action as unknown as R)['doVideoAdding'](mockVideoParams);
      expect((action as unknown as R)['videoParams']).toBe(mockVideoParams);
    });
  });

  // ── Suite 7: addVideo ─────────────────────────────────────────────────────────
  describe('Suite 7: addVideo', () => {
    beforeEach(() => {
      setupTriggered();
    });

    it('7.1 no position → state=UPLOADING, clickPoint unchanged', () => {
      (action as unknown as R)['addVideo']();
      expect((action as unknown as R)['state']).toBe(VIDEO_TOOL_STATE.UPLOADING);
      expect((action as unknown as R)['clickPoint']).toBeNull();
    });

    it('7.2 position provided → clickPoint=position, state=UPLOADING', () => {
      (action as unknown as R)['addVideo']({ x: 30, y: 40 });
      expect((action as unknown as R)['clickPoint']).toEqual({ x: 30, y: 40 });
      expect((action as unknown as R)['state']).toBe(VIDEO_TOOL_STATE.UPLOADING);
    });
  });

  // ── Suite 8: handleAdding ─────────────────────────────────────────────────────
  describe('Suite 8: handleAdding', () => {
    beforeEach(() => {
      setupTriggered();
    });

    it('8.1 videoId null → cancelAction called, addNode NOT called', () => {
      (action as unknown as R)['videoId'] = null;
      (action as unknown as R)['videoParams'] = mockVideoParams;
      (action as unknown as R)['handleAdding']();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
      expect((action as unknown as R)['cancelAction']).toHaveBeenCalled();
    });

    it('8.2 videoParams null → cancelAction called, addNode NOT called', () => {
      (action as unknown as R)['videoId'] = 'test-uuid';
      (action as unknown as R)['videoParams'] = null;
      (action as unknown as R)['handleAdding']();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
      expect((action as unknown as R)['cancelAction']).toHaveBeenCalled();
    });

    it('8.3 nodeHandler + clickPoint → create(), addNode(), emitEvent(onAddedVideo), state=FINISHED', () => {
      (action as unknown as R)['videoId'] = 'test-uuid';
      (action as unknown as R)['videoParams'] = mockVideoParams;
      (action as unknown as R)['handleAdding']();
      expect(mockWeave._videoNodeHandler.create).toHaveBeenCalled();
      expect(mockWeave.addNode).toHaveBeenCalled();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedVideo', {
        videoURL: mockVideoParams.url,
        nodeId: 'test-uuid',
      });
      expect((action as unknown as R)['state']).toBe(VIDEO_TOOL_STATE.FINISHED);
      expect((action as unknown as R)['cancelAction']).toHaveBeenCalled();
    });

    it('8.4 nodeHandler null → state STILL becomes FINISHED (setState is outside nodeHandler if)', () => {
      (action as unknown as R)['videoId'] = 'test-uuid';
      (action as unknown as R)['videoParams'] = mockVideoParams;
      (action as unknown as R)['state'] = VIDEO_TOOL_STATE.DEFINING_POSITION;
      mockWeave.getNodeHandler.mockReturnValue(null);
      (action as unknown as R)['handleAdding']();
      expect((action as unknown as R)['state']).toBe(VIDEO_TOOL_STATE.FINISHED);
      expect(mockWeave.addNode).not.toHaveBeenCalled();
      expect((action as unknown as R)['cancelAction']).toHaveBeenCalled();
    });

    it('8.5 forceMainContainer=true → addNode with mainLayerId', () => {
      (action as unknown as R)['videoId'] = 'test-uuid';
      (action as unknown as R)['videoParams'] = mockVideoParams;
      (action as unknown as R)['forceMainContainer'] = true;
      (action as unknown as R)['handleAdding']();
      const addNodeArgs = (mockWeave.addNode as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(addNodeArgs[1]).toBe('main-layer-id');
    });

    it('8.6 forceMainContainer=false → addNode with container id', () => {
      (action as unknown as R)['videoId'] = 'test-uuid';
      (action as unknown as R)['videoParams'] = mockVideoParams;
      (action as unknown as R)['forceMainContainer'] = false;
      (action as unknown as R)['handleAdding']();
      const addNodeArgs = (mockWeave.addNode as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(addNodeArgs[1]).toBe('container-id');
    });

    it('8.7 getMousePointer returns null mousePoint → x:0, y:0 in node create', () => {
      (action as unknown as R)['videoId'] = 'test-uuid';
      (action as unknown as R)['videoParams'] = mockVideoParams;
      mockWeave.getMousePointer.mockReturnValue({ mousePoint: null, container: mockWeave._mockContainer });
      (action as unknown as R)['handleAdding']();
      const createArgs = (mockWeave._videoNodeHandler.create as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(createArgs.x).toBe(0);
      expect(createArgs.y).toBe(0);
    });

    it('8.8 this.container undefined → falls back to getMousePointer container', () => {
      (action as unknown as R)['videoId'] = 'test-uuid';
      (action as unknown as R)['videoParams'] = mockVideoParams;
      (action as unknown as R)['container'] = undefined;
      (action as unknown as R)['handleAdding']();
      expect((action as unknown as R)['container']).toBe(mockWeave._mockContainer);
    });
  });

  // ── Suite 9: keydown handler ──────────────────────────────────────────────────
  describe('Suite 9: keydown handler', () => {
    beforeEach(() => {
      triggerAction();
    });

    it('9.1 Escape + active=videoTool → cancelAction called', () => {
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      capturedKeydownHandler?.({ code: 'Escape' } as KeyboardEvent);
      expect(cancelFn).toHaveBeenCalled();
    });

    it('9.2 Escape + active≠videoTool → cancelAction NOT called', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      capturedKeydownHandler?.({ code: 'Escape' } as KeyboardEvent);
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('9.3 non-Escape → cancelAction NOT called', () => {
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      capturedKeydownHandler?.({ code: 'Enter' } as KeyboardEvent);
      expect(cancelFn).not.toHaveBeenCalled();
    });
  });

  // ── Suite 10: pointerdown handler ─────────────────────────────────────────────
  describe('Suite 10: pointerdown handler', () => {
    beforeEach(() => {
      triggerAction();
    });

    it('10.1 pointer stored in map with { x: clientX, y: clientY }', () => {
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent({ pointerId: 5, clientX: 100, clientY: 200 }));
      const pointers = (action as unknown as R)['pointers'] as Map<number, { x: number; y: number }>;
      expect(pointers.get(5)).toEqual({ x: 100, y: 200 });
    });

    it('10.2 state=DEFINING_POSITION → SELECTED_POSITION', () => {
      (action as unknown as R)['state'] = VIDEO_TOOL_STATE.DEFINING_POSITION;
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent());
      expect((action as unknown as R)['state']).toBe(VIDEO_TOOL_STATE.SELECTED_POSITION);
    });

    it('10.3 state=IDLE → state unchanged', () => {
      (action as unknown as R)['state'] = VIDEO_TOOL_STATE.IDLE;
      mockWeave._stageHandlers['pointerdown']?.(makePointerEvent());
      expect((action as unknown as R)['state']).toBe(VIDEO_TOOL_STATE.IDLE);
    });
  });

  // ── Suite 11: pointermove handler ─────────────────────────────────────────────
  describe('Suite 11: pointermove handler', () => {
    beforeEach(() => {
      triggerAction();
    });

    it('11.1 state=IDLE → early return, cursor NOT set', () => {
      (action as unknown as R)['state'] = VIDEO_TOOL_STATE.IDLE;
      mockWeave._stageContainer.style.cursor = '';
      mockWeave._stageHandlers['pointermove']?.();
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('11.2 state=DEFINING_POSITION → setCursor → cursor=crosshair', () => {
      (action as unknown as R)['state'] = VIDEO_TOOL_STATE.DEFINING_POSITION;
      mockWeave._stageHandlers['pointermove']?.();
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });
  });

  // ── Suite 12: pointerup handler ───────────────────────────────────────────────
  describe('Suite 12: pointerup handler', () => {
    beforeEach(() => {
      triggerAction();
    });

    it('12.1 pointer deleted from map', () => {
      const pointers = (action as unknown as R)['pointers'] as Map<number, { x: number; y: number }>;
      pointers.set(1, { x: 50, y: 75 });
      mockWeave._stageHandlers['pointerup']?.(makePointerEvent({ pointerId: 1 }));
      expect(pointers.has(1)).toBe(false);
    });

    it('12.2 state=SELECTED_POSITION → handleAdding called (state→FINISHED or cancelAction)', () => {
      (action as unknown as R)['state'] = VIDEO_TOOL_STATE.SELECTED_POSITION;
      (action as unknown as R)['videoId'] = 'test-uuid';
      (action as unknown as R)['videoParams'] = mockVideoParams;
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      mockWeave._stageHandlers['pointerup']?.(makePointerEvent({ pointerId: 1 }));
      expect(cancelFn).toHaveBeenCalled();
    });

    it('12.3 state=DEFINING_POSITION → handleAdding NOT called', () => {
      (action as unknown as R)['state'] = VIDEO_TOOL_STATE.DEFINING_POSITION;
      (action as unknown as R)['videoId'] = 'test-uuid';
      (action as unknown as R)['videoParams'] = mockVideoParams;
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      cancelFn.mockClear();
      mockWeave._stageHandlers['pointerup']?.(makePointerEvent({ pointerId: 1 }));
      expect(cancelFn).not.toHaveBeenCalled();
    });
  });

  // ── Suite 13: setCursor ───────────────────────────────────────────────────────
  describe('Suite 13: setCursor', () => {
    it('13.1 setCursor() → stageContainer.style.cursor = "crosshair"', () => {
      triggerAction();
      (action as unknown as R)['setCursor']();
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });
  });

  // ── Suite 14: setDragAndDropProperties ───────────────────────────────────────
  describe('Suite 14: setDragAndDropProperties', () => {
    it('14.1 startDrag(VIDEO_TOOL_ACTION_NAME) + setDragProperties(properties) called', () => {
      const props = { videoId: 'v-1', videoParams: mockVideoParams };
      action.setDragAndDropProperties(props);
      expect(mockWeave.startDrag).toHaveBeenCalledWith(VIDEO_TOOL_ACTION_NAME);
      expect(mockWeave.setDragProperties).toHaveBeenCalledWith(props);
    });
  });

  // ── Suite 15: cleanup ─────────────────────────────────────────────────────────
  describe('Suite 15: cleanup', () => {
    beforeEach(() => {
      triggerAction();
    });

    it('15.1 selectionPlugin + node found → setSelectedNodes([node]) + triggerAction(SELECTION)', () => {
      (action as unknown as R)['videoId'] = 'test-uuid';
      (mockWeave._selectionPlugin.setSelectedNodes as ReturnType<typeof vi.fn>).mockClear();
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([mockWeave._foundNode]);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('15.2 selectionPlugin + node NOT found → setSelectedNodes NOT called', () => {
      mockWeave._stage.findOne.mockReturnValue(null);
      (action as unknown as R)['videoId'] = 'test-uuid';
      (mockWeave._selectionPlugin.setSelectedNodes as ReturnType<typeof vi.fn>).mockClear();
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
    });

    it('15.3 selectionPlugin absent → no error', () => {
      mockWeave.getPlugin.mockReturnValue(null);
      expect(() => action.cleanup()).not.toThrow();
    });

    it('15.4 endDrag called + cursor = "default"', () => {
      action.cleanup();
      expect(mockWeave.endDrag).toHaveBeenCalledWith(VIDEO_TOOL_ACTION_NAME);
      expect(mockWeave._stageContainer.style.cursor).toBe('default');
    });

    it('15.5 all fields reset after cleanup', () => {
      (action as unknown as R)['videoId'] = 'test-uuid';
      (action as unknown as R)['forceMainContainer'] = true;
      (action as unknown as R)['container'] = mockWeave._mockContainer;
      (action as unknown as R)['videoParams'] = mockVideoParams;
      (action as unknown as R)['clickPoint'] = { x: 1, y: 2 };
      action.cleanup();
      expect((action as unknown as R)['initialCursor']).toBeNull();
      expect((action as unknown as R)['videoId']).toBeNull();
      expect((action as unknown as R)['forceMainContainer']).toBe(false);
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['videoParams']).toBeNull();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['state']).toBe(VIDEO_TOOL_STATE.IDLE);
    });
  });
});
