// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import {
  WeaveElementAttributes,
  WeaveElementInstance,
  WeaveStateElement,
} from './types';

export interface WeaveNodeBase {
  createNode(id: string, props: WeaveElementAttributes): WeaveStateElement;

  createInstance(props: WeaveElementAttributes): WeaveElementInstance;

  updateInstance(
    instance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ): void;

  removeInstance(instance: WeaveElementInstance): void;

  toNode(instance: WeaveElementInstance): WeaveStateElement;
}
