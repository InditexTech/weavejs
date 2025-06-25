// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type Logger } from 'pino';
import { Weave } from '@/weave';

export class WeavePluginsManager {
  private instance: Weave;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('plugins-manager');
    this.logger.debug('Plugins manager created');
  }

  enable(pluginName: string): void {
    const plugins = this.instance.getPlugins();

    if (plugins[pluginName]) {
      plugins[pluginName].enable();
    }
  }

  disable(pluginName: string): void {
    const plugins = this.instance.getPlugins();

    if (plugins[pluginName]) {
      plugins[pluginName].disable();
    }
  }

  isEnabled(pluginName: string): boolean {
    const plugins = this.instance.getPlugins();

    if (plugins[pluginName]) {
      return plugins[pluginName].isEnabled();
    }

    return false;
  }
}
