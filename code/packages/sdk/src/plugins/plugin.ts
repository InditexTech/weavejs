// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Weave } from '@/weave';
import { type WeavePluginBase } from '@inditextech/weave-types';
import { type Logger } from 'pino';

export abstract class WeavePlugin implements WeavePluginBase {
  protected instance!: Weave;
  protected name!: string;
  protected enabled: boolean = true;
  private logger!: Logger;

  register(instance: Weave): WeavePlugin {
    this.instance = instance;
    this.logger = this.instance.getChildLogger(this.getName());
    this.instance
      .getChildLogger('plugin')
      .debug(`Plugin with name [${this.getName()}] registered`);

    return this;
  }

  getName(): string {
    return this.name;
  }

  getLogger(): Logger {
    return this.logger;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  abstract onInit?(): void;

  abstract onRender?(): void;

  abstract enable(): void;

  abstract disable(): void;
}
