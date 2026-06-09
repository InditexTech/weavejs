// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

vi.mock('@inditextech/weave-sdk', () => ({
  Weave: vi.fn(),
}));

describe('package exports', () => {
  it('exports WeaveProvider', async () => {
    const { WeaveProvider } = await import('@/index');
    expect(typeof WeaveProvider).toBe('function');
  });

  it('exports useWeave', async () => {
    const { useWeave } = await import('@/index');
    expect(typeof useWeave).toBe('function');
  });

  it('exports useWeaveEvents', async () => {
    const { useWeaveEvents } = await import('@/index');
    expect(typeof useWeaveEvents).toBe('function');
  });
});
