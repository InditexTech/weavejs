// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { WeaveRegisterManager } from '../register';
import type { Weave } from '@/weave';
import type { WeavePlugin } from '@/plugins/plugin';
import type { WeaveNode } from '@/nodes/node';
import type { WeaveAction } from '@/actions/action';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockWeave(config: Record<string, unknown> = {}) {
  const logger = { debug: vi.fn(), info: vi.fn(), error: vi.fn() };
  const weave = {
    getChildLogger: vi.fn().mockReturnValue(logger),
    getConfiguration: vi.fn().mockReturnValue(config),
  };
  return { weave: weave as unknown as Weave, logger };
}

function makeMockPlugin(name: string, withInitialize = true) {
  return {
    getName: vi.fn().mockReturnValue(name),
    register: vi.fn(),
    initialize: withInitialize ? vi.fn() : undefined,
  } as unknown as WeavePlugin;
}

function makeMockNode(nodeType: string, withInitialize = true) {
  return {
    getNodeType: vi.fn().mockReturnValue(nodeType),
    register: vi.fn().mockResolvedValue(undefined),
    initialize: withInitialize ? vi.fn() : undefined,
  } as unknown as WeaveNode;
}

function makeMockAction(
  name: string,
  aliases: string[] = [],
  withInitialize = true
) {
  return {
    getName: vi.fn().mockReturnValue(name),
    register: vi.fn(),
    hasAliases: vi.fn().mockReturnValue(aliases.length > 0),
    getAliases: vi.fn().mockReturnValue(aliases),
    initialize: withInitialize ? vi.fn() : undefined,
  } as unknown as WeaveAction;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WeaveRegisterManager', () => {
  describe('constructor', () => {
    it('calls getChildLogger with "register-manager"', () => {
      const { weave } = makeMockWeave();
      const _mgr = new WeaveRegisterManager(weave);
      expect(weave.getChildLogger).toHaveBeenCalledWith('register-manager');
    });

    it('logs debug on creation', () => {
      const { weave, logger } = makeMockWeave();
      const _mgr = new WeaveRegisterManager(weave);
      expect(logger.debug).toHaveBeenCalledWith('Register manager created');
    });
  });

  describe('Simple getters', () => {
    it('getPlugins() returns empty record initially', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      expect(mgr.getPlugins()).toEqual({});
    });

    it('getNodesHandlers() returns empty record initially', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      expect(mgr.getNodesHandlers()).toEqual({});
    });

    it('getActionsHandlers() returns empty record initially', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      expect(mgr.getActionsHandlers()).toEqual({});
    });

    it('getPlugin() returns registered plugin and undefined for unknown', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      const plugin = makeMockPlugin('myPlugin');
      mgr.registerPlugin(plugin);
      expect(mgr.getPlugin('myPlugin')).toBe(plugin);
      expect(mgr.getPlugin('unknown')).toBeUndefined();
    });

    it('getActionHandler() returns registered action and undefined for unknown', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      const action = makeMockAction('myAction');
      mgr.registerActionHandler(action);
      expect(mgr.getActionHandler('myAction')).toBe(action);
      expect(mgr.getActionHandler('unknown')).toBeUndefined();
    });

    it('getNodeHandler() returns registered node and undefined for unknown', async () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      const node = makeMockNode('rect');
      await mgr.registerNodeHandler(node);
      expect(mgr.getNodeHandler('rect')).toBe(node);
      expect(mgr.getNodeHandler('unknown')).toBeUndefined();
    });
  });

  describe('registerPlugin()', () => {
    it('calls plugin.register(instance) and stores it by name', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      const plugin = makeMockPlugin('myPlugin');
      mgr.registerPlugin(plugin);
      expect(plugin.register).toHaveBeenCalledWith(weave);
      expect(mgr.getPlugin('myPlugin')).toBe(plugin);
    });

    it('overwrites existing plugin when registered twice with same name', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      const pluginA = makeMockPlugin('p');
      const pluginB = makeMockPlugin('p');
      mgr.registerPlugin(pluginA);
      mgr.registerPlugin(pluginB);
      expect(mgr.getPlugin('p')).toBe(pluginB);
    });
  });

  describe('registerPlugins()', () => {
    it('registers each plugin in config.plugins', () => {
      const p1 = makeMockPlugin('p1');
      const p2 = makeMockPlugin('p2');
      const { weave } = makeMockWeave({ plugins: [p1, p2] });
      const mgr = new WeaveRegisterManager(weave);
      mgr.registerPlugins();
      expect(mgr.getPlugin('p1')).toBe(p1);
      expect(mgr.getPlugin('p2')).toBe(p2);
    });

    it('logs info("Plugins registered") after loop', () => {
      const { weave, logger } = makeMockWeave({ plugins: [] });
      const mgr = new WeaveRegisterManager(weave);
      mgr.registerPlugins();
      expect(logger.info).toHaveBeenCalledWith('Plugins registered');
    });

    it('skips loop when config.plugins is falsy', () => {
      const { weave, logger } = makeMockWeave({});
      const mgr = new WeaveRegisterManager(weave);
      mgr.registerPlugins();
      expect(mgr.getPlugins()).toEqual({});
      expect(logger.info).toHaveBeenCalledWith('Plugins registered');
    });
  });

  describe('registerNodeHandler()', () => {
    it('calls await node.register(instance) and stores node by nodeType', async () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      const node = makeMockNode('rect');
      await mgr.registerNodeHandler(node);
      expect(node.register).toHaveBeenCalledWith(weave);
      expect(mgr.getNodeHandler('rect')).toBe(node);
    });

    it('throws and logs error when nodeType already registered', async () => {
      const { weave, logger } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      const node1 = makeMockNode('rect');
      const node2 = makeMockNode('rect');
      await mgr.registerNodeHandler(node1);
      await expect(mgr.registerNodeHandler(node2)).rejects.toThrow(
        'Node handler with type [rect] already exists'
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('register is awaited (async)', async () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      let resolved = false;
      const node = {
        getNodeType: vi.fn().mockReturnValue('async-node'),
        register: vi.fn().mockImplementation(async () => {
          await new Promise((r) => setTimeout(r, 0));
          resolved = true;
        }),
        initialize: vi.fn(),
      } as unknown as WeaveNode;
      await mgr.registerNodeHandler(node);
      expect(resolved).toBe(true);
    });
  });

  describe('registerNodesHandlers()', () => {
    it('registers each node in config.nodes', async () => {
      const n1 = makeMockNode('rect');
      const n2 = makeMockNode('text');
      const { weave } = makeMockWeave({ nodes: [n1, n2] });
      const mgr = new WeaveRegisterManager(weave);
      await mgr.registerNodesHandlers();
      expect(mgr.getNodeHandler('rect')).toBe(n1);
      expect(mgr.getNodeHandler('text')).toBe(n2);
    });

    it('logs info("Nodes handlers registered") after loop', async () => {
      const { weave, logger } = makeMockWeave({ nodes: [] });
      const mgr = new WeaveRegisterManager(weave);
      await mgr.registerNodesHandlers();
      expect(logger.info).toHaveBeenCalledWith('Nodes handlers registered');
    });

    it('skips loop when config.nodes is falsy', async () => {
      const { weave, logger } = makeMockWeave({});
      const mgr = new WeaveRegisterManager(weave);
      await mgr.registerNodesHandlers();
      expect(mgr.getNodesHandlers()).toEqual({});
      expect(logger.info).toHaveBeenCalledWith('Nodes handlers registered');
    });
  });

  describe('registerActionHandler()', () => {
    it('calls action.register(instance) and stores by name', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      const action = makeMockAction('draw');
      mgr.registerActionHandler(action);
      expect(action.register).toHaveBeenCalledWith(weave);
      expect(mgr.getActionHandler('draw')).toBe(action);
    });

    it('throws and logs error when action name already registered', () => {
      const { weave, logger } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      mgr.registerActionHandler(makeMockAction('draw'));
      expect(() => mgr.registerActionHandler(makeMockAction('draw'))).toThrow(
        'Action handler with name [draw] already exists'
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('registers aliases when hasAliases() is true', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      const action = makeMockAction('draw', ['d', 'pencil']);
      mgr.registerActionHandler(action);
      expect(mgr.getActionHandler('d')).toBe(action);
      expect(mgr.getActionHandler('pencil')).toBe(action);
    });

    it('throws and logs error when an alias is already taken', () => {
      const { weave, logger } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      // Register 'draw' with alias 'd' first
      mgr.registerActionHandler(makeMockAction('draw', ['d']));
      // Register 'line' with alias 'd' — should throw on the alias conflict
      expect(() =>
        mgr.registerActionHandler(makeMockAction('line', ['d']))
      ).toThrow('Action handler with name [d] already exists');
      expect(logger.error).toHaveBeenCalled();
    });

    it('skips alias loop when hasAliases() is false', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      const action = makeMockAction('draw', []); // hasAliases = false
      mgr.registerActionHandler(action);
      // Only the primary name registered
      expect(Object.keys(mgr.getActionsHandlers())).toEqual(['draw']);
    });
  });

  describe('registerActionsHandlers()', () => {
    it('registers each action in config.actions', () => {
      const a1 = makeMockAction('draw');
      const a2 = makeMockAction('select');
      const { weave } = makeMockWeave({ actions: [a1, a2] });
      const mgr = new WeaveRegisterManager(weave);
      mgr.registerActionsHandlers();
      expect(mgr.getActionHandler('draw')).toBe(a1);
      expect(mgr.getActionHandler('select')).toBe(a2);
    });

    it('skips loop when config.actions is falsy', () => {
      const { weave } = makeMockWeave({});
      const mgr = new WeaveRegisterManager(weave);
      mgr.registerActionsHandlers();
      expect(mgr.getActionsHandlers()).toEqual({});
    });
  });

  describe('resetNodesHandlers()', () => {
    it('calls initialize() on each registered node handler', async () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      const n1 = makeMockNode('rect');
      const n2 = makeMockNode('text');
      await mgr.registerNodeHandler(n1);
      await mgr.registerNodeHandler(n2);
      mgr.resetNodesHandlers();
      expect(n1.initialize).toHaveBeenCalled();
      expect(n2.initialize).toHaveBeenCalled();
    });

    it('handles node with no initialize (optional chain safe)', async () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      const node = makeMockNode('rect', false); // no initialize
      await mgr.registerNodeHandler(node);
      expect(() => mgr.resetNodesHandlers()).not.toThrow();
    });
  });

  describe('resetActionsHandlers()', () => {
    it('calls initialize() on each registered action handler', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      const action = makeMockAction('draw');
      mgr.registerActionHandler(action);
      mgr.resetActionsHandlers();
      expect(action.initialize).toHaveBeenCalled();
    });
  });

  describe('resetPlugins()', () => {
    it('calls initialize() on each registered plugin', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      const plugin = makeMockPlugin('p');
      mgr.registerPlugin(plugin);
      mgr.resetPlugins();
      expect(plugin.initialize).toHaveBeenCalled();
    });

    it('handles plugin with no initialize (optional chain safe)', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      const plugin = makeMockPlugin('p', false); // no initialize
      mgr.registerPlugin(plugin);
      expect(() => mgr.resetPlugins()).not.toThrow();
    });
  });

  describe('reset()', () => {
    it('calls resetNodesHandlers, resetActionsHandlers, and resetPlugins', async () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveRegisterManager(weave);
      const node = makeMockNode('rect');
      const action = makeMockAction('draw');
      const plugin = makeMockPlugin('p');
      await mgr.registerNodeHandler(node);
      mgr.registerActionHandler(action);
      mgr.registerPlugin(plugin);
      mgr.reset();
      expect(node.initialize).toHaveBeenCalled();
      expect(action.initialize).toHaveBeenCalled();
      expect(plugin.initialize).toHaveBeenCalled();
    });
  });
});
