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

  render(props: WeaveElementAttributes): WeaveElementInstance;

  update(
    instance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void;

  destroy(instance: WeaveElementInstance): void;

  serialize(instance: WeaveElementInstance): WeaveStateElement;
}
