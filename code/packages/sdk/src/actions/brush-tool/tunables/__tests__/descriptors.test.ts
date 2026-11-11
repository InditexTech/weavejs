// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { BRUSH_LEGACY_INPUT_PROFILE } from '../../constants';
import { WEAVE_STROKE_LEGACY_LOOK } from '@/nodes/stroke/constants';
import {
  BRUSH_LOOK_TUNABLES,
  BRUSH_PROFILE_TUNABLES,
  BRUSH_TUNABLES,
} from '../descriptors';

function leaves(
  obj: Record<string, unknown>,
  prefix: string[] = []
): { key: string; value: unknown }[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === 'object' && !Array.isArray(v)
      ? leaves(v as Record<string, unknown>, [...prefix, k])
      : [{ key: [...prefix, k].join('.'), value: v }]
  );
}

const valueAt = (obj: Record<string, unknown>, path: string[]) =>
  path.reduce<unknown>(
    (o, k) => (o as Record<string, unknown> | undefined)?.[k],
    obj
  );

describe('tunable descriptors', () => {
  it('have unique keys per scope', () => {
    for (const list of [BRUSH_PROFILE_TUNABLES, BRUSH_LOOK_TUNABLES]) {
      const keys = list.map((t) => t.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('describe every setting of an input profile', () => {
    const described = new Set(BRUSH_PROFILE_TUNABLES.map((t) => t.key));
    for (const { key } of leaves(
      BRUSH_LEGACY_INPUT_PROFILE as unknown as Record<string, unknown>
    )) {
      expect(described.has(key), `missing descriptor for profile ${key}`).toBe(true);
    }
  });

  it('describe every setting of a look except its version', () => {
    const described = new Set(BRUSH_LOOK_TUNABLES.map((t) => t.key));
    for (const { key } of leaves(
      WEAVE_STROKE_LEGACY_LOOK as unknown as Record<string, unknown>
    )) {
      if (key === 'version') continue;
      expect(described.has(key), `missing descriptor for look ${key}`).toBe(true);
    }
  });

  it('only describe settings that exist', () => {
    for (const t of BRUSH_TUNABLES) {
      const source = (
        t.scope === 'profile'
          ? BRUSH_LEGACY_INPUT_PROFILE
          : WEAVE_STROKE_LEGACY_LOOK
      ) as unknown as Record<string, unknown>;
      const value = valueAt(source, t.path);
      if (t.nullable) {
        expect(value === undefined || value === null, t.key).toBe(true);
      } else {
        expect(value, `no setting for ${t.scope} ${t.key}`).not.toBeUndefined();
      }
    }
  });

  it('default every setting to the legacy value', () => {
    for (const t of BRUSH_TUNABLES) {
      const source = (
        t.scope === 'profile'
          ? BRUSH_LEGACY_INPUT_PROFILE
          : WEAVE_STROKE_LEGACY_LOOK
      ) as unknown as Record<string, unknown>;
      const value = valueAt(source, t.path);
      expect(t.default, t.key).toEqual(value === undefined ? null : value);
    }
  });

  it('are well formed', () => {
    for (const t of BRUSH_TUNABLES) {
      expect(t.help.length, `${t.key} help`).toBeGreaterThan(10);
      expect(t.path.join('.')).toBe(t.key);
      if (t.type === 'enum') {
        expect(t.options?.length, `${t.key} options`).toBeGreaterThan(1);
        expect(t.options).toContain(t.default);
      }
      if (t.type === 'number') {
        expect(t.min, `${t.key} min`).toBeDefined();
        expect(t.max, `${t.key} max`).toBeDefined();
        expect(t.min as number).toBeLessThan(t.max as number);
        if (t.default !== null) {
          expect(t.default as number).toBeGreaterThanOrEqual(t.min as number);
          expect(t.default as number).toBeLessThanOrEqual(t.max as number);
        }
      }
      if (t.type === 'boolean') {
        expect(typeof t.default).toBe('boolean');
      }
    }
  });

  it('assign the capture and draw kinds consistently', () => {
    expect(BRUSH_PROFILE_TUNABLES.every((t) => t.kind === 'capture')).toBe(true);
    expect(BRUSH_LOOK_TUNABLES.every((t) => t.kind === 'draw')).toBe(true);
  });
});
