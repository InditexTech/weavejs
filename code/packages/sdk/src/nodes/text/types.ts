import Konva from "konva";
import { NodeSerializable } from "@/types";

export type TextSerializable = Konva.TextConfig &
  NodeSerializable & {
    type: "text";
    id: string;
  };
