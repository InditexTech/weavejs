// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
} from '@/types';
import type Konva from 'konva';

export interface WeaveNodeBase {
  getNodeType(): string;

  create(id: string, props: WeaveElementAttributes): WeaveStateElement;

  onAdd?(nodeInstance: WeaveElementInstance): void;

  onRender(props: WeaveElementAttributes): WeaveElementInstance;

  onUpdate(
    instance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void;

  onDestroy(instance: WeaveElementInstance): void;

  serialize(instance: WeaveElementInstance): WeaveStateElement;

  setupDefaultNodeAugmentation(node: Konva.Node): void;

  setupDefaultNodeEvents(node: Konva.Node): void;

  isNodeSelected(ele: Konva.Node): boolean;

  lock(instance: Konva.Node): void;

  unlock(instance: Konva.Node): void;

  isLocked(instance: Konva.Node): boolean;

  isSelecting(): boolean;

  isPasting(): boolean;
}
