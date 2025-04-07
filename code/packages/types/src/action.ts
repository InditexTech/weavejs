export interface WeaveActionBase {
  init?(): void;

  trigger(cancelAction: () => void, params?: unknown): unknown;

  internalUpdate?(): void;

  cleanup?(): void;
}
