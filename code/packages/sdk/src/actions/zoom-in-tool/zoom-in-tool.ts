import { WeaveAction } from "@/actions/action";
import { WeaveStageZoomPlugin } from "@/plugins/stage-zoom/stage-zoom";

export class WeaveZoomInToolAction extends WeaveAction {
  cleanup = undefined;

  getName(): string {
    return "weaveZoomInTool";
  }

  private getStageZoomPlugin() {
    return this.instance.getPlugin<WeaveStageZoomPlugin>("weaveStageZoom");
  }

  init() {
    const stageZoomPlugin = this.getStageZoomPlugin();
    if (!stageZoomPlugin) {
      throw new Error("WeaveZoomInToolAction requires the WeaveStageZoomPlugin to be loaded");
    }
  }

  trigger(cancelAction: () => void) {
    const stageZoomPlugin = this.getStageZoomPlugin();

    if (!stageZoomPlugin.canZoomIn()) {
      return;
    }

    stageZoomPlugin.zoomIn();
    cancelAction();
  }
}
