import 'konva/lib/Node';

declare module 'konva/lib/Node' {
  interface Node {
    getTransformerProperties(): WeaveNodeTransformerProperties;
    resetCrop(): void;
    updatePosition(position: Vector2d): void;
  }
}

declare global {
  interface Window {
    weave: Weave;
    weaveOnFieldFocus?: boolean;
    weaveTextEditing?: Record<string, string>;
    weaveDragImageURL?: string;
    colorTokenDragColor?: string;
  }
}
