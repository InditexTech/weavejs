// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type Logger } from 'pino';
import { type WeaveFont } from '@inditextech/weave-types';
import { Weave } from '@/weave';
import type { WeaveFontFamily } from '@/types';

export class WeaveFontsManager {
  private instance: Weave;
  private logger: Logger;
  private loadedFonts: WeaveFont[] = [];

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('fonts-manager');
    this.logger.debug('Fonts manager created');
  }

  private async loadFontFamily(
    fontFamily: WeaveFontFamily
  ): Promise<WeaveFont> {
    const fontsPromises = [];

    for (const fontFace of fontFamily.fontFaces) {
      const { source, ...fontFaceDescriptors } = fontFace;
      const fontVariant = new FontFace(
        fontFamily.family,
        source,
        fontFaceDescriptors
      );
      fontsPromises.push(
        fontVariant.load().then(() => document.fonts.add(fontVariant))
      );
    }

    await Promise.all(fontsPromises);

    return {
      id: fontFamily.family,
      name: `${fontFamily.family}, sans-serif`,
      offsetY: fontFamily.offset.y,
      supportedStyles: fontFamily.supportedStyles,
    };
  }

  private async loadFontsFamilies(
    fontFamilies: WeaveFontFamily[]
  ): Promise<WeaveFont[]> {
    const familiesPromises = [];

    for (const fontFamily of fontFamilies) {
      familiesPromises.push(this.loadFontFamily(fontFamily));
    }

    try {
      const fonts = await Promise.all(familiesPromises);
      return fonts;
    } catch (ex) {
      console.error('Error loading fonts families', ex);
      return [];
    }
  }

  async loadFonts(): Promise<void> {
    this.logger.info('Loading fonts');

    const fontsConfig = this.instance.getConfiguration().fonts;

    if (!fontsConfig) {
      this.logger.warn('No fonts defined');
      return;
    }

    let fontsToLoad: WeaveFont[] = [];

    if (fontsConfig && fontsConfig instanceof Function) {
      fontsToLoad = await fontsConfig(this.loadFontsFamilies.bind(this));
    }
    if (fontsConfig && fontsConfig instanceof Array) {
      fontsToLoad = fontsConfig;
    }

    for (const font of fontsToLoad) {
      this.loadedFonts.push(font);
    }

    this.logger.info('Fonts loaded');

    this.instance.emitEvent<WeaveFont[]>('onFontsLoaded', this.loadedFonts);
  }

  getFonts(): WeaveFont[] {
    return this.loadedFonts;
  }
}
