import { Weave } from "@/weave";
import { Logger } from "pino";

export abstract class WeaveAction {
  protected instance!: Weave;
  protected name!: string;
  private logger!: Logger;

  getName(): string {
    return this.name;
  }

  getLogger() {
    return this.logger;
  }

  register(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger(this.getName());
    this.instance.getChildLogger("action").debug(`Action handler with name [${this.getName()}] registered`);

    return this;
  }

  abstract init?(): void;

  abstract trigger(cancelAction: () => void, params?: unknown): void;

  abstract cleanup?(): void;
}
