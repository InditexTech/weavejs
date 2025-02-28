export const WEAVE_NODE_LAYER_ID = "mainLayer";

export const WEAVE_NODE_POSITION = {
  ["UP"]: "up",
  ["DOWN"]: "down",
  ["FRONT"]: "front",
  ["BACK"]: "back",
} as const;

export const WEAVE_EXPORT_BACKGROUND_COLOR = "white";

export const WEAVE_EXPORT_FORMATS = {
  ["PNG"]: "image/png",
  ["JPEG"]: "image/jpeg",
} as const;

export const WEAVE_EXPORT_FILE_FORMAT = {
  ["image/png"]: ".png",
  ["image/jpeg"]: ".jpg",
} as const;

export const STATE_ACTIONS = {
  ["CREATE"]: "create",
  ["UPDATE"]: "update",
  ["DELETE"]: "delete",
} as const;
