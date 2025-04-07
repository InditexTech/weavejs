// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

declare global {
  interface Window {
    weave: Weave;
    weaveTextEditing: boolean;
    weaveDragImageURL: string | undefined;
  }
}

declare module 'react-reconciler' {}

export {};
