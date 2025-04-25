import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as platforms from "platform-detect";

export const SYSTEM_OS = {
  ["WINDOWS"]: "Windows",
  ["ANDROID"]: "Android",
  ["MAC"]: "Mac",
  ["IOS"]: "iOS",
  ["LINUX"]: "Linux",
  ["OTHER"]: "Other",
} as const;

export type SystemOsType = keyof typeof SYSTEM_OS;
export type SystemOs = (typeof SYSTEM_OS)[SystemOsType];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function colorIsLight(bgColor: string) {
  const color = bgColor.charAt(0) === "#" ? bgColor.substring(1, 7) : bgColor;
  const r = parseInt(color.substring(0, 2), 16); // hexToR
  const g = parseInt(color.substring(2, 4), 16); // hexToG
  const b = parseInt(color.substring(4, 6), 16); // hexToB
  const a = 1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return a < 0.5;
}

export function detectOS() {
  if (platforms.windows) {
    return SYSTEM_OS.WINDOWS;
  } else if (platforms.android) {
    return SYSTEM_OS.ANDROID;
  } else if (platforms.macos) {
    return SYSTEM_OS.MAC;
  } else if (platforms.ios) {
    return SYSTEM_OS.IOS;
  } else if (platforms.linux) {
    return SYSTEM_OS.LINUX;
  }
  return SYSTEM_OS.OTHER;
}
