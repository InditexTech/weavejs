import {
  WeaveMoveToolAction,
  WeaveSelectionToolAction,
  WeaveEraserToolAction,
  WeaveBrushToolAction,
  WeaveFrameToolAction,
  WeaveImageToolAction,
  WeavePenToolAction,
  WeaveRectangleToolAction,
  WeaveEllipseToolAction,
  WeaveTextToolAction,
  WeaveZoomOutToolAction,
  WeaveZoomInToolAction,
  WeaveExportNodeToolAction,
  WeaveExportStageToolAction,
  WeaveFitToScreenToolAction,
  WeaveFitToSelectionToolAction,
  WeaveStageNode,
  WeaveLayerNode,
  WeaveGroupNode,
  WeaveRectangleNode,
  WeaveEllipseNode,
  WeaveLineNode,
  WeaveTextNode,
  WeaveImageNode,
  WeaveFrameNode,
} from '@inditextech/weave-sdk';
import { Inter } from 'next/font/google';
import { ColorTokenNode } from '@/components/nodes/color-token/color-token';
import { AlignElementsToolAction } from '@/components/actions/align-elements-tool/align-elements-tool';
import { WEAVE_TRANSFORMER_ANCHORS } from '@inditextech/weave-types';
import { ColorTokenToolAction } from '../actions/color-token-tool/color-token-tool';

const FONTS = [
  {
    id: 'Inter',
    name: 'Inter, sans-serif',
  },
  {
    id: 'Arial',
    name: 'Arial, sans-serif',
  },
  {
    id: 'Helvetica',
    name: 'Helvetica, sans-serif',
  },
  {
    id: 'TimesNewRoman',
    name: 'Times New Roman, serif',
  },
  {
    id: 'Times',
    name: 'Times, serif',
  },
  {
    id: 'CourierNew',
    name: 'Courier New, monospace',
  },
  {
    id: 'Courier',
    name: 'Courier, monospace',
  },
  {
    id: 'Verdana',
    name: 'Verdana, sans-serif',
  },
  {
    id: 'Georgia',
    name: 'Georgia, serif',
  },
  {
    id: 'Palatino',
    name: 'Palatino, serif',
  },
  {
    id: 'Garamond',
    name: 'Garamond, serif',
  },
  {
    id: 'Bookman',
    name: 'Bookman, serif',
  },
  {
    id: 'ComicSansMS',
    name: 'Comic Sans MS, cursive',
  },
  {
    id: 'TrebuchetMS',
    name: 'Trebuchet MS, sans-serif',
  },
  {
    id: 'ArialBlack',
    name: 'Arial Black, sans-serif',
  },
  {
    id: 'Impact',
    name: 'Impact, sans-serif',
  },
];

const inter = Inter({
  preload: true,
  variable: '--inter',
  subsets: ['latin'],
});

const NODES = [
  new WeaveStageNode(),
  new WeaveLayerNode(),
  new WeaveGroupNode(),
  new WeaveRectangleNode(),
  new WeaveEllipseNode(),
  new WeaveLineNode(),
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
  new WeaveFrameNode({
    config: {
      fontFamily: inter.style.fontFamily,
      fontStyle: '300',
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

const ACTIONS = [
  new WeaveMoveToolAction(),
  new WeaveSelectionToolAction(),
  new WeaveEraserToolAction(),
  new WeaveRectangleToolAction(),
  new WeaveEllipseToolAction(),
  new WeavePenToolAction(),
  new WeaveBrushToolAction(),
  new WeaveImageToolAction(),
  new WeaveFrameToolAction(),
  new ColorTokenToolAction(),
  new WeaveTextToolAction(),
  new WeaveZoomOutToolAction(),
  new WeaveZoomInToolAction(),
  new WeaveFitToScreenToolAction(),
  new WeaveFitToSelectionToolAction(),
  new AlignElementsToolAction(),
  new WeaveExportNodeToolAction(),
  new WeaveExportStageToolAction(),
];

export { FONTS, NODES, ACTIONS };
