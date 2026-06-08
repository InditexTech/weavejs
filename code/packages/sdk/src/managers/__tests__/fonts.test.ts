// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { WeaveFontsManager } from '../fonts';
import type { Weave } from '@/weave';
import type { WeaveFont } from '@inditextech/weave-types';

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
      new WeaveFontsManager(weave);
      expect(weave.getChildLogger).toHaveBeenCalledWith('fonts-manager');
    });

    it('logs debug on creation', () => {
      const { weave, logger } = makeMockWeave();
      new WeaveFontsManager(weave);
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
});
