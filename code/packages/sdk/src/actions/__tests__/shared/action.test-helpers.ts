// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { vi } from 'vitest';

export type R = Record<string, unknown>;

export function makeContainer(id = 'layer-id') {
  return { getAttrs: vi.fn().mockReturnValue({ id }) };
}

export function makeMeasureContainer() {
  return { add: vi.fn() };
}

type PointerEventOverrides = Partial<{
  pointerId: number;
  clientX: number;
  clientY: number;
  buttons: number;
  pointerType: string;
}> & Record<string, unknown>;

export function makePointerEvent<T extends PointerEventOverrides = PointerEventOverrides>(
  overrides: T = {} as T
) {
  return {
    evt: { pointerId: 1, clientX: 50, clientY: 75, buttons: 1, pointerType: 'mouse', ...overrides },
  };
}
