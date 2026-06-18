// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WeaveFontsManager } from '../fonts';
import type { Weave } from '@/weave';
import type { WeaveFont } from '@inditextech/weave-types';
import type { WeaveFontFamily } from '@/types';

const FONT_A: WeaveFont = { id: 'font-a', name: 'Font A' };
const FONT_B: WeaveFont = { id: 'font-b', name: 'Font B' };

function makeMockWeave(fonts?: unknown) {
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const weave = {
    getChildLogger: vi.fn().mockReturnValue(logger),
    getConfiguration: vi.fn().mockReturnValue({ fonts }),
    emitEvent: vi.fn(),
  };
  return { weave: weave as unknown as Weave, logger };
}

describe('WeaveFontsManager', () => {
  describe('constructor', () => {
    it('calls getChildLogger with "fonts-manager"', () => {
      const { weave } = makeMockWeave();
      const _mgr = new WeaveFontsManager(weave);
      expect(weave.getChildLogger).toHaveBeenCalledWith('fonts-manager');
    });

    it('logs debug on creation', () => {
      const { weave, logger } = makeMockWeave();
      const _mgr = new WeaveFontsManager(weave);
      expect(logger.debug).toHaveBeenCalledWith('Fonts manager created');
    });
  });

  describe('getFonts()', () => {
    it('returns empty array initially', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveFontsManager(weave);
      expect(mgr.getFonts()).toEqual([]);
    });

    it('returns the same array reference (no copy)', () => {
      const { weave } = makeMockWeave();
      const mgr = new WeaveFontsManager(weave);
      expect(mgr.getFonts()).toBe(mgr.getFonts());
    });
  });

  describe('loadFonts()', () => {
    it('logs info("Loading fonts") on every call', async () => {
      const { weave, logger } = makeMockWeave(undefined);
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      expect(logger.info).toHaveBeenCalledWith('Loading fonts');
    });

    it('returns early and logs warn when fontsConfig is falsy', async () => {
      const { weave, logger } = makeMockWeave(undefined);
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      expect(logger.warn).toHaveBeenCalledWith('No fonts defined');
      expect(weave.emitEvent).not.toHaveBeenCalled();
    });

    it('loads fonts from an async function (fontsConfig instanceof Function)', async () => {
      const fontsFn = vi.fn().mockResolvedValue([FONT_A, FONT_B]);
      const { weave } = makeMockWeave(fontsFn);
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      expect(fontsFn).toHaveBeenCalled();
      expect(mgr.getFonts()).toEqual([FONT_A, FONT_B]);
    });

    it('loads fonts from an array (fontsConfig instanceof Array)', async () => {
      const { weave } = makeMockWeave([FONT_A, FONT_B]);
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      expect(mgr.getFonts()).toEqual([FONT_A, FONT_B]);
    });

    it('getFonts() returns loaded fonts after function-based load', async () => {
      const { weave } = makeMockWeave(async () => [FONT_A]);
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      expect(mgr.getFonts()).toContain(FONT_A);
    });

    it('getFonts() returns loaded fonts after array-based load', async () => {
      const { weave } = makeMockWeave([FONT_B]);
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      expect(mgr.getFonts()).toContain(FONT_B);
    });

    it('emits onFontsLoaded with loaded fonts after successful load', async () => {
      const { weave } = makeMockWeave([FONT_A]);
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      expect(weave.emitEvent).toHaveBeenCalledWith('onFontsLoaded', [FONT_A]);
    });

    it('does NOT emit onFontsLoaded when fontsConfig is falsy', async () => {
      const { weave } = makeMockWeave(undefined);
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      expect(weave.emitEvent).not.toHaveBeenCalled();
    });

    it('logs info("Fonts loaded") after processing', async () => {
      const { weave, logger } = makeMockWeave([FONT_A]);
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      expect(logger.info).toHaveBeenCalledWith('Fonts loaded');
    });

    it('accumulates fonts across multiple loadFonts() calls', async () => {
      const { weave } = makeMockWeave([FONT_A]);
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      // Update configuration to return FONT_B on second call
      (weave.getConfiguration as ReturnType<typeof vi.fn>).mockReturnValue({ fonts: [FONT_B] });
      await mgr.loadFonts();
      expect(mgr.getFonts()).toEqual([FONT_A, FONT_B]);
    });

    it('emits onFontsLoaded with empty array when fontsConfig is a non-function non-array truthy value', async () => {
      // Neither instanceof Function nor instanceof Array — fontsToLoad stays []
      const { weave } = makeMockWeave({ someOtherConfig: true });
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      expect(weave.emitEvent).toHaveBeenCalledWith('onFontsLoaded', []);
    });
  });

  describe('loadFontFamily() and loadFontsFamilies() via function config', () => {
    const FONT_FAMILY: WeaveFontFamily = {
      family: 'TestFont',
      fontFaces: [{ source: 'url(test.woff2)', weight: '400', style: 'normal' }],
      offset: { x: 0, y: 2 },
      supportedStyles: ['normal'],
    };

    let mockFontFaceInstance: { load: ReturnType<typeof vi.fn> };
    let MockFontFaceClass: ReturnType<typeof vi.fn>;
    let documentFontsAdd: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFontFaceInstance = { load: vi.fn().mockResolvedValue(undefined) };
      MockFontFaceClass = vi.fn().mockImplementation(() => mockFontFaceInstance);
      documentFontsAdd = vi.fn();
      vi.stubGlobal('FontFace', MockFontFaceClass);
      vi.stubGlobal('document', { fonts: { add: documentFontsAdd } });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('constructs FontFace with family, source, and remaining descriptors', async () => {
      const { weave } = makeMockWeave(
        async (loadFontsFamilies: (f: WeaveFontFamily[]) => Promise<WeaveFont[]>) =>
          loadFontsFamilies([FONT_FAMILY])
      );
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      expect(MockFontFaceClass).toHaveBeenCalledWith('TestFont', 'url(test.woff2)', {
        weight: '400',
        style: 'normal',
      });
    });

    it('calls load() and document.fonts.add() for each font face', async () => {
      const { weave } = makeMockWeave(
        async (loadFontsFamilies: (f: WeaveFontFamily[]) => Promise<WeaveFont[]>) =>
          loadFontsFamilies([FONT_FAMILY])
      );
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      expect(mockFontFaceInstance.load).toHaveBeenCalledTimes(1);
      expect(documentFontsAdd).toHaveBeenCalledWith(mockFontFaceInstance);
    });

    it('resolves loadFontFamily with the correct WeaveFont shape', async () => {
      const { weave } = makeMockWeave(
        async (loadFontsFamilies: (f: WeaveFontFamily[]) => Promise<WeaveFont[]>) =>
          loadFontsFamilies([FONT_FAMILY])
      );
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      expect(mgr.getFonts()).toEqual([
        {
          id: 'TestFont',
          name: 'TestFont, sans-serif',
          offsetY: 2,
          supportedStyles: ['normal'],
        },
      ]);
    });

    it('loads multiple font families and returns all as WeaveFont[]', async () => {
      const FONT_FAMILY_B: WeaveFontFamily = {
        family: 'AnotherFont',
        fontFaces: [{ source: 'url(another.woff2)' }],
        offset: { x: 0, y: 0 },
        supportedStyles: ['bold'],
      };
      const { weave } = makeMockWeave(
        async (loadFontsFamilies: (f: WeaveFontFamily[]) => Promise<WeaveFont[]>) =>
          loadFontsFamilies([FONT_FAMILY, FONT_FAMILY_B])
      );
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      const fonts = mgr.getFonts();
      expect(fonts).toHaveLength(2);
      expect(fonts[0].id).toBe('TestFont');
      expect(fonts[1].id).toBe('AnotherFont');
    });

    it('handles a font family with multiple font faces', async () => {
      const MULTI_FACE_FAMILY: WeaveFontFamily = {
        family: 'MultiFont',
        fontFaces: [
          { source: 'url(multi-regular.woff2)', weight: '400' },
          { source: 'url(multi-bold.woff2)', weight: '700' },
        ],
        offset: { x: 0, y: 0 },
        supportedStyles: ['normal', 'bold'],
      };
      const { weave } = makeMockWeave(
        async (loadFontsFamilies: (f: WeaveFontFamily[]) => Promise<WeaveFont[]>) =>
          loadFontsFamilies([MULTI_FACE_FAMILY])
      );
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      expect(MockFontFaceClass).toHaveBeenCalledTimes(2);
      expect(mockFontFaceInstance.load).toHaveBeenCalledTimes(2);
    });

    it('returns empty array and logs error when FontFace.load() rejects', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      mockFontFaceInstance.load.mockRejectedValue(new Error('load failed'));
      const { weave } = makeMockWeave(
        async (loadFontsFamilies: (f: WeaveFontFamily[]) => Promise<WeaveFont[]>) =>
          loadFontsFamilies([FONT_FAMILY])
      );
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      expect(consoleSpy).toHaveBeenCalledWith('Error loading fonts families', expect.any(Error));
      expect(mgr.getFonts()).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('emits onFontsLoaded with empty array when loadFontsFamilies errors', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      mockFontFaceInstance.load.mockRejectedValue(new Error('load failed'));
      const { weave } = makeMockWeave(
        async (loadFontsFamilies: (f: WeaveFontFamily[]) => Promise<WeaveFont[]>) =>
          loadFontsFamilies([FONT_FAMILY])
      );
      const mgr = new WeaveFontsManager(weave);
      await mgr.loadFonts();
      expect(weave.emitEvent).toHaveBeenCalledWith('onFontsLoaded', []);
    });
  });
});
