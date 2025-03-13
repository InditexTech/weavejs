import { WeaveElementAttributes } from '@/types';

export type WeaveActionPropsChangeCallback = (
  props: WeaveElementAttributes
) => void;

export type WeaveActionCallbacks = {
  onPropsChange?: WeaveActionPropsChangeCallback;
};
