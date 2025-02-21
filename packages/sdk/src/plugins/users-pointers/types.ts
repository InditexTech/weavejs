import { WeaveUser } from "@/types";
import { WEAVE_USER_POINTER_KEY } from "./constants";

export type WeaveUsersPointersPluginParams = {
  getUser?: () => WeaveUser;
};

export type WeaveUserPointer = {
  user: string;
  x: number;
  y: number;
};

export type WeaveUserPointerKey = typeof WEAVE_USER_POINTER_KEY;
