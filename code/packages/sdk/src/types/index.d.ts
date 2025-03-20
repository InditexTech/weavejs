declare global {
  interface Window {
    weave: Weave;
    weaveTextEditing: boolean;
    weaveDragImageURL: string | undefined;
  }
}

declare module 'react-reconciler' {}

export {};
