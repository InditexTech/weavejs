import { Weave } from "@/weave";

export abstract class WeavePlugin {
  protected instance!: Weave;

  register(instance: Weave) {
    this.instance = instance;
  }

  abstract registersLayers(): boolean;

  abstract getName(): string;

  abstract init?(): void;

  abstract render?(): void;
}
