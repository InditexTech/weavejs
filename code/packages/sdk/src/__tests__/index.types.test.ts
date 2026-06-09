// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('konva/skia-backend', () => ({}));
vi.mock('konva/canvas-backend', () => ({}));

// Importing from the barrel file is what drives coverage for index.types.ts.
import * as IndexTypes from '../index.types';

// ---------------------------------------------------------------------------
// Suite 1: index.common re-exports
// ---------------------------------------------------------------------------

describe('index.types barrel: index.common re-exports', () => {
  it('exports Weave constructor', () => {
    expect(typeof IndexTypes.Weave).toBe('function');
  });

  it('exports WeaveNode base class', () => {
    expect(typeof IndexTypes.WeaveNode).toBe('function');
  });

  it('exports WeaveAction base class', () => {
    expect(typeof IndexTypes.WeaveAction).toBe('function');
  });

  it('exports WeavePlugin base class', () => {
    expect(typeof IndexTypes.WeavePlugin).toBe('function');
  });

  it('exports WeaveStore base class', () => {
    expect(typeof IndexTypes.WeaveStore).toBe('function');
  });

  it('exports WeaveRenderer class', () => {
    expect(typeof IndexTypes.WeaveRenderer).toBe('function');
  });

  it('exports defaultInitialState', () => {
    expect(IndexTypes.defaultInitialState).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Suite 2: internal-utils/mapping re-exports
// ---------------------------------------------------------------------------

describe('index.types barrel: mapping re-exports', () => {
  it('exports isArray as a function', () => {
    expect(typeof IndexTypes.isArray).toBe('function');
  });

  it('exports isObject as a function', () => {
    expect(typeof IndexTypes.isObject).toBe('function');
  });

  it('exports mapJsonToYjsMap as a function', () => {
    expect(typeof IndexTypes.mapJsonToYjsMap).toBe('function');
  });

  it('exports mapJsonToYjsArray as a function', () => {
    expect(typeof IndexTypes.mapJsonToYjsArray).toBe('function');
  });

  it('exports mapJsonToYjsElements as a function', () => {
    expect(typeof IndexTypes.mapJsonToYjsElements).toBe('function');
  });

  it('exports weavejsToYjsBinary as a function', () => {
    expect(typeof IndexTypes.weavejsToYjsBinary).toBe('function');
  });

  it('exports getJSONFromYjsBinary as a function', () => {
    expect(typeof IndexTypes.getJSONFromYjsBinary).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// Suite 3: backend re-exports
// ---------------------------------------------------------------------------

describe('index.types barrel: backend re-exports', () => {
  beforeEach(() => {
    globalThis._weave_serverSideBackend = undefined;
  });

  it('exports setupSkiaBackend as a function', () => {
    expect(typeof IndexTypes.setupSkiaBackend).toBe('function');
  });

  it('exports setupCanvasBackend as a function', () => {
    expect(typeof IndexTypes.setupCanvasBackend).toBe('function');
  });

  it('setupSkiaBackend is callable via the barrel export', async () => {
    await expect(IndexTypes.setupSkiaBackend()).resolves.toBeUndefined();
  });

  it('setupCanvasBackend is callable via the barrel export', async () => {
    await expect(IndexTypes.setupCanvasBackend()).resolves.toBeUndefined();
  });
});
