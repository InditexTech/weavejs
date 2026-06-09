// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/weave', () => ({ Weave: class Weave {} }));

import { WeaveStageDropAreaPlugin } from '../stage-drop-area';
import { WEAVE_STAGE_DROP_AREA_KEY } from '../constants';

// ─── helpers ──────────────────────────────────────────────────────────────────

type Handler = (e: Record<string, unknown>) => void;

function makeWeave() {
  const containerHandlers: Record<string, Handler> = {};
  const container = {
    addEventListener: vi.fn((event: string, handler: Handler) => {
      containerHandlers[event] = handler;
    }),
  };
  const weave = {
    getStage: vi.fn().mockReturnValue({ container: vi.fn().mockReturnValue(container) }),
    getEventsController: vi.fn().mockReturnValue(undefined),
    emitEvent: vi.fn(),
    getChildLogger: vi.fn().mockReturnValue({
      debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    }),
  };
  return { weave, container, containerHandlers };
}

function setup() {
  const { weave, container, containerHandlers } = makeWeave();
  const plugin = new WeaveStageDropAreaPlugin();
  // @ts-expect-error — accessing protected instance for test setup
  plugin.instance = weave;

  const windowSpy = vi.spyOn(window, 'addEventListener');
  plugin.onInit();
  const windowCalls = windowSpy.mock.calls;
  const windowDragoverHandler = windowCalls.find((c) => c[0] === 'dragover')?.[1] as Handler | undefined;
  const windowDropHandler = windowCalls.find((c) => c[0] === 'drop')?.[1] as Handler | undefined;
  windowSpy.mockRestore();

  return { plugin, weave, container, containerHandlers, windowDragoverHandler, windowDropHandler };
}

// ─── Suite 1: constructor + initialize() + static fields ──────────────────────

describe('WeaveStageDropAreaPlugin - constructor + initialize() + static fields', () => {
  it('1.1 initialize() sets enabled=true', () => {
    const plugin = new WeaveStageDropAreaPlugin();
    expect(plugin.enabled).toBe(true);
  });

  it('1.2 getName() returns "stageDropArea"', () => {
    const { plugin } = setup();
    expect(plugin.getName()).toBe(WEAVE_STAGE_DROP_AREA_KEY);
  });

  it('1.3 getLayerName, initLayer, onRender are undefined', () => {
    const { plugin } = setup();
    expect(plugin.getLayerName).toBeUndefined();
    expect(plugin.initLayer).toBeUndefined();
    expect(plugin.onRender).toBeUndefined();
  });
});

// ─── Suite 2: container dragover handler ──────────────────────────────────────

describe('WeaveStageDropAreaPlugin - container dragover handler', () => {
  afterEach(() => vi.clearAllMocks());

  it('2.1 dragover → calls e.preventDefault() and e.stopPropagation()', () => {
    const { containerHandlers } = setup();
    const e = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
    containerHandlers['dragover'](e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(e.stopPropagation).toHaveBeenCalled();
  });

  it('2.2 container.addEventListener called with "dragover" during onInit()', () => {
    const { container } = setup();
    const dragoverCalls = (container.addEventListener as ReturnType<typeof vi.fn>).mock.calls
      .filter((c: unknown[]) => c[0] === 'dragover');
    expect(dragoverCalls).toHaveLength(1);
  });
});

// ─── Suite 3: container drop handler ──────────────────────────────────────────

describe('WeaveStageDropAreaPlugin - container drop handler', () => {
  afterEach(() => vi.clearAllMocks());

  it('3.1 drop → calls e.preventDefault(), e.stopPropagation(), emits onStageDrop with event', () => {
    const { containerHandlers, weave } = setup();
    const e = { preventDefault: vi.fn(), stopPropagation: vi.fn(), dataTransfer: {} };
    containerHandlers['drop'](e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(e.stopPropagation).toHaveBeenCalled();
    expect(weave.emitEvent).toHaveBeenCalledWith('onStageDrop', e);
  });

  it('3.2 container.addEventListener called with "drop" during onInit()', () => {
    const { container } = setup();
    const dropCalls = (container.addEventListener as ReturnType<typeof vi.fn>).mock.calls
      .filter((c: unknown[]) => c[0] === 'drop');
    expect(dropCalls).toHaveLength(1);
  });
});

// ─── Suite 4: window fallback handlers + enable / disable ─────────────────────

describe('WeaveStageDropAreaPlugin - window fallbacks + enable/disable', () => {
  afterEach(() => vi.clearAllMocks());

  it('4.1 window dragover fallback → calls e.preventDefault()', () => {
    const { windowDragoverHandler } = setup();
    const e = { preventDefault: vi.fn() };
    windowDragoverHandler!(e);
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('4.2 window drop fallback → calls e.preventDefault()', () => {
    const { windowDropHandler } = setup();
    const e = { preventDefault: vi.fn() };
    windowDropHandler!(e);
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('4.3 enable() sets enabled=true; disable() sets enabled=false', () => {
    const { plugin } = setup();
    plugin.disable();
    expect(plugin.enabled).toBe(false);
    plugin.enable();
    expect(plugin.enabled).toBe(true);
  });
});
