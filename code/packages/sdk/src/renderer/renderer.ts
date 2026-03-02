// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Weave } from '@/weave';
import type { Logger } from 'pino';

export abstract class WeaveRenderer {
  protected instance!: Weave;
  protected name!: string;
  protected logger!: Logger;

  getName(): string {
    return this.name;
  }

  getLogger(): Logger {
    return this.logger;
  }

  register(instance: Weave): WeaveRenderer {
    this.instance = instance;
    this.logger = this.instance.getChildLogger(this.getName());

    this.instance
      .getMainLogger()
      .info(`Renderer with name [${this.getName()}] registered`);

    return this;
  }

  abstract init(): void;

  abstract render(callback?: () => void): void;
}
