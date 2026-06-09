// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */

// @vitest-environment jsdom
import 'vitest-canvas-mock';
import { describe, expect, it, vi } from 'vitest';
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
  (weave as any).stageManager.getConfiguration.mockReturnValue({ container: 'c', width: 100, height: 100 });

  return { weave, store, stage };
}

// ---------------------------------------------------------------------------
// Suite 16 — Register proxy methods
// ---------------------------------------------------------------------------

describe('Weave — register proxy methods', () => {
  it('getRegisterManager() returns registerManager', () => {
    const { weave } = makeWeave();
    expect(weave.getRegisterManager()).toBe((weave as any).registerManager);
  });

  it('getPlugins() delegates to registerManager.getPlugins()', () => {
    const { weave } = makeWeave();
    const plugins = { myPlugin: {} };
    (weave as any).registerManager.getPlugins.mockReturnValue(plugins);
    expect(weave.getPlugins()).toBe(plugins);
  });

  it('getPlugin(name) delegates to registerManager.getPlugin()', () => {
    const { weave } = makeWeave();
    const plugin = { name: 'myPlugin' };
    (weave as any).registerManager.getPlugin.mockReturnValue(plugin);
    expect(weave.getPlugin('myPlugin')).toBe(plugin);
    expect((weave as any).registerManager.getPlugin).toHaveBeenCalledWith('myPlugin');
  });

  it('getNodesHandlers() delegates to registerManager.getNodesHandlers()', () => {
    const { weave } = makeWeave();
    const handlers = { rect: {} };
    (weave as any).registerManager.getNodesHandlers.mockReturnValue(handlers);
    expect(weave.getNodesHandlers()).toBe(handlers);
  });

  it('getNodeHandler(type) delegates to registerManager.getNodeHandler()', () => {
    const { weave } = makeWeave();
    const handler = { type: 'rect' };
    (weave as any).registerManager.getNodeHandler.mockReturnValue(handler);
    expect(weave.getNodeHandler('rect')).toBe(handler);
    expect((weave as any).registerManager.getNodeHandler).toHaveBeenCalledWith('rect');
  });

  it('getActionsHandlers() delegates to registerManager.getActionsHandlers()', () => {
    const { weave } = makeWeave();
    const handlers = { draw: {} };
    (weave as any).registerManager.getActionsHandlers.mockReturnValue(handlers);
    expect(weave.getActionsHandlers()).toBe(handlers);
  });

  it('getActionHandler(name) delegates to registerManager.getActionHandler()', () => {
    const { weave } = makeWeave();
    const handler = { name: 'draw' };
    (weave as any).registerManager.getActionHandler.mockReturnValue(handler);
    expect(weave.getActionHandler('draw')).toBe(handler);
    expect((weave as any).registerManager.getActionHandler).toHaveBeenCalledWith('draw');
  });

  it('getStore() delegates to storeManager.getStore()', () => {
    const { weave, store } = makeWeave();
    expect(weave.getStore()).toBe(store);
  });

  it('registerPlugin(plugin) delegates to registerManager.registerPlugin()', () => {
    const { weave } = makeWeave();
    const plugin = {} as any;
    weave.registerPlugin(plugin);
    expect((weave as any).registerManager.registerPlugin).toHaveBeenCalledWith(plugin);
  });

  it('registerNodeHandler(node) delegates to registerManager.registerNodeHandler()', () => {
    const { weave } = makeWeave();
    const node = {} as any;
    weave.registerNodeHandler(node);
    expect((weave as any).registerManager.registerNodeHandler).toHaveBeenCalledWith(node);
  });

  it('registerActionHandler(action) delegates to registerManager.registerActionHandler()', () => {
    const { weave } = makeWeave();
    const action = {} as any;
    weave.registerActionHandler(action);
    expect((weave as any).registerManager.registerActionHandler).toHaveBeenCalledWith(action);
  });

  it('registerStore(store) delegates to storeManager.registerStore()', () => {
    const { weave, store } = makeWeave();
    weave.registerStore(store as any);
    expect((weave as any).storeManager.registerStore).toHaveBeenCalledWith(store);
  });

  it('setStore(store) delegates to storeManager.registerStore()', () => {
    const { weave, store } = makeWeave();
    weave.setStore(store as any);
    expect((weave as any).storeManager.registerStore).toHaveBeenCalledWith(store);
  });
});

// ---------------------------------------------------------------------------
// Suite 17 — Plugin management proxies
// ---------------------------------------------------------------------------

describe('Weave — plugin management proxies', () => {
  it('isPluginEnabled(name) delegates to pluginsManager.isEnabled()', () => {
    const { weave } = makeWeave();
    (weave as any).pluginsManager.isEnabled.mockReturnValue(true);
    expect(weave.isPluginEnabled('myPlugin')).toBe(true);
    expect((weave as any).pluginsManager.isEnabled).toHaveBeenCalledWith('myPlugin');
  });

  it('enablePlugin(name) delegates to pluginsManager.enable()', () => {
    const { weave } = makeWeave();
    weave.enablePlugin('myPlugin');
    expect((weave as any).pluginsManager.enable).toHaveBeenCalledWith('myPlugin');
  });

  it('disablePlugin(name) delegates to pluginsManager.disable()', () => {
    const { weave } = makeWeave();
    weave.disablePlugin('myPlugin');
    expect((weave as any).pluginsManager.disable).toHaveBeenCalledWith('myPlugin');
  });
});

// ---------------------------------------------------------------------------
// Suite 18 — Action proxies
// ---------------------------------------------------------------------------

describe('Weave — action proxy methods', () => {
  it('getActiveAction() delegates to actionsManager.getActiveAction()', () => {
    const { weave } = makeWeave();
    (weave as any).actionsManager.getActiveAction.mockReturnValue('draw');
    expect(weave.getActiveAction()).toBe('draw');
  });

  it('triggerAction(name, params, force) delegates to actionsManager.triggerAction()', () => {
    const { weave } = makeWeave();
    const result = { success: true };
    (weave as any).actionsManager.triggerAction.mockReturnValue(result);
    expect(weave.triggerAction('draw', { x: 0 }, true)).toBe(result);
    expect((weave as any).actionsManager.triggerAction).toHaveBeenCalledWith('draw', { x: 0 }, true);
  });

  it('getPropsAction(name) delegates to actionsManager.getPropsAction()', () => {
    const { weave } = makeWeave();
    const props = { color: 'red' };
    (weave as any).actionsManager.getPropsAction.mockReturnValue(props);
    expect(weave.getPropsAction('draw')).toBe(props);
  });

  it('updatePropsAction(name, params) delegates to actionsManager.updatePropsAction()', () => {
    const { weave } = makeWeave();
    weave.updatePropsAction('draw', { color: 'blue' });
    expect((weave as any).actionsManager.updatePropsAction).toHaveBeenCalledWith('draw', { color: 'blue' });
  });

  it('cancelAction(name) delegates to actionsManager.cancelAction()', () => {
    const { weave } = makeWeave();
    weave.cancelAction('draw');
    expect((weave as any).actionsManager.cancelAction).toHaveBeenCalledWith('draw');
  });
});
