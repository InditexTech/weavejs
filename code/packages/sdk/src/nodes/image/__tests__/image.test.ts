// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import Konva from 'konva';
import { WeaveImageNode } from '../image';
import {
  WEAVE_IMAGE_CROP_END_TYPE,
  WEAVE_IMAGE_DEFAULT_CONFIG,
  WEAVE_IMAGE_NODE_TYPE,
  WEAVE_STAGE_IMAGE_CROPPING_MODE,
} from '../constants';
import { WeaveImageCrop } from '../crop';
import { augmentKonvaNodeClass } from '../../node';
import type {
  ImageProps,
  WeaveImageProperties,
  WeaveImageState,
} from '../types';
import { doPreloadCursors } from '@/utils/cursors';
import { SELECTION_TOOL_ACTION_NAME } from '@/actions/selection-tool/constants';
import { WEAVE_STAGE_DEFAULT_MODE } from '../../stage/constants';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));
vi.mock('@/utils/cursors', () => ({
  doPreloadCursors: vi.fn().mockImplementation(
    async (
      cursors: Record<string, string>,
      setCursor: (state: string, cursor: string) => void,
      _getFallback: (state: string) => string,
      _reset: () => void
    ) => {
      for (const key of Object.keys(cursors)) {
        setCursor(key, cursors[key]);
      }
    }
  ),
}));

type MockImageElement = {
  src: string;
  crossOrigin: string;
  width: number;
  height: number;
  onload: (() => void) | null;
  onerror: (() => void) | null;
};

type SelectionPluginMock = {
  getSelectedNodes: ReturnType<typeof vi.fn>;
  isSelecting: ReturnType<typeof vi.fn>;
  getTransformer: ReturnType<typeof vi.fn>;
  getHoverTransformer: ReturnType<typeof vi.fn>;
  getSelectorConfig: ReturnType<typeof vi.fn>;
  setSelectedNodes: ReturnType<typeof vi.fn>;
  isDragging: ReturnType<typeof vi.fn>;
  isTransforming: ReturnType<typeof vi.fn>;
  isAreaSelecting: ReturnType<typeof vi.fn>;
};

type UtilityLayerMock = {
  add: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  destroyChildren: ReturnType<typeof vi.fn>;
  show: ReturnType<typeof vi.fn>;
  hide: ReturnType<typeof vi.fn>;
};

type MockStage = {
  findOne: ReturnType<typeof vi.fn>;
  mode: ReturnType<typeof vi.fn>;
  container: ReturnType<typeof vi.fn>;
  scaleX: ReturnType<typeof vi.fn>;
  scaleY: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
};

type MockInstance = ReturnType<typeof createMockInstance>;

type ImageNodePrivate = {
  config: WeaveImageProperties;
  imageBitmapCache: Record<string, ImageBitmap>;
  imageSource: Record<string, HTMLImageElement>;
  imageFallback: Record<string, HTMLImageElement>;
  imageState: Record<string, WeaveImageState>;
  imageTryoutAttempts: Record<string, number>;
  imageTryoutIds: Record<string, ReturnType<typeof setTimeout>>;
  imageCrop: WeaveImageCrop | null;
  nodeType: string;
  cursors: Record<string, string>;
  notUsedImagesCleanup: ReturnType<typeof setTimeout> | null;
  getConfiguration: () => WeaveImageProperties;
  loadImage: (
    params: ImageProps,
    image: Konva.Group,
    useFallback?: boolean,
    loadTryout?: boolean
  ) => void;
  setErrorState: (imageId: string, image?: Konva.Group) => void;
  loadImageTryout: (imageId: string) => void;
  setupNotUsedImagesCleanup: () => void;
};

let setupCleanupSpy: ReturnType<typeof vi.spyOn>;

function makeMockImageElement(): MockImageElement {
  return {
    src: '',
    crossOrigin: '',
    width: 200,
    height: 150,
    onload: null,
    onerror: null,
  };
}

function createSelectionPluginMock(): SelectionPluginMock {
  const transformer = { show: vi.fn(), hide: vi.fn(), forceUpdate: vi.fn() };
  const hoverTransformer = { forceUpdate: vi.fn(), nodes: vi.fn(), moveToTop: vi.fn() };

  return {
    getSelectedNodes: vi.fn().mockReturnValue([]),
    isSelecting: vi.fn().mockReturnValue(false),
    getTransformer: vi.fn().mockReturnValue(transformer),
    getHoverTransformer: vi.fn().mockReturnValue(hoverTransformer),
    getSelectorConfig: vi.fn().mockReturnValue({}),
    setSelectedNodes: vi.fn(),
    isDragging: vi.fn().mockReturnValue(false),
    isTransforming: vi.fn().mockReturnValue(false),
    isAreaSelecting: vi.fn().mockReturnValue(false),
  };
}

function createMockInstance() {
  const mockStage: MockStage = {
    findOne: vi.fn().mockReturnValue(null),
    mode: vi.fn(),
    container: vi.fn().mockReturnValue({ style: { cursor: '' } }),
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
    on: vi.fn(),
    off: vi.fn(),
  };
  const utilityLayer: UtilityLayerMock = {
    add: vi.fn(),
    find: vi.fn().mockReturnValue([]),
    destroyChildren: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
  };
  const selectionPlugin = createSelectionPluginMock();

  return {
    getStage: vi.fn().mockReturnValue(mockStage),
    getUtilityLayer: vi.fn().mockReturnValue(utilityLayer),
    getPlugin: vi.fn().mockImplementation((key: string) => {
      if (key === 'nodesSelection') {
        return selectionPlugin;
      }
      return null;
    }),
    getEventsController: vi.fn().mockReturnValue({ signal: undefined }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    emitEvent: vi.fn(),
    loadAsyncElement: vi.fn(),
    resolveAsyncElement: vi.fn(),
    setMutexLock: vi.fn().mockReturnValue(true),
    releaseMutexLock: vi.fn(),
    updateNode: vi.fn(),
    updateNodeNT: vi.fn(),
    removeNodeNT: vi.fn(),
    stateTransactional: vi.fn().mockImplementation((fn: () => void) => fn()),
    isServerSide: vi.fn().mockReturnValue(false),
    getNodeHandler: vi.fn().mockReturnValue(undefined),
    getInstanceRecursive: vi.fn().mockReturnValue(null),
    getSelectorConfig: vi.fn().mockReturnValue({}),
    getActiveAction: vi.fn().mockReturnValue(undefined),
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  };
}

function makeNode(config: Partial<WeaveImageProperties> = {}) {
  const node = new WeaveImageNode({ config });
  const mock = createMockInstance();
  augmentKonvaNodeClass();
  Object.assign(node as unknown as Record<string, unknown>, {
    instance: mock,
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  });
  return { node, mock };
}

function defaultProps(overrides: Partial<ImageProps> = {}): ImageProps {
  return {
    id: 'test-image',
    width: 200,
    height: 150,
    imageURL: 'http://example.com/image.jpg',
    nodeType: 'image',
    x: 0,
    y: 0,
    rotation: 0,
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    children: [],
    imageInfo: { width: 200, height: 150 },
    uncroppedImage: { width: 200, height: 150 },
    adding: false,
    imageWidth: 200,
    imageHeight: 150,
    cropping: false,
    ...overrides,
  };
}

function getPrivateNode(node: WeaveImageNode): ImageNodePrivate {
  return node as unknown as ImageNodePrivate;
}

function getSelectionPlugin(mock: MockInstance): SelectionPluginMock {
  return mock.getPlugin('nodesSelection') as SelectionPluginMock;
}

function getInstanceListener(mock: MockInstance, eventName: string) {
  const call = mock.addEventListener.mock.calls.find(([ev]) => ev === eventName);
  return call?.[1] as ((...args: unknown[]) => void) | undefined;
}

function fireKonvaEvent(
  node: Konva.Node,
  eventName: string,
  eventData: Record<string, unknown> = {}
) {
  const listeners = (
    node as unknown as { eventListeners?: Record<string, { handler: (...args: unknown[]) => void }[]> }
  ).eventListeners?.[eventName] ?? [];
  for (const { handler } of listeners) {
    handler.call(node, { target: node, cancelBubble: false, ...eventData });
  }
}

function createRenderableGroup(props: Partial<ImageProps> = {}) {
  const group = new Konva.Group({ ...defaultProps(props) });
  const placeholder = new Konva.Rect({
    id: `${group.id()}-placeholder`,
    width: group.width(),
    height: group.height(),
    scaleX: 1,
    scaleY: 1,
    visible: true,
  });
  const internalImage = new Konva.Image({
    id: `${group.id()}-image`,
    width: group.width(),
    height: group.height(),
    scaleX: 1,
    scaleY: 1,
    visible: false,
  } as Konva.ImageConfig);
  const cropGroup = new Konva.Group({
    id: `${group.id()}-cropGroup`,
    width: group.width(),
    height: group.height(),
    scaleX: 1,
    scaleY: 1,
    visible: false,
  });
  group.add(placeholder);
  group.add(internalImage);
  group.add(cropGroup);
  return { group, placeholder, internalImage, cropGroup };
}

beforeAll(() => {
  augmentKonvaNodeClass();
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn().mockReturnValue({ data: [] }),
    putImageData: vi.fn(),
    createImageData: vi.fn().mockReturnValue([]),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    arc: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 10 }),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    canvas: { width: 100, height: 100 },
  });
});

beforeEach(() => {
  document.body.innerHTML = '';
  vi.mocked(doPreloadCursors).mockImplementation(
    async (
      cursors: Record<string, string>,
      setCursor: (state: string, cursor: string) => void,
      _getFallback: (state: string) => string,
      _reset: () => void
    ) => {
      for (const key of Object.keys(cursors)) {
        setCursor(key, cursors[key]);
      }
    }
  );
  vi.spyOn(Konva.Util, 'createImageElement').mockImplementation(() => {
    return makeMockImageElement() as unknown as HTMLImageElement;
  });
  setupCleanupSpy = vi
    .spyOn(
      WeaveImageNode.prototype as unknown as {
        setupNotUsedImagesCleanup: () => void;
      },
      'setupNotUsedImagesCleanup'
    )
    .mockImplementation(() => {}) as unknown as ReturnType<typeof vi.spyOn>;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('WeaveImageNode', () => {
  describe('1 — constructor / initialize', () => {
    it('1.1 no params → default config applied', () => {
      const node = new WeaveImageNode();
      const privateNode = getPrivateNode(node);

      expect(privateNode.config.cleanup.intervalMs).toBe(60000);
      expect(privateNode.config.crossOrigin).toBe('anonymous');
    });

    it('1.2 custom config → merges', () => {
      const node = new WeaveImageNode({
        config: { cleanup: { intervalMs: 5000 } },
      });
      const privateNode = getPrivateNode(node);

      expect(privateNode.config.cleanup.intervalMs).toBe(5000);
      expect(privateNode.config.crossOrigin).toBe('anonymous');
    });

    it('1.3 initialize() resets internal state', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);

      privateNode.imageSource = { x: makeMockImageElement() as unknown as HTMLImageElement };
      privateNode.imageState = { x: { status: 'loaded', loaded: true, error: false } };
      privateNode.imageFallback = { x: makeMockImageElement() as unknown as HTMLImageElement };
      privateNode.imageTryoutAttempts = { x: 1 };
      privateNode.imageCrop = {} as unknown as WeaveImageCrop;

      node.initialize();

      expect(privateNode.imageSource).toEqual({});
      expect(privateNode.imageState).toEqual({});
      expect(privateNode.imageFallback).toEqual({});
      expect(privateNode.imageTryoutAttempts).toEqual({});
      expect(privateNode.imageCrop).toBeNull();
    });

    it('1.4 nodeType = image', () => {
      const node = new WeaveImageNode();
      expect(getPrivateNode(node).nodeType).toBe(WEAVE_IMAGE_NODE_TYPE);
    });
  });

  describe('2 — getConfiguration', () => {
    it('2.1 returns the config object', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      expect(node.getConfiguration()).toBe(privateNode.config);
    });
  });

  describe('3 — getIsAsync', () => {
    it('3.1 returns true', () => {
      const { node } = makeNode();
      expect(node.getIsAsync()).toBe(true);
    });
  });

  describe('4 — static defaultState', () => {
    it('4.1 type = image', () => {
      expect(WeaveImageNode.defaultState('img-1').type).toBe('image');
    });

    it('4.2 props include expected defaults', () => {
      const state = WeaveImageNode.defaultState('img-1');
      expect(state.props.imageURL).toBeDefined();
      expect(state.props.width).toBe(800);
      expect(state.props.height).toBe(600);
      expect(state.props.uncroppedImage).toEqual({ width: 800, height: 600 });
      expect(state.props.imageInfo).toEqual({ width: 800, height: 600 });
      expect(state.props.cropping).toBe(false);
    });
  });

  describe('5 — static addNodeState', () => {
    it('5.1 merges required props', () => {
      const state = WeaveImageNode.addNodeState(WeaveImageNode.defaultState('img-1'), {
        ...defaultProps(),
        x: 10,
        y: 20,
        rotation: 15,
      });

      expect(state.props.x).toBe(10);
      expect(state.props.y).toBe(20);
      expect(state.props.width).toBe(200);
      expect(state.props.height).toBe(150);
      expect(state.props.imageURL).toBe('http://example.com/image.jpg');
      expect(state.props.imageInfo).toEqual({ width: 200, height: 150 });
      expect(state.props.uncroppedImage).toEqual({ width: 200, height: 150 });
    });

    it('5.2 imageFallback and imageId only included when present', () => {
      const withoutOptional = WeaveImageNode.addNodeState(
        WeaveImageNode.defaultState('img-1'),
        defaultProps()
      );
      const withOptional = WeaveImageNode.addNodeState(
        WeaveImageNode.defaultState('img-1'),
        defaultProps({ imageFallback: 'fallback-data', imageId: 'asset-1' })
      );

      expect(withoutOptional.props.imageFallback).toBeUndefined();
      expect(withoutOptional.props.imageId).toBeUndefined();
      expect(withOptional.props.imageFallback).toBeUndefined();
      expect(withOptional.props.imageId).toBe('asset-1');
    });
  });

  describe('6 — static updateNodeState', () => {
    it('6.1 merges required props', () => {
      const state = WeaveImageNode.updateNodeState(
        WeaveImageNode.defaultState('img-1'),
        defaultProps({ x: 30, y: 40, rotation: 90 })
      );

      expect(state.props.x).toBe(30);
      expect(state.props.y).toBe(40);
      expect(state.props.width).toBe(200);
      expect(state.props.height).toBe(150);
      expect(state.props.imageURL).toBe('http://example.com/image.jpg');
    });

    it('6.2 imageInfo and uncroppedImage only included when present', () => {
      const state = WeaveImageNode.updateNodeState(WeaveImageNode.defaultState('img-1'), {
        ...defaultProps(),
        imageInfo: undefined,
        uncroppedImage: undefined,
      });

      expect(state.props.imageInfo).toEqual({ width: 800, height: 600 });
      expect(state.props.uncroppedImage).toEqual({ width: 800, height: 600 });
    });
  });

  describe('7 — static getSchema', () => {
    it('7.1 valid state passes', () => {
      const result = WeaveImageNode.getSchema().safeParse(WeaveImageNode.defaultState('img-1'));
      expect(result.success).toBe(true);
    });

    it('7.2 wrong type fails', () => {
      const result = WeaveImageNode.getSchema().safeParse({
        ...WeaveImageNode.defaultState('img-1'),
        type: 'wrong',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('8 — preloadCursors', () => {
    it('8.1 populates loading cursor', async () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);

      await node.preloadCursors();

      expect(privateNode.cursors.loading).toBe(WEAVE_IMAGE_DEFAULT_CONFIG.style.cursor.loading);
      expect(doPreloadCursors).toHaveBeenCalled();
    });

    it('8.2 reset callback clears cursors', async () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      let resetFn: (() => void) | undefined;

      vi.mocked(doPreloadCursors).mockImplementationOnce(
        async (
          cursors: Record<string, string>,
          setCursor: (state: string, cursor: string) => void,
          _getFallback: (state: string) => string,
          reset: () => void
        ) => {
          resetFn = reset;
          setCursor('loading', cursors.loading);
        }
      );

      await node.preloadCursors();
      resetFn?.();

      expect(privateNode.cursors).toEqual({});
    });
  });

  describe('9 — onRegister', () => {
    it('9.1 calls preloadCursors', async () => {
      const { node } = makeNode();
      const preloadSpy = vi.spyOn(node, 'preloadCursors').mockResolvedValue();

      await expect(node.onRegister()).resolves.toBeUndefined();
      expect(preloadSpy).toHaveBeenCalled();
    });
  });

  describe('10 — onRender: DOM structure', () => {
    it('10.1 returns Konva.Group with id = props.id', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(group.id()).toBe('test-image');
    });

    it('10.2 creates placeholder rect', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(group.findOne('#test-image-placeholder')).toBeInstanceOf(Konva.Rect);
    });

    it('10.3 creates hidden internal image', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const internalImage = group.findOne('#test-image-image') as Konva.Image;
      expect(internalImage).toBeDefined();
      expect(internalImage.isVisible()).toBe(false);
    });

    it('10.4 creates hidden crop group', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const cropGroup = group.findOne('#test-image-cropGroup') as Konva.Group;
      expect(cropGroup).toBeDefined();
      expect(cropGroup.isVisible()).toBe(false);
    });

    it('10.5 crop disabled keeps default crop helpers', () => {
      const { node } = makeNode({ cropMode: { enabled: false } as WeaveImageProperties['cropMode'] });
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(group.triggerCrop).toBe(Konva.Node.prototype.triggerCrop);
      expect(group.closeCrop).toBe(Konva.Node.prototype.closeCrop);
      expect(group.resetCrop).not.toBeUndefined();
    });

    it('10.6 crop enabled exposes crop helpers', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(typeof group.triggerCrop).toBe('function');
      expect(typeof group.closeCrop).toBe('function');
      expect(typeof group.resetCrop).toBe('function');
    });

    it('10.7 getTransformerProperties is a function', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(typeof group.getTransformerProperties).toBe('function');
    });

    it('10.8 allowedAnchors returns corner anchors', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(group.allowedAnchors()).toEqual([
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
      ]);
    });
  });

  describe('11 — onRender: image state branches', () => {
    it('11.1 fully-loaded image (status=loaded) removes placeholder and shows image', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      privateNode.imageSource = {
        'test-image': makeMockImageElement() as unknown as HTMLImageElement,
      };
      // Must also have status='loaded' for the image to be shown
      privateNode.imageState = {
        'test-image': { status: 'loaded', loaded: true, error: false },
      };

      const group = node.onRender(defaultProps()) as Konva.Group;
      const internalImage = group.findOne('#test-image-image') as Konva.Image;

      expect(group.findOne('#test-image-placeholder')).toBeFalsy();
      expect(internalImage.getAttrs().visible).toBe(true);
    });

    it('11.1b imageSource set but not yet loaded (status=loading) — keeps placeholder visible, does NOT show the unloaded image', () => {
      // Regression: grouping images while they are downloading caused onRender to
      // treat a still-loading HTMLImageElement as a fully loaded image, destroying the
      // placeholder and rendering a transparent/blank node.
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      const loadSpy = vi.spyOn(privateNode, 'loadImage');

      // imageSource is set (loading started) but onload has not fired yet
      privateNode.imageSource = {
        'test-image': makeMockImageElement() as unknown as HTMLImageElement,
      };
      privateNode.imageState = {
        'test-image': { status: 'loading', loaded: false, error: false },
      };

      const group = node.onRender(defaultProps()) as Konva.Group;
      const placeholder = group.findOne('#test-image-placeholder');
      const internalImage = group.findOne('#test-image-image') as Konva.Image;

      // Placeholder must still be present (image not done loading)
      expect(placeholder).toBeTruthy();
      // internalImage must NOT be visible
      expect(internalImage.getAttrs().visible).toBeFalsy();
      // imageState must not be overwritten to 'loaded'
      expect(privateNode.imageState['test-image']?.status).not.toBe('loaded');
      // loadImage should be called to restart loading on the new node
      expect(loadSpy).toHaveBeenCalled();
    });

    it('11.1c fallback showing + imageURL set + status=loading (e.g. after grouping mid-download) — shows fallback and restarts load', () => {
      // Regression: when images with a thumbnail were grouped while still downloading
      // the real image, the fallback/thumbnail disappeared and the image went transparent.
      const fallback = makeMockImageElement() as unknown as HTMLImageElement;
      const { node } = makeNode({
        imageFallback: {
          enabled: true,
          getId: () => 'test-image',
          getDataURL: () => '',
          onPersist: () => {},
        },
      });
      const privateNode = getPrivateNode(node);
      const loadSpy = vi.spyOn(privateNode, 'loadImage');

      privateNode.imageFallback = { 'test-image': fallback };
      privateNode.imageSource = {
        'test-image': makeMockImageElement() as unknown as HTMLImageElement,
      };
      // URL is set but image is in loading-with-fallback state
      privateNode.imageState = {
        'test-image': { status: 'loading', loaded: true, error: false },
      };

      const group = node.onRender(defaultProps()) as Konva.Group;
      const internalImage = group.findOne('#test-image-image') as Konva.Image;

      // Placeholder should be gone — fallback is shown instead
      expect(group.findOne('#test-image-placeholder')).toBeFalsy();
      // Fallback image must be the visible source
      expect(internalImage.getAttrs().image).toBe(fallback);
      expect(internalImage.getAttrs().visible).toBe(true);
      // imageState must remain 'loading' (not prematurely promoted to 'loaded')
      expect(privateNode.imageState['test-image']?.status).toBe('loading');
      // loadImage should be restarted on the new node so the real image eventually loads
      expect(loadSpy).toHaveBeenCalledWith(
        expect.objectContaining({ imageURL: 'http://example.com/image.jpg' }),
        group,
        false
      );
    });

    it('11.2 fallback not used when imageFallback.enabled is false (default)', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      const fallback = makeMockImageElement() as unknown as HTMLImageElement;
      privateNode.imageFallback = { 'test-image': fallback };

      const group = node.onRender(defaultProps({ imageURL: undefined })) as Konva.Group;
      const internalImage = group.findOne('#test-image-image') as Konva.Image;

      // imageFallback.enabled=false → hasFallbackAndFinalImageNotLoaded is false → fallback not applied
      expect(internalImage.getAttrs().image).toBeUndefined();
    });

    it('11.3 without sources it calls loadImage and createImageElement', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      const loadSpy = vi.spyOn(privateNode, 'loadImage');

      node.onRender(defaultProps());

      expect(loadSpy).toHaveBeenCalled();
      expect(privateNode.imageState['test-image']?.status).not.toBe('loaded');
      expect(Konva.Util.createImageElement).toHaveBeenCalled();
    });
  });

  describe('12 — onRender: dblClick handler', () => {
    it('12.1 loaded and not errored calls onDblClick', () => {
      const onDblClick = vi.fn();
      const { node } = makeNode({ onDblClick });
      const privateNode = getPrivateNode(node);
      privateNode.imageState = {
        'test-image': { loaded: true, error: false, status: 'loaded' },
      };

      const group = node.onRender(defaultProps()) as Konva.Group;
      group.dblClick();

      expect(onDblClick).toHaveBeenCalledWith(node, group);
    });

    it('12.2 not loaded does not call onDblClick', () => {
      const onDblClick = vi.fn();
      const { node } = makeNode({ onDblClick });
      const privateNode = getPrivateNode(node);
      privateNode.imageState = {
        'test-image': { loaded: false, error: false, status: 'loading' },
      };

      const group = node.onRender(defaultProps()) as Konva.Group;
      group.dblClick();

      expect(onDblClick).not.toHaveBeenCalled();
    });

    it('12.3 loaded with error does not call onDblClick', () => {
      const onDblClick = vi.fn();
      const { node } = makeNode({ onDblClick });
      const privateNode = getPrivateNode(node);
      privateNode.imageState = {
        'test-image': { loaded: true, error: true, status: 'loaded' },
      };

      const group = node.onRender(defaultProps()) as Konva.Group;
      group.dblClick();

      expect(onDblClick).not.toHaveBeenCalled();
    });
  });

  describe('13 — onRender: cache', () => {
    it('13.1 cache enabled calls cacheNode on transformend', () => {
      const { node } = makeNode({ performance: { cache: { enabled: true, pixelRatio: 2 } } as WeaveImageProperties['performance'] });
      const cacheSpy = vi.spyOn(node, 'cacheNode').mockImplementation(() => {});
      const group = node.onRender(defaultProps()) as Konva.Group;

      fireKonvaEvent(group, 'transformend');

      expect(cacheSpy).toHaveBeenCalledWith(group);
    });

    it('13.2 cache disabled does not call cacheNode', () => {
      const { node } = makeNode();
      const cacheSpy = vi.spyOn(node, 'cacheNode').mockImplementation(() => {});
      const group = node.onRender(defaultProps()) as Konva.Group;

      fireKonvaEvent(group, 'transformend');

      expect(cacheSpy).not.toHaveBeenCalled();
    });
  });

  describe('14 — onRender: defineMousePointer', () => {
    it('14.1 loading returns loading cursor', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      privateNode.cursors.loading = 'progress';
      privateNode.imageState = {
        'test-image': { status: 'loading', loaded: false, error: false },
      };

      const group = node.onRender(defaultProps()) as Konva.Group;
      expect(group.defineMousePointer()).toBe('progress');
    });

    it('14.2 selected in selection mode returns grab', () => {
      augmentKonvaNodeClass();
      const { node, mock } = makeNode();
      const privateNode = getPrivateNode(node);
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      privateNode.imageState['test-image'] = {
        status: 'loaded',
        loaded: true,
        error: false,
      };
      const group = node.onRender(defaultProps()) as Konva.Group;
      getSelectionPlugin(mock).getSelectedNodes.mockReturnValue([group]);
      privateNode.imageState['test-image'] = {
        status: 'loaded',
        loaded: true,
        error: false,
      };

      expect(group.defineMousePointer()).toBe('grab');
    });

    it('14.3 default returns pointer', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      privateNode.imageState['test-image'] = {
        status: 'loaded',
        loaded: true,
        error: false,
      };
      const group = node.onRender(defaultProps()) as Konva.Group;
      privateNode.imageState['test-image'] = {
        status: 'loaded',
        loaded: true,
        error: false,
      };
      expect(group.defineMousePointer()).toBe('pointer');
    });
  });

  describe('15 — onRender: event listeners', () => {
    it('15.1 nodeDragStart destroys crop nodes and shows transformer', () => {
      const { node, mock } = makeNode();
      const cropNode = { destroy: vi.fn() };
      mock.getUtilityLayer().find.mockReturnValue([cropNode]);
      const transformer = { show: vi.fn() };
      getSelectionPlugin(mock).getTransformer.mockReturnValue(transformer);
      const group = node.onRender(defaultProps()) as Konva.Group;

      fireKonvaEvent(group, 'nodeDragStart');

      expect(cropNode.destroy).toHaveBeenCalled();
      expect(transformer.show).toHaveBeenCalled();
    });

    it('15.2 onCmdCtrlPressed hides transformer, clears utility layer and renders crop mode', () => {
      const { node, mock } = makeNode();
      const renderCropModeSpy = vi.spyOn(node, 'renderCropMode').mockImplementation(() => {});
      const transformer = { show: vi.fn(), hide: vi.fn() };
      getSelectionPlugin(mock).getTransformer.mockReturnValue(transformer);
      const group = node.onRender(defaultProps()) as Konva.Group;
      vi.spyOn(group, 'isDragging').mockReturnValue(false);

      fireKonvaEvent(group, 'onCmdCtrlPressed');

      expect(transformer.hide).toHaveBeenCalled();
      expect(mock.getUtilityLayer().destroyChildren).toHaveBeenCalled();
      expect(renderCropModeSpy).toHaveBeenCalled();
    });

    it('15.3 onCmdCtrlReleased shows transformer', () => {
      const { node, mock } = makeNode();
      const transformer = { show: vi.fn(), hide: vi.fn() };
      getSelectionPlugin(mock).getTransformer.mockReturnValue(transformer);
      const group = node.onRender(defaultProps()) as Konva.Group;
      vi.spyOn(group, 'isDragging').mockReturnValue(false);

      fireKonvaEvent(group, 'onCmdCtrlReleased');

      expect(transformer.show).toHaveBeenCalled();
    });

    it('15.4 onSelectionCleared shows transformer and clears utility layer', () => {
      const { node, mock } = makeNode();
      const transformer = { show: vi.fn() };
      getSelectionPlugin(mock).getTransformer.mockReturnValue(transformer);
      const group = node.onRender(defaultProps()) as Konva.Group;

      fireKonvaEvent(group, 'onSelectionCleared');

      expect(transformer.show).toHaveBeenCalled();
      expect(mock.getUtilityLayer().destroyChildren).toHaveBeenCalled();
    });

    it('15.5 registers onNodeRenderedAdded and closes crop with cancel for duplicate id', () => {
      const { node, mock } = makeNode();
      const privateNode = getPrivateNode(node);
      privateNode.imageCrop = {} as unknown as WeaveImageCrop;
      const closeCropSpy = vi.spyOn(node, 'closeCrop').mockImplementation(() => {});
      const group = node.onRender(defaultProps()) as Konva.Group;
      const listener = getInstanceListener(mock, 'onNodeRenderedAdded');
      const otherParent = new Konva.Group({ id: 'parent-2' });
      const duplicate = new Konva.Group({ id: group.id() });
      otherParent.add(duplicate);

      listener?.(duplicate);

      expect(closeCropSpy).toHaveBeenCalledWith(group, WEAVE_IMAGE_CROP_END_TYPE.CANCEL);
    });
  });

  describe('16 — onUpdate: state branches', () => {
    it('16.1 not loaded updates placeholder attrs', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      privateNode.imageState = {
        'test-image': { status: 'loading', loaded: false, error: false },
      };
      const group = node.onRender(defaultProps()) as Konva.Group;
      const placeholder = group.findOne('#test-image-placeholder') as Konva.Rect;
      const placeholderSpy = vi.spyOn(placeholder, 'setAttrs');

      node.onUpdate(group, defaultProps({ x: 10, y: 20 }));

      expect(placeholderSpy).toHaveBeenCalledWith(
        expect.objectContaining({ x: 0, y: 0, scaleX: 1, scaleY: 1, visible: true })
      );
    });

    it('16.2 loaded + error uses fallback image', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      const fallback = makeMockImageElement() as unknown as HTMLImageElement;
      privateNode.imageState = {
        'test-image': { status: 'loaded', loaded: true, error: true },
      };
      privateNode.imageFallback = { 'test-image': fallback };
      const group = node.onRender(defaultProps()) as Konva.Group;
      const internalImage = group.findOne('#test-image-image') as Konva.Image;

      node.onUpdate(group, defaultProps());

      expect(internalImage.image()).toBe(fallback);
      expect(internalImage.isVisible()).toBe(true);
    });

    it('16.3 loaded + no error shows image and updates crop', () => {
      const { node } = makeNode();
      const updateImageCropSpy = vi.spyOn(node, 'updateImageCrop').mockImplementation(() => {});
      const privateNode = getPrivateNode(node);
      privateNode.imageState = {
        'test-image': { status: 'loaded', loaded: true, error: false },
      };
      const group = node.onRender(defaultProps()) as Konva.Group;
      const internalImage = group.findOne('#test-image-image') as Konva.Image;

      node.onUpdate(group, defaultProps());

      expect(internalImage.isVisible()).toBe(true);
      expect(updateImageCropSpy).toHaveBeenCalledWith(group);
    });

    it('16.4 cacheNode always called', () => {
      const { node } = makeNode();
      const cacheSpy = vi.spyOn(node, 'cacheNode').mockImplementation(() => {});
      const group = node.onRender(defaultProps()) as Konva.Group;

      node.onUpdate(group, defaultProps());

      expect(cacheSpy).toHaveBeenCalledWith(group);
    });
  });

  describe('17 — updatePlaceholderSize', () => {
    it('17.1 returns safely before and after loaded state', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      const { group } = createRenderableGroup();
      privateNode.imageState = {
        'test-image': { status: 'loading', loaded: false, error: false },
      };

      expect(() => node.updatePlaceholderSize(group)).not.toThrow();

      privateNode.imageState['test-image'] = { status: 'loaded', loaded: true, error: false };
      expect(() => node.updatePlaceholderSize(group)).not.toThrow();
    });
  });

  describe('18 — updateImageCrop', () => {
    it('18.1 returns early when image is not loaded', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      const { group, internalImage } = createRenderableGroup();
      const cropSpy = vi.spyOn(internalImage, 'crop');
      privateNode.imageState = {
        'test-image': { status: 'loading', loaded: false, error: false },
      };

      node.updateImageCrop(group);

      expect(cropSpy).not.toHaveBeenCalled();
    });

    it('18.2 applies computed crop values', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      const { group, internalImage } = createRenderableGroup({
        imageInfo: { width: 100, height: 50 },
        uncroppedImage: { width: 200, height: 100 },
        cropInfo: { x: 10, y: 20, width: 30, height: 40, scaleX: 2 },
        cropSize: { width: 30, height: 40 },
      });
      const cropSpy = vi.spyOn(internalImage, 'crop');
      privateNode.imageState = {
        'test-image': { status: 'loaded', loaded: true, error: false },
      };
      privateNode.imageSource = {
        'test-image': { ...makeMockImageElement(), width: 300, height: 150 } as unknown as HTMLImageElement,
      };

      node.updateImageCrop(group);

      expect(cropSpy).toHaveBeenCalledWith({ x: 15, y: 30, width: 45, height: 60 });
      expect(internalImage.width()).toBe(30);
      expect(internalImage.height()).toBe(40);
    });

    it('18.3 without cropInfo resets crop and dimensions', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      const { group, internalImage } = createRenderableGroup({
        imageInfo: { width: 100, height: 50 },
        uncroppedImage: { width: 200, height: 100 },
        cropInfo: undefined,
      });
      const cropSpy = vi.spyOn(internalImage, 'crop');
      privateNode.imageState = {
        'test-image': { status: 'loaded', loaded: true, error: false },
      };

      node.updateImageCrop(group);

      expect(cropSpy).toHaveBeenCalledWith(undefined);
      expect(internalImage.width()).toBe(200);
      expect(internalImage.height()).toBe(100);
    });

    it('18.4 adding=true skips crop logic', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      const { group, internalImage } = createRenderableGroup({
        adding: true,
        imageInfo: { width: 100, height: 50 },
        uncroppedImage: { width: 200, height: 100 },
        cropInfo: { x: 10, y: 20, width: 30, height: 40, scaleX: 2 },
        cropSize: { width: 30, height: 40 },
      });
      const cropSpy = vi.spyOn(internalImage, 'crop');
      privateNode.imageState = {
        'test-image': { status: 'loaded', loaded: true, error: false },
      };

      node.updateImageCrop(group);

      expect(cropSpy).not.toHaveBeenCalled();
    });

    it('18.5 uses fallback dimensions when main image width is zero', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      const { group, internalImage } = createRenderableGroup({
        imageInfo: { width: 100, height: 50 },
        uncroppedImage: { width: 200, height: 100 },
        cropInfo: { x: 10, y: 20, width: 30, height: 40, scaleX: 2 },
        cropSize: { width: 30, height: 40 },
      });
      const cropSpy = vi.spyOn(internalImage, 'crop');
      privateNode.imageState = {
        'test-image': { status: 'loaded', loaded: true, error: false },
      };
      privateNode.imageSource = {
        'test-image': { ...makeMockImageElement(), width: 0, height: 0 } as unknown as HTMLImageElement,
      };
      privateNode.imageFallback = {
        'test-image': { ...makeMockImageElement(), width: 400, height: 200 } as unknown as HTMLImageElement,
      };

      node.updateImageCrop(group);

      expect(cropSpy).toHaveBeenCalledWith({ x: 20, y: 40, width: 60, height: 80 });
    });
  });

  describe('19 — preloadImage', () => {
    it('19.1 empty URL sets error state and does not create image element', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      const setErrorStateSpy = vi.spyOn(privateNode, 'setErrorState').mockImplementation(() => {});

      node.preloadImage('test-image', '', {
        onLoad: vi.fn(),
        onError: vi.fn(),
      });

      expect(setErrorStateSpy).toHaveBeenCalledWith('test-image');
      expect(Konva.Util.createImageElement).not.toHaveBeenCalled();
    });

    it('19.2 valid URL onload marks loaded and calls onLoad', () => {
      const { node } = makeNode();
      const onLoad = vi.fn();

      node.preloadImage('test-image', 'http://example.com/image.jpg', {
        onLoad,
        onError: vi.fn(),
      });

      getPrivateNode(node).imageSource['test-image'].onload?.(
        new Event('load')
      );

      expect(getPrivateNode(node).imageState['test-image']).toEqual({
        status: 'loaded',
        loaded: true,
        error: false,
      });
      expect(onLoad).toHaveBeenCalled();
    });

    it('19.3 width=0 onload calls onError with InvalidImage', () => {
      const { node } = makeNode();
      const onError = vi.fn();
      node.preloadImage('test-image', 'http://example.com/image.jpg', {
        onLoad: vi.fn(),
        onError,
      });
      getPrivateNode(node).imageSource['test-image'].width = 0;

      getPrivateNode(node).imageSource['test-image'].onload?.(
        new Event('load')
      );

      expect(onError.mock.calls[0][0].cause).toBe('InvalidImage');
    });

    it('19.4 onerror without tryout sets error state with node', () => {
      const { node, mock } = makeNode();
      const onError = vi.fn();
      const imageNode = new Konva.Group({ id: 'test-image' });
      const setErrorStateSpy = vi.spyOn(getPrivateNode(node), 'setErrorState').mockImplementation(() => {});
      mock.getStage().findOne.mockReturnValue(imageNode);

      node.preloadImage('test-image', 'http://example.com/image.jpg', {
        onLoad: vi.fn(),
        onError,
      });
      getPrivateNode(node).imageSource['test-image'].onerror?.(
        new Event('error')
      );

      expect(setErrorStateSpy).toHaveBeenCalledWith('test-image', imageNode);
      expect(onError).toHaveBeenCalled();
    });

    it('19.5 onerror with tryout only calls onError', () => {
      const { node } = makeNode();
      const onError = vi.fn();
      const setErrorStateSpy = vi.spyOn(getPrivateNode(node), 'setErrorState').mockImplementation(() => {});

      node.preloadImage(
        'test-image',
        'http://example.com/image.jpg',
        {
          onLoad: vi.fn(),
          onError,
        },
        true
      );
      getPrivateNode(node).imageSource['test-image'].onerror?.(
        new Event('error')
      );

      expect(onError).toHaveBeenCalled();
      expect(setErrorStateSpy).not.toHaveBeenCalled();
    });

    it('19.6 applies crossOrigin from config', () => {
      const { node } = makeNode({ crossOrigin: 'use-credentials' });
      node.preloadImage('test-image', 'http://example.com/image.jpg', {
        onLoad: vi.fn(),
        onError: vi.fn(),
      });

      expect(getPrivateNode(node).imageSource['test-image'].crossOrigin).toBe('use-credentials');
    });
  });

  describe('20 — preloadFallbackImage', () => {
    it('20.1 onload width>0 sets loaded=true and status=loading', () => {
      const { node } = makeNode();
      const onLoad = vi.fn();

      node.preloadFallbackImage('test-image', 'fallback', {
        onLoad,
        onError: vi.fn(),
      });
      getPrivateNode(node).imageFallback['test-image'].onload?.(
        new Event('load')
      );

      expect(getPrivateNode(node).imageState['test-image']).toEqual({
        status: 'loading',
        loaded: true,
        error: false,
      });
      expect(onLoad).toHaveBeenCalled();
    });

    it('20.2 onload width=0 sets error-fallback', () => {
      const { node } = makeNode();
      const onError = vi.fn();

      node.preloadFallbackImage('test-image', 'fallback', {
        onLoad: vi.fn(),
        onError,
      });
      getPrivateNode(node).imageFallback['test-image'].width = 0;
      getPrivateNode(node).imageFallback['test-image'].onload?.(
        new Event('load')
      );

      expect(getPrivateNode(node).imageState['test-image']).toEqual({
        status: 'error-fallback',
        loaded: false,
        error: true,
      });
      expect(onError.mock.calls[0][0].cause).toBe('InvalidFallbackImage');
    });

    it('20.3 onerror sets error-fallback', () => {
      const { node } = makeNode();
      const onError = vi.fn();

      node.preloadFallbackImage('test-image', 'fallback', {
        onLoad: vi.fn(),
        onError,
      });
      getPrivateNode(node).imageFallback['test-image'].onerror?.(new Event('error'));

      expect(getPrivateNode(node).imageState['test-image']).toEqual({
        status: 'error-fallback',
        loaded: false,
        error: true,
      });
      expect(onError.mock.calls[0][0].cause).toBe('ErrorLoadingFallbackImage');
    });
  });

  describe('21 — loadImage', () => {
    it('21.1 without fallback calls preloadImage with main URL', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      const preloadSpy = vi.spyOn(node, 'preloadImage').mockImplementation(() => {});
      const { group } = createRenderableGroup();

      privateNode.loadImage(defaultProps(), group, false, false);

      expect(preloadSpy).toHaveBeenCalledWith(
        'test-image',
        'http://example.com/image.jpg',
        expect.any(Object),
        false
      );
    });

    it('21.2 urlTransformer transforms URL', () => {
      const urlTransformer = vi.fn().mockReturnValue('http://example.com/transformed.jpg');
      const { node } = makeNode({ urlTransformer });
      const privateNode = getPrivateNode(node);
      const preloadSpy = vi.spyOn(node, 'preloadImage').mockImplementation(() => {});
      const { group } = createRenderableGroup();

      privateNode.loadImage(defaultProps(), group, false, false);

      expect(preloadSpy).toHaveBeenCalledWith(
        'test-image',
        'http://example.com/transformed.jpg',
        expect.any(Object),
        false
      );
    });

    it('21.3 loadFallback=true with imageFallback.enabled=false calls preloadImage (not preloadFallbackImage)', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      const fallbackSpy = vi.spyOn(node, 'preloadFallbackImage').mockImplementation(() => {});
      const preloadSpy = vi.spyOn(node, 'preloadImage').mockImplementation(() => {});
      const { group } = createRenderableGroup();

      privateNode.loadImage(
        defaultProps({ imageFallback: 'fallback-image' }),
        group,
        true,
        false
      );

      // imageFallback.enabled=false → preloadFallbackImage NOT called; preloadImage IS called
      expect(fallbackSpy).not.toHaveBeenCalled();
      expect(preloadSpy).toHaveBeenCalled();
    });

    it('21.4 onLoad without fallback shows internal image', () => {
      const { node } = makeNode();
      const { group, internalImage } = createRenderableGroup();
      const preloadSpy = vi.spyOn(node, 'preloadImage').mockImplementation((id, _url, handlers) => {
        getPrivateNode(node).imageSource[id] = makeMockImageElement() as unknown as HTMLImageElement;
        handlers.onLoad();
      });

      getPrivateNode(node).loadImage(defaultProps(), group, false, false);

      expect(preloadSpy).toHaveBeenCalled();
      expect(internalImage.image()).toBe(getPrivateNode(node).imageSource['test-image']);
      expect(internalImage.isVisible()).toBe(true);
    });

    it('21.5 onLoad with useFallback=true schedules retry via preloadImage', () => {
      vi.useFakeTimers();
      const { node } = makeNode();
      const { group } = createRenderableGroup();
      vi.spyOn(node, 'preloadImage').mockImplementation((id, _url, handlers) => {
        getPrivateNode(node).imageFallback[id] = makeMockImageElement() as unknown as HTMLImageElement;
        getPrivateNode(node).imageSource[id] = makeMockImageElement() as unknown as HTMLImageElement;
        handlers.onLoad();
      });
      const stageNode = new Konva.Group(defaultProps());
      getPrivateNode(node).imageTryoutAttempts = {};
      getPrivateNode(node).imageSource['test-image'] = makeMockImageElement() as unknown as HTMLImageElement;
      (node as unknown as { instance: MockInstance }).instance.getStage().findOne.mockReturnValue(stageNode);

      getPrivateNode(node).loadImage(defaultProps({ imageFallback: 'fallback-image' }), group, true, false);

      expect(getPrivateNode(node).imageTryoutIds['test-image']).toBeDefined();
    });

    it('21.6 onError without fallback and below retry max schedules tryout', () => {
      const { node } = makeNode({ useFallbackImage: false });
      const privateNode = getPrivateNode(node);
      const loadImageTryoutSpy = vi.spyOn(privateNode, 'loadImageTryout').mockImplementation(() => {});
      vi.spyOn(node, 'preloadImage').mockImplementation((_id, _url, handlers) => {
        handlers.onError(new Error('fail', { cause: 'ErrorLoadingImage' }));
      });
      const { group } = createRenderableGroup();
      privateNode.imageTryoutAttempts['test-image'] = 0;

      privateNode.loadImage(defaultProps(), group, false, false);

      expect(loadImageTryoutSpy).toHaveBeenCalledWith('test-image');
    });

    it('21.7 onError without fallback and max retries sets error state', () => {
      const { node } = makeNode({ useFallbackImage: false, imageLoading: { maxRetryAttempts: 1, retryDelayMs: 100 } });
      const privateNode = getPrivateNode(node);
      const setErrorStateSpy = vi.spyOn(privateNode, 'setErrorState').mockImplementation(() => {});
      vi.spyOn(node, 'preloadImage').mockImplementation((_id, _url, handlers) => {
        handlers.onError(new Error('fail', { cause: 'ErrorLoadingImage' }));
      });
      const { group } = createRenderableGroup();
      privateNode.imageTryoutAttempts['test-image'] = 2;

      privateNode.loadImage(defaultProps(), group, false, false);

      expect(setErrorStateSpy).toHaveBeenCalledWith('test-image', group);
    });

    it('21.8 onError without imageFallback.enabled sets error state (no recursion)', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      const loadImageSpy = vi.spyOn(privateNode, 'loadImage');
      const setErrorStateSpy = vi.spyOn(privateNode, 'setErrorState').mockImplementation(() => {});
      vi.spyOn(node, 'preloadImage').mockImplementation((_id, _url, handlers) => {
        handlers.onError(new Error('fail', { cause: 'ErrorLoadingImage' }));
      });
      const { group } = createRenderableGroup();
      const props = defaultProps({ imageFallback: 'fallback-image' });
      privateNode.imageTryoutAttempts['test-image'] = 99; // exhaust retries

      privateNode.loadImage(props, group, false, false);

      // imageFallback.enabled=false → no recursive loadImage with fallback; setErrorState called instead
      expect(loadImageSpy).toHaveBeenCalledTimes(1);
      expect(setErrorStateSpy).toHaveBeenCalled();
    });

    it('21.9 onError during tryout below max schedules another tryout', () => {
      const { node } = makeNode({ imageLoading: { maxRetryAttempts: 3, retryDelayMs: 100 } });
      const privateNode = getPrivateNode(node);
      const loadImageTryoutSpy = vi.spyOn(privateNode, 'loadImageTryout').mockImplementation(() => {});
      vi.spyOn(node, 'preloadImage').mockImplementation((_id, _url, handlers) => {
        handlers.onError(new Error('fail', { cause: 'ErrorLoadingImage' }));
      });
      const { group } = createRenderableGroup();
      privateNode.imageTryoutAttempts['test-image'] = 1;

      privateNode.loadImage(defaultProps(), group, false, true);

      expect(loadImageTryoutSpy).toHaveBeenCalledWith('test-image');
    });
  });

  describe('22 — setErrorState', () => {
    it('22.1 after onerror sets error state and resolves async element', () => {
      const { node, mock } = makeNode();
      const imageNode = new Konva.Group({ id: 'test-image' });
      mock.getStage().findOne.mockReturnValue(imageNode);

      node.preloadImage('test-image', 'http://example.com/image.jpg', {
        onLoad: vi.fn(),
        onError: vi.fn(),
      });
      getPrivateNode(node).imageSource['test-image'].onerror?.(
        new Event('error')
      );

      expect(getPrivateNode(node).imageState['test-image']).toEqual({
        status: 'loaded',
        loaded: true,
        error: true,
      });
      expect((node as unknown as { instance: MockInstance }).instance.resolveAsyncElement).toHaveBeenCalledWith(
        'test-image',
        'image'
      );
    });

    it('22.2 with image argument caches node', () => {
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      const { group } = createRenderableGroup();
      const cacheSpy = vi.spyOn(node, 'cacheNode').mockImplementation(() => {});

      privateNode.setErrorState('test-image', group);

      expect(cacheSpy).toHaveBeenCalledWith(group);
    });
  });

  describe('23 — clearCache + cacheNode', () => {
    it('23.1 clearCache does nothing when cache disabled', () => {
      const { node } = makeNode();
      const instance = { clearCache: vi.fn(), cache: vi.fn() } as unknown as Konva.Group;

      node.clearCache(instance);

      expect((instance as unknown as { clearCache: ReturnType<typeof vi.fn> }).clearCache).not.toHaveBeenCalled();
    });

    it('23.2 clearCache calls clearCache when enabled', () => {
      const { node } = makeNode({ performance: { cache: { enabled: true, pixelRatio: 2 } } as WeaveImageProperties['performance'] });
      const instance = { clearCache: vi.fn(), cache: vi.fn() } as unknown as Konva.Group;

      node.clearCache(instance);

      expect((instance as unknown as { clearCache: ReturnType<typeof vi.fn> }).clearCache).toHaveBeenCalled();
    });

    it('23.3 cacheNode does nothing when cache disabled', () => {
      const { node } = makeNode();
      const instance = { clearCache: vi.fn(), cache: vi.fn() } as unknown as Konva.Group;

      node.cacheNode(instance);

      expect((instance as unknown as { cache: ReturnType<typeof vi.fn> }).cache).not.toHaveBeenCalled();
    });

    it('23.4 cacheNode clears then caches with pixelRatio', () => {
      const { node } = makeNode({ performance: { cache: { enabled: true, pixelRatio: 2 } } as WeaveImageProperties['performance'] });
      const instance = { clearCache: vi.fn(), cache: vi.fn() } as unknown as Konva.Group;

      node.cacheNode(instance);

      expect((instance as unknown as { clearCache: ReturnType<typeof vi.fn> }).clearCache).toHaveBeenCalled();
      expect((instance as unknown as { cache: ReturnType<typeof vi.fn> }).cache).toHaveBeenCalledWith({ pixelRatio: 2 });
    });
  });

  describe('24 — scaleReset', () => {
    it('24.1 resets node scale and scales width/height', () => {
      const { node } = makeNode();
      const { group } = createRenderableGroup();
      group.width(100);
      group.height(50);
      group.scale({ x: 2, y: 2 });

      node.scaleReset(group);

      expect(group.width()).toBe(200);
      expect(group.height()).toBe(100);
      expect(group.scale()).toEqual({ x: 1, y: 1 });
    });

    it('24.2 updates uncroppedImage using scale', () => {
      const { node } = makeNode();
      const { group } = createRenderableGroup({ uncroppedImage: { width: 100, height: 50 } });
      group.scale({ x: 2, y: 2 });

      node.scaleReset(group);

      expect(group.getAttrs().uncroppedImage).toEqual({ width: 200, height: 100 });
    });

    it('24.3 resets child dimensions and scales', () => {
      const { node } = makeNode();
      const { group, placeholder, internalImage, cropGroup } = createRenderableGroup();
      placeholder.width(20);
      placeholder.height(30);
      placeholder.scale({ x: 2, y: 2 });
      internalImage.width(25);
      internalImage.height(35);
      internalImage.scale({ x: 2, y: 2 });
      cropGroup.width(40);
      cropGroup.height(50);
      cropGroup.scale({ x: 2, y: 2 });

      node.scaleReset(group);

      expect(placeholder.width()).toBe(40);
      expect(placeholder.scale()).toEqual({ x: 1, y: 1 });
      expect(internalImage.width()).toBe(50);
      expect(internalImage.scale()).toEqual({ x: 1, y: 1 });
      expect(cropGroup.width()).toBe(80);
      expect(cropGroup.scale()).toEqual({ x: 1, y: 1 });
    });

    it('24.4 clamps width to minimum 5', () => {
      const { node } = makeNode();
      const { group } = createRenderableGroup();
      group.width(2);
      group.scale({ x: 2, y: 2 });

      node.scaleReset(group);

      expect(group.width()).toBe(5);
    });
  });

  describe('25 — getters', () => {
    it('25.1 getImageSource returns image source', () => {
      const { node } = makeNode();
      const source = makeMockImageElement() as unknown as HTMLImageElement;
      getPrivateNode(node).imageSource.id = source;
      expect(node.getImageSource('id')).toBe(source);
    });

    it('25.2 getFallbackImageSource returns fallback source', () => {
      const { node } = makeNode();
      const source = makeMockImageElement() as unknown as HTMLImageElement;
      getPrivateNode(node).imageFallback.id = source;
      expect(node.getFallbackImageSource('id')).toBe(source);
    });
  });

  describe('26 — loadAsyncElement / resolveAsyncElement', () => {
    it('26.1 loadAsyncElement delegates to instance', () => {
      const { node, mock } = makeNode();
      node.loadAsyncElement('id');
      expect(mock.loadAsyncElement).toHaveBeenCalledWith('id', 'image');
    });

    it('26.2 resolveAsyncElement delegates to instance', () => {
      const { node, mock } = makeNode();
      node.resolveAsyncElement('id');
      expect(mock.resolveAsyncElement).toHaveBeenCalledWith('id', 'image');
    });
  });

  describe('27 — forceLoadImage', () => {
    it('27.1 clears tryout timer and loads image when node exists', () => {
      vi.useFakeTimers();
      const { node, mock } = makeNode();
      const privateNode = getPrivateNode(node);
      const group = new Konva.Group(defaultProps());
      const timeoutId = setTimeout(() => {}, 1000);
      privateNode.imageTryoutIds.id = timeoutId;
      mock.getStage().findOne.mockReturnValue(group);
      const loadImageSpy = vi.spyOn(privateNode, 'loadImage').mockImplementation(() => {});

      node.forceLoadImage({ getAttrs: () => ({ id: 'id' }) } as unknown as Konva.Group);

      expect(privateNode.imageTryoutIds.id).toBeUndefined();
      expect(loadImageSpy).toHaveBeenCalled();
    });

    it('27.2 does nothing when node is missing', () => {
      const { node, mock } = makeNode();
      const privateNode = getPrivateNode(node);
      const loadImageSpy = vi.spyOn(privateNode, 'loadImage').mockImplementation(() => {});
      mock.getStage().findOne.mockReturnValue(null);

      node.forceLoadImage({ getAttrs: () => ({ id: 'id' }) } as unknown as Konva.Group);

      expect(loadImageSpy).not.toHaveBeenCalled();
    });
  });

  describe('28 — onDestroy', () => {
    it('28.1 destroys cropMode utility nodes', () => {
      const { node, mock } = makeNode();
      const cropNode = { destroy: vi.fn() };
      mock.getUtilityLayer().find.mockReturnValue([cropNode]);
      const nodeInstance = { getAttrs: () => ({ id: 'test-image' }), destroy: vi.fn() };

      node.onDestroy(nodeInstance as unknown as Konva.Group);

      expect(cropNode.destroy).toHaveBeenCalled();
    });

    it('28.2 clears pending retry timeout', () => {
      vi.useFakeTimers();
      const { node } = makeNode();
      const privateNode = getPrivateNode(node);
      privateNode.imageTryoutIds['test-image'] = setTimeout(() => {}, 1000);
      const nodeInstance = { getAttrs: () => ({ id: 'test-image' }), destroy: vi.fn() };

      node.onDestroy(nodeInstance as unknown as Konva.Group);

      expect(privateNode.imageTryoutIds['test-image']).toBeUndefined();
    });

    it('28.3 destroys node instance', () => {
      const { node } = makeNode();
      const nodeInstance = { getAttrs: () => ({ id: 'test-image' }), destroy: vi.fn() };

      node.onDestroy(nodeInstance as unknown as Konva.Group);

      expect(nodeInstance.destroy).toHaveBeenCalled();
    });
  });

  describe('29 — loadImageTryout', () => {
    it('29.1 schedules retry and loads image again after delay', () => {
      vi.useFakeTimers();
      const { node, mock } = makeNode({ imageLoading: { maxRetryAttempts: 3, retryDelayMs: 100 } });
      const privateNode = getPrivateNode(node);
      const { group } = createRenderableGroup();
      mock.getStage().findOne.mockReturnValue(group);
      const loadImageSpy = vi.spyOn(privateNode, 'loadImage').mockImplementation(() => {});

      privateNode.loadImageTryout('test-image');

      expect(privateNode.imageTryoutIds['test-image']).toBeDefined();
      vi.advanceTimersByTime(100);
      expect(loadImageSpy).toHaveBeenCalledWith(group.getAttrs(), group, false, true);
    });
  });

  describe('30 — setupNotUsedImagesCleanup', () => {
    it('30.1 schedules cleanup only once per idle period (guard prevents double-scheduling)', () => {
      vi.useFakeTimers();
      setupCleanupSpy.mockRestore();
      const { node } = makeNode();
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

      getPrivateNode(node).setupNotUsedImagesCleanup();
      getPrivateNode(node).setupNotUsedImagesCleanup();

      // Second call is a no-op because notUsedImagesCleanup is already set
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    });

    it('30.2 removes stale entries after timer fires', () => {
      vi.useFakeTimers();
      setupCleanupSpy.mockRestore();
      const { node, mock } = makeNode({ cleanup: { intervalMs: 100 } });
      const privateNode = getPrivateNode(node);
      privateNode.imageSource.stale = makeMockImageElement() as unknown as HTMLImageElement;
      privateNode.imageState.stale = { status: 'loaded', loaded: true, error: false };
      privateNode.imageTryoutAttempts.stale = 1;
      privateNode.imageFallback.stale = makeMockImageElement() as unknown as HTMLImageElement;
      mock.getStage().findOne.mockReturnValue(null);

      privateNode.setupNotUsedImagesCleanup();
      vi.advanceTimersByTime(100);

      expect(privateNode.imageSource.stale).toBeUndefined();
      expect(privateNode.imageState.stale).toBeUndefined();
      expect(privateNode.imageTryoutAttempts.stale).toBeUndefined();
      expect(privateNode.imageFallback.stale).toBeUndefined();
    });

    it('30.3 keeps live entries after timer fires', () => {
      vi.useFakeTimers();
      setupCleanupSpy.mockRestore();
      const { node, mock } = makeNode({ cleanup: { intervalMs: 100 } });
      const privateNode = getPrivateNode(node);
      privateNode.imageSource.live = makeMockImageElement() as unknown as HTMLImageElement;
      privateNode.imageState.live = { status: 'loaded', loaded: true, error: false };
      privateNode.imageTryoutAttempts.live = 1;
      privateNode.imageFallback.live = makeMockImageElement() as unknown as HTMLImageElement;
      mock.getStage().findOne.mockReturnValue(new Konva.Group({ id: 'live' }));

      privateNode.setupNotUsedImagesCleanup();
      vi.advanceTimersByTime(100);

      expect(privateNode.imageSource.live).toBeDefined();
      expect(privateNode.imageState.live).toBeDefined();
      expect(privateNode.imageTryoutAttempts.live).toBeDefined();
      expect(privateNode.imageFallback.live).toBeDefined();
    });

    it('30.4 reschedules after timer fires', () => {
      vi.useFakeTimers();
      setupCleanupSpy.mockRestore();
      const { node } = makeNode({ cleanup: { intervalMs: 100 } });
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

      getPrivateNode(node).setupNotUsedImagesCleanup();
      vi.advanceTimersByTime(100);

      expect(setTimeoutSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('31 — triggerCrop', () => {
    it('31.1 returns early when crop mode disabled', () => {
      const { node, mock } = makeNode({ cropMode: { enabled: false } as WeaveImageProperties['cropMode'] });
      const imageNode = new Konva.Group({ id: 'test-image', cropping: false });

      node.triggerCrop(imageNode, { cmdCtrl: { triggered: false } });

      expect(mock.getStage().mode).not.toHaveBeenCalled();
    });

    it('31.2 returns early when already cropping', () => {
      const { node, mock } = makeNode();
      const imageNode = new Konva.Group({ id: 'test-image', cropping: true });

      node.triggerCrop(imageNode, { cmdCtrl: { triggered: false } });

      expect(mock.getStage().mode).not.toHaveBeenCalled();
    });

    it('31.3 returns early when node is not selected', () => {
      const { node, mock } = makeNode();
      mock.getActiveAction.mockReturnValue(undefined);
      const imageNode = new Konva.Group({ id: 'test-image', cropping: false });

      node.triggerCrop(imageNode, { cmdCtrl: { triggered: false } });

      expect(mock.getStage().mode).not.toHaveBeenCalled();
    });

    it('31.4 returns early when mutex lock is not acquired', () => {
      const { node, mock } = makeNode();
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      mock.setMutexLock.mockReturnValue(false);
      const imageNode = new Konva.Group({ id: 'test-image', cropping: false });
      getSelectionPlugin(mock).getSelectedNodes.mockReturnValue([imageNode]);

      node.triggerCrop(imageNode, { cmdCtrl: { triggered: false } });

      expect(mock.getStage().mode).not.toHaveBeenCalled();
    });

    it('31.5 success enters cropping mode and emits start event', () => {
      const { node, mock } = makeNode();
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      const imageNode = new Konva.Group({ id: 'test-image', cropping: false });
      const internalImage = new Konva.Image({ id: 'test-image-image' } as Konva.ImageConfig);
      const cropGroup = new Konva.Group({ id: 'test-image-cropGroup' });
      imageNode.add(internalImage);
      imageNode.add(cropGroup);
      getSelectionPlugin(mock).getSelectedNodes.mockReturnValue([imageNode]);
      mock.getStage().findOne.mockReturnValue(imageNode);
      vi.spyOn(WeaveImageCrop.prototype, 'show').mockImplementation(() => {});

      node.triggerCrop(imageNode, { cmdCtrl: { triggered: false } });

      expect(mock.getStage().mode).toHaveBeenCalledWith(WEAVE_STAGE_IMAGE_CROPPING_MODE);
      expect(getPrivateNode(node).imageCrop).toBeInstanceOf(WeaveImageCrop);
      expect(mock.emitEvent).toHaveBeenCalledWith('onImageCropStart', {
        instance: imageNode,
        cmdCtrlTriggered: false,
      });
    });
  });

  describe('32 — closeCrop', () => {
    it('32.1 returns early when crop mode disabled', () => {
      const { node, mock } = makeNode({ cropMode: { enabled: false } as WeaveImageProperties['cropMode'] });
      node.closeCrop(new Konva.Group({ id: 'test-image' }), WEAVE_IMAGE_CROP_END_TYPE.ACCEPT);
      expect(mock.getStage().mode).not.toHaveBeenCalled();
    });

    it('32.2 returns early when imageCrop is null', () => {
      const { node, mock } = makeNode();
      node.closeCrop(new Konva.Group({ id: 'test-image' }), WEAVE_IMAGE_CROP_END_TYPE.ACCEPT);
      expect(mock.getStage().mode).not.toHaveBeenCalled();
    });

    it('32.3 accept calls accept and emits end event', () => {
      const { node, mock } = makeNode();
      const imageNode = new Konva.Group({ id: 'test-image' });
      getPrivateNode(node).imageCrop = {
        accept: vi.fn(),
        cancel: vi.fn(),
      } as unknown as WeaveImageCrop;

      node.closeCrop(imageNode, WEAVE_IMAGE_CROP_END_TYPE.ACCEPT);

      expect(mock.getStage().mode).toHaveBeenCalledWith(WEAVE_STAGE_DEFAULT_MODE);
      expect((getPrivateNode(node).imageCrop as unknown as { accept: ReturnType<typeof vi.fn> }).accept).toHaveBeenCalled();
      expect(mock.emitEvent).toHaveBeenCalledWith('onImageCropEnd', { instance: imageNode });
    });

    it('32.4 cancel calls cancel and emits end event', () => {
      const { node, mock } = makeNode();
      const imageNode = new Konva.Group({ id: 'test-image' });
      getPrivateNode(node).imageCrop = {
        accept: vi.fn(),
        cancel: vi.fn(),
      } as unknown as WeaveImageCrop;

      node.closeCrop(imageNode, WEAVE_IMAGE_CROP_END_TYPE.CANCEL);

      expect(mock.getStage().mode).toHaveBeenCalledWith(WEAVE_STAGE_DEFAULT_MODE);
      expect((getPrivateNode(node).imageCrop as unknown as { cancel: ReturnType<typeof vi.fn> }).cancel).toHaveBeenCalled();
      expect(mock.emitEvent).toHaveBeenCalledWith('onImageCropEnd', { instance: imageNode });
    });
  });

  describe('33 — resetCrop', () => {
    it('33.1 returns early when crop mode disabled', () => {
      const { node } = makeNode({ cropMode: { enabled: false } as WeaveImageProperties['cropMode'] });
      expect(() => node.resetCrop(new Konva.Group({ id: 'test-image' }))).not.toThrow();
    });

    it('33.2 returns early when internal image is missing', () => {
      const { node } = makeNode();
      expect(() => node.resetCrop(new Konva.Group({ id: 'test-image' }))).not.toThrow();
    });

    it('33.3 creates crop instance and calls unCrop', () => {
      const { node } = makeNode();
      const imageNode = new Konva.Group({ id: 'test-image' });
      imageNode.add(
        new Konva.Image({ id: 'test-image-image' } as Konva.ImageConfig)
      );
      imageNode.add(new Konva.Group({ id: 'test-image-cropGroup' }));
      const unCropSpy = vi.spyOn(WeaveImageCrop.prototype, 'unCrop').mockImplementation(() => {});

      node.resetCrop(imageNode);

      expect(unCropSpy).toHaveBeenCalled();
    });
  });

  describe('34 — cropImageWithReference', () => {
    it('34.1 throws InvalidImageNode when internal image is missing', () => {
      const { node } = makeNode();
      const imageNode = new Konva.Group({ id: 'test-image' });
      const reference = new Konva.Rect({ id: 'ref-1', nodeType: 'rect' });

      expect(() => node.cropImageWithReference(imageNode, reference)).toThrowError(
        expect.objectContaining({ cause: 'InvalidImageNode' })
      );
    });

    it('34.2 success runs stateTransactional once', () => {
      const { node, mock } = makeNode();
      const imageNode = new Konva.Group({ id: 'test-image' });
      imageNode.add(
        new Konva.Image({ id: 'test-image-image' } as Konva.ImageConfig)
      );
      imageNode.add(new Konva.Group({ id: 'test-image-cropGroup' }));
      const reference = new Konva.Rect({ id: 'ref-1', nodeType: 'rect' });
      vi.spyOn(WeaveImageCrop.prototype, 'handleClipExternal').mockImplementation(() => {});

      node.cropImageWithReference(imageNode, reference);

      expect(mock.stateTransactional).toHaveBeenCalledTimes(1);
      expect(mock.emitEvent).not.toHaveBeenCalled();
    });

    it('34.3 calls removeNodeNT when nodeHandler is found', () => {
      const { node, mock } = makeNode();
      const imageNode = new Konva.Group({ id: 'test-image' });
      imageNode.add(new Konva.Image({ id: 'test-image-image' } as Konva.ImageConfig));
      imageNode.add(new Konva.Group({ id: 'test-image-cropGroup' }));
      const reference = new Konva.Rect({ id: 'ref-1', nodeType: 'rect' });
      const fakeState = { id: 'ref-1' };
      mock.getNodeHandler.mockReturnValue({ serialize: vi.fn().mockReturnValue(fakeState) });
      vi.spyOn(WeaveImageCrop.prototype, 'handleClipExternal').mockImplementation(() => {});

      node.cropImageWithReference(imageNode, reference);

      expect(mock.removeNodeNT).toHaveBeenCalledWith(fakeState);
    });
  });

  describe('35 — imageFallback methods', () => {
    function makeFallbackNode() {
      return makeNode({
        imageFallback: {
          enabled: true,
          getId: vi.fn().mockImplementation((params: Record<string, unknown>) => `fallback-${params['id'] ?? 'x'}`),
          getDataURL: vi.fn().mockReturnValue('data:image/png;base64,fetched'),
          onPersist: vi.fn(),
        } as WeaveImageProperties['imageFallback'],
      });
    }

    it('35.1 getImageFallbackId returns id when enabled', () => {
      const { node } = makeFallbackNode();
      const result = node.getImageFallbackId({ id: 'img-1' });
      expect(result).toBe('fallback-img-1');
    });

    it('35.2 getImageFallbackId returns undefined when disabled', () => {
      const { node } = makeNode();
      const result = node.getImageFallbackId({ id: 'img-1' });
      expect(result).toBeUndefined();
    });

    it('35.3 saveImageFallback calls onPersist when enabled', () => {
      const { node } = makeFallbackNode();
      const priv = getPrivateNode(node);
      node.saveImageFallback({ id: 'img-1' }, 'data:image/png;base64,abc');
      expect(priv.config.imageFallback.onPersist).toHaveBeenCalledWith(
        { id: 'img-1' },
        'data:image/png;base64,abc'
      );
    });

    it('35.4 saveImageFallback does nothing when disabled', () => {
      const { node } = makeNode();
      expect(() => node.saveImageFallback({ id: 'img-1' }, 'data:abc')).not.toThrow();
    });

    it('35.5 cacheImageFallbackURL stores provided dataURL', () => {
      const { node } = makeFallbackNode();
      node.cacheImageFallbackURL({ id: 'img-1' }, 'data:image/png;base64,provided');
      const priv = getPrivateNode(node) as unknown as { imageFallbackURL: Record<string, string> };
      expect(priv.imageFallbackURL['fallback-img-1']).toBe('data:image/png;base64,provided');
    });

    it('35.6 cacheImageFallbackURL fetches via getDataURL when no dataURL given', () => {
      const { node } = makeFallbackNode();
      node.cacheImageFallbackURL({ id: 'img-1' });
      const priv = getPrivateNode(node) as unknown as { imageFallbackURL: Record<string, string> };
      expect(priv.imageFallbackURL['fallback-img-1']).toBe('data:image/png;base64,fetched');
    });

    it('35.7 cacheImageFallbackURL does nothing when disabled', () => {
      const { node } = makeNode();
      expect(() => node.cacheImageFallbackURL({ id: 'img-1' }, 'data:abc')).not.toThrow();
    });
  });

  describe('36 — getter helpers', () => {
    it('36.1 isImageFallbackEnabled returns false by default', () => {
      const { node } = makeNode();
      expect(node.isImageFallbackEnabled()).toBe(false);
    });

    it('36.2 isImageFallbackEnabled returns true when configured', () => {
      const { node } = makeNode({
        imageFallback: {
          enabled: true,
          getId: vi.fn(),
          getDataURL: vi.fn(),
          onPersist: vi.fn(),
        } as WeaveImageProperties['imageFallback'],
      });
      expect(node.isImageFallbackEnabled()).toBe(true);
    });

    it('36.3 getFallbackImageSource returns stored fallback element', () => {
      const { node } = makeNode();
      const priv = getPrivateNode(node);
      const img = makeMockImageElement() as unknown as HTMLImageElement;
      priv.imageFallback['abc'] = img;
      expect(node.getFallbackImageSource('abc')).toBe(img);
    });

    it('36.4 getFallbackImageSourceURL returns stored fallback URL', () => {
      const { node } = makeNode();
      const priv = getPrivateNode(node) as unknown as { imageFallbackURL: Record<string, string> };
      priv.imageFallbackURL['abc'] = 'data:image/png;base64,xyz';
      expect(node.getFallbackImageSourceURL('abc')).toBe('data:image/png;base64,xyz');
    });

    it('36.5 getImageSource returns stored image element', () => {
      const { node } = makeNode();
      const priv = getPrivateNode(node);
      const img = makeMockImageElement() as unknown as HTMLImageElement;
      priv.imageSource['abc'] = img;
      expect(node.getImageSource('abc')).toBe(img);
    });
  });

  describe('37 — forceLoadFallbackImage', () => {
    it('37.1 calls loadImage with useFallback=true when node found', () => {
      const { node, mock } = makeNode();
      const priv = getPrivateNode(node);
      const imageNode = new Konva.Group({ id: 'test-image' });
      mock.getStage().findOne.mockReturnValue(imageNode);
      const loadSpy = vi.spyOn(priv, 'loadImage').mockImplementation(() => {});

      node.forceLoadFallbackImage(imageNode, 'data:image/png;base64,fallback');

      expect(loadSpy).toHaveBeenCalledWith(
        expect.anything(),
        imageNode,
        true
      );
    });

    it('37.2 does not call loadImage when node not found', () => {
      const { node, mock } = makeNode();
      const priv = getPrivateNode(node);
      mock.getStage().findOne.mockReturnValue(null);
      const loadSpy = vi.spyOn(priv, 'loadImage').mockImplementation(() => {});
      const nodeInstance = new Konva.Group({ id: 'missing-node' });

      node.forceLoadFallbackImage(nodeInstance, 'data:image/png;base64,x');

      expect(loadSpy).not.toHaveBeenCalled();
    });
  });

  describe('38 — onRender: group crop callbacks', () => {
    it('38.1 group.triggerCrop() calls node.triggerCrop', () => {
      const { node, mock } = makeNode();
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      const group = node.onRender(defaultProps()) as Konva.Group;
      getSelectionPlugin(mock).getSelectedNodes.mockReturnValue([group]);
      const triggerCropSpy = vi.spyOn(node, 'triggerCrop').mockImplementation(() => {});

      group.triggerCrop?.();

      expect(triggerCropSpy).toHaveBeenCalledWith(group, { cmdCtrl: { triggered: false } });
    });

    it('38.2 group.closeCrop() calls node.closeCrop', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const closeCropSpy = vi.spyOn(node, 'closeCrop').mockImplementation(() => {});

      group.closeCrop?.(WEAVE_IMAGE_CROP_END_TYPE.CANCEL);

      expect(closeCropSpy).toHaveBeenCalledWith(group, WEAVE_IMAGE_CROP_END_TYPE.CANCEL);
    });

    it('38.3 group.resetCrop() returns early when stage.findOne returns null', () => {
      const { node, mock } = makeNode();
      mock.getStage().findOne.mockReturnValue(null);
      const group = node.onRender(defaultProps()) as Konva.Group;

      expect(() => group.resetCrop?.()).not.toThrow();
    });

    it('38.4 group.resetCrop() calls imageCrop.unCrop when image found', () => {
      const { node, mock } = makeNode();
      const { group: imageGroup, internalImage, cropGroup } = createRenderableGroup();
      mock.getStage().findOne.mockReturnValue(imageGroup);
      const unCropSpy = vi.spyOn(WeaveImageCrop.prototype, 'unCrop').mockImplementation(() => {});
      const renderedGroup = node.onRender(defaultProps()) as Konva.Group;

      renderedGroup.resetCrop?.();

      void internalImage;
      void cropGroup;
      expect(unCropSpy).toHaveBeenCalled();
    });
  });

  describe('39 — onRender: nodeDragStart and cmdCtrl early returns', () => {
    it('39.1 nodeDragStart returns early when utilityLayer is null', () => {
      const { node, mock } = makeNode();
      mock.getUtilityLayer.mockReturnValue(null);
      const group = node.onRender(defaultProps()) as Konva.Group;

      expect(() => fireKonvaEvent(group, 'nodeDragStart')).not.toThrow();
    });

    it('39.2 nodeDragStart returns early when transformer is null', () => {
      const { node, mock } = makeNode();
      getSelectionPlugin(mock).getTransformer.mockReturnValue(null);
      const group = node.onRender(defaultProps()) as Konva.Group;

      expect(() => fireKonvaEvent(group, 'nodeDragStart')).not.toThrow();
    });

    it('39.3 onCmdCtrlPressed returns early when utilityLayer is null', () => {
      const { node, mock } = makeNode();
      mock.getUtilityLayer.mockReturnValue(null);
      const group = node.onRender(defaultProps()) as Konva.Group;
      vi.spyOn(group, 'isDragging').mockReturnValue(false);

      expect(() => fireKonvaEvent(group, 'onCmdCtrlPressed')).not.toThrow();
    });

    it('39.4 onCmdCtrlPressed returns early when isDragging', () => {
      const { node, mock } = makeNode();
      const transformer = { hide: vi.fn(), show: vi.fn() };
      getSelectionPlugin(mock).getTransformer.mockReturnValue(transformer);
      const group = node.onRender(defaultProps()) as Konva.Group;
      vi.spyOn(group, 'isDragging').mockReturnValue(true);

      fireKonvaEvent(group, 'onCmdCtrlPressed');

      expect(transformer.hide).not.toHaveBeenCalled();
    });

    it('39.5 onCmdCtrlPressed returns early when transformer is null', () => {
      const { node, mock } = makeNode();
      getSelectionPlugin(mock).getTransformer.mockReturnValue(null);
      const group = node.onRender(defaultProps()) as Konva.Group;
      vi.spyOn(group, 'isDragging').mockReturnValue(false);

      expect(() => fireKonvaEvent(group, 'onCmdCtrlPressed')).not.toThrow();
    });

    it('39.6 onCmdCtrlReleased returns early when utilityLayer is null', () => {
      const { node, mock } = makeNode();
      mock.getUtilityLayer.mockReturnValue(null);
      const group = node.onRender(defaultProps()) as Konva.Group;
      vi.spyOn(group, 'isDragging').mockReturnValue(false);

      expect(() => fireKonvaEvent(group, 'onCmdCtrlReleased')).not.toThrow();
    });

    it('39.7 onCmdCtrlReleased returns early when isDragging', () => {
      const { node, mock } = makeNode();
      const transformer = { hide: vi.fn(), show: vi.fn() };
      getSelectionPlugin(mock).getTransformer.mockReturnValue(transformer);
      const group = node.onRender(defaultProps()) as Konva.Group;
      vi.spyOn(group, 'isDragging').mockReturnValue(true);

      fireKonvaEvent(group, 'onCmdCtrlReleased');

      expect(transformer.show).not.toHaveBeenCalled();
    });

    it('39.8 onCmdCtrlReleased returns early when transformer is null', () => {
      const { node, mock } = makeNode();
      getSelectionPlugin(mock).getTransformer.mockReturnValue(null);
      const group = node.onRender(defaultProps()) as Konva.Group;
      vi.spyOn(group, 'isDragging').mockReturnValue(false);

      expect(() => fireKonvaEvent(group, 'onCmdCtrlReleased')).not.toThrow();
    });
  });

  describe('40 — onUpdate: cropInfo / cropSize / empty imageURL', () => {
    it('40.1 cropInfo truthy branch is applied', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const cropInfo = { x: 0, y: 0, width: 50, height: 50, scaleX: 1 };

      node.onUpdate(group, defaultProps({ cropInfo }));

      expect(group.getAttrs().cropInfo).toEqual(cropInfo);
    });

    it('40.2 cropSize truthy branch is applied', () => {
      const { node } = makeNode();
      const group = node.onRender(defaultProps()) as Konva.Group;
      const cropSize = { width: 50, height: 50 };

      node.onUpdate(group, defaultProps({ cropSize }));

      expect(group.getAttrs().cropSize).toEqual(cropSize);
    });

    it('40.3 empty actualImageURL triggers forceLoadImage', () => {
      const { node, mock } = makeNode();
      const group = node.onRender(defaultProps({ imageURL: '' })) as Konva.Group;
      group.setAttr('imageURL', '');
      const imageNode = new Konva.Group({ id: 'test-image' });
      mock.getStage().findOne.mockReturnValue(imageNode);
      const priv = getPrivateNode(node);
      const loadSpy = vi.spyOn(priv, 'loadImage').mockImplementation(() => {});

      node.onUpdate(group, defaultProps({ imageURL: 'http://example.com/new.jpg' }));

      expect(loadSpy).toHaveBeenCalled();
    });
  });

  describe('41 — triggerCrop: missing image early return and show callback', () => {
    it('41.1 returns early when stage.findOne returns null for image', () => {
      const { node, mock } = makeNode();
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      const imageNode = new Konva.Group({ id: 'test-image', cropping: false });
      getSelectionPlugin(mock).getSelectedNodes.mockReturnValue([imageNode]);
      mock.getStage().findOne.mockReturnValue(null);

      expect(() => node.triggerCrop(imageNode, { cmdCtrl: { triggered: false } })).not.toThrow();
      expect(mock.getStage().mode).toHaveBeenCalledWith(WEAVE_STAGE_IMAGE_CROPPING_MODE);
    });

    it('41.2 show callback covers crop-end branch', () => {
      const { node, mock } = makeNode();
      mock.getActiveAction.mockReturnValue(SELECTION_TOOL_ACTION_NAME);
      const imageNode = new Konva.Group({ id: 'test-image', cropping: false });
      const internalImage = new Konva.Image({ id: 'test-image-image' } as Konva.ImageConfig);
      const cropGroup = new Konva.Group({ id: 'test-image-cropGroup' });
      imageNode.add(internalImage);
      imageNode.add(cropGroup);
      getSelectionPlugin(mock).getSelectedNodes.mockReturnValue([imageNode]);
      mock.getStage().findOne.mockReturnValue(imageNode);
      vi.spyOn(WeaveImageCrop.prototype, 'show').mockImplementation((cb: () => void) => { cb(); });

      node.triggerCrop(imageNode, { cmdCtrl: { triggered: false } });

      expect(mock.emitEvent).toHaveBeenCalledWith('onImageCropEnd', expect.objectContaining({ instance: imageNode }));
    });
  });

  describe('42 — updateNodeState with imageId', () => {
    it('42.1 imageId is included when provided', () => {
      const base = WeaveImageNode.defaultState('test-image');
      const result = WeaveImageNode.updateNodeState(base, defaultProps({ imageId: 'asset-42' }));
      expect((result.props as Record<string, unknown>)['imageId']).toBe('asset-42');
    });

    it('42.2 imageId is omitted when not provided', () => {
      const base = WeaveImageNode.defaultState('test-image');
      const result = WeaveImageNode.updateNodeState(base, defaultProps());
      expect((result.props as Record<string, unknown>)['imageId']).toBeUndefined();
    });
  });
});
