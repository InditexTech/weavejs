import {
  WeaveMoveToolAction,
  WeaveSelectionToolAction,
  WeaveEraserToolAction,
  WeaveBrushToolAction,
  WeaveFrameToolAction,
  WeaveImageToolAction,
  WeaveLineToolAction,
  WeaveRectangleToolAction,
  WeaveEllipseToolAction,
  WeaveTextToolAction,
  WeaveStarToolAction,
  WeaveArrowToolAction,
  WeaveRegularPolygonToolAction,
  WeaveZoomOutToolAction,
  WeaveZoomInToolAction,
  WeaveExportNodesToolAction,
  WeaveExportStageToolAction,
  WeaveFitToScreenToolAction,
  WeaveFitToSelectionToolAction,
  WeaveStageNode,
  WeaveLayerNode,
  WeaveGroupNode,
  WeaveRectangleNode,
  WeaveEllipseNode,
  WeaveLineNode,
  WeaveStrokeNode,
  WeaveTextNode,
  WeaveImageNode,
  WeaveStarNode,
  WeaveArrowNode,
  WeaveRegularPolygonNode,
  WeaveFrameNode,
  WeaveStageGridPlugin,
  WeaveNodesSelectionPlugin,
  WeaveStagePanningPlugin,
  WeaveStageResizePlugin,
  WeaveStageZoomPlugin,
  WeaveConnectedUsersPlugin,
  WeaveUsersPointersPlugin,
  WeaveUsersSelectionPlugin,
  WeaveStageDropAreaPlugin,
  WeaveCopyPasteNodesPlugin,
  WeaveContextMenuPlugin,
  WeaveNodesMultiSelectionFeedbackPlugin,
} from "@inditextech/weave-sdk";
import { type WeaveUser } from "@inditextech/weave-types";
import { Inter } from "next/font/google";
import { ColorTokenNode } from "@/components/nodes/color-token/color-token";
import { AlignElementsToolAction } from "@/components/actions/align-elements-tool/align-elements-tool";
import { WEAVE_TRANSFORMER_ANCHORS } from "@inditextech/weave-types";
import { ColorTokenToolAction } from "../actions/color-token-tool/color-token-tool";
import { stringToColor } from "./users";
import { getContrastTextColor } from "@/lib/utils";
import { getImageBase64 } from "./images";

const FONTS = () => [
  {
    id: "Inter",
    name: "Inter, sans-serif",
  },
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
  {
    id: "Times",
    name: "Times, serif",
  },
  {
    id: "CourierNew",
    name: "Courier New, monospace",
  },
  {
    id: "Courier",
    name: "Courier, monospace",
  },
  {
    id: "Verdana",
    name: "Verdana, sans-serif",
  },
  {
    id: "Georgia",
    name: "Georgia, serif",
  },
  {
    id: "Palatino",
    name: "Palatino, serif",
  },
  {
    id: "Garamond",
    name: "Garamond, serif",
  },
  {
    id: "Bookman",
    name: "Bookman, serif",
  },
  {
    id: "ComicSansMS",
    name: "Comic Sans MS, cursive",
  },
  {
    id: "TrebuchetMS",
    name: "Trebuchet MS, sans-serif",
  },
  {
    id: "ArialBlack",
    name: "Arial Black, sans-serif",
  },
  {
    id: "Impact",
    name: "Impact, sans-serif",
  },
];

const inter = Inter({
  preload: true,
  variable: "--inter",
  subsets: ["latin"],
});

const NODES = () => [
  new WeaveStageNode(),
  new WeaveLayerNode(),
  new WeaveGroupNode(),
  new WeaveRectangleNode(),
  new WeaveEllipseNode(),
  new WeaveLineNode(),
  new WeaveStrokeNode(),
  new WeaveTextNode(),
  new WeaveImageNode({
    config: {
      transform: {
        enabledAnchors: [
          WEAVE_TRANSFORMER_ANCHORS.TOP_LEFT,
          WEAVE_TRANSFORMER_ANCHORS.TOP_RIGHT,
          WEAVE_TRANSFORMER_ANCHORS.BOTTOM_LEFT,
          WEAVE_TRANSFORMER_ANCHORS.BOTTOM_RIGHT,
        ],
        keepRatio: true,
      },
    },
  }),
  new WeaveStarNode(),
  new WeaveArrowNode(),
  new WeaveRegularPolygonNode(),
  new WeaveFrameNode({
    config: {
      fontFamily: inter.style.fontFamily,
      fontStyle: "normal",
      fontSize: 32,
      fontColor: "#000000ff",
      titleMargin: 10,
      transform: {
        rotateEnabled: false,
        resizeEnabled: false,
        enabledAnchors: [] as string[],
        borderStrokeWidth: 3,
        padding: 0,
      },
    },
  }),
  new ColorTokenNode(),
];

const PLUGINS = (getUser: () => WeaveUser) => [
  new WeaveStageGridPlugin(),
  new WeaveStagePanningPlugin(),
  new WeaveStageResizePlugin(),
  new WeaveStageZoomPlugin(),
  new WeaveNodesSelectionPlugin(),
  new WeaveStageDropAreaPlugin(),
  new WeaveCopyPasteNodesPlugin({
    config: {
      paddingOnPaste: {
        enabled: true,
        paddingX: 20,
        paddingY: 20,
      },
    },
    getImageBase64: async (instance, nodes) => {
      try {
        const res = await getImageBase64({
          instance: instance,
          nodes: nodes.map((node) => node.getAttrs().id ?? ""),
          options: { format: "image/png", padding: 0, pixelRatio: 1 },
        });
        return res.url;
      } catch (error) {
        console.error("Error getting image base64:", error);
        throw error;
      }
    },
  }),
  new WeaveConnectedUsersPlugin({
    config: {
      getUser,
    },
  }),
  new WeaveUsersPointersPlugin({
    config: {
      getUser,
      getUserBackgroundColor: (user: WeaveUser) =>
        stringToColor(user?.name ?? "#000000"),
      getUserForegroundColor: (user: WeaveUser) => {
        const bgColor = stringToColor(user?.name ?? "#ffffff");
        return getContrastTextColor(bgColor);
      },
    },
  }),
  new WeaveUsersSelectionPlugin({
    config: {
      getUser,
      getUserColor: (user: WeaveUser) => stringToColor(user?.name ?? "#000000"),
    },
  }),
  new WeaveContextMenuPlugin({
    config: {
      xOffset: 10,
      yOffset: 10,
    },
  }),
  new WeaveNodesMultiSelectionFeedbackPlugin(),
];

const ACTIONS = () => [
  new WeaveMoveToolAction(),
  new WeaveSelectionToolAction(),
  new WeaveEraserToolAction(),
  new WeaveRectangleToolAction(),
  new WeaveEllipseToolAction(),
  new WeaveLineToolAction(),
  new WeaveBrushToolAction(),
  new WeaveImageToolAction(),
  new WeaveFrameToolAction(),
  new WeaveStarToolAction(),
  new WeaveArrowToolAction(),
  new WeaveRegularPolygonToolAction(),
  new ColorTokenToolAction(),
  new WeaveTextToolAction(),
  new WeaveZoomOutToolAction(),
  new WeaveZoomInToolAction(),
  new WeaveFitToScreenToolAction(),
  new WeaveFitToSelectionToolAction(),
  new AlignElementsToolAction(),
  new WeaveExportNodesToolAction(),
  new WeaveExportStageToolAction(),
];

export { FONTS, NODES, ACTIONS, PLUGINS };
