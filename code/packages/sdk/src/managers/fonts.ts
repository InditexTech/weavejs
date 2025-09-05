// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type Logger } from 'pino';
import { type WeaveFont } from '@inditextech/weave-types';
import { Weave } from '@/weave';

export class WeaveFontsManager {
  private instance: Weave;
  private logger: Logger;
  private loadedFonts: WeaveFont[] = [];

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('fonts-manager');
    this.logger.debug('Fonts manager created');
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
      fontsToLoad = await fontsConfig();
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
