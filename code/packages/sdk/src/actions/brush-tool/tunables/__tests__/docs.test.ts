// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { BRUSH_TUNABLES } from '../descriptors';
import {
  BRUSH_LOOK_PRESETS,
  BRUSH_PROFILE_PRESETS,
  BRUSH_SCENARIOS,
} from '../presets';

// The docs live at the repository root, outside this package.
const page = new URL(
  '../../../../../../../../docs/src/modules/sdk/pages/api-reference/actions/brush-tuning.adoc',
  import.meta.url
);

describe.skipIf(!existsSync(page))('brush tuning documentation', () => {
  const text = existsSync(page) ? readFileSync(page, 'utf8') : '';

  it('documents every tunable setting', () => {
    for (const t of BRUSH_TUNABLES) {
      expect(text, `setting ${t.key} is not documented`).toContain(`mono:[${t.key}]`);
    }
  });

  it('documents every factory preset', () => {
    for (const presets of Object.values(BRUSH_PROFILE_PRESETS)) {
      for (const p of presets) {
        expect(text, `preset ${p.id}`).toContain(`mono:[${p.id}]`);
      }
    }
    for (const p of BRUSH_LOOK_PRESETS) {
      expect(text, `look preset ${p.id}`).toContain(`mono:[${p.id}]`);
    }
  });

  it('documents every scenario', () => {
    for (const s of BRUSH_SCENARIOS) {
      expect(text, `scenario ${s.id}`).toContain(s.label);
    }
  });
});
