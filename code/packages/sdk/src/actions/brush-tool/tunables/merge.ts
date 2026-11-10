// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

type Plain = Record<string, unknown>;

const isPlain = (v: unknown): v is Plain =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

/** Deep clone of plain data. */
export function cloneData<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneData) as unknown as T;
  if (isPlain(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, cloneData(v)])
    ) as T;
  }
  return value;
}

/** Returns a new object: `base` with every defined value of `patch` merged in. */
export function mergeData<T>(base: T, patch: unknown): T {
  const result = cloneData(base) as Plain;
  if (!isPlain(patch)) return result as T;
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    result[k] =
      isPlain(v) && isPlain(result[k]) ? mergeData(result[k], v) : cloneData(v);
  }
  return result as T;
}

/** Freezes plain data recursively. */
export function deepFreeze<T>(value: T): T {
  if (isPlain(value) || Array.isArray(value)) {
    for (const v of Object.values(value as object)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}
