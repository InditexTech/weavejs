import { detectOS, SYSTEM_OS, SystemOs } from "@/lib/utils";
import React from "react";

export const useGetOs = () => {
  const [os, setOs] = React.useState<SystemOs>(SYSTEM_OS.OTHER);

  React.useEffect(() => {
    setOs(detectOS());
  }, []);

  return os;
};
