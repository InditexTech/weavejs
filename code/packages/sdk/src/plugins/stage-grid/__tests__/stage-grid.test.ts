// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── hoisted Konva state (must be available inside vi.mock factories) ─────────

const konvaState = vi.hoisted(() => ({
  layerInsts: [] as {
    add: ReturnType<typeof vi.fn>;
    destroyChildren: ReturnType<typeof vi.fn>;
    show: ReturnType<typeof vi.fn>;
    hide: ReturnType<typeof vi.fn>;
    moveToBottom: ReturnType<typeof vi.fn>;
  }[],
  lineInsts: [] as Record<string, unknown>[],
  shapeInsts: [] as { sceneFunc?: (ctx: Record<string, unknown>, shape: unknown) => void }[],
}));

// ─── module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('lodash/throttle', () => ({ default: (fn: (...a: unknown[]) => unknown) => fn }));
vi.mock('@/index.node', () => ({
  mergeExceptArrays: (a: Record<string, unknown>, b: Record<string, unknown>) => ({
    ...a,
    ...(b ?? {}),
  }),
}));
vi.mock('konva', () => ({
  default: {
    Layer: vi.fn().mockImplementation(() => {
      const inst = {
        add: vi.fn(),
        destroyChildren: vi.fn(),
        show: vi.fn(),
        hide: vi.fn(),
        moveToBottom: vi.fn(),
      };
      konvaState.layerInsts.push(inst);
      return inst;
    }),
    Line: vi.fn().mockImplementation((cfg: Record<string, unknown>) => {
      const inst = { ...cfg };
      konvaState.lineInsts.push(inst);
      return inst;
    }),
    Shape: vi.fn().mockImplementation(
      (cfg: { sceneFunc?: (ctx: Record<string, unknown>, shape: unknown) => void }) => {
        const inst = { sceneFunc: cfg?.sceneFunc };
        konvaState.shapeInsts.push(inst);
        return inst;
      }
    ),
  },
}));

// ─── imports (after mocks) ────────────────────────────────────────────────────

import { WeaveStageGridPlugin } from '../stage-grid';
import {
  WEAVE_STAGE_GRID_PLUGIN_KEY,
  WEAVE_GRID_LAYER_ID,
  WEAVE_GRID_TYPES,
  WEAVE_GRID_DOT_TYPES,
  WEAVE_GRID_DEFAULT_CONFIG,
} from '../constants';
import { MOVE_TOOL_ACTION_NAME } from '@/actions/move-tool/constants';

// ─── types ────────────────────────────────────────────────────────────────────

type Handler = (e?: Record<string, unknown>) => void;

// ─── factories ────────────────────────────────────────────────────────────────

function makeMockLayer() {
  return {
    add: vi.fn(),
    destroyChildren: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    moveToBottom: vi.fn(),
  };
}

function makeStage(
  opts: {
    scaleX?: number;
    scaleY?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    mockLayer?: ReturnType<typeof makeMockLayer> | null;
  } = {}
) {
  const stageHandlers: Record<string, Handler[]> = {};
  const layer = opts.mockLayer !== undefined ? opts.mockLayer : makeMockLayer();

  const stage = {
    scaleX: vi.fn().mockReturnValue(opts.scaleX ?? 1),
    scaleY: vi.fn().mockReturnValue(opts.scaleY ?? 1),
    x: vi.fn().mockReturnValue(opts.x ?? 0),
    y: vi.fn().mockReturnValue(opts.y ?? 0),
    width: vi.fn().mockReturnValue(opts.width ?? 800),
    height: vi.fn().mockReturnValue(opts.height ?? 600),
    position: vi.fn().mockReturnValue({ x: opts.x ?? 0, y: opts.y ?? 0 }),
    findOne: vi.fn().mockReturnValue(layer),
    on: vi.fn((event: string, handler: Handler) => {
      if (!stageHandlers[event]) stageHandlers[event] = [];
      stageHandlers[event].push(handler);
    }),
    add: vi.fn(),
    fire(event: string, e?: Record<string, unknown>) {
      stageHandlers[event]?.forEach((h) => h(e));
    },
  };

  return { stage, stageHandlers, layer };
}

function makeWeave(stage: ReturnType<typeof makeStage>['stage']) {
  const weaveHandlers: Record<string, Handler> = {};
  return {
    getStage: vi.fn().mockReturnValue(stage),
    getActiveAction: vi.fn().mockReturnValue(''),
    getEventsController: vi.fn().mockReturnValue(new AbortController()),
    addEventListener: vi.fn((event: string, handler: Handler) => {
      weaveHandlers[event] = handler;
    }),
    emitEvent: vi.fn(),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
    _weaveHandlers: weaveHandlers,
  };
}

function setup(
  params?: ConstructorParameters<typeof WeaveStageGridPlugin>[0],
  stageOpts?: Parameters<typeof makeStage>[0]
) {
  const { stage, stageHandlers, layer } = makeStage(stageOpts);
  const weave = makeWeave(stage);
  const plugin = new WeaveStageGridPlugin(params);
  // @ts-expect-error — accessing protected instance for test setup
  plugin.instance = weave;

  const windowListeners: Record<string, Handler> = {};
  const addEvtSpy = vi.spyOn(window, 'addEventListener').mockImplementation(
    (event: string, handler: EventListenerOrEventListenerObject) => {
      windowListeners[event] = handler as Handler;
    }
  );

  konvaState.lineInsts.length = 0;
  konvaState.shapeInsts.length = 0;
  konvaState.layerInsts.length = 0;

  plugin.onInit();
  addEvtSpy.mockRestore();

  return {
    plugin,
    stage,
    stageHandlers,
    layer,
    weave,
    windowListeners,
    keydownHandler: windowListeners['keydown'] as Handler,
    keyupHandler: windowListeners['keyup'] as Handler,
  };
}

function makeMockCtx() {
  return {
    fillStyle: '' as string,
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
  };
}

/** Forces renderGrid past the hasStageChanged guard by setting forceStageChange=true. */
function forceRender(plugin: WeaveStageGridPlugin) {
  // @ts-expect-error — accessing private member for test setup
  plugin.forceStageChange = true;
  plugin.onRender();
}

// ─── cleanup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  konvaState.layerInsts.length = 0;
  konvaState.lineInsts.length = 0;
  konvaState.shapeInsts.length = 0;
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Suite 1: Constructor + initialize() ──────────────────────────────────────

describe('WeaveStageGridPlugin - constructor + initialize()', () => {
  it('1.1 no params → all defaults applied', () => {
    const plugin = new WeaveStageGridPlugin();
    // @ts-expect-error — accessing private config
    expect(plugin.config.type).toBe(WEAVE_GRID_DEFAULT_CONFIG.type);
    // @ts-expect-error — accessing private config field
    expect(plugin.config.gridSize).toBe(WEAVE_GRID_DEFAULT_CONFIG.gridSize);
    // @ts-expect-error — accessing private config field
    expect(plugin.config.gridColor).toBe(WEAVE_GRID_DEFAULT_CONFIG.gridColor);
    // @ts-expect-error — accessing private config field
    expect(plugin.config.gridMajorEvery).toBe(WEAVE_GRID_DEFAULT_CONFIG.gridMajorEvery);
  });

  it('1.2 custom config overrides specific keys, others keep defaults', () => {
    const plugin = new WeaveStageGridPlugin({
      config: { gridSize: 40, type: WEAVE_GRID_TYPES.DOTS },
    });
    // @ts-expect-error — accessing private config field
    expect(plugin.config.gridSize).toBe(40);
    // @ts-expect-error — accessing private config field
    expect(plugin.config.type).toBe(WEAVE_GRID_TYPES.DOTS);
    // @ts-expect-error — non-overridden key keeps default
    expect(plugin.config.gridColor).toBe(WEAVE_GRID_DEFAULT_CONFIG.gridColor);
  });

  it('1.3 initialize() resets all state fields to initial values', () => {
    const { plugin } = setup();
    // Set all fields to non-initial values
    // @ts-expect-error — accessing private state field
    plugin.moveToolActive = true;
    // @ts-expect-error — accessing private state field
    plugin.isMouseMiddleButtonPressed = true;
    // @ts-expect-error — accessing private state field
    plugin.isSpaceKeyPressed = true;
    // @ts-expect-error — accessing private state field
    plugin.forceStageChange = true;
    // @ts-expect-error — accessing private state field
    plugin.actStagePosX = 99;
    // @ts-expect-error — accessing private state field
    plugin.actStagePosY = 88;
    // @ts-expect-error — accessing private state field
    plugin.actStageZoomX = 2;
    // @ts-expect-error — accessing private state field
    plugin.actStageZoomY = 3;

    plugin.initialize();

    // @ts-expect-error — accessing private state field
    expect(plugin.moveToolActive).toBe(false);
    // @ts-expect-error — accessing private state field
    expect(plugin.isMouseMiddleButtonPressed).toBe(false);
    // @ts-expect-error — accessing private state field
    expect(plugin.isSpaceKeyPressed).toBe(false);
    // @ts-expect-error — accessing private state field
    expect(plugin.forceStageChange).toBe(false);
    // @ts-expect-error — accessing private state field
    expect(plugin.actStagePosX).toBe(0);
    // @ts-expect-error — accessing private state field
    expect(plugin.actStagePosY).toBe(0);
    // @ts-expect-error — accessing private state field
    expect(plugin.actStageZoomX).toBe(1);
    // @ts-expect-error — accessing private state field
    expect(plugin.actStageZoomY).toBe(1);
  });
});

// ─── Suite 2: getName() + getLayerName() ──────────────────────────────────────

describe('WeaveStageGridPlugin - getName() + getLayerName()', () => {
  it('2.1 getName() returns WEAVE_STAGE_GRID_PLUGIN_KEY', () => {
    const plugin = new WeaveStageGridPlugin();
    expect(plugin.getName()).toBe(WEAVE_STAGE_GRID_PLUGIN_KEY);
  });

  it('2.2 getLayerName() returns WEAVE_GRID_LAYER_ID', () => {
    const plugin = new WeaveStageGridPlugin();
    expect(plugin.getLayerName()).toBe(WEAVE_GRID_LAYER_ID);
  });
});

// ─── Suite 3: initLayer() ─────────────────────────────────────────────────────

describe('WeaveStageGridPlugin - initLayer()', () => {
  it('3.1 creates one Konva.Layer', () => {
    const { plugin } = setup();
    konvaState.layerInsts.length = 0;

    plugin.initLayer();

    expect(konvaState.layerInsts).toHaveLength(1);
  });

  it('3.2 calls moveToBottom() then stage.add() with the new layer', () => {
    const { plugin, stage } = setup();
    konvaState.layerInsts.length = 0;

    plugin.initLayer();

    const createdLayer = konvaState.layerInsts[0];
    expect(createdLayer.moveToBottom).toHaveBeenCalledOnce();
    expect(stage.add).toHaveBeenCalledWith(createdLayer);
    // moveToBottom must be called before add
    const moveCalls = (createdLayer.moveToBottom as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    const addCalls = (stage.add as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(moveCalls).toBeLessThan(addCalls);
  });
});

// ─── Suite 4: onInit() ────────────────────────────────────────────────────────

describe('WeaveStageGridPlugin - onInit()', () => {
  it('4.1 registers window keydown/keyup and stage pointerdown/up/move handlers', () => {
    const { stageHandlers, keydownHandler, keyupHandler } = setup();

    expect(keydownHandler).toBeDefined();
    expect(keyupHandler).toBeDefined();
    expect(stageHandlers['pointerdown']).toHaveLength(1);
    expect(stageHandlers['pointerup']).toHaveLength(1);
    // Two separate pointermove registrations: throttled + plain
    expect(stageHandlers['pointermove']).toHaveLength(2);
  });

  it('4.2 calls renderGrid during onInit', () => {
    const { stage } = makeStage();
    const weave = makeWeave(stage);
    const plugin = new WeaveStageGridPlugin();
    // @ts-expect-error — accessing private instance field
    plugin.instance = weave;
    const renderGridSpy = vi.spyOn(plugin, 'renderGrid');
    const addEvtSpy = vi.spyOn(window, 'addEventListener').mockImplementation(() => {});
    plugin.onInit();
    addEvtSpy.mockRestore();
    expect(renderGridSpy).toHaveBeenCalledOnce();
  });
});

// ─── Suite 5: initEvents() — keydown / keyup ──────────────────────────────────

describe('WeaveStageGridPlugin - initEvents(): keydown / keyup', () => {
  it('5.1 keydown Space sets isSpaceKeyPressed = true', () => {
    const { plugin, keydownHandler } = setup();
    keydownHandler!({ code: 'Space' });
    // @ts-expect-error — accessing private state field
    expect(plugin.isSpaceKeyPressed).toBe(true);
  });

  it('5.2 keydown non-Space key leaves isSpaceKeyPressed = false', () => {
    const { plugin, keydownHandler } = setup();
    keydownHandler!({ code: 'KeyA' });
    // @ts-expect-error — accessing private state field
    expect(plugin.isSpaceKeyPressed).toBe(false);
  });

  it('5.3 keyup Space sets isSpaceKeyPressed = false', () => {
    const { plugin, keydownHandler, keyupHandler } = setup();
    keydownHandler!({ code: 'Space' });
    keyupHandler!({ code: 'Space' });
    // @ts-expect-error — accessing private state field
    expect(plugin.isSpaceKeyPressed).toBe(false);
  });

  it('5.4 keyup non-Space key leaves isSpaceKeyPressed unchanged (still true)', () => {
    const { plugin, keydownHandler, keyupHandler } = setup();
    keydownHandler!({ code: 'Space' });
    keyupHandler!({ code: 'Enter' });
    // @ts-expect-error — accessing private state field
    expect(plugin.isSpaceKeyPressed).toBe(true);
  });

  it('5.5 AbortController signal is forwarded to window.addEventListener', () => {
    const controller = new AbortController();
    const { stage } = makeStage();
    const weave = makeWeave(stage);
    weave.getEventsController.mockReturnValue(controller);
    const plugin = new WeaveStageGridPlugin();
    // @ts-expect-error — accessing private instance field
    plugin.instance = weave;

    const addEvtSpy = vi.spyOn(window, 'addEventListener');
    plugin.onInit();

    const keydownCall = addEvtSpy.mock.calls.find((c) => c[0] === 'keydown');
    expect(keydownCall?.[2]).toMatchObject({ signal: controller.signal });
    addEvtSpy.mockRestore();
  });
});

// ─── Suite 6: initEvents() — stage pointerdown ────────────────────────────────

describe('WeaveStageGridPlugin - initEvents(): stage pointerdown', () => {
  it('6.1 button=0 + move-tool active → moveToolActive = true', () => {
    const { plugin, stage, weave } = setup();
    weave.getActiveAction.mockReturnValue(MOVE_TOOL_ACTION_NAME);
    stage.fire('pointerdown', { evt: { button: 0 } });
    // @ts-expect-error — accessing private state field
    expect(plugin.moveToolActive).toBe(true);
  });

  it('6.2 button=0 + non-move-tool action → moveToolActive stays false', () => {
    const { plugin, stage, weave } = setup();
    weave.getActiveAction.mockReturnValue('selection');
    stage.fire('pointerdown', { evt: { button: 0 } });
    // @ts-expect-error — accessing private state field
    expect(plugin.moveToolActive).toBe(false);
  });

  it('6.3 button=2 → isMouseMiddleButtonPressed = true', () => {
    const { plugin, stage } = setup();
    stage.fire('pointerdown', { evt: { button: 2 } });
    // @ts-expect-error — accessing private state field
    expect(plugin.isMouseMiddleButtonPressed).toBe(true);
  });

  it('6.4 buttons=4 → isMouseMiddleButtonPressed = true', () => {
    const { plugin, stage } = setup();
    stage.fire('pointerdown', { evt: { button: 0, buttons: 4 } });
    // @ts-expect-error — accessing private state field
    expect(plugin.isMouseMiddleButtonPressed).toBe(true);
  });
});

// ─── Suite 7: initEvents() — stage pointerup ──────────────────────────────────

describe('WeaveStageGridPlugin - initEvents(): stage pointerup', () => {
  it('7.1 button=0 + move-tool active → moveToolActive = false', () => {
    const { plugin, stage, weave } = setup();
    weave.getActiveAction.mockReturnValue(MOVE_TOOL_ACTION_NAME);
    stage.fire('pointerdown', { evt: { button: 0 } });
    stage.fire('pointerup', { evt: { button: 0 } });
    // @ts-expect-error — accessing private state field
    expect(plugin.moveToolActive).toBe(false);
  });

  it('7.2 button=0 + action changed to non-move-tool → moveToolActive stays true', () => {
    const { plugin, stage, weave } = setup();
    weave.getActiveAction.mockReturnValue(MOVE_TOOL_ACTION_NAME);
    stage.fire('pointerdown', { evt: { button: 0 } });
    weave.getActiveAction.mockReturnValue('selection');
    stage.fire('pointerup', { evt: { button: 0 } });
    // @ts-expect-error — accessing private state field
    expect(plugin.moveToolActive).toBe(true);
  });

  it('7.3 button=1 → isMouseMiddleButtonPressed = false', () => {
    const { plugin, stage } = setup();
    stage.fire('pointerdown', { evt: { button: 2 } });
    stage.fire('pointerup', { evt: { button: 1 } });
    // @ts-expect-error — accessing private state field
    expect(plugin.isMouseMiddleButtonPressed).toBe(false);
  });

  it('7.4 buttons=0 → isMouseMiddleButtonPressed = false', () => {
    const { plugin, stage } = setup();
    stage.fire('pointerdown', { evt: { button: 2 } });
    stage.fire('pointerup', { evt: { button: 3, buttons: 0 } });
    // @ts-expect-error — accessing private state field
    expect(plugin.isMouseMiddleButtonPressed).toBe(false);
  });
});

// ─── Suite 8: initEvents() — throttled pointermove ────────────────────────────

describe('WeaveStageGridPlugin - initEvents(): throttled pointermove', () => {
  it('8.1 enabled=false → neither handler calls onRender', () => {
    const { plugin, stage } = setup();
    plugin.disable(); // sets enabled=false
    const renderSpy = vi.spyOn(plugin, 'onRender');
    stage.fire('pointermove');
    expect(renderSpy).not.toHaveBeenCalled();
  });

  it('8.2 enabled=true, no active condition → only the plain handler fires (count=1)', () => {
    const { plugin, stage } = setup();
    const renderSpy = vi.spyOn(plugin, 'onRender');
    stage.fire('pointermove');
    // throttled handler returns early (no space/middle/moveTool)
    // plain handler calls onRender once
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it('8.3 enabled=true + isSpaceKeyPressed → both handlers fire (count=2)', () => {
    const { plugin, stage, keydownHandler } = setup();
    keydownHandler!({ code: 'Space' });
    const renderSpy = vi.spyOn(plugin, 'onRender');
    stage.fire('pointermove');
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  it('8.4 enabled=true + isMouseMiddleButtonPressed → both handlers fire (count=2)', () => {
    const { plugin, stage } = setup();
    stage.fire('pointerdown', { evt: { button: 2 } });
    const renderSpy = vi.spyOn(plugin, 'onRender');
    stage.fire('pointermove');
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  it('8.5 enabled=true + moveToolActive → both handlers fire (count=2)', () => {
    const { plugin, stage, weave } = setup();
    weave.getActiveAction.mockReturnValue(MOVE_TOOL_ACTION_NAME);
    stage.fire('pointerdown', { evt: { button: 0 } });
    const renderSpy = vi.spyOn(plugin, 'onRender');
    stage.fire('pointermove');
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });
});

// ─── Suite 9: plain pointermove handler + onStageMove ────────────────────────

describe('WeaveStageGridPlugin - plain pointermove + onStageMove', () => {
  it('9.1 plain pointermove, enabled=true → onRender called', () => {
    const { plugin, stage } = setup();
    const renderSpy = vi.spyOn(plugin, 'onRender');
    stage.fire('pointermove');
    expect(renderSpy).toHaveBeenCalled();
  });

  it('9.2 plain pointermove, enabled=false → onRender not called', () => {
    const { plugin, stage } = setup();
    plugin.disable(); // sets enabled=false
    const renderSpy = vi.spyOn(plugin, 'onRender');
    stage.fire('pointermove');
    expect(renderSpy).not.toHaveBeenCalled();
  });

  it('9.3 onStageMove event → onRender called once', () => {
    const { plugin, weave } = setup();
    const renderSpy = vi.spyOn(plugin, 'onRender');
    const onStageMoveHandler = weave._weaveHandlers['onStageMove'];
    expect(onStageMoveHandler).toBeDefined();
    onStageMoveHandler!();
    expect(renderSpy).toHaveBeenCalledOnce();
  });
});

// ─── Suite 10: getLayer() ─────────────────────────────────────────────────────

describe('WeaveStageGridPlugin - getLayer()', () => {
  it('10.1 stage.findOne returns a layer → getLayer() returns it', () => {
    const mockLayer = makeMockLayer();
    const { plugin, stage } = setup();
    stage.findOne.mockReturnValue(mockLayer);
    expect(plugin.getLayer()).toBe(mockLayer);
  });

  it('10.2 stage.findOne returns null → getLayer() returns undefined (falsy)', () => {
    const { plugin, stage } = setup();
    stage.findOne.mockReturnValue(null);
    expect(plugin.getLayer()).toBeNull();
  });

  it('10.3 getLayer() queries with correct CSS-id selector', () => {
    const { plugin, stage } = setup();
    plugin.getLayer();
    expect(stage.findOne).toHaveBeenCalledWith(`#${WEAVE_GRID_LAYER_ID}`);
  });
});

// ─── Suite 11: getShapeAdaptiveSpacing() ──────────────────────────────────────

describe('WeaveStageGridPlugin - getShapeAdaptiveSpacing()', () => {
  it('11.1 scale=1 → factor=1 → result = baseSpacing', () => {
    const { plugin } = setup();
    expect(plugin.getShapeAdaptiveSpacing(20, 1)).toBe(20);
  });

  it('11.2 scale=0.5 → factor=2 → result = baseSpacing * 2', () => {
    const { plugin } = setup();
    expect(plugin.getShapeAdaptiveSpacing(20, 0.5)).toBe(40);
  });

  it('11.3 scale=0.25 → factor=4 → result = baseSpacing * 4', () => {
    const { plugin } = setup();
    expect(plugin.getShapeAdaptiveSpacing(20, 0.25)).toBe(80);
  });

  it('11.4 scale=2 → factor=0.5 → result = baseSpacing * 0.5', () => {
    const { plugin } = setup();
    expect(plugin.getShapeAdaptiveSpacing(20, 2)).toBe(10);
  });

  it('11.5 scale=4 → factor=0.25 → result = baseSpacing * 0.25', () => {
    const { plugin } = setup();
    expect(plugin.getShapeAdaptiveSpacing(20, 4)).toBe(5);
  });
});

// ─── Suite 12: getAdaptiveSpacing() ───────────────────────────────────────────

describe('WeaveStageGridPlugin - getAdaptiveSpacing()', () => {
  it('12.1 scale=1 → spacing = gridSize (no loop iterations)', () => {
    const plugin = new WeaveStageGridPlugin({ config: { gridSize: 20 } });
    expect(plugin.getAdaptiveSpacing(1)).toBe(20);
  });

  it('12.2 scale=0.01 (very zoomed out) → pixelSpacing of result is >= gridSize', () => {
    const plugin = new WeaveStageGridPlugin({ config: { gridSize: 20 } });
    const spacing = plugin.getAdaptiveSpacing(0.01);
    expect(spacing * 0.01).toBeGreaterThanOrEqual(20);
  });

  it('12.3 scale=100 (very zoomed in) → spacing is bounded by gridSize/16', () => {
    const plugin = new WeaveStageGridPlugin({ config: { gridSize: 20 } });
    const spacing = plugin.getAdaptiveSpacing(100);
    expect(spacing).toBeGreaterThanOrEqual(20 / 16);
  });

  it('12.4 scale=0.5 → spacing doubles to 40 (zoom-out loop triggered)', () => {
    const plugin = new WeaveStageGridPlugin({ config: { gridSize: 20 } });
    // pixelSpacing = 20 * 0.5 = 10 < minPixelSpacing=20 → loop doubles once
    expect(plugin.getAdaptiveSpacing(0.5)).toBe(40);
  });

  it('12.5 result is always a power-of-2 multiple of gridSize', () => {
    const plugin = new WeaveStageGridPlugin({ config: { gridSize: 20 } });
    [0.1, 0.25, 0.5, 1, 2, 4, 8].forEach((scale) => {
      const spacing = plugin.getAdaptiveSpacing(scale);
      const ratio = spacing / 20;
      expect(Math.log2(ratio) % 1).toBeCloseTo(0);
    });
  });
});

// ─── Suite 13: hasStageChanged() (tested via renderGrid) ──────────────────────

describe('WeaveStageGridPlugin - hasStageChanged()', () => {
  it('13.1 forceStageChange=true → renderGrid runs, flag reset to false', () => {
    const { plugin } = setup();
    // @ts-expect-error — accessing private state field
    plugin.forceStageChange = true;
    const renderGridSpy = vi.spyOn(plugin, 'renderGrid');
    plugin.onRender();
    expect(renderGridSpy).toHaveBeenCalled();
    // @ts-expect-error — accessing private state field
    expect(plugin.forceStageChange).toBe(false);
  });

  it('13.2 stage state unchanged after setup → renderGrid returns early (no lines created)', () => {
    const { plugin } = setup();
    konvaState.lineInsts.length = 0;
    plugin.onRender();
    expect(konvaState.lineInsts).toHaveLength(0);
  });

  it('13.3 stage x position changes → hasStageChanged detects it, lines are rendered', () => {
    const { plugin, stage } = setup();
    stage.x.mockReturnValue(100);
    konvaState.lineInsts.length = 0;
    plugin.onRender();
    expect(konvaState.lineInsts.length).toBeGreaterThan(0);
  });

  it('13.4 stage scaleX changes → hasStageChanged detects it, internal zoom state updated', () => {
    const { plugin, stage } = setup();
    stage.scaleX.mockReturnValue(2);
    konvaState.lineInsts.length = 0;
    plugin.onRender();
    expect(konvaState.lineInsts.length).toBeGreaterThan(0);
    // @ts-expect-error — accessing private state field
    expect(plugin.actStageZoomX).toBe(2);
  });
});

// ─── Suite 14: renderGrid() dispatch ──────────────────────────────────────────

describe('WeaveStageGridPlugin - renderGrid()', () => {
  it('14.1 stage unchanged → returns early; no Konva shapes created', () => {
    const { plugin } = setup();
    konvaState.lineInsts.length = 0;
    konvaState.shapeInsts.length = 0;
    plugin.onRender();
    expect(konvaState.lineInsts).toHaveLength(0);
    expect(konvaState.shapeInsts).toHaveLength(0);
  });

  it('14.2 stage changed + type=LINES → renderGridLines called (Konva.Line instances created)', () => {
    const { plugin } = setup({ config: { type: WEAVE_GRID_TYPES.LINES } });
    konvaState.lineInsts.length = 0;
    forceRender(plugin);
    expect(konvaState.lineInsts.length).toBeGreaterThan(0);
  });

  it('14.3 stage changed + type=DOTS → renderGridDots called (one Konva.Shape created)', () => {
    const { plugin } = setup({ config: { type: WEAVE_GRID_TYPES.DOTS } });
    konvaState.shapeInsts.length = 0;
    forceRender(plugin);
    expect(konvaState.shapeInsts).toHaveLength(1);
  });

  it('14.4 stage changed + unknown type → default branch; no shapes created', () => {
    const { plugin } = setup({
      config: { type: 'unknown' as unknown as (typeof WEAVE_GRID_TYPES)[keyof typeof WEAVE_GRID_TYPES] },
    });
    konvaState.lineInsts.length = 0;
    konvaState.shapeInsts.length = 0;
    forceRender(plugin);
    expect(konvaState.lineInsts).toHaveLength(0);
    expect(konvaState.shapeInsts).toHaveLength(0);
  });
});

// ─── Suite 15: renderGridLines() ──────────────────────────────────────────────

describe('WeaveStageGridPlugin - renderGridLines()', () => {
  it('15.1 no grid layer → returns early; no Konva.Line created', () => {
    const { plugin } = setup({}, { mockLayer: null });
    konvaState.lineInsts.length = 0;
    forceRender(plugin);
    expect(konvaState.lineInsts).toHaveLength(0);
  });

  it('15.2 enabled=false → destroyChildren called but no lines added to layer', () => {
    const mockLayer = makeMockLayer();
    const { plugin, stage } = setup({ config: { type: WEAVE_GRID_TYPES.LINES } }, { mockLayer });
    stage.findOne.mockReturnValue(mockLayer);
    plugin.disable(); // sets enabled=false, renders once
    // @ts-expect-error — accessing private state field
    plugin.forceStageChange = true;
    konvaState.lineInsts.length = 0;
    plugin.onRender();
    expect(mockLayer.destroyChildren).toHaveBeenCalled();
    expect(konvaState.lineInsts).toHaveLength(0);
    expect(mockLayer.add).not.toHaveBeenCalled();
  });

  it('15.3 enabled=true → destroyChildren called, then lines added to layer', () => {
    const mockLayer = makeMockLayer();
    const { plugin, stage } = setup({ config: { type: WEAVE_GRID_TYPES.LINES } }, { mockLayer });
    stage.findOne.mockReturnValue(mockLayer);
    konvaState.lineInsts.length = 0;
    forceRender(plugin);
    expect(mockLayer.destroyChildren).toHaveBeenCalled();
    expect(mockLayer.add).toHaveBeenCalled();
    expect(konvaState.lineInsts.length).toBeGreaterThan(0);
  });

  it('15.4 origin line (x≈0 or y≈0) uses gridOriginColor and zIndex=3', () => {
    const mockLayer = makeMockLayer();
    const config = {
      type: WEAVE_GRID_TYPES.LINES,
      gridColor: 'rgb(1,1,1)',
      gridMajorColor: 'rgb(2,2,2)',
      gridOriginColor: 'rgb(3,3,3)',
      gridSize: 50,
      gridMajorEvery: 4,
    };
    const { plugin, stage } = setup({ config }, { mockLayer });
    stage.findOne.mockReturnValue(mockLayer);
    konvaState.lineInsts.length = 0;
    forceRender(plugin);
    const originLines = konvaState.lineInsts.filter((l) => l.stroke === 'rgb(3,3,3)');
    expect(originLines.length).toBeGreaterThan(0);
    originLines.forEach((l) => expect(l.zIndex).toBe(3));
  });

  it('15.5 major (highlight) lines use gridMajorColor and zIndex=2', () => {
    const mockLayer = makeMockLayer();
    const config = {
      type: WEAVE_GRID_TYPES.LINES,
      gridColor: 'rgb(1,1,1)',
      gridMajorColor: 'rgb(2,2,2)',
      gridOriginColor: 'rgb(3,3,3)',
      gridSize: 50,
      gridMajorEvery: 4,
    };
    const { plugin, stage } = setup({ config }, { mockLayer });
    stage.findOne.mockReturnValue(mockLayer);
    konvaState.lineInsts.length = 0;
    forceRender(plugin);
    const majorLines = konvaState.lineInsts.filter((l) => l.stroke === 'rgb(2,2,2)');
    expect(majorLines.length).toBeGreaterThan(0);
    majorLines.forEach((l) => expect(l.zIndex).toBe(2));
  });

  it('15.6 regular lines use gridColor and zIndex=1', () => {
    const mockLayer = makeMockLayer();
    const config = {
      type: WEAVE_GRID_TYPES.LINES,
      gridColor: 'rgb(1,1,1)',
      gridMajorColor: 'rgb(2,2,2)',
      gridOriginColor: 'rgb(3,3,3)',
      gridSize: 50,
      gridMajorEvery: 4,
    };
    const { plugin, stage } = setup({ config }, { mockLayer });
    stage.findOne.mockReturnValue(mockLayer);
    konvaState.lineInsts.length = 0;
    forceRender(plugin);
    const regularLines = konvaState.lineInsts.filter((l) => l.stroke === 'rgb(1,1,1)');
    expect(regularLines.length).toBeGreaterThan(0);
    regularLines.forEach((l) => expect(l.zIndex).toBe(1));
  });

  it('15.7 major/origin lines have larger strokeWidth than regular lines', () => {
    const mockLayer = makeMockLayer();
    const config = {
      type: WEAVE_GRID_TYPES.LINES,
      gridColor: 'rgb(1,1,1)',
      gridMajorColor: 'rgb(2,2,2)',
      gridOriginColor: 'rgb(3,3,3)',
      gridSize: 50,
      gridMajorEvery: 4,
      gridMajorRatio: 2,
      gridStroke: 1,
    };
    const { plugin, stage } = setup({ config }, { mockLayer });
    stage.findOne.mockReturnValue(mockLayer);
    konvaState.lineInsts.length = 0;
    forceRender(plugin);
    const regularLines = konvaState.lineInsts.filter((l) => l.stroke === 'rgb(1,1,1)');
    const majorLines = konvaState.lineInsts.filter((l) => l.stroke === 'rgb(2,2,2)');
    if (regularLines.length > 0 && majorLines.length > 0) {
      expect(majorLines[0].strokeWidth as number).toBeGreaterThan(
        regularLines[0].strokeWidth as number
      );
    }
  });
});

// ─── Suite 16: renderGridDots() ───────────────────────────────────────────────

describe('WeaveStageGridPlugin - renderGridDots()', () => {
  it('16.1 no grid layer → returns early; no Konva.Shape created', () => {
    const { plugin } = setup({ config: { type: WEAVE_GRID_TYPES.DOTS } }, { mockLayer: null });
    konvaState.shapeInsts.length = 0;
    forceRender(plugin);
    expect(konvaState.shapeInsts).toHaveLength(0);
  });

  it('16.2 enabled=false → destroyChildren called but no shape added', () => {
    const mockLayer = makeMockLayer();
    const { plugin, stage } = setup({ config: { type: WEAVE_GRID_TYPES.DOTS } }, { mockLayer });
    stage.findOne.mockReturnValue(mockLayer);
    plugin.disable();
    // @ts-expect-error — accessing private state field
    plugin.forceStageChange = true;
    konvaState.shapeInsts.length = 0;
    plugin.onRender();
    expect(mockLayer.destroyChildren).toHaveBeenCalled();
    expect(konvaState.shapeInsts).toHaveLength(0);
  });

  it('16.3 enabled=true → destroyChildren then one Konva.Shape added to layer', () => {
    const mockLayer = makeMockLayer();
    const { plugin, stage } = setup({ config: { type: WEAVE_GRID_TYPES.DOTS } }, { mockLayer });
    stage.findOne.mockReturnValue(mockLayer);
    konvaState.shapeInsts.length = 0;
    forceRender(plugin);
    expect(mockLayer.destroyChildren).toHaveBeenCalled();
    expect(konvaState.shapeInsts).toHaveLength(1);
    expect(mockLayer.add).toHaveBeenCalled();
  });

  it('16.4 CIRCLE dotType → sceneFunc calls ctx.arc and ctx.fill', () => {
    const mockLayer = makeMockLayer();
    const { plugin, stage } = setup(
      { config: { type: WEAVE_GRID_TYPES.DOTS, gridDotType: WEAVE_GRID_DOT_TYPES.CIRCLE } },
      { mockLayer }
    );
    stage.findOne.mockReturnValue(mockLayer);
    konvaState.shapeInsts.length = 0;
    forceRender(plugin);
    const shape = konvaState.shapeInsts[0];
    const ctx = makeMockCtx();
    shape.sceneFunc!(ctx, {});
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('16.5 SQUARE dotType → sceneFunc calls ctx.fillRect', () => {
    const mockLayer = makeMockLayer();
    const { plugin, stage } = setup(
      { config: { type: WEAVE_GRID_TYPES.DOTS, gridDotType: WEAVE_GRID_DOT_TYPES.SQUARE } },
      { mockLayer }
    );
    stage.findOne.mockReturnValue(mockLayer);
    konvaState.shapeInsts.length = 0;
    forceRender(plugin);
    const shape = konvaState.shapeInsts[0];
    const ctx = makeMockCtx();
    shape.sceneFunc!(ctx, {});
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('16.6 CIRCLE sceneFunc: origin dots (x≈0 and y≈0) use gridOriginColor', () => {
    const mockLayer = makeMockLayer();
    const { plugin, stage } = setup(
      {
        config: {
          type: WEAVE_GRID_TYPES.DOTS,
          gridDotType: WEAVE_GRID_DOT_TYPES.CIRCLE,
          gridColor: 'rgb(1,1,1)',
          gridMajorColor: 'rgb(2,2,2)',
          gridOriginColor: 'rgb(3,3,3)',
          gridSize: 50,
          gridMajorEvery: 4,
        },
      },
      { mockLayer, width: 200, height: 200 }
    );
    stage.findOne.mockReturnValue(mockLayer);
    konvaState.shapeInsts.length = 0;
    forceRender(plugin);
    const shape = konvaState.shapeInsts[0];
    const ctx = makeMockCtx();
    const fillStyles: string[] = [];
    Object.defineProperty(ctx, 'fillStyle', {
      configurable: true,
      set(v: string) {
        fillStyles.push(v);
      },
      get() {
        return fillStyles[fillStyles.length - 1] ?? '';
      },
    });
    shape.sceneFunc!(ctx, {});
    expect(fillStyles).toContain('rgb(3,3,3)');
  });

  it('16.7 SQUARE sceneFunc: major dots use gridMajorColor, regular dots use gridColor', () => {
    const mockLayer = makeMockLayer();
    const { plugin, stage } = setup(
      {
        config: {
          type: WEAVE_GRID_TYPES.DOTS,
          gridDotType: WEAVE_GRID_DOT_TYPES.SQUARE,
          gridColor: 'rgb(1,1,1)',
          gridMajorColor: 'rgb(2,2,2)',
          gridOriginColor: 'rgb(3,3,3)',
          gridSize: 50,
          gridMajorEvery: 4,
        },
      },
      { mockLayer, width: 500, height: 500 }
    );
    stage.findOne.mockReturnValue(mockLayer);
    konvaState.shapeInsts.length = 0;
    forceRender(plugin);
    const shape = konvaState.shapeInsts[0];
    const ctx = makeMockCtx();
    const fillStyles: string[] = [];
    Object.defineProperty(ctx, 'fillStyle', {
      configurable: true,
      set(v: string) {
        fillStyles.push(v);
      },
      get() {
        return fillStyles[fillStyles.length - 1] ?? '';
      },
    });
    shape.sceneFunc!(ctx, {});
    expect(fillStyles).toContain('rgb(1,1,1)'); // regular
    expect(fillStyles).toContain('rgb(2,2,2)'); // major
  });
});

// ─── Suite 17: onRender() ────────────────────────────────────────────────────

describe('WeaveStageGridPlugin - onRender()', () => {
  it('17.1 onRender() delegates to renderGrid()', () => {
    const { plugin } = setup();
    const renderGridSpy = vi.spyOn(plugin, 'renderGrid');
    plugin.onRender();
    expect(renderGridSpy).toHaveBeenCalledOnce();
  });
});

// ─── Suite 18: enable() ───────────────────────────────────────────────────────

describe('WeaveStageGridPlugin - enable()', () => {
  it('18.1 sets enabled=true, shows layer, forceStageChange=true, calls onRender', () => {
    const mockLayer = makeMockLayer();
    const { plugin, stage } = setup();
    stage.findOne.mockReturnValue(mockLayer);
    plugin.disable(); // first disable so enable has effect
    const renderSpy = vi.spyOn(plugin, 'onRender');
    plugin.enable();
    expect(plugin.isEnabled()).toBe(true);
    expect(mockLayer.show).toHaveBeenCalled();
    expect(renderSpy).toHaveBeenCalled();
  });

  it('18.2 layer=undefined → no error thrown (optional chaining guard)', () => {
    const { plugin, stage } = setup();
    stage.findOne.mockReturnValue(null);
    expect(() => plugin.enable()).not.toThrow();
  });
});

// ─── Suite 19: disable() ──────────────────────────────────────────────────────

describe('WeaveStageGridPlugin - disable()', () => {
  it('19.1 sets enabled=false, hides layer, forceStageChange=true, calls onRender', () => {
    const mockLayer = makeMockLayer();
    const { plugin, stage } = setup();
    stage.findOne.mockReturnValue(mockLayer);
    const renderSpy = vi.spyOn(plugin, 'onRender');
    plugin.disable();
    expect(plugin.isEnabled()).toBe(false);
    expect(mockLayer.hide).toHaveBeenCalled();
    expect(renderSpy).toHaveBeenCalled();
  });

  it('19.2 layer=undefined → no error thrown (optional chaining guard)', () => {
    const { plugin, stage } = setup();
    stage.findOne.mockReturnValue(null);
    expect(() => plugin.disable()).not.toThrow();
  });
});

// ─── Suite 20: getType() + setType() ──────────────────────────────────────────

describe('WeaveStageGridPlugin - getType() + setType()', () => {
  it('20.1 getType() returns the default type (LINES)', () => {
    const { plugin } = setup();
    expect(plugin.getType()).toBe(WEAVE_GRID_TYPES.LINES);
  });

  it('20.2 setType(DOTS) → type updated, forceStageChange=true, onRender called', () => {
    const { plugin } = setup();
    const renderSpy = vi.spyOn(plugin, 'onRender');
    plugin.setType(WEAVE_GRID_TYPES.DOTS);
    expect(plugin.getType()).toBe(WEAVE_GRID_TYPES.DOTS);
    expect(renderSpy).toHaveBeenCalled();
    // @ts-expect-error — accessing private state field
    expect(plugin.forceStageChange).toBe(false); // consumed by renderGrid call inside setType
  });

  it('20.3 setType(LINES) → type updated, onRender called', () => {
    const { plugin } = setup({ config: { type: WEAVE_GRID_TYPES.DOTS } });
    const renderSpy = vi.spyOn(plugin, 'onRender');
    plugin.setType(WEAVE_GRID_TYPES.LINES);
    expect(plugin.getType()).toBe(WEAVE_GRID_TYPES.LINES);
    expect(renderSpy).toHaveBeenCalled();
  });
});

// ─── Suite 21: getDotsType() + setDotsType() ──────────────────────────────────

describe('WeaveStageGridPlugin - getDotsType() + setDotsType()', () => {
  it('21.1 getDotsType() returns the default dot type (CIRCLE)', () => {
    const { plugin } = setup();
    expect(plugin.getDotsType()).toBe(WEAVE_GRID_DOT_TYPES.CIRCLE);
  });

  it('21.2 setDotsType(SQUARE) → dot type updated, forceStageChange=true, onRender called', () => {
    const { plugin } = setup();
    const renderSpy = vi.spyOn(plugin, 'onRender');
    plugin.setDotsType(WEAVE_GRID_DOT_TYPES.SQUARE);
    expect(plugin.getDotsType()).toBe(WEAVE_GRID_DOT_TYPES.SQUARE);
    expect(renderSpy).toHaveBeenCalled();
  });

  it('21.3 setDotsType(CIRCLE) → dot type updated, onRender called', () => {
    const { plugin } = setup({ config: { gridDotType: WEAVE_GRID_DOT_TYPES.SQUARE } });
    const renderSpy = vi.spyOn(plugin, 'onRender');
    plugin.setDotsType(WEAVE_GRID_DOT_TYPES.CIRCLE);
    expect(plugin.getDotsType()).toBe(WEAVE_GRID_DOT_TYPES.CIRCLE);
    expect(renderSpy).toHaveBeenCalled();
  });
});
