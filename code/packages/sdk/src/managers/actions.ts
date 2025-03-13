import { Logger } from 'pino';
import { Weave } from '@/weave';
import { WeaveElementAttributes } from '@/types';

export class WeaveActionsManager {
  private instance: Weave;
  private activeAction: string | undefined = undefined;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger('actions-manager');
    this.logger.debug('Actions manager created');
  }

  getActiveAction() {
    return this.activeAction;
  }

  triggerAction<T>(actionName: string, params?: T) {
    const config = this.instance.getConfiguration();
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
    actionsHandlers[actionName].trigger(
      this.cancelActionCallback(actionName),
      params
    );

    config.callbacks?.onActiveActionChange?.(this.activeAction);
    this.instance.emitEvent('onActiveActionChange', this.activeAction);
  }

  updatePropsAction(actionName: string, props: WeaveElementAttributes) {
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

  getPropsAction(actionName: string) {
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

  cancelAction(actionName: string) {
    const config = this.instance.getConfiguration();
    const actionsHandlers = this.instance.getActionsHandlers();

    if (!actionsHandlers[actionName]) {
      const msg = `Action handler with name [${actionName}] not registered`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    this.activeAction = undefined;
    actionsHandlers[actionName].cleanup?.();

    config.callbacks?.onActiveActionChange?.(this.activeAction);
    this.instance.emitEvent('onActiveActionChange', this.activeAction);
  }

  protected cancelActionCallback(actionName: string) {
    return () => {
      this.cancelAction(actionName);
    };
  }
}
