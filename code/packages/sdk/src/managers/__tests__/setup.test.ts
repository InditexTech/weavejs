// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { WeaveSetupManager } from '../setup';
import type { Weave } from '@/weave';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockPlugin(withOnInit = true) {
  return { onInit: withOnInit ? vi.fn() : undefined };
}

function makeMockAction(withOnInit = true) {
  return { onInit: withOnInit ? vi.fn() : undefined };
}

interface MockWeaveOptions {
  logDisabled?: boolean;
  logLevel?: string;
  config?: Record<string, unknown>;
  nodesHandlers?: Record<string, unknown>;
  actionsHandlers?: Record<string, unknown>;
  plugins?: Record<string, ReturnType<typeof makeMockPlugin>>;
}

function makeMockWeave(opts: MockWeaveOptions = {}) {
  const logger = { debug: vi.fn(), error: vi.fn() };
  const {
    logDisabled = false,
    logLevel = 'error',
    config = {},
    nodesHandlers = {},
    actionsHandlers = {},
    plugins = {},
  } = opts;

  const weave = {
    getChildLogger: vi.fn().mockReturnValue(logger),
    getLogger: vi.fn().mockReturnValue({
      getDisabled: vi.fn().mockReturnValue(logDisabled),
      getLevel: vi.fn().mockReturnValue(logLevel),
    }),
    getConfiguration: vi.fn().mockReturnValue(config),
    getRegisterManager: vi.fn().mockReturnValue({
      getNodesHandlers: vi.fn().mockReturnValue(nodesHandlers),
      getActionsHandlers: vi.fn().mockReturnValue(actionsHandlers),
      getPlugins: vi.fn().mockReturnValue(plugins),
    }),
  };
  return { weave: weave as unknown as Weave, logger };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WeaveSetupManager', () => {
  describe('constructor', () => {
    it('calls getChildLogger with "setup-manager"', () => {
      const { weave } = makeMockWeave();
      new WeaveSetupManager(weave);
      expect(weave.getChildLogger).toHaveBeenCalledWith('setup-manager');
    });

    it('logs debug on creation', () => {
      const { weave, logger } = makeMockWeave();
      new WeaveSetupManager(weave);
      expect(logger.debug).toHaveBeenCalledWith('Setup manager created');
    });
  });

  describe('welcomeLog()', () => {
    it('calls console.log with a string containing the SDK version', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveSetupManager(weave);
      mgr.welcomeLog();
      expect(console.log).toHaveBeenCalled();
      const firstArg = (console.log as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as string;
      expect(firstArg).toContain('WEAVE.JS');
    });

    it('includes logDisabled and logLevel values in output', () => {
      const { weave } = makeMockWeave({ logDisabled: true, logLevel: 'debug' });
      const mgr = new WeaveSetupManager(weave);
      mgr.welcomeLog();
      const firstArg = (console.log as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as string;
      expect(firstArg).toContain('log disabled: true');
      expect(firstArg).toContain('log level: debug');
    });

    it('uses upscale values from config when performance.upscale is defined', () => {
      const { weave } = makeMockWeave({
        config: {
          performance: {
            upscale: { enabled: true, baseWidth: 2560, baseHeight: 1440, multiplier: 2 },
          },
        },
      });
      const mgr = new WeaveSetupManager(weave);
      mgr.welcomeLog();
      const firstArg = (console.log as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as string;
      expect(firstArg).toContain('upscaling enabled [true]');
      expect(firstArg).toContain('base width [2560]');
      expect(firstArg).toContain('base height [1440]');
      expect(firstArg).toContain('multiplier [2]');
    });

    it('uses default fallbacks when performance.upscale is undefined', () => {
      const { weave } = makeMockWeave({ config: {} });
      const mgr = new WeaveSetupManager(weave);
      mgr.welcomeLog();
      const firstArg = (console.log as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as string;
      expect(firstArg).toContain('upscaling enabled [false]');
      expect(firstArg).toContain('base width [1920]');
      expect(firstArg).toContain('base height [1080]');
      expect(firstArg).toContain('multiplier [1]');
    });
  });

  describe('setupLog()', () => {
    it('calls console.log with a string containing node/action/plugin counts', () => {
      const { weave } = makeMockWeave({
        nodesHandlers: { rect: {}, text: {} },
        actionsHandlers: { draw: {} },
        plugins: {},
      });
      const mgr = new WeaveSetupManager(weave);
      mgr.setupLog();
      expect(console.log).toHaveBeenCalled();
      const firstArg = (console.log as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as string;
      expect(firstArg).toContain('WEAVE.JS SETUP');
      expect(firstArg).toContain('nodes: 2');
      expect(firstArg).toContain('actions: 1');
      expect(firstArg).toContain('plugins: 0');
    });

    it('counts reflect actual registered handler maps', () => {
      const { weave } = makeMockWeave({
        nodesHandlers: { a: {}, b: {}, c: {} },
        actionsHandlers: { x: {}, y: {} },
        plugins: { p1: makeMockPlugin() },
      });
      const mgr = new WeaveSetupManager(weave);
      mgr.setupLog();
      const firstArg = (console.log as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as string;
      expect(firstArg).toContain('nodes: 3');
      expect(firstArg).toContain('actions: 2');
      expect(firstArg).toContain('plugins: 1');
    });
  });

  describe('setupPlugins()', () => {
    it('logs debug("Setting up plugins")', () => {
      const { weave, logger } = makeMockWeave({ plugins: {} });
      const mgr = new WeaveSetupManager(weave);
      mgr.setupPlugins();
      expect(logger.debug).toHaveBeenCalledWith('Setting up plugins');
    });

    it('calls onInit() on each plugin that defines it', () => {
      const p1 = makeMockPlugin(true);
      const p2 = makeMockPlugin(true);
      const { weave } = makeMockWeave({ plugins: { p1, p2 } });
      const mgr = new WeaveSetupManager(weave);
      mgr.setupPlugins();
      expect(p1.onInit).toHaveBeenCalled();
      expect(p2.onInit).toHaveBeenCalled();
    });

    it('does not throw when a plugin has no onInit', () => {
      const p = makeMockPlugin(false);
      const { weave } = makeMockWeave({ plugins: { p } });
      const mgr = new WeaveSetupManager(weave);
      expect(() => mgr.setupPlugins()).not.toThrow();
    });

    it('iterates all plugins (multiple plugins all called)', () => {
      const plugins = Object.fromEntries(
        ['a', 'b', 'c'].map((k) => [k, makeMockPlugin(true)])
      );
      const { weave } = makeMockWeave({ plugins });
      const mgr = new WeaveSetupManager(weave);
      mgr.setupPlugins();
      for (const p of Object.values(plugins)) {
        expect(p.onInit).toHaveBeenCalled();
      }
    });
  });

  describe('setupActions()', () => {
    it('logs debug("Setting up actions")', () => {
      const { weave, logger } = makeMockWeave({ actionsHandlers: {} });
      const mgr = new WeaveSetupManager(weave);
      mgr.setupActions();
      expect(logger.debug).toHaveBeenCalledWith('Setting up actions');
    });

    it('calls onInit() on each action handler that defines it', () => {
      const a1 = makeMockAction(true);
      const a2 = makeMockAction(true);
      const { weave } = makeMockWeave({ actionsHandlers: { a1, a2 } });
      const mgr = new WeaveSetupManager(weave);
      mgr.setupActions();
      expect(a1.onInit).toHaveBeenCalled();
      expect(a2.onInit).toHaveBeenCalled();
    });

    it('does not throw when an action has no onInit', () => {
      const a = makeMockAction(false);
      const { weave } = makeMockWeave({ actionsHandlers: { a } });
      const mgr = new WeaveSetupManager(weave);
      expect(() => mgr.setupActions()).not.toThrow();
    });

    it('iterates all action handlers', () => {
      const handlers = Object.fromEntries(
        ['x', 'y', 'z'].map((k) => [k, makeMockAction(true)])
      );
      const { weave } = makeMockWeave({ actionsHandlers: handlers });
      const mgr = new WeaveSetupManager(weave);
      mgr.setupActions();
      for (const a of Object.values(handlers)) {
        expect(a.onInit).toHaveBeenCalled();
      }
    });
  });
});
