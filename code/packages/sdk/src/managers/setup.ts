// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Weave } from '@/weave';
import { type Logger } from 'pino';
import { version } from '@/../package.json';

export class WeaveSetupManager {
  private instance: Weave;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('setup-manager');
    this.logger.debug('Setup manager created');
  }
  welcomeLog(): void {
    const logDisable = this.instance.getLogger().getDisabled();
    const logLevel = this.instance.getLogger().getLevel();

    const configuration = this.instance.getConfiguration();

    const params = [
      `%cWEAVE.JS%c\nversion: ${version}\nlog disabled: ${logDisable}\nlog level: ${logLevel}\n\nupscaling enabled [${
        configuration.performance?.upscale?.enabled ?? false
      }], base width [${
        configuration.performance?.upscale?.baseWidth ?? 1920
      }] base height [${
        configuration.performance?.upscale?.baseHeight ?? 1080
      }] multiplier [${configuration.performance?.upscale?.multiplier ?? 1}]`,
      `color: black; font-size: 20px; font-weight: bold; padding: 2px; margin-bottom: 12px;`,
      `color: black;`,
    ];

    // eslint-disable-next-line no-console
    console.log(...params);
  }

  setupLog(): void {
    const nodesHandlers = this.instance.getRegisterManager().getNodesHandlers();
    const actionsHandlers = this.instance
      .getRegisterManager()
      .getActionsHandlers();
    const plugins = this.instance.getRegisterManager().getPlugins();

    const params = [
      `%cWEAVE.JS SETUP%c\nREGISTERED%c\nnodes: ${
        Object.keys(nodesHandlers).length
      }\nactions: ${Object.keys(actionsHandlers).length}\nplugins: ${
        Object.keys(plugins).length
      }`,
      `color: black; font-size: 16px; font-weight: bold; padding: 2px;`,
      `color: black; font-size: 12px; font-weight: bold; margin-top: 8px; margin-bottom: 8px; border-bottom: solid 1px black;`,
      `color: black;`,
    ];
    // eslint-disable-next-line no-console
    console.log(...params);
  }

  setupPlugins(): void {
    this.logger.debug('Setting up plugins');
    const plugins = this.instance.getRegisterManager().getPlugins();
    for (const plugin of Object.keys(plugins)) {
      const pluginInstance = plugins[plugin];
      pluginInstance.onInit?.();
    }
  }

  setupActions(): void {
    this.logger.debug('Setting up actions');
    const actionsHandlers = this.instance
      .getRegisterManager()
      .getActionsHandlers();
    for (const actionId of Object.keys(actionsHandlers)) {
      const actionInstance = actionsHandlers[actionId];
      actionInstance.onInit?.();
    }
  }
}
