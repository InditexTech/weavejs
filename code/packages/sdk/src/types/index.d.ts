// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

declare global {
  interface Window {
    weave: Weave;
    weaveTextEditing: Record<string, string>;
    weaveDragImageURL: string | undefined;
    weaveDragImageId: string | undefined;
    weaveDragVideoParams: WeaveVideoToolDragParams | undefined;
    weaveDragVideoId: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clipboardData: any;
  }
  // eslint-disable-next-line no-var
  var _weave_isServerSide: boolean;
  // eslint-disable-next-line no-var
  var _weave_serverSideBackend: 'skia' | 'canvas' | undefined;
}

declare module 'react-reconciler' {}

export {};
