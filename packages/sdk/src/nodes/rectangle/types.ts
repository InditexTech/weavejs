import Konva from "konva";
import { NodeSerializable } from "@/types";

export type RectangleSerializable = Konva.RectConfig &
  NodeSerializable & {
    type: "rectangle";
    id: string;
  };
