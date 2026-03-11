// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { type ImageCrossOrigin } from '@inditextech/weave-types';
import { mergeExceptArrays } from './utils';
import Konva from 'konva';

export function loadImageSource(
  image: File,
  options?: { crossOrigin: ImageCrossOrigin }
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const { crossOrigin } = mergeExceptArrays(
      { crossOrigin: 'anonymous' },
      options
    );

    const reader = new FileReader();
    reader.onloadend = () => {
      const imageSource = Konva.Util.createImageElement();
      imageSource.crossOrigin = crossOrigin;
      imageSource.onerror = () => {
        reject();
      };
      imageSource.onload = async () => {
        resolve(imageSource);
      };

      imageSource.src = reader.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read image file'));
    };
    reader.readAsDataURL(image);
  });
}

export async function downscaleImageFile(
  file: File,
  ratio: number
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const width = Math.round(bitmap.width * ratio);
  const height = Math.round(bitmap.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), file.type, 0.9);
  });
}

export function getImageSizeFromFile(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      URL.revokeObjectURL(url);
    };

    img.onerror = reject;
    img.src = url;
  });
}

export function getDownscaleRatio(
  width: number,
  height: number,
  options?: { maxWidth: number; maxHeight: number }
): number {
  const { maxWidth, maxHeight } = mergeExceptArrays(
    { maxWidth: 200, maxHeight: 200 },
    options
  );

  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;

  return Math.min(widthRatio, heightRatio, 1);
}

export const downscaleImageFromURL = (
  url: string,
  options?: Partial<{
    type: string;
    crossOrigin: ImageCrossOrigin;
    maxWidth: number;
    maxHeight: number;
  }>
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const { type, crossOrigin, maxWidth, maxHeight } = mergeExceptArrays(
      {
        type: 'image/png',
        crossOrigin: 'anonymous',
        maxWidth: 200,
        maxHeight: 200,
      },
      options
    );

    const img = new Image();
    img.crossOrigin = crossOrigin;

    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

      const width = Math.round(img.width * ratio);
      const height = Math.round(img.height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL(type));
    };

    img.onerror = reject;
    img.src = url;
  });
};
