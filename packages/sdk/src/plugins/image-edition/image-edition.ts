import Konva from "konva";
import { WeavePlugin } from "@/plugins/plugin";
import { WEAVE_IMAGE_EDITION_LAYER_ID } from "./constants";
import { ImageSerializable } from "@/nodes/image/types";
import { WeaveNodesSelectionPlugin } from "../nodes-selection/nodes-selection";
import { WeaveStagePanningPlugin } from "../stage-panning/stage-panning";
import { Vector2d } from "konva/lib/types";
import { WEAVE_NODE_LAYER_ID } from "../nodes-layer/constants";
import { resetScale } from "@/utils";

export class WeaveImageEditionPlugin extends WeavePlugin {
  private layer!: Konva.Layer;
  private editing: boolean;
  private actualImage: ImageSerializable | null;
  init: undefined;

  constructor() {
    super();

    this.editing = false;
    this.actualImage = null;
  }

  registersLayers() {
    return true;
  }

  getName() {
    return "weaveImageEdition";
  }

  getLayerName() {
    return WEAVE_IMAGE_EDITION_LAYER_ID;
  }

  initLayer() {
    const stage = this.instance.getStage();

    const layer = new Konva.Layer({ id: WEAVE_IMAGE_EDITION_LAYER_ID });

    stage.container().addEventListener("keydown", (e) => {
      if (this.editing) {
        if (e.key === "Enter" || e.key === "Escape") {
          this.cleanup();
          return;
        }
      }
    });

    layer.scaleX(1 / stage.scaleX());
    layer.scaleY(1 / stage.scaleX());

    stage.add(layer);

    this.layer = layer;
  }

  setImage(imageParams: ImageSerializable) {
    this.actualImage = imageParams;
  }

  getImage() {
    return this.actualImage;
  }

  start() {
    if (!this.actualImage) {
      return;
    }

    this.editing = true;

    const imageParams = this.actualImage;

    const stage = this.instance.getStage();
    const getNodesLayer = this.getNodesLayer();
    const imageEditionLayer = this.getImageEditionLayer();

    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      selectionPlugin.setSelectedNodes([]);
      tr.hide();
      tr.forceUpdate();
    }

    const panningPlugin = this.instance.getPlugin<WeaveStagePanningPlugin>("weaveStagePanning");
    if (panningPlugin) {
      panningPlugin.setEnabled(false);
    }

    const imageNode = getNodesLayer.findOne(`#${imageParams.id}-image`) as Konva.Image;

    if (!imageNode || !imageEditionLayer) {
      this.cleanup();
      return;
    }

    const stageCrop = new Konva.Group({
      id: `${imageParams.id}-editor`,
      x: -stage.getAbsolutePosition().x,
      y: -stage.getAbsolutePosition().y,
      width: stage.width(),
      height: stage.height(),
      scale: { x: 1, y: 1 },
      draggable: false,
    });

    const imageSize: { width: number; height: number } = {
      width: imageNode.getAttr("image").width,
      height: imageNode.getAttr("image").height,
    };

    const stageRatio = stage.width() / stage.height();
    const imageRatio = imageSize.width / imageSize.height;

    const padding = 150;
    let imageGroupPoint: Vector2d = { x: 0, y: 0 };
    let imageGroupSize: { width: number; height: number } = { width: 0, height: 0 };
    if (stageRatio >= 1) {
      imageGroupSize = {
        width: (stage.height() - 2 * padding) * imageRatio,
        height: stage.height() - 2 * padding,
      };
      imageGroupPoint = {
        x: (stage.width() - (stage.height() - 2 * padding) * imageRatio) / 2,
        y: padding,
      };
    } else {
      imageGroupSize = {
        width: stage.width() - 2 * padding,
        height: stage.width() - 2 * padding * imageRatio,
      };
      imageGroupPoint = {
        x: padding,
        y: (stage.height() - (stage.height() - 2 * padding) * imageRatio) / 2,
      };
    }

    const background = new Konva.Rect({
      id: `${imageParams.id}-editor-background`,
      x: 0,
      y: 0,
      width: stage.width(),
      height: stage.height(),
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      fill: "#CCCCCCDD",
      strokeEnabled: false,
      listening: false,
      draggable: false,
    });

    stageCrop.add(background);

    const workImage = new Konva.Image({
      id: `${imageParams.id}-editor-image`,
      x: imageGroupPoint.x,
      y: imageGroupPoint.y,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      width: imageGroupSize.width,
      height: imageGroupSize.height,
      image: imageNode.getAttr("image"),
      draggable: false,
    });

    stageCrop.add(workImage);

    const cropAreaConstrain = workImage.getClientRect();
    const realImageRatio = imageSize.width / workImage.width();

    const imageProperties = imageParams.imageProperties;

    const cropX = imageProperties.cropX
      ? imageGroupPoint.x + imageProperties.cropX / realImageRatio
      : imageGroupPoint.x;
    const cropY = imageProperties.cropY
      ? imageGroupPoint.y + imageProperties.cropY / realImageRatio
      : imageGroupPoint.y;
    const cropWidth = imageProperties.cropWidth ? imageProperties.cropWidth / realImageRatio : workImage.width();
    const cropHeight = imageProperties.cropHeight ? imageProperties.cropHeight / realImageRatio : workImage.height();

    const cropArea = new Konva.Rect({
      id: `${imageParams.id}-editor-crop-area`,
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      fill: "#CC000066",
      stroke: "#CC0000FF",
      strokeWidth: 1,
      draggable: true,
    });

    stageCrop.add(cropArea);

    let latestCropPosition = cropArea.getAbsolutePosition();
    let latestCropWidth = cropArea.width();
    let latestCropHeight = cropArea.height();

    cropArea.on("transform", () => {
      resetScale(cropArea);

      const cropPosition = cropArea.getAbsolutePosition();
      const cropWidth = cropArea.width();
      const cropHeight = cropArea.height();
      const constrainPosition = workImage.getAbsolutePosition();
      const constrainWidth = workImage.width();
      const constrainHeight = workImage.height();

      const cropNewPos = { x: cropPosition.x, y: cropPosition.y };
      let cropNewWidth = cropWidth;
      let cropNewHeight = cropHeight;

      if (
        cropNewPos.x < constrainPosition.x &&
        cropNewPos.y < constrainPosition.y &&
        cropNewPos.x + cropNewWidth <= constrainPosition.x + constrainWidth &&
        cropNewPos.y + cropNewHeight <= constrainPosition.y + constrainHeight
      ) {
        cropNewPos.y = latestCropPosition.y;
        cropNewHeight = latestCropHeight;
        cropNewPos.x = latestCropPosition.x;
        cropNewWidth = latestCropWidth;
      }

      if (cropNewPos.x < constrainPosition.x && cropNewPos.y + cropNewHeight > constrainPosition.y + constrainHeight) {
        cropNewPos.y = latestCropPosition.y;
        cropNewHeight = latestCropHeight;
        cropNewPos.x = latestCropPosition.x;
        cropNewWidth = latestCropWidth;
      }

      if (
        cropNewPos.x + cropNewWidth > constrainPosition.x + constrainWidth &&
        cropNewPos.y + cropNewHeight > constrainPosition.y + constrainHeight
      ) {
        cropNewPos.y = latestCropPosition.y;
        cropNewHeight = latestCropHeight;
        cropNewPos.x = latestCropPosition.x;
        cropNewWidth = latestCropWidth;
      }

      if (cropNewPos.x + cropNewWidth > constrainPosition.x + constrainWidth && cropNewPos.y < constrainPosition.y) {
        cropNewPos.y = latestCropPosition.y;
        cropNewHeight = latestCropHeight;
        cropNewPos.x = latestCropPosition.x;
        cropNewWidth = latestCropWidth;
      }

      if (cropNewPos.x < constrainPosition.x) {
        cropNewPos.y = latestCropPosition.y;
        cropNewHeight = latestCropHeight;

        cropNewWidth = Math.max(1, cropNewWidth - (constrainPosition.x - cropNewPos.x));
        cropNewPos.x = constrainPosition.x;
      }

      if (cropNewPos.x >= constrainPosition.x + constrainWidth) {
        cropNewPos.y = latestCropPosition.y;
        cropNewHeight = latestCropHeight;

        cropNewWidth = 1;
        cropNewPos.x = constrainPosition.x + constrainWidth - 1;
      }

      if (
        cropNewPos.x < constrainPosition.x + constrainWidth &&
        cropNewPos.x + cropNewWidth > constrainPosition.x + constrainWidth &&
        cropNewPos.y >= constrainPosition.y
      ) {
        cropNewPos.y = latestCropPosition.y;
        cropNewHeight = latestCropHeight;

        cropNewWidth = constrainPosition.x + constrainWidth - cropNewPos.x;
      }

      if (cropNewPos.y < constrainPosition.y) {
        cropNewPos.x = latestCropPosition.x;
        cropNewWidth = latestCropWidth;

        cropNewHeight = Math.max(1, cropNewHeight - (constrainPosition.y - cropNewPos.y));
        cropNewPos.y = constrainPosition.y;
      }

      if (cropNewPos.y >= constrainPosition.y + constrainHeight) {
        cropNewPos.x = latestCropPosition.x;
        cropNewWidth = latestCropWidth;

        cropNewHeight = 1;
        cropNewPos.y = constrainPosition.y + constrainHeight - 1;
      }

      if (
        cropNewPos.y < constrainPosition.y + constrainHeight &&
        cropNewPos.y + cropNewHeight > constrainPosition.y + constrainHeight &&
        cropNewPos.x >= constrainPosition.x
      ) {
        cropNewPos.x = latestCropPosition.x;
        cropNewWidth = latestCropWidth;

        cropNewHeight = constrainPosition.y + constrainHeight - cropNewPos.y;
      }

      cropArea.setAbsolutePosition(cropNewPos);
      cropArea.width(cropNewWidth);
      cropArea.height(cropNewHeight);

      latestCropPosition = cropArea.getAbsolutePosition();
      latestCropWidth = cropArea.width();
      latestCropHeight = cropArea.height();
    });

    cropArea.on("dragmove", () => {
      const box = cropArea.getClientRect();
      const absPos = cropArea.getAbsolutePosition();
      const offsetX = box.x - absPos.x;
      const offsetY = box.y - absPos.y;

      const newAbsPos = { ...absPos };
      if (box.x < cropAreaConstrain.x) {
        newAbsPos.x = -offsetX + cropAreaConstrain.x;
      }
      if (box.y < cropAreaConstrain.y) {
        newAbsPos.y = -offsetY + cropAreaConstrain.y;
      }
      if (box.x + box.width > cropAreaConstrain.x + workImage.width()) {
        newAbsPos.x = cropAreaConstrain.x + workImage.width() - box.width - offsetX;
      }
      if (box.y + box.height > cropAreaConstrain.y + workImage.height()) {
        newAbsPos.y = cropAreaConstrain.y + workImage.height() - box.height - offsetY;
      }

      cropArea.setAbsolutePosition(newAbsPos);
    });

    const cropTransformer = new Konva.Transformer({
      id: `${imageParams.id}-transformer`,
      nodes: [cropArea],
      ignoreStroke: true,
      flipEnabled: false,
      rotateEnabled: false,
    });

    stageCrop.add(cropTransformer);

    imageEditionLayer.add(stageCrop);
  }

  cleanup() {
    if (!this.editing || !this.actualImage) {
      return;
    }

    this.editing = false;

    const imageParams = this.actualImage;

    const stage = this.instance.getStage();

    const imageGroup = stage.findOne(`#${imageParams.id}`) as Konva.Group | undefined;

    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
    if (imageGroup && selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      selectionPlugin.setSelectedNodes([imageGroup]);
      tr.show();
      tr.forceUpdate();
    }

    const panningPlugin = this.instance.getPlugin<WeaveStagePanningPlugin>("weaveStagePanning");
    if (panningPlugin) {
      panningPlugin.setEnabled(true);
    }

    const editorImage = stage.findOne(`#${imageParams.id}-editor-image`) as Konva.Rect | undefined;
    const cropArea = stage.findOne(`#${imageParams.id}-editor-crop-area`) as Konva.Rect | undefined;
    if (editorImage && cropArea) {
      const boxImage = editorImage.getClientRect();
      const boxCropArea = cropArea.getClientRect({ relativeTo: editorImage });
      const realImageWidth = editorImage.getAttr("image").width;

      const ratio = realImageWidth / boxImage.width;

      const cropX = Math.trunc(Math.abs(boxCropArea.x - boxImage.x) * ratio);
      const cropY = Math.trunc(Math.abs(boxCropArea.y - boxImage.y) * ratio);
      const cropWidth = Math.trunc(boxCropArea.width * ratio);
      const cropHeight = Math.trunc(boxCropArea.height * ratio);

      this.instance.updateElement({
        ...imageParams,
        width: cropWidth,
        height: cropHeight,
        imageProperties: {
          cropX,
          cropY,
          cropWidth,
          cropHeight,
        },
      });
    }

    this.getImageEditionLayer().destroyChildren();

    // const editorGroup = stage.findOne(`#${imageParams.id}-editor`) as Konva.Group | undefined;

    // if (editorGroup) {
    //   editorGroup.destroy();
    // }
  }

  getIsEditing() {
    return this.editing;
  }

  render() {
    const stage = this.instance.getStage();

    this.layer.destroyChildren();

    this.layer.scaleX(1 / stage.scaleX());
    this.layer.scaleY(1 / stage.scaleX());

    if (this.editing) {
      this.start();
    }
  }

  private getNodesLayer() {
    const stage = this.instance.getStage();

    const layer = stage.findOne(`#${WEAVE_NODE_LAYER_ID}`) as Konva.Layer | undefined;
    if (!layer) {
      throw new Error(`Layer with id ${WEAVE_NODE_LAYER_ID} doesn't exists`);
    }

    return layer;
  }

  private getImageEditionLayer() {
    const stage = this.instance.getStage();

    const layer = stage.findOne(`#${WEAVE_IMAGE_EDITION_LAYER_ID}`) as Konva.Layer | undefined;
    if (!layer) {
      throw new Error(`Layer with id ${WEAVE_IMAGE_EDITION_LAYER_ID} doesn't exists`);
    }

    return layer;
  }
}
