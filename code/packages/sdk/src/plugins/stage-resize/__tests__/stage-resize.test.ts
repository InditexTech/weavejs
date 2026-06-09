// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WeaveStageResizePlugin } from '../stage-resize';

// ResizeObserver is not available in jsdom; stub globally for all suites
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn() }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

vi.mock('@/weave', () => ({ Weave: class Weave {} }));
vi.mock('lodash/throttle', () => ({ default: (fn: (...args: unknown[]) => unknown) => fn }));
vi.mock('@/internal-utils/upscale', () => ({ setupUpscaleStage: vi.fn() }));

import { setupUpscaleStage } from '@/internal-utils/upscale';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeContainer(clientWidth = 800, clientHeight = 600) {
  return {
    parentNode: { clientWidth, clientHeight } as unknown as HTMLElement,
    clientWidth,
    clientHeight,
  };
}

function makeStage(opts: { upscaleScale?: number; noParent?: boolean } = {}) {
  const container = opts.noParent
    ? { parentNode: null, clientWidth: 0, clientHeight: 0 }
    : makeContainer();

  const stage = {
    container: vi.fn().mockReturnValue(container),
    getAttr: vi.fn().mockReturnValue(opts.upscaleScale ?? 1),
    width: vi.fn().mockReturnValue(800),
    height: vi.fn().mockReturnValue(600),
  };
  return stage;
}

function makeWeave(stage: ReturnType<typeof makeStage>, plugins: Record<string, unknown> = {}) {
  return {
    getStage: vi.fn().mockReturnValue(stage),
    getPlugins: vi.fn().mockReturnValue(plugins),
    emitEvent: vi.fn(),
    getEventsController: vi.fn().mockReturnValue(undefined),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  };
}

function makePlugin(opts: { upscaleScale?: number; noParent?: boolean; plugins?: Record<string, unknown> } = {}) {
  const stage = makeStage(opts);
  const weave = makeWeave(stage, opts.plugins ?? {});
  const plugin = new WeaveStageResizePlugin();
  // @ts-expect-error — accessing protected `instance`
  plugin.instance = weave;
  return { plugin, stage, weave };
}

// ─── Suite 1: static fields + getName() ───────────────────────────────────────

describe('WeaveStageResizePlugin - static fields + getName()', () => {
  it('1.1 getName() returns "stageResize"', () => {
    const { plugin } = makePlugin();
    expect(plugin.getName()).toBe('stageResize');
  });

  it('1.2 getLayerName, initLayer, onRender, initialize are all undefined', () => {
    const { plugin } = makePlugin();
    expect(plugin.getLayerName).toBeUndefined();
    expect(plugin.initLayer).toBeUndefined();
    expect(plugin.onRender).toBeUndefined();
    expect(plugin.initialize).toBeUndefined();
  });
});

// ─── Suite 2: resizeStage() branches ──────────────────────────────────────────

describe('WeaveStageResizePlugin - resizeStage() branches', () => {
  let resizeHandler: () => void;

  function initAndCapture(plugin: WeaveStageResizePlugin) {
    const spy = vi.spyOn(window, 'addEventListener');
    plugin.onInit();
    const call = spy.mock.calls.find((c) => c[0] === 'resize');
    expect(call).toBeDefined();
    resizeHandler = call![1] as () => void;
    spy.mockRestore();
  }

  it('2.1 !enabled → early return; setupUpscaleStage NOT called', () => {
    const { plugin } = makePlugin();
    plugin.disable(); // enabled defaults to true in WeavePlugin
    initAndCapture(plugin);
    resizeHandler();
    expect(setupUpscaleStage).not.toHaveBeenCalled();
  });

  it('2.2 containerParent = null → early return; setupUpscaleStage NOT called', () => {
    const { plugin } = makePlugin({ noParent: true });
    // enabled is true by default; containerParent is null → early return
    initAndCapture(plugin);
    resizeHandler();
    expect(setupUpscaleStage).not.toHaveBeenCalled();
  });

  it('2.3 upscaleScale === 1 → stage.width() and stage.height() called with parent dimensions', () => {
    const { plugin, stage } = makePlugin({ upscaleScale: 1 });
    initAndCapture(plugin);
    resizeHandler();
    const container = stage.container();
    expect(stage.width).toHaveBeenCalledWith((container.parentNode as HTMLElement).clientWidth);
    expect(stage.height).toHaveBeenCalledWith((container.parentNode as HTMLElement).clientHeight);
  });

  it('2.4 upscaleScale !== 1 → width/height setters NOT called; setupUpscaleStage still called', () => {
    const { plugin, stage, weave } = makePlugin({ upscaleScale: 2 });
    initAndCapture(plugin);
    resizeHandler();
    // width/height called only as getters (no args), not as setters
    const widthSetterCalls = stage.width.mock.calls.filter((c: unknown[]) => c.length > 0);
    const heightSetterCalls = stage.height.mock.calls.filter((c: unknown[]) => c.length > 0);
    expect(widthSetterCalls).toHaveLength(0);
    expect(heightSetterCalls).toHaveLength(0);
    expect(setupUpscaleStage).toHaveBeenCalledWith(weave, stage);
  });

  it('2.5 setupUpscaleStage called, plugins onRender called, emitEvent fires onStageResize', () => {
    const onRender = vi.fn();
    const { plugin, stage, weave } = makePlugin({ plugins: { p1: { onRender } } });
    initAndCapture(plugin);
    resizeHandler();
    expect(setupUpscaleStage).toHaveBeenCalledWith(weave, stage);
    expect(onRender).toHaveBeenCalled();
    expect(weave.emitEvent).toHaveBeenCalledWith('onStageResize', {
      width: stage.width(),
      height: stage.height(),
    });
  });

  it('2.6 plugin without onRender → no error thrown during plugin iteration', () => {
    const { plugin } = makePlugin({ plugins: { p1: { onRender: undefined } } });
    initAndCapture(plugin);
    expect(() => resizeHandler()).not.toThrow();
  });
});

// ─── Suite 3: onInit() — window resize event ──────────────────────────────────

describe('WeaveStageResizePlugin - onInit() window resize', () => {
  it('3.1 window.addEventListener("resize", ...) registered during onInit()', () => {
    const { plugin } = makePlugin();
    const spy = vi.spyOn(window, 'addEventListener');
    plugin.onInit();
    const resizeCalls = spy.mock.calls.filter((c) => c[0] === 'resize');
    expect(resizeCalls).toHaveLength(1);
    spy.mockRestore();
  });

  it('3.2 Firing resize handler triggers resizeStage() (setupUpscaleStage called)', () => {
    const { plugin } = makePlugin();
    // enabled is true by default
    const spy = vi.spyOn(window, 'addEventListener');
    plugin.onInit();
    const call = spy.mock.calls.find((c) => c[0] === 'resize');
    const handler = call![1] as () => void;
    handler();
    expect(setupUpscaleStage).toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ─── Suite 4: onInit() — ResizeObserver ───────────────────────────────────────

describe('WeaveStageResizePlugin - onInit() ResizeObserver', () => {
  let observeCallback: () => void;

  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn((cb: () => void) => {
        observeCallback = cb;
        return { observe: vi.fn(), disconnect: vi.fn() };
      })
    );
  });

  it('4.1 ResizeObserver constructed and observe(stage.container()) called', () => {
    const { plugin, stage } = makePlugin();
    plugin.onInit();
    expect(ResizeObserver).toHaveBeenCalled();
    const instance = (ResizeObserver as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(instance.observe).toHaveBeenCalledWith(stage.container());
  });

  it('4.2 Triggering ResizeObserver callback → resizeStage() executes (setupUpscaleStage called)', () => {
    const { plugin } = makePlugin();
    // enabled is true by default
    plugin.onInit();
    observeCallback();
    expect(setupUpscaleStage).toHaveBeenCalled();
  });
});

// ─── Suite 5: enable() / disable() ───────────────────────────────────────────

describe('WeaveStageResizePlugin - enable() / disable()', () => {
  it('5.1 enable() sets enabled to true', () => {
    const { plugin } = makePlugin();
    plugin.disable();
    plugin.enable();
    // @ts-expect-error — accessing protected `enabled`
    expect(plugin.enabled).toBe(true);
  });

  it('5.2 disable() sets enabled to false', () => {
    const { plugin } = makePlugin();
    plugin.enable();
    plugin.disable();
    // @ts-expect-error — accessing protected `enabled`
    expect(plugin.enabled).toBe(false);
  });
});
