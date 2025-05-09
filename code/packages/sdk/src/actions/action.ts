// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveActionBase,
  type WeaveElementAttributes,
} from '@inditextech/weave-types';
import { Weave } from '@/weave';
import { type Logger } from 'pino';
import type { WeaveActionPropsChangeEvent } from './types';

export abstract class WeaveAction implements WeaveActionBase {
  protected instance!: Weave;
  protected name!: string;
  props!: WeaveElementAttributes;
  private logger!: Logger;

  constructor() {
    return new Proxy<this>(this, {
      set: (
        target: WeaveAction,
        key: keyof WeaveAction,
        value: keyof typeof WeaveAction
      ) => {
        Reflect.set(target, key, value);
        this.onPropsChange?.();
        this.instance?.emitEvent<WeaveActionPropsChangeEvent>('onPropsChange', {
          instance: this,
          props: this.props,
        });
        return true;
      },
    });
  }

  getName(): string {
    return this.name;
  }

  getLogger(): Logger {
    return this.logger;
  }

  register(instance: Weave): WeaveAction {
    this.instance = instance;
    this.logger = this.instance.getChildLogger(this.getName());
    this.instance
      .getChildLogger('action')
      .debug(`Action handler with name [${this.getName()}] registered`);

    return this;
  }

  updateProps(props: WeaveElementAttributes): void {
    this.props = {
      ...this.props,
      ...props,
    };
  }

  getProps(): WeaveElementAttributes {
    return this.props;
  }

  abstract onInit?(): void;

  abstract trigger(cancelAction: () => void, params?: unknown): unknown;

  abstract onPropsChange?(): void;

  abstract cleanup?(): void;
}
