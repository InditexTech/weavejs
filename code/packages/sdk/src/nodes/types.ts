// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import type Konva from 'konva';

export type WeaveNodeChangedContainerEvent = {
  originalNode: Konva.Node | null | undefined;
  newNode: Konva.Node | null | undefined;
  originalContainer: Konva.Node | null | undefined;
  newContainer: Konva.Node | null | undefined;
};
