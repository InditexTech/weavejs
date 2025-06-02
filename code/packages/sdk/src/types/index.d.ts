// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import '@/nodes/extensions';

declare global {
  interface Window {
    weave: Weave;
    weaveTextEditing: Record<string, string>;
    weaveDragImageURL: string | undefined;
  }
}

declare module 'react-reconciler' {}

export {};
