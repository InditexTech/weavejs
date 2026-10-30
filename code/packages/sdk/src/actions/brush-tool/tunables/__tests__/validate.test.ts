// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { getBrushTunable } from '../descriptors';
import { validateBrushTunablePatch, validateBrushTunableValue } from '../validate';

const t = (scope: 'profile' | 'look', key: string) => getBrushTunable(scope, key)!;

describe('validateBrushTunableValue', () => {
  it('accepts values inside the range and rejects values outside it', () => {
    const floor = t('profile', 'pressure.floor');
    expect(validateBrushTunableValue(floor, 0.2)).toBeNull();
    expect(validateBrushTunableValue(floor, 0)).toBeNull();
    expect(validateBrushTunableValue(floor, 0.5)).toBeNull();
    expect(validateBrushTunableValue(floor, 0.51)).toMatch(/at most 0.5/);
    expect(validateBrushTunableValue(floor, -0.01)).toMatch(/at least 0/);
  });

  it('rejects non-finite and non-numeric numbers', () => {
    const floor = t('profile', 'pressure.floor');
    expect(validateBrushTunableValue(floor, NaN)).toMatch(/finite number/);
    expect(validateBrushTunableValue(floor, Infinity)).toMatch(/finite number/);
    expect(validateBrushTunableValue(floor, '0.2')).toMatch(/finite number/);
  });

  it('requires whole numbers where specified', () => {
    const samples = t('profile', 'pressure.startSamples');
    expect(validateBrushTunableValue(samples, 3)).toBeNull();
    expect(validateBrushTunableValue(samples, 2.5)).toMatch(/whole number/);
  });

  it('accepts only listed options', () => {
    const filter = t('profile', 'pressure.filter');
    expect(validateBrushTunableValue(filter, 'oneEuro')).toBeNull();
    expect(validateBrushTunableValue(filter, 'magic')).toMatch(/one of/);
    expect(validateBrushTunableValue(filter, 3)).toMatch(/one of/);
  });

  it('accepts only booleans for boolean settings', () => {
    const zoom = t('profile', 'stabilizer.zoomAware');
    expect(validateBrushTunableValue(zoom, true)).toBeNull();
    expect(validateBrushTunableValue(zoom, 'true')).toMatch(/true or false/);
  });

  it('allows an empty value only for nullable settings', () => {
    expect(validateBrushTunableValue(t('profile', 'finalize.tolerance'), null)).toBeNull();
    expect(validateBrushTunableValue(t('profile', 'pressure.floor'), null)).toMatch(/cannot be empty/);
    expect(validateBrushTunableValue(t('profile', 'pressure.floor'), undefined)).toMatch(/cannot be empty/);
  });
});

describe('validateBrushTunablePatch', () => {
  it('accepts a valid nested patch', () => {
    expect(
      validateBrushTunablePatch('profile', {
        pressure: { floor: 0.1, oneEuro: { beta: 0.5 } },
        stabilizer: { type: 'oneEuro' },
      })
    ).toEqual([]);
  });

  it('reports every problem, with the setting name', () => {
    const errors = validateBrushTunablePatch('profile', {
      pressure: { floor: 9, filter: 'magic' },
      capture: { source: 'coalesced' },
    });
    expect(errors).toHaveLength(2);
    expect(errors.join(' ')).toMatch(/pressure.floor/);
    expect(errors.join(' ')).toMatch(/pressure.filter/);
  });

  it('rejects unknown settings and objects where a value is expected', () => {
    expect(validateBrushTunablePatch('profile', { nope: 1 })).toEqual(['Unknown profile setting "nope"']);
    expect(validateBrushTunablePatch('profile', { pressure: { oneEuro: 5 } })).toEqual([
      'Unknown profile setting "pressure.oneEuro"',
    ]);
  });

  it('validates look patches against look settings only', () => {
    expect(validateBrushTunablePatch('look', { outline: 'round', width: { gamma: 0.8 } })).toEqual([]);
    expect(validateBrushTunablePatch('look', { capture: { source: 'legacy' } })).toHaveLength(1);
  });

  it('rejects a patch that is not an object', () => {
    expect(validateBrushTunablePatch('profile', null)).toHaveLength(1);
    expect(validateBrushTunablePatch('profile', [1])).toHaveLength(1);
  });
});
