// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { test, expect } from 'vitest';
import { WEAVE_INSTANCE_STATUS, WeaveStatus } from './index';

test('import constant', () => {
  expect(WEAVE_INSTANCE_STATUS.IDLE).toBe('idle');
});

test('import type', () => {
  const status: WeaveStatus = WEAVE_INSTANCE_STATUS.IDLE;

  expect(status).toBe('idle');
});
