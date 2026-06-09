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
import { WeaveImageCrop } from '../crop';
import { WeaveImageNode } from '../image';
import { WEAVE_IMAGE_CROP_ANCHOR_POSITION } from '../constants';
import { WEAVE_STAGE_DEFAULT_MODE } from '../../stage/constants';
import { augmentKonvaNodeClass } from '../../node';
import type {
  WeaveImageCropAnchorPosition,
  WeaveImageProperties,
  WeaveImageTriggerCropOptions,
} from '../types';

vi.mock('@/weave', () => ({ Weave: class MockWeave {} }));

type MockStage = {
  findOne: ReturnType<typeof vi.fn>;
  mode: ReturnType<typeof vi.fn>;
  container: ReturnType<typeof vi.fn>;
  scaleX: ReturnType<typeof vi.fn>;
  scaleY: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  getPointerPosition: ReturnType<typeof vi.fn>;
};

type MockUtilityLayer = {
  add: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  destroyChildren: ReturnType<typeof vi.fn>;
  show: ReturnType<typeof vi.fn>;
  hide: ReturnType<typeof vi.fn>;
};

type MockInstance = ReturnType<typeof createMockInstance>;

type CropPrivate = {
  cropRect: Konva.Rect;
  cropGroup: Konva.Group;
  grid: Konva.Group;
  cropImage: Konva.Image;
  hide: (event: KeyboardEvent) => void;
  drawGrid: (x: number, y: number, width: number, height: number) => void;
  createSoftSnap: (
    snapTo: number,
    snapDistance?: number
  ) => (value: number) => number;
  getIntersectionRect: (
    a: Konva.Node,
    b: Konva.Node,
    relativeTo?: Konva.Container
  ) => { x: number; y: number; width: number; height: number } | null;
  show: (onClose: () => void, options: WeaveImageTriggerCropOptions) => void;
  accept: () => void;
  cancel: () => void;
  unCrop: () => void;
  handleClipEnd: () => void;
  handleClipExternal: (image: Konva.Group, reference: Konva.Node) => void;
  drawSquarePointer: (
    corner: WeaveImageCropAnchorPosition,
    fixedCorner: Konva.Vector2d,
    limits: { top: number; right: number; bottom: number; left: number }
  ) => void;
};

type ImageNodePrivate = {
  instance: MockInstance;
  logger: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };
  renderCropAnchor: (
    position: WeaveImageCropAnchorPosition,
    node: Konva.Group,
    layer: Konva.Layer,
    onClick: () => void
  ) => Konva.Rect;
  renderCropMode: (layer: Konva.Layer, node: Konva.Group) => void;
};

function createMockInstance() {
  const mockContainer = { style: { cursor: '' } };
  const mockStage: MockStage = {
    findOne: vi.fn().mockReturnValue(null),
    mode: vi.fn(),
    container: vi.fn().mockReturnValue(mockContainer),
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
    on: vi.fn(),
    off: vi.fn(),
    getPointerPosition: vi.fn().mockReturnValue({ x: 50, y: 50 }),
  };
  const mockUtilityLayer: MockUtilityLayer = {
    add: vi.fn(),
    find: vi.fn().mockReturnValue([]),
    destroyChildren: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
  };
  return {
    getStage: vi.fn().mockReturnValue(mockStage),
    getUtilityLayer: vi.fn().mockReturnValue(mockUtilityLayer),
    getPlugin: vi.fn().mockReturnValue(null),
    getEventsController: vi.fn().mockReturnValue({ signal: undefined }),
    isServerSide: vi.fn().mockReturnValue(false),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    emitEvent: vi.fn(),
    releaseMutexLock: vi.fn(),
    updateNode: vi.fn(),
    updateNodeNT: vi.fn(),
    stateTransactional: vi.fn().mockImplementation((fn: () => void) => fn()),
  };
}

function createMockNode() {
  return {
    getConfiguration: vi.fn().mockReturnValue({
      cropMode: {
        enabled: true,
        gridLines: { enabled: true },
        overlay: { fill: 'rgba(0,0,0,0.2)' },
        selection: {
          enabledAnchors: [
            'top-left',
            'top-center',
            'top-right',
            'middle-right',
            'middle-left',
            'bottom-left',
            'bottom-center',
            'bottom-right',
          ],
          borderStroke: '#1a1aff',
          borderStrokeWidth: 2,
          anchorStyleFunc: vi.fn(),
        },
        triggers: { ctrlCmd: true },
      },
    }),
    clearCache: vi.fn(),
    cacheNode: vi.fn(),
    serialize: vi.fn().mockReturnValue({ id: 'test', type: 'image', props: {} }),
    renderCropMode: vi.fn(),
  };
}

function createCrop(options: { withCropInfo?: boolean } = {}) {
  const instance = createMockInstance();
  const node = createMockNode();

  const image = new Konva.Group({
    id: 'test-image',
    width: 200,
    height: 150,
    cropping: false,
  });
  const internalImage = new Konva.Image({
    id: 'test-image-image',
    image: undefined,
    visible: true,
  });
  const cropGroup = new Konva.Group({
    id: 'test-image-cropGroup',
    visible: false,
  });
  image.add(internalImage);
  image.add(cropGroup);

  if (options.withCropInfo) {
    image.setAttrs({
      cropInfo: { x: 10, y: 10, width: 100, height: 80, scaleX: 1, scaleY: 1 },
      cropSize: { x: 0, y: 0, width: 100, height: 80 },
      uncroppedImage: { width: 200, height: 150 },
      imageInfo: { width: 200, height: 150 },
    });
  } else {
    image.setAttrs({
      uncroppedImage: { width: 200, height: 150 },
      imageInfo: { width: 200, height: 150 },
    });
  }

  const crop = new WeaveImageCrop(
    instance as unknown as never,
    node as unknown as never,
    image,
    internalImage,
    cropGroup
  );

  return { crop, instance, node, image, internalImage, cropGroup };
}

function createRealNode(config: Partial<WeaveImageProperties> = {}) {
  const node = new WeaveImageNode({ config });
  const instance = createMockInstance();
  Object.assign(node as unknown as Record<string, unknown>, {
    instance,
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  });
  return { node: node as unknown as ImageNodePrivate, instance };
}

function getCropPrivate(crop: WeaveImageCrop): CropPrivate {
  return crop as unknown as CropPrivate;
}

function fireKonvaEvent(
  node: Konva.Node,
  eventName: string,
  eventData: Record<string, unknown> = {}
) {
  const listeners = (
    node as unknown as {
      eventListeners?: Record<
        string,
        { handler: (...args: unknown[]) => void }[]
      >;
    }
  ).eventListeners?.[eventName] ?? [];

  for (const { handler } of listeners) {
    handler.call(node, { target: node, cancelBubble: false, ...eventData });
  }
}

function mockIdentityTransform(group: Konva.Group) {
  vi.spyOn(group, 'getAbsoluteTransform').mockReturnValue(
    new Konva.Transform()
  );
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
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WeaveImageCrop', () => {
  describe('1 — constructor', () => {
    it('1.1 creates the crop instance', () => {
      const { crop } = createCrop();

      expect(crop).toBeInstanceOf(WeaveImageCrop);
      expect(typeof crop.accept).toBe('function');
    });
  });

  describe('2 — static roundTo6Decimals', () => {
    it('2.1 rounds recurring decimals to 6 places', () => {
      expect(WeaveImageCrop.roundTo6Decimals(1 / 3)).toBe(0.333333);
    });

    it('2.2 keeps integer-like decimals', () => {
      expect(WeaveImageCrop.roundTo6Decimals(1.0)).toBe(1.0);
    });

    it('2.3 keeps zero', () => {
      expect(WeaveImageCrop.roundTo6Decimals(0)).toBe(0);
    });
  });

  describe('3 — accept() and cancel()', () => {
    it('3.1 accept() finalizes crop mode', () => {
      const { crop, image } = createCrop();
      const handleClipEndSpy = vi.spyOn(crop, 'handleClipEnd');

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      crop.accept();

      expect(image.getAttrs().cropping).toBe(false);
      expect(handleClipEndSpy).toHaveBeenCalled();
    });

    it('3.2 cancel() discards crop mode', () => {
      const { crop, image } = createCrop();
      const handleClipEndSpy = vi.spyOn(crop, 'handleClipEnd');

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      crop.cancel();

      expect(image.getAttrs().cropping).toBe(false);
      expect(handleClipEndSpy).not.toHaveBeenCalled();
    });
  });

  describe('4 — show() basic setup', () => {
    it('4.1 sets image.cropping=true', () => {
      const { crop, image } = createCrop();

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });

      expect(image.getAttrs().cropping).toBe(true);
    });

    it('4.2 disables image listening', () => {
      const { crop, image } = createCrop();

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });

      expect(image.listening()).toBe(false);
    });

    it('4.3 hides the internal image', () => {
      const { crop, internalImage } = createCrop();

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });

      expect(internalImage.visible()).toBe(false);
    });

    it('4.4 clears node cache', () => {
      const { crop, node, image } = createCrop();

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });

      expect(node.clearCache).toHaveBeenCalledWith(image);
    });

    it('4.5 disables nodesSelection plugin when present', () => {
      const { crop, instance } = createCrop();
      const plugin = { disable: vi.fn(), enable: vi.fn() };
      instance.getPlugin.mockImplementation((key: string) => {
        return key === 'nodesSelection' ? plugin : null;
      });

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });

      expect(plugin.disable).toHaveBeenCalled();
    });

    it('4.6 shows cropGroup', () => {
      const { crop, cropGroup } = createCrop();

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });

      expect(cropGroup.visible()).toBe(true);
    });

    it('4.7 adds transformer to utility layer', () => {
      const { crop, instance } = createCrop();

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });

      expect(instance.getUtilityLayer().add).toHaveBeenCalledTimes(1);
    });
  });

  describe('5 — show() cmdCtrl=true', () => {
    it('5.1 hides utility layer when triggered=true', () => {
      const { crop, instance } = createCrop();
      mockIdentityTransform(getCropPrivate(crop).cropGroup ?? new Konva.Group());

      crop.show(vi.fn(), {
        cmdCtrl: {
          triggered: true,
          corner: WEAVE_IMAGE_CROP_ANCHOR_POSITION.TOP_LEFT,
        },
      });

      expect(instance.getUtilityLayer().hide).toHaveBeenCalled();
    });

    it('5.2 does not show utility layer when triggered=true', () => {
      const { crop, instance } = createCrop();
      mockIdentityTransform(getCropPrivate(crop).cropGroup ?? new Konva.Group());

      crop.show(vi.fn(), {
        cmdCtrl: {
          triggered: true,
          corner: WEAVE_IMAGE_CROP_ANCHOR_POSITION.TOP_LEFT,
        },
      });

      expect(instance.getUtilityLayer().show).not.toHaveBeenCalled();
    });
  });

  describe('6 — show() normal mode', () => {
    it('6.1 shows utility layer when triggered=false', () => {
      const { crop, instance } = createCrop();

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });

      expect(instance.getUtilityLayer().show).toHaveBeenCalled();
    });

    it('6.2 does not hide utility layer when triggered=false', () => {
      const { crop, instance } = createCrop();

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });

      expect(instance.getUtilityLayer().hide).not.toHaveBeenCalled();
    });
  });

  describe('7 — hide() via accept/cancel', () => {
    it('7.1 ignores unsupported key codes', () => {
      const { crop, image } = createCrop();
      const handleClipEndSpy = vi.spyOn(crop, 'handleClipEnd');

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      getCropPrivate(crop).hide({ code: 'F1' } as KeyboardEvent);

      expect(handleClipEndSpy).not.toHaveBeenCalled();
      expect(image.getAttrs().cropping).toBe(true);
    });

    it('7.2 Enter disables cropping and restores listening', () => {
      const { crop, image } = createCrop();

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      getCropPrivate(crop).hide({ code: 'Enter' } as KeyboardEvent);

      expect(image.getAttrs().cropping).toBe(false);
      expect(image.listening()).toBe(true);
    });

    it('7.3 Escape disables cropping and restores listening', () => {
      const { crop, image } = createCrop();

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      getCropPrivate(crop).hide({ code: 'Escape' } as KeyboardEvent);

      expect(image.getAttrs().cropping).toBe(false);
      expect(image.listening()).toBe(true);
    });

    it('7.4 calls onClose for Enter', () => {
      const { crop } = createCrop();
      const onClose = vi.fn();

      crop.show(onClose, { cmdCtrl: { triggered: false } });
      getCropPrivate(crop).hide({ code: 'Enter' } as KeyboardEvent);

      expect(onClose).toHaveBeenCalled();
    });

    it('7.5 calls handleClipEnd for Enter', () => {
      const { crop } = createCrop();
      const handleClipEndSpy = vi.spyOn(crop, 'handleClipEnd');

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      getCropPrivate(crop).hide({ code: 'Enter' } as KeyboardEvent);

      expect(handleClipEndSpy).toHaveBeenCalled();
    });

    it('7.6 does not call handleClipEnd for Escape', () => {
      const { crop } = createCrop();
      const handleClipEndSpy = vi.spyOn(crop, 'handleClipEnd');

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      getCropPrivate(crop).hide({ code: 'Escape' } as KeyboardEvent);

      expect(handleClipEndSpy).not.toHaveBeenCalled();
    });

    it('7.7 sets stage mode back to default', () => {
      const { crop, instance } = createCrop();

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      getCropPrivate(crop).hide({ code: 'Enter' } as KeyboardEvent);

      expect(instance.getStage().mode).toHaveBeenCalledWith(
        WEAVE_STAGE_DEFAULT_MODE
      );
    });

    it('7.8 releases the mutex lock', () => {
      const { crop, instance } = createCrop();

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      getCropPrivate(crop).hide({ code: 'Enter' } as KeyboardEvent);

      expect(instance.releaseMutexLock).toHaveBeenCalled();
    });

    it('7.9 emits onImageCropEnd', () => {
      const { crop, instance } = createCrop();

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      getCropPrivate(crop).hide({ code: 'Enter' } as KeyboardEvent);

      expect(instance.emitEvent).toHaveBeenCalledWith('onImageCropEnd', {
        instance: expect.any(Konva.Group),
      });
    });

    it('7.10 destroys cropGroup children, hides it and shows internal image', () => {
      const { crop, cropGroup, internalImage } = createCrop();
      const destroyChildrenSpy = vi.spyOn(cropGroup, 'destroyChildren');

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      getCropPrivate(crop).hide({ code: 'Enter' } as KeyboardEvent);

      expect(destroyChildrenSpy).toHaveBeenCalled();
      expect(cropGroup.visible()).toBe(false);
      expect(internalImage.visible()).toBe(true);
    });

    it('7.11 enables nodesSelection plugin when present', () => {
      const { crop, instance } = createCrop();
      const plugin = { disable: vi.fn(), enable: vi.fn() };
      instance.getPlugin.mockImplementation((key: string) => {
        return key === 'nodesSelection' ? plugin : null;
      });

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      getCropPrivate(crop).hide({ code: 'Enter' } as KeyboardEvent);

      expect(plugin.enable).toHaveBeenCalled();
    });

    it('7.12 Enter + ctrlKey=true calls renderCropMode', () => {
      const { crop, node, instance } = createCrop();

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      getCropPrivate(crop).hide({
        code: 'Enter',
        ctrlKey: true,
      } as KeyboardEvent);

      expect(node.renderCropMode).toHaveBeenCalledWith(
        instance.getUtilityLayer(),
        expect.any(Konva.Group)
      );
    });
  });

  describe('8 — drawGrid() via show()', () => {
    it('8.1 gridLines.enabled=true creates grid lines and border', () => {
      const { crop } = createCrop();

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });

      const grid = getCropPrivate(crop).grid;
      expect(grid.getChildren()).toHaveLength(5);
    });

    it('8.2 gridLines.enabled=false keeps only the border', () => {
      const { crop, node } = createCrop();
      node.getConfiguration.mockReturnValue({
        cropMode: {
          ...node.getConfiguration().cropMode,
          gridLines: { enabled: false },
        },
      });

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });

      const grid = getCropPrivate(crop).grid;
      expect(grid.getChildren()).toHaveLength(1);
    });

    it('8.3 returns early when image.cropping=false', () => {
      const { crop, image } = createCrop();

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      const cropPrivate = getCropPrivate(crop);
      const initialChildren = cropPrivate.grid.getChildren().length;

      image.setAttrs({ cropping: false });
      cropPrivate.drawGrid(0, 0, 200, 150);

      expect(cropPrivate.grid.getChildren()).toHaveLength(initialChildren);
    });
  });

  describe('9 — drawSquarePointer()', () => {
    const limits = { top: 0, right: 200, bottom: 150, left: 0 };

    it('9.1 TOP_LEFT updates position and size', () => {
      const { crop, instance, cropGroup } = createCrop();
      const stage = instance.getStage();
      stage.getPointerPosition.mockReturnValue({ x: 100, y: 100 });
      mockIdentityTransform(cropGroup);

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      crop.drawSquarePointer(
        WEAVE_IMAGE_CROP_ANCHOR_POSITION.TOP_LEFT,
        { x: 0, y: 0 },
        limits
      );

      const cropRect = getCropPrivate(crop).cropRect;
      expect(cropRect.x()).toBe(100);
      expect(cropRect.y()).toBe(100);
      expect(cropRect.width()).toBe(-100);
      expect(cropRect.height()).toBe(-100);
    });

    it('9.2 TOP_RIGHT updates position and size', () => {
      const { crop, instance, cropGroup } = createCrop();
      instance.getStage().getPointerPosition.mockReturnValue({ x: 100, y: 100 });
      mockIdentityTransform(cropGroup);

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      crop.drawSquarePointer(
        WEAVE_IMAGE_CROP_ANCHOR_POSITION.TOP_RIGHT,
        { x: 0, y: 0 },
        limits
      );

      const cropRect = getCropPrivate(crop).cropRect;
      expect(cropRect.x()).toBe(0);
      expect(cropRect.y()).toBe(100);
      expect(cropRect.width()).toBe(100);
      expect(cropRect.height()).toBe(-100);
    });

    it('9.3 BOTTOM_RIGHT updates size from pointer', () => {
      const { crop, instance, cropGroup } = createCrop();
      instance.getStage().getPointerPosition.mockReturnValue({ x: 100, y: 100 });
      mockIdentityTransform(cropGroup);

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      crop.drawSquarePointer(
        WEAVE_IMAGE_CROP_ANCHOR_POSITION.BOTTOM_RIGHT,
        { x: 0, y: 0 },
        limits
      );

      const cropRect = getCropPrivate(crop).cropRect;
      expect(cropRect.x()).toBe(0);
      expect(cropRect.y()).toBe(0);
      expect(cropRect.width()).toBe(100);
      expect(cropRect.height()).toBe(100);
    });

    it('9.4 MIDDLE_RIGHT preserves height and updates width', () => {
      const { crop, instance, cropGroup } = createCrop();
      instance.getStage().getPointerPosition.mockReturnValue({ x: 100, y: 100 });
      mockIdentityTransform(cropGroup);

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      const initialHeight = getCropPrivate(crop).cropRect.height();
      crop.drawSquarePointer(
        WEAVE_IMAGE_CROP_ANCHOR_POSITION.MIDDLE_RIGHT,
        { x: 0, y: 0 },
        limits
      );

      const cropRect = getCropPrivate(crop).cropRect;
      expect(cropRect.width()).toBe(100);
      expect(cropRect.height()).toBe(initialHeight);
    });

    it('9.5 returns early when there is no pointer', () => {
      const { crop, instance, cropGroup } = createCrop();
      instance.getStage().getPointerPosition.mockReturnValue(null);
      mockIdentityTransform(cropGroup);

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      const cropRect = getCropPrivate(crop).cropRect;
      const previous = {
        x: cropRect.x(),
        y: cropRect.y(),
        width: cropRect.width(),
        height: cropRect.height(),
      };

      crop.drawSquarePointer(
        WEAVE_IMAGE_CROP_ANCHOR_POSITION.BOTTOM_RIGHT,
        { x: 0, y: 0 },
        limits
      );

      expect(cropRect.getAttrs()).toMatchObject(previous);
    });
  });

  describe('10 — unCrop()', () => {
    it('10.1 resets width, height and cropInfo', () => {
      const { crop, image } = createCrop({ withCropInfo: true });

      crop.unCrop();

      expect(image.width()).toBe(200);
      expect(image.height()).toBe(150);
      expect(image.getAttrs().cropInfo).toBeUndefined();
    });

    it('10.2 updates the node with serialized state', () => {
      const { crop, instance, node } = createCrop({ withCropInfo: true });

      crop.unCrop();

      expect(node.serialize).toHaveBeenCalledWith(expect.any(Konva.Group));
      expect(instance.updateNode).toHaveBeenCalledWith({
        id: 'test',
        type: 'image',
        props: {},
      });
    });

    it('10.3 caches the node after uncrop', () => {
      const { crop, node, image } = createCrop({ withCropInfo: true });

      crop.unCrop();

      expect(node.cacheNode).toHaveBeenCalledWith(image);
    });
  });

  describe('11 — handleClipEnd()', () => {
    it('11.1 returns early when intersection is null', () => {
      const { crop, instance } = createCrop();

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      vi.spyOn(getCropPrivate(crop), 'getIntersectionRect').mockReturnValue(null);
      crop.handleClipEnd();

      expect(instance.updateNode).not.toHaveBeenCalled();
    });

    it('11.2 updates image and node when intersection exists', () => {
      const { crop, instance, image } = createCrop();
      const cropPrivate = getCropPrivate(crop);

      crop.show(vi.fn(), { cmdCtrl: { triggered: false } });
      vi.spyOn(cropPrivate, 'getIntersectionRect').mockReturnValue({
        x: 1,
        y: 2,
        width: 90,
        height: 70,
      });
      vi.spyOn(cropPrivate.cropRect, 'getClientRect').mockReturnValue({
        x: 1,
        y: 2,
        width: 90,
        height: 70,
      });
      vi.spyOn(cropPrivate.cropRect, 'getAbsolutePosition').mockReturnValue({
        x: 15,
        y: 25,
      });

      crop.handleClipEnd();

      expect(image.width()).toBe(90);
      expect(image.height()).toBe(70);
      expect(image.getAttrs().cropInfo).toMatchObject({
        x: 1,
        y: 2,
        width: 90,
        height: 70,
        scaleX: 1,
        scaleY: 1,
      });
      expect(instance.updateNode).toHaveBeenCalled();
    });
  });

  describe('12 — handleClipExternal()', () => {
    it('12.1 throws when image and reference rotations differ', () => {
      const { crop, image } = createCrop();
      const layer = new Konva.Group() as unknown as Konva.Layer;
      const reference = new Konva.Rect({
        id: 'ref',
        rotation: 30,
        width: 50,
        height: 50,
      });

      layer.add(image);
      layer.add(reference);

      expect(() => crop.handleClipExternal(image, reference)).toThrowError(
        'Image and reference must have the same rotation'
      );
    });

    it('12.2 returns early when there is no intersection', () => {
      const { crop, image, instance } = createCrop();
      const layer = new Konva.Group() as unknown as Konva.Layer;
      const reference = new Konva.Rect({ id: 'ref', width: 50, height: 50 });
      const cropPrivate = getCropPrivate(crop);

      layer.add(image);
      layer.add(reference);
      instance.getStage.mockReturnValue(layer as unknown as MockStage);
      vi.spyOn(cropPrivate, 'getIntersectionRect').mockReturnValue(null);

      crop.handleClipExternal(image, reference);

      expect(instance.updateNodeNT).not.toHaveBeenCalled();
    });

    it('12.3 updates the node when intersection exists', () => {
      const { crop, image, instance } = createCrop();
      const layer = new Konva.Group() as unknown as Konva.Layer;
      const reference = new Konva.Rect({ id: 'ref', width: 50, height: 50 });
      const cropPrivate = getCropPrivate(crop);

      layer.add(image);
      layer.add(reference);
      instance.getStage.mockReturnValue(layer as unknown as MockStage);
      vi.spyOn(cropPrivate, 'getIntersectionRect')
        .mockReturnValueOnce({ x: 5, y: 10, width: 90, height: 70 })
        .mockReturnValueOnce({ x: 5, y: 10, width: 90, height: 70 });

      crop.handleClipExternal(image, reference);

      expect(instance.updateNodeNT).toHaveBeenCalled();
    });
  });

  describe('13 — renderCropMode integration', () => {
    it('13.1 adds crop mode shapes to the layer', () => {
      const { node } = createRealNode();
      const layer = new Konva.Group() as unknown as Konva.Layer;
      const image = new Konva.Group({ width: 200, height: 150, rotation: 0 });
      vi.spyOn(image, 'getAbsoluteTransform').mockReturnValue(
        new Konva.Transform()
      );

      node.renderCropMode(layer, image);

      expect(layer.getChildren().length).toBeGreaterThan(0);
    });

    it('13.2 renders 1 border and 8 anchors', () => {
      const { node } = createRealNode();
      const layer = new Konva.Group() as unknown as Konva.Layer;
      const image = new Konva.Group({ width: 200, height: 150, rotation: 0 });
      vi.spyOn(image, 'getAbsoluteTransform').mockReturnValue(
        new Konva.Transform()
      );

      node.renderCropMode(layer, image);

      expect(layer.getChildren()).toHaveLength(9);
    });
  });

  describe('14 — renderCropAnchor pointerover cursor behavior', () => {
    it('14.1 TOP_LEFT sets nwse-resize cursor', () => {
      const { node, instance } = createRealNode();
      const layer = new Konva.Group() as unknown as Konva.Layer;
      const image = new Konva.Group({ width: 200, height: 150, rotation: 0 });
      vi.spyOn(image, 'getAbsoluteTransform').mockReturnValue(
        new Konva.Transform()
      );

      const anchor = node.renderCropAnchor(
        WEAVE_IMAGE_CROP_ANCHOR_POSITION.TOP_LEFT,
        image,
        layer,
        vi.fn()
      );
      fireKonvaEvent(anchor, 'pointerover');

      expect(instance.getStage().container().style.cursor).toBe('nwse-resize');
    });

    it('14.2 TOP_RIGHT sets nesw-resize cursor', () => {
      const { node, instance } = createRealNode();
      const layer = new Konva.Group() as unknown as Konva.Layer;
      const image = new Konva.Group({ width: 200, height: 150, rotation: 0 });
      vi.spyOn(image, 'getAbsoluteTransform').mockReturnValue(
        new Konva.Transform()
      );

      const anchor = node.renderCropAnchor(
        WEAVE_IMAGE_CROP_ANCHOR_POSITION.TOP_RIGHT,
        image,
        layer,
        vi.fn()
      );
      fireKonvaEvent(anchor, 'pointerover');

      expect(instance.getStage().container().style.cursor).toBe('nesw-resize');
    });

    it('14.3 MIDDLE_RIGHT sets ew-resize cursor', () => {
      const { node, instance } = createRealNode();
      const layer = new Konva.Group() as unknown as Konva.Layer;
      const image = new Konva.Group({ width: 200, height: 150, rotation: 0 });
      vi.spyOn(image, 'getAbsoluteTransform').mockReturnValue(
        new Konva.Transform()
      );

      const anchor = node.renderCropAnchor(
        WEAVE_IMAGE_CROP_ANCHOR_POSITION.MIDDLE_RIGHT,
        image,
        layer,
        vi.fn()
      );
      fireKonvaEvent(anchor, 'pointerover');

      expect(instance.getStage().container().style.cursor).toBe('ew-resize');
    });

    it('14.4 TOP_CENTER sets ns-resize cursor', () => {
      const { node, instance } = createRealNode();
      const layer = new Konva.Group() as unknown as Konva.Layer;
      const image = new Konva.Group({ width: 200, height: 150, rotation: 0 });
      vi.spyOn(image, 'getAbsoluteTransform').mockReturnValue(
        new Konva.Transform()
      );

      const anchor = node.renderCropAnchor(
        WEAVE_IMAGE_CROP_ANCHOR_POSITION.TOP_CENTER,
        image,
        layer,
        vi.fn()
      );
      fireKonvaEvent(anchor, 'pointerover');

      expect(instance.getStage().container().style.cursor).toBe('ns-resize');
    });
  });

  describe('15 — createSoftSnap()', () => {
    it('15.1 snaps when value is within SNAP distance', () => {
      const { crop } = createCrop();
      const snap = getCropPrivate(crop).createSoftSnap(0, 8);

      expect(snap(4)).toBe(0);
    });

    it('15.2 keeps value when outside SNAP distance', () => {
      const { crop } = createCrop();
      const snap = getCropPrivate(crop).createSoftSnap(0, 8);

      expect(snap(20)).toBe(20);
    });
  });
});
