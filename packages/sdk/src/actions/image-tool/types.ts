import { IMAGE_TOOL_STATE } from "./constants";

export type WeaveImageToolActionStateKeys = keyof typeof IMAGE_TOOL_STATE;
export type WeaveImageToolActionState = (typeof IMAGE_TOOL_STATE)[WeaveImageToolActionStateKeys];

export type WeaveImageToolActionOnAddImageCallback = (finished: (imageURL: string) => void) => Promise<void>;
export type WeaveImageToolActionOnStartLoadImageCallback = () => void;
export type WeaveImageToolActionOnEndLoadImageCallback = (error?: Error) => void;

export type WeaveImageToolActionCallbacks = {
  onUploadImage: WeaveImageToolActionOnAddImageCallback;
  onImageLoadStart?: WeaveImageToolActionOnStartLoadImageCallback;
  onImageLoadEnd?: WeaveImageToolActionOnEndLoadImageCallback;
};

export type WeaveImageToolActionTriggerParams = {
  imageURL?: string;
};
