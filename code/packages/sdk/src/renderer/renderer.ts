// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Weave } from '@/weave';
import { type WeaveRendererBase } from '@inditextech/weave-types';
import type { Logger } from 'pino';

export abstract class WeaveRenderer implements WeaveRendererBase {
  protected instance!: Weave;
  protected logger!: Logger;
  protected name!: string;

  getName(): string {
    return this.name;
  }

  getLogger(): Logger {
    return this.logger;
  }

  register(instance: Weave): this {
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
