// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupCanvasBackend, setupSkiaBackend } from '../backend';
import { loadNativeBackend } from '../utils/native-backend';

vi.mock('konva/skia-backend', () => ({}));
vi.mock('konva/canvas-backend', () => ({}));

describe('backend', () => {
  afterEach(() => {
    globalThis._weave_serverSideBackend = undefined;
  });

  it('setupSkiaBackend sets globalThis._weave_serverSideBackend to "skia"', async () => {
    await setupSkiaBackend();
    expect(globalThis._weave_serverSideBackend).toBe('skia');
  });

  it('setupSkiaBackend resolves to void', async () => {
    await expect(setupSkiaBackend()).resolves.toBeUndefined();
  });

  it('setupCanvasBackend sets globalThis._weave_serverSideBackend to "canvas"', async () => {
    await setupCanvasBackend();
    expect(globalThis._weave_serverSideBackend).toBe('canvas');
  });

  it('setupCanvasBackend resolves to void', async () => {
    await expect(setupCanvasBackend()).resolves.toBeUndefined();
  });
});

describe('loadNativeBackend', () => {
  const missingPackageError = (packageName: string, code: string) =>
    Object.assign(
      new Error(
        `Cannot find package '${packageName}' imported from /app/node_modules/konva/lib/backend.js`
      ),
      { code }
    );

  it('resolves when the backend loads', async () => {
    await expect(
      loadNativeBackend('canvas', 'setupCanvasBackend', async () => ({}))
    ).resolves.toBeUndefined();
  });

  it.each(['ERR_MODULE_NOT_FOUND', 'MODULE_NOT_FOUND'])(
    'explains which package to install when the native module is missing (%s)',
    async (code) => {
      const cause = missingPackageError('skia-canvas', code);

      const result = loadNativeBackend('skia-canvas', 'setupSkiaBackend', () =>
        Promise.reject(cause)
      );

      await expect(result).rejects.toThrow(
        'setupSkiaBackend() requires the "skia-canvas" package. Install it with `npm install skia-canvas`, using the version required by @inditextech/weave-sdk.'
      );
      await expect(result).rejects.toMatchObject({ cause });
    }
  );

  it('rethrows the original error when another module is missing', async () => {
    const error = missingPackageError('node-addon-api', 'ERR_MODULE_NOT_FOUND');

    await expect(
      loadNativeBackend('canvas', 'setupCanvasBackend', () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);
  });

  it('rethrows errors that are not about missing modules', async () => {
    const error = new Error("Cannot find package 'canvas' binding");

    await expect(
      loadNativeBackend('canvas', 'setupCanvasBackend', () =>
        Promise.reject(error)
      )
    ).rejects.toBe(error);
  });
});
