import Konva from "konva";
import { NodeSerializable } from "@/types";

export type ImageSerializable = Konva.ImageConfig &
  NodeSerializable & {
    type: "image";
    id: string;
    imageURL?: string;
    imageInfo?: {
      width: number;
      height: number;
    };
  };
