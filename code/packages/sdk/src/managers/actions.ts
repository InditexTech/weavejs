// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type Logger } from 'pino';
import { Weave } from '@/weave';
import { type WeaveElementAttributes } from '@inditextech/weave-types';

export class WeaveActionsManager {
  private instance: Weave;
  private activeAction: string | undefined = undefined;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('actions-manager');
    this.logger.debug('Actions manager created');
  }

  getActiveAction(): string | undefined {
    return this.activeAction;
  }

  triggerAction<T>(actionName: string, params?: T): unknown {
    const actionsHandlers = this.instance.getActionsHandlers();

    if (!actionsHandlers[actionName]) {
      const msg = `Action handler with name [${actionName}] not registered`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    if (typeof this.activeAction !== 'undefined') {
      this.cancelAction(this.activeAction);
    }

    this.activeAction = actionName;
    const payload = actionsHandlers[actionName].trigger(
      this.cancelActionCallback(actionName),
      params
    );

    this.instance.emitEvent('onActiveActionChange', this.activeAction);

    return payload;
  }

  updatePropsAction(actionName: string, props: WeaveElementAttributes): void {
    const actionsHandlers = this.instance.getActionsHandlers();

    if (!actionsHandlers[actionName]) {
      const msg = `Action handler with name [${actionName}] not registered`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    if (this.activeAction !== actionName) {
      const msg = `Action handler with name [${actionName}] not active`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    this.activeAction = actionName;
    actionsHandlers[actionName].updateProps?.(props);
  }

  getPropsAction(actionName: string): WeaveElementAttributes {
    const actionsHandlers = this.instance.getActionsHandlers();

    if (!actionsHandlers[actionName]) {
      const msg = `Action handler with name [${actionName}] not registered`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    if (this.activeAction !== actionName) {
      const msg = `Action handler with name [${actionName}] not active`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    this.activeAction = actionName;
    return actionsHandlers[actionName].getProps?.();
  }

  cancelAction(actionName: string): void {
    const actionsHandlers = this.instance.getActionsHandlers();

    if (!actionsHandlers[actionName]) {
      const msg = `Action handler with name [${actionName}] not registered`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    this.activeAction = undefined;
    actionsHandlers[actionName].cleanup?.();

    this.instance.emitEvent('onActiveActionChange', this.activeAction);
  }

  protected cancelActionCallback(actionName: string) {
    return (): void => {
      this.cancelAction(actionName);
    };
  }
}
