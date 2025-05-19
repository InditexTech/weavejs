import React from 'react';

const canDetectKeyboard = () => {
  const editingTextNodes =
    Object.keys(window.weaveTextEditing ?? {}).length !== 0;
  return !editingTextNodes;
};

export const useKeyDown = (
  callback: () => void,
  keys: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modifiers: (event: any) => boolean = () => true
) => {
  const onKeyDown = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: any) => {
      const wasAnyKeyPressed = keys.some((key: string) => event.code === key);
      if (
        wasAnyKeyPressed &&
        !window.weaveOnFieldFocus &&
        canDetectKeyboard() &&
        modifiers(event)
      ) {
        event.preventDefault();
        callback();
      }
    },
    [callback, keys, modifiers]
  );

  React.useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onKeyDown]);
};
