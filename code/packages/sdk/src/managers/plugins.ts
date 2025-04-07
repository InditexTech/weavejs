import { Logger } from 'pino';
import { Weave } from '@/weave';

export class WeavePluginsManager {
  private instance: Weave;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('plugins-manager');
    this.logger.debug('Plugins manager created');
  }

  enable(pluginName: string) {
    const plugins = this.instance.getPlugins();

    if (!plugins[pluginName]) {
      const msg = `Plugin with name [${pluginName}] not registered`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    plugins[pluginName].enable?.();
  }

  disable(pluginName: string) {
    const plugins = this.instance.getPlugins();

    if (!plugins[pluginName]) {
      const msg = `Plugin with name [${pluginName}] not registered`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    plugins[pluginName].disable?.();
  }

  isEnabled(pluginName: string) {
    const plugins = this.instance.getPlugins();

    if (!plugins[pluginName]) {
      const msg = `Plugin with name [${pluginName}] not registered`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    return plugins[pluginName].isEnabled?.();
  }
}
