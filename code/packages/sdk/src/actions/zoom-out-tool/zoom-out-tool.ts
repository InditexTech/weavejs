import { WeaveAction } from '@/actions/action';
import { WeaveStageZoomPlugin } from '@/plugins/stage-zoom/stage-zoom';

export class WeaveZoomOutToolAction extends WeaveAction {
  internalUpdate = undefined;
  cleanup = undefined;

  getName(): string {
    return 'zoomOutTool';
  }

  private getStageZoomPlugin() {
    return this.instance.getPlugin<WeaveStageZoomPlugin>('stageZoom');
  }

  init() {
    const stageZoomPlugin = this.getStageZoomPlugin();
    if (!stageZoomPlugin) {
      throw new Error(
        'WeaveZoomOutToolAction requires the WeaveStageZoomPlugin to be loaded'
      );
    }
  }

  trigger(cancelAction: () => void) {
    const stageZoomPlugin = this.getStageZoomPlugin();

    if (!stageZoomPlugin.canZoomOut()) {
      return;
    }

    stageZoomPlugin.zoomOut();
    cancelAction();
  }
}
