// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export interface WeaveActionBase {
  onInit?(): void;

  trigger(cancelAction: () => void, params?: unknown): unknown;

  internalUpdate?(): void;

  cleanup?(): void;
}
