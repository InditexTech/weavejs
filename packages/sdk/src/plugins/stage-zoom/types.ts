export type WeaveStageZoomChanged = {
  scale: number;
  zoomSteps: number[];
  actualStep: number;
  onDefaultStep: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
};

export type WeaveStageZoomOnZoomChangeCallback = (zoomInfo: WeaveStageZoomChanged) => void;

export type WeaveStageZoomPluginParams = {
  zoomSteps?: number[];
  defaultZoom?: number;
  onZoomChange?: WeaveStageZoomOnZoomChangeCallback;
};
