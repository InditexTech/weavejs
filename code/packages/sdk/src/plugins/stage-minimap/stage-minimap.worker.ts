// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

globalThis.onmessage = async (e: MessageEvent) => {
  const { bitmap } = e.data;

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const buffer = await blob.arrayBuffer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).postMessage(
    { buffer, width: bitmap.width, height: bitmap.height },
    [buffer]
  );
};
