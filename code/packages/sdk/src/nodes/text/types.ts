// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';
import { NodeSerializable } from '@inditextech/weave-types';

export type TextSerializable = Konva.TextConfig &
  NodeSerializable & {
    type: 'text';
    id: string;
  };
