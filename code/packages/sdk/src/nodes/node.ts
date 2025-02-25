import { Weave } from "@/weave";
import { WeaveElementAttributes, WeaveElementInstance, WeaveStateElement } from "@/types";

export abstract class WeaveNode {
  protected instance!: Weave;
  protected nodeType!: string;

  register(instance: Weave) {
    this.instance = instance;
  }

  getNodeType() {
    return this.nodeType;
  }

  abstract createNode(id: string, props: WeaveElementAttributes): WeaveStateElement;

  abstract createInstance(props: WeaveElementAttributes): WeaveElementInstance;

  abstract updateInstance(instance: WeaveElementInstance, nextProps: WeaveElementAttributes): void;

  abstract removeInstance(instance: WeaveElementInstance): void;

  abstract toNode(instance: WeaveElementInstance): WeaveStateElement;
}
