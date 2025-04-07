import { Weave } from '@/weave';
import { Logger } from 'pino';

export abstract class WeavePlugin {
  protected instance!: Weave;
  protected name!: string;
  private logger!: Logger;

  register(instance: Weave) {
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

  getLogger() {
    return this.logger;
  }

  abstract init?(): void;

  abstract render?(): void;
}
