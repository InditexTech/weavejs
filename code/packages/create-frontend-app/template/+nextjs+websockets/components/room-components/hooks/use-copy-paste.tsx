import {
  WeaveCopyPasteNodesPluginOnCopyEvent,
  WeaveCopyPasteNodesPluginOnPasteEvent,
} from '@inditextech/weave-sdk';
import React from 'react';
import { useWeave } from '@inditextech/weave-react';
import { toast } from 'sonner';

function useCopyPaste() {
  const instance = useWeave((state) => state.instance);

  const onCopyHandler = React.useCallback(
    (error: WeaveCopyPasteNodesPluginOnCopyEvent): void => {
      if (error) {
        console.error('onCopy', error);
        toast.error('An error occurred when copying to the clipboard');
      } else {
        toast.success('Copy successful');
      }
    },
    []
  );

  const onPasteHandler = React.useCallback(
    (error: WeaveCopyPasteNodesPluginOnPasteEvent): void => {
      if (error) {
        if (error.message === 'Invalid elements to paste') {
          toast.warning('Elements in clipboard cannot be pasted here');
        } else {
          console.error('onPaste', error);
          toast.error('An error occurred when reading from the clipboard');
        }
      } else {
        toast.success('Paste successful');
      }
    },
    []
  );

  React.useEffect(() => {
    if (!instance) return;

    instance.addEventListener('onCopy', onCopyHandler);
    instance.addEventListener('onPaste', onPasteHandler);

    return () => {
      instance.removeEventListener('onCopy', onCopyHandler);
      instance.removeEventListener('onPaste', onPasteHandler);
    };
  }, [instance, onCopyHandler, onPasteHandler]);
}

export default useCopyPaste;
