import React from "react";

export const useKeyDown = (
  callback: () => void,
  keys: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  active?: (event: any) => boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modifiers?: (event: any) => boolean
) => {
  const onKeyDown = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: any) => {
      const wasAnyKeyPressed = keys.some((key: string) => event.code === key);
      if ((wasAnyKeyPressed && active?.(event) && modifiers?.(event)) ?? true) {
        event.preventDefault();
        callback();
      }
    },
    [callback, keys, active, modifiers]
  );

  React.useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onKeyDown]);
};
