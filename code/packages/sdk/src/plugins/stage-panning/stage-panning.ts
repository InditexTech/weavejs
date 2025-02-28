import { WeavePlugin } from "@/plugins/plugin";

export class WeaveStagePanningPlugin extends WeavePlugin {
  private enabled: boolean;
  getLayerName = undefined;
  initLayer = undefined;
  render: undefined;

  constructor() {
    super();

    this.enabled = true;
  }

  registersLayers() {
    return false;
  }

  getName() {
    return "stagePanning";
  }

  init() {
    this.initEvents();
  }

  private initEvents() {
    const stage = this.instance.getStage();

    stage.on("wheel", (e) => {
      e.evt.preventDefault();

      if (!this.enabled) {
        return;
      }

      stage.x(stage.x() - e.evt.deltaX);
      stage.y(stage.y() - e.evt.deltaY);
    });
  }

  getEnabled() {
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}
