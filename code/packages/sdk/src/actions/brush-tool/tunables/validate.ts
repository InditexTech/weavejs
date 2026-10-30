// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { getBrushTunable } from './descriptors';
import type { WeaveBrushTunable } from './types';

/**
 * Checks a value against a descriptor. Returns a message when the value is
 * invalid, or `null` when it is accepted.
 */
export function validateBrushTunableValue(
  tunable: WeaveBrushTunable,
  value: unknown
): string | null {
  const name = `${tunable.scope} setting "${tunable.key}"`;

  if (value === null || value === undefined) {
    return tunable.nullable ? null : `${name} cannot be empty`;
  }

  switch (tunable.type) {
    case 'boolean':
      return typeof value === 'boolean' ? null : `${name} must be true or false`;
    case 'enum':
      return typeof value === 'string' && tunable.options?.includes(value)
        ? null
        : `${name} must be one of: ${tunable.options?.join(', ')}`;
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return `${name} must be a finite number`;
      }
      if (tunable.integer && !Number.isInteger(value)) {
        return `${name} must be a whole number`;
      }
      if (tunable.min !== undefined && value < tunable.min) {
        return `${name} must be at least ${tunable.min}`;
      }
      if (tunable.max !== undefined && value > tunable.max) {
        return `${name} must be at most ${tunable.max}`;
      }
      return null;
    }
  }
}

function collectLeaves(
  obj: Record<string, unknown>,
  prefix: string[] = []
): { key: string; value: unknown }[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === 'object' && !Array.isArray(v)
      ? collectLeaves(v as Record<string, unknown>, [...prefix, k])
      : [{ key: [...prefix, k].join('.'), value: v }]
  );
}

/**
 * Validates a partial profile or look against the descriptors. Every leaf must
 * name a known setting and hold an accepted value. Returns the messages of all
 * problems found; an empty list means the patch is valid.
 */
export function validateBrushTunablePatch(
  scope: 'profile' | 'look',
  patch: unknown
): string[] {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    return [`A ${scope} change must be an object`];
  }

  const errors: string[] = [];
  for (const { key, value } of collectLeaves(patch as Record<string, unknown>)) {
    const tunable = getBrushTunable(scope, key);
    if (!tunable) {
      errors.push(`Unknown ${scope} setting "${key}"`);
      continue;
    }
    const error = validateBrushTunableValue(tunable, value);
    if (error) errors.push(error);
  }
  return errors;
}
