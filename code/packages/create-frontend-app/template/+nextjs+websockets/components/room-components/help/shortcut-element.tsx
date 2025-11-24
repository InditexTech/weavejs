import React from "react";
import { SYSTEM_OS } from "@/lib/utils";
import { useGetOs } from "../hooks/use-get-os";

type ShortcutElement = {
  shortcuts: Record<string, string>;
};

export const ShortcutElement = ({ shortcuts }: Readonly<ShortcutElement>) => {
  const os = useGetOs();

  const isMac = React.useMemo(() => os === SYSTEM_OS.MAC, [os]);

  const keys = React.useMemo(() => {
    return isMac ? shortcuts[SYSTEM_OS.MAC] : shortcuts[SYSTEM_OS.OTHER];
  }, [isMac, shortcuts]);

  return (
    <div className="ml-auto text-xs tracking-widest opacity-60">{keys}</div>
  );
};
