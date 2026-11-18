import 'konva/lib/Node';

declare module 'konva/lib/Node' {
  interface Node {
    getTransformerProperties(): WeaveNodeTransformerProperties;
    triggerCrop(): void;
    closeCrop(type: WeaveImageCropEndType): void;
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
    weaveDragImageId?: string;
    colorTokenDragColor?: string;
  }
}
