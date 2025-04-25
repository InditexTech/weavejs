// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WeaveElementAttributes } from '@inditextech/weave-types';
import { Weave } from '@/weave';
import { Logger } from 'pino';
import { WeaveActionCallbacks } from './types';

export abstract class WeaveAction {
  protected instance!: Weave;
  protected name!: string;
  props!: WeaveElementAttributes;
  protected callbacks: WeaveActionCallbacks | undefined;
  private logger!: Logger;

  constructor(callbacks?: WeaveActionCallbacks) {
    this.callbacks = callbacks;
    return new Proxy<this>(this, {
      set: (
        target: WeaveAction,
        key: keyof WeaveAction,
        value: keyof typeof WeaveAction
      ) => {
        Reflect.set(target, key, value);
        this.internalUpdate?.();
        this.callbacks?.onPropsChange?.(this.props);
        return true;
      },
    });
  }

  getName(): string {
    return this.name;
  }

  getLogger() {
    return this.logger;
  }

  register(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger(this.getName());
    this.instance
      .getChildLogger('action')
      .debug(`Action handler with name [${this.getName()}] registered`);

    return this;
  }

  updateProps(props: WeaveElementAttributes) {
    this.props = {
      ...this.props,
      ...props,
    };
  }

  getProps() {
    return this.props;
  }

  abstract init?(): void;

  abstract trigger(cancelAction: () => void, params?: unknown): unknown;

  abstract internalUpdate?(): void;

  abstract cleanup?(): void;
}
