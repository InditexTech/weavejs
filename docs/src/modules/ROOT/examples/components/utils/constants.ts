import {
  WeaveMoveToolAction,
  WeaveSelectionToolAction,
  WeaveRectangleToolAction,
  WeaveZoomOutToolAction,
  WeaveZoomInToolAction,
  WeaveExportNodeToolAction,
  WeaveExportStageToolAction,
  WeaveFitToScreenToolAction,
  WeaveFitToSelectionToolAction,
  WeaveNodesSnappingPlugin,
  WeaveStageNode,
  WeaveLayerNode,
  WeaveGroupNode,
  WeaveRectangleNode,
} from "@inditextech/weavejs-sdk"; // <1>

const FONTS = [
  {
    id: "Arial",
    name: "Arial, sans-serif",
  },
  {
    id: "Helvetica",
    name: "Helvetica, sans-serif",
  },
  {
    id: "TimesNewRoman",
    name: "Times New Roman, serif",
  },
]; // <2>

const NODES = [
  new WeaveStageNode(),
  new WeaveLayerNode(),
  new WeaveGroupNode(),
  new WeaveRectangleNode(),
]; // <3>

const ACTIONS = [
  new WeaveMoveToolAction(),
  new WeaveSelectionToolAction(),
  new WeaveRectangleToolAction({}),
  new WeaveZoomOutToolAction(),
  new WeaveZoomInToolAction(),
  new WeaveFitToScreenToolAction(),
  new WeaveFitToSelectionToolAction(),
  new WeaveExportNodeToolAction(),
  new WeaveExportStageToolAction(),
]; // <4>

const CUSTOM_PLUGINS = [new WeaveNodesSnappingPlugin()]; // <5>

export { FONTS, NODES, ACTIONS, CUSTOM_PLUGINS };
