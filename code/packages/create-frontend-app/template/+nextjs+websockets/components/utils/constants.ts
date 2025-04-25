import {
  WeaveMoveToolAction,
  WeaveSelectionToolAction,
  WeaveTextToolAction,
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
  WeaveLineNode,
  WeaveTextNode,
  WeaveImageNode,
  WeaveFrameNode,
} from '@inditextech/weavejs-sdk';
import { ColorTokenNode } from '@/components/nodes/color-token/color-token';
import { AlignElementsToolAction } from '@/components/actions/align-elements-tool/align-elements-tool';

const FONTS = [
  {
    id: 'NotoSansMono',
    name: 'NotoSansMono, monospace',
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

const NODES = [
  new WeaveStageNode(),
  new WeaveLayerNode(),
  new WeaveGroupNode(),
  new WeaveRectangleNode(),
  new WeaveLineNode(),
  new WeaveTextNode(),
  new WeaveImageNode(),
  new WeaveFrameNode(),
  new ColorTokenNode(),
];

const ACTIONS = [
  new WeaveMoveToolAction(),
  new WeaveSelectionToolAction(),
  new WeaveTextToolAction(),
  new WeaveZoomOutToolAction(),
  new WeaveZoomInToolAction(),
  new WeaveFitToScreenToolAction(),
  new WeaveFitToSelectionToolAction(),
  new AlignElementsToolAction(),
  new WeaveExportNodeToolAction(),
  new WeaveExportStageToolAction(),
];

const CUSTOM_PLUGINS = [new WeaveNodesSnappingPlugin()];

export { FONTS, NODES, ACTIONS, CUSTOM_PLUGINS };
