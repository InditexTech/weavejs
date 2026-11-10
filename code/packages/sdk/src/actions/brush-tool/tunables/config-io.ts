// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WEAVE_STROKE_LEGACY_LOOK } from '@/nodes/stroke/constants';
import type { WeaveStrokeLook } from '@/nodes/stroke/types';
import { BRUSH_INPUT_PROFILE_KEYS } from '../constants';
import type {
  WeaveBrushInputProfile,
  WeaveBrushInputProfileKey,
} from '../types';
import { mergeData } from './merge';
import { resolveBrushProfilePatch } from './presets';
import { validateBrushTunablePatch } from './validate';

/** Version of the exported configuration document. */
export const BRUSH_CONFIG_DOCUMENT_VERSION = 1;

/** The brush configuration as portable data. */
export type WeaveBrushConfigDocument = {
  version: typeof BRUSH_CONFIG_DOCUMENT_VERSION;
  profiles: Record<WeaveBrushInputProfileKey, WeaveBrushInputProfile>;
  look: WeaveStrokeLook | null;
};

export type WeaveBrushConfigParseResult =
  | { ok: true; profiles: Partial<Record<WeaveBrushInputProfileKey, WeaveBrushInputProfile>>; look: WeaveStrokeLook | null | undefined }
  | { ok: false; errors: string[] };

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

type ParsedProfiles = Partial<Record<WeaveBrushInputProfileKey, WeaveBrushInputProfile>>;

function parseProfiles(
  raw: unknown,
  errors: string[]
): ParsedProfiles {
  const profiles: ParsedProfiles = {};
  if (raw === undefined) return profiles;
  if (!isObject(raw)) {
    errors.push('"profiles" must be an object');
    return profiles;
  }
  for (const [key, value] of Object.entries(raw)) {
    if (!(BRUSH_INPUT_PROFILE_KEYS as readonly string[]).includes(key)) {
      errors.push(`Unknown profile "${key}"`);
      continue;
    }
    const problems = validateBrushTunablePatch('profile', value);
    if (problems.length > 0) {
      errors.push(...problems.map((p) => `${key}: ${p}`));
    } else {
      profiles[key as WeaveBrushInputProfileKey] = resolveBrushProfilePatch(value as never);
    }
  }
  return profiles;
}

function parseLook(
  raw: unknown,
  errors: string[]
): WeaveStrokeLook | null | undefined {
  if (raw === undefined || raw === null) return raw;
  if (!isObject(raw)) {
    errors.push('"look" must be an object or null');
    return undefined;
  }
  const { version, ...settings } = raw;
  if (version !== WEAVE_STROKE_LEGACY_LOOK.version) {
    errors.push(`Unsupported look version "${String(version)}"`);
    return undefined;
  }
  const problems = validateBrushTunablePatch('look', settings);
  if (problems.length > 0) {
    errors.push(...problems.map((p) => `look: ${p}`));
    return undefined;
  }
  return mergeData(WEAVE_STROKE_LEGACY_LOOK, settings);
}

function readDocument(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  try {
    return JSON.parse(input);
  } catch {
    return undefined;
  }
}

/**
 * Reads and validates a configuration document, given as an object or as JSON
 * text. Nothing is applied: the result holds fully resolved values, or every
 * problem found.
 */
export function parseBrushConfigDocument(input: unknown): WeaveBrushConfigParseResult {
  const doc = readDocument(input);
  if (typeof input === 'string' && doc === undefined) {
    return { ok: false, errors: ['The document is not valid JSON'] };
  }

  if (!isObject(doc)) {
    return { ok: false, errors: ['The document must be an object'] };
  }
  if (doc['version'] !== BRUSH_CONFIG_DOCUMENT_VERSION) {
    return {
      ok: false,
      errors: [
        `Unsupported document version "${String(doc['version'])}"; expected ${BRUSH_CONFIG_DOCUMENT_VERSION}`,
      ],
    };
  }

  const errors: string[] = [];
  const profiles = parseProfiles(doc['profiles'], errors);
  const look = parseLook(doc['look'], errors);

  return errors.length > 0 ? { ok: false, errors } : { ok: true, profiles, look };
}
