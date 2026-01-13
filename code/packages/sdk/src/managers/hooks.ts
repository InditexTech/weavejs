// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Weave } from '@/weave';
import { type Logger } from 'pino';

export class WeaveHooksManager {
  private readonly instance: Weave;
  private readonly logger: Logger;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly registeredHooks: Map<string, (params: any) => void> =
    new Map();

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('hooks-manager');
    this.logger.debug('Hooks manager created');
  }

  registerHook<T>(hookName: string, hook: (params: T) => void): void {
    const exists = this.registeredHooks.has(hookName);
    if (!exists) {
      this.registeredHooks.set(hookName, hook);
    }
  }

  runPhaseHooks<T>(
    phaseName: string,
    execution: (hook: (params: T) => void) => void
  ): void {
    const hooks = [...this.registeredHooks.keys()]
      .filter((key) => key.startsWith(`${phaseName}:`))
      .map((key) => this.registeredHooks.get(key) as (params: T) => void);

    for (const hook of hooks) {
      execution(hook);
    }
  }

  getHook<T>(hookName: string): T | undefined {
    return this.registeredHooks.get(hookName) as T;
  }

  unregisterHook(hookName: string): void {
    this.registeredHooks.delete(hookName);
  }
}
