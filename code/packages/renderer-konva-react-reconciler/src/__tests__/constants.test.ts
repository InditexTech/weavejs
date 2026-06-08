// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import {
  ConcurrentRoot,
  ContinuousEventPriority,
  DefaultEventPriority,
  DiscreteEventPriority,
  IdleEventPriority,
  LegacyRoot,
} from '../constants';
import * as indexCommon from '../index.common';
import * as indexMain from '../index';
import * as indexNode from '../index.node';
import * as indexTypes from '../index.types';
import { WeaveKonvaReactReconcilerRenderer } from '../renderer';

// ============================================================================
// Suite 1 — Constant values
// ============================================================================

describe('1 — Constants', () => {
  it('1.1 DiscreteEventPriority equals 1', () => {
    expect(DiscreteEventPriority).toBe(0b0000000000000000000000000000001);
  });

  it('1.2 ContinuousEventPriority equals 4', () => {
    expect(ContinuousEventPriority).toBe(0b0000000000000000000000000000100);
  });

  it('1.3 DefaultEventPriority equals 16', () => {
    expect(DefaultEventPriority).toBe(0b0000000000000000000000000010000);
  });

  it('1.4 IdleEventPriority has the correct bit value', () => {
    expect(IdleEventPriority).toBe(0b0100000000000000000000000000000);
  });

  it('1.5 LegacyRoot equals 0', () => {
    expect(LegacyRoot).toBe(0);
  });

  it('1.6 ConcurrentRoot equals 1', () => {
    expect(ConcurrentRoot).toBe(1);
  });
});

// ============================================================================
// Suite 2 — Index re-export coverage
// ============================================================================

describe('2 — Index re-exports', () => {
  it('2.1 index.common exports WeaveKonvaReactReconcilerRenderer', () => {
    expect(indexCommon.WeaveKonvaReactReconcilerRenderer).toBe(WeaveKonvaReactReconcilerRenderer);
  });

  it('2.2 index.ts exports WeaveKonvaReactReconcilerRenderer', () => {
    expect(indexMain.WeaveKonvaReactReconcilerRenderer).toBe(WeaveKonvaReactReconcilerRenderer);
  });

  it('2.3 index.node exports WeaveKonvaReactReconcilerRenderer', () => {
    expect(indexNode.WeaveKonvaReactReconcilerRenderer).toBe(WeaveKonvaReactReconcilerRenderer);
  });

  it('2.4 index.types exports WeaveKonvaReactReconcilerRenderer', () => {
    expect(indexTypes.WeaveKonvaReactReconcilerRenderer).toBe(WeaveKonvaReactReconcilerRenderer);
  });
});
