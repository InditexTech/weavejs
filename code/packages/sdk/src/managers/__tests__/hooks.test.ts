// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { WeaveHooksManager } from '../hooks';
import type { Weave } from '@/weave';

function makeMockWeave() {
  const logger = { debug: vi.fn(), error: vi.fn() };
  const weave = { getChildLogger: vi.fn().mockReturnValue(logger) };
  return { weave: weave as unknown as Weave, logger };
}

describe('WeaveHooksManager', () => {
  describe('constructor', () => {
    it('calls getChildLogger with "hooks-manager"', () => {
      const { weave } = makeMockWeave();
      const _mgr = new WeaveHooksManager(weave);
      expect(weave.getChildLogger).toHaveBeenCalledWith('hooks-manager');
    });

    it('logs debug on creation', () => {
      const { weave, logger } = makeMockWeave();
      const _mgr = new WeaveHooksManager(weave);
      expect(logger.debug).toHaveBeenCalledWith('Hooks manager created');
    });
  });

  describe('registerHook()', () => {
    it('registers a hook and makes it retrievable via getHook', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveHooksManager(weave);
      const hook = vi.fn();
      mgr.registerHook('phase:step', hook);
      expect(mgr.getHook('phase:step')).toBe(hook);
    });

    it('does not overwrite an existing hook when registered twice', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveHooksManager(weave);
      const first = vi.fn();
      const second = vi.fn();
      mgr.registerHook('phase:step', first);
      mgr.registerHook('phase:step', second);
      expect(mgr.getHook('phase:step')).toBe(first);
    });
  });

  describe('runPhaseHooks()', () => {
    it('calls execution for each hook whose key starts with phaseName:', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveHooksManager(weave);
      const hookA = vi.fn();
      const hookB = vi.fn();
      mgr.registerHook('render:before', hookA);
      mgr.registerHook('render:after', hookB);

      const execution = vi.fn();
      mgr.runPhaseHooks('render', execution);

      expect(execution).toHaveBeenCalledTimes(2);
      expect(execution).toHaveBeenCalledWith(hookA);
      expect(execution).toHaveBeenCalledWith(hookB);
    });

    it('does not call hooks that belong to a different phase', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveHooksManager(weave);
      const renderHook = vi.fn();
      const updateHook = vi.fn();
      mgr.registerHook('render:step', renderHook);
      mgr.registerHook('update:step', updateHook);

      const execution = vi.fn();
      mgr.runPhaseHooks('render', execution);

      expect(execution).toHaveBeenCalledWith(renderHook);
      expect(execution).not.toHaveBeenCalledWith(updateHook);
    });

    it('does nothing when no hooks match the phase', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveHooksManager(weave);
      mgr.registerHook('other:step', vi.fn());

      const execution = vi.fn();
      mgr.runPhaseHooks('render', execution);

      expect(execution).not.toHaveBeenCalled();
    });

    it('calls execution multiple times when multiple hooks match', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveHooksManager(weave);
      mgr.registerHook('phase:a', vi.fn());
      mgr.registerHook('phase:b', vi.fn());
      mgr.registerHook('phase:c', vi.fn());

      const execution = vi.fn();
      mgr.runPhaseHooks('phase', execution);

      expect(execution).toHaveBeenCalledTimes(3);
    });
  });

  describe('getHook()', () => {
    it('returns the registered hook function', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveHooksManager(weave);
      const hook = vi.fn();
      mgr.registerHook('phase:step', hook);
      expect(mgr.getHook('phase:step')).toBe(hook);
    });

    it('returns undefined for an unregistered hook name', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveHooksManager(weave);
      expect(mgr.getHook('nonexistent')).toBeUndefined();
    });
  });

  describe('unregisterHook()', () => {
    it('removes the hook so getHook returns undefined afterwards', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveHooksManager(weave);
      mgr.registerHook('phase:step', vi.fn());
      mgr.unregisterHook('phase:step');
      expect(mgr.getHook('phase:step')).toBeUndefined();
    });

    it('does not throw when unregistering a hook that was never registered', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveHooksManager(weave);
      expect(() => mgr.unregisterHook('never-registered')).not.toThrow();
    });
  });

  describe('reset()', () => {
    it('clears all registered hooks', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveHooksManager(weave);
      mgr.registerHook('a:1', vi.fn());
      mgr.registerHook('b:1', vi.fn());
      mgr.reset();
      const execution = vi.fn();
      mgr.runPhaseHooks('a', execution);
      expect(execution).not.toHaveBeenCalled();
    });

    it('after reset, a previously registered hook is no longer found', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveHooksManager(weave);
      mgr.registerHook('phase:step', vi.fn());
      mgr.reset();
      expect(mgr.getHook('phase:step')).toBeUndefined();
    });
  });
});
