// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';

export class GroupFrame extends Konva.Group {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getClientRect(config?: any) {
    const id = this.getAttr('id');

    const containerArea = this.findOne(`#${id}-container-area`) as Konva.Rect;

    if (!containerArea) {
      return super.getClientRect(config);
    }

    if (containerArea.getAttr('id') === this.getAttr('id')) {
      return super.getClientRect(config);
    }

    const rect = containerArea.getClientRect(config);
    return rect;
  }
}
