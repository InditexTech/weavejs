import Konva from "konva";
import { WeaveNode } from "@/nodes/node";
import { NodeSerializable } from "@/types";
import { ImageSerializable } from "./types";
import { WeaveNodesSelectionPlugin } from "@/plugins/nodes-selection/nodes-selection";
import { WeaveImageEditionPlugin } from "@/plugins/image-edition/image-edition";
import { WeaveImageToolAction } from "@/actions/image-tool/image-tool";

export class WeaveImageNode extends WeaveNode {
  private imageLoaded: boolean;
  private editing: boolean;

  constructor() {
    super();

    this.imageLoaded = false;
    this.editing = false;
  }

  getType(): string {
    return "image";
  }

  addState(params: NodeSerializable) {
    const imageParams = params as ImageSerializable;
    const { id } = imageParams;

    const state = this.instance.getStore().getState();

    if (state.weave.nodes?.[id]) {
      return;
    }

    if (!state.weave.nodes) {
      state.weave.nodes = {};
    }
    state.weave.nodes[id] = imageParams;
  }

  updateState(params: NodeSerializable) {
    const imageParams = params as ImageSerializable;
    const { id } = imageParams;

    const state = this.instance.getStore().getState();

    if (!state.weave.nodes?.[id]) {
      return;
    }

    delete imageParams["image"];

    state.weave.nodes[id] = {
      ...JSON.parse(JSON.stringify(state.weave.nodes[id])),
      ...imageParams,
    };
  }

  removeState(id: string) {
    const state = this.instance.getStore().getState();

    if (!state.weave.nodes?.[id]) {
      return;
    }

    delete state.weave.nodes[id];
  }

  addRuntime(params: NodeSerializable) {
    const imageParams = params as ImageSerializable;
    const { id } = imageParams;

    const stage = this.instance.getStage();

    const nodesLayer = this.getNodesLayer();

    const image = stage.findOne(`#${id}`) as Konva.Group | undefined;
    if (image) {
      return;
    }

    if (!imageParams.imageURL) {
      throw new Error(`Image URL not provided`);
    }

    const imageProperties = imageParams.imageProperties;
    const groupImageParams: ImageSerializable = {
      ...imageParams,
    };
    delete groupImageParams.imageProperties;
    delete groupImageParams.zIndex;

    const newImageParams: ImageSerializable = {
      ...imageParams,
    };
    delete newImageParams.imageProperties;
    delete newImageParams.imageURL;
    delete newImageParams.zIndex;

    const imageGroup = new Konva.Group({
      ...groupImageParams,
      id,
    });

    const imagePlaceholder = new Konva.Rect({
      ...groupImageParams,
      groupId: id,
      id: `${id}-placeholder`,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      width: imageParams.width ?? 0,
      height: imageParams.height ?? 0,
      fill: "#CCCCCC66",
      stroke: "#CCCCCCFF",
      strokeWidth: 1,
      draggable: false,
      visible: true,
      isSelectable: false,
    });

    imageGroup.add(imagePlaceholder);

    const internalImage = new Konva.Image({
      ...newImageParams,
      ...imageProperties,
      groupId: id,
      id: `${id}-image`,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      width: 0,
      height: 0,
      draggable: false,
      visible: false,
      isSelectable: false,
    });

    imageGroup.add(internalImage);

    imageGroup.on("transform", () => {
      this.updateState({ ...(imageGroup.getAttrs() as ImageSerializable), imageURL: imageParams.imageURL });
    });

    imageGroup.on("mouseenter", (e) => {
      e.evt.preventDefault();

      const activeAction = this.instance.getActiveAction();
      if (typeof activeAction !== "undefined") {
        return;
      }

      if (imageGroup.getAttrs().isSelectable) {
        stage.container().style.cursor = "pointer";
      }
    });

    imageGroup.on("mouseleave", (e) => {
      e.evt.preventDefault();

      const activeAction = this.instance.getActiveAction();
      if (typeof activeAction !== "undefined") {
        return;
      }

      if (imageGroup.getAttrs().isSelectable) {
        stage.container().style.cursor = "default";
      }
    });

    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");

    selectionPlugin?.getTransformer().on("dblclick dbltap", (e) => {
      e.evt.preventDefault();

      if (this.editing) {
        return;
      }

      if (!internalImage.getAttr("image")) {
        return;
      }

      const imageEditionPlugin = this.getImageEditionPlugin();
      imageEditionPlugin.setImage({ ...(imageGroup.getAttrs() as ImageSerializable) });
      imageEditionPlugin.start();
    });

    imageGroup.on("dragmove", () => {
      this.instance.updateElement({
        ...(imageGroup.getAttrs() as ImageSerializable),
        imageURL: imageParams.imageURL,
      });
    });
    imageGroup.on("dragend", () => {
      this.instance.updateElement({
        ...(imageGroup.getAttrs() as ImageSerializable),
        imageURL: imageParams.imageURL,
      });
    });

    this.addToCanvas(imageGroup, imageParams);

    const imageActionTool = this.getImageToolAction();
    const preloadImg = imageActionTool.getPreloadedImage(imageParams.id);
    if (preloadImg) {
      imagePlaceholder?.setAttrs({
        width: imageParams.width ? imageParams.width : preloadImg.width,
        height: imageParams.height ? imageParams.height : preloadImg.height,
        visible: false,
      });
      internalImage?.setAttrs({
        width: imageParams.width ? imageParams.width : preloadImg.width,
        height: imageParams.height ? imageParams.height : preloadImg.height,
        image: preloadImg,
        visible: true,
      });

      this.imageLoaded = true;

      this.updateState({
        ...imageParams,
        zIndex: imageParams.zIndex ?? nodesLayer.getChildren().length - 1,
        width: newImageParams.width ? newImageParams.width : preloadImg.width,
        height: newImageParams.height ? newImageParams.height : preloadImg.height,
        imageInfo: {
          width: preloadImg.width,
          height: preloadImg.height,
        },
      });
    } else {
      this.loadImage(imageParams, imageGroup);
    }
  }

  updateRuntime(params: NodeSerializable) {
    const imageParams = params as ImageSerializable;
    const { id } = imageParams;

    const stage = this.instance.getStage();

    const node = stage.findOne(`#${id}`) as Konva.Group | undefined;
    if (!node) {
      return;
    }

    const imageProperties = imageParams.imageProperties;
    const groupImageParams: ImageSerializable = {
      ...imageParams,
    };
    delete groupImageParams.imageProperties;
    delete groupImageParams.imageURL;

    const newImageParams: ImageSerializable = {
      ...imageParams,
    };
    delete newImageParams.imageProperties;
    delete newImageParams.imageURL;

    node.setAttrs(groupImageParams);

    const imagePlaceholder = node.findOne(`#${imageParams.id}-placeholder`) as Konva.Rect | undefined;
    const internalImage = node.findOne(`#${imageParams.id}-image`) as Konva.Image | undefined;

    if (!this.imageLoaded) {
      imagePlaceholder?.setAttrs({
        ...newImageParams,
        groupId: id,
        id: `${id}-placeholder`,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        visible: true,
        fill: "#CCCCCC66",
        stroke: "#CCCCCCFF",
        strokeWidth: 1,
        draggable: false,
        zIndex: 0,
        isSelectable: false,
      });
      internalImage?.setAttrs({
        ...newImageParams,
        ...imageProperties,
        groupId: id,
        id: `${id}-image`,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        visible: false,
        draggable: false,
        zIndex: 1,
        isSelectable: false,
      });
    }
    if (this.imageLoaded) {
      imagePlaceholder?.setAttrs({
        ...newImageParams,
        groupId: id,
        id: `${id}-placeholder`,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        visible: false,
        fill: "#CCCCCC66",
        stroke: "#CCCCCCFF",
        strokeWidth: 1,
        draggable: false,
        zIndex: 0,
        isSelectable: false,
      });
      internalImage?.setAttrs({
        ...newImageParams,
        ...imageProperties,
        groupId: id,
        id: `${id}-image`,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        visible: true,
        draggable: false,
        zIndex: 1,
        isSelectable: false,
      });
    }

    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.forceUpdate();
      tr.draw();
    }

    this.addToCanvas(node, imageParams);
  }

  removeRuntime(id: string): void {
    const stage = this.instance.getStage();

    const node = stage.findOne(`#${id}`) as Konva.Image | undefined;
    node?.destroy();
  }

  private loadImage(params: NodeSerializable, imageGroup: Konva.Group) {
    const imageParams = params as ImageSerializable;

    const nodesLayer = this.getNodesLayer();

    const imagePlaceholder = imageGroup.findOne(`#${imageParams.id}-placeholder`) as Konva.Rect | undefined;
    const internalImage = imageGroup.findOne(`#${imageParams.id}-image`) as Konva.Image | undefined;

    const imageObj = new Image();
    imageObj.onerror = (error) => {
      console.error("Error loading image", error);
      imagePlaceholder?.setAttrs({
        visible: true,
      });
      internalImage?.setAttrs({
        visible: false,
      });
    };
    imageObj.onload = () => {
      imagePlaceholder?.setAttrs({
        width: imageParams.width ? imageParams.width : imageObj.width,
        height: imageParams.height ? imageParams.height : imageObj.height,
        visible: false,
      });
      internalImage?.setAttrs({
        width: imageParams.width ? imageParams.width : imageObj.width,
        height: imageParams.height ? imageParams.height : imageObj.height,
        image: imageObj,
        visible: true,
      });

      this.imageLoaded = true;

      this.updateState({
        ...imageParams,
        zIndex: imageParams.zIndex ?? nodesLayer.getChildren().length - 1,
        width: imageParams.width ? imageParams.width : imageObj.width,
        height: imageParams.height ? imageParams.height : imageObj.height,
        imageInfo: {
          width: imageObj.width,
          height: imageObj.height,
        },
      });
    };

    if (imageParams.imageURL) {
      imageObj.src = imageParams.imageURL;
    }
  }

  private getImageToolAction() {
    const imageToolAction = this.instance.getAction<WeaveImageToolAction>("weaveImageTool");
    if (!imageToolAction) {
      throw new Error("Image Tool action not found");
    }
    return imageToolAction;
  }

  private getImageEditionPlugin() {
    const imageEditionPlugin = this.instance.getPlugin<WeaveImageEditionPlugin>("weaveImageEdition");
    if (!imageEditionPlugin) {
      throw new Error("Image edition plugin not found");
    }
    return imageEditionPlugin;
  }
}
