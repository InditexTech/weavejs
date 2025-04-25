import { Vector2d } from 'konva/lib/types';
import { create } from 'zustand';
import { ContextMenuOption } from '@/components/room-components/context-menu';
import { WeaveElementAttributes } from '@inditextech/weavejs-types';

type ShowcaseUser = {
  name: string;
  email: string;
};

type NodePropertiesAction = 'create' | 'update' | undefined;

type FinishUploadCallback = (imageURL: string) => void;

interface CollaborationRoomState {
  fetchConnectionUrl: {
    loading: boolean;
    error: Error | null;
  };
  ui: {
    show: boolean;
  };
  user: ShowcaseUser | undefined;
  room: string | undefined;
  contextMenu: {
    show: boolean;
    position: Vector2d;
    options: ContextMenuOption[];
  };
  nodeProperties: {
    action: NodePropertiesAction;
    createProps: WeaveElementAttributes | undefined;
    visible: boolean;
  };
  images: {
    showSelectFile: boolean;
    transforming: boolean;
    uploading: boolean;
    loading: boolean;
    finishUploadCallback: FinishUploadCallback | null;
    library: {
      visible: boolean;
    };
  };
  frames: {
    library: {
      visible: boolean;
    };
  };
  colorToken: {
    library: {
      visible: boolean;
    };
  };
  setShowUi: (newShowUI: boolean) => void;
  setFetchConnectionUrlLoading: (newLoading: boolean) => void;
  setFetchConnectionUrlError: (
    newFetchConnectionUrlError: Error | null
  ) => void;
  setUser: (newUser: ShowcaseUser | undefined) => void;
  setRoom: (newRoom: string | undefined) => void;
  setContextMenuShow: (newContextMenuShow: boolean) => void;
  setContextMenuPosition: (newContextMenuPosition: Vector2d) => void;
  setContextMenuOptions: (newContextMenuOptions: ContextMenuOption[]) => void;
  setTransformingImage: (newTransformingImage: boolean) => void;
  setUploadingImage: (newUploadingImage: boolean) => void;
  setShowSelectFileImage: (newShowSelectFileImage: boolean) => void;
  setLoadingImage: (newLoadingImage: boolean) => void;
  setFinishUploadCallbackImage: (
    newFinishUploadCallbackImage: FinishUploadCallback | null
  ) => void;
  setNodePropertiesAction: (
    newNodePropertiesAction: NodePropertiesAction
  ) => void;
  setNodePropertiesCreateProps: (
    newNodePropertiesCreateProps: WeaveElementAttributes | undefined
  ) => void;
  setNodePropertiesVisible: (newNodePropertiesVisible: boolean) => void;
  setImagesLibraryVisible: (newImagesLibraryVisible: boolean) => void;
  setFramesLibraryVisible: (newFramesLibraryVisible: boolean) => void;
  setColorTokensLibraryVisible: (newColorTokensLibraryVisible: boolean) => void;
}

export const useCollaborationRoom = create<CollaborationRoomState>()((set) => ({
  ui: {
    show: true,
  },
  fetchConnectionUrl: {
    loading: false,
    error: null,
  },
  user: undefined,
  room: undefined,
  contextMenu: {
    show: false,
    position: { x: 0, y: 0 },
    options: [],
  },
  nodeProperties: {
    action: undefined,
    visible: false,
    createProps: undefined,
  },
  images: {
    showSelectFile: false,
    transforming: false,
    uploading: false,
    loading: false,
    finishUploadCallback: null,
    library: {
      visible: false,
    },
  },
  frames: {
    library: {
      visible: false,
    },
  },
  colorToken: {
    library: {
      visible: false,
    },
  },
  setShowUi: (newShowUI) =>
    set((state) => ({
      ...state,
      ui: { ...state.ui, show: newShowUI },
    })),
  setFetchConnectionUrlLoading: (newLoading) =>
    set((state) => ({
      ...state,
      fetchConnectionUrl: { ...state.fetchConnectionUrl, loading: newLoading },
    })),
  setFetchConnectionUrlError: (newFetchConnectionUrlError) =>
    set((state) => ({
      ...state,
      fetchConnectionUrl: {
        ...state.fetchConnectionUrl,
        error: newFetchConnectionUrlError,
      },
    })),
  setUser: (newUser) => set((state) => ({ ...state, user: newUser })),
  setRoom: (newRoom) => set((state) => ({ ...state, room: newRoom })),
  setContextMenuShow: (newContextMenuShow) =>
    set((state) => ({
      ...state,
      contextMenu: { ...state.contextMenu, show: newContextMenuShow },
    })),
  setContextMenuPosition: (newContextMenuPosition) =>
    set((state) => ({
      ...state,
      contextMenu: { ...state.contextMenu, position: newContextMenuPosition },
    })),
  setContextMenuOptions: (newContextMenuOptions) =>
    set((state) => ({
      ...state,
      contextMenu: { ...state.contextMenu, options: newContextMenuOptions },
    })),
  setTransformingImage: (newTransformingImage) =>
    set((state) => ({
      ...state,
      images: { ...state.images, transforming: newTransformingImage },
    })),
  setUploadingImage: (newUploadingImage) =>
    set((state) => ({
      ...state,
      images: { ...state.images, uploading: newUploadingImage },
    })),
  setShowSelectFileImage: (newShowSelectFileImage) =>
    set((state) => ({
      ...state,
      images: { ...state.images, showSelectFile: newShowSelectFileImage },
    })),
  setLoadingImage: (newLoadingImage) =>
    set((state) => ({
      ...state,
      images: { ...state.images, loading: newLoadingImage },
    })),
  setFinishUploadCallbackImage: (newFinishUploadCallbackImage) =>
    set((state) => ({
      ...state,
      images: {
        ...state.images,
        finishUploadCallback: newFinishUploadCallbackImage,
      },
    })),
  setNodePropertiesAction: (newNodePropertiesAction) =>
    set((state) => ({
      ...state,
      nodeProperties: {
        ...state.nodeProperties,
        action: newNodePropertiesAction,
      },
    })),
  setNodePropertiesCreateProps: (newNodePropertiesCreateProps) =>
    set((state) => ({
      ...state,
      nodeProperties: {
        ...state.nodeProperties,
        createProps: newNodePropertiesCreateProps,
      },
    })),
  setNodePropertiesVisible: (newNodePropertiesVisible) =>
    set((state) => ({
      ...state,
      nodeProperties: {
        ...state.nodeProperties,
        visible: newNodePropertiesVisible,
      },
    })),
  setImagesLibraryVisible: (newImagesLibraryVisible) =>
    set((state) => ({
      ...state,
      images: {
        ...state.images,
        library: { ...state.images.library, visible: newImagesLibraryVisible },
      },
    })),
  setFramesLibraryVisible: (newFramesLibraryVisible) =>
    set((state) => ({
      ...state,
      frames: {
        ...state.frames,
        library: {
          ...state.frames.library,
          visible: newFramesLibraryVisible,
        },
      },
    })),
  setColorTokensLibraryVisible: (newColorTokensLibraryVisible) =>
    set((state) => ({
      ...state,
      colorToken: {
        ...state.colorToken,
        library: {
          ...state.colorToken.library,
          visible: newColorTokensLibraryVisible,
        },
      },
    })),
}));
