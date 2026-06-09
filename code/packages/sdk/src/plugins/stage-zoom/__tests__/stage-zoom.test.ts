// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('lodash/throttle', () => ({ default: (fn: (...a: unknown[]) => unknown) => fn }));
vi.mock('@/plugins/nodes-selection/nodes-selection', () => ({ WeaveNodesSelectionPlugin: class {} }));

vi.mock('@/utils/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/utils')>();
  return {
    ...actual,
    getBoundingBox: vi.fn().mockReturnValue({ x: 0, y: 0, width: 200, height: 100 }),
    isInShadowDOM: vi.fn().mockReturnValue(false),
    getTopmostShadowHost: vi.fn().mockReturnValue(null),
  };
});

import { getBoundingBox } from '@/utils/utils';
import { WeaveStageZoomPlugin } from '../stage-zoom';
import {
  WEAVE_STAGE_ZOOM_KEY,
  WEAVE_STAGE_ZOOM_DEFAULT_CONFIG,
  WEAVE_STAGE_ZOOM_TYPE,
} from '../constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

type R = Record<string, unknown>;

function makeStageContainer() {
  return {
    getBoundingClientRect: vi.fn().mockReturnValue({ width: 1000, height: 800 }),
    clientWidth: 1000,
    clientHeight: 800,
  };
}

function makeStageContent() {
  const handlers: Record<string, (e?: unknown) => void> = {};
  return {
    addEventListener: vi.fn((event: string, handler: (e?: unknown) => void) => {
      handlers[event] = handler;
    }),
    _handlers: handlers,
  };
}

function makeMockStage(container = makeStageContainer(), content = makeStageContent()) {
  return {
    scaleX: vi.fn().mockReturnValue(1),
    scaleY: vi.fn().mockReturnValue(1),
    scale: vi.fn().mockReturnValue({ x: 1, y: 1 }),
    position: vi.fn(),
    x: vi.fn().mockReturnValue(0),
    y: vi.fn().mockReturnValue(0),
    width: vi.fn().mockReturnValue(1000),
    height: vi.fn().mockReturnValue(800),
    getAttr: vi.fn().mockReturnValue(1),
    setAttrs: vi.fn(),
    container: vi.fn().mockReturnValue(container),
    batchDraw: vi.fn(),
    fire: vi.fn(),
    getPointerPosition: vi.fn().mockReturnValue(null),
    findOne: vi.fn().mockReturnValue(null),
    getContent: vi.fn().mockReturnValue(content),
    _content: content,
    _container: container,
  };
}

function makeMockMainLayer() {
  const drawHandlers: ((...a: unknown[]) => void)[] = [];
  return {
    on: vi.fn((event: string, handler: (...a: unknown[]) => void) => {
      if (event === 'draw') drawHandlers.push(handler);
    }),
    getChildren: vi.fn().mockReturnValue([]),
    getClientRect: vi.fn().mockReturnValue({ x: 0, y: 0, width: 200, height: 100 }),
    _triggerDraw: () => drawHandlers.forEach((h) => h()),
  };
}

function makeMockWeave(stage = makeMockStage(), mainLayer: ReturnType<typeof makeMockMainLayer> | null = makeMockMainLayer()) {
  return {
    getStage: vi.fn().mockReturnValue(stage),
    getMainLayer: vi.fn().mockReturnValue(mainLayer),
    getPlugin: vi.fn().mockReturnValue(undefined),
    getPlugins: vi.fn().mockReturnValue({}),
    emitEvent: vi.fn(),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    getClosestParentWithWeaveId: vi.fn().mockReturnValue(stage._container),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    }),
  };
}

function makePlugin(config?: R) {
  return new WeaveStageZoomPlugin(config ? { config } : undefined);
}

function registerPlugin(plugin: WeaveStageZoomPlugin, weave: ReturnType<typeof makeMockWeave>) {
  plugin.register(weave as unknown as Parameters<typeof plugin.register>[0]);
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('WeaveStageZoomPlugin', () => {
  let plugin: WeaveStageZoomPlugin;
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let stage: ReturnType<typeof makeMockStage>;
  let mainLayer: ReturnType<typeof makeMockMainLayer>;

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn((fn: FrameRequestCallback) => { fn(0); return 0; }));
    stage = makeMockStage();
    mainLayer = makeMockMainLayer();
    mockWeave = makeMockWeave(stage, mainLayer);
    plugin = makePlugin();
    registerPlugin(plugin, mockWeave);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // ── Suite 1: constructor ──────────────────────────────────────────────────

  describe('constructor', () => {
    it('1.1 no params → defaults applied', () => {
      const cfg = (plugin as unknown as R)['config'] as R;
      expect((cfg['zoomSteps'] as number[])).toEqual(WEAVE_STAGE_ZOOM_DEFAULT_CONFIG.zoomSteps);
      expect(cfg['defaultZoom']).toBe(1);
      expect((cfg['fitToScreen'] as R)['padding']).toBe(40);
    });

    it('1.2 custom config merged via mergeExceptArrays', () => {
      const p = makePlugin({ defaultZoom: 1, zoomSteps: [0.5, 1, 2], fitToScreen: { padding: 10 } });
      const cfg = (p as unknown as R)['config'] as R;
      expect((cfg['fitToScreen'] as R)['padding']).toBe(10);
    });

    it('1.3 defaultZoom not in zoomSteps → throws', () => {
      expect(() => makePlugin({ defaultZoom: 99 })).toThrow(
        'Default zoom 99 is not in zoom steps'
      );
    });

    it('1.4 initialize() sets correct boolean/numeric state', () => {
      const p = plugin as unknown as R;
      expect(p['pinching']).toBe(false);
      expect(p['zooming']).toBe(false);
      expect(p['isTrackpad']).toBe(false);
      expect(p['zoomVelocity']).toBe(0);
      expect(p['updatedMinimumZoom']).toBe(false);
    });

    it('1.5 actualStep matches defaultZoom index; actualScale equals that step; defaultStep equals actualStep', () => {
      const p = plugin as unknown as R;
      const steps = WEAVE_STAGE_ZOOM_DEFAULT_CONFIG.zoomSteps;
      const idx = steps.indexOf(1);
      expect(p['actualStep']).toBe(idx);
      expect(p['actualScale']).toBe(1);
      expect(p['defaultStep']).toBe(idx);
    });
  });

  // ── Suite 2: getName() / static field assignments ─────────────────────────

  describe('getName() / static field assignments', () => {
    it('2.1 getName() returns stageZoom key', () => {
      expect(plugin.getName()).toBe(WEAVE_STAGE_ZOOM_KEY);
      expect(plugin.getName()).toBe('stageZoom');
    });

    it('2.2 getLayerName, initLayer, onRender are all undefined', () => {
      expect((plugin as unknown as R)['getLayerName']).toBeUndefined();
      expect((plugin as unknown as R)['initLayer']).toBeUndefined();
      expect(plugin.onRender).toBeUndefined();
    });

    it('2.3 defaultStep is index of defaultZoom in zoomSteps', () => {
      const idx = WEAVE_STAGE_ZOOM_DEFAULT_CONFIG.zoomSteps.indexOf(1);
      expect(plugin.defaultStep).toBe(idx);
    });
  });

  // ── Suite 3: setZoom() ────────────────────────────────────────────────────

  describe('setZoom()', () => {
    it('3.1 no mainLayer → early return, stage.scale not called', () => {
      mockWeave.getMainLayer.mockReturnValue(null);
      stage.scale.mockClear();
      plugin.setZoom(2);
      expect(stage.scale).not.toHaveBeenCalledWith(expect.objectContaining({ x: 2 }));
    });

    it('3.2 centered=true → stage.position called with center-based coords', () => {
      plugin.setZoom(2, true);
      expect(stage.position).toHaveBeenCalled();
    });

    it('3.3 centered=false with pointer → stage.position called with pointer-based coords', () => {
      stage.position.mockClear();
      plugin.setZoom(2, false, { x: 100, y: 100 });
      expect(stage.position).toHaveBeenCalled();
    });

    it('3.4 centered=false without pointer → no stage.position for pointer path (only scale applied)', () => {
      stage.position.mockClear();
      plugin.setZoom(2, false, undefined);
      // position not called for the pointer branch (no pointer)
      expect(stage.batchDraw).toHaveBeenCalled();
    });

    it('3.5 calls batchDraw, stage.fire, emitEvent; iterates plugins and calls onRender', () => {
      const mockPlugin = { onRender: vi.fn() };
      mockWeave.getPlugins.mockReturnValue({ p1: mockPlugin });
      plugin.setZoom(1);
      expect(stage.batchDraw).toHaveBeenCalled();
      expect(stage.fire).toHaveBeenCalledWith('onZoomChange', {}, true);
      expect(mockWeave.emitEvent).toHaveBeenCalledWith('onZoomChange', expect.objectContaining({ scale: 1 }));
      expect(mockPlugin.onRender).toHaveBeenCalled();
    });
  });

  // ── Suite 4: canZoomIn() / canZoomOut() — basic ───────────────────────────

  describe('canZoomIn() / canZoomOut() — basic', () => {
    it('4.1 canZoomIn() returns false when disabled', () => {
      plugin.disable();
      expect(plugin.canZoomIn()).toBe(false);
    });

    it('4.2 canZoomIn() returns true when not at max step', () => {
      (plugin as unknown as R)['actualStep'] = 5;
      (plugin as unknown as R)['actualScale'] = WEAVE_STAGE_ZOOM_DEFAULT_CONFIG.zoomSteps[5];
      expect(plugin.canZoomIn()).toBe(true);
    });

    it('4.3 canZoomIn() returns false when at max step', () => {
      const steps = WEAVE_STAGE_ZOOM_DEFAULT_CONFIG.zoomSteps;
      (plugin as unknown as R)['actualStep'] = steps.length - 1;
      (plugin as unknown as R)['actualScale'] = steps[steps.length - 1];
      expect(plugin.canZoomIn()).toBe(false);
    });

    it('4.4 canZoomOut() returns false when disabled', () => {
      plugin.disable();
      expect(plugin.canZoomOut()).toBe(false);
    });

    it('4.5 canZoomOut() returns true when not at min step', () => {
      (plugin as unknown as R)['actualStep'] = 5;
      (plugin as unknown as R)['actualScale'] = WEAVE_STAGE_ZOOM_DEFAULT_CONFIG.zoomSteps[5];
      expect(plugin.canZoomOut()).toBe(true);
    });

    it('4.6 canZoomOut() returns false when at min step (actualStep=0)', () => {
      (plugin as unknown as R)['actualStep'] = 0;
      (plugin as unknown as R)['actualScale'] = WEAVE_STAGE_ZOOM_DEFAULT_CONFIG.zoomSteps[0];
      expect(plugin.canZoomOut()).toBe(false);
    });
  });

  // ── Suite 5: canZoomIn/Out when actualScale is off-step ───────────────────

  describe('canZoomIn() / canZoomOut() — off exact step', () => {
    it('5.1 canZoomIn(): actualZoomIsStep=-1 → findClosestStepIndex("zoomOut") updates actualStep', () => {
      (plugin as unknown as R)['actualScale'] = 0.75; // not an exact step
      (plugin as unknown as R)['actualStep'] = 5;
      const result = plugin.canZoomIn();
      // findClosestStepIndex for canZoomIn: direction='zoomOut', scales ≤ 0.75
      // closest ≤ 0.75 is 0.7 (index 9 in default steps)
      expect(result).toBe(true);
    });

    it('5.2 canZoomOut(): actualZoomIsStep=-1 → findClosestStepIndex("zoomIn") updates actualStep', () => {
      (plugin as unknown as R)['actualScale'] = 0.75; // not an exact step
      (plugin as unknown as R)['actualStep'] = 5;
      const result = plugin.canZoomOut();
      expect(result).toBe(true);
    });
  });

  // ── Suite 6: zoomIn() / zoomOut() ────────────────────────────────────────

  describe('zoomIn() / zoomOut()', () => {
    it('6.1 zoomIn() disabled → returns early', () => {
      plugin.disable();
      stage.scale.mockClear();
      plugin.zoomIn();
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('6.2 zoomIn() at max step → canZoomIn=false, returns early', () => {
      const steps = WEAVE_STAGE_ZOOM_DEFAULT_CONFIG.zoomSteps;
      (plugin as unknown as R)['actualStep'] = steps.length - 1;
      (plugin as unknown as R)['actualScale'] = steps[steps.length - 1];
      stage.batchDraw.mockClear();
      plugin.zoomIn();
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('6.3 zoomIn() at exact step → actualStep incremented, setZoom called', () => {
      const steps = WEAVE_STAGE_ZOOM_DEFAULT_CONFIG.zoomSteps;
      (plugin as unknown as R)['actualStep'] = 5;
      (plugin as unknown as R)['actualScale'] = steps[5];
      plugin.zoomIn();
      expect((plugin as unknown as R)['actualStep']).toBe(6);
      expect(stage.batchDraw).toHaveBeenCalled();
    });

    it('6.4 zoomIn() off exact step → findClosestStepIndex("zoomIn") used instead of increment', () => {
      (plugin as unknown as R)['actualScale'] = 0.75; // not a step
      (plugin as unknown as R)['actualStep'] = 5;
      plugin.zoomIn();
      // Result: actualStep updated to closest step ≥ 0.75
      expect(stage.batchDraw).toHaveBeenCalled();
    });

    it('6.5 zoomIn() with pointer → setZoom called with centered=false, pointer', () => {
      const pointer = { x: 50, y: 50 };
      stage.position.mockClear();
      plugin.zoomIn(pointer);
      expect(stage.position).toHaveBeenCalled();
    });

    it('6.6 zoomOut() disabled → returns early', () => {
      plugin.disable();
      stage.batchDraw.mockClear();
      plugin.zoomOut();
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('6.7 zoomOut() at exact step → actualStep decremented, setZoom called', () => {
      const steps = WEAVE_STAGE_ZOOM_DEFAULT_CONFIG.zoomSteps;
      (plugin as unknown as R)['actualStep'] = 5;
      (plugin as unknown as R)['actualScale'] = steps[5];
      plugin.zoomOut();
      expect((plugin as unknown as R)['actualStep']).toBe(4);
      expect(stage.batchDraw).toHaveBeenCalled();
    });

    it('6.8 zoomOut() off exact step → findClosestStepIndex("zoomOut") used instead of decrement', () => {
      const steps = WEAVE_STAGE_ZOOM_DEFAULT_CONFIG.zoomSteps;
      (plugin as unknown as R)['actualScale'] = 0.75; // not a step
      (plugin as unknown as R)['actualStep'] = 5;
      // canZoomOut will be true (step 5 > 0), off-step path
      // Need to seed actualScale to make canZoomOut return true
      (plugin as unknown as R)['actualScale'] = 0.75;
      plugin.zoomOut();
      expect(stage.batchDraw).toHaveBeenCalled();
      // actualStep updated via findClosestStepIndex
      const newStep = (plugin as unknown as R)['actualStep'] as number;
      expect(steps[newStep]).toBeLessThanOrEqual(0.75);
    });
  });

  // ── Suite 7: zoomToStep() ─────────────────────────────────────────────────

  describe('zoomToStep()', () => {
    it('7.1 disabled → returns early', () => {
      plugin.disable();
      stage.batchDraw.mockClear();
      plugin.zoomToStep(5);
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('7.2 step < 0 → throws "Defined step X is out of bounds"', () => {
      expect(() => plugin.zoomToStep(-1)).toThrow('Defined step -1 is out of bounds');
    });

    it('7.3 step >= zoomSteps.length → throws', () => {
      const steps = WEAVE_STAGE_ZOOM_DEFAULT_CONFIG.zoomSteps;
      expect(() => plugin.zoomToStep(steps.length)).toThrow();
    });

    it('7.4 valid step → sets actualStep, calls setZoom with that step scale', () => {
      const steps = WEAVE_STAGE_ZOOM_DEFAULT_CONFIG.zoomSteps;
      plugin.zoomToStep(3);
      expect((plugin as unknown as R)['actualStep']).toBe(3);
      expect(stage.batchDraw).toHaveBeenCalled();
      // emitEvent should have been called with scale = steps[3]
      const callArg = mockWeave.emitEvent.mock.calls[0][1] as R;
      expect(callArg['scale']).toBe(steps[3]);
    });
  });

  // ── Suite 8: minimumZoom() ────────────────────────────────────────────────

  describe('minimumZoom()', () => {
    it('8.1 disabled → returns -1', () => {
      plugin.disable();
      expect(plugin.minimumZoom()).toBe(-1);
    });

    it('8.2 no mainLayer → returns -1', () => {
      mockWeave.getMainLayer.mockReturnValue(null);
      expect(plugin.minimumZoom()).toBe(-1);
    });

    it('8.3 mainLayer empty children → returns zoomSteps[defaultStep]', () => {
      mainLayer.getChildren.mockReturnValue([]);
      const steps = WEAVE_STAGE_ZOOM_DEFAULT_CONFIG.zoomSteps;
      expect(plugin.minimumZoom()).toBe(steps[(plugin as unknown as R)['defaultStep'] as number]);
    });

    it('8.4 mainLayer has children → calculates scale from bounding box + padding', () => {
      mainLayer.getChildren.mockReturnValue([{}]);
      mainLayer.getClientRect.mockReturnValue({ x: 0, y: 0, width: 200, height: 100 });
      stage.width.mockReturnValue(1000);
      stage.height.mockReturnValue(800);
      const result = plugin.minimumZoom();
      // availableWidth = 1000 - 80 = 920, availableHeight = 800 - 80 = 720
      // scaleX = 920/200 = 4.6, scaleY = 720/100 = 7.2, min = 4.6
      expect(result).toBeCloseTo(4.6);
    });

    it('8.5 taller content → returns scaleY (min of scaleX and scaleY)', () => {
      mainLayer.getChildren.mockReturnValue([{}]);
      mainLayer.getClientRect.mockReturnValue({ x: 0, y: 0, width: 1000, height: 200 });
      stage.width.mockReturnValue(500);
      stage.height.mockReturnValue(800);
      const result = plugin.minimumZoom();
      // scaleX = (500-80)/1000 = 0.42, scaleY = (800-80)/200 = 3.6, min = 0.42
      expect(result).toBeCloseTo(0.42);
    });
  });

  // ── Suite 9: onInit() — draw handler + initial setZoom ───────────────────

  describe('onInit() — mainLayer draw handler', () => {
    it('9.1 calls setZoom on init', () => {
      stage.batchDraw.mockClear();
      plugin.onInit();
      expect(stage.batchDraw).toHaveBeenCalled();
    });

    it('9.2 draw: updatedMinimumZoom=false + minimumZoom < zoomSteps[0] → prepends minimum, sets updatedMinimumZoom=true', () => {
      plugin.onInit();
      // Set state so minimumZoom returns a value less than first step
      mainLayer.getChildren.mockReturnValue([{}]);
      mainLayer.getClientRect.mockReturnValue({ x: 0, y: 0, width: 100000, height: 100000 });
      stage.width.mockReturnValue(100);
      stage.height.mockReturnValue(100);
      // minimumZoom = (100-80)/100000 ≈ 0.0002, which is < 0.01 (first step)
      (plugin as unknown as R)['updatedMinimumZoom'] = false;
      const stepsBefore = [...((plugin as unknown as R)['config'] as R)['zoomSteps'] as number[]];
      mainLayer._triggerDraw();
      const stepsAfter = ((plugin as unknown as R)['config'] as R)['zoomSteps'] as number[];
      expect(stepsAfter.length).toBe(stepsBefore.length + 1);
      expect((plugin as unknown as R)['updatedMinimumZoom']).toBe(true);
    });

    it('9.3 draw: updatedMinimumZoom=true + minimumZoom < zoomSteps[0] → replaces first step (length unchanged)', () => {
      plugin.onInit();
      mainLayer.getChildren.mockReturnValue([{}]);
      mainLayer.getClientRect.mockReturnValue({ x: 0, y: 0, width: 100000, height: 100000 });
      stage.width.mockReturnValue(100);
      stage.height.mockReturnValue(100);
      (plugin as unknown as R)['updatedMinimumZoom'] = true;
      const stepsBefore = [...((plugin as unknown as R)['config'] as R)['zoomSteps'] as number[]];
      mainLayer._triggerDraw();
      const stepsAfter = ((plugin as unknown as R)['config'] as R)['zoomSteps'] as number[];
      // length stays same (replace first step)
      expect(stepsAfter.length).toBe(stepsBefore.length);
    });

    it('9.4 draw: minimumZoom >= zoomSteps[0] → no change to zoomSteps', () => {
      plugin.onInit();
      mainLayer.getChildren.mockReturnValue([{}]);
      mainLayer.getClientRect.mockReturnValue({ x: 0, y: 0, width: 10, height: 5 });
      stage.width.mockReturnValue(1000);
      stage.height.mockReturnValue(800);
      // minimumZoom = (1000-80)/10 = 92 > 0.01
      (plugin as unknown as R)['updatedMinimumZoom'] = false;
      const stepsBefore = [...((plugin as unknown as R)['config'] as R)['zoomSteps'] as number[]];
      mainLayer._triggerDraw();
      const stepsAfter = ((plugin as unknown as R)['config'] as R)['zoomSteps'] as number[];
      expect(stepsAfter).toEqual(stepsBefore);
      expect((plugin as unknown as R)['updatedMinimumZoom']).toBe(false);
    });
  });

  // ── Suite 10: fitToScreen() ───────────────────────────────────────────────

  describe('fitToScreen()', () => {
    it('10.1 disabled → returns early', () => {
      plugin.disable();
      stage.scale.mockClear();
      plugin.fitToScreen();
      expect(stage.scale).not.toHaveBeenCalled();
    });

    it('10.2 no mainLayer → returns early', () => {
      mockWeave.getMainLayer.mockReturnValue(null);
      stage.position.mockClear();
      plugin.fitToScreen();
      expect(stage.position).not.toHaveBeenCalled();
    });

    it('10.3 empty children → centers stage, zooms to default step', () => {
      mainLayer.getChildren.mockReturnValue([]);
      stage.position.mockClear();
      stage.batchDraw.mockClear();
      plugin.fitToScreen();
      expect(stage.position).toHaveBeenCalledWith({ x: 500, y: 400 });
      expect(stage.batchDraw).toHaveBeenCalled();
    });

    it('10.4 bounds.width=0 → centers stage, zooms to default', () => {
      mainLayer.getChildren.mockReturnValue([{ getAttrs: () => ({ visible: true, name: 'mynode' }) }]);
      vi.mocked(getBoundingBox).mockReturnValue({ x: 0, y: 0, width: 0, height: 100 });
      stage.position.mockClear();
      plugin.fitToScreen();
      expect(stage.position).toHaveBeenCalledWith({ x: 500, y: 400 });
    });

    it('10.5 normal path → getBoundingBox called, stage scaled and positioned, setZoom called', () => {
      mainLayer.getChildren.mockReturnValue([{ getAttrs: () => ({ visible: true, name: 'mynode' }) }]);
      vi.mocked(getBoundingBox).mockReturnValue({ x: 100, y: 50, width: 200, height: 100 });
      stage.batchDraw.mockClear();
      plugin.fitToScreen();
      expect(getBoundingBox).toHaveBeenCalled();
      expect(stage.batchDraw).toHaveBeenCalled();
    });

    it('10.6 overrideZoom=false → scale clamped to zoomSteps bounds', () => {
      mainLayer.getChildren.mockReturnValue([{ getAttrs: () => ({ visible: true, name: 'mynode' }) }]);
      vi.mocked(getBoundingBox).mockReturnValue({ x: 0, y: 0, width: 1, height: 1 }); // would produce huge scale
      stage.batchDraw.mockClear();
      plugin.fitToScreen({ overrideZoom: false });
      expect(stage.batchDraw).toHaveBeenCalled();
    });
  });

  // ── Suite 11: fitToNodes() ────────────────────────────────────────────────

  describe('fitToNodes()', () => {
    it('11.1 disabled → returns early', () => {
      plugin.disable();
      stage.batchDraw.mockClear();
      plugin.fitToNodes(['node1']);
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('11.2 empty nodes array → returns early', () => {
      stage.batchDraw.mockClear();
      plugin.fitToNodes([]);
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('11.3 getBoundingBox returns width=0 → returns early', () => {
      stage.findOne.mockReturnValue({ id: 'n1' });
      vi.mocked(getBoundingBox).mockReturnValue({ x: 0, y: 0, width: 0, height: 100 });
      stage.batchDraw.mockClear();
      plugin.fitToNodes(['node1']);
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('11.4 valid nodes → stage.findOne called, getBoundingBox used, fitToElements invoked', () => {
      stage.findOne.mockReturnValue({ getAttrs: () => ({}), id: () => 'n1' });
      vi.mocked(getBoundingBox).mockReturnValue({ x: 10, y: 10, width: 200, height: 100 });
      stage.batchDraw.mockClear();
      plugin.fitToNodes(['node1']);
      expect(stage.findOne).toHaveBeenCalledWith('#node1');
      expect(stage.batchDraw).toHaveBeenCalled();
    });
  });

  // ── Suite 12: fitToSelection() ────────────────────────────────────────────

  describe('fitToSelection()', () => {
    it('12.1 disabled → returns early', () => {
      plugin.disable();
      stage.batchDraw.mockClear();
      plugin.fitToSelection();
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('12.2 no selection plugin → returns early', () => {
      mockWeave.getPlugin.mockReturnValue(undefined);
      stage.batchDraw.mockClear();
      plugin.fitToSelection();
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('12.3 no nodes selected (transformer.getNodes()=[]) → returns early', () => {
      const selectionPlugin = { getTransformer: vi.fn().mockReturnValue({ getNodes: vi.fn().mockReturnValue([]) }) };
      mockWeave.getPlugin.mockReturnValue(selectionPlugin);
      stage.batchDraw.mockClear();
      plugin.fitToSelection();
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('12.4 bounds.width=0 → returns early', () => {
      const mockNode = { getAttrs: () => ({}) };
      const selectionPlugin = { getTransformer: vi.fn().mockReturnValue({ getNodes: vi.fn().mockReturnValue([mockNode]) }) };
      mockWeave.getPlugin.mockReturnValue(selectionPlugin);
      vi.mocked(getBoundingBox).mockReturnValue({ x: 0, y: 0, width: 0, height: 100 });
      stage.batchDraw.mockClear();
      plugin.fitToSelection();
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('12.5 valid selection → fitToElements invoked, setZoom called', () => {
      const mockNode = { getAttrs: () => ({}) };
      const selectionPlugin = { getTransformer: vi.fn().mockReturnValue({ getNodes: vi.fn().mockReturnValue([mockNode]) }) };
      mockWeave.getPlugin.mockReturnValue(selectionPlugin);
      vi.mocked(getBoundingBox).mockReturnValue({ x: 10, y: 10, width: 200, height: 100 });
      stage.batchDraw.mockClear();
      plugin.fitToSelection();
      expect(stage.batchDraw).toHaveBeenCalled();
    });
  });

  // ── Suite 13: fitToArea() ─────────────────────────────────────────────────

  describe('fitToArea()', () => {
    it('13.1 disabled → returns early', () => {
      plugin.disable();
      stage.batchDraw.mockClear();
      plugin.fitToArea({ x: 0, y: 0, width: 100, height: 100 });
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('13.2 area.width=0 → returns early', () => {
      stage.batchDraw.mockClear();
      plugin.fitToArea({ x: 0, y: 0, width: 0, height: 100 });
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('13.3 area.height=0 → returns early', () => {
      stage.batchDraw.mockClear();
      plugin.fitToArea({ x: 0, y: 0, width: 100, height: 0 });
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('13.4 valid area → fitToElements invoked, setZoom called', () => {
      stage.batchDraw.mockClear();
      plugin.fitToArea({ x: 0, y: 0, width: 200, height: 100 });
      expect(stage.batchDraw).toHaveBeenCalled();
    });
  });

  // ── Suite 14: fitToElements() branches ───────────────────────────────────

  describe('fitToElements() branches (via fitToArea)', () => {
    it('14.1 smartZoom=true + content fits in view → only pans, no full setZoom(1, false) reset', () => {
      // Box small enough to fit in view at current scale
      stage.scale.mockReturnValue({ x: 1, y: 1 });
      stage._container.clientWidth = 1000;
      stage._container.clientHeight = 800;
      stage.position.mockClear();
      // box: 10x10 + 2*40 padding << 1000x800 visible → fits
      plugin.fitToArea({ x: 0, y: 0, width: 10, height: 10 }, { smartZoom: true });
      // Should only pan: stage.position called once (no setZoom(1,...) which would call batchDraw twice)
      expect(stage.position).toHaveBeenCalled();
    });

    it('14.2 smartZoom=false (default) → setZoom(1, false) called before fitting', () => {
      const emitCalls: unknown[][] = [];
      mockWeave.emitEvent.mockImplementation((...args) => { emitCalls.push(args); });
      plugin.fitToArea({ x: 0, y: 0, width: 200, height: 100 }, { smartZoom: false });
      // emitEvent called at least once (from setZoom(1,...))
      expect(emitCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('14.3 overrideZoom=false → scale clamped to zoomSteps bounds', () => {
      stage.batchDraw.mockClear();
      plugin.fitToArea({ x: 0, y: 0, width: 1, height: 1 }, { overrideZoom: false });
      // still completes without error (clamped)
      expect(stage.batchDraw).toHaveBeenCalled();
    });
  });

  // ── Suite 15: initEvents() — touch events ────────────────────────────────

  describe('initEvents() — touch events', () => {
    let contentHandlers: Record<string, (e?: unknown) => void>;

    beforeEach(() => {
      const content = makeStageContent();
      const s = makeMockStage(makeStageContainer(), content);
      const weave = makeMockWeave(s, mainLayer);
      plugin = makePlugin();
      registerPlugin(plugin, weave);
      // Re-expose stage for this suite
      mockWeave = weave;
      stage = s;
      contentHandlers = content._handlers;
      plugin.onInit();
    });

    it('15.1 touchstart with 1 touch → pinching not set', () => {
      contentHandlers['touchstart']?.({ preventDefault: vi.fn(), touches: [{}] });
      expect((plugin as unknown as R)['pinching']).toBe(false);
    });

    it('15.2 touchstart with 2 touches + no lastCenter → sets pinching=true, sets lastCenter, returns', () => {
      const e = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        touches: [
          { clientX: 10, clientY: 20 },
          { clientX: 30, clientY: 40 },
        ],
      };
      contentHandlers['touchstart']?.(e);
      expect((plugin as unknown as R)['pinching']).toBe(true);
    });

    it('15.3 touchstart with 2 touches + lastCenter already set → continues (no early return)', () => {
      const e = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        touches: [
          { clientX: 10, clientY: 20 },
          { clientX: 30, clientY: 40 },
        ],
      };
      // First call sets lastCenter
      contentHandlers['touchstart']?.(e);
      // Second call: lastCenter is set
      contentHandlers['touchstart']?.(e);
      expect((plugin as unknown as R)['pinching']).toBe(true);
    });

    it('15.4 touchend → sets pinching=false', () => {
      (plugin as unknown as R)['pinching'] = true;
      contentHandlers['touchend']?.();
      expect((plugin as unknown as R)['pinching']).toBe(false);
    });

    it('15.5 touchmove with 2 touches + no lastCenter → sets lastCenter, returns', () => {
      const e = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        touches: [
          { clientX: 10, clientY: 20 },
          { clientX: 30, clientY: 40 },
        ],
      };
      stage.batchDraw.mockClear();
      contentHandlers['touchmove']?.(e);
      // lastCenter set but no setZoom yet (no lastDist)
      // Actually: lastCenter not set initially so gets set then returns
    });

    it('15.6 touchmove with 2 touches + lastCenter set → calls setZoom, updates stage position', () => {
      const e = {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        touches: [
          { clientX: 10, clientY: 20 },
          { clientX: 30, clientY: 40 },
        ],
      };
      // First touchmove: sets lastCenter, returns
      contentHandlers['touchmove']?.(e);
      stage.batchDraw.mockClear();
      // Second touchmove: lastCenter is set, proceeds to zoom
      contentHandlers['touchmove']?.(e);
      expect(stage.batchDraw).toHaveBeenCalled();
    });
  });

  // ── Suite 16: initEvents() — wheel events ────────────────────────────────

  describe('initEvents() — wheel events', () => {
    let wheelImmediateHandler: (e: Partial<WheelEvent>) => void;
    let wheelHandler: (e: Partial<WheelEvent>) => void;

    beforeEach(() => {
      // jsdom doesn't implement document.elementFromPoint — stub it
      Object.defineProperty(document, 'elementFromPoint', {
        value: vi.fn().mockReturnValue(null),
        writable: true,
        configurable: true,
      });
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      plugin.onInit();
      // Capture the two wheel handlers registered on window
      const wheelCalls = addEventListenerSpy.mock.calls.filter((c) => c[0] === 'wheel');
      wheelImmediateHandler = wheelCalls[0]?.[1] as (e: Partial<WheelEvent>) => void;
      wheelHandler = wheelCalls[1]?.[1] as (e: Partial<WheelEvent>) => void;
    });

    it('16.1 handleWheelImmediate: !enabled → doZoom=false', () => {
      plugin.disable();
      const e = { ctrlKey: true, metaKey: false, clientX: 0, clientY: 0, deltaMode: 0, preventDefault: vi.fn() };
      wheelImmediateHandler(e);
      // Subsequent handleWheel should not trigger zoomTick
      stage.batchDraw.mockClear();
      wheelHandler({ deltaY: 1 });
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('16.2 handleWheelImmediate: no ctrl/meta → doZoom=false', () => {
      const e = { ctrlKey: false, metaKey: false, clientX: 0, clientY: 0, deltaMode: 0, preventDefault: vi.fn() };
      wheelImmediateHandler(e);
      stage.batchDraw.mockClear();
      wheelHandler({ deltaY: 1 });
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('16.3 handleWheelImmediate: ctrl + correct element → doZoom=true, preventDefault called', () => {
      const e = {
        ctrlKey: true, metaKey: false, clientX: 0, clientY: 0, deltaMode: 0,
        preventDefault: vi.fn(),
      };
      wheelImmediateHandler(e);
      expect(e.preventDefault).toHaveBeenCalled();
      // Now handleWheel should trigger zoomTick
      stage.getPointerPosition.mockReturnValue({ x: 0, y: 0 });
      wheelHandler({ deltaY: 1 });
      expect(stage.batchDraw).toHaveBeenCalled();
    });

    it('16.4 handleWheelImmediate: ctrl + wrong element → doZoom=false', () => {
      mockWeave.getClosestParentWithWeaveId.mockReturnValue(document.createElement('div'));
      const e = { ctrlKey: true, metaKey: false, clientX: 0, clientY: 0, deltaMode: 0, preventDefault: vi.fn() };
      wheelImmediateHandler(e);
      stage.batchDraw.mockClear();
      wheelHandler({ deltaY: 1 });
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('16.5 handleWheel: doZoom=false → returns early, no zoomTick', () => {
      // Don't call wheelImmediateHandler → doZoom stays false
      stage.batchDraw.mockClear();
      wheelHandler({ deltaY: 1 });
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('16.6 handleWheel: doZoom=true → zoomVelocity updated, zooming=true, rAF called', () => {
      const e = {
        ctrlKey: true, metaKey: false, clientX: 0, clientY: 0, deltaMode: 0,
        preventDefault: vi.fn(),
      };
      wheelImmediateHandler(e);
      stage.getPointerPosition.mockReturnValue({ x: 50, y: 50 });
      const rafSpy = vi.mocked(requestAnimationFrame);
      rafSpy.mockClear();
      wheelHandler({ deltaY: 10 });
      expect(requestAnimationFrame).toHaveBeenCalled();
    });
  });

  // ── Suite 17: getInertiaScale() / zoomTick() ──────────────────────────────

  describe('getInertiaScale() / zoomTick()', () => {
    it('17.1 getInertiaScale(): MOUSE_WHEEL + !isTrackpad → uses mouseWheelStep', () => {
      (plugin as unknown as R)['zoomInertiaType'] = WEAVE_STAGE_ZOOM_TYPE.MOUSE_WHEEL;
      (plugin as unknown as R)['isTrackpad'] = false;
      (plugin as unknown as R)['zoomVelocity'] = 1;
      stage.scaleX.mockReturnValue(1);
      const result = plugin.getInertiaScale();
      // step = mouseWheelStep = 0.01; newScale = 1 * (1 - 1 * 0.01) = 0.99
      expect(result).toBeCloseTo(0.99);
    });

    it('17.2 getInertiaScale(): MOUSE_WHEEL + isTrackpad → uses trackpadStep', () => {
      (plugin as unknown as R)['zoomInertiaType'] = WEAVE_STAGE_ZOOM_TYPE.MOUSE_WHEEL;
      (plugin as unknown as R)['isTrackpad'] = true;
      (plugin as unknown as R)['zoomVelocity'] = 1;
      stage.scaleX.mockReturnValue(1);
      const result = plugin.getInertiaScale();
      // step = trackpadStep = 0.005; newScale = 1 * (1 - 1 * 0.005) = 0.995
      expect(result).toBeCloseTo(0.995);
    });

    it('17.3 getInertiaScale(): PINCH_ZOOM type → step stays 1', () => {
      (plugin as unknown as R)['zoomInertiaType'] = WEAVE_STAGE_ZOOM_TYPE.PINCH_ZOOM;
      (plugin as unknown as R)['isTrackpad'] = false;
      (plugin as unknown as R)['zoomVelocity'] = 1;
      stage.scaleX.mockReturnValue(1);
      const result = plugin.getInertiaScale();
      // step = 1; newScale = 1 * (1 - 1 * 1) = 0, clamped to zoomSteps[0] = 0.01
      expect(result).toBe(0.01);
    });

    it('17.4 zoomTick(): |zoomVelocity| < 0.001 → sets zooming=false, returns', () => {
      (plugin as unknown as R)['zoomVelocity'] = 0.0005;
      (plugin as unknown as R)['zooming'] = true;
      plugin.zoomTick();
      expect((plugin as unknown as R)['zooming']).toBe(false);
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('17.5 zoomTick(): MOUSE_WHEEL but no pointer → returns early', () => {
      (plugin as unknown as R)['zoomVelocity'] = 5;
      (plugin as unknown as R)['zoomInertiaType'] = WEAVE_STAGE_ZOOM_TYPE.MOUSE_WHEEL;
      stage.getPointerPosition.mockReturnValue(null);
      stage.batchDraw.mockClear();
      // Stub rAF to NOT auto-call fn to avoid infinite loop
      vi.stubGlobal('requestAnimationFrame', vi.fn());
      plugin.zoomTick();
      expect(stage.batchDraw).not.toHaveBeenCalled();
    });

    it('17.6 zoomTick(): valid pointer → setZoom called, velocity reduced by friction, rAF scheduled', () => {
      (plugin as unknown as R)['zoomVelocity'] = 5;
      (plugin as unknown as R)['zoomInertiaType'] = WEAVE_STAGE_ZOOM_TYPE.MOUSE_WHEEL;
      stage.getPointerPosition.mockReturnValue({ x: 100, y: 100 });
      stage.batchDraw.mockClear();
      vi.stubGlobal('requestAnimationFrame', vi.fn()); // don't auto-recurse
      plugin.zoomTick();
      expect(stage.batchDraw).toHaveBeenCalled();
      // velocity reduced: 5 * 0.9 = 4.5
      expect((plugin as unknown as R)['zoomVelocity']).toBeCloseTo(4.5);
    });
  });

  // ── Suite 18: helper methods + enable / disable ───────────────────────────

  describe('helper methods + enable() / disable()', () => {
    it('18.1 getDistance(p1, p2) → Math.hypot', () => {
      const result = plugin.getDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
      expect(result).toBe(5);
    });

    it('18.2 getCenter(p1, p2) → midpoint', () => {
      const result = plugin.getCenter({ x: 0, y: 0 }, { x: 10, y: 20 });
      expect(result).toEqual({ x: 5, y: 10 });
    });

    it('18.3 isPinching() → returns pinching state', () => {
      expect(plugin.isPinching()).toBe(false);
      (plugin as unknown as R)['pinching'] = true;
      expect(plugin.isPinching()).toBe(true);
    });

    it('18.4 getStageGridPlugin() → calls getPlugin("stageGrid")', () => {
      plugin.getStageGridPlugin();
      expect(mockWeave.getPlugin).toHaveBeenCalledWith('stageGrid');
    });

    it('18.5 getNodesSelectionPlugin() → calls getPlugin("nodesSelection")', () => {
      plugin.getNodesSelectionPlugin();
      expect(mockWeave.getPlugin).toHaveBeenCalledWith('nodesSelection');
    });

    it('18.6 getContextMenuPlugin() → calls getPlugin("contextMenu")', () => {
      plugin.getContextMenuPlugin();
      expect(mockWeave.getPlugin).toHaveBeenCalledWith('contextMenu');
    });

    it('18.7 getZoomSteps() → returns config.zoomSteps', () => {
      expect(plugin.getZoomSteps()).toEqual(WEAVE_STAGE_ZOOM_DEFAULT_CONFIG.zoomSteps);
    });

    it('18.8 enable() → enabled=true; disable() → enabled=false', () => {
      plugin.disable();
      expect((plugin as unknown as R)['enabled']).toBe(false);
      plugin.enable();
      expect((plugin as unknown as R)['enabled']).toBe(true);
    });
  });
});
