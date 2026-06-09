// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */

// @vitest-environment jsdom
import 'vitest-canvas-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WEAVE_INSTANCE_STATUS } from '@inditextech/weave-types';
import { Weave } from '@/weave';

vi.mock('@/managers/setup');
vi.mock('@/managers/register');
vi.mock('@/managers/store');
vi.mock('@/managers/state');
vi.mock('@/managers/stage');
vi.mock('@/managers/groups');
vi.mock('@/managers/targeting');
vi.mock('@/managers/cloning');
vi.mock('@/managers/fonts');
vi.mock('@/managers/zindex');
vi.mock('@/managers/export/export');
vi.mock('@/managers/actions');
vi.mock('@/managers/plugins');
vi.mock('@/managers/users/users');
vi.mock('@/managers/mutex/mutex');
vi.mock('@/managers/async/async');
vi.mock('@/managers/hooks');
vi.mock('@/managers/drag-and-drop');
vi.mock('@/nodes/node', () => ({
  augmentKonvaNodeClass: vi.fn(),
  WeaveNode: class {},
}));

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeWeave() {
  const renderer = { register: vi.fn(), init: vi.fn(), render: vi.fn() };
  const doc = {
    destroy: vi.fn(),
    getMap: vi.fn().mockReturnValue({ toJSON: vi.fn().mockReturnValue({}) }),
  };
  const store = {
    setup: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getDocument: vi.fn().mockReturnValue(doc),
    getUser: vi.fn().mockReturnValue({ id: 'user-1' }),
    setState: vi.fn(),
  };
  const stage = { findOne: vi.fn().mockReturnValue(null), destroy: vi.fn() };

  const weave = new Weave(
    { store: store as any, renderer: renderer as any },
    { container: 'c', width: 100, height: 100 }
  );

  (weave as any).storeManager.getStore.mockReturnValue(store);
  (weave as any).stageManager.getStage.mockReturnValue(stage);
  (weave as any).stageManager.getMainLayer.mockReturnValue(undefined);
  (weave as any).stageManager.getConfiguration.mockReturnValue({
    container: 'c',
    width: 100,
    height: 100,
  });
  (weave as any).registerManager.getNodesHandlers.mockReturnValue({});
  (weave as any).registerManager.registerNodesHandlers.mockResolvedValue(
    undefined
  );
  (weave as any).fontsManager.loadFonts.mockResolvedValue(undefined);

  return { weave, renderer, store, stage, doc };
}

// ---------------------------------------------------------------------------
// Suite 1 — Constructor
// ---------------------------------------------------------------------------

describe('Weave — constructor', () => {
  it('sets _weave_isServerSide = false in browser environment', () => {
    const { weave: _weave } = makeWeave();
    expect(globalThis._weave_isServerSide).toBe(false);
  });

  it('merges config with WEAVE_DEFAULT_CONFIG (behaviors.axisLockThreshold = 5)', () => {
    const { weave } = makeWeave();
    const config = weave.getConfiguration();
    expect((config as any).behaviors?.axisLockThreshold).toBe(5);
  });

  it('calls renderer.register(this)', () => {
    const { weave, renderer } = makeWeave();
    expect(renderer.register).toHaveBeenCalledWith(weave);
  });

  it('calls setupManager.welcomeLog()', () => {
    const { weave } = makeWeave();
    expect((weave as any).setupManager.welcomeLog).toHaveBeenCalled();
  });

  it('initialized is false after construction', () => {
    const { weave } = makeWeave();
    expect((weave as any).initialized).toBe(false);
  });

  it('status is IDLE after construction', () => {
    const { weave } = makeWeave();
    expect(weave.getStatus()).toBe(WEAVE_INSTANCE_STATUS.IDLE);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — setupRenderer()
// ---------------------------------------------------------------------------

describe('Weave — setupRenderer()', () => {
  it('calls renderer.init()', () => {
    const { weave, renderer } = makeWeave();
    weave.setupRenderer();
    expect(renderer.init).toHaveBeenCalled();
  });

  it('calls renderer.render(callback)', () => {
    const { weave, renderer } = makeWeave();
    weave.setupRenderer();
    expect(renderer.render).toHaveBeenCalledWith(expect.any(Function));
  });

  it('render callback sets initialized = true', () => {
    const { weave, renderer } = makeWeave();
    let cb: (() => void) | undefined;
    renderer.render.mockImplementation((fn: () => void) => {
      cb = fn;
    });
    weave.setupRenderer();
    expect((weave as any).initialized).toBe(false);
    cb!();
    expect((weave as any).initialized).toBe(true);
  });

  it('render callback emits onInstanceStatus with RUNNING', async () => {
    const { weave, renderer } = makeWeave();
    let cb: (() => void) | undefined;
    renderer.render.mockImplementation((fn: () => void) => {
      cb = fn;
    });
    weave.setupRenderer();
    const listener = vi.fn();
    weave.addEventListener('onInstanceStatus', listener);
    cb!();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledWith(WEAVE_INSTANCE_STATUS.RUNNING);
  });

  it('render callback emits onRender', async () => {
    const { weave, renderer } = makeWeave();
    let cb: (() => void) | undefined;
    renderer.render.mockImplementation((fn: () => void) => {
      cb = fn;
    });
    weave.setupRenderer();
    const listener = vi.fn();
    weave.addEventListener('onRender', listener);
    cb!();
    await Promise.resolve();
    expect(listener).toHaveBeenCalled();
  });

  it('render callback calls setupPlugins() and setupActions()', () => {
    const { weave, renderer } = makeWeave();
    let cb: (() => void) | undefined;
    renderer.render.mockImplementation((fn: () => void) => {
      cb = fn;
    });
    weave.setupRenderer();
    cb!();
    expect((weave as any).setupManager.setupPlugins).toHaveBeenCalled();
    expect((weave as any).setupManager.setupActions).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — start()
// ---------------------------------------------------------------------------

describe('Weave — start()', () => {
  afterEach(() => {
    globalThis._weave_isServerSide = false;
    delete (window as any).weave;
  });

  it('sets eventsController when not server-side', async () => {
    const { weave } = makeWeave();
    await weave.start();
    expect(weave.getEventsController()).toBeInstanceOf(AbortController);
  });

  it('sets window.weave = this when not server-side', async () => {
    const { weave } = makeWeave();
    await weave.start();
    expect((window as any).weave).toBe(weave);
  });

  it('emits onRoomLoaded with false', async () => {
    const { weave } = makeWeave();
    const listener = vi.fn();
    weave.addEventListener('onRoomLoaded', listener);
    await weave.start();
    expect(listener).toHaveBeenCalledWith(false);
  });

  it('passes through status: STARTING → LOADING_FONTS → CONNECTING_TO_ROOM', async () => {
    const { weave } = makeWeave();
    const statuses: string[] = [];
    weave.addEventListener('onInstanceStatus', (s: any) => statuses.push(s));
    await weave.start();
    expect(statuses).toContain(WEAVE_INSTANCE_STATUS.STARTING);
    expect(statuses).toContain(WEAVE_INSTANCE_STATUS.LOADING_FONTS);
    expect(statuses).toContain(WEAVE_INSTANCE_STATUS.CONNECTING_TO_ROOM);
  });

  it('calls registerManager.registerNodesHandlers()', async () => {
    const { weave } = makeWeave();
    await weave.start();
    expect(
      (weave as any).registerManager.registerNodesHandlers
    ).toHaveBeenCalled();
  });

  it('calls registerPlugins() and registerActionsHandlers()', async () => {
    const { weave } = makeWeave();
    await weave.start();
    expect((weave as any).registerManager.registerPlugins).toHaveBeenCalled();
    expect(
      (weave as any).registerManager.registerActionsHandlers
    ).toHaveBeenCalled();
  });

  it('calls storeManager.registerStore() with config.store', async () => {
    const { weave, store } = makeWeave();
    await weave.start();
    expect((weave as any).storeManager.registerStore).toHaveBeenCalledWith(
      store
    );
  });

  it('calls fontsManager.loadFonts()', async () => {
    const { weave } = makeWeave();
    await weave.start();
    expect((weave as any).fontsManager.loadFonts).toHaveBeenCalled();
  });

  it('calls stageManager.initStage()', async () => {
    const { weave } = makeWeave();
    await weave.start();
    expect((weave as any).stageManager.initStage).toHaveBeenCalled();
  });

  it('calls store.setup() and store.connect()', async () => {
    const { weave, store } = makeWeave();
    await weave.start();
    expect(store.setup).toHaveBeenCalled();
    expect(store.connect).toHaveBeenCalled();
  });

  it('does not set eventsController when server-side', async () => {
    const { weave } = makeWeave();
    globalThis._weave_isServerSide = true;
    await weave.start();
    expect(() => weave.getEventsController()).toThrow();
    globalThis._weave_isServerSide = false;
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — switchRoom()
// ---------------------------------------------------------------------------

describe('Weave — switchRoom()', () => {
  afterEach(() => {
    globalThis._weave_isServerSide = false;
    delete (window as any).weave;
  });

  it('calls onDestroyInstance on each node handler', async () => {
    const { weave } = makeWeave();
    const handler = { onDestroyInstance: vi.fn() };
    (weave as any).registerManager.getNodesHandlers.mockReturnValue({
      rect: handler,
    });
    await weave.switchRoom();
    expect(handler.onDestroyInstance).toHaveBeenCalled();
  });

  it('calls mainLayer.destroy() when mainLayer is present', async () => {
    const { weave } = makeWeave();
    const mainLayer = { destroy: vi.fn() };
    (weave as any).stageManager.getMainLayer.mockReturnValue(mainLayer);
    await weave.switchRoom();
    expect(mainLayer.destroy).toHaveBeenCalled();
  });

  it('skips mainLayer.destroy() when mainLayer is undefined', async () => {
    const { weave } = makeWeave();
    (weave as any).stageManager.getMainLayer.mockReturnValue(undefined);
    await expect(weave.switchRoom()).resolves.not.toThrow();
  });

  it('calls stage.destroy() when stage is present', async () => {
    const { weave, stage } = makeWeave();
    await weave.switchRoom();
    expect(stage.destroy).toHaveBeenCalled();
  });

  it('skips stage.destroy() when stage is null', async () => {
    const { weave } = makeWeave();
    (weave as any).stageManager.getStage.mockReturnValue(null);
    await expect(weave.switchRoom()).resolves.not.toThrow();
  });

  it('aborts eventsController when present', async () => {
    const { weave } = makeWeave();
    const ctrl = { abort: vi.fn() };
    (weave as any).eventsController = ctrl;
    await weave.switchRoom();
    expect(ctrl.abort).toHaveBeenCalled();
  });

  it('creates new AbortController when not server-side', async () => {
    const { weave } = makeWeave();
    await weave.switchRoom();
    expect(weave.getEventsController()).toBeInstanceOf(AbortController);
  });

  it('sets window.weave = this if not already set', async () => {
    const { weave } = makeWeave();
    delete (window as any).weave;
    await weave.switchRoom();
    expect((window as any).weave).toBe(weave);
  });

  it('skips window.weave assignment if already set', async () => {
    const { weave } = makeWeave();
    const other = {} as any;
    (window as any).weave = other;
    await weave.switchRoom();
    expect((window as any).weave).toBe(other);
  });

  it('calls registerManager.reset() twice', async () => {
    const { weave } = makeWeave();
    await weave.switchRoom();
    expect((weave as any).registerManager.reset).toHaveBeenCalledTimes(2);
  });

  it('calls hooks.removeAllHooks() and hooksManager.reset()', async () => {
    const { weave } = makeWeave();
    const hooksSpy = vi.spyOn((weave as any).hooks, 'removeAllHooks');
    await weave.switchRoom();
    expect(hooksSpy).toHaveBeenCalled();
    expect((weave as any).hooksManager.reset).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — destroy()
// ---------------------------------------------------------------------------

describe('Weave — destroy()', () => {
  beforeEach(() => {
    delete (window as any).weave;
  });

  it('aborts eventsController when present', async () => {
    const { weave } = makeWeave();
    const ctrl = { abort: vi.fn() };
    (weave as any).eventsController = ctrl;
    await weave.destroy();
    expect(ctrl.abort).toHaveBeenCalled();
  });

  it('skips abort when eventsController is undefined', async () => {
    const { weave } = makeWeave();
    (weave as any).eventsController = undefined;
    await expect(weave.destroy()).resolves.not.toThrow();
  });

  it('calls emitter.clearListeners()', async () => {
    const { weave } = makeWeave();
    const clearSpy = vi.spyOn((weave as any).emitter, 'clearListeners');
    await weave.destroy();
    expect(clearSpy).toHaveBeenCalled();
  });

  it('sets status to IDLE after destroy', async () => {
    const { weave } = makeWeave();
    await weave.destroy();
    expect(weave.getStatus()).toBe(WEAVE_INSTANCE_STATUS.IDLE);
  });

  it('calls store.disconnect() and store.getDocument().destroy()', async () => {
    const { weave, store, doc } = makeWeave();
    await weave.destroy();
    expect(store.disconnect).toHaveBeenCalled();
    expect(doc.destroy).toHaveBeenCalled();
  });

  it('calls onDestroyInstance on all node handlers', async () => {
    const { weave } = makeWeave();
    const handler = { onDestroyInstance: vi.fn() };
    (weave as any).registerManager.getNodesHandlers.mockReturnValue({
      rect: handler,
    });
    await weave.destroy();
    expect(handler.onDestroyInstance).toHaveBeenCalled();
  });

  it('calls stage.destroy()', async () => {
    const { weave, stage } = makeWeave();
    await weave.destroy();
    expect(stage.destroy).toHaveBeenCalled();
  });

  it('clears globalThis.Konva and __$YJS$__', async () => {
    const { weave } = makeWeave();
    (globalThis as any).Konva = {};
    (globalThis as any)['__ $YJS$ __'] = {};
    await weave.destroy();
    expect((globalThis as any).Konva).toBeUndefined();
    expect((globalThis as any)['__ $YJS$ __']).toBeUndefined();
  });
});
