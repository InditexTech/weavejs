"use client";

import React from "react";
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  Bold,
  CaseSensitive,
  CaseUpper,
  Italic,
  RemoveFormatting,
  Strikethrough,
  Underline,
} from "lucide-react";
import { WeaveStateElement } from "@inditextech/weave-types";
import { useWeave } from "@inditextech/weave-react";
import { useCollaborationRoom } from "@/store/store";
import { InputColor } from "../inputs/input-color";
import { ToggleIconButton } from "../toggle-icon-button";
import InputFontFamily from "../inputs/input-font-family";
import { InputNumber } from "../inputs/input-number";

export function TextProperties() {
  const instance = useWeave((state) => state.instance);
  const node = useWeave((state) => state.selection.node);
  const actualAction = useWeave((state) => state.actions.actual);

  const nodePropertiesAction = useCollaborationRoom(
    (state) => state.nodeProperties.action,
  );

  const nodeCreateProps = useCollaborationRoom(
    (state) => state.nodeProperties.createProps,
  );

  const actualNode = React.useMemo(() => {
    if (actualAction && nodePropertiesAction === "create") {
      return {
        key: "creating",
        type: "undefined",
        props: {
          ...nodeCreateProps,
        },
      };
    }
    if (node && nodePropertiesAction === "update") {
      return node;
    }
    return undefined;
  }, [actualAction, node, nodePropertiesAction, nodeCreateProps]);

  const updateElement = React.useCallback(
    (updatedNode: WeaveStateElement) => {
      if (!instance) return;
      if (actualAction && nodePropertiesAction === "create") {
        instance.updatePropsAction(actualAction, updatedNode.props);
      }
      if (nodePropertiesAction === "update") {
        instance.updateNode(updatedNode);
      }
    },
    [instance, actualAction, nodePropertiesAction],
  );

  if (!instance || !actualAction || !actualNode) {
    return null;
  }

  if (!actualAction && !actualNode) return null;

  if (!["text"].includes(actualNode.type)) {
    return null;
  }

  return (
    <div className="border-b border-[#c9c9c9] p-[24px] flex flex-col gap-[16px]">
      <div className="w-full flex justify-between items-center gap-3">
        <div className="cursor-pointer hover:no-underline items-center py-0">
          <span className="text-[13px] font-inter font-light uppercase">
            Typography
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="col-span-2">
          <InputFontFamily
            value={`${actualNode.props.fontFamily ?? null}`}
            onChange={(value) => {
              const updatedNode: WeaveStateElement = {
                ...actualNode,
                props: {
                  ...actualNode.props,
                  fontFamily: value,
                },
              };

              updateElement(updatedNode);
            }}
          />
        </div>
        <div className="col-span-2">
          <InputColor
            label="Color"
            value={actualNode.props.fill}
            onChange={(value) => {
              const updatedNode: WeaveStateElement = {
                ...actualNode,
                props: {
                  ...actualNode.props,
                  fill: value,
                },
              };
              updateElement(updatedNode);
            }}
          />
        </div>
        <InputNumber
          label="Size (px)"
          value={actualNode.props.fontSize ?? 16}
          onChange={(value) => {
            const updatedNode: WeaveStateElement = {
              ...actualNode,
              props: {
                ...actualNode.props,
                fontSize: value,
              },
            };
            updateElement(updatedNode);
          }}
        />
        <InputNumber
          label="Line Height"
          value={actualNode.props.lineHeight ?? 1}
          onChange={(value) => {
            const updatedNode: WeaveStateElement = {
              ...actualNode,
              props: {
                ...actualNode.props,
                lineHeight: value,
              },
            };
            updateElement(updatedNode);
          }}
        />

        <div className="w-full flex justify-between items-center gap-4 col-span-2">
          <div className="text-[12px] text-[#757575] font-inter font-light text-nowrap">
            Style
          </div>
          <div className="w-full flex justify-end items-center gap-1">
            <ToggleIconButton
              kind="switch"
              icon={<RemoveFormatting size={20} strokeWidth={1} />}
              pressed={
                (actualNode.props.fontStyle ?? "normal").indexOf("normal") !==
                -1
              }
              onClick={() => {
                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    fontStyle: "normal",
                  },
                };
                updateElement(updatedNode);
              }}
            />
            <ToggleIconButton
              kind="switch"
              icon={<Italic size={20} strokeWidth={1} />}
              pressed={
                (actualNode.props.fontStyle ?? "normal").indexOf("italic") !==
                -1
              }
              onClick={() => {
                let items = [
                  ...(actualNode.props.fontStyle ?? "normal")
                    .split(" ")
                    .filter((e: string) => e !== "normal"),
                ];
                if (
                  (actualNode.props.fontStyle ?? "normal").indexOf("italic") !==
                  -1
                ) {
                  items = items.filter((e: string) => e !== "italic");
                }
                if (
                  (actualNode.props.fontStyle ?? "normal").indexOf("italic") ===
                  -1
                ) {
                  items = [...items];
                  items.push("italic");
                }

                if (items.length === 0) {
                  items = ["normal"];
                }

                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    fontStyle: items.join(" "),
                  },
                };
                updateElement(updatedNode);
              }}
            />
            <ToggleIconButton
              kind="switch"
              icon={<Bold size={20} strokeWidth={1} />}
              pressed={
                (actualNode.props.fontStyle ?? "normal").indexOf("bold") !== -1
              }
              onClick={() => {
                let items = [
                  ...(actualNode.props.fontStyle ?? "normal")
                    .split(" ")
                    .filter((e: string) => e !== "normal"),
                ];
                if (
                  (actualNode.props.fontStyle ?? "normal").indexOf("bold") !==
                  -1
                ) {
                  items = items.filter((e: string) => e !== "bold");
                }
                if (
                  (actualNode.props.fontStyle ?? "normal").indexOf("bold") ===
                  -1
                ) {
                  items = [...items];
                  items.push("bold");
                }

                if (items.length === 0) {
                  items = ["normal"];
                }

                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    fontStyle: items.join(" "),
                  },
                };
                updateElement(updatedNode);
              }}
            />
          </div>
        </div>
        <div className="w-full flex justify-between items-center gap-4 col-span-2">
          <div className="text-[12px] text-[#757575] font-inter font-light text-nowrap">
            Variant
          </div>
          <div className="w-full flex justify-end items-center gap-1">
            <ToggleIconButton
              kind="switch"
              icon={<CaseSensitive size={20} strokeWidth={1} />}
              pressed={
                !actualNode.props.fontVariant ||
                actualNode.props.fontVariant === "normal"
              }
              onClick={() => {
                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    fontVariant: "normal",
                  },
                };
                updateElement(updatedNode);
              }}
            />
            <ToggleIconButton
              kind="switch"
              icon={<CaseUpper size={20} strokeWidth={1} />}
              pressed={actualNode.props.fontVariant === "small-caps"}
              onClick={() => {
                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    fontVariant: "small-caps",
                  },
                };
                updateElement(updatedNode);
              }}
            />
          </div>
        </div>
        <div className="w-full flex justify-between items-center gap-4 col-span-2">
          <div className="text-[12px] text-[#757575] font-inter font-light text-nowrap">
            Decoration
          </div>
          <div className="w-full flex justify-end items-center gap-1">
            <ToggleIconButton
              kind="switch"
              icon={<RemoveFormatting size={20} strokeWidth={1} />}
              pressed={(actualNode.props.textDecoration ?? "") === ""}
              onClick={() => {
                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    textDecoration: "",
                  },
                };
                updateElement(updatedNode);
              }}
            />
            <ToggleIconButton
              kind="switch"
              icon={<Strikethrough size={20} strokeWidth={1} />}
              pressed={
                (actualNode.props.textDecoration ?? "") === "line-through"
              }
              onClick={() => {
                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    textDecoration: "line-through",
                  },
                };
                updateElement(updatedNode);
              }}
            />
            <ToggleIconButton
              kind="switch"
              icon={<Underline size={20} strokeWidth={1} />}
              pressed={(actualNode.props.textDecoration ?? "") === "underline"}
              onClick={() => {
                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    textDecoration: "underline",
                  },
                };
                updateElement(updatedNode);
              }}
            />
          </div>
        </div>
        <div className="w-full flex justify-between items-center gap-4 col-span-2">
          <div className="text-[12px] text-[#757575] font-inter font-light text-nowrap">
            Horizontal alignment
          </div>
          <div className="w-full flex justify-end items-center gap-1">
            <ToggleIconButton
              kind="switch"
              icon={<AlignLeft size={20} strokeWidth={1} />}
              pressed={(actualNode.props.align ?? "") === "left"}
              onClick={() => {
                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    align: "left",
                  },
                };
                updateElement(updatedNode);
              }}
            />
            <ToggleIconButton
              kind="switch"
              icon={<AlignCenter size={20} strokeWidth={1} />}
              pressed={(actualNode.props.align ?? "") === "center"}
              onClick={() => {
                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    align: "center",
                  },
                };
                updateElement(updatedNode);
              }}
            />
            <ToggleIconButton
              kind="switch"
              icon={<AlignRight size={20} strokeWidth={1} />}
              pressed={(actualNode.props.align ?? "") === "right"}
              onClick={() => {
                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    align: "right",
                  },
                };
                updateElement(updatedNode);
              }}
            />
          </div>
        </div>
        <div className="w-full flex justify-between items-center gap-4 col-span-2">
          <div className="text-[12px] text-[#757575] font-inter font-light text-nowrap">
            Vertical alignment
          </div>
          <div className="w-full flex justify-end items-center gap-1">
            <ToggleIconButton
              kind="switch"
              icon={<AlignStartHorizontal size={20} strokeWidth={1} />}
              pressed={(actualNode.props.verticalAlign ?? "top") === "top"}
              onClick={() => {
                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    verticalAlign: "top",
                  },
                };
                updateElement(updatedNode);
              }}
            />
            <ToggleIconButton
              kind="switch"
              icon={<AlignCenterHorizontal size={20} strokeWidth={1} />}
              pressed={(actualNode.props.verticalAlign ?? "top") === "middle"}
              onClick={() => {
                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    verticalAlign: "middle",
                  },
                };
                updateElement(updatedNode);
              }}
            />
            <ToggleIconButton
              kind="switch"
              icon={<AlignEndHorizontal size={20} strokeWidth={1} />}
              pressed={(actualNode.props.verticalAlign ?? "") === "bottom"}
              onClick={() => {
                const updatedNode: WeaveStateElement = {
                  ...actualNode,
                  props: {
                    ...actualNode.props,
                    verticalAlign: "bottom",
                  },
                };
                updateElement(updatedNode);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
