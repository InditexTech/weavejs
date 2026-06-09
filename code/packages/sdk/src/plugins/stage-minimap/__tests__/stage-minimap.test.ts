// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── hoisted Konva state ──────────────────────────────────────────────────────

const konvaState = vi.hoisted(() => ({
  stageInsts: [] as {
    _cfg: Record<string, unknown>;
    add: ReturnType<typeof vi.fn>;
    width: ReturnType<typeof vi.fn>;
    height: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  }[],
  layerInsts: [] as { add: ReturnType<typeof vi.fn>; moveToBottom: ReturnType<typeof vi.fn> }[],
  rectInsts: [] as Record<string, unknown & { setAttrs: ReturnType<typeof vi.fn> }>[],
  imageInsts: [] as Record<string, unknown & { moveToBottom: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }>[],
}));

// ─── module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('lodash/throttle', () => ({ default: (fn: (...a: unknown[]) => unknown) => fn }));

vi.mock('konva', () => ({
  default: {
    Stage: vi.fn().mockImplementation((cfg: Record<string, unknown>) => {
      const inst = {
        _cfg: cfg,
        add: vi.fn(),
        width: vi.fn().mockReturnValue(200),
        height: vi.fn().mockReturnValue(150),
        on: vi.fn(),
        findOne: vi.fn().mockReturnValue(null),
      };
      konvaState.stageInsts.push(inst);
      return inst;
    }),
    Layer: vi.fn().mockImplementation(() => {
      const inst = { add: vi.fn(), moveToBottom: vi.fn() };
      konvaState.layerInsts.push(inst);
      return inst;
    }),
    Rect: vi.fn().mockImplementation((cfg: Record<string, unknown>) => {
      const inst = { setAttrs: vi.fn(), ...cfg };
      konvaState.rectInsts.push(inst);
      return inst;
    }),
    Image: vi.fn().mockImplementation((cfg: Record<string, unknown>) => {
      const inst = { moveToBottom: vi.fn(), destroy: vi.fn(), ...cfg };
      konvaState.imageInsts.push(inst);
      return inst;
    }),
    Util: {
      createImageElement: vi.fn().mockReturnValue({ src: '' }),
    },
  },
}));

// ─── imports (after mocks) ────────────────────────────────────────────────────

import { WeaveStageMinimapPlugin } from '../stage-minimap';
import { WEAVE_STAGE_MINIMAP_KEY, STAGE_MINIMAP_DEFAULT_CONFIG } from '../constants';

// ─── shared helpers ───────────────────────────────────────────────────────────

function makeLayer(getClientRectResult = { x: 0, y: 0, width: 400, height: 300 }) {
  return {
    show: vi.fn(),
    hide: vi.fn(),
    getClientRect: vi.fn().mockReturnValue(getClientRectResult),
  };
}

function makeStage(opts: {
  scaleX?: number | undefined;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
} = {}) {
  return {
    scaleX: vi.fn().mockReturnValue(opts.scaleX ?? 1),
    scaleY: vi.fn().mockReturnValue(opts.scaleX ?? 1),
    x: vi.fn().mockReturnValue(opts.x ?? 0),
    y: vi.fn().mockReturnValue(opts.y ?? 0),
    width: vi.fn().mockReturnValue(opts.width ?? 800),
    height: vi.fn().mockReturnValue(opts.height ?? 600),
    on: vi.fn(),
    toCanvas: vi.fn().mockReturnValue({}),
  };
}

type MockLayer = ReturnType<typeof makeLayer>;
type MockStage = ReturnType<typeof makeStage>;

function makeWeaveInstance(opts: {
  mainLayer?: MockLayer | null;
  selectionLayer?: MockLayer | null;
  gridLayer?: MockLayer | null;
  commentsLayer?: MockLayer | null;
  stage?: MockStage;
  isServerSide?: boolean;
} = {}) {
  const stage = opts.stage ?? makeStage();
  return {
    getStage: vi.fn().mockReturnValue(stage),
    getMainLayer: vi.fn().mockReturnValue(opts.mainLayer === undefined ? makeLayer() : opts.mainLayer),
    getSelectionLayer: vi.fn().mockReturnValue(opts.selectionLayer ?? null),
    getGridLayer: vi.fn().mockReturnValue(opts.gridLayer ?? null),
    getCommentsLayer: vi.fn().mockReturnValue(opts.commentsLayer ?? null),
    addEventListener: vi.fn(),
    isServerSide: vi.fn().mockReturnValue(opts.isServerSide ?? false),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    }),
  };
}

function makePlugin(opts: {
  mainLayer?: MockLayer | null;
  selectionLayer?: MockLayer | null;
  gridLayer?: MockLayer | null;
  commentsLayer?: MockLayer | null;
  stage?: MockStage;
  isServerSide?: boolean;
  id?: string;
  containerEl?: HTMLElement | null;
} = {}) {
  const containerEl = opts.containerEl === undefined
    ? (() => { const el = document.createElement('div'); document.body.appendChild(el); return el; })()
    : opts.containerEl;

  const plugin = new WeaveStageMinimapPlugin({
    config: {
      getContainer: () => containerEl as HTMLElement,
      id: opts.id ?? 'minimap-preview',
      width: 200,
      fitToContentPadding: 10,
    },
  });
  const weave = makeWeaveInstance(opts);
  // @ts-expect-error — accessing protected `instance`
  plugin.instance = weave;
  return { plugin, weave };
}

/** Stub createImageBitmap and URL.createObjectURL for suites that exercise the full update path. */
function stubImageGlobals() {
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 100, height: 80 }));
  // jsdom does not implement URL.createObjectURL — assign it directly
  (URL as Record<string, unknown>).createObjectURL = vi.fn().mockReturnValue('blob:url');
}

function teardownImageGlobals() {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  delete (URL as Record<string, unknown>).createObjectURL;
}

// ─── Suite 1: Constructor & static fields ─────────────────────────────────────

describe('WeaveStageMinimapPlugin — constructor & static fields', () => {
  beforeEach(() => {
    konvaState.stageInsts.length = 0;
    konvaState.layerInsts.length = 0;
    konvaState.rectInsts.length = 0;
    konvaState.imageInsts.length = 0;
  });
  afterEach(() => { vi.clearAllMocks(); document.body.innerHTML = ''; });

  it('1.1 getName() returns "stageMinimap"', () => {
    const { plugin } = makePlugin();
    expect(plugin.getName()).toBe(WEAVE_STAGE_MINIMAP_KEY);
    expect(plugin.getName()).toBe('stageMinimap');
  });

  it('1.2 getLayerName and initLayer are undefined', () => {
    const { plugin } = makePlugin();
    expect(plugin.getLayerName).toBeUndefined();
    expect(plugin.initLayer).toBeUndefined();
  });

  it('1.3 config is merged with defaults — style.viewportReference contains default values', () => {
    const { plugin } = makePlugin();
    // @ts-expect-error — accessing private `config`
    const cfg = plugin.config;
    expect(cfg.style.viewportReference).toMatchObject(STAGE_MINIMAP_DEFAULT_CONFIG.style.viewportReference);
  });

  it('1.4 initialized is false after construction', () => {
    const { plugin } = makePlugin();
    // @ts-expect-error — accessing private `initialized`
    expect(plugin.initialized).toBe(false);
  });
});

// ─── Suite 2: initialize() ────────────────────────────────────────────────────

describe('WeaveStageMinimapPlugin — initialize()', () => {
  afterEach(() => { vi.clearAllMocks(); document.body.innerHTML = ''; });

  it('2.1 initialize() resets initialized to false', () => {
    const { plugin } = makePlugin();
    // @ts-expect-error — accessing private field
    plugin.initialized = true;
    plugin.initialize();
    // @ts-expect-error — accessing private field
    expect(plugin.initialized).toBe(false);
  });
});

// ─── Suite 3: setupMinimap() early-return guards ──────────────────────────────

describe('WeaveStageMinimapPlugin — setupMinimap() early returns', () => {
  beforeEach(() => { konvaState.stageInsts.length = 0; });
  afterEach(() => { vi.clearAllMocks(); document.body.innerHTML = ''; });

  it('3.1 returns early without creating a Konva.Stage if already initialized', async () => {
    const { plugin } = makePlugin();
    // @ts-expect-error — accessing private field
    plugin.initialized = true;
    await plugin.setupMinimap();
    expect(konvaState.stageInsts).toHaveLength(0);
  });

  it('3.2 returns early without creating a Konva.Stage if getContainer() returns null', async () => {
    const { plugin } = makePlugin({ containerEl: null });
    await plugin.setupMinimap();
    expect(konvaState.stageInsts).toHaveLength(0);
  });
});

// ─── Suite 4: setupMinimap() DOM creation ─────────────────────────────────────

describe('WeaveStageMinimapPlugin — setupMinimap() DOM creation', () => {
  beforeEach(() => {
    konvaState.stageInsts.length = 0;
    konvaState.layerInsts.length = 0;
    konvaState.rectInsts.length = 0;
    stubImageGlobals();
  });
  afterEach(() => { teardownImageGlobals(); vi.clearAllMocks(); document.body.innerHTML = ''; });

  it('4.1 creates a <div> with correct id and style.width when no element exists', async () => {
    const { plugin } = makePlugin({ id: 'minimap-4-1' });
    await plugin.setupMinimap();
    const el = document.getElementById('minimap-4-1');
    expect(el).not.toBeNull();
    expect(el!.style.width).toBe('200px');
  });

  it('4.2 reuses an existing element (no extra createElement call)', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const existing = document.createElement('div');
    existing.id = 'minimap-4-2';
    document.body.appendChild(existing);

    // Pass container explicitly so makePlugin() itself doesn't call createElement
    const { plugin } = makePlugin({ id: 'minimap-4-2', containerEl: container });

    const createSpy = vi.spyOn(document, 'createElement');
    await plugin.setupMinimap();
    const divCreations = createSpy.mock.calls.filter((c) => c[0] === 'div');
    expect(divCreations).toHaveLength(0);
  });

  it('4.3 Konva.Stage constructed with correct container id and width', async () => {
    const { plugin } = makePlugin({ id: 'minimap-4-3' });
    await plugin.setupMinimap();
    expect(konvaState.stageInsts).toHaveLength(1);
    expect(konvaState.stageInsts[0]._cfg.container).toBe('minimap-4-3');
    expect(konvaState.stageInsts[0]._cfg.width).toBe(200);
  });
});

// ─── Suite 5: setupMinimap() with/without mainLayer ───────────────────────────

describe('WeaveStageMinimapPlugin — setupMinimap() with/without mainLayer', () => {
  beforeEach(() => {
    konvaState.stageInsts.length = 0;
    konvaState.layerInsts.length = 0;
    konvaState.rectInsts.length = 0;
    stubImageGlobals();
  });
  afterEach(() => { teardownImageGlobals(); vi.clearAllMocks(); document.body.innerHTML = ''; });

  it('5.1 when getMainLayer() returns null: initialized stays false', async () => {
    const { plugin } = makePlugin({ mainLayer: null });
    await plugin.setupMinimap();
    // @ts-expect-error — accessing private field
    expect(plugin.initialized).toBe(false);
  });

  it('5.2 when mainLayer exists: initialized becomes true', async () => {
    const { plugin } = makePlugin();
    await plugin.setupMinimap();
    // @ts-expect-error — accessing private field
    expect(plugin.initialized).toBe(true);
  });

  it('5.3 a Konva.Layer is created and added to the minimapStage', async () => {
    const { plugin } = makePlugin();
    await plugin.setupMinimap();
    expect(konvaState.layerInsts.length).toBeGreaterThanOrEqual(1);
    expect(konvaState.stageInsts[0].add).toHaveBeenCalled();
  });

  it('5.4 Konva.Rect with id "minimapViewportReference" and listening=false added to layer', async () => {
    const { plugin } = makePlugin();
    await plugin.setupMinimap();
    const rect = konvaState.rectInsts.find((r) => r['id'] === 'minimapViewportReference');
    expect(rect).toBeDefined();
    expect(rect!['listening']).toBe(false);
    expect(konvaState.layerInsts[0].add).toHaveBeenCalled();
  });

  it('5.5 updateMinimapViewportReference is called after layer setup (setAttrs invoked)', async () => {
    const { plugin } = makePlugin();
    await plugin.setupMinimap();
    const rect = konvaState.rectInsts.find((r) => r['id'] === 'minimapViewportReference');
    expect((rect!['setAttrs'] as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
  });
});

// ─── Suite 6: setupMinimap() event registration ───────────────────────────────

describe('WeaveStageMinimapPlugin — setupMinimap() event registration', () => {
  beforeEach(() => {
    konvaState.stageInsts.length = 0;
    konvaState.rectInsts.length = 0;
    stubImageGlobals();
  });
  afterEach(() => { teardownImageGlobals(); vi.clearAllMocks(); document.body.innerHTML = ''; });

  it('6.1 stage.on() registered for viewport change events', async () => {
    const stage = makeStage();
    const { plugin } = makePlugin({ stage });
    await plugin.setupMinimap();
    expect(stage.on).toHaveBeenCalledWith(
      'dragmove wheel dragend scaleXChange scaleYChange xChange yChange',
      expect.any(Function)
    );
  });

  it('6.2 firing the registered event calls updateMinimapViewportReference (setAttrs called again)', async () => {
    const stage = makeStage();
    const { plugin } = makePlugin({ stage });
    await plugin.setupMinimap();
    const rect = konvaState.rectInsts.find((r) => r['id'] === 'minimapViewportReference');
    const setAttrs = rect!['setAttrs'] as ReturnType<typeof vi.fn>;
    const callsBefore = setAttrs.mock.calls.length;
    const handler = stage.on.mock.calls[0][1] as () => void;
    handler();
    expect(setAttrs.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

// ─── Suite 7: updateMinimapContent() branches ────────────────────────────────

describe('WeaveStageMinimapPlugin — updateMinimapContent() branches', () => {
  beforeEach(() => {
    konvaState.stageInsts.length = 0;
    stubImageGlobals();
  });
  afterEach(() => { teardownImageGlobals(); vi.clearAllMocks(); document.body.innerHTML = ''; });

  it('7.1 returns early (toCanvas not called) when getMainLayer() is null', async () => {
    const stage = makeStage();
    const { plugin } = makePlugin({ mainLayer: null, stage });
    await plugin.setupMinimap();
    expect(stage.toCanvas).not.toHaveBeenCalled();
  });

  it('7.2 returns early (toCanvas not called) when bounding box has zero dimensions', async () => {
    const layer = makeLayer({ x: 0, y: 0, width: 0, height: 0 });
    const stage = makeStage();
    const { plugin } = makePlugin({ mainLayer: layer, stage });
    await plugin.setupMinimap();
    expect(stage.toCanvas).not.toHaveBeenCalled();
  });

  it('7.3 hide() called before toCanvas(), show() called after', async () => {
    const selectionLayer = makeLayer();
    const stage = makeStage();
    const { plugin } = makePlugin({ selectionLayer, stage });
    await plugin.setupMinimap();
    const hideOrder = selectionLayer.hide.mock.invocationCallOrder[0];
    const toCanvasOrder = stage.toCanvas.mock.invocationCallOrder[0];
    const showOrder = selectionLayer.show.mock.invocationCallOrder[0];
    expect(hideOrder).toBeLessThan(toCanvasOrder);
    expect(toCanvasOrder).toBeLessThan(showOrder);
  });

  it('7.4 createImageBitmap called with the result of stage.toCanvas()', async () => {
    const fakeCanvas = { _id: 'fake-canvas' };
    const stage = makeStage();
    stage.toCanvas = vi.fn().mockReturnValue(fakeCanvas);
    const { plugin } = makePlugin({ stage });
    await plugin.setupMinimap();
    expect(createImageBitmap).toHaveBeenCalledWith(fakeCanvas);
  });

  it('7.5 offscreenWorker.postMessage() called when worker is set', async () => {
    const postMessage = vi.fn();
    vi.stubGlobal('Worker', vi.fn().mockReturnValue({ postMessage, onmessage: null }));
    const { plugin } = makePlugin();
    plugin.onInit();
    await plugin.setupMinimap();
    expect(postMessage).toHaveBeenCalled();
  });

  it('7.6 does not throw when offscreenWorker is null (server-side)', async () => {
    const { plugin } = makePlugin({ isServerSide: true });
    plugin.onInit();
    await expect(plugin.setupMinimap()).resolves.not.toThrow();
  });
});

// ─── Suite 8: updateMinimapViewportReference() branches ──────────────────────

describe('WeaveStageMinimapPlugin — updateMinimapViewportReference() branches', () => {
  beforeEach(() => {
    konvaState.stageInsts.length = 0;
    konvaState.rectInsts.length = 0;
    stubImageGlobals();
  });
  afterEach(() => { teardownImageGlobals(); vi.clearAllMocks(); document.body.innerHTML = ''; });

  it('8.1 no Rect created (and thus no setAttrs) when mainLayer is null', async () => {
    const { plugin } = makePlugin({ mainLayer: null });
    await plugin.setupMinimap();
    const rect = konvaState.rectInsts.find((r) => r['id'] === 'minimapViewportReference');
    expect(rect).toBeUndefined();
  });

  it('8.2 Rect created but setAttrs NOT called when bounding box is zero', async () => {
    const layer = makeLayer({ x: 0, y: 0, width: 0, height: 0 });
    const { plugin } = makePlugin({ mainLayer: layer });
    await plugin.setupMinimap();
    const rect = konvaState.rectInsts.find((r) => r['id'] === 'minimapViewportReference');
    // The Rect is created in setupMinimap, but setAttrs is skipped due to zero bbox
    expect(rect).toBeDefined();
    const setAttrs = rect!['setAttrs'] as ReturnType<typeof vi.fn>;
    expect(setAttrs).not.toHaveBeenCalled();
  });

  it('8.3 setAttrs called with numeric x, y, width, height for a normal stage state', async () => {
    const stage = makeStage({ scaleX: 1, x: -100, y: -50, width: 800, height: 600 });
    const layer = makeLayer({ x: 0, y: 0, width: 400, height: 300 });
    const { plugin } = makePlugin({ stage, mainLayer: layer });
    await plugin.setupMinimap();
    const rect = konvaState.rectInsts.find((r) => r['id'] === 'minimapViewportReference');
    const setAttrs = rect!['setAttrs'] as ReturnType<typeof vi.fn>;
    expect(setAttrs).toHaveBeenCalled();
    const attrs = setAttrs.mock.calls[0][0] as Record<string, number>;
    expect(typeof attrs.x).toBe('number');
    expect(typeof attrs.y).toBe('number');
    expect(typeof attrs.width).toBe('number');
    expect(typeof attrs.height).toBe('number');
  });

  it('8.4 handles scaleX/scaleY returning undefined (defaults to 1)', async () => {
    const stage = makeStage();
    stage.scaleX = vi.fn().mockReturnValue(undefined);
    stage.scaleY = vi.fn().mockReturnValue(undefined);
    const { plugin } = makePlugin({ stage });
    await expect(plugin.setupMinimap()).resolves.not.toThrow();
    const rect = konvaState.rectInsts.find((r) => r['id'] === 'minimapViewportReference');
    const setAttrs = rect!['setAttrs'] as ReturnType<typeof vi.fn>;
    expect(setAttrs).toHaveBeenCalled();
  });
});

// ─── Suite 9: onInit() ────────────────────────────────────────────────────────

describe('WeaveStageMinimapPlugin — onInit()', () => {
  beforeEach(() => {
    konvaState.stageInsts.length = 0;
    konvaState.layerInsts.length = 0;
    konvaState.rectInsts.length = 0;
    konvaState.imageInsts.length = 0;
    stubImageGlobals();
  });
  afterEach(() => { teardownImageGlobals(); vi.clearAllMocks(); document.body.innerHTML = ''; });

  it('9.1 registers onStateChange event listener on instance', () => {
    const { plugin, weave } = makePlugin({ isServerSide: true });
    plugin.onInit();
    expect(weave.addEventListener.mock.calls.some((c: unknown[]) => c[0] === 'onStateChange')).toBe(true);
  });

  it('9.2 registers onRender event listener on instance', () => {
    const { plugin, weave } = makePlugin({ isServerSide: true });
    plugin.onInit();
    expect(weave.addEventListener.mock.calls.some((c: unknown[]) => c[0] === 'onRender')).toBe(true);
  });

  it('9.3 does NOT create a Worker when isServerSide() returns true', () => {
    const workerCtor = vi.fn().mockReturnValue({ postMessage: vi.fn(), onmessage: null });
    vi.stubGlobal('Worker', workerCtor);
    const { plugin } = makePlugin({ isServerSide: true });
    plugin.onInit();
    expect(workerCtor).not.toHaveBeenCalled();
  });

  it('9.4 creates a Worker with type:module when isServerSide() returns false', () => {
    const workerCtor = vi.fn().mockReturnValue({ postMessage: vi.fn(), onmessage: null });
    vi.stubGlobal('Worker', workerCtor);
    const { plugin } = makePlugin({ isServerSide: false });
    plugin.onInit();
    expect(workerCtor).toHaveBeenCalledWith(expect.any(URL), { type: 'module' });
  });

  /** Helper: creates a plugin with a Worker whose onmessage can be captured. */
  function makePluginWithCapturableWorker(weaveOpts: Parameters<typeof makePlugin>[0] = {}) {
    let capturedOnMessage: ((e: MessageEvent) => void) | null = null;
    const workerPostMessage = vi.fn();
    vi.stubGlobal(
      'Worker',
      vi.fn().mockImplementation(function (this: Record<string, unknown>) {
        this.postMessage = workerPostMessage;
        Object.defineProperty(this, 'onmessage', {
          set(fn: (e: MessageEvent) => void) { capturedOnMessage = fn; },
          get() { return capturedOnMessage; },
        });
        return this;
      })
    );
    const { plugin, weave } = makePlugin({ isServerSide: false, ...weaveOpts });
    plugin.onInit();

    function triggerWorkerMessage(width = 100, height = 80) {
      capturedOnMessage!({
        data: { buffer: new ArrayBuffer(8), width, height },
      } as unknown as MessageEvent);
    }

    return { plugin, weave, workerPostMessage, triggerWorkerMessage };
  }

  it('9.5 Worker onmessage: destroys existing minimapStageImage when found', async () => {
    const existingImage = { destroy: vi.fn() };
    const { plugin, triggerWorkerMessage } = makePluginWithCapturableWorker();
    await plugin.setupMinimap();
    konvaState.stageInsts[0].findOne = vi.fn().mockReturnValue(existingImage);
    triggerWorkerMessage();
    expect(existingImage.destroy).toHaveBeenCalled();
  });

  it('9.6 Worker onmessage: no destroy call when findOne returns null', async () => {
    const { plugin, triggerWorkerMessage } = makePluginWithCapturableWorker();
    await plugin.setupMinimap();
    konvaState.stageInsts[0].findOne = vi.fn().mockReturnValue(null);
    expect(() => triggerWorkerMessage()).not.toThrow();
  });

  it('9.7 Worker onmessage: new Konva.Image created with id "minimapStageImage" and listening=false', async () => {
    const { plugin, triggerWorkerMessage } = makePluginWithCapturableWorker();
    await plugin.setupMinimap();
    triggerWorkerMessage();
    const img = konvaState.imageInsts.find((i) => i['id'] === 'minimapStageImage');
    expect(img).toBeDefined();
    expect(img!['listening']).toBe(false);
  });

  it('9.8 Worker onmessage: image added to minimapLayer and moveToBottom() called', async () => {
    const { plugin, triggerWorkerMessage } = makePluginWithCapturableWorker();
    await plugin.setupMinimap();
    const addCallsBefore = konvaState.layerInsts[0].add.mock.calls.length;
    triggerWorkerMessage();
    expect(konvaState.layerInsts[0].add.mock.calls.length).toBeGreaterThan(addCallsBefore);
    const img = konvaState.imageInsts.find((i) => i['id'] === 'minimapStageImage');
    expect(img!['moveToBottom'] as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });

  it('9.9 Worker onmessage: updateMinimapViewportReference() called (setAttrs invoked again)', async () => {
    const { plugin, triggerWorkerMessage } = makePluginWithCapturableWorker();
    await plugin.setupMinimap();
    const rect = konvaState.rectInsts.find((r) => r['id'] === 'minimapViewportReference');
    const setAttrs = rect!['setAttrs'] as ReturnType<typeof vi.fn>;
    const callsBefore = setAttrs.mock.calls.length;
    triggerWorkerMessage();
    expect(setAttrs.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('9.10 throttled onStateChange callback triggers updateMinimapContent and updateMinimapViewportReference', async () => {
    const { plugin, weave, workerPostMessage } = makePluginWithCapturableWorker();
    await plugin.setupMinimap();

    const cb = weave.addEventListener.mock.calls.find(
      (c: unknown[]) => c[0] === 'onStateChange'
    )?.[1] as (() => Promise<void>) | undefined;
    expect(cb).toBeDefined();
    await cb!();
    expect(workerPostMessage).toHaveBeenCalled();
  });
});

// ─── Suite 10: showLayers() / hideLayers() ────────────────────────────────────

describe('WeaveStageMinimapPlugin — showLayers() / hideLayers()', () => {
  beforeEach(() => { stubImageGlobals(); });
  afterEach(() => { teardownImageGlobals(); vi.clearAllMocks(); document.body.innerHTML = ''; });

  async function initPlugin(layers: {
    selectionLayer?: MockLayer | null;
    gridLayer?: MockLayer | null;
    commentsLayer?: MockLayer | null;
  }) {
    const { plugin } = makePlugin(layers);
    await plugin.setupMinimap();
    return plugin;
  }

  it('10.1 hideLayers() calls hide() on selectionLayer when it exists', async () => {
    const selectionLayer = makeLayer();
    const plugin = await initPlugin({ selectionLayer });
    // @ts-expect-error — calling private method
    plugin.hideLayers();
    expect(selectionLayer.hide).toHaveBeenCalled();
  });

  it('10.2 hideLayers() calls hide() on gridLayer when it exists', async () => {
    const gridLayer = makeLayer();
    const plugin = await initPlugin({ gridLayer });
    // @ts-expect-error — calling private method
    plugin.hideLayers();
    expect(gridLayer.hide).toHaveBeenCalled();
  });

  it('10.3 hideLayers() calls hide() on commentsLayer when it exists', async () => {
    const commentsLayer = makeLayer();
    const plugin = await initPlugin({ commentsLayer });
    // @ts-expect-error — calling private method
    plugin.hideLayers();
    expect(commentsLayer.hide).toHaveBeenCalled();
  });

  it('10.4 hideLayers() does not throw when all optional layers are null', async () => {
    const plugin = await initPlugin({ selectionLayer: null, gridLayer: null, commentsLayer: null });
    // @ts-expect-error — calling private method
    expect(() => plugin.hideLayers()).not.toThrow();
  });

  it('10.5 showLayers() calls show() on all three layers when all exist', async () => {
    const selectionLayer = makeLayer();
    const gridLayer = makeLayer();
    const commentsLayer = makeLayer();
    const plugin = await initPlugin({ selectionLayer, gridLayer, commentsLayer });
    // @ts-expect-error — calling private method
    plugin.showLayers();
    expect(selectionLayer.show).toHaveBeenCalled();
    expect(gridLayer.show).toHaveBeenCalled();
    expect(commentsLayer.show).toHaveBeenCalled();
  });

  it('10.6 showLayers() does not throw when all optional layers are null', async () => {
    const plugin = await initPlugin({ selectionLayer: null, gridLayer: null, commentsLayer: null });
    // @ts-expect-error — calling private method
    expect(() => plugin.showLayers()).not.toThrow();
  });
});

// ─── Suite 11: onRender() ─────────────────────────────────────────────────────

describe('WeaveStageMinimapPlugin — onRender()', () => {
  beforeEach(() => { stubImageGlobals(); });
  afterEach(() => { teardownImageGlobals(); vi.clearAllMocks(); document.body.innerHTML = ''; });

  it('11.1 onRender() delegates to setupMinimap()', () => {
    const { plugin } = makePlugin();
    const spy = vi.spyOn(plugin, 'setupMinimap');
    plugin.onRender();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ─── Suite 12: enable() / disable() ──────────────────────────────────────────

describe('WeaveStageMinimapPlugin — enable() / disable()', () => {
  afterEach(() => { vi.clearAllMocks(); document.body.innerHTML = ''; });

  it('12.1 enable() sets enabled to true', () => {
    const { plugin } = makePlugin();
    plugin.disable();
    plugin.enable();
    // @ts-expect-error — accessing protected field
    expect(plugin.enabled).toBe(true);
  });

  it('12.2 disable() sets enabled to false', () => {
    const { plugin } = makePlugin();
    plugin.enable();
    plugin.disable();
    // @ts-expect-error — accessing protected field
    expect(plugin.enabled).toBe(false);
  });
});
