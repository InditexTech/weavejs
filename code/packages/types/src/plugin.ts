export interface WeavePluginBase {
  init?(): void;

  render?(): void;

  enable(): void;

  disable(): void;

  isEnabled(): boolean;
}
