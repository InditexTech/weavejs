// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Weave } from '@/weave';
import { type WeaveStore } from '@/stores/store';
import { WeaveStoreManager } from '@/managers/store';

function makeMockWeave() {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return {
    getChildLogger: vi.fn().mockReturnValue(logger),
    _logger: logger,
  };
}

function makeMockStore(returnValue?: WeaveStore) {
  const instance = {} as WeaveStore;
  const store = {
    register: vi.fn().mockReturnValue(returnValue ?? instance),
    _instance: returnValue ?? instance,
  };
  return store;
}

describe('WeaveStoreManager', () => {
  let mockWeave: ReturnType<typeof makeMockWeave>;
  let manager: WeaveStoreManager;

  beforeEach(() => {
    mockWeave = makeMockWeave();
    manager = new WeaveStoreManager(mockWeave as unknown as Weave);
  });

  // ─── Suite 1: constructor ────────────────────────────────────────────────

  describe('constructor', () => {
    it('calls getChildLogger with "store-manager"', () => {
      expect(mockWeave.getChildLogger).toHaveBeenCalledWith('store-manager');
    });

    it('logs debug "Store manager created"', () => {
      expect(mockWeave._logger.debug).toHaveBeenCalledWith('Store manager created');
    });
  });

  // ─── Suite 2: getStore ───────────────────────────────────────────────────

  describe('getStore', () => {
    it('returns undefined before any store is registered', () => {
      expect(manager.getStore()).toBeUndefined();
    });

    it('returns the registered store instance', () => {
      const mockStore = makeMockStore();
      manager.registerStore(mockStore as unknown as WeaveStore);
      expect(manager.getStore()).toBe(mockStore._instance);
    });
  });

  // ─── Suite 3: registerStore ──────────────────────────────────────────────

  describe('registerStore', () => {
    it('calls store.register with the Weave instance', () => {
      const mockStore = makeMockStore();
      manager.registerStore(mockStore as unknown as WeaveStore);
      expect(mockStore.register).toHaveBeenCalledWith(mockWeave);
    });

    it('stores the return value of store.register()', () => {
      const registeredInstance = {} as WeaveStore;
      const mockStore = makeMockStore(registeredInstance);
      manager.registerStore(mockStore as unknown as WeaveStore);
      expect(manager.getStore()).toBe(registeredInstance);
    });

    it('throws when a store is already registered', () => {
      const mockStore = makeMockStore();
      manager.registerStore(mockStore as unknown as WeaveStore);
      expect(() => manager.registerStore(mockStore as unknown as WeaveStore))
        .toThrow('Store already registered');
    });

    it('logs error before throwing on double registration', () => {
      const mockStore = makeMockStore();
      manager.registerStore(mockStore as unknown as WeaveStore);
      try {
        manager.registerStore(mockStore as unknown as WeaveStore);
      } catch {
        // expected
      }
      expect(mockWeave._logger.error).toHaveBeenCalledWith('Store already registered');
    });
  });
});
