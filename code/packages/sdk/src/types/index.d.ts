declare global {
  interface Window {
    weave: Weave;
    weaveDragImageURL: string | undefined;
  }
}

declare module "react-reconciler" {}

export {};
