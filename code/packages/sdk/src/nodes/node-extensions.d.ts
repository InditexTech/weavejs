// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import 'konva';

declare module 'konva/lib/Node' {
  interface Node {
    getTransformerProperties(): WeaveNodeTransformerProperties;
  }
}
