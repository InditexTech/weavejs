// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0
// import Konva from 'konva';

// Konva.Util.createCanvasElement = () => {
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   const canvas: any = new OffscreenCanvas(1, 1);
//   canvas.style = {};
//   return canvas;
// };

self.onmessage = async (e: MessageEvent) => {
  const { bitmap } = e.data;

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const buffer = await blob.arrayBuffer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).postMessage(
    { buffer, width: bitmap.width, height: bitmap.height },
    [buffer]
  );
};
