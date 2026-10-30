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

/**
 * Reads and validates a configuration document, given as an object or as JSON
 * text. Nothing is applied: the result holds fully resolved values, or every
 * problem found.
 */
export function parseBrushConfigDocument(input: unknown): WeaveBrushConfigParseResult {
  let doc = input;
  if (typeof input === 'string') {
    try {
      doc = JSON.parse(input);
    } catch {
      return { ok: false, errors: ['The document is not valid JSON'] };
    }
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
  const profiles: Partial<Record<WeaveBrushInputProfileKey, WeaveBrushInputProfile>> = {};

  if (doc['profiles'] !== undefined) {
    if (!isObject(doc['profiles'])) {
      errors.push('"profiles" must be an object');
    } else {
      for (const [key, value] of Object.entries(doc['profiles'])) {
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
    }
  }

  let look: WeaveStrokeLook | null | undefined;
  if (doc['look'] !== undefined) {
    if (doc['look'] === null) {
      look = null;
    } else if (!isObject(doc['look'])) {
      errors.push('"look" must be an object or null');
    } else {
      const { version, ...settings } = doc['look'];
      if (version !== WEAVE_STROKE_LEGACY_LOOK.version) {
        errors.push(`Unsupported look version "${String(version)}"`);
      } else {
        const problems = validateBrushTunablePatch('look', settings);
        if (problems.length > 0) {
          errors.push(...problems.map((p) => `look: ${p}`));
        } else {
          look = mergeData(WEAVE_STROKE_LEGACY_LOOK, settings);
        }
      }
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, profiles, look };
}
