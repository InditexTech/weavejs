// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  type WeaveElementAttributes,
  type WeaveElementInstance,
  type WeaveStateElement,
} from '@/types';

export interface WeaveNodeBase {
  create(id: string, props: WeaveElementAttributes): WeaveStateElement;

  onRender(props: WeaveElementAttributes): WeaveElementInstance;

  onUpdate(
    instance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void;

  onDestroy(instance: WeaveElementInstance): void;

  serialize(instance: WeaveElementInstance): WeaveStateElement;
}
