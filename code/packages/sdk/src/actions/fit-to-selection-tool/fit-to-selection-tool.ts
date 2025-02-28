import { WeaveAction } from "@/actions/action";
import { WeaveNodesSelectionPlugin } from "@/plugins/nodes-selection/nodes-selection";
import { WeaveStageZoomPlugin } from "@/plugins/stage-zoom/stage-zoom";

export class WeaveFitToSelectionToolAction extends WeaveAction {
  cleanup = undefined;

  getName(): string {
    return "fitToSelectionTool";
  }

  private getNodesSelectionPlugin() {
    return this.instance.getPlugin<WeaveNodesSelectionPlugin>("nodesSelection");
  }

  private getStageZoomPlugin() {
    return this.instance.getPlugin<WeaveStageZoomPlugin>("stageZoom");
  }

  init() {
    const stageZoomPlugin = this.getStageZoomPlugin();
    if (!stageZoomPlugin) {
      throw new Error("WeaveFitToSelectionTool requires the WeaveStageZoomPlugin to be loaded");
    }
    const nodesSelectionPlugin = this.getNodesSelectionPlugin();
    if (!nodesSelectionPlugin) {
      throw new Error("WeaveFitToSelectionTool requires the WeaveNodeSelectionPlugin to be loaded");
    }
  }

  trigger(cancelAction: () => void) {
    const stageZoomPlugin = this.getStageZoomPlugin();
    stageZoomPlugin.fitToSelection();
    cancelAction();
  }
}
