// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import 'konva';
import 'konva/lib/Node';

declare module 'konva/lib/Node' {
  interface Node {
    getTransformerProperties(): WeaveNodeTransformerProperties;
    triggerCrop(): void;
    closeCrop(type: WeaveImageCropEndType): void;
    resetCrop(): void;
    getRealClientRect(
      config?:
        | {
            skipTransform?: boolean;
            skipShadow?: boolean;
            skipStroke?: boolean;
            relativeTo?: Container;
          }
        | undefined
    ): {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    updatePosition(position: Vector2d): void;
    movedToContainer(container: Konva.Layer | Konva.Group): void;
  }
}

declare module 'konva/lib/Stage' {
  interface Stage {
    _allowActions: string[];
    _allowSelectNodeTypes: string[];
    _allowSelection: boolean;
    allowActions(actions?: string[]): string[];
    allowSelectNodes(nodeTypes?: string[]): string[];
    allowSelection(allowSelection?: boolean): boolean;
    isFocused(): boolean;
    isMouseWheelPressed(): boolean;
  }
}
