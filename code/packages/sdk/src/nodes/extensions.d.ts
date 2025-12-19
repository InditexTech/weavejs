// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import 'konva';
import type Konva from 'konva';
import 'konva/lib/Node';

declare module 'konva/lib/Node' {
  interface Node {
    getTransformerProperties(): WeaveNodeTransformerProperties;
    triggerCrop(): void;
    closeCrop(type: WeaveImageCropEndType): void;
    resetCrop(): void;
    allowedAnchors(): string[];
    realTopLeftOffset(): Vector2d;
    getExportClientRect(
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updatePosition(position: Vector2d): void;
    dblClick(): void;
    isSelectable(): boolean;
    movedToContainer(container: Konva.Layer | Konva.Group): void;
    handleMouseover(): void;
    handleMouseout(): void;
    handleSelectNode(): void;
    handleDeselectNode(): void;
    canBeHovered(): boolean;
    canDrag(): boolean;
    canMoveToContainer(node: Konva.Node): boolean;
    getNodeAnchors(): WeaveConnectorAnchor[];
  }
  interface Layer {
    canMoveToContainer(node: Konva.Node): boolean;
  }
}

declare module 'konva/lib/Stage' {
  interface Stage {
    _mode: string;
    _allowActions: string[];
    _allowSelectNodeTypes: string[];
    _allowSelection: boolean;
    mode(mode?: WeaveStageMode): string;
    allowActions(actions?: string[]): string[];
    allowSelectNodes(nodeTypes?: string[]): string[];
    allowSelection(allowSelection?: boolean): boolean;
    isFocused(): boolean;
    isMouseWheelPressed(): boolean;
    handleMouseover(): void;
    handleMouseout(): void;
  }
}
