import { WEAVE_KONVA_BACKEND } from '@inditextech/weave-types';

export const setupSkiaBackend = async (): Promise<void> => {
  global._weave_serverSideBackend = WEAVE_KONVA_BACKEND.SKIA;
  await import('konva/skia-backend');
};

export const setupCanvasBackend = async (): Promise<void> => {
  global._weave_serverSideBackend = WEAVE_KONVA_BACKEND.CANVAS;
  await import('konva/canvas-backend');
};
