// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { WEAVE_KONVA_BACKEND } from '@inditextech/weave-types';
import { loadNativeBackend } from './utils/native-backend';

export const setupSkiaBackend = async (): Promise<void> => {
  globalThis._weave_serverSideBackend = WEAVE_KONVA_BACKEND.SKIA;
  await loadNativeBackend(
    'skia-canvas',
    'setupSkiaBackend',
    () => import('konva/skia-backend')
  );
};

export const setupCanvasBackend = async (): Promise<void> => {
  globalThis._weave_serverSideBackend = WEAVE_KONVA_BACKEND.CANVAS;
  await loadNativeBackend(
    'canvas',
    'setupCanvasBackend',
    () => import('konva/canvas-backend')
  );
};
