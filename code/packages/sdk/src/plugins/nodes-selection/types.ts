import { WeaveSelection } from '@inditextech/weavejs-types';

export type WeaveNodesSelectionChangeCallback = (
  nodes: WeaveSelection[]
) => void;

export type WeaveNodesSelectionPluginCallbacks = {
  onNodesChange: WeaveNodesSelectionChangeCallback;
};
