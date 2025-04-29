import { Vector2d } from "konva/lib/types"; // [!code ++]
import { create } from "zustand";
import { ContextMenuOption } from "@/components/context-menu/context-menu"; // [!code ++]

type ShowcaseUser = {
  name: string;
  email: string;
};

interface CollaborationRoomState {
  ui: {
    show: boolean;
  };
  user: ShowcaseUser | undefined;
  room: string | undefined;
  contextMenu: {
    // [!code ++]
    show: boolean; // [!code ++]
    position: Vector2d; // [!code ++]
    options: ContextMenuOption[]; // [!code ++]
  }; // [!code ++]
  setShowUi: (newShowUI: boolean) => void;
  setUser: (newUser: ShowcaseUser | undefined) => void;
  setRoom: (newRoom: string | undefined) => void;
  setContextMenuShow: (newContextMenuShow: boolean) => void; // [!code ++]
  setContextMenuPosition: (newContextMenuPosition: Vector2d) => void; // [!code ++]
  setContextMenuOptions: (newContextMenuOptions: ContextMenuOption[]) => void; // [!code ++]
}

export const useCollaborationRoom = create<CollaborationRoomState>()((set) => ({
  ui: {
    show: true,
  },
  user: undefined,
  room: undefined,
  contextMenu: {
    // [!code ++]
    show: false, // [!code ++]
    position: { x: 0, y: 0 }, // [!code ++]
    options: [], // [!code ++]
  }, // [!code ++]
  setShowUi: (newShowUI) =>
    set((state) => ({
      ...state,
      ui: { ...state.ui, show: newShowUI },
    })),
  setUser: (newUser) => set((state) => ({ ...state, user: newUser })),
  setRoom: (newRoom) => set((state) => ({ ...state, room: newRoom })),
  // prettier-ignore
  setContextMenuShow: ( // [!code ++]
    newContextMenuShow // [!code ++]
  ) => // [!code ++]
    set((state) => ({ // [!code ++]
      ...state, // [!code ++]
      contextMenu: { ...state.contextMenu, show: newContextMenuShow }, // [!code ++]
    })), // [!code ++]
  // prettier-ignore
  setContextMenuPosition: ( // [!code ++]
    newContextMenuPosition // [!code ++]
  ) => // [!code ++]
    set((state) => ({ // [!code ++]
      ...state, // [!code ++]
      contextMenu: { ...state.contextMenu, position: newContextMenuPosition }, // [!code ++]
    })), // [!code ++]
  // prettier-ignore
  setContextMenuOptions: ( // [!code ++]
    newContextMenuOptions // [!code ++]
  ) => // [!code ++]
    set((state) => ({ // [!code ++]
      ...state, // [!code ++]
      contextMenu: { ...state.contextMenu, options: newContextMenuOptions }, // [!code ++]
    })), // [!code ++]
}));
