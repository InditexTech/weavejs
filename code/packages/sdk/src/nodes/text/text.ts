import Konva from "konva";
import { WeaveElementAttributes, WeaveElementInstance } from "@/types";
import { WeaveNode } from "@/nodes/node";
import { Vector2d } from "konva/lib/types";
import { WeaveNodesSelectionPlugin } from "@/plugins/nodes-selection/nodes-selection";
import { resetScale } from "@/utils";

export const WEAVE_TEXT_NODE_TYPE = "text";

export class WeaveTextNode extends WeaveNode {
  protected nodeType = WEAVE_TEXT_NODE_TYPE;
  private editing: boolean = false;

  constructor() {
    super();

    this.editing = false;
  }

  getType(): string {
    return "text";
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

  private updateNode(nodeInstance: WeaveElementInstance) {
    const clonedText = nodeInstance.clone();
    clonedText.setAttr("triggerEditMode", undefined);
    this.instance.updateNode(this.toNode(clonedText));
    clonedText.destroy();
  }

  createInstance(props: WeaveElementAttributes) {
    const stage = this.instance.getStage();

    const text = new Konva.Text({
      ...props,
    });

    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");

    selectionPlugin?.getTransformer().on("dblclick dbltap", (e) => {
      e.evt.preventDefault();

      if (this.editing) {
        return;
      }

      const mousePos = stage.getPointerPosition();
      if (mousePos) {
        const elements = stage.getAllIntersections(mousePos);
        const onlyTextElements = elements.filter((ele) => ele.getAttrs().nodeType === WEAVE_TEXT_NODE_TYPE);

        if (onlyTextElements.length > 0) {
          this.triggerEditMode(onlyTextElements[0] as Konva.Text);
        }
      }
    });

    text.on("transform", () => {
      text.setAttrs({
        width: text.width() * text.scaleX(),
        scaleX: 1,
      });
      resetScale(text);
      text.fontSize(text.fontSize() * text.scaleY());
      this.updateNode(text);
    });

    text.on("dragmove", () => {
      this.updateNode(text);
    });

    text.on("dragend", () => {
      this.updateNode(text);
    });

    text.on("mouseenter", () => {
      stage.container().style.cursor = "pointer";
    });

    text.on("mouseleave", () => {
      stage.container().style.cursor = "default";
    });

    stage.on("mousemove", () => {
      if (!this.editing) {
        return;
      }

      const textArea = document.getElementById(text.id()) as HTMLTextAreaElement | null;

      if (textArea) {
        const textPosition = text.absolutePosition();

        const areaPosition: Vector2d = {
          x: stage.container().offsetLeft + textPosition.x,
          y: stage.container().offsetTop + textPosition.y,
        };

        textArea.style.top = areaPosition.y + "px";
        textArea.style.left = areaPosition.x + "px";
      }
    });

    text.setAttr("triggerEditMode", this.triggerEditMode.bind(this));

    return text;
  }

  updateInstance(nodeInstance: WeaveElementInstance, nextProps: WeaveElementAttributes) {
    const nodeInstanceZIndex = nodeInstance.zIndex();
    nodeInstance.setAttrs({
      ...nextProps,
      zIndex: nodeInstanceZIndex,
    });
  }

  removeInstance(nodeInstance: WeaveElementInstance) {
    nodeInstance.destroy();
  }

  toNode(instance: WeaveElementInstance) {
    const attrs = instance.getAttrs();

    const newAttrs = { ...attrs };
    delete newAttrs.triggerEditMode;

    return {
      key: attrs.id ?? "",
      type: attrs.nodeType,
      props: {
        ...newAttrs,
        id: attrs.id ?? "",
        nodeType: attrs.nodeType,
        children: [],
      },
    };
  }

  private createTextAreaDOM(textNode: Konva.Text, position: Vector2d) {
    const stage = this.instance.getStage();

    // create textarea and style it
    const textArea = document.createElement("textarea");
    stage.container().appendChild(textArea);

    // apply many styles to match text on canvas as close as possible
    // remember that text rendering on canvas and on the textarea can be different
    // and sometimes it is hard to make it 100% the same. But we will try...
    textArea.value = textNode.text();
    textArea.id = textNode.id();
    textArea.style.position = "fixed";
    textArea.style.top = position.y + "px";
    textArea.style.left = position.x + "px";
    textArea.style.width = (textNode.width() - textNode.padding() * 2) * textNode.getAbsoluteScale().x + "px";
    textArea.style.height = (textNode.height() - textNode.padding() * 2) * textNode.getAbsoluteScale().x + "px";
    textArea.style.fontSize = textNode.fontSize() * textNode.getAbsoluteScale().x + "px";
    textArea.style.border = "solid 1px rgba(0,0,255,0.5)";
    textArea.style.padding = "0px";
    textArea.style.margin = "0px";
    textArea.style.overflow = "hidden";
    textArea.style.background = "rgba(255,255,255,0.5)";
    textArea.style.outline = "none";
    textArea.style.resize = "none";
    textArea.style.lineHeight = `${textNode.lineHeight()}`;
    textArea.style.fontFamily = textNode.fontFamily();
    textArea.style.transformOrigin = "left top";
    textArea.style.textAlign = textNode.align();
    textArea.style.color = `${textNode.fill()}`;
    const rotation = textNode.rotation();
    let transform = "";
    if (rotation) {
      transform += "rotateZ(" + rotation + "deg)";
    }

    const px = 1;
    const py = 2;
    transform += "translateX(-" + px + "px)";
    transform += "translateY(-" + py + "px)";

    textArea.style.transform = transform;

    textArea.addEventListener("keydown", (e) => {
      if (textArea && textNode) {
        // hide on enter
        // but don't hide on shift + enter
        if (e.key === "Enter" && !e.shiftKey) {
          textNode.text(textArea.value);
          this.updateNode(textNode);
          this.removeTextAreaDOM(textNode);
          window.removeEventListener("click", handleOutsideClick);
          return;
        }
        // on esc do not set value back to node
        if (e.key === "Escape") {
          this.removeTextAreaDOM(textNode);
          window.removeEventListener("click", handleOutsideClick);
          return;
        }
      }
    });

    textArea.addEventListener("keyup", (e) => {
      textNode.text(textArea.value);
      if (textArea && textNode) {
        // textNode.text(textArea.value);
        textArea.style.width = textNode.width() * textNode.getAbsoluteScale().x + "px";
        if (e.key === "Enter" && e.shiftKey) {
          textArea.style.height = "auto";
          textArea.style.height = textArea.scrollHeight + textNode.fontSize() * textNode.getAbsoluteScale().x + "px";
        } else {
          textArea.style.height = "auto";
          textArea.style.height = textArea.scrollHeight + "px";
        }
      }
    });

    textArea.tabIndex = 1;
    textArea.focus();

    const handleOutsideClick = (e: Event | null) => {
      if (!e && textArea.value === "") {
        this.updateNode(textNode);
        this.removeTextAreaDOM(textNode);
        window.removeEventListener("click", handleOutsideClick);
      }
      if (e && e.target !== textArea && textArea.value !== "") {
        textNode.text(textArea.value);
        this.updateNode(textNode);
        this.removeTextAreaDOM(textNode);
        window.removeEventListener("click", handleOutsideClick);
      }
    };

    setTimeout(() => {
      window.addEventListener("click", handleOutsideClick);
    });
  }

  private removeTextAreaDOM(textNode: Konva.Text) {
    const stage = this.instance.getStage();

    const textArea = document.getElementById(textNode.id()) as HTMLTextAreaElement | null;

    if (textArea) {
      textArea.remove();
      textNode.visible(true);

      const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
      if (selectionPlugin) {
        const tr = selectionPlugin.getTransformer();
        selectionPlugin.setSelectedNodes([textNode]);
        tr.show();
        tr.forceUpdate();
      }

      this.editing = false;
      stage.container().tabIndex = 1;
      stage.container().click();
    }
  }

  private triggerEditMode(textNode: Konva.Text) {
    const stage = this.instance.getStage();

    this.editing = true;

    textNode.visible(false);

    const selectionPlugin = this.instance.getPlugin<WeaveNodesSelectionPlugin>("weaveNodesSelection");
    if (selectionPlugin) {
      const tr = selectionPlugin.getTransformer();
      tr.hide();
    }

    const textPosition = textNode.absolutePosition();

    const areaPosition: Vector2d = {
      x: stage.container().offsetLeft + textPosition.x,
      y: stage.container().offsetTop + textPosition.y,
    };

    this.createTextAreaDOM(textNode, areaPosition);
  }
}
