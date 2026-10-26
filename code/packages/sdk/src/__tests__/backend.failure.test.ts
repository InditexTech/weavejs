// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupCanvasBackend, setupSkiaBackend } from '../backend';

const loadError = new Error('backend failed to load');

vi.mock('../utils/native-backend', () => ({
  loadNativeBackend: vi.fn(() => Promise.reject(loadError)),
}));

describe('backend when the native backend fails to load', () => {
  afterEach(() => {
    globalThis._weave_serverSideBackend = undefined;
  });

  it.each([
    ['setupSkiaBackend', setupSkiaBackend],
    ['setupCanvasBackend', setupCanvasBackend],
  ])(
    '%s rejects and leaves globalThis._weave_serverSideBackend unset',
    async (_name, setup) => {
      await expect(setup()).rejects.toBe(loadError);
      expect(globalThis._weave_serverSideBackend).toBeUndefined();
    }
  );

  it('keeps the previously loaded backend when another one fails to load', async () => {
    globalThis._weave_serverSideBackend = 'canvas';

    await expect(setupSkiaBackend()).rejects.toBe(loadError);
    expect(globalThis._weave_serverSideBackend).toBe('canvas');
  });
});
