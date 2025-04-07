import { WeaveElementAttributes } from '@inditextech/weavejs-types';

export type WeaveActionPropsChangeCallback = (
  props: WeaveElementAttributes
) => void;

export type WeaveActionCallbacks = {
  onPropsChange?: WeaveActionPropsChangeCallback;
};
