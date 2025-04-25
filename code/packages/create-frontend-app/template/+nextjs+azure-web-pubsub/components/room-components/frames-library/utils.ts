import Konva from "konva";

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
      mimeType: "image/jpeg",
      quality: 1,
      pixelRatio: properties.pixelRatio ?? 1,
      x: properties.x,
      y: properties.y,
      width: properties.width,
      height: properties.height,
      callback(img) {
        resolve(img);
      },
    });
  });
};
