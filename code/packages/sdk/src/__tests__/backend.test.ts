// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupCanvasBackend, setupSkiaBackend } from '../backend';

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
