// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export interface WeavePluginBase {
  onInit?(): void;

  onRender?(): void;

  enable(): void;

  disable(): void;

  isEnabled(): boolean;
}
