import { Weave } from '@inditextech/weave-sdk';
import Konva from 'konva';

export type PresentationImage = {
  img: HTMLImageElement;
  width: number;
  height: number;
  alt: string;
};

export const loadImage = async (node: Konva.Node) => {
  const nodeAttrs = node.getAttrs();
  try {
    const frameBg = node.findOne(`#${nodeAttrs.id}-bg`) as Konva.Group;
    if (!frameBg) {
      return;
    }
    const boxBg = frameBg.getClientRect();
    const img = await toImageAsync(node, {
      x: boxBg.x + 4,
      y: boxBg.y + 4,
      pixelRatio: 2,
      width: boxBg.width - 8,
      height: boxBg.height - 8,
    });
    return {
      src: img.src,
      width: img.width,
      height: img.height,
      alt: 'A frame image',
      className: 'object-fit w-full h-full',
    };
  } catch (ex) {
    console.error(ex);
  }
};

export const toImageAsync = (
  node: Konva.Node,
  properties: {
    pixelRatio?: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }
): Promise<HTMLImageElement> => {
  return new Promise((resolve) => {
    node.toImage({
      mimeType: 'image/png',
      quality: 1,
      pixelRatio: properties.pixelRatio ?? 1,
      x: properties.x,
      y: properties.y,
      width: properties.width,
      height: properties.height,
      callback(img: any) {
        resolve(img);
      },
    });
  });
};

export async function generatePresentation(framesAvailable: Konva.Node[]) {
  const images: PresentationImage[] = [];
  for (const frame of framesAvailable) {
    const attrs = frame.getAttrs();
    const frameBg = frame.findOne(`#${attrs.id}-bg`) as Konva.Group;
    const boxBg = frameBg.getClientRect();
    const img = await toImageAsync(frame, {
      pixelRatio: 4,
      x: boxBg.x + 4,
      y: boxBg.y + 4,
      width: boxBg.width - 8,
      height: boxBg.height - 8,
    });
    images.push({
      img,
      width: img.width,
      height: img.height,
      alt: 'A frame image',
    });
  }

  return images;
}
