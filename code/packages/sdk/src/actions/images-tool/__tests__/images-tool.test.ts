// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted Konva shape mocks ──────────────────────────────────────────────────
const { MockGroup, MockImage, MockText, MockRect } = vi.hoisted(() => {
  const MockGroup = vi.fn().mockImplementation(() => ({
    setAttrs: vi.fn(),
    destroy: vi.fn(),
    add: vi.fn(),
  }));
  const MockImage = vi.fn().mockImplementation(() => ({
    moveToBottom: vi.fn(),
  }));
  const MockText = vi.fn().mockImplementation(() => ({
    measureSize: vi.fn().mockReturnValue({ height: 20 }),
    y: vi.fn().mockReturnValue(5),
    x: vi.fn().mockReturnValue(10),
    width: vi.fn().mockReturnValue(100),
    height: vi.fn().mockReturnValue(20),
    moveToTop: vi.fn(),
  }));
  const MockRect = vi.fn().mockImplementation(() => ({
    moveToBottom: vi.fn(),
  }));
  return { MockGroup, MockImage, MockText, MockRect };
});

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));
vi.mock('konva', () => ({
  default: { Group: MockGroup, Image: MockImage, Text: MockText, Rect: MockRect },
}));
vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('test-uuid') }));
vi.mock('@/utils/image', () => ({
  loadImageSource: vi.fn().mockResolvedValue({ width: 400, height: 300 }),
}));
vi.mock('@/utils/utils', () => ({
  mergeExceptArrays: vi.fn(
    (a: Record<string, unknown>, b: Record<string, unknown>) => ({ ...a, ...b })
  ),
  sleep: vi.fn().mockResolvedValue(undefined),
}));

if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { makePointerEvent, type R } from '../../__tests__/shared/action.test-helpers';
import { WeaveImagesToolAction } from '../images-tool';
import {
  WEAVE_IMAGES_TOOL_ACTION_NAME,
  WEAVE_IMAGES_TOOL_UPLOAD_TYPE,
  WEAVE_IMAGES_TOOL_STATE,
} from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';
import { WEAVE_IMAGE_TOOL_ACTION_NAME } from '../../image-tool/constants';

const mockImagesURL = [
  { url: 'https://example.com/a.png', fallback: 'data:a', width: 400, height: 300 },
  { url: 'https://example.com/b.png', fallback: 'data:b', width: 200, height: 150 },
];

function makeImageFile(name = 'test.png') {
  return {
    file: new File(['test'], name, { type: 'image/png' }),
    downscaleRatio: 0.5,
    width: 200,
    height: 150,
  };
}

function makeImageNodeHandler() {
  return {
    getImageSource: vi.fn().mockReturnValue({ width: 400, height: 300 }),
    getFallbackImageSource: vi.fn().mockReturnValue(null),
    forceLoadImage: vi.fn(),
    serialize: vi.fn().mockReturnValue({ id: 'test-uuid' }),
  };
}

function makeMockWeave() {
  const containerHandlers: Record<string, (e?: unknown) => void> = {};
  const stageContainer = {
    tabIndex: 0,
    focus: vi.fn(),
    blur: vi.fn(),
    style: { cursor: '' },
    addEventListener: vi.fn((type: string, handler: (e?: unknown) => void) => {
      containerHandlers[type] = handler;
    }),
  };

  const stageHandlers: Record<string, (e?: unknown) => void> = {};
  const instanceHandlers: Record<string, (e?: unknown) => void> = {};

  const mockFoundNode = {
    setAttr: vi.fn(),
    getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }),
  };

  const utilityLayer = { add: vi.fn(), batchDraw: vi.fn() };

  const stage = {
    container: vi.fn().mockReturnValue(stageContainer),
    on: vi.fn((event: string, handler: (e?: unknown) => void) => {
      stageHandlers[event] = handler;
    }),
    findOne: vi.fn().mockReturnValue(mockFoundNode),
    getRelativePointerPosition: vi.fn().mockReturnValue({ x: 100, y: 100 }),
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
    setPointersPositions: vi.fn(),
  };

  const defaultContainer = {
    getAttrs: vi.fn().mockReturnValue({ id: 'container-id' }),
  };

  const selectionPlugin = { setSelectedNodes: vi.fn() };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(selectionPlugin),
    getMousePointer: vi.fn().mockReturnValue({
      mousePoint: { x: 50, y: 75 },
      container: defaultContainer,
    }),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    getActionHandler: vi.fn().mockReturnValue({}), // non-null imageTool handler
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    getActiveAction: vi.fn().mockReturnValue(WEAVE_IMAGES_TOOL_ACTION_NAME),
    emitEvent: vi.fn(),
    addNode: vi.fn(),
    triggerAction: vi.fn(),
    updateNode: vi.fn(),
    startDrag: vi.fn(),
    endDrag: vi.fn(),
    setDragProperties: vi.fn(),
    getDragStartedId: vi.fn().mockReturnValue(WEAVE_IMAGES_TOOL_ACTION_NAME),
    getDragProperties: vi.fn().mockReturnValue({ imagesURL: mockImagesURL }),
    addEventListener: vi.fn((event: string, handler: (e?: unknown) => void) => {
      instanceHandlers[event] = handler;
    }),
    removeEventListener: vi.fn(),
    getUtilityLayer: vi.fn().mockReturnValue(utilityLayer),
    getMainLayer: vi.fn().mockReturnValue({ getAttrs: vi.fn().mockReturnValue({ id: 'main-layer-id' }) }),
    _stage: stage,
    _stageContainer: stageContainer,
    _containerHandlers: containerHandlers,
    _stageHandlers: stageHandlers,
    _instanceHandlers: instanceHandlers,
    _selectionPlugin: selectionPlugin,
    _defaultContainer: defaultContainer,
    _utilityLayer: utilityLayer,
    _foundNode: mockFoundNode,
  };
}


describe('WeaveImagesToolAction', () => {
  let action: WeaveImagesToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;

  beforeEach(() => {
    MockGroup.mockClear();
    MockImage.mockClear();
    MockText.mockClear();
    MockRect.mockClear();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

    action = new WeaveImagesToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
    (action as unknown as R)['cancelAction'] = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function triggerImageURL(
    params: Partial<Parameters<WeaveImagesToolAction['trigger']>[1]> = {}
  ) {
    const cancelFn = vi.fn();
    action.trigger(cancelFn, {
      type: WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL,
      images: mockImagesURL,
      ...params,
    } as Parameters<WeaveImagesToolAction['trigger']>[1]);
    return { cancelFn };
  }

  function setupAction() {
    triggerImageURL();
    (mockWeave._selectionPlugin.setSelectedNodes as ReturnType<typeof vi.fn>).mockClear();
    (action as unknown as R)['cancelAction'] = vi.fn();
    (action as unknown as R)['state'] = WEAVE_IMAGES_TOOL_STATE.IDLE;
  }

  // ── Suite 1: constructor / initialize ─────────────────────────────────────────
  describe('Suite 1: constructor / initialize', () => {
    it('1.1 no params → config defined with defaults', () => {
      expect((action as unknown as R)['config']).toBeDefined();
    });

    it('1.2 with params → merged config', () => {
      const custom = new WeaveImagesToolAction({ layout: { columns: 2 } });
      expect((custom as unknown as R)['config']).toBeDefined();
    });

    it('1.3 initialize() sets all fields to defaults', () => {
      expect((action as unknown as R)['pointers']).toBeInstanceOf(Map);
      expect(((action as unknown as R)['pointers'] as Map<number, unknown>).size).toBe(0);
      expect((action as unknown as R)['initialized']).toBe(false);
      expect((action as unknown as R)['tempPointerFeedbackNode']).toBeNull();
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGES_TOOL_STATE.IDLE);
      expect((action as unknown as R)['imagesFile']).toEqual([]);
      expect((action as unknown as R)['imagesURL']).toEqual([]);
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['preloadImgs']).toEqual({});
      expect((action as unknown as R)['uploadType']).toBeNull();
      expect((action as unknown as R)['clickPoint']).toBeNull();
    });

    it('1.4 onPropsChange is undefined', () => {
      expect((action as unknown as R)['onPropsChange']).toBeUndefined();
    });

    it('1.5 update is undefined', () => {
      expect((action as unknown as R)['update']).toBeUndefined();
    });
  });

  // ── Suite 2: getName / getPreloadedImage / initProps ──────────────────────────
  describe('Suite 2: getName / getPreloadedImage / initProps', () => {
    it('2.1 getName returns WEAVE_IMAGES_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(WEAVE_IMAGES_TOOL_ACTION_NAME);
    });

    it('2.2 initProps returns defaults', () => {
      expect(action.initProps()).toEqual({ width: 100, height: 100, scaleX: 1, scaleY: 1 });
    });

    it('2.3 getPreloadedImage: imageId present → returns element', () => {
      const img = { src: '', naturalWidth: 100 } as unknown as HTMLImageElement;
      (action as unknown as R)['preloadImgs'] = { 'img-1': img };
      expect(action.getPreloadedImage('img-1')).toBe(img);
    });

    it('2.4 getPreloadedImage: imageId absent → undefined', () => {
      (action as unknown as R)['preloadImgs'] = {};
      expect(action.getPreloadedImage('missing')).toBeUndefined();
    });
  });

  // ── Suite 3: onInit / onStageDrop ─────────────────────────────────────────────
  describe('Suite 3: onInit / onStageDrop', () => {
    beforeEach(() => {
      action.onInit();
    });

    it('3.1 onInit registers onStageDrop on instance', () => {
      expect(mockWeave.addEventListener).toHaveBeenCalledWith(
        'onStageDrop',
        expect.any(Function)
      );
    });

    it('3.2 dragId ≠ imagesTool → triggerAction NOT called', () => {
      mockWeave.getDragStartedId.mockReturnValue('otherTool');
      mockWeave._instanceHandlers['onStageDrop']({} as DragEvent);
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('3.3 dragProperties null → triggerAction NOT called', () => {
      mockWeave.getDragProperties.mockReturnValue(null);
      mockWeave._instanceHandlers['onStageDrop']({} as DragEvent);
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('3.4 mousePoint null → early return', () => {
      mockWeave.getMousePointer.mockReturnValue({ mousePoint: null, container: null });
      mockWeave._instanceHandlers['onStageDrop']({} as DragEvent);
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('3.5 valid drop, no forceMainContainer → triggerAction with IMAGE_URL type', () => {
      mockWeave._instanceHandlers['onStageDrop']({} as DragEvent);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(
        WEAVE_IMAGES_TOOL_ACTION_NAME,
        expect.objectContaining({
          type: WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL,
          images: mockImagesURL,
          position: { x: 50, y: 75 },
        })
      );
      const callArgs = (mockWeave.triggerAction as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs).not.toHaveProperty('forceMainContainer');
    });

    it('3.6 valid drop with forceMainContainer=true → spread into call', () => {
      mockWeave.getDragProperties.mockReturnValue({
        imagesURL: mockImagesURL,
        forceMainContainer: true,
      });
      mockWeave._instanceHandlers['onStageDrop']({} as DragEvent);
      const callArgs = (mockWeave.triggerAction as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs.forceMainContainer).toBe(true);
    });
  });

  // ── Suite 4: trigger ──────────────────────────────────────────────────────────
  describe('Suite 4: trigger', () => {
    it('4.1 !instance → throws Error', () => {
      (action as unknown as R)['instance'] = undefined;
      expect(() =>
        action.trigger(vi.fn(), {
          type: WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL,
          images: mockImagesURL,
        })
      ).toThrow('Instance not defined');
    });

    it('4.2 first trigger → setupEvents, initialized=true', () => {
      triggerImageURL();
      expect((action as unknown as R)['initialized']).toBe(true);
      expect(mockWeave._stage.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    });

    it('4.3 second trigger → setupEvents NOT called again', () => {
      triggerImageURL();
      const callCount = (mockWeave._stage.on as ReturnType<typeof vi.fn>).mock.calls.length;
      triggerImageURL();
      expect((mockWeave._stage.on as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
    });

    it('4.4 selectionPlugin present → setSelectedNodes([])', () => {
      triggerImageURL();
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([]);
    });

    it('4.5 no selectionPlugin → no error', () => {
      mockWeave.getPlugin.mockReturnValue(null);
      expect(() => triggerImageURL()).not.toThrow();
    });

    it('4.6 params.position → state=SELECTED_POSITION', () => {
      triggerImageURL({ position: { x: 10, y: 20 } });
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGES_TOOL_STATE.SELECTED_POSITION);
    });

    it('4.7 params.container → this.container set', () => {
      const mockContainer = { getAttrs: vi.fn().mockReturnValue({ id: 'c' }) };
      triggerImageURL({ container: mockContainer as unknown as Parameters<WeaveImagesToolAction['trigger']>[1]['container'] });
      expect((action as unknown as R)['container']).toBe(mockContainer);
    });

    it('4.8 forceMainContainer defaults to false via ?? false', () => {
      triggerImageURL();
      expect((action as unknown as R)['forceMainContainer']).toBe(false);
    });

    it('4.9 invalid type → cancelAction() + return', () => {
      const cancelFn = vi.fn();
      // @ts-expect-error intentional
      action.trigger(cancelFn, { type: 'invalid', images: [] });
      expect(cancelFn).toHaveBeenCalled();
    });
  });

  // ── Suite 5: trigger type=FILE ────────────────────────────────────────────────
  describe('Suite 5: trigger type=FILE', () => {
    const uploadFn = vi.fn().mockResolvedValue('https://upload.example.com/img.png');
    const onStart = vi.fn();
    const onFinish = vi.fn();

    it('5.1 uploadType=FILE, imagesFile + callbacks stored', () => {
      const files = [makeImageFile()];
      action.trigger(vi.fn(), {
        type: WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE,
        images: files,
        uploadImageFunction: uploadFn,
        onStartUploading: onStart,
        onFinishedUploading: onFinish,
      });
      expect((action as unknown as R)['uploadType']).toBe(WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE);
      expect((action as unknown as R)['imagesFile']).toBe(files);
      expect((action as unknown as R)['uploadImageFunction']).toBe(uploadFn);
    });

    it('5.2 nodesIds reset to new Set() inside FILE block', () => {
      (action as unknown as R)['nodesIds'] = new Set(['old-id']);
      action.trigger(vi.fn(), {
        type: WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE,
        images: [makeImageFile()],
        uploadImageFunction: uploadFn,
        onStartUploading: onStart,
        onFinishedUploading: onFinish,
      });
      // nodesIds is reset to a new Set in FILE block then populated by addImages
      expect((action as unknown as R)['nodesIds']).toBeInstanceOf(Set);
    });

    it('5.3 addImages called → state transitions toward DEFINING_POSITION', async () => {
      action.trigger(vi.fn(), {
        type: WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE,
        images: [makeImageFile()],
        uploadImageFunction: uploadFn,
        onStartUploading: onStart,
        onFinishedUploading: onFinish,
      });
      // Wait for async addImages (loadImageSource is mocked to resolve)
      await new Promise((r) => setTimeout(r, 0));
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION);
    });
  });

  // ── Suite 6: trigger type=IMAGE_URL ──────────────────────────────────────────
  describe('Suite 6: trigger type=IMAGE_URL', () => {
    it('6.1 uploadType=IMAGE_URL, imagesURL stored, nodesIds reset', () => {
      (action as unknown as R)['nodesIds'] = ['old'];
      triggerImageURL();
      expect((action as unknown as R)['uploadType']).toBe(WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL);
      expect((action as unknown as R)['imagesURL']).toBe(mockImagesURL);
    });

    it('6.2 addImages called → state transitions to DEFINING_POSITION', () => {
      triggerImageURL();
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION);
    });
  });

  // ── Suite 7: keydown handler (on stageContainer) ──────────────────────────────
  describe('Suite 7: keydown handler', () => {
    beforeEach(setupAction);

    it('7.1 Escape + active=imagesTool → cancelAction', () => {
      mockWeave._containerHandlers['keydown']({ key: 'Escape' });
      expect((action as unknown as R)['cancelAction']).toHaveBeenCalledTimes(1);
    });

    it('7.2 Escape + active≠imagesTool → skip', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      mockWeave._containerHandlers['keydown']({ key: 'Escape' });
      expect((action as unknown as R)['cancelAction']).not.toHaveBeenCalled();
    });

    it('7.3 non-Escape key → skip', () => {
      mockWeave._containerHandlers['keydown']({ key: 'Enter' });
      expect((action as unknown as R)['cancelAction']).not.toHaveBeenCalled();
    });
  });

  // ── Suite 8: pointerdown handler ──────────────────────────────────────────────
  describe('Suite 8: pointerdown handler', () => {
    beforeEach(setupAction);

    it('8.1 pointer stored in map (no ignorePointerEvents guard)', () => {
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 5 }));
      const pointers = (action as unknown as R)['pointers'] as Map<number, unknown>;
      expect(pointers.has(5)).toBe(true);
    });

    it('8.2 2 pointers + active=imagesTool → state=DEFINING_POSITION', () => {
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 2 }));
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION);
    });

    it('8.3 2 pointers + active≠imagesTool → state unchanged (IDLE)', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 2 }));
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGES_TOOL_STATE.IDLE);
    });

    it('8.4 state=DEFINING_POSITION + 1 pointer → state=SELECTED_POSITION', () => {
      (action as unknown as R)['state'] = WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGES_TOOL_STATE.SELECTED_POSITION);
    });

    it('8.5 state=IDLE + 1 pointer → state stays IDLE', () => {
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGES_TOOL_STATE.IDLE);
    });
  });

  // ── Suite 9: pointermove handler ──────────────────────────────────────────────
  describe('Suite 9: pointermove handler', () => {
    beforeEach(setupAction);

    it('9.1 state=IDLE → early return, no setCursor', () => {
      mockWeave._stageContainer.style.cursor = '';
      mockWeave._stageHandlers['pointermove'](makePointerEvent());
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('9.2 state=DEFINING_POSITION → setCursor + setFocusStage', () => {
      (action as unknown as R)['state'] = WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION;
      mockWeave._stageHandlers['pointermove'](makePointerEvent());
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
      expect(mockWeave._stageContainer.tabIndex).toBe(1);
    });

    it('9.3 2 pointers + active=imagesTool → state=DEFINING_POSITION, return', () => {
      (action as unknown as R)['state'] = WEAVE_IMAGES_TOOL_STATE.SELECTED_POSITION;
      const pointers = (action as unknown as R)['pointers'] as Map<number, { x: number; y: number }>;
      pointers.set(1, { x: 0, y: 0 });
      pointers.set(2, { x: 10, y: 10 });
      mockWeave._stageHandlers['pointermove'](makePointerEvent());
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION);
    });

    it('9.4 DEFINING_POSITION + tempNode + active + mouse → setAttrs', () => {
      const mockTempNode = { setAttrs: vi.fn() };
      (action as unknown as R)['state'] = WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION;
      (action as unknown as R)['tempPointerFeedbackNode'] = mockTempNode;
      mockWeave._stageHandlers['pointermove'](makePointerEvent({ pointerType: 'mouse' }));
      expect(mockTempNode.setAttrs).toHaveBeenCalledWith({
        x: expect.any(Number),
        y: expect.any(Number),
      });
    });

    it('9.5 SELECTED_POSITION + tempNode + active + mouse → setAttrs', () => {
      const mockTempNode = { setAttrs: vi.fn() };
      (action as unknown as R)['state'] = WEAVE_IMAGES_TOOL_STATE.SELECTED_POSITION;
      (action as unknown as R)['tempPointerFeedbackNode'] = mockTempNode;
      mockWeave._stageHandlers['pointermove'](makePointerEvent({ pointerType: 'mouse' }));
      expect(mockTempNode.setAttrs).toHaveBeenCalled();
    });

    it('9.6 pointerType≠mouse → setAttrs NOT called', () => {
      const mockTempNode = { setAttrs: vi.fn() };
      (action as unknown as R)['state'] = WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION;
      (action as unknown as R)['tempPointerFeedbackNode'] = mockTempNode;
      mockWeave._stageHandlers['pointermove'](makePointerEvent({ pointerType: 'touch' }));
      expect(mockTempNode.setAttrs).not.toHaveBeenCalled();
    });

    it('9.7 no tempNode → no setAttrs error', () => {
      (action as unknown as R)['state'] = WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION;
      (action as unknown as R)['tempPointerFeedbackNode'] = null;
      expect(() =>
        mockWeave._stageHandlers['pointermove'](makePointerEvent({ pointerType: 'mouse' }))
      ).not.toThrow();
    });

    it('9.8 mousePos null → ?? 0 fallback used', () => {
      const mockTempNode = { setAttrs: vi.fn() };
      (action as unknown as R)['state'] = WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION;
      (action as unknown as R)['tempPointerFeedbackNode'] = mockTempNode;
      mockWeave._stage.getRelativePointerPosition.mockReturnValue(null);
      mockWeave._stageHandlers['pointermove'](makePointerEvent({ pointerType: 'mouse' }));
      expect(mockTempNode.setAttrs).toHaveBeenCalledWith({
        x: expect.any(Number),
        y: expect.any(Number),
      });
    });
  });

  // ── Suite 10: pointerup handler ───────────────────────────────────────────────
  describe('Suite 10: pointerup handler', () => {
    beforeEach(setupAction);

    it('10.1 pointer deleted from map', () => {
      const pointers = (action as unknown as R)['pointers'] as Map<number, { x: number; y: number }>;
      pointers.set(1, { x: 0, y: 0 });
      mockWeave._stageHandlers['pointerup'](makePointerEvent({ pointerId: 1 }));
      expect(pointers.has(1)).toBe(false);
    });

    it('10.2 state=SELECTED_POSITION → emitEvent(onSelectedPositionImages) + handleAdding', async () => {
      (action as unknown as R)['state'] = WEAVE_IMAGES_TOOL_STATE.SELECTED_POSITION;
      (action as unknown as R)['imagesURL'] = mockImagesURL;
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL;
      (action as unknown as R)['nodesIds'] = [];
      mockWeave._stageHandlers['pointerup'](makePointerEvent({ pointerId: 1 }));
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onSelectedPositionImages');
      await new Promise((r) => setTimeout(r, 0));
      // handleAdding ran → triggerAction called per image
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(
        WEAVE_IMAGE_TOOL_ACTION_NAME,
        expect.any(Object),
        true
      );
    });

    it('10.3 state=DEFINING_POSITION → neither emitEvent nor handleAdding', () => {
      (action as unknown as R)['state'] = WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION;
      mockWeave._stageHandlers['pointerup'](makePointerEvent({ pointerId: 1 }));
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onSelectedPositionImages');
    });
  });

  // ── Suite 11: addImages ───────────────────────────────────────────────────────
  describe('Suite 11: addImages', () => {
    beforeEach(setupAction);

    it('11.1 position provided → setState(SELECTED_POSITION), handleAdding(position), early return', async () => {
      (action as unknown as R)['imagesURL'] = mockImagesURL;
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL;
      await (action as unknown as R)['addImages']({ x: 10, y: 20 });
      // addImages sets SELECTED_POSITION then fires handleAdding (not awaited) and returns
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGES_TOOL_STATE.SELECTED_POSITION);
      await new Promise((r) => setTimeout(r, 0));
      // handleAdding ran → triggerAction called per image, nodesIds populated
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(
        WEAVE_IMAGE_TOOL_ACTION_NAME,
        expect.any(Object),
        true
      );
    });

    it('11.2 tempPointerFeedbackNode already set → no new Group created', async () => {
      (action as unknown as R)['tempPointerFeedbackNode'] = { setAttrs: vi.fn(), destroy: vi.fn() };
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE;
      (action as unknown as R)['imagesFile'] = [makeImageFile()];
      await (action as unknown as R)['addImages']();
      expect(MockGroup).not.toHaveBeenCalled();
    });

    it('11.3 isTouchDevice=true → no Group created', async () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE;
      (action as unknown as R)['imagesFile'] = [makeImageFile()];
      await (action as unknown as R)['addImages']();
      expect(MockGroup).not.toHaveBeenCalled();
    });

    it('11.4 uploadType=IMAGE_URL → no thumbnail Group (FILE-only block)', async () => {
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL;
      (action as unknown as R)['imagesFile'] = [makeImageFile()];
      await (action as unknown as R)['addImages']();
      expect(MockGroup).not.toHaveBeenCalled();
    });

    it('11.5 uploadType=FILE, 1-3 images → Group + Image(s) created, added to utilityLayer', async () => {
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE;
      (action as unknown as R)['imagesFile'] = [makeImageFile('a.png'), makeImageFile('b.png')];
      await (action as unknown as R)['addImages']();
      expect(MockGroup).toHaveBeenCalled();
      expect(MockImage).toHaveBeenCalledTimes(2);
      expect(mockWeave._utilityLayer.add).toHaveBeenCalled();
    });

    it('11.6 imagesFile.length > 3 → Konva.Text + Konva.Rect created', async () => {
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE;
      (action as unknown as R)['imagesFile'] = [
        makeImageFile('a.png'), makeImageFile('b.png'),
        makeImageFile('c.png'), makeImageFile('d.png'),
      ];
      await (action as unknown as R)['addImages']();
      expect(MockText).toHaveBeenCalled();
      expect(MockRect).toHaveBeenCalled();
    });

    it('11.7 imagesFile.length ≤ 3 → no Text/Rect', async () => {
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE;
      (action as unknown as R)['imagesFile'] = [makeImageFile('a.png'), makeImageFile('b.png')];
      await (action as unknown as R)['addImages']();
      expect(MockText).not.toHaveBeenCalled();
      expect(MockRect).not.toHaveBeenCalled();
    });

    it('11.8 mousePos null → ?? 0 fallback in Group position', async () => {
      mockWeave._stage.getRelativePointerPosition.mockReturnValue(null);
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE;
      (action as unknown as R)['imagesFile'] = [makeImageFile()];
      await (action as unknown as R)['addImages']();
      expect(MockGroup).toHaveBeenCalledWith(
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) })
      );
    });

    it('11.9 emitEvent(onAddingImages), clickPoint=null, setState(DEFINING_POSITION)', async () => {
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE;
      (action as unknown as R)['imagesFile'] = [makeImageFile()];
      (action as unknown as R)['clickPoint'] = { x: 10, y: 20 };
      (mockWeave.emitEvent as ReturnType<typeof vi.fn>).mockClear();
      await (action as unknown as R)['addImages']();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddingImages');
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION);
    });
  });

  // ── Suite 12: handleAdding ────────────────────────────────────────────────────
  describe('Suite 12: handleAdding', () => {
    beforeEach(() => {
      setupAction();
    });

    it('12.1 tempPointerFeedbackNode destroyed, batchDraw + cursor=default', async () => {
      const mockTempNode = { destroy: vi.fn() };
      (action as unknown as R)['tempPointerFeedbackNode'] = mockTempNode;
      (action as unknown as R)['imagesURL'] = mockImagesURL;
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL;
      await (action as unknown as R)['handleAdding']();
      expect(mockTempNode.destroy).toHaveBeenCalled();
      expect((action as unknown as R)['tempPointerFeedbackNode']).toBeNull();
      expect(mockWeave._utilityLayer.batchDraw).toHaveBeenCalled();
      expect(mockWeave._stageContainer.style.cursor).toBe('default');
    });

    it('12.2 imageToolActionHandler null → early return', async () => {
      mockWeave.getActionHandler.mockReturnValue(null);
      (action as unknown as R)['imagesURL'] = mockImagesURL;
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL;
      await (action as unknown as R)['handleAdding']();
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('12.3 imagesFile=null && imagesURL=null → early return (dead-code branch)', async () => {
      (action as unknown as R)['imagesFile'] = null;
      (action as unknown as R)['imagesURL'] = null;
      await (action as unknown as R)['handleAdding']();
      expect(mockWeave.getActionHandler).not.toHaveBeenCalled();
    });

    it('12.4 uploadType=IMAGE_URL → triggerAction called per image', async () => {
      (action as unknown as R)['imagesURL'] = mockImagesURL;
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL;
      await (action as unknown as R)['handleAdding']();
      expect(mockWeave.triggerAction).toHaveBeenCalledTimes(mockImagesURL.length);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(
        WEAVE_IMAGE_TOOL_ACTION_NAME,
        expect.objectContaining({ type: 'imageURL' }),
        true
      );
    });

    it('12.5 uploadType=IMAGE_URL: imageId + options spread conditionally', async () => {
      const imagesWithExtras = [
        { url: 'https://x.com/img.png', fallback: 'data:x', width: 100, height: 100, imageId: 'ext-id', options: { crossOrigin: 'anonymous' as const } },
      ];
      (action as unknown as R)['imagesURL'] = imagesWithExtras;
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL;
      await (action as unknown as R)['handleAdding']();
      const callArgs = (mockWeave.triggerAction as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs.imageId).toBe('ext-id');
      expect(callArgs.options).toEqual({ crossOrigin: 'anonymous' });
    });

    it('12.6 uploadType=IMAGE_URL without imageId/options → not spread', async () => {
      const imagesNoExtras = [{ url: 'https://x.com/img.png', fallback: 'data:x', width: 100, height: 100 }];
      (action as unknown as R)['imagesURL'] = imagesNoExtras;
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL;
      await (action as unknown as R)['handleAdding']();
      const callArgs = (mockWeave.triggerAction as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs).not.toHaveProperty('imageId');
      expect(callArgs).not.toHaveProperty('options');
    });

    it('12.7 uploadType=FILE → triggerAction called per file', async () => {
      const files = [makeImageFile('a.png'), makeImageFile('b.png')];
      const uploadFn = vi.fn().mockResolvedValue('url');
      (action as unknown as R)['imagesFile'] = files;
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE;
      (action as unknown as R)['uploadImageFunction'] = uploadFn;
      (action as unknown as R)['onStartUploading'] = vi.fn();
      (action as unknown as R)['onFinishedUploading'] = vi.fn();
      await (action as unknown as R)['handleAdding']();
      expect(mockWeave.triggerAction).toHaveBeenCalledTimes(files.length);
    });

    it('12.8 nodesIds.length=0 → setState(FINISHED) + cancelAction', async () => {
      (action as unknown as R)['imagesURL'] = [];
      (action as unknown as R)['imagesFile'] = [];
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL;
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      await (action as unknown as R)['handleAdding']();
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGES_TOOL_STATE.FINISHED);
      expect(cancelFn).toHaveBeenCalled();
    });

    it('12.9 clickPoint=null via null mousePoint → ?? 0 fallback in originPoint', async () => {
      // Make getMousePointer return null mousePoint so clickPoint stays null after assignment
      mockWeave.getMousePointer.mockReturnValue({ mousePoint: null, container: null });
      (action as unknown as R)['imagesURL'] = [mockImagesURL[0]];
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL;
      await (action as unknown as R)['handleAdding']();
      // clickPoint is null → originPoint = { x: 0, y: 0 }
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(
        WEAVE_IMAGE_TOOL_ACTION_NAME,
        expect.objectContaining({ position: { x: 0, y: 0 } }),
        true
      );
    });

    it('12.10 onStartUploading called for FILE type', async () => {
      const onStart = vi.fn();
      (action as unknown as R)['imagesFile'] = [makeImageFile()];
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE;
      (action as unknown as R)['uploadImageFunction'] = vi.fn().mockResolvedValue('url');
      (action as unknown as R)['onStartUploading'] = onStart;
      (action as unknown as R)['onFinishedUploading'] = vi.fn();
      await (action as unknown as R)['handleAdding']();
      expect(onStart).toHaveBeenCalled();
    });

    it('12.11 uploadType=FILE: column wrap — imagePositionX reset at column boundary', async () => {
      // Use columns=1 so every image triggers the wrap
      const actionCols1 = new WeaveImagesToolAction({ layout: { columns: 1 } });
      (actionCols1 as unknown as R)['instance'] = mockWeave;
      (actionCols1 as unknown as R)['cancelAction'] = vi.fn();
      const files = [makeImageFile('a.png'), makeImageFile('b.png')];
      const uploadFn = vi.fn().mockResolvedValue('url');
      (actionCols1 as unknown as R)['imagesFile'] = files;
      (actionCols1 as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE;
      (actionCols1 as unknown as R)['uploadImageFunction'] = uploadFn;
      (actionCols1 as unknown as R)['onStartUploading'] = vi.fn();
      (actionCols1 as unknown as R)['onFinishedUploading'] = vi.fn();
      (actionCols1 as unknown as R)['clickPoint'] = { x: 0, y: 0 };
      await (actionCols1 as unknown as R)['handleAdding']();
      // Two images, columns=1 → both trigger wrap; triggerAction called 2 times
      expect(mockWeave.triggerAction).toHaveBeenCalledTimes(2);
    });

    it('12.12 uploadType=IMAGE_URL: column wrap — imagePositionX reset at column boundary', async () => {
      // Use columns=1 so every image triggers the wrap
      const actionCols1 = new WeaveImagesToolAction({ layout: { columns: 1 } });
      (actionCols1 as unknown as R)['instance'] = mockWeave;
      (actionCols1 as unknown as R)['cancelAction'] = vi.fn();
      const imagesTwo = [
        { url: 'https://x.com/a.png', fallback: 'data:a', width: 100, height: 100 },
        { url: 'https://x.com/b.png', fallback: 'data:b', width: 100, height: 100 },
      ];
      (actionCols1 as unknown as R)['imagesURL'] = imagesTwo;
      (actionCols1 as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL;
      (actionCols1 as unknown as R)['clickPoint'] = { x: 0, y: 0 };
      await (actionCols1 as unknown as R)['handleAdding']();
      expect(mockWeave.triggerAction).toHaveBeenCalledTimes(2);
    });

    it('12.13 uploadImageFunctionInternal body — invoked when captured from triggerAction args', async () => {
      const uploadResult = 'https://upload.example.com/result.png';
      const uploadFn = vi.fn().mockResolvedValue(uploadResult);
      (action as unknown as R)['imagesFile'] = [makeImageFile('x.png')];
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE;
      (action as unknown as R)['uploadImageFunction'] = uploadFn;
      (action as unknown as R)['onStartUploading'] = vi.fn();
      (action as unknown as R)['onFinishedUploading'] = vi.fn();
      await (action as unknown as R)['handleAdding']();
      const triggerArgs = (mockWeave.triggerAction as ReturnType<typeof vi.fn>).mock.calls[0][1];
      const internalFn = triggerArgs.uploadImageFunction as () => Promise<string>;
      const result = await internalFn();
      expect(result).toBe(uploadResult);
      expect(uploadFn).toHaveBeenCalled();
    });

    it('12.14 uploadType=FILE with imageId truthy → imageId spread into triggerAction', async () => {
      const fileWithId = { ...makeImageFile('w-id.png'), imageId: 'custom-image-id' };
      const uploadFn = vi.fn().mockResolvedValue('url');
      (action as unknown as R)['imagesFile'] = [fileWithId];
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE;
      (action as unknown as R)['uploadImageFunction'] = uploadFn;
      (action as unknown as R)['onStartUploading'] = vi.fn();
      (action as unknown as R)['onFinishedUploading'] = vi.fn();
      await (action as unknown as R)['handleAdding']();
      const callArgs = (mockWeave.triggerAction as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs.imageId).toBe('custom-image-id');
    });

    it('12.15 addImages FILE: ?? [] fallback when imagesFile.slice returns nullish', async () => {
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE;
      const nullishArray = {
        slice: vi.fn().mockReturnValue(null),
        length: 1,
      };
      (action as unknown as R)['imagesFile'] = nullishArray;
      // Should not throw and tempPointerFeedbackNode still created
      await (action as unknown as R)['addImages']();
      expect(MockGroup).toHaveBeenCalled();
    });
  });

  // ── Suite 13: checkAddedImages callback ───────────────────────────────────────
  describe('Suite 13: checkAddedImages callback', () => {
    async function setupHandleAdding() {
      setupAction();
      (action as unknown as R)['imagesURL'] = [mockImagesURL[0]];
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL;
      await (action as unknown as R)['handleAdding']();
      return (mockWeave.addEventListener as ReturnType<typeof vi.fn>).mock.calls
        .find(([e]: [string]) => e === 'onAddedImage')?.[1] as ((data: { nodeId: string }) => void) | undefined;
    }

    it('13.1 nodeId in nodesIds → handleImageAdded called', async () => {
      const checkAdded = await setupHandleAdding();
      const nodesIds = (action as unknown as R)['nodesIds'] as Set<string>;
      const nodeId = Array.from(nodesIds)[0];
      (action as unknown as R)['toAdd'] = 5; // keep > 0 so cleanup doesn't happen
      const handleImageAddedSpy = vi.spyOn(action, 'handleImageAdded');
      checkAdded?.({ nodeId });
      expect(handleImageAddedSpy).toHaveBeenCalled();
    });

    it('13.2 nodeId NOT in nodesIds → handleImageAdded NOT called', async () => {
      const checkAdded = await setupHandleAdding();
      const handleImageAddedSpy = vi.spyOn(action, 'handleImageAdded');
      (action as unknown as R)['toAdd'] = 5;
      checkAdded?.({ nodeId: 'not-in-list' });
      expect(handleImageAddedSpy).not.toHaveBeenCalled();
    });

    it('13.3 getImagesAdded()<=0 → setState(FINISHED) + cancelAction + removeEventListener + emitEvent', async () => {
      const checkAdded = await setupHandleAdding();
      const nodesIds = (action as unknown as R)['nodesIds'] as Set<string>;
      (action as unknown as R)['toAdd'] = 1; // will become 0 after handleImageAdded
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      checkAdded?.({ nodeId: Array.from(nodesIds)[0] });
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGES_TOOL_STATE.FINISHED);
      expect(cancelFn).toHaveBeenCalled();
      expect(mockWeave.removeEventListener).toHaveBeenCalledWith('onAddedImage', expect.any(Function));
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddedImages', { nodesIds: Array.from(nodesIds) });
    });

    it('13.4 getImagesAdded()>0 → no setState/cancelAction', async () => {
      const checkAdded = await setupHandleAdding();
      const nodesIds = (action as unknown as R)['nodesIds'] as string[];
      (action as unknown as R)['toAdd'] = 3; // after handleImageAdded → 2 > 0
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      checkAdded?.({ nodeId: nodesIds[0] });
      expect((action as unknown as R)['state']).not.toBe(WEAVE_IMAGES_TOOL_STATE.FINISHED);
      expect(cancelFn).not.toHaveBeenCalled();
    });
  });

  // ── Suite 14: handleUploadImage callback ──────────────────────────────────────
  describe('Suite 14: handleUploadImage callback', () => {
    async function setupFileHandleAdding(numImages: number) {
      setupAction();
      const onStart = vi.fn();
      const onFinish = vi.fn();
      const uploadFn = vi.fn().mockResolvedValue('url');
      const files = Array.from({ length: numImages }, (_, i) => makeImageFile(`img${i}.png`));
      (action as unknown as R)['imagesFile'] = files;
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.FILE;
      (action as unknown as R)['uploadImageFunction'] = uploadFn;
      (action as unknown as R)['onStartUploading'] = onStart;
      (action as unknown as R)['onFinishedUploading'] = onFinish;
      await (action as unknown as R)['handleAdding']();
      const handler = (mockWeave.addEventListener as ReturnType<typeof vi.fn>).mock.calls
        .find(([e]: [string]) => e === 'onImageUploaded')?.[1] as (() => Promise<void>) | undefined;
      return { handler, onFinish };
    }

    it('14.1 imagesUploaded < imagesToUpload → onFinishedUploading NOT called', async () => {
      const { handler, onFinish } = await setupFileHandleAdding(3);
      await handler?.();
      expect(onFinish).not.toHaveBeenCalled();
    });

    it('14.2 imagesUploaded >= imagesToUpload → onFinishedUploading called + removeEventListener', async () => {
      const { handler, onFinish } = await setupFileHandleAdding(1);
      await handler?.();
      expect(onFinish).toHaveBeenCalled();
      expect(mockWeave.removeEventListener).toHaveBeenCalledWith('onImageUploaded', expect.any(Function));
    });
  });

  // ── Suite 15: saveImageUrl ────────────────────────────────────────────────────
  describe('Suite 15: saveImageUrl', () => {
    it('15.1 state=DEFINING_POSITION → early return (no-op)', () => {
      (action as unknown as R)['state'] = WEAVE_IMAGES_TOOL_STATE.DEFINING_POSITION;
      const handler = makeImageNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(handler);
      action.saveImageUrl('test-uuid', 'https://new.com/img.png');
      expect(handler.forceLoadImage).not.toHaveBeenCalled();
    });

    it('15.2 state=IDLE, nodeHandler && node → setAttr + forceLoadImage + updateNode', () => {
      (action as unknown as R)['state'] = WEAVE_IMAGES_TOOL_STATE.IDLE;
      const handler = makeImageNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(handler);
      action.saveImageUrl('test-uuid', 'https://new.com/img.png');
      expect(mockWeave._foundNode.setAttr).toHaveBeenCalledWith('imageURL', 'https://new.com/img.png');
      expect(handler.forceLoadImage).toHaveBeenCalled();
      expect(mockWeave.updateNode).toHaveBeenCalled();
    });

    it('15.3 nodeHandler null → no-op', () => {
      (action as unknown as R)['state'] = WEAVE_IMAGES_TOOL_STATE.IDLE;
      mockWeave.getNodeHandler.mockReturnValue(null);
      expect(() => action.saveImageUrl('test-uuid', 'https://url.com')).not.toThrow();
      expect(mockWeave.updateNode).not.toHaveBeenCalled();
    });

    it('15.4 node null → no-op', () => {
      (action as unknown as R)['state'] = WEAVE_IMAGES_TOOL_STATE.IDLE;
      const handler = makeImageNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(handler);
      mockWeave._stage.findOne.mockReturnValue(null);
      action.saveImageUrl('test-uuid', 'https://url.com');
      expect(mockWeave.updateNode).not.toHaveBeenCalled();
    });
  });

  // ── Suite 16: cleanup ─────────────────────────────────────────────────────────
  describe('Suite 16: cleanup', () => {
    beforeEach(() => {
      setupAction();
      (action as unknown as R)['nodesIds'] = new Set(['node-1', 'node-2']);
    });

    it('16.1 tempPointerFeedbackNode present → destroy + null', () => {
      const mockTempNode = { destroy: vi.fn() };
      (action as unknown as R)['tempPointerFeedbackNode'] = mockTempNode;
      action.cleanup();
      expect(mockTempNode.destroy).toHaveBeenCalled();
      expect((action as unknown as R)['tempPointerFeedbackNode']).toBeNull();
    });

    it('16.2 tempPointerFeedbackNode null → no error', () => {
      (action as unknown as R)['tempPointerFeedbackNode'] = null;
      expect(() => action.cleanup()).not.toThrow();
    });

    it('16.3 getUtilityLayer().batchDraw() called', () => {
      action.cleanup();
      expect(mockWeave._utilityLayer.batchDraw).toHaveBeenCalled();
    });

    it('16.4 selectionPlugin + nodes found → setSelectedNodes with nodes', () => {
      const node1 = { id: 'n1' };
      const node2 = { id: 'n2' };
      mockWeave._stage.findOne.mockImplementation((sel: string) =>
        sel === '#node-1' ? node1 : sel === '#node-2' ? node2 : null
      );
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([node1, node2]);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('16.5 selectionPlugin + node NOT found → skipped in addedNodes', () => {
      mockWeave._stage.findOne.mockImplementation((sel: string) =>
        sel === '#node-1' ? { id: 'n1' } : null
      );
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith(
        expect.arrayContaining([{ id: 'n1' }])
      );
      const called = (mockWeave._selectionPlugin.setSelectedNodes as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(called).toHaveLength(1);
    });

    it('16.6 selectionPlugin absent → no error', () => {
      mockWeave.getPlugin.mockReturnValue(null);
      expect(() => action.cleanup()).not.toThrow();
    });

    it('16.7 emitEvent(onFinishedImages), endDrag, cursor=default', () => {
      action.cleanup();
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onFinishedImages');
      expect(mockWeave.endDrag).toHaveBeenCalledWith(WEAVE_IMAGES_TOOL_ACTION_NAME);
      expect(mockWeave._stageContainer.style.cursor).toBe('default');
    });

    it('16.8 all fields reset after cleanup', () => {
      (action as unknown as R)['uploadType'] = WEAVE_IMAGES_TOOL_UPLOAD_TYPE.IMAGE_URL;
      (action as unknown as R)['forceMainContainer'] = true;
      (action as unknown as R)['container'] = {};
      (action as unknown as R)['clickPoint'] = { x: 1, y: 2 };
      (action as unknown as R)['toAdd'] = 5;
      action.cleanup();
      expect((action as unknown as R)['uploadType']).toBeNull();
      expect((action as unknown as R)['forceMainContainer']).toBe(false);
      expect((action as unknown as R)['initialCursor']).toBeNull();
      expect((action as unknown as R)['container']).toBeUndefined();
      expect((action as unknown as R)['clickPoint']).toBeNull();
      expect((action as unknown as R)['nodesIds']).toEqual(new Set());
      expect((action as unknown as R)['toAdd']).toBe(0);
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGES_TOOL_STATE.IDLE);
    });
  });

  // ── Suite 17: setCursor ───────────────────────────────────────────────────────
  describe('Suite 17: setCursor', () => {
    it('17.1 sets stage container cursor to crosshair', () => {
      (action as unknown as R)['setCursor']();
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });
  });

  // ── Suite 18: setFocusStage ───────────────────────────────────────────────────
  describe('Suite 18: setFocusStage', () => {
    it('18.1 sets tabIndex=1, calls blur() and focus()', () => {
      (action as unknown as R)['setFocusStage']();
      expect(mockWeave._stageContainer.tabIndex).toBe(1);
      expect(mockWeave._stageContainer.blur).toHaveBeenCalled();
      expect(mockWeave._stageContainer.focus).toHaveBeenCalled();
    });
  });

  // ── Suite 19: getImagesAdded / handleImageAdded ───────────────────────────────
  describe('Suite 19: getImagesAdded / handleImageAdded', () => {
    it('19.1 getImagesAdded returns this.toAdd', () => {
      (action as unknown as R)['toAdd'] = 7;
      expect(action.getImagesAdded()).toBe(7);
    });

    it('19.2 handleImageAdded decrements toAdd by 1', () => {
      (action as unknown as R)['toAdd'] = 3;
      action.handleImageAdded();
      expect((action as unknown as R)['toAdd']).toBe(2);
    });
  });

  // ── Suite 20: setDragAndDropProperties ───────────────────────────────────────
  describe('Suite 20: setDragAndDropProperties', () => {
    it('20.1 startDrag + setDragProperties called', () => {
      const props = { imagesURL: mockImagesURL };
      action.setDragAndDropProperties(props);
      expect(mockWeave.startDrag).toHaveBeenCalledWith(WEAVE_IMAGES_TOOL_ACTION_NAME);
      expect(mockWeave.setDragProperties).toHaveBeenCalledWith(props);
    });
  });

  // ── Suite 21: isTouchDevice ───────────────────────────────────────────────────
  describe('Suite 21: isTouchDevice', () => {
    it('21.1 matchMedia matches=true → true', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
      expect((action as unknown as R)['isTouchDevice']()).toBe(true);
    });

    it('21.2 matchMedia matches=false → false', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
      expect((action as unknown as R)['isTouchDevice']()).toBe(false);
    });
  });
});
