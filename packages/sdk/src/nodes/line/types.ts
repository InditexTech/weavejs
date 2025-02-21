import Konva from "konva";
import { NodeSerializable } from "@/types";

export type LineSerializable = Konva.LineConfig &
  NodeSerializable & {
    type: "line";
    id: string;
  };
