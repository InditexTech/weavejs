import { Weave } from "@/weave";
import { WeaveElementAttributes, WeaveElementInstance, WeaveStateElement } from "@/types";
import { Logger } from "pino";

export abstract class WeaveNode {
  protected instance!: Weave;
  protected nodeType!: string;
  private logger!: Logger;

  register(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger(this.getNodeType());
    this.instance.getChildLogger("node").debug(`Node with type [${this.getNodeType()}] registered`);

    return this;
  }

  getNodeType() {
    return this.nodeType;
  }

  getLogger() {
    return this.logger;
  }

  abstract createNode(id: string, props: WeaveElementAttributes): WeaveStateElement;

  abstract createInstance(props: WeaveElementAttributes): WeaveElementInstance;

  abstract updateInstance(instance: WeaveElementInstance, nextProps: WeaveElementAttributes): void;

  abstract removeInstance(instance: WeaveElementInstance): void;

  abstract toNode(instance: WeaveElementInstance): WeaveStateElement;
}
