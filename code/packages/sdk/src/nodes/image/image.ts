import Konva from "konva";
import { WeaveElementAttributes, WeaveElementInstance } from "@/types";
import { WeaveNode } from "../node";
import { ImageProps } from "./types";
import { WeaveNodesSelectionPlugin } from "@/plugins/nodes-selection/nodes-selection";
import { WeaveImageEditionPlugin } from "@/plugins/image-edition/image-edition";
import { WeaveImageToolAction } from "@/actions/image-tool/image-tool";

export const WEAVE_IMAGE_NODE_TYPE = "image";

export class WeaveImageNode extends WeaveNode {
  protected nodeType = WEAVE_IMAGE_NODE_TYPE;
  private imageLoaded: boolean;
  private editing: boolean;

  constructor() {
    super();

    this.imageLoaded = false;
    this.editing = false;
  }

  createNode(key: string, props: WeaveElementAttributes) {
    return {
      key,
      type: this.nodeType,
      props: {
        ...props,
        id: key,
        nodeType: this.nodeType,
        children: [],
      },
    };
  }

  createInstance(props: WeaveElementAttributes) {
    const stage = this.instance.getStage();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageProperties: any = props.imageProperties;
    const imageProps = props as ImageProps;
    const { id } = imageProps;

    const groupImageProps = {
      ...imageProps,
    };
    delete groupImageProps.imageProperties;
    delete groupImageProps.zIndex;

    const internalImageProps = {
      ...props,
    };
    delete internalImageProps.imageProperties;
    delete internalImageProps.imageURL;
    delete internalImageProps.zIndex;

    const image = new Konva.Group({
      ...groupImageProps,
      id,
    });

    const imagePlaceholder = new Konva.Rect({
      ...groupImageProps,
      groupId: id,
      id: `${id}-placeholder`,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      width: imageProps.width ?? 0,
      height: imageProps.height ?? 0,
      fill: "#CCCCCC66",
      stroke: "#CCCCCCFF",
      strokeWidth: 1,
      draggable: false,
      visible: true,
      isSelectable: false,
    });

    image.add(imagePlaceholder);

    const internalImage = new Konva.Image({
      ...internalImageProps,
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

    image.add(internalImage);

    image.on("transform", () => {
      this.instance.updateNode(this.toNode(image));
    });

    image.on("mouseenter", (e) => {
      e.evt.preventDefault();

      const activeAction = this.instance.getActiveAction();
      if (typeof activeAction !== "undefined") {
        return;
      }

      if (image.getAttrs().isSelectable) {
        stage.container().style.cursor = "pointer";
      }
    });

    image.on("mouseleave", (e) => {
      e.evt.preventDefault();

      const activeAction = this.instance.getActiveAction();
      if (typeof activeAction !== "undefined") {
        return;
      }

      if (image.getAttrs().isSelectable) {
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
      imageEditionPlugin.setImage(image);
      imageEditionPlugin.start();
    });

    image.on("dragmove", () => {
      this.instance.updateNode(this.toNode(image));
    });

    image.on("dragend", () => {
      this.instance.updateNode(this.toNode(image));
    });

    const imageActionTool = this.getImageToolAction();
    const preloadImg = imageActionTool.getPreloadedImage(imageProps.id);
    if (preloadImg) {
      imagePlaceholder?.setAttrs({
        width: imageProps.width ? imageProps.width : preloadImg.width,
        height: imageProps.height ? imageProps.height : preloadImg.height,
        visible: false,
      });
      internalImage?.setAttrs({
        width: imageProps.width ? imageProps.width : preloadImg.width,
        height: imageProps.height ? imageProps.height : preloadImg.height,
        image: preloadImg,
        visible: true,
      });

      this.imageLoaded = true;

      image.setAttr("width", image.width() ? image.width() : preloadImg.width);
      image.setAttr("height", image.height() ? image.height() : preloadImg.height);
      image.setAttr("imageInfo", {
        width: preloadImg.width,
        height: preloadImg.height,
      });
      this.instance.updateNode(this.toNode(image));
    } else {
      this.loadImage(imageProps, image);
    }

    image.setAttr("imageURL", imageProps.imageURL);

    return image;
  }

  updateInstance(nodeInstance: WeaveElementInstance, nextProps: WeaveElementAttributes) {
    const id = nodeInstance.getAttrs().id;
    const node = nodeInstance as Konva.Group;

    const nodeInstanceZIndex = nodeInstance.zIndex();
    nodeInstance.setAttrs({
      ...nextProps,
      zIndex: nodeInstanceZIndex,
    });

    const imagePlaceholder = node.findOne(`#${id}-placeholder`) as Konva.Rect | undefined;
    const internalImage = node.findOne(`#${id}-image`) as Konva.Image | undefined;

    const nodeAttrs = node.getAttrs();

    if (!this.imageLoaded) {
      imagePlaceholder?.setAttrs({
        ...(nodeAttrs.imageProperties ?? {}),
        ...nodeAttrs,
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
        ...(nodeAttrs.imageProperties ?? {}),
        ...nodeAttrs,
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
        ...(nodeAttrs.imageProperties ?? {}),
        ...nodeAttrs,
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
        ...(nodeAttrs.imageProperties ?? {}),
        ...nodeAttrs,
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
  }

  removeInstance(nodeInstance: WeaveElementInstance) {
    nodeInstance.destroy();
  }

  toNode(instance: WeaveElementInstance) {
    const attrs = instance.getAttrs();

    return {
      key: attrs.id ?? "",
      type: attrs.nodeType,
      props: {
        ...attrs,
        id: attrs.id ?? "",
        nodeType: attrs.nodeType,
        children: [],
      },
    };
  }

  private loadImage(params: WeaveElementAttributes, image: Konva.Group) {
    const imageProps = params as ImageProps;

    const imagePlaceholder = image.findOne(`#${imageProps.id}-placeholder`) as Konva.Rect | undefined;
    const internalImage = image.findOne(`#${imageProps.id}-image`) as Konva.Image | undefined;

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
        width: imageProps.width ? imageProps.width : imageObj.width,
        height: imageProps.height ? imageProps.height : imageObj.height,
        visible: false,
      });
      internalImage?.setAttrs({
        width: imageProps.width ? imageProps.width : imageObj.width,
        height: imageProps.height ? imageProps.height : imageObj.height,
        image: imageObj,
        visible: true,
      });

      this.imageLoaded = true;

      image.setAttr("width", imageProps.width ? imageProps.width : imageObj.width);
      image.setAttr("height", imageProps.height ? imageProps.height : imageObj.height);
      image.setAttr("imageInfo", {
        width: imageObj.width,
        height: imageObj.height,
      });
      this.instance.updateNode(this.toNode(image));
    };

    if (imageProps.imageURL) {
      imageObj.src = imageProps.imageURL;
    }
  }

  private getImageToolAction() {
    const imageToolAction = this.instance.getActionHandler<WeaveImageToolAction>("weaveImageTool");
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
