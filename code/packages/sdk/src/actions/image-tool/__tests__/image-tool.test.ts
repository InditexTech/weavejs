// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted Konva.Image mock ───────────────────────────────────────────────────
const { MockImage } = vi.hoisted(() => {
  const MockImage = vi.fn().mockImplementation(() => ({
    setAttrs: vi.fn(),
    destroy: vi.fn(),
  }));
  return { MockImage };
});

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({
  WeaveNodesSelectionPlugin: class WeaveNodesSelectionPlugin {},
}));
vi.mock('konva', () => ({
  default: {
    Image: MockImage,
    Util: {
      createImageElement: vi.fn().mockReturnValue({ onload: null, onerror: null, src: '' }),
    },
  },
}));
vi.mock('uuid', () => ({ v4: vi.fn().mockReturnValue('test-uuid') }));
vi.mock('@/utils/image', () => ({
  getImageSizeFromFile: vi.fn().mockResolvedValue({ width: 800, height: 600 }),
  downscaleImageFile: vi.fn().mockResolvedValue(new Blob()),
}));
vi.mock('@/utils/utils', () => ({
  mergeExceptArrays: vi.fn(
    (a: Record<string, unknown>, b: Record<string, unknown>) => ({ ...a, ...b })
  ),
}));

if (typeof (globalThis as Record<string, unknown>)['window'] === 'undefined') {
  (globalThis as Record<string, unknown>)['window'] = globalThis;
}

import { makePointerEvent, type R } from '../../__tests__/shared/action.test-helpers';
import { WeaveImageToolAction } from '../image-tool';
import {
  WEAVE_IMAGE_TOOL_ACTION_NAME,
  WEAVE_IMAGE_TOOL_UPLOAD_TYPE,
  WEAVE_IMAGE_TOOL_STATE,
} from '../constants';
import { SELECTION_TOOL_ACTION_NAME } from '../../selection-tool/constants';
import Konva from 'konva';

const mockImageURL = {
  url: 'https://example.com/image.png',
  fallback: 'data:image/png;base64,abc',
  width: 400,
  height: 300,
};

const mockImageFile = {
  file: new File(['test'], 'test.png', { type: 'image/png' }),
  downscaleRatio: 0.5,
};

function makeImageNodeHandler() {
  return {
    getImageSource: vi.fn().mockReturnValue({ width: 400, height: 300 }),
    getFallbackImageSource: vi.fn().mockReturnValue(null),
    getImageFallbackId: vi.fn().mockReturnValue(undefined),
    isImageFallbackEnabled: vi.fn().mockReturnValue(false),
    getFallbackImageSourceURL: vi.fn().mockReturnValue(undefined),
    create: vi.fn().mockReturnValue({
      getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }),
    }),
    forceLoadImage: vi.fn(),
    serialize: vi.fn().mockReturnValue({ id: 'test-uuid' }),
  };
}

function makeMockWeave() {
  const stageContainer = {
    tabIndex: 0,
    focus: vi.fn(),
    blur: vi.fn(),
    style: { cursor: '' },
  };
  const stageHandlers: Record<string, (e?: unknown) => void> = {};
  const instanceHandlers: Record<string, (e?: unknown) => void> = {};
  const mockFoundNode = {
    setAttr: vi.fn(),
    getAttrs: vi.fn().mockReturnValue({ id: 'test-uuid' }),
  };

  const mainLayer = {
    add: vi.fn(),
    getAttrs: vi.fn().mockReturnValue({ id: 'main-layer-id' }),
  };

  const defaultContainer = {
    getAttrs: vi.fn().mockReturnValue({ id: 'container-id' }),
  };

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

  const selectionPlugin = { setSelectedNodes: vi.fn() };

  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugin: vi.fn().mockReturnValue(selectionPlugin),
    getMousePointer: vi.fn().mockReturnValue({
      mousePoint: { x: 50, y: 75 },
      container: defaultContainer,
    }),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    getActiveAction: vi.fn().mockReturnValue(WEAVE_IMAGE_TOOL_ACTION_NAME),
    emitEvent: vi.fn(),
    addNode: vi.fn(),
    triggerAction: vi.fn(),
    updateNode: vi.fn(),
    startDrag: vi.fn(),
    endDrag: vi.fn(),
    setDragProperties: vi.fn(),
    getDragStartedId: vi.fn().mockReturnValue(WEAVE_IMAGE_TOOL_ACTION_NAME),
    getDragProperties: vi.fn().mockReturnValue({ imageURL: mockImageURL }),
    addEventListener: vi.fn((event: string, handler: (e?: unknown) => void) => {
      instanceHandlers[event] = handler;
    }),
    getMainLayer: vi.fn().mockReturnValue(mainLayer),
    _stage: stage,
    _stageContainer: stageContainer,
    _stageHandlers: stageHandlers,
    _instanceHandlers: instanceHandlers,
    _selectionPlugin: selectionPlugin,
    _defaultContainer: defaultContainer,
    _mainLayer: mainLayer,
    _foundNode: mockFoundNode,
  };
}


function makeImageActionEntry(overrides: Partial<R> = {}) {
  return {
    uploadType: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL,
    imageURL: mockImageURL,
    forceMainContainer: false,
    container: null,
    props: { width: 400, height: 300 },
    clickPoint: null,
    imageId: null,
    imageFile: null,
    uploadImageFunction: null,
    ...overrides,
  };
}

describe('WeaveImageToolAction', () => {
  let action: WeaveImageToolAction;
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let windowHandlers: Record<string, (e: KeyboardEvent) => void>;

  beforeEach(() => {
    MockImage.mockClear();
    windowHandlers = {};
    vi.stubGlobal(
      'addEventListener',
      vi.fn((type: string, handler: (e: KeyboardEvent) => void) => {
        windowHandlers[type] = handler;
      })
    );
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

    action = new WeaveImageToolAction();
    mockWeave = makeMockWeave();
    (action as unknown as R)['instance'] = mockWeave;
    (action as unknown as R)['cancelAction'] = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function triggerImageURL(
    params: Partial<Parameters<WeaveImageToolAction['trigger']>[1]> = {}
  ) {
    const cancelFn = vi.fn();
    const result = action.trigger(cancelFn, {
      type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL,
      image: mockImageURL,
      ...params,
    } as Parameters<WeaveImageToolAction['trigger']>[1]);
    return { cancelFn, nodeId: result.nodeId };
  }

  function setupAction() {
    triggerImageURL();
    (mockWeave._selectionPlugin.setSelectedNodes as ReturnType<typeof vi.fn>).mockClear();
    (action as unknown as R)['cancelAction'] = vi.fn();
  }

  // ── Suite 1: constructor / initialize ─────────────────────────────────────────
  describe('Suite 1: constructor / initialize', () => {
    it('1.1 no params → config is defined with default values', () => {
      expect((action as unknown as R)['config']).toBeDefined();
    });

    it('1.2 with config param → mergeExceptArrays called, config defined', () => {
      const custom = new WeaveImageToolAction({
        config: { style: { cursor: { padding: 20, imageThumbnail: { width: 100, height: 100, shadowColor: '#000', shadowBlur: 5, shadowOffset: { x: 1, y: 1 }, shadowOpacity: 0.3 } } } },
      });
      expect((custom as unknown as R)['config']).toBeDefined();
    });

    it('1.3 initialize sets all fields to defaults', () => {
      expect((action as unknown as R)['pointers']).toBeInstanceOf(Map);
      expect(((action as unknown as R)['pointers'] as Map<number, unknown>).size).toBe(0);
      expect((action as unknown as R)['initialized']).toBe(false);
      expect((action as unknown as R)['imageId']).toBe(null);
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGE_TOOL_STATE.IDLE);
      expect((action as unknown as R)['tempImageId']).toBe(null);
      expect((action as unknown as R)['tempImageNode']).toBe(null);
    });

    it('1.4 onPropsChange is undefined', () => {
      expect((action as unknown as R)['onPropsChange']).toBeUndefined();
    });

    it('1.5 update is undefined', () => {
      expect((action as unknown as R)['update']).toBeUndefined();
    });
  });

  // ── Suite 2: getName / initProps ──────────────────────────────────────────────
  describe('Suite 2: getName / initProps', () => {
    it('2.1 getName returns WEAVE_IMAGE_TOOL_ACTION_NAME', () => {
      expect(action.getName()).toBe(WEAVE_IMAGE_TOOL_ACTION_NAME);
    });

    it('2.2 initProps returns defaults', () => {
      expect(action.initProps()).toEqual({ width: 100, height: 100, scaleX: 1, scaleY: 1 });
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

    it('3.2 dragId !== imageTool → triggerAction NOT called', () => {
      mockWeave.getDragStartedId.mockReturnValue('otherTool');
      mockWeave._instanceHandlers['onStageDrop']({} as DragEvent);
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('3.3 dragProperties null → triggerAction NOT called', () => {
      mockWeave.getDragProperties.mockReturnValue(null);
      mockWeave._instanceHandlers['onStageDrop']({} as DragEvent);
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('3.4 mousePoint null → early return, triggerAction NOT called', () => {
      mockWeave.getMousePointer.mockReturnValue({ mousePoint: null, container: null });
      mockWeave._instanceHandlers['onStageDrop']({} as DragEvent);
      expect(mockWeave.triggerAction).not.toHaveBeenCalled();
    });

    it('3.5 valid drop, no imageId, no forceMainContainer → triggerAction called', () => {
      mockWeave._instanceHandlers['onStageDrop']({} as DragEvent);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(
        WEAVE_IMAGE_TOOL_ACTION_NAME,
        expect.objectContaining({
          type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL,
          image: mockImageURL,
          position: { x: 50, y: 75 },
        })
      );
      const callArgs = (mockWeave.triggerAction as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs).not.toHaveProperty('imageId');
      expect(callArgs).not.toHaveProperty('forceMainContainer');
    });

    it('3.6 valid drop with imageId + forceMainContainer → both spread into call', () => {
      mockWeave.getDragProperties.mockReturnValue({
        imageURL: mockImageURL,
        imageId: 'custom-id',
        forceMainContainer: true,
      });
      mockWeave._instanceHandlers['onStageDrop']({} as DragEvent);
      const callArgs = (mockWeave.triggerAction as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(callArgs.imageId).toBe('custom-id');
      expect(callArgs.forceMainContainer).toBe(true);
    });
  });

  // ── Suite 4: trigger ──────────────────────────────────────────────────────────
  describe('Suite 4: trigger', () => {
    it('4.1 !instance → throws Error', () => {
      (action as unknown as R)['instance'] = undefined;
      expect(() =>
        action.trigger(vi.fn(), {
          type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL,
          image: mockImageURL,
        })
      ).toThrow('Instance not defined');
    });

    it('4.2 first trigger → setupEvents called, initialized=true', () => {
      triggerImageURL();
      expect((action as unknown as R)['initialized']).toBe(true);
      expect(mockWeave._stage.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      expect(mockWeave._stage.on).toHaveBeenCalledWith('pointermove', expect.any(Function));
      expect(mockWeave._stage.on).toHaveBeenCalledWith('pointerup', expect.any(Function));
    });

    it('4.3 second trigger → setupEvents NOT called again', () => {
      triggerImageURL();
      const callCount = (mockWeave._stage.on as ReturnType<typeof vi.fn>).mock.calls.length;
      triggerImageURL();
      expect((mockWeave._stage.on as ReturnType<typeof vi.fn>).mock.calls.length).toBe(callCount);
    });

    it('4.4 loadImage calls setFocusStage (tabIndex, blur, focus)', () => {
      triggerImageURL();
      expect(mockWeave._stageContainer.tabIndex).toBe(1);
      expect(mockWeave._stageContainer.blur).toHaveBeenCalled();
      expect(mockWeave._stageContainer.focus).toHaveBeenCalled();
    });

    it('4.5 selectionPlugin present → setSelectedNodes([])', () => {
      triggerImageURL();
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([]);
    });

    it('4.6 no selectionPlugin → no error', () => {
      mockWeave.getPlugin.mockReturnValue(null);
      expect(() => triggerImageURL()).not.toThrow();
    });

    it('4.7 params.nodeId provided → imageId = nodeId', () => {
      const { nodeId } = triggerImageURL({ nodeId: 'custom-node' });
      expect(nodeId).toBe('custom-node');
      expect((action as unknown as R)['imageId']).toBe('custom-node');
    });

    it('4.8 params.nodeId absent → imageId = uuidv4()', () => {
      const { nodeId } = triggerImageURL();
      expect(nodeId).toBe('test-uuid');
    });

    it('4.9 params.imageId provided → imageAction[nodeId].imageId = params.imageId', () => {
      triggerImageURL({ imageId: 'external-image-id' });
      const imageAction = (action as unknown as R)['imageAction'] as R;
      expect((imageAction['test-uuid'] as R)['imageId']).toBe('external-image-id');
    });

    it('4.10 forceExecution=true → ignorePointerEvents=true, ignoreKeyboardEvents=true', () => {
      (action as unknown as R)['forceExecution'] = true;
      triggerImageURL();
      expect((action as unknown as R)['ignorePointerEvents']).toBe(true);
      expect((action as unknown as R)['ignoreKeyboardEvents']).toBe(true);
    });

    it('4.11 params.position → state=SELECTED_POSITION', () => {
      triggerImageURL({ position: { x: 10, y: 20 } });
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGE_TOOL_STATE.SELECTED_POSITION);
    });

    it('4.12 returns { nodeId }', () => {
      const result = action.trigger(vi.fn(), {
        type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL,
        image: mockImageURL,
      });
      expect(result).toEqual({ nodeId: 'test-uuid' });
    });
  });

  // ── Suite 5: trigger type=FILE ────────────────────────────────────────────────
  describe('Suite 5: trigger type=FILE', () => {
    const uploadFn = vi.fn().mockResolvedValue('https://upload.example.com/img.png');

    it('5.1 type=FILE + image → uploadType=FILE, imageFile stored', () => {
      action.trigger(vi.fn(), {
        type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE,
        image: mockImageFile,
        uploadImageFunction: uploadFn,
      });
      const entry = ((action as unknown as R)['imageAction'] as R)['test-uuid'] as R;
      expect(entry['uploadType']).toBe(WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE);
      expect(entry['imageFile']).toBe(mockImageFile);
    });

    it('5.2 type=FILE + no image → loadImage NOT triggered (uploadType stays null)', () => {
      // @ts-expect-error intentional
      action.trigger(vi.fn(), { type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE, image: undefined, uploadImageFunction: uploadFn });
      const entry = ((action as unknown as R)['imageAction'] as R)['test-uuid'] as R;
      expect(entry['uploadType']).toBeNull();
    });

    it('5.3 uploadImageFunction stored in imageAction', () => {
      action.trigger(vi.fn(), {
        type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE,
        image: mockImageFile,
        uploadImageFunction: uploadFn,
      });
      const entry = ((action as unknown as R)['imageAction'] as R)['test-uuid'] as R;
      expect(entry['uploadImageFunction']).toBe(uploadFn);
    });
  });

  // ── Suite 6: trigger type=IMAGE_URL ──────────────────────────────────────────
  describe('Suite 6: trigger type=IMAGE_URL', () => {
    it('6.1 type=IMAGE_URL + image → uploadType=IMAGE_URL, imageURL stored', () => {
      triggerImageURL();
      const entry = ((action as unknown as R)['imageAction'] as R)['test-uuid'] as R;
      expect(entry['uploadType']).toBe(WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL);
      expect(entry['imageURL']).toBe(mockImageURL);
    });

    it('6.2 type=IMAGE_URL + no image → loadImage NOT triggered (uploadType stays null)', () => {
      // @ts-expect-error intentional
      action.trigger(vi.fn(), { type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL, image: undefined });
      const entry = ((action as unknown as R)['imageAction'] as R)['test-uuid'] as R;
      expect(entry['uploadType']).toBeNull();
    });

    it('6.3 props.width/height set from image (imageFallback not propagated to props)', () => {
      triggerImageURL();
      const entry = ((action as unknown as R)['imageAction'] as R)['test-uuid'] as R;
      const props = entry['props'] as R;
      expect(props['imageFallback']).toBeUndefined();
      expect(props['width']).toBe(mockImageURL.width);
      expect(props['height']).toBe(mockImageURL.height);
    });
  });

  // ── Suite 7: keydown handler ──────────────────────────────────────────────────
  describe('Suite 7: keydown handler', () => {
    beforeEach(setupAction);

    it('7.1 Escape + active=imageTool + !ignoreKeyboard → cancelAction', () => {
      windowHandlers['keydown']({ code: 'Escape' } as KeyboardEvent);
      expect((action as unknown as R)['cancelAction']).toHaveBeenCalledTimes(1);
    });

    it('7.2 Escape + ignoreKeyboardEvents=true → skip', () => {
      (action as unknown as R)['ignoreKeyboardEvents'] = true;
      windowHandlers['keydown']({ code: 'Escape' } as KeyboardEvent);
      expect((action as unknown as R)['cancelAction']).not.toHaveBeenCalled();
    });

    it('7.3 Escape + active≠imageTool → skip', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      windowHandlers['keydown']({ code: 'Escape' } as KeyboardEvent);
      expect((action as unknown as R)['cancelAction']).not.toHaveBeenCalled();
    });

    it('7.4 non-Escape key → skip', () => {
      windowHandlers['keydown']({ code: 'Enter' } as KeyboardEvent);
      expect((action as unknown as R)['cancelAction']).not.toHaveBeenCalled();
    });
  });

  // ── Suite 8: pointerdown handler ──────────────────────────────────────────────
  describe('Suite 8: pointerdown handler', () => {
    beforeEach(setupAction);

    it('8.1 ignorePointerEvents=true → early return, pointer NOT stored', () => {
      (action as unknown as R)['ignorePointerEvents'] = true;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      const pointers = (action as unknown as R)['pointers'] as Map<number, unknown>;
      expect(pointers.has(1)).toBe(false);
    });

    it('8.2 pointer stored in map', () => {
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 5 }));
      const pointers = (action as unknown as R)['pointers'] as Map<number, unknown>;
      expect(pointers.has(5)).toBe(true);
    });

    it('8.3 2 pointers + active=imageTool → state=DEFINING_POSITION', () => {
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 2 }));
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION);
    });

    it('8.4 2 pointers + active≠imageTool → 2-pointer guard not triggered', () => {
      mockWeave.getActiveAction.mockReturnValue('otherTool');
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 2 }));
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGE_TOOL_STATE.IDLE);
    });

    it('8.5 state=DEFINING_POSITION + 1 pointer → state=SELECTED_POSITION', () => {
      (action as unknown as R)['state'] = WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION;
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGE_TOOL_STATE.SELECTED_POSITION);
    });

    it('8.6 state=IDLE, 1 pointer → state stays IDLE', () => {
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGE_TOOL_STATE.IDLE);
      mockWeave._stageHandlers['pointerdown'](makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGE_TOOL_STATE.IDLE);
    });
  });

  // ── Suite 9: pointermove handler ──────────────────────────────────────────────
  describe('Suite 9: pointermove handler', () => {
    beforeEach(setupAction);

    it('9.1 ignorePointerEvents=true → early return', () => {
      mockWeave._stageContainer.style.cursor = ''; // reset cursor set by setupAction's loadImage
      (action as unknown as R)['ignorePointerEvents'] = true;
      (action as unknown as R)['state'] = WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION;
      mockWeave._stageHandlers['pointermove'](makePointerEvent());
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('9.2 state=IDLE → early return, setCursor NOT called', () => {
      mockWeave._stageContainer.style.cursor = ''; // reset cursor set by setupAction's loadImage
      mockWeave._stageHandlers['pointermove'](makePointerEvent());
      expect(mockWeave._stageContainer.style.cursor).toBe('');
    });

    it('9.3 state=DEFINING_POSITION → setCursor called', () => {
      (action as unknown as R)['state'] = WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION;
      mockWeave._stageHandlers['pointermove'](makePointerEvent());
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });

    it('9.4 2 pointers + active=imageTool → state=DEFINING_POSITION, early return', () => {
      (action as unknown as R)['state'] = WEAVE_IMAGE_TOOL_STATE.SELECTED_POSITION;
      const pointers = (action as unknown as R)['pointers'] as Map<number, { x: number; y: number }>;
      pointers.set(1, { x: 0, y: 0 });
      pointers.set(2, { x: 10, y: 10 });
      mockWeave._stageHandlers['pointermove'](makePointerEvent());
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION);
    });

    it('9.5 DEFINING_POSITION + tempImageNode + active=imageTool + mouse → setAttrs called', () => {
      const mockTempNode = { setAttrs: vi.fn() };
      (action as unknown as R)['state'] = WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION;
      (action as unknown as R)['tempImageNode'] = mockTempNode;
      mockWeave._stageHandlers['pointermove'](makePointerEvent({ pointerType: 'mouse' }));
      expect(mockTempNode.setAttrs).toHaveBeenCalledWith({
        x: expect.any(Number),
        y: expect.any(Number),
      });
    });

    it('9.6 SELECTED_POSITION + tempImageNode + active + mouse → setAttrs called', () => {
      const mockTempNode = { setAttrs: vi.fn() };
      (action as unknown as R)['state'] = WEAVE_IMAGE_TOOL_STATE.SELECTED_POSITION;
      (action as unknown as R)['tempImageNode'] = mockTempNode;
      mockWeave._stageHandlers['pointermove'](makePointerEvent({ pointerType: 'mouse' }));
      expect(mockTempNode.setAttrs).toHaveBeenCalled();
    });

    it('9.7 pointerType≠mouse → setAttrs NOT called', () => {
      const mockTempNode = { setAttrs: vi.fn() };
      (action as unknown as R)['state'] = WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION;
      (action as unknown as R)['tempImageNode'] = mockTempNode;
      mockWeave._stageHandlers['pointermove'](makePointerEvent({ pointerType: 'touch' }));
      expect(mockTempNode.setAttrs).not.toHaveBeenCalled();
    });

    it('9.8 DEFINING_POSITION + NO tempImageNode → no setAttrs error', () => {
      (action as unknown as R)['state'] = WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION;
      (action as unknown as R)['tempImageNode'] = null;
      expect(() =>
        mockWeave._stageHandlers['pointermove'](makePointerEvent({ pointerType: 'mouse' }))
      ).not.toThrow();
    });

    it('9.9 mousePos null → ?? 0 fallback used in setAttrs', () => {
      const mockTempNode = { setAttrs: vi.fn() };
      (action as unknown as R)['state'] = WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION;
      (action as unknown as R)['tempImageNode'] = mockTempNode;
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

    it('10.1 ignorePointerEvents=true → early return', () => {
      (action as unknown as R)['ignorePointerEvents'] = true;
      (action as unknown as R)['state'] = WEAVE_IMAGE_TOOL_STATE.SELECTED_POSITION;
      mockWeave._stageHandlers['pointerup'](makePointerEvent({ pointerId: 1 }));
      expect((action as unknown as R)['cancelAction']).not.toHaveBeenCalled();
    });

    it('10.2 pointer deleted from map', () => {
      const pointers = (action as unknown as R)['pointers'] as Map<number, { x: number; y: number }>;
      pointers.set(1, { x: 10, y: 20 });
      mockWeave._stageHandlers['pointerup'](makePointerEvent({ pointerId: 1 }));
      expect(pointers.has(1)).toBe(false);
    });

    it('10.3 state=SELECTED_POSITION → handleAdding → cancelAction eventually called', async () => {
      const imageNodeHandler = makeImageNodeHandler();
      imageNodeHandler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      mockWeave.getNodeHandler.mockReturnValue(imageNodeHandler);
      (action as unknown as R)['state'] = WEAVE_IMAGE_TOOL_STATE.SELECTED_POSITION;
      (action as unknown as R)['imageId'] = 'test-uuid';
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry(),
      };
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      mockWeave._stageHandlers['pointerup'](makePointerEvent({ pointerId: 1 }));
      await new Promise((r) => setTimeout(r, 0));
      expect(cancelFn).toHaveBeenCalled();
    });

    it('10.4 state=DEFINING_POSITION → handleAdding NOT triggered', () => {
      (action as unknown as R)['state'] = WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION;
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      mockWeave._stageHandlers['pointerup'](makePointerEvent({ pointerId: 1 }));
      expect(cancelFn).not.toHaveBeenCalled();
    });

    it('10.5 imageId=null → handleAdding called with "" (??  empty string fallback)', async () => {
      // Need imageNodeHandler to allow handleAdding to complete
      const imageNodeHandler = makeImageNodeHandler();
      imageNodeHandler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      mockWeave.getNodeHandler.mockReturnValue(imageNodeHandler);
      (action as unknown as R)['state'] = WEAVE_IMAGE_TOOL_STATE.SELECTED_POSITION;
      (action as unknown as R)['imageId'] = null; // triggers ?? '' branch
      // imageAction for '' key doesn't exist → handleAdding falls through to cancelAction
      (action as unknown as R)['imageAction'] = {};
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      mockWeave._stageHandlers['pointerup'](makePointerEvent({ pointerId: 1 }));
      await new Promise((r) => setTimeout(r, 0));
      expect(cancelFn).toHaveBeenCalled();
    });
  });

  // ── Suite 11: loadImage ───────────────────────────────────────────────────────
  describe('Suite 11: loadImage', () => {
    beforeEach(setupAction);

    it('11.1 imageNodeHandler null → early return after setCursor/setFocusStage', async () => {
      mockWeave.getNodeHandler.mockReturnValue(null);
      (mockWeave.emitEvent as ReturnType<typeof vi.fn>).mockClear();
      await (action as unknown as R)['loadImage']('test-uuid', {
        type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL,
        image: mockImageURL,
      });
      expect(mockWeave.emitEvent).not.toHaveBeenCalled();
    });

    it('11.2 FILE: success → getDataURL called → addImageNode called', async () => {
      const imageNodeHandler = makeImageNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(imageNodeHandler);
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({
          uploadType: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE,
          props: { width: 100, height: 100 },
        }),
      };
      const getDataURLSpy = vi
        .spyOn(action, 'getDataURL')
        .mockResolvedValue('data:image/png;base64,abc');
      await (action as unknown as R)['loadImage']('test-uuid', {
        type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE,
        image: mockImageFile,
      });
      expect(getDataURLSpy).toHaveBeenCalled();
    });

    it('11.3 FILE: getDataURL throws → cancelAction', async () => {
      const imageNodeHandler = makeImageNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(imageNodeHandler);
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({
          uploadType: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE,
          props: { width: 100, height: 100 },
        }),
      };
      vi.spyOn(action, 'getDataURL').mockRejectedValue(new Error('fail'));
      await (action as unknown as R)['loadImage']('test-uuid', {
        type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE,
        image: mockImageFile,
      });
      expect((action as unknown as R)['cancelAction']).toHaveBeenCalled();
    });

    it('11.4 IMAGE_URL → addImageNode runs synchronously + setTimeout schedules saveImageUrl', async () => {
      vi.useFakeTimers();
      const imageNodeHandler = makeImageNodeHandler();
      imageNodeHandler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      mockWeave.getNodeHandler.mockReturnValue(imageNodeHandler);
      (action as unknown as R)['imageId'] = 'test-uuid';
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({
          uploadType: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL,
          imageURL: mockImageURL,
        }),
      };
      const saveImageUrlSpy = vi.spyOn(action, 'saveImageUrl').mockImplementation(() => {});
      await (action as unknown as R)['loadImage']('test-uuid', {
        type: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL,
        image: mockImageURL,
      });
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddingImage');
      vi.runAllTimers();
      expect(saveImageUrlSpy).toHaveBeenCalledWith('test-uuid', mockImageURL.url);
      vi.useRealTimers();
    });
  });

  // ── Suite 12: isTouchDevice ───────────────────────────────────────────────────
  describe('Suite 12: isTouchDevice', () => {
    it('12.1 matchMedia matches=true → true', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
      expect((action as unknown as R)['isTouchDevice']()).toBe(true);
    });

    it('12.2 matchMedia matches=false → false', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
      expect((action as unknown as R)['isTouchDevice']()).toBe(false);
    });
  });

  // ── Suite 13: addImageNode ────────────────────────────────────────────────────
  describe('Suite 13: addImageNode', () => {
    beforeEach(setupAction);

    it('13.1 position provided → setState(SELECTED_POSITION), handleAdding called', async () => {
      const imageNodeHandler = makeImageNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(imageNodeHandler);
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry(),
      };
      const cancelFn = (action as unknown as R)['cancelAction'] as ReturnType<typeof vi.fn>;
      await (action as unknown as R)['addImageNode']('test-uuid', { x: 100, y: 200 });
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGE_TOOL_STATE.FINISHED);
      expect(cancelFn).toHaveBeenCalled();
    });

    it('13.2 no position + imageNodeHandler null → cancelAction', async () => {
      mockWeave.getNodeHandler.mockReturnValue(null);
      (action as unknown as R)['imageAction'] = { 'test-uuid': makeImageActionEntry() };
      await (action as unknown as R)['addImageNode']('test-uuid');
      expect((action as unknown as R)['cancelAction']).toHaveBeenCalled();
    });

    it('13.3 uploadType=IMAGE_URL → getImageSource called', async () => {
      const imageNodeHandler = makeImageNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(imageNodeHandler);
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({ uploadType: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL }),
      };
      await (action as unknown as R)['addImageNode']('test-uuid');
      expect(imageNodeHandler.getImageSource).toHaveBeenCalled();
    });

    it('13.4 uploadType=file + imageFallbackURL → loadImageDataURL called if imageSource null', async () => {
      const imageNodeHandler = makeImageNodeHandler();
      imageNodeHandler.getImageSource.mockReturnValue(null);
      imageNodeHandler.getFallbackImageSource.mockReturnValue(null);
      mockWeave.getNodeHandler.mockReturnValue(imageNodeHandler);
      const loadSpy = vi
        .spyOn(action as unknown as { loadImageDataURL: (s: string) => Promise<unknown> }, 'loadImageDataURL')
        .mockResolvedValue({ width: 400, height: 300 });
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({
          uploadType: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE,
          props: { imageFallbackURL: 'data:image/png;base64,abc', width: 400, height: 300 },
        }),
      };
      await (action as unknown as R)['addImageNode']('test-uuid');
      expect(loadSpy).toHaveBeenCalled();
    });

    it('13.4b uploadType=file, getFallbackImageSource non-null → ??= short-circuits, loadImageDataURL NOT called', async () => {
      const imageNodeHandler = makeImageNodeHandler();
      imageNodeHandler.getImageSource.mockReturnValue(null);
      imageNodeHandler.getFallbackImageSource.mockReturnValue({ width: 400, height: 300 }); // non-null → ??= short-circuits
      mockWeave.getNodeHandler.mockReturnValue(imageNodeHandler);
      const loadSpy = vi
        .spyOn(action as unknown as { loadImageDataURL: (s: string) => Promise<unknown> }, 'loadImageDataURL')
        .mockResolvedValue({ width: 400, height: 300 });
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({
          uploadType: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE,
          props: { imageFallback: 'data:image/png;base64,abc', width: 400, height: 300 },
        }),
      };
      await (action as unknown as R)['addImageNode']('test-uuid');
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('13.5 imageSource null (IMAGE_URL) → cancelAction', async () => {
      const imageNodeHandler = makeImageNodeHandler();
      imageNodeHandler.getImageSource.mockReturnValue(null);
      mockWeave.getNodeHandler.mockReturnValue(imageNodeHandler);
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({ uploadType: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL }),
      };
      await (action as unknown as R)['addImageNode']('test-uuid');
      expect((action as unknown as R)['cancelAction']).toHaveBeenCalled();
    });

    it('13.6 !tempImageNode + tempImageId + !isTouchDevice → Konva.Image created', async () => {
      const imageNodeHandler = makeImageNodeHandler();
      imageNodeHandler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      mockWeave.getNodeHandler.mockReturnValue(imageNodeHandler);
      (action as unknown as R)['tempImageNode'] = null;
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry(),
      };
      await (action as unknown as R)['addImageNode']('test-uuid');
      expect(MockImage).toHaveBeenCalled();
      expect(mockWeave._mainLayer.add).toHaveBeenCalled();
    });

    it('13.6b mousePos null → ?? 0 fallback in Konva.Image x/y', async () => {
      const imageNodeHandler = makeImageNodeHandler();
      imageNodeHandler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      mockWeave.getNodeHandler.mockReturnValue(imageNodeHandler);
      (action as unknown as R)['tempImageNode'] = null;
      mockWeave._stage.getRelativePointerPosition.mockReturnValue(null); // triggers ?? 0
      (action as unknown as R)['imageAction'] = { 'test-uuid': makeImageActionEntry() };
      await (action as unknown as R)['addImageNode']('test-uuid');
      expect(MockImage).toHaveBeenCalled();
      // x = (null?.x ?? 0) + padding/scaleX = 0 + 5/1 = 5
      const callAttrs = (MockImage as ReturnType<typeof vi.fn>).mock.calls[0][0] as { x: number; y: number };
      expect(typeof callAttrs.x).toBe('number');
      expect(typeof callAttrs.y).toBe('number');
    });

    it('13.7 tempImageNode already set → no new Konva.Image created', async () => {
      const imageNodeHandler = makeImageNodeHandler();
      imageNodeHandler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      mockWeave.getNodeHandler.mockReturnValue(imageNodeHandler);
      (action as unknown as R)['tempImageNode'] = { setAttrs: vi.fn(), destroy: vi.fn() };
      (action as unknown as R)['imageAction'] = { 'test-uuid': makeImageActionEntry() };
      await (action as unknown as R)['addImageNode']('test-uuid');
      expect(MockImage).not.toHaveBeenCalled();
    });

    it('13.8 isTouchDevice=true → no Konva.Image created', async () => {
      const imageNodeHandler = makeImageNodeHandler();
      imageNodeHandler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      mockWeave.getNodeHandler.mockReturnValue(imageNodeHandler);
      (action as unknown as R)['tempImageNode'] = null;
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
      (action as unknown as R)['imageAction'] = { 'test-uuid': makeImageActionEntry() };
      await (action as unknown as R)['addImageNode']('test-uuid');
      expect(MockImage).not.toHaveBeenCalled();
    });

    it('13.9 emitEvent(onAddingImage) + clickPoint=null + setState(DEFINING_POSITION)', async () => {
      const imageNodeHandler = makeImageNodeHandler();
      imageNodeHandler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      mockWeave.getNodeHandler.mockReturnValue(imageNodeHandler);
      (action as unknown as R)['tempImageNode'] = null;
      (action as unknown as R)['tempImageId'] = null; // prevents Konva.Image branch
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({ clickPoint: { x: 10, y: 20 } }),
      };
      await (action as unknown as R)['addImageNode']('test-uuid');
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onAddingImage');
      const entry = ((action as unknown as R)['imageAction'] as R)['test-uuid'] as R;
      expect(entry['clickPoint']).toBeNull();
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION);
    });
  });

  // ── Suite 14: handleAdding ────────────────────────────────────────────────────
  describe('Suite 14: handleAdding', () => {
    beforeEach(() => {
      setupAction();
      (action as unknown as R)['imageId'] = 'test-uuid';
    });

    it('14.1 imageNodeHandler null → cancelAction', async () => {
      mockWeave.getNodeHandler.mockReturnValue(null);
      (action as unknown as R)['imageAction'] = { 'test-uuid': makeImageActionEntry() };
      await (action as unknown as R)['handleAdding']('test-uuid');
      expect((action as unknown as R)['cancelAction']).toHaveBeenCalled();
    });

    it('14.2 uploadType=FILE + imageFallbackURL → loadImageDataURL called if imageSource null', async () => {
      const handler = makeImageNodeHandler();
      handler.getImageSource.mockReturnValue(null);
      handler.getFallbackImageSource.mockReturnValue(null);
      mockWeave.getNodeHandler.mockReturnValue(handler);
      const loadSpy = vi
        .spyOn(action as unknown as { loadImageDataURL: (s: string) => Promise<unknown> }, 'loadImageDataURL')
        .mockResolvedValue({ width: 100, height: 100 });
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({
          uploadType: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE,
          props: { imageFallbackURL: 'data:image/png;base64,abc', width: 0, height: 0 },
        }),
      };
      await (action as unknown as R)['handleAdding']('test-uuid');
      expect(loadSpy).toHaveBeenCalled();
    });

    it('14.2b uploadType=FILE, getFallbackImageSource non-null → ??= short-circuits', async () => {
      const handler = makeImageNodeHandler();
      handler.getImageSource.mockReturnValue(null);
      handler.getFallbackImageSource.mockReturnValue({ width: 400, height: 300 }); // non-null → ??= short-circuits
      mockWeave.getNodeHandler.mockReturnValue(handler);
      const loadSpy = vi
        .spyOn(action as unknown as { loadImageDataURL: (s: string) => Promise<unknown> }, 'loadImageDataURL')
        .mockResolvedValue({ width: 100, height: 100 });
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({
          uploadType: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE,
          props: { imageFallback: 'data:image/png;base64,abc', width: 0, height: 0 },
        }),
      };
      await (action as unknown as R)['handleAdding']('test-uuid');
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('14.3 !imageSource && !position → cancelAction (early)', async () => {
      const handler = makeImageNodeHandler();
      handler.getImageSource.mockReturnValue(null);
      handler.getFallbackImageSource.mockReturnValue(null);
      vi.spyOn(action as unknown as { loadImageDataURL: (s: string) => Promise<unknown> }, 'loadImageDataURL').mockResolvedValue(null);
      mockWeave.getNodeHandler.mockReturnValue(handler);
      (action as unknown as R)['imageAction'] = { 'test-uuid': makeImageActionEntry() };
      await (action as unknown as R)['handleAdding']('test-uuid');
      expect((action as unknown as R)['cancelAction']).toHaveBeenCalled();
      expect(mockWeave.addNode).not.toHaveBeenCalled();
    });

    it('14.4 !imageSource + position provided → no early cancelAction, create called', async () => {
      const handler = makeImageNodeHandler();
      handler.getImageSource.mockReturnValue(null);
      handler.getFallbackImageSource.mockReturnValue(null);
      vi.spyOn(action as unknown as { loadImageDataURL: (s: string) => Promise<unknown> }, 'loadImageDataURL').mockResolvedValue(null);
      mockWeave.getNodeHandler.mockReturnValue(handler);
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({ props: { width: 0, height: 0 } }),
      };
      await (action as unknown as R)['handleAdding']('test-uuid', { x: 100, y: 200 });
      expect(handler.create).toHaveBeenCalled();
    });

    it('14.5 nodeHandler (image) null → no node created', async () => {
      const imageNodeHandler = makeImageNodeHandler();
      imageNodeHandler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      mockWeave.getNodeHandler.mockImplementation((type: string) =>
        type === 'image' ? null : imageNodeHandler
      );
      (action as unknown as R)['imageAction'] = { 'test-uuid': makeImageActionEntry() };
      await (action as unknown as R)['handleAdding']('test-uuid');
      expect(mockWeave.addNode).not.toHaveBeenCalled();
      expect((action as unknown as R)['cancelAction']).toHaveBeenCalled();
    });

    it('14.6 IMAGE_URL + imageURL present → realImageURL = imageURL.url', async () => {
      const handler = makeImageNodeHandler();
      handler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      mockWeave.getNodeHandler.mockReturnValue(handler);
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({
          uploadType: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL,
          imageURL: mockImageURL,
        }),
      };
      await (action as unknown as R)['handleAdding']('test-uuid');
      const createCall = (handler.create as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(createCall[1].imageURL).toBe(mockImageURL.url);
    });

    it('14.7 IMAGE_URL + imageURL=null → realImageURL = undefined', async () => {
      const handler = makeImageNodeHandler();
      handler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      mockWeave.getNodeHandler.mockReturnValue(handler);
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({ uploadType: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.IMAGE_URL, imageURL: null }),
      };
      await (action as unknown as R)['handleAdding']('test-uuid');
      const createCall = (handler.create as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(createCall[1].imageURL).toBeUndefined();
    });

    it('14.8 props.width truthy → uses props.width/height for imageWidth/Height', async () => {
      const handler = makeImageNodeHandler();
      handler.getImageSource.mockReturnValue({ width: 800, height: 600 });
      mockWeave.getNodeHandler.mockReturnValue(handler);
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({ props: { width: 200, height: 150 } }),
      };
      await (action as unknown as R)['handleAdding']('test-uuid');
      const createCall = (handler.create as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(createCall[1].imageWidth).toBe(200);
      expect(createCall[1].imageHeight).toBe(150);
    });

    it('14.9 props.width=0 (falsy) → uses imageSource.width/height', async () => {
      const handler = makeImageNodeHandler();
      handler.getImageSource.mockReturnValue({ width: 800, height: 600 });
      mockWeave.getNodeHandler.mockReturnValue(handler);
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({ props: { width: 0, height: 0 } }),
      };
      await (action as unknown as R)['handleAdding']('test-uuid');
      const createCall = (handler.create as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(createCall[1].imageWidth).toBe(800);
      expect(createCall[1].imageHeight).toBe(600);
    });

    it('14.10 forceMainContainer=true → addNode with main layer id', async () => {
      const handler = makeImageNodeHandler();
      handler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      mockWeave.getNodeHandler.mockReturnValue(handler);
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({ forceMainContainer: true }),
      };
      await (action as unknown as R)['handleAdding']('test-uuid');
      expect(mockWeave.addNode).toHaveBeenCalledWith(expect.anything(), 'main-layer-id');
    });

    it('14.11 forceMainContainer=false → addNode with container id', async () => {
      const handler = makeImageNodeHandler();
      handler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      mockWeave.getNodeHandler.mockReturnValue(handler);
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({
          forceMainContainer: false,
          container: { getAttrs: vi.fn().mockReturnValue({ id: 'cont-id' }) },
        }),
      };
      await (action as unknown as R)['handleAdding']('test-uuid');
      expect(mockWeave.addNode).toHaveBeenCalledWith(expect.anything(), 'cont-id');
    });

    it('14.12 imageId in imageAction → create called with imageId spread', async () => {
      const handler = makeImageNodeHandler();
      handler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      mockWeave.getNodeHandler.mockReturnValue(handler);
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({ imageId: 'external-id' }),
      };
      await (action as unknown as R)['handleAdding']('test-uuid');
      const createCall = (handler.create as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(createCall[1].imageId).toBe('external-id');
    });

    it('14.13 setState(FINISHED) + cancelAction called at end', async () => {
      const handler = makeImageNodeHandler();
      handler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      mockWeave.getNodeHandler.mockReturnValue(handler);
      (action as unknown as R)['imageAction'] = { 'test-uuid': makeImageActionEntry() };
      await (action as unknown as R)['handleAdding']('test-uuid');
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGE_TOOL_STATE.FINISHED);
      expect((action as unknown as R)['cancelAction']).toHaveBeenCalled();
    });
  });

  // ── Suite 15: handleAdding → FILE upload ──────────────────────────────────────
  describe('Suite 15: handleAdding FILE upload', () => {
    beforeEach(() => {
      setupAction();
      (action as unknown as R)['imageId'] = 'test-uuid';
    });

    it('15.1 uploadImageFunction success → saveImageUrl + emitEvent(onImageUploaded)', async () => {
      const uploadFn = vi.fn().mockResolvedValue('https://upload.example.com/img.png');
      const handler = makeImageNodeHandler();
      handler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      handler.getFallbackImageSource.mockReturnValue({ width: 400, height: 300 }); // avoid loadImageDataURL hang
      mockWeave.getNodeHandler.mockReturnValue(handler);
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({
          uploadType: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE,
          imageURL: null,
          imageFile: mockImageFile,
          uploadImageFunction: uploadFn,
        }),
      };
      await (action as unknown as R)['handleAdding']('test-uuid');
      await new Promise((r) => setTimeout(r, 0));
      expect(mockWeave.emitEvent).toHaveBeenCalledWith(
        'onImageUploaded',
        expect.objectContaining({ imageURL: 'https://upload.example.com/img.png', nodeId: 'test-uuid' })
      );
    });

    it('15.2 uploadImageFunction returns null → emitEvent(onImageUploaded) NOT called', async () => {
      const uploadFn = vi.fn().mockResolvedValue(null);
      const handler = makeImageNodeHandler();
      handler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      handler.getFallbackImageSource.mockReturnValue({ width: 400, height: 300 }); // avoid loadImageDataURL hang
      mockWeave.getNodeHandler.mockReturnValue(handler);
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({
          uploadType: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE,
          imageURL: null,
          imageFile: mockImageFile,
          uploadImageFunction: uploadFn,
        }),
      };
      await (action as unknown as R)['handleAdding']('test-uuid');
      await new Promise((r) => setTimeout(r, 0));
      expect(mockWeave.emitEvent).not.toHaveBeenCalledWith('onImageUploaded', expect.anything());
    });

    it('15.3 uploadImageFunction throws → emitEvent(onImageUploadedError)', async () => {
      const uploadFn = vi.fn().mockRejectedValue(new Error('upload failed'));
      const handler = makeImageNodeHandler();
      handler.getImageSource.mockReturnValue({ width: 400, height: 300 });
      handler.getFallbackImageSource.mockReturnValue({ width: 400, height: 300 }); // avoid loadImageDataURL hang
      mockWeave.getNodeHandler.mockReturnValue(handler);
      (action as unknown as R)['imageAction'] = {
        'test-uuid': makeImageActionEntry({
          uploadType: WEAVE_IMAGE_TOOL_UPLOAD_TYPE.FILE,
          imageURL: null,
          imageFile: mockImageFile,
          uploadImageFunction: uploadFn,
        }),
      };
      await (action as unknown as R)['handleAdding']('test-uuid');
      await new Promise((r) => setTimeout(r, 0));
      expect(mockWeave.emitEvent).toHaveBeenCalledWith(
        'onImageUploadedError',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  // ── Suite 16: saveImageUrl ────────────────────────────────────────────────────
  describe('Suite 16: saveImageUrl', () => {
    it('16.1 nodeHandler && node found → setAttr + forceLoadImage + updateNode', () => {
      const handler = makeImageNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(handler);
      action.saveImageUrl('test-uuid', 'https://new-url.com/img.png');
      expect(mockWeave._foundNode.setAttr).toHaveBeenCalledWith('imageURL', 'https://new-url.com/img.png');
      expect(handler.forceLoadImage).toHaveBeenCalled();
      expect(mockWeave.updateNode).toHaveBeenCalled();
    });

    it('16.2 nodeHandler null → no-op', () => {
      mockWeave.getNodeHandler.mockReturnValue(null);
      expect(() => action.saveImageUrl('test-uuid', 'https://url.com')).not.toThrow();
      expect(mockWeave.updateNode).not.toHaveBeenCalled();
    });

    it('16.3 node null → no-op', () => {
      const handler = makeImageNodeHandler();
      mockWeave.getNodeHandler.mockReturnValue(handler);
      mockWeave._stage.findOne.mockReturnValue(null);
      action.saveImageUrl('test-uuid', 'https://url.com');
      expect(mockWeave.updateNode).not.toHaveBeenCalled();
    });
  });

  // ── Suite 17: cleanup ─────────────────────────────────────────────────────────
  describe('Suite 17: cleanup', () => {
    beforeEach(() => {
      setupAction();
      (action as unknown as R)['imageId'] = 'test-uuid';
      (action as unknown as R)['forceExecution'] = false;
    });

    it('17.1 tempImageNode present → destroy called', () => {
      const mockTempNode = { destroy: vi.fn() };
      (action as unknown as R)['tempImageNode'] = mockTempNode;
      action.cleanup();
      expect(mockTempNode.destroy).toHaveBeenCalled();
    });

    it('17.2 tempImageNode null → no error', () => {
      (action as unknown as R)['tempImageNode'] = null;
      expect(() => action.cleanup()).not.toThrow();
    });

    it('17.3 !forceExecution, selectionPlugin + node found → setSelectedNodes([node])', () => {
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).toHaveBeenCalledWith([
        mockWeave._foundNode,
      ]);
      expect(mockWeave.triggerAction).toHaveBeenCalledWith(SELECTION_TOOL_ACTION_NAME);
    });

    it('17.4 !forceExecution, selectionPlugin + node NOT found → setSelectedNodes NOT called', () => {
      mockWeave._stage.findOne.mockReturnValue(null);
      action.cleanup();
      expect(mockWeave._selectionPlugin.setSelectedNodes).not.toHaveBeenCalled();
      expect(mockWeave.triggerAction).toHaveBeenCalled();
    });

    it('17.5 !forceExecution, no selectionPlugin → no error', () => {
      mockWeave.getPlugin.mockReturnValue(null);
      expect(() => action.cleanup()).not.toThrow();
    });

    it('17.6 !forceExecution → cursor=default, endDrag called', () => {
      action.cleanup();
      expect(mockWeave._stageContainer.style.cursor).toBe('default');
      expect(mockWeave.endDrag).toHaveBeenCalledWith(WEAVE_IMAGE_TOOL_ACTION_NAME);
    });

    it('17.7 forceExecution=true → no cursor reset, no endDrag', () => {
      (action as unknown as R)['forceExecution'] = true;
      action.cleanup();
      expect(mockWeave._stageContainer.style.cursor).not.toBe('default');
      expect(mockWeave.endDrag).not.toHaveBeenCalled();
    });

    it('17.8 after cleanup: initialCursor=null, tempImageNode=null, state=IDLE', () => {
      action.cleanup();
      expect((action as unknown as R)['initialCursor']).toBeNull();
      expect((action as unknown as R)['tempImageNode']).toBeNull();
      expect((action as unknown as R)['state']).toBe(WEAVE_IMAGE_TOOL_STATE.IDLE);
    });
  });

  // ── Suite 18: setDragAndDropProperties ───────────────────────────────────────
  describe('Suite 18: setDragAndDropProperties', () => {
    it('18.1 startDrag + setDragProperties called with correct args', () => {
      action.setDragAndDropProperties({ imageURL: mockImageURL });
      expect(mockWeave.startDrag).toHaveBeenCalledWith(WEAVE_IMAGE_TOOL_ACTION_NAME);
      expect(mockWeave.setDragProperties).toHaveBeenCalledWith({ imageURL: mockImageURL });
    });
  });

  // ── Suite 19: getActualState ──────────────────────────────────────────────────
  describe('Suite 19: getActualState', () => {
    it('19.1 returns current state', () => {
      (action as unknown as R)['state'] = WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION;
      expect(action.getActualState()).toBe(WEAVE_IMAGE_TOOL_STATE.DEFINING_POSITION);
    });
  });

  // ── Suite 20: loadImageDataURL ────────────────────────────────────────────────
  describe('Suite 20: loadImageDataURL', () => {
    it('20.1 onload fires → resolves with element', async () => {
      const mockEle = { onload: null as unknown as () => void, onerror: null, src: '' };
      (Konva.Util.createImageElement as ReturnType<typeof vi.fn>).mockReturnValue(mockEle);
      const promise = (action as unknown as R)['loadImageDataURL'](
        'data:image/png;base64,abc'
      ) as Promise<typeof mockEle>;
      mockEle.onload();
      const result = await promise;
      expect(result).toBe(mockEle);
    });

    it('20.2 onerror fires → rejects', async () => {
      const mockEle = {
        onload: null,
        onerror: null as unknown as (e: unknown) => void,
        src: '',
      };
      (Konva.Util.createImageElement as ReturnType<typeof vi.fn>).mockReturnValue(mockEle);
      const promise = (action as unknown as R)['loadImageDataURL'](
        'data:image/png;base64,abc'
      ) as Promise<unknown>;
      mockEle.onerror(new Error('load error'));
      await expect(promise).rejects.toBeDefined();
    });
  });

  // ── Suite 21: getDataURL ──────────────────────────────────────────────────────
  describe('Suite 21: getDataURL', () => {
    it('21.1 onloadend fires → resolves with reader.result', async () => {
      const mockReader = {
        onloadend: null as unknown as () => void,
        onerror: null,
        result: 'data:image/png;base64,abc',
        readAsDataURL: vi.fn(),
      };
      vi.stubGlobal('FileReader', vi.fn().mockImplementation(() => mockReader));
      const promise = action.getDataURL(new Blob(['test']));
      mockReader.onloadend();
      const result = await promise;
      expect(result).toBe('data:image/png;base64,abc');
    });

    it('21.2 onerror fires → rejects with Error', async () => {
      const mockReader = {
        onloadend: null,
        onerror: null as unknown as () => void,
        result: null,
        readAsDataURL: vi.fn(),
      };
      vi.stubGlobal('FileReader', vi.fn().mockImplementation(() => mockReader));
      const promise = action.getDataURL(new Blob(['test']));
      mockReader.onerror();
      await expect(promise).rejects.toThrow('Failed to generate dataURL from file');
    });
  });

  // ── Suite 22: setCursor ───────────────────────────────────────────────────────
  describe('Suite 22: setCursor', () => {
    it('22.1 sets stage container cursor to crosshair', () => {
      (action as unknown as R)['setCursor']();
      expect(mockWeave._stageContainer.style.cursor).toBe('crosshair');
    });
  });

  // ── Suite 23: setFocusStage ───────────────────────────────────────────────────
  describe('Suite 23: setFocusStage', () => {
    it('23.1 sets tabIndex=1, calls blur() and focus()', () => {
      (action as unknown as R)['setFocusStage']();
      expect(mockWeave._stageContainer.tabIndex).toBe(1);
      expect(mockWeave._stageContainer.blur).toHaveBeenCalled();
      expect(mockWeave._stageContainer.focus).toHaveBeenCalled();
    });
  });
});
