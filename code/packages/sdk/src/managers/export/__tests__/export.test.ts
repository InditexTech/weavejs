// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import 'vitest-canvas-mock';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Konva from 'konva';
import { WeaveExportManager } from '../export';
import { WEAVE_KONVA_BACKEND } from '@inditextech/weave-types';
import { getExportBoundingBox } from '@/utils/utils';

vi.mock('@/utils/utils', () => ({
  getExportBoundingBox: vi.fn(),
  containerOverCursor: vi.fn(),
  getBoundingBox: vi.fn(),
}));

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const MOCK_BOUNDS = { x: 0, y: 0, width: 100, height: 200 };
const MOCK_IMG = document.createElement('img');
const MOCK_BLOB = new Blob(['mock'], { type: 'image/png' });
const MOCK_CANVAS_ELEMENT = document.createElement('canvas');
const MOCK_BUFFER = Buffer.from('mockbuffer');

function makePlugin(enabled = true) {
  return {
    isEnabled: vi.fn().mockReturnValue(enabled),
    enable: vi.fn(),
    disable: vi.fn(),
  };
}

function makeStage() {
  return {
    x: vi.fn().mockReturnValue(0),
    y: vi.fn().mockReturnValue(0),
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
    scale: vi.fn(),
    position: vi.fn(),
    batchDraw: vi.fn(),
    findOne: vi.fn().mockReturnValue(undefined),
    toImage: vi.fn(),
    toBlob: vi.fn(),
    toCanvas: vi.fn(),
  };
}

function makeLayer(children: unknown[] = []) {
  return {
    add: vi.fn(),
    getChildren: vi.fn().mockReturnValue(children),
    toCanvas: vi.fn(),
  };
}

function makeInstance(stage: ReturnType<typeof makeStage>, layer: ReturnType<typeof makeLayer>) {
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return {
    instance: {
      getChildLogger: vi.fn().mockReturnValue(logger),
      getStage: vi.fn().mockReturnValue(stage),
      getMainLayer: vi.fn().mockReturnValue(layer),
      getPlugin: vi.fn().mockReturnValue(undefined),
    } as unknown,
    logger,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('WeaveExportManager', () => {
  let stage: ReturnType<typeof makeStage>;
  let layer: ReturnType<typeof makeLayer>;
  let mockInst: ReturnType<typeof makeInstance>;
  let manager: WeaveExportManager;

  beforeEach(() => {
    vi.mocked(getExportBoundingBox).mockReturnValue(MOCK_BOUNDS);

    // Make Konva.Rect.getClientRect deterministic in jsdom
    vi.spyOn(Konva.Rect.prototype, 'getClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 200,
    });

    stage = makeStage();
    layer = makeLayer();
    mockInst = makeInstance(stage, layer);
    manager = new WeaveExportManager(mockInst.instance as never);

    // Default: no plugins
    vi.spyOn(manager, 'getNodesSelectionPlugin').mockReturnValue(undefined);
    vi.spyOn(manager, 'getStageGridPlugin').mockReturnValue(undefined);

    // Default Konva.Group callback mocks
    vi.spyOn(Konva.Group.prototype, 'toImage').mockImplementation(function (options: Record<string, unknown>) {
      (options?.callback as (img: typeof MOCK_IMG) => void)?.(MOCK_IMG);
    });
    vi.spyOn(Konva.Group.prototype, 'toBlob').mockImplementation(function (options: Record<string, unknown>) {
      (options?.callback as (blob: Blob) => void)?.(MOCK_BLOB);
    });
    vi.spyOn(Konva.Group.prototype, 'toCanvas').mockImplementation(function (options: Record<string, unknown>) {
      if (options?.callback) {
        (options.callback as (canvas: typeof MOCK_CANVAS_ELEMENT) => void)(MOCK_CANVAS_ELEMENT);
        return;
      }
      return Promise.resolve({ toBuffer: vi.fn().mockReturnValue(MOCK_BUFFER) });
    });

    // Default stage callback mocks (for exportArea* methods)
    stage.toImage.mockImplementation((options: Record<string, unknown>) =>
      (options?.callback as (img: typeof MOCK_IMG) => void)?.(MOCK_IMG)
    );
    stage.toBlob.mockImplementation((options: Record<string, unknown>) =>
      (options?.callback as (blob: Blob) => void)?.(MOCK_BLOB)
    );
    stage.toCanvas.mockImplementation((options: Record<string, unknown>) => {
      if (options?.callback) {
        (options.callback as (canvas: typeof MOCK_CANVAS_ELEMENT) => void)(MOCK_CANVAS_ELEMENT);
        return;
      }
      return Promise.resolve({ toBuffer: vi.fn().mockReturnValue(MOCK_BUFFER) });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>)._weave_serverSideBackend;
  });

  // ── constructor ────────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('calls getChildLogger with "export-manager"', () => {
      expect((mockInst.instance as { getChildLogger: ReturnType<typeof vi.fn> }).getChildLogger)
        .toHaveBeenCalledWith('export-manager');
    });

    it('logs debug "Export manager created"', () => {
      expect(mockInst.logger.debug).toHaveBeenCalledWith('Export manager created');
    });
  });

  // ── fitKonvaPixelRatio (private) ───────────────────────────────────────────

  describe('fitKonvaPixelRatio (private)', () => {
    const fit = (sw: number, sh: number, targetPR = 1, maxArea = 16_777_216) =>
      (manager as unknown as { fitKonvaPixelRatio: (...a: number[]) => { pixelRatio: number; outW: number; outH: number } })
        .fitKonvaPixelRatio(sw, sh, targetPR, maxArea);

    it('returns zeros when sw <= 0', () => {
      expect(fit(0, 100)).toEqual({ pixelRatio: 0, outW: 0, outH: 0 });
      expect(fit(-1, 100)).toEqual({ pixelRatio: 0, outW: 0, outH: 0 });
    });

    it('returns zeros when sh <= 0', () => {
      expect(fit(100, 0)).toEqual({ pixelRatio: 0, outW: 0, outH: 0 });
      expect(fit(100, -5)).toEqual({ pixelRatio: 0, outW: 0, outH: 0 });
    });

    it('clamps pixelRatio when desiredArea > maxArea', () => {
      // sw=1000, sh=1000, targetPR=5 → desiredArea=25_000_000 > 16_777_216
      const expectedPR = Math.sqrt(16_777_216 / (1000 * 1000));
      const { pixelRatio, outW, outH } = fit(1000, 1000, 5);
      expect(pixelRatio).toBeCloseTo(expectedPR, 8);
      expect(outW).toBe(Math.max(1, Math.floor(1000 * expectedPR)));
      expect(outH).toBe(Math.max(1, Math.floor(1000 * expectedPR)));
    });

    it('keeps targetPR when desiredArea <= maxArea', () => {
      // sw=100, sh=100, targetPR=2 → desiredArea=40_000 <= 16_777_216
      const { pixelRatio, outW, outH } = fit(100, 100, 2);
      expect(pixelRatio).toBe(2);
      expect(outW).toBe(200);
      expect(outH).toBe(200);
    });
  });

  // ── getNodesSelectionPlugin / getStageGridPlugin ───────────────────────────

  describe('getNodesSelectionPlugin / getStageGridPlugin', () => {
    it('getNodesSelectionPlugin returns plugin from getPlugin', () => {
      vi.mocked(manager.getNodesSelectionPlugin).mockRestore();
      const plugin = makePlugin();
      (mockInst.instance as { getPlugin: ReturnType<typeof vi.fn> }).getPlugin.mockReturnValue(plugin);
      expect(manager.getNodesSelectionPlugin()).toBe(plugin);
    });

    it('getNodesSelectionPlugin returns undefined when not registered', () => {
      vi.mocked(manager.getNodesSelectionPlugin).mockRestore();
      (mockInst.instance as { getPlugin: ReturnType<typeof vi.fn> }).getPlugin.mockReturnValue(undefined);
      expect(manager.getNodesSelectionPlugin()).toBeUndefined();
    });

    it('getStageGridPlugin returns plugin from getPlugin', () => {
      vi.mocked(manager.getStageGridPlugin).mockRestore();
      const plugin = makePlugin();
      (mockInst.instance as { getPlugin: ReturnType<typeof vi.fn> }).getPlugin.mockReturnValue(plugin);
      expect(manager.getStageGridPlugin()).toBe(plugin);
    });

    it('getStageGridPlugin returns undefined when not registered', () => {
      vi.mocked(manager.getStageGridPlugin).mockRestore();
      (mockInst.instance as { getPlugin: ReturnType<typeof vi.fn> }).getPlugin.mockReturnValue(undefined);
      expect(manager.getStageGridPlugin()).toBeUndefined();
    });
  });

  // ── exportNodesAsImage ─────────────────────────────────────────────────────

  describe('exportNodesAsImage', () => {
    const bound = (n: unknown[]) => n;

    it('resolves with HTMLImageElement', async () => {
      const img = await manager.exportNodesAsImage([], bound as never, {});
      expect(img).toBe(MOCK_IMG);
    });

    it('disables plugins and re-enables if they were enabled', async () => {
      const sel = makePlugin(true);
      const grid = makePlugin(true);
      vi.mocked(manager.getNodesSelectionPlugin).mockReturnValue(sel as never);
      vi.mocked(manager.getStageGridPlugin).mockReturnValue(grid as never);
      await manager.exportNodesAsImage([], bound as never, {});
      expect(sel.disable).toHaveBeenCalled();
      expect(sel.enable).toHaveBeenCalled();
      expect(grid.disable).toHaveBeenCalled();
      expect(grid.enable).toHaveBeenCalled();
    });

    it('does NOT re-enable a plugin that was already disabled', async () => {
      const sel = makePlugin(false);
      vi.mocked(manager.getNodesSelectionPlugin).mockReturnValue(sel as never);
      await manager.exportNodesAsImage([], bound as never, {});
      expect(sel.disable).toHaveBeenCalled();
      expect(sel.enable).not.toHaveBeenCalled();
    });

    it('restores original stage position and scale after export', async () => {
      stage.x.mockReturnValue(50);
      stage.y.mockReturnValue(60);
      stage.scaleX.mockReturnValue(2);
      stage.scaleY.mockReturnValue(3);
      await manager.exportNodesAsImage([], bound as never, {});
      expect(stage.position).toHaveBeenCalledWith({ x: 50, y: 60 });
      expect(stage.scale).toHaveBeenCalledWith({ x: 2, y: 3 });
    });

    it('returns a pending Promise when mainLayer is null', async () => {
      (mockInst.instance as { getMainLayer: ReturnType<typeof vi.fn> }).getMainLayer.mockReturnValue(null);
      const result = await Promise.race([
        manager.exportNodesAsImage([], bound as never, {}),
        Promise.resolve('timeout'),
      ]);
      expect(result).toBe('timeout');
    });
  });

  // ── exportNodesAsBlob ──────────────────────────────────────────────────────

  describe('exportNodesAsBlob', () => {
    const bound = (n: unknown[]) => n;

    it('resolves with Blob', async () => {
      const blob = await manager.exportNodesAsBlob([], bound as never, {});
      expect(blob).toBe(MOCK_BLOB);
    });

    it('rejects when blob is null', async () => {
      vi.mocked(Konva.Group.prototype.toBlob as unknown as ReturnType<typeof vi.fn>)
        .mockImplementation(function (options: Record<string, unknown>) {
          (options?.callback as (b: null) => void)?.(null);
        });
      await expect(manager.exportNodesAsBlob([], bound as never, {})).rejects.toThrow(
        'Failed to generate image blob'
      );
    });

    it('disables/re-enables plugins', async () => {
      const sel = makePlugin(true);
      vi.mocked(manager.getNodesSelectionPlugin).mockReturnValue(sel as never);
      await manager.exportNodesAsBlob([], bound as never, {});
      expect(sel.disable).toHaveBeenCalled();
      expect(sel.enable).toHaveBeenCalled();
    });

    it('restores stage position and scale', async () => {
      stage.x.mockReturnValue(10);
      stage.y.mockReturnValue(20);
      await manager.exportNodesAsBlob([], bound as never, {});
      expect(stage.position).toHaveBeenCalledWith({ x: 10, y: 20 });
    });

    it('returns a pending Promise when mainLayer is null', async () => {
      (mockInst.instance as { getMainLayer: ReturnType<typeof vi.fn> }).getMainLayer.mockReturnValue(null);
      const result = await Promise.race([
        manager.exportNodesAsBlob([], bound as never, {}),
        Promise.resolve('timeout'),
      ]);
      expect(result).toBe('timeout');
    });
  });

  // ── exportNodesAsCanvas ────────────────────────────────────────────────────

  describe('exportNodesAsCanvas', () => {
    const bound = (n: unknown[]) => n;

    it('resolves with HTMLCanvasElement', async () => {
      const canvas = await manager.exportNodesAsCanvas([], bound as never, {});
      expect(canvas).toBe(MOCK_CANVAS_ELEMENT);
    });

    it('disables/re-enables plugins', async () => {
      const grid = makePlugin(true);
      vi.mocked(manager.getStageGridPlugin).mockReturnValue(grid as never);
      await manager.exportNodesAsCanvas([], bound as never, {});
      expect(grid.disable).toHaveBeenCalled();
      expect(grid.enable).toHaveBeenCalled();
    });

    it('restores stage position and scale', async () => {
      stage.x.mockReturnValue(5);
      stage.y.mockReturnValue(7);
      await manager.exportNodesAsCanvas([], bound as never, {});
      expect(stage.position).toHaveBeenCalledWith({ x: 5, y: 7 });
    });

    it('returns a pending Promise when mainLayer is null', async () => {
      (mockInst.instance as { getMainLayer: ReturnType<typeof vi.fn> }).getMainLayer.mockReturnValue(null);
      const result = await Promise.race([
        manager.exportNodesAsCanvas([], bound as never, {}),
        Promise.resolve('timeout'),
      ]);
      expect(result).toBe('timeout');
    });
  });

  // ── exportAreaAsImage ──────────────────────────────────────────────────────

  describe('exportAreaAsImage', () => {
    const area = { x: 10, y: 20, width: 100, height: 200 };

    it('rejects when mainLayer is null', async () => {
      (mockInst.instance as { getMainLayer: ReturnType<typeof vi.fn> }).getMainLayer.mockReturnValue(null);
      await expect(manager.exportAreaAsImage(area, {})).rejects.toThrow('Main layer not found');
    });

    it('resolves with HTMLImageElement', async () => {
      const img = await manager.exportAreaAsImage(area, {});
      expect(img).toBe(MOCK_IMG);
    });

    it('disables plugins before and re-enables after if they were enabled', async () => {
      const sel = makePlugin(true);
      const grid = makePlugin(true);
      vi.mocked(manager.getNodesSelectionPlugin).mockReturnValue(sel as never);
      vi.mocked(manager.getStageGridPlugin).mockReturnValue(grid as never);
      await manager.exportAreaAsImage(area, {});
      expect(sel.disable).toHaveBeenCalled();
      expect(sel.enable).toHaveBeenCalled();
      expect(grid.disable).toHaveBeenCalled();
      expect(grid.enable).toHaveBeenCalled();
    });

    it('does NOT re-enable a plugin that was already disabled', async () => {
      const sel = makePlugin(false);
      vi.mocked(manager.getNodesSelectionPlugin).mockReturnValue(sel as never);
      await manager.exportAreaAsImage(area, {});
      expect(sel.enable).not.toHaveBeenCalled();
    });

    it('restores stage position and scale', async () => {
      stage.x.mockReturnValue(3);
      stage.y.mockReturnValue(4);
      await manager.exportAreaAsImage(area, {});
      expect(stage.position).toHaveBeenCalledWith({ x: 3, y: 4 });
    });
  });

  // ── exportAreaAsBlob ───────────────────────────────────────────────────────

  describe('exportAreaAsBlob', () => {
    const area = { x: 10, y: 20, width: 100, height: 200 };

    it('rejects when mainLayer is null', async () => {
      (mockInst.instance as { getMainLayer: ReturnType<typeof vi.fn> }).getMainLayer.mockReturnValue(null);
      await expect(manager.exportAreaAsBlob(area, {})).rejects.toThrow('Main layer not found');
    });

    it('resolves with Blob', async () => {
      const blob = await manager.exportAreaAsBlob(area, {});
      expect(blob).toBe(MOCK_BLOB);
    });

    it('rejects when blob is null', async () => {
      stage.toBlob.mockImplementation((options: Record<string, unknown>) =>
        (options?.callback as (b: null) => void)?.(null)
      );
      await expect(manager.exportAreaAsBlob(area, {})).rejects.toThrow('Failed to generate image blob');
    });

    it('restores stage position and scale', async () => {
      await manager.exportAreaAsBlob(area, {});
      expect(stage.position).toHaveBeenCalled();
      expect(stage.scale).toHaveBeenCalled();
    });

    it('disables plugins before export', async () => {
      const sel = makePlugin(true);
      vi.mocked(manager.getNodesSelectionPlugin).mockReturnValue(sel as never);
      await manager.exportAreaAsBlob(area, {});
      expect(sel.disable).toHaveBeenCalled();
    });
  });

  // ── exportAreaAsCanvas ─────────────────────────────────────────────────────

  describe('exportAreaAsCanvas', () => {
    const area = { x: 10, y: 20, width: 100, height: 200 };

    it('rejects when mainLayer is null', async () => {
      (mockInst.instance as { getMainLayer: ReturnType<typeof vi.fn> }).getMainLayer.mockReturnValue(null);
      await expect(manager.exportAreaAsCanvas(area, {})).rejects.toThrow('Main layer not found');
    });

    it('resolves with HTMLCanvasElement', async () => {
      const canvas = await manager.exportAreaAsCanvas(area, {});
      expect(canvas).toBe(MOCK_CANVAS_ELEMENT);
    });

    it('disables/re-enables plugins', async () => {
      const grid = makePlugin(true);
      vi.mocked(manager.getStageGridPlugin).mockReturnValue(grid as never);
      await manager.exportAreaAsCanvas(area, {});
      expect(grid.disable).toHaveBeenCalled();
      expect(grid.enable).toHaveBeenCalled();
    });

    it('restores stage position and scale', async () => {
      await manager.exportAreaAsCanvas(area, {});
      expect(stage.position).toHaveBeenCalled();
      expect(stage.scale).toHaveBeenCalled();
    });
  });

  // ── exportNodesServerSide ──────────────────────────────────────────────────

  describe('exportNodesServerSide', () => {
    const bound = (n: unknown[]) => n;
    const mockCanvas = () => ({ toBuffer: vi.fn().mockReturnValue(MOCK_BUFFER) });

    beforeEach(() => {
      (globalThis as Record<string, unknown>)._weave_serverSideBackend = WEAVE_KONVA_BACKEND.CANVAS;
      vi.mocked(Konva.Group.prototype.toCanvas as unknown as ReturnType<typeof vi.fn>)
        .mockImplementation(() => Promise.resolve(mockCanvas()));
    });

    it('throws when mainLayer is null', async () => {
      (mockInst.instance as { getMainLayer: ReturnType<typeof vi.fn> }).getMainLayer.mockReturnValue(null);
      await expect(manager.exportNodesServerSide([], bound as never, {})).rejects.toThrow(
        'Main layer not found'
      );
    });

    it('uses all mainLayer children when nodes array is empty', async () => {
      const child1 = { getAttrs: () => ({ id: 'c1' }) };
      const child2 = { getAttrs: () => ({ id: undefined }) };
      layer.getChildren.mockReturnValue([child1, child2]);
      const mockKonvaNode = new Konva.Rect({ id: 'c1', x: 0, y: 0, width: 10, height: 10 });
      stage.findOne.mockImplementation((sel: string) => (sel === '#c1' ? mockKonvaNode : undefined));

      await manager.exportNodesServerSide([], bound as never, {});
      expect(stage.findOne).toHaveBeenCalledWith('#c1');
    });

    it('uses only nodes found in stage when ids are provided', async () => {
      const mockNode = new Konva.Rect({ id: 'n1', x: 0, y: 0, width: 10, height: 10 });
      stage.findOne.mockImplementation((sel: string) => (sel === '#n1' ? mockNode : undefined));

      await manager.exportNodesServerSide(['n1', 'missing'], bound as never, {});
      expect(stage.findOne).toHaveBeenCalledWith('#n1');
      expect(stage.findOne).toHaveBeenCalledWith('#missing');
    });

    it('skips nodes not found in stage', async () => {
      stage.findOne.mockReturnValue(undefined);
      const result = await manager.exportNodesServerSide(['notfound'], bound as never, {});
      expect(stage.findOne).toHaveBeenCalledWith('#notfound');
      // background tile still renders → 1 composite
      expect(result.composites).toHaveLength(1);
    });

    it('uses sync canvas.toBuffer() with CANVAS backend', async () => {
      const syncBuf = Buffer.from('canvas-sync');
      const syncCanvas = { toBuffer: vi.fn().mockReturnValue(syncBuf) };
      vi.mocked(Konva.Group.prototype.toCanvas as unknown as ReturnType<typeof vi.fn>)
        .mockImplementation(() => Promise.resolve(syncCanvas));

      const result = await manager.exportNodesServerSide([], bound as never, {});
      expect(syncCanvas.toBuffer).toHaveBeenCalled();
      expect(result.composites[0].input).toBe(syncBuf);
    });

    it('uses async canvas.toBuffer() with SKIA backend', async () => {
      (globalThis as Record<string, unknown>)._weave_serverSideBackend = WEAVE_KONVA_BACKEND.SKIA;
      const asyncBuf = Buffer.from('skia-async');
      const asyncCanvas = { toBuffer: vi.fn().mockResolvedValue(asyncBuf) };
      vi.mocked(Konva.Group.prototype.toCanvas as unknown as ReturnType<typeof vi.fn>)
        .mockImplementation(() => Promise.resolve(asyncCanvas));

      const result = await manager.exportNodesServerSide([], bound as never, {});
      expect(asyncCanvas.toBuffer).toHaveBeenCalled();
      expect(result.composites[0].input).toBe(asyncBuf);
    });

    it('throws when buffer is null (unknown backend)', async () => {
      delete (globalThis as Record<string, unknown>)._weave_serverSideBackend;
      vi.mocked(Konva.Group.prototype.toCanvas as unknown as ReturnType<typeof vi.fn>)
        .mockImplementation(() => Promise.resolve({}));

      await expect(manager.exportNodesServerSide([], bound as never, {})).rejects.toThrow(
        'Failed to generate image buffer'
      );
    });

    it('returns correct width and height scaled by pixelRatio', async () => {
      const result = await manager.exportNodesServerSide([], bound as never, { pixelRatio: 2 });
      // backgroundRect.width = 100 (mocked), imageWidth = 100
      expect(result.width).toBe(200); // 100 * 2
      expect(result.height).toBe(400); // 200 * 2
    });
  });

  // ── exportAreaServerSide ───────────────────────────────────────────────────

  describe('exportAreaServerSide', () => {
    const area = { x: 0, y: 0, width: 100, height: 200 };
    const mockCanvas = () => ({ toBuffer: vi.fn().mockReturnValue(MOCK_BUFFER) });

    beforeEach(() => {
      (globalThis as Record<string, unknown>)._weave_serverSideBackend = WEAVE_KONVA_BACKEND.CANVAS;
      layer.toCanvas.mockImplementation(() => Promise.resolve(mockCanvas()));
    });

    it('throws when mainLayer is null', async () => {
      (mockInst.instance as { getMainLayer: ReturnType<typeof vi.fn> }).getMainLayer.mockReturnValue(null);
      await expect(manager.exportAreaServerSide(area, {})).rejects.toThrow('Main layer not found');
    });

    it('uses sync toBuffer() with CANVAS backend', async () => {
      const syncBuf = Buffer.from('area-canvas');
      layer.toCanvas.mockResolvedValue({ toBuffer: vi.fn().mockReturnValue(syncBuf) });

      const result = await manager.exportAreaServerSide(area, {});
      expect(result.composites[0].input).toBe(syncBuf);
    });

    it('uses async toBuffer() with SKIA backend', async () => {
      (globalThis as Record<string, unknown>)._weave_serverSideBackend = WEAVE_KONVA_BACKEND.SKIA;
      const asyncBuf = Buffer.from('area-skia');
      layer.toCanvas.mockResolvedValue({ toBuffer: vi.fn().mockResolvedValue(asyncBuf) });

      const result = await manager.exportAreaServerSide(area, {});
      expect(result.composites[0].input).toBe(asyncBuf);
    });

    it('throws when buffer is null (unknown backend)', async () => {
      delete (globalThis as Record<string, unknown>)._weave_serverSideBackend;
      layer.toCanvas.mockResolvedValue({});

      await expect(manager.exportAreaServerSide(area, {})).rejects.toThrow(
        'Failed to generate image buffer'
      );
    });

    it('returns correct width and height scaled by pixelRatio', async () => {
      const result = await manager.exportAreaServerSide(area, { pixelRatio: 3 });
      // backgroundRect.width = 100 (mocked), imageWidth = 100
      expect(result.width).toBe(300); // 100 * 3
      expect(result.height).toBe(600); // 200 * 3
    });
  });

  // ── imageToBase64 ──────────────────────────────────────────────────────────

  describe('imageToBase64', () => {
    it('throws "Image has no content" when naturalWidth and naturalHeight are 0', () => {
      const img = { naturalWidth: 0, naturalHeight: 0 } as HTMLImageElement;
      expect(() => manager.imageToBase64(img, 'image/png')).toThrow('Image has no content');
    });

    it('throws "Could not get canvas context" when ctx is null', () => {
      const img = { naturalWidth: 100, naturalHeight: 100 } as HTMLImageElement;
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValueOnce(null);
      expect(() => manager.imageToBase64(img, 'image/png')).toThrow('Could not get canvas context');
    });

    it('returns a data URL string on success', () => {
      const img = new Image();
      Object.defineProperty(img, 'naturalWidth', { value: 100, configurable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 100, configurable: true });
      const url = manager.imageToBase64(img, 'image/png');
      expect(typeof url).toBe('string');
    });
  });

  // ── blobToDataURL ──────────────────────────────────────────────────────────

  describe('blobToDataURL', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('resolves with reader.result on loadend', async () => {
      const mockReader = {
        result: 'data:image/png;base64,abc',
        onloadend: null as (() => void) | null,
        onerror: null as (() => void) | null,
        readAsDataURL: vi.fn().mockImplementation(function (this: typeof mockReader) {
          Promise.resolve().then(() => this.onloadend?.());
        }),
      };
      vi.stubGlobal('FileReader', vi.fn().mockReturnValue(mockReader));

      const result = await manager.blobToDataURL(MOCK_BLOB);
      expect(result).toBe('data:image/png;base64,abc');
    });

    it('rejects with error on onerror', async () => {
      const mockReader = {
        result: null,
        onloadend: null as (() => void) | null,
        onerror: null as (() => void) | null,
        readAsDataURL: vi.fn().mockImplementation(function (this: typeof mockReader) {
          Promise.resolve().then(() => this.onerror?.());
        }),
      };
      vi.stubGlobal('FileReader', vi.fn().mockReturnValue(mockReader));

      await expect(manager.blobToDataURL(MOCK_BLOB)).rejects.toThrow(
        'Failed to convert blob to data URL'
      );
    });
  });
});
