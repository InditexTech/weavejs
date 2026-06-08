// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { WeavePluginsManager } from '../plugins';
import type { Weave } from '@/weave';

function makeMockPlugin(enabled = true) {
  return {
    enable: vi.fn(),
    disable: vi.fn(),
    isEnabled: vi.fn().mockReturnValue(enabled),
  };
}

function makeMockWeave(plugins: Record<string, ReturnType<typeof makeMockPlugin>> = {}) {
  const logger = { debug: vi.fn(), error: vi.fn() };
  const weave = {
    getChildLogger: vi.fn().mockReturnValue(logger),
    getPlugins: vi.fn().mockReturnValue(plugins),
  };
  return { weave: weave as unknown as Weave, logger };
}

describe('WeavePluginsManager', () => {
  describe('constructor', () => {
    it('calls getChildLogger with "plugins-manager"', () => {
      const { weave } = makeMockWeave();
      new WeavePluginsManager(weave);
      expect(weave.getChildLogger).toHaveBeenCalledWith('plugins-manager');
    });

    it('logs debug on creation', () => {
      const { weave, logger } = makeMockWeave();
      new WeavePluginsManager(weave);
      expect(logger.debug).toHaveBeenCalledWith('Plugins manager created');
    });
  });

  describe('enable()', () => {
    it('calls plugin.enable() when plugin is registered', () => {
      const plugin = makeMockPlugin();
      const { weave } = makeMockWeave({ myPlugin: plugin });
      const mgr = new WeavePluginsManager(weave);
      mgr.enable('myPlugin');
      expect(plugin.enable).toHaveBeenCalled();
    });

    it('does not throw when plugin is not registered', () => {
      const { weave } = makeMockWeave({});
      const mgr = new WeavePluginsManager(weave);
      expect(() => mgr.enable('nonexistent')).not.toThrow();
    });
  });

  describe('disable()', () => {
    it('calls plugin.disable() when plugin is registered', () => {
      const plugin = makeMockPlugin();
      const { weave } = makeMockWeave({ myPlugin: plugin });
      const mgr = new WeavePluginsManager(weave);
      mgr.disable('myPlugin');
      expect(plugin.disable).toHaveBeenCalled();
    });

    it('does not throw when plugin is not registered', () => {
      const { weave } = makeMockWeave({});
      const mgr = new WeavePluginsManager(weave);
      expect(() => mgr.disable('nonexistent')).not.toThrow();
    });
  });

  describe('isEnabled()', () => {
    it('returns true when plugin is registered and isEnabled() returns true', () => {
      const plugin = makeMockPlugin(true);
      const { weave } = makeMockWeave({ myPlugin: plugin });
      const mgr = new WeavePluginsManager(weave);
      expect(mgr.isEnabled('myPlugin')).toBe(true);
    });

    it('returns false when plugin is registered and isEnabled() returns false', () => {
      const plugin = makeMockPlugin(false);
      const { weave } = makeMockWeave({ myPlugin: plugin });
      const mgr = new WeavePluginsManager(weave);
      expect(mgr.isEnabled('myPlugin')).toBe(false);
    });

    it('returns false when plugin is not registered', () => {
      const { weave } = makeMockWeave({});
      const mgr = new WeavePluginsManager(weave);
      expect(mgr.isEnabled('nonexistent')).toBe(false);
    });
  });
});
