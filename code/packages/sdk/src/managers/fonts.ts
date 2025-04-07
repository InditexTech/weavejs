import FontFaceObserver from 'fontfaceobserver';
import { Logger } from 'pino';
import { WeaveFont } from '@inditextech/weavejs-types';
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

  async loadFont(font: WeaveFont, fontFamily: FontFaceObserver): Promise<void> {
    return new Promise((resolve) => {
      this.logger.debug(`Loading font with id [${font.id}]`);
      fontFamily
        .load()
        .then(() => {
          this.logger.debug(`Font with id [${font.id}] loaded`);
          this.loadedFonts.push(font);
          resolve();
        })
        .catch(() => {
          this.logger.debug(`Font with id [${font.id}] failed to load`);
          resolve();
        });
    });
  }

  async loadFonts() {
    this.logger.info('Loading fonts');

    if (this.instance.getConfiguration().fonts) {
      const fontPromises = [];
      for (const font of this.instance.getConfiguration()?.fonts ?? []) {
        const fontFamily = new FontFaceObserver(font.id);
        fontPromises.push(this.loadFont(font, fontFamily));
      }

      await Promise.allSettled(fontPromises);
    }

    this.logger.info('Fonts loaded');

    this.instance.emitEvent('weaveFontsLoaded', {});
  }

  getFonts() {
    return this.loadedFonts;
  }
}
