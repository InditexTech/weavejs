import Konva from "konva";
import { WeaveNode } from "@/nodes/node";
import { NodeSerializable } from "@/types";
import { Vector2d } from "konva/lib/types";
import { WeaveNodesSelectionPlugin } from "@/plugins/nodes-selection/nodes-selection";
import { TextSerializable } from "./types";
import { resetScale } from "@/utils";

export class WeaveTextNode extends WeaveNode {
  private editing: boolean = false;

  constructor() {
    super();

    this.editing = false;
  }

  getType(): string {
    return "text";
  }

  addState(params: NodeSerializable) {
    const textParams = params as TextSerializable;
    const { id } = textParams;

    const state = this.instance.getStore().getState();

    if (state.weave.nodes?.[id]) {
      return;
    }

    if (!state.weave.nodes) {
      state.weave.nodes = {};
    }
    state.weave.nodes[id] = textParams;
  }

  updateState(params: NodeSerializable) {
    const textParams = params as TextSerializable;
    const { id } = textParams;

    const state = this.instance.getStore().getState();

    if (!state.weave.nodes?.[id]) {
      return;
    }

    delete textParams["triggerEditMode"];

    state.weave.nodes[id] = {
      ...JSON.parse(JSON.stringify(state.weave.nodes[id])),
      ...textParams,
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
    const textParams = params as TextSerializable;
    const { id, draggable } = textParams;

    const stage = this.instance.getStage();

    const text = stage.findOne(`#${id}`) as Konva.Group | undefined;
    if (text) {
      return;
    }

    const newTextParams: TextSerializable = {
      ...textParams,
    };
    delete newTextParams.zIndex;

    const newText = new Konva.Text(newTextParams);

    newText.on("transform", () => {
      newText.setAttrs({
        width: newText.width() * newText.scaleX(),
        scaleX: 1,
      });
      resetScale(newText);
      newText.fontSize(newText.fontSize() * newText.scaleY());
      this.updateState(newText.getAttrs() as NodeSerializable);
    });

    newText.on("mouseenter", (e) => {
      e.evt.preventDefault();

      const activeAction = this.instance.getActiveAction();
      if (typeof activeAction !== "undefined") {
        return;
      }

      if (newText.getAttrs().isSelectable) {
        stage.container().style.cursor = "pointer";
      }
    });

    newText.on("mouseleave", (e) => {
      e.evt.preventDefault();

      const activeAction = this.instance.getActiveAction();
      if (typeof activeAction !== "undefined") {
        return;
      }

      if (newText.getAttrs().isSelectable) {
        stage.container().style.cursor = "default";
      }
    });

    newText.on("dblclick dbltap", (e) => {
      e.evt.preventDefault();

      this.triggerEditMode(newText);
    });

    stage.on("mousemove", () => {
      if (!this.editing) {
        return;
      }

      const textArea = document.getElementById(newText.id()) as HTMLTextAreaElement | null;

      if (textArea) {
        const textPosition = newText.absolutePosition();

        const areaPosition: Vector2d = {
          x: stage.container().offsetLeft + textPosition.x,
          y: stage.container().offsetTop + textPosition.y,
        };

        textArea.style.top = areaPosition.y + "px";
        textArea.style.left = areaPosition.x + "px";
      }
    });

    if (draggable) {
      newText.on("dragstart", (e) => {
        if (this.editing) {
          e.evt.preventDefault();
          return;
        }

        this.updateState(newText.getAttrs() as NodeSerializable);
      });
      newText.on("dragmove", (e) => {
        if (this.editing) {
          e.evt.preventDefault();
          return;
        }

        this.updateState(newText.getAttrs() as NodeSerializable);
      });
      newText.on("dragend", (e) => {
        if (this.editing) {
          e.evt.preventDefault();
          return;
        }

        this.updateState(newText.getAttrs() as NodeSerializable);
      });
    }

    newText.setAttr("triggerEditMode", this.triggerEditMode.bind(this));

    this.addToCanvas(newText, textParams);
  }

  updateRuntime(params: NodeSerializable) {
    const textParams = params as TextSerializable;
    const { id } = textParams;

    const stage = this.instance.getStage();

    const node = stage.findOne(`#${id}`) as Konva.Text | undefined;
    if (!node) {
      return;
    }

    node.setAttrs(textParams);
    node.setAttr("triggerEditMode", this.triggerEditMode.bind(this));

    this.addToCanvas(node, textParams);
  }

  removeRuntime(id: string): void {
    const stage = this.instance.getStage();

    const node = stage.findOne(`#${id}`) as Konva.Text | undefined;
    if (!node) {
      return;
    }

    node.destroy();
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
          const textAttrs = textNode.getAttrs();
          this.updateState({
            id: textAttrs.id,
            type: textAttrs.type,
            text: textAttrs.text,
          } as NodeSerializable);
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

    textArea.focus();

    const handleOutsideClick = (e: Event | null) => {
      if (!e && textArea.value === "") {
        this.instance.updateElement(textNode.getAttrs() as NodeSerializable);
        this.removeTextAreaDOM(textNode);
        window.removeEventListener("click", handleOutsideClick);
      }
      if (e && e.target !== textArea && textArea.value !== "") {
        textNode.text(textArea.value);
        this.updateState(textNode.getAttrs() as NodeSerializable);
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
