import { WeaveUser } from "@/types";
import { WEAVE_CONNECTED_USER_INFO_KEY } from "./constants";

export type WeaveConnectedUsersPluginParams = {
  onConnectedUsersChanged?: WeaveConnectedUsersChangeCallback;
  getUser?: () => WeaveUser;
};

export type WeaveConnectedUsersChanged = {
  [userName: string]: WeaveUser;
};

export type WeaveConnectedUsersChangeCallback = (users: WeaveConnectedUsersChanged) => void;

export type WeaveConnectedUserInfoKey = typeof WEAVE_CONNECTED_USER_INFO_KEY;
