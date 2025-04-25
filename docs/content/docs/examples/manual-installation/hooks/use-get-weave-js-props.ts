import {
  ACTIONS,
  FONTS,
  NODES,
  CUSTOM_PLUGINS,
} from "@/components/utils/constants";
import useContextMenu from "./use-context-menu";
import { WeaveCopyPasteNodesPlugin } from "@inditextech/weave-sdk";

function useGetWeaveJSProps() {
  const { contextMenu } = useContextMenu();

  return {
    fonts: FONTS,
    nodes: NODES,
    customPlugins: [
      ...CUSTOM_PLUGINS,
      contextMenu,
      new WeaveCopyPasteNodesPlugin({}),
    ],
    actions: ACTIONS,
  };
}

export default useGetWeaveJSProps;
